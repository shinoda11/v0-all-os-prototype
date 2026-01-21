// ============================================================
// All Management + All OS - Derive Functions
// Pure functions that compute state from events (CQRS Read Side)
// ============================================================

import {
  DomainEvent,
  SalesEvent,
  LaborEvent,
  PrepEvent,
  DeliveryEvent,
  DecisionEvent,
  ForecastEvent,
  TimeBand,
  DailySalesMetrics,
  LaborMetrics,
  PrepMetrics,
  ExceptionItem,
  CockpitMetrics,
  SalesKPI,
  LaborKPI,
  SupplyDemandKPI,
  OperationsKPI,
  ExceptionsKPI,
  EnhancedCockpitMetrics,
} from './types';

// ------------------------------------------------------------
// Event Filtering Helpers
// ------------------------------------------------------------

export const filterByStore = <T extends DomainEvent>(
  events: T[],
  storeId: string
): T[] => events.filter((e) => e.storeId === storeId);

export const filterByTimeBand = <T extends DomainEvent>(
  events: T[],
  timeBand: TimeBand
): T[] => (timeBand === 'all' ? events : events.filter((e) => e.timeBand === timeBand));

export const filterByDate = <T extends DomainEvent>(
  events: T[],
  date: string
): T[] => events.filter((e) => e.timestamp.startsWith(date));

export const filterByMonth = <T extends DomainEvent>(
  events: T[],
  month: string
): T[] => events.filter((e) => e.timestamp.startsWith(month));

export const filterByType = <T extends DomainEvent['type']>(
  events: DomainEvent[],
  type: T
): Extract<DomainEvent, { type: T }>[] =>
  events.filter((e) => e.type === type) as Extract<DomainEvent, { type: T }>[];

// ------------------------------------------------------------
// Forecast Derivation (Last Write Wins)
// ------------------------------------------------------------

export interface ForecastCell {
  date: string;
  timeBand: TimeBand;
  forecastCustomers: number;
  avgSpend: number;
  forecastSales: number;
}

export const deriveForecastTable = (
  events: DomainEvent[],
  storeId: string,
  month: string,
  timeBand: TimeBand
): Map<string, ForecastCell> => {
  const forecastEvents = filterByType(events, 'forecast') as ForecastEvent[];
  const filtered = forecastEvents
    .filter((e) => e.storeId === storeId)
    .filter((e) => e.date.startsWith(month))
    .filter((e) => timeBand === 'all' || e.timeBand === timeBand);

  // Last write wins - sort by timestamp and build map
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const table = new Map<string, ForecastCell>();
  for (const event of sorted) {
    const key = `${event.date}-${event.timeBand}`;
    table.set(key, {
      date: event.date,
      timeBand: event.timeBand,
      forecastCustomers: event.forecastCustomers,
      avgSpend: event.avgSpend,
      forecastSales: event.forecastSales,
    });
  }

  return table;
};

export const deriveForecastForDate = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  timeBand: TimeBand
): ForecastCell | null => {
  const table = deriveForecastTable(events, storeId, date.substring(0, 7), timeBand);
  
  if (timeBand === 'all') {
    // Aggregate all time bands for the date
    let totalCustomers = 0;
    let totalSales = 0;
    let count = 0;
    
    for (const [key, cell] of table) {
      if (key.startsWith(date)) {
        totalCustomers += cell.forecastCustomers;
        totalSales += cell.forecastSales;
        count++;
      }
    }
    
    if (count === 0) return null;
    
    return {
      date,
      timeBand: 'all',
      forecastCustomers: totalCustomers,
      avgSpend: totalCustomers > 0 ? totalSales / totalCustomers : 0,
      forecastSales: totalSales,
    };
  }
  
  return table.get(`${date}-${timeBand}`) ?? null;
};

// ------------------------------------------------------------
// Sales Derivation
// ------------------------------------------------------------

export const deriveSalesForDate = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  timeBand: TimeBand
): { totalSales: number; customerCount: number } => {
  const salesEvents = filterByType(events, 'sales') as SalesEvent[];
  let filtered = salesEvents.filter(
    (e) => e.storeId === storeId && e.timestamp.startsWith(date)
  );

  if (timeBand !== 'all') {
    filtered = filtered.filter((e) => e.timeBand === timeBand);
  }

  const totalSales = filtered.reduce((sum, e) => sum + e.total, 0);
  // Approximate customer count from unique transactions (simplified)
  const customerCount = filtered.reduce((sum, e) => sum + e.quantity, 0);

  return { totalSales, customerCount };
};

export const deriveDailySalesMetrics = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  timeBand: TimeBand
): DailySalesMetrics => {
  const forecast = deriveForecastForDate(events, storeId, date, timeBand);
  const sales = deriveSalesForDate(events, storeId, date, timeBand);

  const forecastSales = forecast?.forecastSales ?? 0;
  const achievementRate = forecastSales > 0 ? (sales.totalSales / forecastSales) * 100 : 0;

  return {
    date,
    timeBand,
    forecastCustomers: forecast?.forecastCustomers ?? 0,
    forecastSales,
    actualCustomers: sales.customerCount,
    actualSales: sales.totalSales,
    achievementRate,
  };
};

// ------------------------------------------------------------
// Labor Derivation
// ------------------------------------------------------------

interface StaffWorkSession {
  checkInTime: Date;
  checkOutTime?: Date;
  breakPeriods: Array<{ start: Date; end?: Date }>;
  isActive: boolean;
  isOnBreak: boolean;
}

export const deriveLaborMetrics = (
  events: DomainEvent[],
  storeId: string,
  date: string
): LaborMetrics => {
  const laborEvents = filterByType(events, 'labor') as LaborEvent[];
  const filtered = laborEvents.filter(
    (e) => e.storeId === storeId && e.timestamp.startsWith(date)
  );

  // Track complete work sessions per staff
  const staffSessions = new Map<string, StaffWorkSession>();

  // Sort events chronologically
  const sortedEvents = filtered.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const event of sortedEvents) {
    const eventTime = new Date(event.timestamp);
    let session = staffSessions.get(event.staffId);
    
    switch (event.action) {
      case 'check-in':
        // Start a new session
        session = {
          checkInTime: eventTime,
          checkOutTime: undefined,
          breakPeriods: [],
          isActive: true,
          isOnBreak: false,
        };
        staffSessions.set(event.staffId, session);
        break;
        
      case 'check-out':
        if (session && session.isActive) {
          session.checkOutTime = eventTime;
          session.isActive = false;
          session.isOnBreak = false;
          // Close any open break period
          const lastBreak = session.breakPeriods[session.breakPeriods.length - 1];
          if (lastBreak && !lastBreak.end) {
            lastBreak.end = eventTime;
          }
        }
        break;
        
      case 'break-start':
        if (session && session.isActive && !session.isOnBreak) {
          session.breakPeriods.push({ start: eventTime, end: undefined });
          session.isOnBreak = true;
        }
        break;
        
      case 'break-end':
        if (session && session.isActive && session.isOnBreak) {
          const currentBreak = session.breakPeriods[session.breakPeriods.length - 1];
          if (currentBreak && !currentBreak.end) {
            currentBreak.end = eventTime;
          }
          session.isOnBreak = false;
        }
        break;
    }
  }

  // Calculate metrics
  let activeStaffCount = 0;
  let onBreakCount = 0;
  let totalWorkHours = 0;
  const now = new Date();

  for (const [, session] of staffSessions) {
    // Count active staff
    if (session.isActive) {
      activeStaffCount++;
      if (session.isOnBreak) onBreakCount++;
    }
    
    // Calculate worked hours
    // Only count time if check-in is in the past
    if (session.checkInTime.getTime() <= now.getTime()) {
      // End time is either check-out time, or now (if still active), but not future
      let endTime: Date;
      if (session.checkOutTime) {
        endTime = session.checkOutTime;
      } else if (session.isActive) {
        // For active staff, use current time but not earlier than check-in
        endTime = now;
      } else {
        // Inactive without checkout - shouldn't happen, skip
        continue;
      }
      
      // Ensure end time is not before check-in (guard against edge cases)
      if (endTime.getTime() < session.checkInTime.getTime()) {
        continue;
      }
      
      // Gross working hours
      const grossHours = (endTime.getTime() - session.checkInTime.getTime()) / (1000 * 60 * 60);
      
      // Calculate break hours
      let breakHours = 0;
      for (const breakPeriod of session.breakPeriods) {
        const breakEnd = breakPeriod.end ?? (session.isOnBreak ? now : breakPeriod.start);
        // Only count break if it's within valid time range
        if (breakEnd.getTime() > breakPeriod.start.getTime()) {
          breakHours += (breakEnd.getTime() - breakPeriod.start.getTime()) / (1000 * 60 * 60);
        }
      }
      
      // Net working hours = gross - breaks
      const netHours = Math.max(0, grossHours - breakHours);
      totalWorkHours += netHours;
    }
  }

  // Ensure non-negative values
  const safeHours = Math.max(0, Math.round(totalWorkHours * 10) / 10);
  const safeCost = Math.max(0, Math.round(totalWorkHours * 1200));

  return {
    activeStaffCount,
    onBreakCount,
    totalHoursToday: safeHours,
    laborCostEstimate: safeCost,
  };
};

// ------------------------------------------------------------
// Prep Derivation
// ------------------------------------------------------------

export const derivePrepMetrics = (
  events: DomainEvent[],
  storeId: string,
  date: string
): PrepMetrics => {
  const prepEvents = filterByType(events, 'prep') as PrepEvent[];
  const filtered = prepEvents.filter(
    (e) => e.storeId === storeId && e.timestamp.startsWith(date)
  );

  // Track latest status per prep item
  const prepStates = new Map<string, PrepEvent['status']>();
  
  for (const event of filtered.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )) {
    prepStates.set(event.prepItemId, event.status);
  }

  let plannedCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;

  for (const status of prepStates.values()) {
    switch (status) {
      case 'planned':
        plannedCount++;
        break;
      case 'started':
        inProgressCount++;
        break;
      case 'completed':
        completedCount++;
        break;
    }
  }

  const totalTasks = plannedCount + inProgressCount + completedCount;
  const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  return {
    plannedCount,
    inProgressCount,
    completedCount,
    completionRate,
  };
};

// ------------------------------------------------------------
// Exception Detection
// ------------------------------------------------------------

export const deriveExceptions = (
  events: DomainEvent[],
  storeId: string,
  date: string
): ExceptionItem[] => {
  const exceptions: ExceptionItem[] = [];
  const currentHour = new Date().getHours();
  const currentTimeBand: TimeBand = currentHour < 14 ? 'lunch' : currentHour < 17 ? 'idle' : 'dinner';

  // Check delivery delays
  const deliveryEvents = filterByType(events, 'delivery') as DeliveryEvent[];
  const delayedDeliveries = deliveryEvents.filter(
    (e) => e.storeId === storeId && e.status === 'delayed'
  );

  for (const delivery of delayedDeliveries) {
    const delayMinutes = delivery.delayMinutes ?? 0;
    const impactSeverity = delayMinutes > 60 ? 'high' : delayMinutes > 30 ? 'medium' : 'low';
    
    exceptions.push({
      id: `exc-${delivery.id}`,
      type: 'delivery-delay',
      severity: delayMinutes > 30 ? 'critical' : 'warning',
      title: `配送遅延: ${delivery.itemName}`,
      description: `${delayMinutes}分遅延中`,
      relatedEventId: delivery.id,
      detectedAt: delivery.timestamp,
      resolved: false,
      status: 'unhandled',
      impact: {
        timeBand: currentTimeBand,
        affectedItems: [{ id: delivery.id, name: delivery.itemName, type: 'prep' }],
        impactType: 'delay',
        impactSeverity,
      },
    });
  }

  // Check staff shortage (simplified: less than 3 active staff is a shortage)
  const laborMetrics = deriveLaborMetrics(events, storeId, date);
  if (laborMetrics.activeStaffCount < 3) {
    const impactSeverity = laborMetrics.activeStaffCount < 2 ? 'high' : 'medium';
    
    exceptions.push({
      id: `exc-labor-${date}`,
      type: 'staff-shortage',
      severity: laborMetrics.activeStaffCount < 2 ? 'critical' : 'warning',
      title: '人員不足',
      description: `現在の出勤人数: ${laborMetrics.activeStaffCount}名`,
      relatedEventId: '',
      detectedAt: new Date().toISOString(),
      resolved: false,
      status: 'unhandled',
      impact: {
        timeBand: currentTimeBand,
        affectedItems: [],
        impactType: 'delay',
        impactSeverity,
      },
    });
  }

  // Check prep behind schedule
  const prepMetrics = derivePrepMetrics(events, storeId, date);
  if (prepMetrics.completionRate < 50 && prepMetrics.plannedCount > 0) {
    const impactSeverity = prepMetrics.completionRate < 30 ? 'high' : 'medium';
    
    exceptions.push({
      id: `exc-prep-${date}`,
      type: 'prep-behind',
      severity: prepMetrics.completionRate < 30 ? 'critical' : 'warning',
      title: '仕込み遅延',
      description: `進捗率: ${Math.round(prepMetrics.completionRate)}%`,
      relatedEventId: '',
      detectedAt: new Date().toISOString(),
      resolved: false,
      status: 'unhandled',
      impact: {
        timeBand: currentTimeBand,
        affectedItems: [],
        impactType: 'stockout',
        impactSeverity,
      },
    });
  }

  // Check demand surge (actual > 120% of forecast)
  const salesMetrics = deriveDailySalesMetrics(events, storeId, date, 'all');
  if (salesMetrics.achievementRate > 120) {
    const impactSeverity = salesMetrics.achievementRate > 150 ? 'high' : 'medium';
    
    exceptions.push({
      id: `exc-demand-${date}`,
      type: 'demand-surge',
      severity: salesMetrics.achievementRate > 150 ? 'critical' : 'warning',
      title: '需要急増',
      description: `予測比 ${Math.round(salesMetrics.achievementRate)}%`,
      relatedEventId: '',
      detectedAt: new Date().toISOString(),
      resolved: false,
      status: 'unhandled',
      impact: {
        timeBand: currentTimeBand,
        affectedItems: [],
        impactType: 'stockout',
        impactSeverity,
      },
    });
  }

  return exceptions;
};

// ------------------------------------------------------------
// Cockpit Metrics Derivation
// ------------------------------------------------------------

export const deriveCockpitMetrics = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  timeBand: TimeBand
): CockpitMetrics => {
  const salesMetrics = deriveDailySalesMetrics(events, storeId, date, timeBand);
  const laborMetrics = deriveLaborMetrics(events, storeId, date);
  const prepMetrics = derivePrepMetrics(events, storeId, date);
  const exceptions = deriveExceptions(events, storeId, date);

  // Determine sales trend (simplified)
  const trend: 'up' | 'down' | 'stable' =
    salesMetrics.achievementRate > 100
      ? 'up'
      : salesMetrics.achievementRate < 80
      ? 'down'
      : 'stable';

  // Calculate supply-demand balance (simplified)
  const supplyScore = prepMetrics.completionRate;
  const demandScore = salesMetrics.achievementRate;
  const balance = supplyScore - (demandScore - 100);
  const supplyDemandStatus =
    balance > 20 ? 'oversupply' : balance < -20 ? 'undersupply' : 'balanced';

  return {
    sales: {
      forecast: salesMetrics.forecastSales,
      actual: salesMetrics.actualSales,
      achievementRate: salesMetrics.achievementRate,
      trend,
    },
    labor: laborMetrics,
    supplyDemand: {
      status: supplyDemandStatus,
      score: Math.max(0, Math.min(100, 50 + balance)),
    },
    operations: prepMetrics,
    exceptions: {
      count: exceptions.length,
      criticalCount: exceptions.filter((e) => e.severity === 'critical').length,
    },
  };
};

// ------------------------------------------------------------
// Decision/ToDo Derivation
// ------------------------------------------------------------

export const deriveActiveTodos = (
  events: DomainEvent[],
  storeId: string,
  roleId?: string
): DecisionEvent[] => {
  const decisionEvents = filterByType(events, 'decision') as DecisionEvent[];
  
  // Get the latest status for each proposal
  const proposalStatuses = new Map<string, DecisionEvent>();
  
  for (const event of decisionEvents
    .filter((e) => e.storeId === storeId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  ) {
    proposalStatuses.set(event.proposalId, event);
  }

  // Filter to pending/approved/started/paused decisions (active todos)
  const activeTodos = Array.from(proposalStatuses.values()).filter(
    (e) => e.action === 'pending' || e.action === 'approved' || e.action === 'started' || e.action === 'paused'
  );

  // Filter by role if specified
  if (roleId) {
    return activeTodos.filter((e) => e.distributedToRoles.includes(roleId));
  }

  return activeTodos;
};

export const deriveCompletedTodos = (
  events: DomainEvent[],
  storeId: string
): DecisionEvent[] => {
  const decisionEvents = filterByType(events, 'decision') as DecisionEvent[];
  
  const proposalStatuses = new Map<string, DecisionEvent>();
  
  for (const event of decisionEvents
    .filter((e) => e.storeId === storeId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  ) {
    proposalStatuses.set(event.proposalId, event);
  }

  return Array.from(proposalStatuses.values()).filter((e) => e.action === 'completed');
};

// ------------------------------------------------------------
// Staff State Derivation (for Timeclock)
// ------------------------------------------------------------

export type StaffStatus = 'out' | 'working' | 'break';

export interface StaffState {
  status: StaffStatus;
  lastAction: string;
  checkInTime?: Date;
}

export const deriveStaffStates = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  staffIds: string[]
): Map<string, StaffState> => {
  const laborEvents = filterByType(events, 'labor') as LaborEvent[];
  const todayEvents = laborEvents
    .filter((e) => e.storeId === storeId && e.timestamp.startsWith(date))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const states = new Map<string, StaffState>();

  // Initialize all staff as out
  for (const staffId of staffIds) {
    states.set(staffId, { status: 'out', lastAction: '' });
  }

  // Process events in order
  for (const event of todayEvents) {
    const current = states.get(event.staffId) ?? { status: 'out', lastAction: '' };
    
    switch (event.action) {
      case 'check-in':
        states.set(event.staffId, { 
          status: 'working', 
          lastAction: event.timestamp,
          checkInTime: new Date(event.timestamp)
        });
        break;
      case 'check-out':
        states.set(event.staffId, { status: 'out', lastAction: event.timestamp });
        break;
      case 'break-start':
        states.set(event.staffId, { 
          ...current,
          status: 'break', 
          lastAction: event.timestamp 
        });
        break;
      case 'break-end':
        states.set(event.staffId, { 
          ...current,
          status: 'working', 
          lastAction: event.timestamp 
        });
        break;
    }
  }

  return states;
};

// ------------------------------------------------------------
// Calendar Data Derivation (for Sales Forecast)
// ------------------------------------------------------------

export interface CalendarCell {
  date: string;
  dayOfWeek: string;
  customers: number;
  avgSpend: number;
  sales: number;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export const deriveCalendarData = (
  events: DomainEvent[],
  storeId: string,
  month: string,
  timeBand: TimeBand
): CalendarCell[] => {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const forecastTable = deriveForecastTable(events, storeId, month, timeBand);
  
  const cells: CalendarCell[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = DAY_NAMES[new Date(date).getDay()];
    
    // Aggregate if "all" time band
    let totalCustomers = 0;
    let totalSales = 0;
    let avgSpend = 1200; // default
    
    if (timeBand === 'all') {
      for (const [key, cell] of forecastTable) {
        if (key.startsWith(date)) {
          totalCustomers += cell.forecastCustomers;
          totalSales += cell.forecastSales;
          avgSpend = cell.avgSpend;
        }
      }
    } else {
      const key = `${date}-${timeBand}`;
      const forecast = forecastTable.get(key);
      if (forecast) {
        totalCustomers = forecast.forecastCustomers;
        totalSales = forecast.forecastSales;
        avgSpend = forecast.avgSpend;
      }
    }
    
    cells.push({
      date,
      dayOfWeek,
      customers: totalCustomers,
      avgSpend,
      sales: totalSales,
    });
  }
  
  return cells;
};

// ------------------------------------------------------------
// Todo Statistics Derivation
// ------------------------------------------------------------

export interface TodoStats {
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
}

export const deriveTodoStats = (
  events: DomainEvent[],
  storeId: string,
  roleId?: string
): TodoStats => {
  const activeTodos = deriveActiveTodos(events, storeId, roleId);
  const completedTodos = deriveCompletedTodos(events, storeId);
  
  return {
    pendingCount: activeTodos.filter((t) => t.action === 'approved').length,
    inProgressCount: activeTodos.filter((t) => t.action === 'started').length,
    completedCount: completedTodos.length,
  };
};

// ------------------------------------------------------------
// Enhanced Cockpit KPI Derivation
// ------------------------------------------------------------

export const deriveEnhancedCockpitMetrics = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  timeBand: TimeBand,
  prepItemNames: Map<string, string> = new Map()
): EnhancedCockpitMetrics => {
  const now = new Date();
  const salesMetrics = deriveDailySalesMetrics(events, storeId, date, timeBand);
  const laborMetrics = deriveLaborMetrics(events, storeId, date);
  const prepMetrics = derivePrepMetrics(events, storeId, date);
  const exceptions = deriveExceptions(events, storeId, date);

  // Sales KPI with landing estimate
  const currentHour = now.getHours();
  const remainingRatio = currentHour < 17 ? 0.6 : currentHour < 20 ? 0.3 : 0.1;
  const landingMin = salesMetrics.actualSales + (salesMetrics.forecastSales * remainingRatio * 0.8);
  const landingMax = salesMetrics.actualSales + (salesMetrics.forecastSales * remainingRatio * 1.2);

  const sales: SalesKPI = {
    actual: salesMetrics.actualSales,
    forecast: salesMetrics.forecastSales,
    diff: salesMetrics.actualSales - salesMetrics.forecastSales,
    landingEstimate: {
      min: Math.round(landingMin),
      max: Math.round(landingMax),
    },
    achievementRate: salesMetrics.achievementRate,
    trend: salesMetrics.achievementRate > 100 ? 'up' : salesMetrics.achievementRate < 80 ? 'down' : 'stable',
    lastUpdate: now.toISOString(),
  };

  // Labor KPI
  const estimatedLaborRate = salesMetrics.actualSales > 0
    ? (laborMetrics.laborCostEstimate / salesMetrics.actualSales) * 100
    : 0;
  const salesPerLaborCost = laborMetrics.laborCostEstimate > 0
    ? salesMetrics.actualSales / laborMetrics.laborCostEstimate
    : 0;

  const labor: LaborKPI = {
    actualCost: laborMetrics.laborCostEstimate,
    estimatedLaborRate: Math.round(estimatedLaborRate * 10) / 10,
    salesPerLaborCost: Math.round(salesPerLaborCost * 10) / 10,
    plannedHours: 40, // Placeholder: should come from shift plan
    actualHours: laborMetrics.totalHoursToday,
    breakCount: laborMetrics.onBreakCount,
    lastUpdate: now.toISOString(),
  };

  // Supply Demand KPI - analyze prep and delivery events
  const prepEvents = filterByType(events, 'prep') as PrepEvent[];
  const todayPrep = prepEvents.filter(e => e.storeId === storeId && e.timestamp.startsWith(date));
  
  const stockoutItems: Array<{ name: string; risk: 'stockout' | 'excess' }> = [];
  const excessItems: Array<{ name: string; risk: 'stockout' | 'excess' }> = [];

  // Simplified: mark items with low completion as stockout risk
  const prepStatus = new Map<string, PrepEvent['status']>();
  for (const e of todayPrep) {
    prepStatus.set(e.prepItemId, e.status);
  }
  
  for (const [itemId, status] of prepStatus) {
    const itemName = prepItemNames.get(itemId) ?? itemId;
    if (status === 'planned') {
      stockoutItems.push({ name: itemName, risk: 'stockout' });
    }
  }

  const supplyDemand: SupplyDemandKPI = {
    stockoutRisk: stockoutItems.length,
    excessRisk: excessItems.length,
    topItems: [...stockoutItems, ...excessItems].slice(0, 3),
    lastUpdate: now.toISOString(),
  };

  // Operations KPI
  const delayedCount = prepMetrics.plannedCount; // Simplified: planned = potentially delayed
  const bottleneck = delayedCount > 0 ? {
    task: '仕込み未着手',
    reason: `${delayedCount}件の仕込みが未開始`,
  } : null;

  const operations: OperationsKPI = {
    delayedCount,
    completionRate: prepMetrics.completionRate,
    bottleneck,
    lastUpdate: now.toISOString(),
  };

  // Exceptions KPI
  const criticalCount = exceptions.filter(e => e.severity === 'critical').length;
  const warningCount = exceptions.filter(e => e.severity === 'warning').length;
  const topException = exceptions[0] ? {
    title: exceptions[0].title,
    impact: exceptions[0].description,
    impactType: exceptions[0].type === 'delivery-delay' || exceptions[0].type === 'prep-behind' ? 'stockout' as const : 'sales' as const,
  } : null;

  const exceptionsKPI: ExceptionsKPI = {
    criticalCount,
    warningCount,
    topException,
    lastUpdate: now.toISOString(),
  };

  return {
    sales,
    labor,
    supplyDemand,
    operations,
    exceptions: exceptionsKPI,
  };
};

// ------------------------------------------------------------
// Shift Summary Derivation (replaces MOCK_SHIFT_SUMMARY)
// ------------------------------------------------------------

import type { ShiftSummary, SupplyDemandMetrics, RiskItem, Staff, Role } from './types';

export const deriveShiftSummary = (
  events: DomainEvent[],
  staff: Staff[],
  roles: Role[],
  storeId: string,
  date: string
): ShiftSummary => {
  const now = new Date();
  const laborEvents = filterByType(events, 'labor') as LaborEvent[];
  const filtered = laborEvents.filter(
    (e) => e.storeId === storeId && e.timestamp.startsWith(date)
  );

  // Get store staff
  const storeStaff = staff.filter((s) => s.storeId === storeId);
  const staffMap = new Map(storeStaff.map((s) => [s.id, s]));
  
  // Get role code map
  const roleCodeMap = new Map(roles.map((r) => [r.id, r.code]));

  // Track sessions
  interface Session {
    staffId: string;
    checkInTime: Date;
    checkOutTime?: Date;
    breakPeriods: Array<{ start: Date; end?: Date }>;
    isActive: boolean;
    isOnBreak: boolean;
  }
  
  const sessions = new Map<string, Session>();
  
  // Sort and process events
  const sortedEvents = filtered.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const event of sortedEvents) {
    const eventTime = new Date(event.timestamp);
    let session = sessions.get(event.staffId);
    
    switch (event.action) {
      case 'check-in':
        session = {
          staffId: event.staffId,
          checkInTime: eventTime,
          checkOutTime: undefined,
          breakPeriods: [],
          isActive: true,
          isOnBreak: false,
        };
        sessions.set(event.staffId, session);
        break;
      case 'check-out':
        if (session && session.isActive) {
          session.checkOutTime = eventTime;
          session.isActive = false;
          session.isOnBreak = false;
        }
        break;
      case 'break-start':
        if (session && session.isActive && !session.isOnBreak) {
          session.breakPeriods.push({ start: eventTime, end: undefined });
          session.isOnBreak = true;
        }
        break;
      case 'break-end':
        if (session && session.isActive && session.isOnBreak) {
          const currentBreak = session.breakPeriods[session.breakPeriods.length - 1];
          if (currentBreak && !currentBreak.end) {
            currentBreak.end = eventTime;
          }
          session.isOnBreak = false;
        }
        break;
    }
  }

  // Calculate metrics
  let actualHours = 0;
  let onBreakCount = 0;
  const skillMix = { star3: 0, star2: 0, star1: 0 };
  const roleMix = { kitchen: 0, floor: 0, delivery: 0 };

  for (const [staffId, session] of sessions) {
    const staffMember = staffMap.get(staffId);
    if (!staffMember) continue;
    
    // Count active staff for skill/role mix
    if (session.isActive) {
      if (session.isOnBreak) onBreakCount++;
      
      // Skill mix
      if (staffMember.starLevel === 3) skillMix.star3++;
      else if (staffMember.starLevel === 2) skillMix.star2++;
      else skillMix.star1++;
      
      // Role mix
      const roleCode = roleCodeMap.get(staffMember.roleId);
      if (roleCode === 'kitchen' || roleCode === 'manager') roleMix.kitchen++;
      else if (roleCode === 'floor') roleMix.floor++;
      else if (roleCode === 'delivery') roleMix.delivery++;
    }
    
    // Calculate worked hours
    if (session.checkInTime.getTime() <= now.getTime()) {
      let endTime: Date;
      if (session.checkOutTime) {
        endTime = session.checkOutTime;
      } else if (session.isActive) {
        endTime = now;
      } else {
        continue;
      }
      
      if (endTime.getTime() < session.checkInTime.getTime()) continue;
      
      const grossHours = (endTime.getTime() - session.checkInTime.getTime()) / (1000 * 60 * 60);
      let breakHours = 0;
      for (const bp of session.breakPeriods) {
        const breakEnd = bp.end ?? (session.isOnBreak ? now : bp.start);
        if (breakEnd.getTime() > bp.start.getTime()) {
          breakHours += (breakEnd.getTime() - bp.start.getTime()) / (1000 * 60 * 60);
        }
      }
      actualHours += Math.max(0, grossHours - breakHours);
    }
  }

  // Planned hours: 8h/person as default (would come from shift plan)
  const plannedHours = storeStaff.length * 8;
  
  // Check if we have enough data
  const isCalculating = sessions.size === 0;

  return {
    plannedHours,
    actualHours: Math.max(0, Math.round(actualHours * 10) / 10),
    skillMix,
    roleMix,
    onBreakCount,
    lastUpdate: now.toISOString(),
    isCalculating,
  };
};

// ------------------------------------------------------------
// Supply/Demand Metrics Derivation
// ------------------------------------------------------------

export const deriveSupplyDemandMetrics = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  timeBand: TimeBand,
  prepItemNames: Map<string, string>
): SupplyDemandMetrics => {
  const now = new Date();
  
  // Get prep events
  const prepEvents = filterByType(events, 'prep') as PrepEvent[];
  const todayPrepEvents = prepEvents.filter(
    (e) => e.storeId === storeId && e.timestamp.startsWith(date)
  );
  
  // Get forecast events
  const forecastEvents = filterByType(events, 'forecast') as ForecastEvent[];
  const todayForecast = forecastEvents.find(
    (e) => e.storeId === storeId && (e.date === date || e.timestamp.startsWith(date)) &&
      (timeBand === 'all' || e.timeBand === timeBand)
  );
  
  // Get delivery events
  const deliveryEvents = filterByType(events, 'delivery') as DeliveryEvent[];
  const todayDeliveries = deliveryEvents.filter(
    (e) => e.storeId === storeId && e.timestamp.startsWith(date)
  );
  
  // Calculate prep status per item
  const prepStatus = new Map<string, { planned: number; completed: number; inProgress: number }>();
  
  for (const event of todayPrepEvents) {
    const current = prepStatus.get(event.prepItemId) ?? { planned: 0, completed: 0, inProgress: 0 };
    if (event.status === 'planned') current.planned += event.quantity;
    else if (event.status === 'completed') current.completed += event.quantity;
    else if (event.status === 'started') current.inProgress += event.quantity;
    prepStatus.set(event.prepItemId, current);
  }
  
  // Identify stockout risks (not enough prep for expected demand)
  const riskItems: RiskItem[] = [];
  let stockoutRiskCount = 0;
  let excessRiskCount = 0;
  
  // Check for delayed deliveries causing stockout
  const delayedDeliveries = todayDeliveries.filter((d) => d.status === 'delayed');
  for (const d of delayedDeliveries) {
    stockoutRiskCount++;
    riskItems.push({
      itemId: d.id,
      itemName: d.itemName,
      riskType: 'stockout',
      riskLevel: (d.delayMinutes ?? 0) > 60 ? 'high' : 'medium',
      impact: timeBand === 'all' ? '本日影響' : timeBandLabel(timeBand) + '帯影響',
      recommendedAction: 'メニュー制限提案',
    });
  }
  
  // Check prep items for stockout/excess risk
  for (const [prepItemId, status] of prepStatus) {
    const itemName = prepItemNames.get(prepItemId) ?? prepItemId;
    const totalAvailable = status.completed + status.inProgress;
    const totalPlanned = status.planned + status.completed + status.inProgress;
    
    // Simple heuristic: if completed < 50% of planned, it's a stockout risk
    if (status.planned > 0 && status.completed < status.planned * 0.5) {
      stockoutRiskCount++;
      riskItems.push({
        itemId: prepItemId,
        itemName,
        riskType: 'stockout',
        riskLevel: status.completed < status.planned * 0.3 ? 'high' : 'medium',
        impact: timeBand === 'all' ? '本日影響' : timeBandLabel(timeBand) + '帯影響',
        recommendedAction: '追加仕込み提案',
      });
    }
    
    // Simple heuristic: if completed > planned * 1.5, it's excess risk
    if (status.completed > totalPlanned * 1.5) {
      excessRiskCount++;
      riskItems.push({
        itemId: prepItemId,
        itemName,
        riskType: 'excess',
        riskLevel: status.completed > totalPlanned * 2 ? 'high' : 'medium',
        impact: '廃棄リスク',
        recommendedAction: '仕込み量調整提案',
      });
    }
  }
  
  // Sort by risk level (high first) and take top 3
  const sortedRisks = riskItems.sort((a, b) => {
    const levelOrder = { high: 0, medium: 1, low: 2 };
    return levelOrder[a.riskLevel] - levelOrder[b.riskLevel];
  });
  
  const topRiskItems = sortedRisks.slice(0, 3);
  
  // Determine overall status
  let status: 'normal' | 'caution' | 'danger' = 'normal';
  if (riskItems.some((r) => r.riskLevel === 'high')) {
    status = 'danger';
  } else if (riskItems.length > 0) {
    status = 'caution';
  }
  
  return {
    status,
    stockoutRiskCount,
    excessRiskCount,
    topRiskItems,
    lastUpdate: now.toISOString(),
  };
};

// Helper to get time band label
function timeBandLabel(timeBand: TimeBand): string {
  switch (timeBand) {
    case 'lunch': return 'ランチ';
    case 'idle': return 'アイドル';
    case 'dinner': return 'ディナー';
    default: return '全日';
  }
}

// ------------------------------------------------------------
// Weekly Labor Metrics Derivation
// ------------------------------------------------------------

import type { WeeklyLaborMetrics, WeeklyLaborDailyRow } from './types';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const deriveWeeklyLaborMetrics = (
  events: DomainEvent[],
  storeId: string,
  weekStartDate: string, // YYYY-MM-DD
  staff: Staff[]
): WeeklyLaborMetrics => {
  const now = new Date();
  const staffMap = new Map(staff.filter(s => s.storeId === storeId).map(s => [s.id, s]));
  
  // Generate 7 days starting from weekStartDate
  const weekStart = new Date(weekStartDate);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const weekEnd = dates[6];
  
  // Filter labor and sales events for this store
  const laborEvents = filterByType(events, 'labor') as LaborEvent[];
  const salesEvents = filterByType(events, 'sales') as SalesEvent[];
  
  const dailyRows: WeeklyLaborDailyRow[] = [];
  let totalHours = 0;
  let totalLaborCost = 0;
  let totalSales: number | null = 0;
  let hasSalesData = false;
  const staffIdsAllWeek = new Set<string>();
  const starMixTotal = { star3: 0, star2: 0, star1: 0 };
  
  for (const date of dates) {
    const dayOfWeek = new Date(date).getDay();
    const dayLabel = DAY_LABELS[dayOfWeek];
    
    // Get labor events for this day
    const dayLaborEvents = laborEvents.filter(
      e => e.storeId === storeId && e.timestamp.startsWith(date)
    );
    
    // Get sales events for this day
    const daySalesEvents = salesEvents.filter(
      e => e.storeId === storeId && e.timestamp.startsWith(date)
    );
    
    // Calculate daily sales
    let daySales: number | null = null;
    if (daySalesEvents.length > 0) {
      daySales = daySalesEvents.reduce((sum, e) => sum + e.amount, 0);
      totalSales = (totalSales ?? 0) + daySales;
      hasSalesData = true;
    }
    
    // Track staff sessions for this day
    interface Session {
      staffId: string;
      checkInTime: Date;
      checkOutTime?: Date;
      breakMinutes: number;
      isActive: boolean;
      currentBreakStart?: Date;
    }
    
    const sessions = new Map<string, Session>();
    
    // Sort and process labor events
    const sortedLaborEvents = dayLaborEvents.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (const event of sortedLaborEvents) {
      const eventTime = new Date(event.timestamp);
      let session = sessions.get(event.staffId);
      
      switch (event.action) {
        case 'check-in':
          session = {
            staffId: event.staffId,
            checkInTime: eventTime,
            checkOutTime: undefined,
            breakMinutes: 0,
            isActive: true,
            currentBreakStart: undefined,
          };
          sessions.set(event.staffId, session);
          break;
        case 'check-out':
          if (session && session.isActive) {
            session.checkOutTime = eventTime;
            session.isActive = false;
            // Close any open break
            if (session.currentBreakStart) {
              session.breakMinutes += (eventTime.getTime() - session.currentBreakStart.getTime()) / (1000 * 60);
              session.currentBreakStart = undefined;
            }
          }
          break;
        case 'break-start':
          if (session && session.isActive && !session.currentBreakStart) {
            session.currentBreakStart = eventTime;
          }
          break;
        case 'break-end':
          if (session && session.isActive && session.currentBreakStart) {
            session.breakMinutes += (eventTime.getTime() - session.currentBreakStart.getTime()) / (1000 * 60);
            session.currentBreakStart = undefined;
          }
          break;
      }
    }
    
    // Calculate daily metrics
    let dayHours = 0;
    let dayLaborCost = 0;
    const dayStaffIds = new Set<string>();
    const dayStarMix = { star3: 0, star2: 0, star1: 0 };
    
    for (const [staffId, session] of sessions) {
      const staffMember = staffMap.get(staffId);
      if (!staffMember) continue;
      
      dayStaffIds.add(staffId);
      staffIdsAllWeek.add(staffId);
      
      // Count star level (once per staff per day, not per session)
      if (staffMember.starLevel === 3) dayStarMix.star3++;
      else if (staffMember.starLevel === 2) dayStarMix.star2++;
      else dayStarMix.star1++;
      
      // Calculate hours worked
      if (session.checkInTime) {
        const endTime = session.checkOutTime ?? (session.isActive ? now : session.checkInTime);
        const grossMinutes = (endTime.getTime() - session.checkInTime.getTime()) / (1000 * 60);
        const netMinutes = Math.max(0, grossMinutes - session.breakMinutes);
        const hours = netMinutes / 60;
        
        dayHours += hours;
        dayLaborCost += hours * staffMember.wage;
      }
    }
    
    // Calculate labor rate
    let dayLaborRate: number | null = null;
    let daySalesPerLaborCost: number | null = null;
    if (daySales !== null && daySales > 0) {
      dayLaborRate = (dayLaborCost / daySales) * 100;
      daySalesPerLaborCost = daySales / dayLaborCost;
    }
    
    totalHours += dayHours;
    totalLaborCost += dayLaborCost;
    
    // Accumulate star mix total
    starMixTotal.star3 += dayStarMix.star3;
    starMixTotal.star2 += dayStarMix.star2;
    starMixTotal.star1 += dayStarMix.star1;
    
    dailyRows.push({
      date,
      dayLabel,
      hours: Math.round(dayHours * 10) / 10,
      laborCost: Math.round(dayLaborCost),
      laborRate: dayLaborRate !== null ? Math.round(dayLaborRate * 10) / 10 : null,
      salesPerLaborCost: daySalesPerLaborCost !== null ? Math.round(daySalesPerLaborCost * 100) / 100 : null,
      staffCount: dayStaffIds.size,
      starMix: dayStarMix,
      sales: daySales,
    });
  }
  
  // Calculate weekly summary
  const avgLaborRate = hasSalesData && totalSales && totalSales > 0
    ? Math.round((totalLaborCost / totalSales) * 1000) / 10
    : null;
  const salesPerLaborCost = hasSalesData && totalLaborCost > 0 && totalSales
    ? Math.round((totalSales / totalLaborCost) * 100) / 100
    : null;
  
  return {
    weekSummary: {
      totalHours: Math.round(totalHours * 10) / 10,
      totalLaborCost: Math.round(totalLaborCost),
      avgLaborRate,
      salesPerLaborCost,
      totalSales: hasSalesData ? totalSales : null,
      staffCountTotal: staffIdsAllWeek.size,
      starMixTotal,
    },
    dailyRows,
    weekStart: weekStartDate,
    weekEnd,
    lastUpdate: now.toISOString(),
    isCalculating: dailyRows.every(r => r.staffCount === 0),
  };
};
