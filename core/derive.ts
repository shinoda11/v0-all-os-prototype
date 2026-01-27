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
  ExpectedEffect,
  TodoStats,
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

// TodoStats is imported from ./types and re-exported for backward compatibility
export type { TodoStats } from './types';

export const deriveTodoStats = (
  events: DomainEvent[],
  storeId: string,
  roleId?: string
): TodoStats => {
  const activeTodos = deriveActiveTodos(events, storeId, roleId);
  const completedTodos = deriveCompletedTodos(events, storeId);
  
  const pendingCount = activeTodos.filter((t) => t.action === 'approved').length;
  const inProgressCount = activeTodos.filter((t) => t.action === 'started').length;
  const completedCount = completedTodos.length;
  const total = pendingCount + inProgressCount + completedCount;
  
  return {
    pendingCount,
    inProgressCount,
    completedCount,
    // Aliases for easier access
    pending: pendingCount,
    inProgress: inProgressCount,
    completed: completedCount,
    total,
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

import type { ShiftSummary, SupplyDemandMetrics, RiskItem, Staff, Role, TodoEvent } from './types';

// ------------------------------------------------------------
// Daily Score Derivation
// Score 0-100 based on: Task completion, Time variance, Break compliance, Zero overtime
// All calculations are based on actual events (quest + attendance)
// ------------------------------------------------------------

export interface DailyScoreBreakdown {
  taskCompletion: number;      // 0-40 points (40% weight)
  timeVariance: number;        // 0-25 points (25% weight)
  breakCompliance: number;     // 0-15 points (15% weight)
  zeroOvertime: number;        // 0-20 points (20% weight)
}

// Deduction reason with link to source event
export type DeductionCategory = 'task' | 'time' | 'break' | 'overtime';

export interface ScoreDeduction {
  id: string;
  category: DeductionCategory;
  points: number;              // Points deducted (positive number)
  reason: string;              // Human-readable reason
  eventId: string;             // Source event ID for navigation
  eventType: 'quest' | 'attendance'; // Type of source event
  timestamp: string;           // When the deduction occurred
  details?: {
    expected?: number | string;
    actual?: number | string;
    questTitle?: string;
    staffName?: string;
  };
}

export interface DailyScore {
  total: number;               // 0-100
  breakdown: DailyScoreBreakdown;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  feedback: string;
  bottlenecks: string[];
  improvements: string[];
  // New: Event-based deduction tracking
  deductions: ScoreDeduction[];
  // Summary stats for transparency
  stats: {
    totalQuests: number;
    completedQuests: number;
    onTimeQuests: number;
    breaksTaken: number;
    breaksExpected: number;
    plannedHours: number;
    actualHours: number;
    overtimeMinutes: number;
  };
}

export interface StaffDailyScore extends DailyScore {
  staffId: string;
  staffName: string;
}

export interface TeamDailyScore extends DailyScore {
  staffScores: StaffDailyScore[];
  topPerformers: Array<{ staffId: string; staffName: string; score: number }>;
  needsSupport: Array<{ staffId: string; staffName: string; issue: string }>;
}

const getGrade = (score: number): DailyScore['grade'] => {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
};

const getFeedback = (score: number, breakdown: DailyScoreBreakdown): string => {
  if (score >= 90) return '素晴らしい一日でした！全ての目標を達成しています。';
  if (score >= 80) return '良い一日でした。あと少しで完璧です！';
  if (score >= 70) return 'まずまずの一日。改善点を意識して明日に活かしましょう。';
  if (score >= 50) return '課題が残る一日でした。ボトルネックを確認しましょう。';
  return '厳しい一日でした。チームでサポートが必要かもしれません。';
};

export const deriveDailyScore = (
  events: DomainEvent[],
  staff: Staff[],
  storeId: string,
  date: string,
  staffId?: string
): DailyScore => {
  const deductions: ScoreDeduction[] = [];
  
  // Get labor events for attendance tracking
  const laborEvents = filterByType(events, 'labor') as LaborEvent[];
  const filteredLabor = laborEvents.filter(e => 
    e.storeId === storeId && 
    e.timestamp.startsWith(date) &&
    (!staffId || e.staffId === staffId)
  );
  
  // Get quest events (decision events with started/completed actions)
  const decisionEvents = filterByType(events, 'decision') as DecisionEvent[];
  const questEvents = decisionEvents.filter(e =>
    e.storeId === storeId &&
    e.timestamp.startsWith(date)
  );
  
  // Build quest state map (latest status per proposal)
  const questStates = new Map<string, DecisionEvent>();
  for (const event of questEvents.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )) {
    questStates.set(event.proposalId, event);
  }
  
  // Filter quests for this staff if specified
  const relevantQuests = Array.from(questStates.values()).filter(q => {
    if (!staffId) return true;
    // Check if quest was assigned to this staff's role
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return false;
    return q.distributedToRoles.includes(staffMember.roleId);
  });
  
  // ============================================================
  // 1. Task Completion (40 points max)
  // Based on: quest_start → quest_complete ratio and difficulty
  // ============================================================
  const totalQuests = relevantQuests.length;
  const completedQuests = relevantQuests.filter(q => q.action === 'completed').length;
  const startedButNotCompleted = relevantQuests.filter(q => 
    q.action === 'started' || q.action === 'paused'
  );
  
  // Calculate task completion score
  let taskCompletion = 40; // Start with full points
  
  if (totalQuests > 0) {
    const completionRate = completedQuests / totalQuests;
    taskCompletion = Math.round(completionRate * 40);
    
    // Add deductions for incomplete quests
    for (const quest of startedButNotCompleted) {
      const pointsDeducted = Math.round(40 / totalQuests);
      deductions.push({
        id: `task-incomplete-${quest.proposalId}`,
        category: 'task',
        points: pointsDeducted,
        reason: `未完了: ${quest.title}`,
        eventId: quest.id,
        eventType: 'quest',
        timestamp: quest.timestamp,
        details: {
          questTitle: quest.title,
        },
      });
    }
    
    // Add deductions for quests not even started
    const notStarted = relevantQuests.filter(q => 
      q.action === 'approved' || q.action === 'pending'
    );
    for (const quest of notStarted) {
      const pointsDeducted = Math.round(40 / totalQuests);
      deductions.push({
        id: `task-notstarted-${quest.proposalId}`,
        category: 'task',
        points: pointsDeducted,
        reason: `未着手: ${quest.title}`,
        eventId: quest.id,
        eventType: 'quest',
        timestamp: quest.timestamp,
        details: {
          questTitle: quest.title,
        },
      });
    }
  }
  
  // ============================================================
  // 2. Time Variance (25 points max)
  // Based on: actual vs estimated time for completed quests
  // ============================================================
  let timeVariance = 25; // Start with full points
  let onTimeQuests = 0;
  
  const completedQuestEvents = relevantQuests.filter(q => q.action === 'completed');
  
  if (completedQuestEvents.length > 0) {
    for (const quest of completedQuestEvents) {
      const estimatedMinutes = quest.estimatedMinutes ?? 30;
      const actualMinutes = quest.actualMinutes ?? estimatedMinutes;
      
      // Quest is "on-time" if actual <= estimated * 1.2 (20% buffer)
      if (actualMinutes <= estimatedMinutes * 1.2) {
        onTimeQuests++;
      } else {
        // Deduct points for overtime
        const overagePercent = (actualMinutes - estimatedMinutes) / estimatedMinutes;
        const pointsDeducted = Math.min(5, Math.round(overagePercent * 10));
        timeVariance -= pointsDeducted;
        
        deductions.push({
          id: `time-overage-${quest.proposalId}`,
          category: 'time',
          points: pointsDeducted,
          reason: `時間超過: ${quest.title}`,
          eventId: quest.id,
          eventType: 'quest',
          timestamp: quest.timestamp,
          details: {
            expected: `${estimatedMinutes}分`,
            actual: `${actualMinutes}分`,
            questTitle: quest.title,
          },
        });
      }
    }
    timeVariance = Math.max(0, timeVariance);
  }
  
  // ============================================================
  // 3. Break Compliance (15 points max)
  // Based on: break-start/break-end events matching expected pattern
  // ============================================================
  const breakStarts = filteredLabor.filter(e => e.action === 'break-start');
  const breakEnds = filteredLabor.filter(e => e.action === 'break-end');
  const breaksTaken = Math.min(breakStarts.length, breakEnds.length);
  
  // Calculate expected breaks based on work hours
  const checkIns = filteredLabor.filter(e => e.action === 'check-in');
  const checkOuts = filteredLabor.filter(e => e.action === 'check-out');
  
  let actualHours = 0;
  const sessions: Array<{ checkIn: LaborEvent; checkOut?: LaborEvent; hours: number }> = [];
  
  for (const checkIn of checkIns) {
    const checkOut = checkOuts.find(co => 
      co.staffId === checkIn.staffId && 
      new Date(co.timestamp) > new Date(checkIn.timestamp)
    );
    
    let hours = 0;
    if (checkOut) {
      hours = (new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime()) / (1000 * 60 * 60);
    } else {
      // Still working - calculate from check-in to now
      const now = new Date();
      if (new Date(checkIn.timestamp) <= now) {
        hours = (now.getTime() - new Date(checkIn.timestamp).getTime()) / (1000 * 60 * 60);
      }
    }
    
    actualHours += hours;
    sessions.push({ checkIn, checkOut, hours });
  }
  
  // Expected breaks: 1 per 6 hours of work
  const expectedBreaks = Math.max(1, Math.floor(actualHours / 6));
  const breakComplianceRate = breaksTaken >= expectedBreaks ? 1 : breaksTaken / expectedBreaks;
  let breakCompliance = Math.round(breakComplianceRate * 15);
  
  if (breaksTaken < expectedBreaks && actualHours > 0) {
    const missedBreaks = expectedBreaks - breaksTaken;
    const pointsPerMissedBreak = Math.round(15 / expectedBreaks);
    
    deductions.push({
      id: `break-missed-${date}`,
      category: 'break',
      points: missedBreaks * pointsPerMissedBreak,
      reason: `休憩未取得: ${missedBreaks}回`,
      eventId: checkIns[0]?.id ?? `labor-${date}`,
      eventType: 'attendance',
      timestamp: checkIns[0]?.timestamp ?? date,
      details: {
        expected: `${expectedBreaks}回`,
        actual: `${breaksTaken}回`,
      },
    });
  }
  
  // ============================================================
  // 4. Zero Overtime (20 points max)
  // Based on: check-in/check-out vs planned hours
  // ============================================================
  const plannedHours = 8; // Default planned hours per day
  const overtimeMinutes = Math.max(0, Math.round((actualHours - plannedHours) * 60));
  
  let zeroOvertime = 20;
  if (overtimeMinutes > 0) {
    // Deduct 2 points per 30 minutes of overtime
    const pointsDeducted = Math.min(20, Math.round(overtimeMinutes / 30) * 2);
    zeroOvertime = Math.max(0, 20 - pointsDeducted);
    
    // Find the checkout event that caused overtime
    const lastSession = sessions[sessions.length - 1];
    if (lastSession && lastSession.hours > plannedHours) {
      deductions.push({
        id: `overtime-${date}`,
        category: 'overtime',
        points: pointsDeducted,
        reason: `残業: ${overtimeMinutes}分`,
        eventId: lastSession.checkOut?.id ?? lastSession.checkIn.id,
        eventType: 'attendance',
        timestamp: lastSession.checkOut?.timestamp ?? lastSession.checkIn.timestamp,
        details: {
          expected: `${plannedHours}時間`,
          actual: `${actualHours.toFixed(1)}時間`,
        },
      });
    }
  }
  
  // ============================================================
  // Calculate final score and summary
  // ============================================================
  const breakdown: DailyScoreBreakdown = {
    taskCompletion,
    timeVariance,
    breakCompliance,
    zeroOvertime,
  };
  
  const total = taskCompletion + timeVariance + breakCompliance + zeroOvertime;
  
  // Sort deductions by points (highest first)
  deductions.sort((a, b) => b.points - a.points);
  
  // Determine bottlenecks based on actual deductions
  const bottlenecks: string[] = [];
  if (taskCompletion < 32) bottlenecks.push('タスク完了率が低い');
  if (timeVariance < 20) bottlenecks.push('作業時間の遅延が多い');
  if (breakCompliance < 12) bottlenecks.push('休憩が適切に取れていない');
  if (zeroOvertime < 16) bottlenecks.push('残業が発生している');
  
  // Improvements for tomorrow
  const improvements: string[] = [];
  if (taskCompletion < 32) improvements.push('優先度の高いタスクから着手する');
  if (timeVariance < 20) improvements.push('見積り時間を意識して作業する');
  if (breakCompliance < 12) improvements.push('休憩時間を確保する');
  if (zeroOvertime < 16) improvements.push('定時退勤を心がける');
  
  return {
    total,
    breakdown,
    grade: getGrade(total),
    feedback: getFeedback(total, breakdown),
    bottlenecks,
    improvements,
    deductions,
    stats: {
      totalQuests,
      completedQuests,
      onTimeQuests,
      breaksTaken,
      breaksExpected: expectedBreaks,
      plannedHours,
      actualHours: Math.round(actualHours * 10) / 10,
      overtimeMinutes,
    },
  };
};

export const deriveTeamDailyScore = (
  events: DomainEvent[],
  staff: Staff[],
  storeId: string,
  date: string
): TeamDailyScore => {
  const storeStaff = staff.filter(s => s.storeId === storeId);
  
  // Calculate individual scores
  const staffScores: StaffDailyScore[] = storeStaff.map(s => {
    const score = deriveDailyScore(events, staff, storeId, date, s.id);
    return {
      ...score,
      staffId: s.id,
      staffName: s.name,
    };
  });
  
  // Calculate team average
  const avgTotal = staffScores.length > 0 
    ? Math.round(staffScores.reduce((sum, s) => sum + s.total, 0) / staffScores.length)
    : 0;
  
  const avgBreakdown: DailyScoreBreakdown = {
    taskCompletion: staffScores.length > 0
      ? Math.round(staffScores.reduce((sum, s) => sum + s.breakdown.taskCompletion, 0) / staffScores.length)
      : 0,
    timeVariance: staffScores.length > 0
      ? Math.round(staffScores.reduce((sum, s) => sum + s.breakdown.timeVariance, 0) / staffScores.length)
      : 0,
    breakCompliance: staffScores.length > 0
      ? Math.round(staffScores.reduce((sum, s) => sum + s.breakdown.breakCompliance, 0) / staffScores.length)
      : 0,
    zeroOvertime: staffScores.length > 0
      ? Math.round(staffScores.reduce((sum, s) => sum + s.breakdown.zeroOvertime, 0) / staffScores.length)
      : 0,
  };
  
  // Top performers (score >= 80)
  const topPerformers = staffScores
    .filter(s => s.total >= 80)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(s => ({ staffId: s.staffId, staffName: s.staffName, score: s.total }));
  
  // Needs support (score < 60 or has bottlenecks)
  const needsSupport = staffScores
    .filter(s => s.total < 60)
    .map(s => ({ 
      staffId: s.staffId, 
      staffName: s.staffName, 
      issue: s.bottlenecks[0] || '全体的にサポートが必要' 
    }));
  
  // Team bottlenecks (most common)
  const allBottlenecks = staffScores.flatMap(s => s.bottlenecks);
  const bottleneckCounts = new Map<string, number>();
  for (const b of allBottlenecks) {
    bottleneckCounts.set(b, (bottleneckCounts.get(b) || 0) + 1);
  }
  const teamBottlenecks = [...bottleneckCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([b]) => b);
  
  // Team improvements
  const allImprovements = staffScores.flatMap(s => s.improvements);
  const improvementSet = new Set(allImprovements);
  const teamImprovements = [...improvementSet].slice(0, 3);
  
  // Aggregate team deductions (top deductions across all staff)
  const allDeductions = staffScores.flatMap(s => 
    s.deductions.map(d => ({
      ...d,
      details: { ...d.details, staffName: s.staffName },
    }))
  );
  allDeductions.sort((a, b) => b.points - a.points);
  const teamDeductions = allDeductions.slice(0, 5); // Top 5 team deductions
  
  // Aggregate team stats
  const teamStats = {
    totalQuests: staffScores.reduce((sum, s) => sum + s.stats.totalQuests, 0),
    completedQuests: staffScores.reduce((sum, s) => sum + s.stats.completedQuests, 0),
    onTimeQuests: staffScores.reduce((sum, s) => sum + s.stats.onTimeQuests, 0),
    breaksTaken: staffScores.reduce((sum, s) => sum + s.stats.breaksTaken, 0),
    breaksExpected: staffScores.reduce((sum, s) => sum + s.stats.breaksExpected, 0),
    plannedHours: staffScores.reduce((sum, s) => sum + s.stats.plannedHours, 0),
    actualHours: Math.round(staffScores.reduce((sum, s) => sum + s.stats.actualHours, 0) * 10) / 10,
    overtimeMinutes: staffScores.reduce((sum, s) => sum + s.stats.overtimeMinutes, 0),
  };
  
  return {
    total: avgTotal,
    breakdown: avgBreakdown,
    grade: getGrade(avgTotal),
    feedback: getFeedback(avgTotal, avgBreakdown),
    bottlenecks: teamBottlenecks,
    improvements: teamImprovements,
    deductions: teamDeductions,
    stats: teamStats,
    staffScores,
    topPerformers,
    needsSupport,
  };
};

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

  // Count active staff (not on break)
  let activeStaffCount = 0;
  for (const [, session] of sessions) {
    if (session.isActive && !session.isOnBreak) {
      activeStaffCount++;
    }
  }
  
  // Planned hours: null when no shift data available, otherwise estimate from staff count
  // In a real system, this would come from the shift plan
  const hasShiftData = storeStaff.length > 0;
  const plannedHours = hasShiftData ? storeStaff.length * 8 : null;
  
  // Check if we have enough data
  const isCalculating = sessions.size === 0;

  return {
    plannedHours,
    actualHours: Math.max(0, Math.round(actualHours * 10) / 10),
    activeStaffCount,
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
  
  // Filter labor, sales, and decision events for this store
  const laborEvents = filterByType(events, 'labor') as LaborEvent[];
  const salesEvents = filterByType(events, 'sales') as SalesEvent[];
  const decisionEvents = filterByType(events, 'decision') as DecisionEvent[];
  
  const dailyRows: WeeklyLaborDailyRow[] = [];
  let totalHours = 0;
  let totalLaborCost = 0;
  let totalSales: number | null = 0;
  let hasSalesData = false;
  const staffIdsAllWeek = new Set<string>();
  const starMixTotal = { star3: 0, star2: 0, star1: 0 };
  
  // HR-focused tracking
  let totalOvertimeMinutes = 0;
  let overtimeDays = 0;
  let totalQuestDelays = 0;
  let totalQuestsCompleted = 0;
  let totalQuestsCount = 0;
  const dayScores: number[] = [];
  
  // Track quest delays by title for chronic delay detection
  const questDelayTracker = new Map<string, { count: number; totalDelayMinutes: number }>();
  
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
      daySales = daySalesEvents.reduce((sum, e) => sum + e.total, 0);
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
    
    // Calculate overtime (assume 8h standard shift per staff)
    const standardHours = dayStaffIds.size * 8;
    const dayOvertimeMinutes = Math.max(0, Math.round((dayHours - standardHours) * 60));
    const hasOvertime = dayOvertimeMinutes > 0;
    if (hasOvertime) {
      overtimeDays++;
      totalOvertimeMinutes += dayOvertimeMinutes;
    }
    
    // Get quest/decision events for this day
    const dayDecisionEvents = decisionEvents.filter(
      e => e.storeId === storeId && e.timestamp.startsWith(date)
    );
    
    // Track quests by proposalId to get latest status
    const questStatus = new Map<string, DecisionEvent>();
    for (const evt of dayDecisionEvents) {
      const existing = questStatus.get(evt.proposalId);
      if (!existing || new Date(evt.timestamp) > new Date(existing.timestamp)) {
        questStatus.set(evt.proposalId, evt);
      }
    }
    
    let dayQuestDelayCount = 0;
    let dayQuestCompletedCount = 0;
    let dayQuestTotalCount = 0;
    
    for (const [, quest] of questStatus) {
      if (quest.action === 'completed' || quest.action === 'started' || quest.action === 'paused') {
        dayQuestTotalCount++;
        
        if (quest.action === 'completed') {
          dayQuestCompletedCount++;
          
          // Check if delayed (actual > estimated)
          if (quest.actualMinutes && quest.estimatedMinutes && quest.actualMinutes > quest.estimatedMinutes) {
            dayQuestDelayCount++;
            const delayMinutes = quest.actualMinutes - quest.estimatedMinutes;
            
            // Track for chronic delay detection
            const tracker = questDelayTracker.get(quest.title) || { count: 0, totalDelayMinutes: 0 };
            tracker.count++;
            tracker.totalDelayMinutes += delayMinutes;
            questDelayTracker.set(quest.title, tracker);
          }
        }
      }
    }
    
    totalQuestDelays += dayQuestDelayCount;
    totalQuestsCompleted += dayQuestCompletedCount;
    totalQuestsCount += dayQuestTotalCount;
    
    // Calculate day score (simplified: based on task completion and overtime)
    let dayScore: number | null = null;
    if (dayQuestTotalCount > 0 || dayStaffIds.size > 0) {
      const taskCompletionScore = dayQuestTotalCount > 0 
        ? (dayQuestCompletedCount / dayQuestTotalCount) * 40 
        : 40;
      const onTimeScore = dayQuestCompletedCount > 0 
        ? ((dayQuestCompletedCount - dayQuestDelayCount) / dayQuestCompletedCount) * 30 
        : 30;
      const overtimeScore = hasOvertime ? Math.max(0, 30 - dayOvertimeMinutes / 2) : 30;
      dayScore = Math.round(taskCompletionScore + onTimeScore + overtimeScore);
      dayScores.push(dayScore);
    }
    
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
      dayScore,
      overtimeFlag: hasOvertime,
      overtimeMinutes: dayOvertimeMinutes,
      questDelayCount: dayQuestDelayCount,
      questCompletedCount: dayQuestCompletedCount,
      questTotalCount: dayQuestTotalCount,
    });
  }
  
  // Calculate weekly summary
  const avgLaborRate = hasSalesData && totalSales && totalSales > 0
    ? Math.round((totalLaborCost / totalSales) * 1000) / 10
    : null;
  const salesPerLaborCost = hasSalesData && totalLaborCost > 0 && totalSales
    ? Math.round((totalSales / totalLaborCost) * 100) / 100
    : null;
  
  // HR-focused summary calculations
  const avgDayScore = dayScores.length > 0 
    ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length)
    : null;
  const questCompletionRate = totalQuestsCount > 0
    ? Math.round((totalQuestsCompleted / totalQuestsCount) * 100) / 100
    : 1;
  
  // Find winning mix (highest scoring day)
  const scoredRows = dailyRows.filter(r => r.dayScore !== null);
  const winningDay = scoredRows.length > 0
    ? scoredRows.reduce((best, row) => 
        (row.dayScore ?? 0) > (best.dayScore ?? 0) ? row : best
      )
    : null;
  const winningMix = winningDay ? {
    dayLabel: winningDay.dayLabel,
    starMix: winningDay.starMix,
    score: winningDay.dayScore ?? 0,
  } : null;
  
  // Find weak time bands
  const weakTimeBands: WeeklyLaborMetrics['weakTimeBands'] = [];
  for (const row of dailyRows) {
    if (row.dayScore !== null && row.dayScore < 70) {
      weakTimeBands.push({ dayLabel: row.dayLabel, issue: 'low_score', value: row.dayScore });
    }
    if (row.overtimeFlag && row.overtimeMinutes > 30) {
      weakTimeBands.push({ dayLabel: row.dayLabel, issue: 'overtime', value: row.overtimeMinutes });
    }
    if (row.questDelayCount >= 2) {
      weakTimeBands.push({ dayLabel: row.dayLabel, issue: 'quest_delay', value: row.questDelayCount });
    }
  }
  // Sort by severity (low score first, then overtime, then delays)
  weakTimeBands.sort((a, b) => {
    if (a.issue === 'low_score' && b.issue !== 'low_score') return -1;
    if (a.issue !== 'low_score' && b.issue === 'low_score') return 1;
    return b.value - a.value;
  });
  
  // Find chronic delay quests (delayed 2+ times)
  const chronicDelayQuests: WeeklyLaborMetrics['chronicDelayQuests'] = [];
  for (const [title, tracker] of questDelayTracker) {
    if (tracker.count >= 2) {
      chronicDelayQuests.push({
        questTitle: title,
        delayCount: tracker.count,
        avgDelayMinutes: Math.round(tracker.totalDelayMinutes / tracker.count),
      });
    }
  }
  chronicDelayQuests.sort((a, b) => b.delayCount - a.delayCount);
  
  return {
    weekSummary: {
      totalHours: Math.round(totalHours * 10) / 10,
      totalLaborCost: Math.round(totalLaborCost),
      avgLaborRate,
      salesPerLaborCost,
      totalSales: hasSalesData ? totalSales : null,
      staffCountTotal: staffIdsAllWeek.size,
      starMixTotal,
      avgDayScore,
      overtimeDays,
      totalOvertimeMinutes,
      totalQuestDelays,
      questCompletionRate,
    },
    dailyRows,
    winningMix,
    weakTimeBands: weakTimeBands.slice(0, 5),
    chronicDelayQuests: chronicDelayQuests.slice(0, 5),
    weekStart: weekStartDate,
    weekEnd,
    lastUpdate: now.toISOString(),
    isCalculating: dailyRows.every(r => r.staffCount === 0),
  };
};

// ------------------------------------------------------------
// Labor Guardrail Summary Derivation
// ------------------------------------------------------------

import { LABOR_GUARDRAILS_CONFIG, type LaborGuardrailBracket } from '@/data/mock';

export interface LaborGuardrailInput {
  businessDate: string;
  dayType: 'weekday' | 'weekend';
  forecastSalesDaily: number;
  runRateSalesDaily: number;
  plannedLaborCostDaily: number;
  actualLaborCostSoFar: number;
}

export interface LaborGuardrailSummary {
  selectedBracket: LaborGuardrailBracket;
  projectedLaborCostEOD: number;
  projectedLaborRateEOD: number;
  goodRateSales: number;  // highSales at goodRate
  badRateSales: number;   // lowSales at badRate
  deltaToGood: number;    // positive = over good threshold (danger)
  deltaToBad: number;     // positive = over bad threshold (critical)
  status: 'safe' | 'caution' | 'danger';
  lastUpdate: string;
}

/**
 * Select the most appropriate guardrail bracket based on forecast sales
 * Uses the bracket with highSales closest to (but >= ) forecastSalesDaily
 */
function selectGuardrailBracket(
  forecastSales: number,
  dayType: 'weekday' | 'weekend'
): LaborGuardrailBracket {
  const brackets = dayType === 'weekday' 
    ? LABOR_GUARDRAILS_CONFIG.weekday 
    : LABOR_GUARDRAILS_CONFIG.weekend;
  
  // Sort brackets by highSales ascending
  const sorted = [...brackets].sort((a, b) => a.highSales - b.highSales);
  
  // Find the first bracket where highSales >= forecastSales
  for (const bracket of sorted) {
    if (bracket.highSales >= forecastSales) {
      return bracket;
    }
  }
  
  // If forecast exceeds all brackets, return the highest
  return sorted[sorted.length - 1];
}

/**
 * Derive labor guardrail summary for cockpit display
 * This helps managers understand if labor cost is on track relative to sales
 */
export const deriveLaborGuardrailSummary = (
  input: LaborGuardrailInput
): LaborGuardrailSummary => {
  const {
    dayType,
    forecastSalesDaily,
    runRateSalesDaily,
    plannedLaborCostDaily,
  } = input;
  
  // Select appropriate bracket
  const bracket = selectGuardrailBracket(forecastSalesDaily, dayType);
  
  // For now, projected cost = planned cost (later: adjust for overtime/early leave)
  const projectedLaborCostEOD = plannedLaborCostDaily;
  
  // Calculate projected labor rate based on run rate sales
  const projectedLaborRateEOD = runRateSalesDaily > 0 
    ? projectedLaborCostEOD / runRateSalesDaily 
    : 0;
  
  // Calculate deltas
  const deltaToGood = projectedLaborRateEOD - bracket.goodRate;
  const deltaToBad = projectedLaborRateEOD - bracket.badRate;
  
  // Determine status
  let status: 'safe' | 'caution' | 'danger';
  if (deltaToBad >= 0) {
    status = 'danger';
  } else if (deltaToGood >= 0) {
    status = 'caution';
  } else {
    status = 'safe';
  }
  
  return {
    selectedBracket: bracket,
    projectedLaborCostEOD,
    projectedLaborRateEOD,
    goodRateSales: bracket.highSales,
    badRateSales: bracket.lowSales,
    deltaToGood,
    deltaToBad,
    status,
    lastUpdate: new Date().toISOString(),
  };
};

// ------------------------------------------------------------
// Demand Drop Detection
// ------------------------------------------------------------

import { getMenuSalesHistory, MENUS, type MenuSalesRecord, type SalesChannel } from '@/data/mock';
import type { DemandDropMeta, ProposalType } from './types';

export interface DemandDropDetectionResult {
  menuId: string;
  menuName: string;
  avg3Day: number;
  avg7Day: number;
  dropRate: number; // 0.35 = 35% drop
  absoluteDrop: number;
  severity: 'warning' | 'critical';
  affectedTimeBands: Array<{ timeBand: TimeBand; dropRate: number }>;
  affectedChannels: Array<{ channel: string; dropRate: number }>;
}

// Detection thresholds
const DEMAND_DROP_THRESHOLDS = {
  relativeDropWarning: 0.20, // 20% drop = warning
  relativeDropCritical: 0.35, // 35% drop = critical
  absoluteDropMin: 5, // At least 5 units drop to trigger
  minDailyVolume: 3, // Exclude menus with < 3 daily avg (low volume)
};

// Hypothesis templates based on conditions
const HYPOTHESIS_TEMPLATES = [
  { 
    id: 'h-competitor', 
    condition: (r: DemandDropDetectionResult) => r.dropRate > 0.3,
    text: '近隣の競合店が新メニューやプロモーションを開始した可能性',
    confidence: 'medium' as const,
  },
  { 
    id: 'h-seasonal', 
    condition: (r: DemandDropDetectionResult) => true, // Always consider
    text: '季節的な需要変動（気温変化、イベント終了など）',
    confidence: 'medium' as const,
  },
  { 
    id: 'h-quality', 
    condition: (r: DemandDropDetectionResult) => r.affectedChannels.some(c => c.channel === 'dine-in' && c.dropRate > 0.25),
    text: '品質や提供スピードに関する顧客不満の可能性',
    confidence: 'low' as const,
  },
  { 
    id: 'h-price', 
    condition: (r: DemandDropDetectionResult) => r.dropRate > 0.25,
    text: '価格感度の変化（値上げ後の反応、競合との価格差）',
    confidence: 'medium' as const,
  },
  { 
    id: 'h-delivery-issue', 
    condition: (r: DemandDropDetectionResult) => r.affectedChannels.some(c => c.channel === 'delivery' && c.dropRate > 0.3),
    text: 'デリバリープラットフォームでの表示順位低下または配達遅延',
    confidence: 'high' as const,
  },
  { 
    id: 'h-social', 
    condition: (r: DemandDropDetectionResult) => r.dropRate > 0.4,
    text: 'SNSやレビューサイトでのネガティブな投稿',
    confidence: 'low' as const,
  },
];

// Recommended actions based on conditions
const ACTION_TEMPLATES = [
  {
    id: 'a-menu-restrict',
    condition: (r: DemandDropDetectionResult) => r.dropRate > 0.35,
    text: '一時的なメニュー制限で他商品へ誘導',
    proposalType: 'menu-restriction' as ProposalType,
    expectedEffect: 'waste-reduction' as ExpectedEffect,
    targetRoles: ['manager', 'kitchen'],
  },
  {
    id: 'a-prep-adjust',
    condition: (r: DemandDropDetectionResult) => r.absoluteDrop > 5,
    text: '仕込み量を削減してロスを抑制',
    proposalType: 'prep-amount-adjust' as ProposalType,
    expectedEffect: 'waste-reduction' as ExpectedEffect,
    targetRoles: ['kitchen'],
  },
  {
    id: 'a-quality-check',
    condition: (r: DemandDropDetectionResult) => r.affectedChannels.some(c => c.channel === 'dine-in'),
    text: '調理品質と提供オペレーションの確認',
    proposalType: 'quality-check' as ProposalType,
    expectedEffect: 'sales-impact' as ExpectedEffect,
    targetRoles: ['manager', 'kitchen'],
  },
  {
    id: 'a-channel-switch',
    condition: (r: DemandDropDetectionResult) => r.affectedChannels.some(c => c.channel === 'delivery' && c.dropRate > 0.25),
    text: 'デリバリー以外のチャネルへプロモーション集中',
    proposalType: 'channel-switch' as ProposalType,
    expectedEffect: 'sales-impact' as ExpectedEffect,
    targetRoles: ['manager', 'floor'],
  },
];

/**
 * Detect menus with significant demand drop
 * Compares 3-day average vs 7-day average
 */
export const detectDemandDrops = (
  storeId: string
): DemandDropDetectionResult[] => {
  const records = getMenuSalesHistory(storeId);
  const today = new Date();
  const results: DemandDropDetectionResult[] = [];

  // Get unique menu IDs
  const menuIds = [...new Set(records.map(r => r.menuId))];

  for (const menuId of menuIds) {
    const menuRecords = records.filter(r => r.menuId === menuId);
    
    // Group by date
    const byDate = new Map<string, number>();
    for (const rec of menuRecords) {
      byDate.set(rec.date, (byDate.get(rec.date) ?? 0) + rec.qty);
    }

    // Get sorted dates
    const dates = [...byDate.keys()].sort();
    if (dates.length < 7) continue; // Need at least 7 days of data

    // Calculate 3-day average (most recent 3 days)
    const recent3Days = dates.slice(-3);
    const avg3Day = recent3Days.reduce((sum, d) => sum + (byDate.get(d) ?? 0), 0) / 3;

    // Calculate 7-day average (days 4-10, excluding recent 3)
    const previous7Days = dates.slice(-10, -3);
    if (previous7Days.length === 0) continue;
    const avg7Day = previous7Days.reduce((sum, d) => sum + (byDate.get(d) ?? 0), 0) / previous7Days.length;

    // Skip low volume menus
    if (avg7Day < DEMAND_DROP_THRESHOLDS.minDailyVolume) continue;

    // Calculate drop
    const absoluteDrop = avg7Day - avg3Day;
    const dropRate = avg7Day > 0 ? absoluteDrop / avg7Day : 0;

    // Check thresholds
    if (dropRate < DEMAND_DROP_THRESHOLDS.relativeDropWarning) continue;
    if (absoluteDrop < DEMAND_DROP_THRESHOLDS.absoluteDropMin) continue;

    // Determine severity
    const severity: 'warning' | 'critical' = 
      dropRate >= DEMAND_DROP_THRESHOLDS.relativeDropCritical ? 'critical' : 'warning';

    // Analyze by time band
    const byTimeBand = new Map<string, { recent: number; previous: number }>();
    for (const rec of menuRecords) {
      const isRecent = recent3Days.includes(rec.date);
      const isPrevious = previous7Days.includes(rec.date);
      if (!isRecent && !isPrevious) continue;

      const entry = byTimeBand.get(rec.timeBand) ?? { recent: 0, previous: 0 };
      if (isRecent) entry.recent += rec.qty;
      if (isPrevious) entry.previous += rec.qty;
      byTimeBand.set(rec.timeBand, entry);
    }

    const affectedTimeBands: Array<{ timeBand: TimeBand; dropRate: number }> = [];
    for (const [tb, data] of byTimeBand) {
      const tbDropRate = data.previous > 0 ? (data.previous - data.recent) / data.previous : 0;
      if (tbDropRate > 0.1) {
        affectedTimeBands.push({ timeBand: tb as TimeBand, dropRate: tbDropRate });
      }
    }
    affectedTimeBands.sort((a, b) => b.dropRate - a.dropRate);

    // Analyze by channel
    const byChannel = new Map<string, { recent: number; previous: number }>();
    for (const rec of menuRecords) {
      const isRecent = recent3Days.includes(rec.date);
      const isPrevious = previous7Days.includes(rec.date);
      if (!isRecent && !isPrevious) continue;

      const entry = byChannel.get(rec.channel) ?? { recent: 0, previous: 0 };
      if (isRecent) entry.recent += rec.qty;
      if (isPrevious) entry.previous += rec.qty;
      byChannel.set(rec.channel, entry);
    }

    const affectedChannels: Array<{ channel: string; dropRate: number }> = [];
    for (const [ch, data] of byChannel) {
      const chDropRate = data.previous > 0 ? (data.previous - data.recent) / data.previous : 0;
      if (chDropRate > 0.1) {
        affectedChannels.push({ channel: ch, dropRate: chDropRate });
      }
    }
    affectedChannels.sort((a, b) => b.dropRate - a.dropRate);

    // Get menu name
    const menu = MENUS.find(m => m.id === menuId);
    const menuName = menu?.name ?? menuId;

    results.push({
      menuId,
      menuName,
      avg3Day: Math.round(avg3Day * 10) / 10,
      avg7Day: Math.round(avg7Day * 10) / 10,
      dropRate: Math.round(dropRate * 100) / 100,
      absoluteDrop: Math.round(absoluteDrop * 10) / 10,
      severity,
      affectedTimeBands,
      affectedChannels,
    });
  }

  // Sort by drop rate descending
  results.sort((a, b) => b.dropRate - a.dropRate);

  return results;
};

/**
 * Convert demand drop detection results to exception items
 */
export const deriveDemandDropExceptions = (
  storeId: string
): ExceptionItem[] => {
  const drops = detectDemandDrops(storeId);
  const now = new Date();

  return drops.slice(0, 5).map((drop, index) => {
    // Generate hypotheses
    const hypotheses = HYPOTHESIS_TEMPLATES
      .filter(h => h.condition(drop))
      .slice(0, 3)
      .map(h => ({ id: h.id, text: h.text, confidence: h.confidence }));

    // Generate recommended actions
    const recommendedActions = ACTION_TEMPLATES
      .filter(a => a.condition(drop))
      .slice(0, 3)
      .map(a => ({ 
        id: a.id, 
        text: a.text, 
        proposalType: a.proposalType,
        expectedEffect: a.expectedEffect,
        targetRoles: a.targetRoles,
      }));

    const demandDropMeta: DemandDropMeta = {
      menuId: drop.menuId,
      menuName: drop.menuName,
      dropRate: drop.dropRate,
      absoluteDrop: drop.absoluteDrop,
      avg3Day: drop.avg3Day,
      avg7Day: drop.avg7Day,
      affectedTimeBands: drop.affectedTimeBands,
      affectedChannels: drop.affectedChannels,
      hypotheses,
      recommendedActions,
    };

    const exception: ExceptionItem = {
      id: `demand-drop-${storeId}-${drop.menuId}-${now.getTime()}`,
      type: 'demand-drop',
      severity: drop.severity,
      title: `${drop.menuName}の出数下降`,
      description: `直近3日平均${drop.avg3Day}食 vs 前週${drop.avg7Day}食（${Math.round(drop.dropRate * 100)}%減）`,
      relatedEventId: `menu-${drop.menuId}`,
      detectedAt: now.toISOString(),
      resolved: false,
      status: 'unhandled',
      impact: {
        timeBand: drop.affectedTimeBands[0]?.timeBand ?? 'all',
        affectedItems: [{ id: drop.menuId, name: drop.menuName, type: 'menu' }],
        impactType: 'stockout', // Using stockout as proxy for demand issues
        impactSeverity: drop.severity === 'critical' ? 'high' : 'medium',
      },
      demandDropMeta,
    };

    return exception;
  });
};

// ------------------------------------------------------------
// Team Performance Metrics Derivation
// ------------------------------------------------------------

export type Period = 'today' | '7d' | '4w';

export interface TeamSnapshot {
  teamScoreAvg: number | null;
  questCompletion: { completed: number; total: number; rate: number | null };
  delayRate: number | null; // percentage of completed quests that were delayed
  breakCompliance: number | null; // percentage of staff who took required breaks
  overtimeRate: number | null; // percentage of staff with overtime
  qualityNgRate: number | null; // percentage of quests with NG quality
}

export interface SkillMixCoverage {
  starMix: { star1: number; star2: number; star3: number };
  roleMix: Map<string, number>; // role code -> count
  peakCoverage: 'good' | 'warning' | 'critical' | null; // null if not trackable
  peakCoverageReason: string;
}

export interface IndividualPerformance {
  staffId: string;
  name: string;
  starLevel: 1 | 2 | 3;
  roleCode: string;
  roleName: string;
  hoursWorked: number | null;
  questsDone: number;
  questsTotal: number;
  avgDurationVsEstimate: number | null; // percentage (100 = on time, >100 = over)
  delayRate: number | null;
  breakCompliance: boolean | null;
  qualityOkCount: number;
  qualityNgCount: number;
  score: number;
}

export interface CoachingAction {
  id: string;
  action: string;
  reason: string;
  targetStaffId?: string;
  targetStaffName?: string;
  targetQuestId?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PromotionCandidate {
  staffId: string;
  staffName: string;
  currentStar: 1 | 2 | 3;
  criteria: string[];
  score: number;
}

export interface TeamPerformanceMetrics {
  teamSnapshot: TeamSnapshot;
  skillMixCoverage: SkillMixCoverage;
  individuals: IndividualPerformance[];
  coachingActions: CoachingAction[];
  promotionCandidates: PromotionCandidate[];
  period: Period;
  timeBand: TimeBand;
  lastUpdate: string;
  dataAvailability: {
    hasLaborData: boolean;
    hasQuestData: boolean;
    hasQualityData: boolean;
  };
}

export const deriveTeamPerformanceMetrics = (
  events: DomainEvent[],
  staff: Staff[],
  roles: Role[],
  storeId: string,
  period: Period,
  timeBand: TimeBand
): TeamPerformanceMetrics => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Calculate date range based on period
  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date(today);
    const start = new Date(today);
    switch (period) {
      case '7d':
        start.setDate(start.getDate() - 6);
        break;
      case '4w':
        start.setDate(start.getDate() - 27);
        break;
      default: // today
        break;
    }
    return { start, end };
  };
  
  const { start, end } = getDateRange();
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  // Filter staff for this store
  const storeStaff = staff.filter(s => s.storeId === storeId);
  const roleMap = new Map(roles.map(r => [r.id, r]));
  
  // Filter events for date range
  const isInRange = (timestamp: string) => {
    const date = timestamp.split('T')[0];
    return date >= startStr && date <= endStr;
  };
  
  // Get labor events
  const laborEvents = (filterByType(events, 'labor') as LaborEvent[])
    .filter(e => e.storeId === storeId && isInRange(e.timestamp));
  
  // Get decision events (quests)
  const decisionEvents = (filterByType(events, 'decision') as DecisionEvent[])
    .filter(e => e.storeId === storeId && isInRange(e.timestamp));
  
  // Get latest status for each quest
  const questStatuses = new Map<string, DecisionEvent>();
  for (const event of decisionEvents.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )) {
    questStatuses.set(event.proposalId, event);
  }
  
  const completedQuests = Array.from(questStatuses.values()).filter(q => q.action === 'completed');
  const allQuests = Array.from(questStatuses.values()).filter(
    q => q.action !== 'rejected'
  );
  
  // Data availability flags
  const hasLaborData = laborEvents.length > 0;
  const hasQuestData = allQuests.length > 0;
  const hasQualityData = completedQuests.some(q => q.qualityStatus !== undefined);
  
  // Calculate individual performance
  const individuals: IndividualPerformance[] = storeStaff.map(s => {
    const role = roleMap.get(s.roleId);
    
    // Calculate hours worked
    const staffLaborEvents = laborEvents.filter(e => e.staffId === s.id);
    let hoursWorked: number | null = null;
    let tookBreak = false;
    
    if (staffLaborEvents.length > 0) {
      let totalMinutes = 0;
      let checkInTime: Date | null = null;
      let breakStartTime: Date | null = null;
      
      for (const event of staffLaborEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )) {
        switch (event.action) {
          case 'check-in':
            checkInTime = new Date(event.timestamp);
            break;
          case 'check-out':
            if (checkInTime) {
              totalMinutes += (new Date(event.timestamp).getTime() - checkInTime.getTime()) / 60000;
              checkInTime = null;
            }
            break;
          case 'break-start':
            tookBreak = true;
            breakStartTime = new Date(event.timestamp);
            break;
          case 'break-end':
            breakStartTime = null;
            break;
        }
      }
      
      // If still checked in, count time until now
      if (checkInTime) {
        totalMinutes += (now.getTime() - checkInTime.getTime()) / 60000;
      }
      
      hoursWorked = Math.round(totalMinutes / 6) / 10; // Round to 1 decimal
    }
    
    // Calculate quest performance
    const staffQuests = completedQuests.filter(
      q => q.assigneeId === s.id || q.distributedToRoles.includes(s.roleId)
    );
    const staffAllQuests = allQuests.filter(
      q => q.assigneeId === s.id || q.distributedToRoles.includes(s.roleId)
    );
    
    const questsDone = staffQuests.length;
    const questsTotal = staffAllQuests.length;
    
    // Calculate avg duration vs estimate
    let avgDurationVsEstimate: number | null = null;
    const questsWithTiming = staffQuests.filter(
      q => q.actualMinutes !== undefined && q.estimatedMinutes !== undefined && q.estimatedMinutes > 0
    );
    if (questsWithTiming.length > 0) {
      const totalRatio = questsWithTiming.reduce(
        (sum, q) => sum + ((q.actualMinutes ?? 0) / (q.estimatedMinutes ?? 1)) * 100,
        0
      );
      avgDurationVsEstimate = Math.round(totalRatio / questsWithTiming.length);
    }
    
    // Calculate delay rate
    const delayedQuests = staffQuests.filter(
      q => q.actualMinutes !== undefined && q.estimatedMinutes !== undefined && 
           q.actualMinutes > q.estimatedMinutes
    );
    const delayRate = questsDone > 0 ? Math.round((delayedQuests.length / questsDone) * 100) : null;
    
    // Quality counts
    const qualityOkCount = staffQuests.filter(q => q.qualityStatus === 'ok').length;
    const qualityNgCount = staffQuests.filter(q => q.qualityStatus === 'ng').length;
    
    // Calculate score (weighted)
    let score = 50; // Base score
    if (questsDone > 0) {
      score += Math.min(20, questsDone * 2); // Up to 20 points for quests done
    }
    if (avgDurationVsEstimate !== null) {
      score += avgDurationVsEstimate <= 100 ? 15 : Math.max(0, 15 - (avgDurationVsEstimate - 100) / 5);
    }
    if (delayRate !== null) {
      score += Math.max(0, 10 - delayRate / 10);
    }
    if (hasQualityData && (qualityOkCount + qualityNgCount) > 0) {
      const qualityRate = qualityOkCount / (qualityOkCount + qualityNgCount);
      score += qualityRate * 5;
    }
    score = Math.round(Math.min(100, Math.max(0, score)));
    
    // Break compliance
    const breakCompliance = hoursWorked !== null && hoursWorked >= 4 
      ? tookBreak 
      : null; // Not applicable if worked less than 4 hours
    
    return {
      staffId: s.id,
      name: s.name,
      starLevel: s.starLevel,
      roleCode: role?.code ?? 'unknown',
      roleName: role?.name ?? 'Unknown',
      hoursWorked,
      questsDone,
      questsTotal,
      avgDurationVsEstimate,
      delayRate,
      breakCompliance,
      qualityOkCount,
      qualityNgCount,
      score,
    };
  });
  
  // Sort by score descending
  individuals.sort((a, b) => b.score - a.score);
  
  // Calculate team snapshot
  const activeIndividuals = individuals.filter(i => i.hoursWorked !== null && i.hoursWorked > 0);
  
  const teamScoreAvg = activeIndividuals.length > 0
    ? Math.round(activeIndividuals.reduce((sum, i) => sum + i.score, 0) / activeIndividuals.length)
    : null;
  
  const questCompletion = {
    completed: completedQuests.length,
    total: allQuests.length,
    rate: allQuests.length > 0 
      ? Math.round((completedQuests.length / allQuests.length) * 100) 
      : null,
  };
  
  const delayedQuestsCount = completedQuests.filter(
    q => q.actualMinutes !== undefined && q.estimatedMinutes !== undefined && 
         q.actualMinutes > q.estimatedMinutes
  ).length;
  const delayRate = completedQuests.length > 0
    ? Math.round((delayedQuestsCount / completedQuests.length) * 100)
    : null;
  
  const staffNeedingBreaks = activeIndividuals.filter(i => i.hoursWorked !== null && i.hoursWorked >= 4);
  const staffWithBreaks = staffNeedingBreaks.filter(i => i.breakCompliance === true);
  const breakCompliance = staffNeedingBreaks.length > 0
    ? Math.round((staffWithBreaks.length / staffNeedingBreaks.length) * 100)
    : null;
  
  // Overtime rate (simplified: anyone working > 8 hours)
  const staffWithOvertime = activeIndividuals.filter(i => i.hoursWorked !== null && i.hoursWorked > 8);
  const overtimeRate = activeIndividuals.length > 0
    ? Math.round((staffWithOvertime.length / activeIndividuals.length) * 100)
    : null;
  
  // Quality NG rate
  const qualityTrackedQuests = completedQuests.filter(q => q.qualityStatus !== undefined);
  const ngQuests = qualityTrackedQuests.filter(q => q.qualityStatus === 'ng');
  const qualityNgRate = qualityTrackedQuests.length > 0
    ? Math.round((ngQuests.length / qualityTrackedQuests.length) * 100)
    : null;
  
  const teamSnapshot: TeamSnapshot = {
    teamScoreAvg,
    questCompletion,
    delayRate,
    breakCompliance,
    overtimeRate,
    qualityNgRate,
  };
  
  // Calculate skill mix coverage
  const starMix = { star1: 0, star2: 0, star3: 0 };
  const roleMix = new Map<string, number>();
  
  for (const ind of activeIndividuals) {
    if (ind.starLevel === 1) starMix.star1++;
    else if (ind.starLevel === 2) starMix.star2++;
    else starMix.star3++;
    
    const count = roleMix.get(ind.roleCode) ?? 0;
    roleMix.set(ind.roleCode, count + 1);
  }
  
  // Peak coverage: need at least 1 star2+ during peak (simplified logic)
  let peakCoverage: 'good' | 'warning' | 'critical' | null = null;
  let peakCoverageReason = '';
  
  if (activeIndividuals.length > 0) {
    const highSkillCount = starMix.star2 + starMix.star3;
    if (highSkillCount >= 2) {
      peakCoverage = 'good';
      peakCoverageReason = `${highSkillCount} high-skill staff available`;
    } else if (highSkillCount === 1) {
      peakCoverage = 'warning';
      peakCoverageReason = 'Only 1 high-skill staff - consider backup';
    } else {
      peakCoverage = 'critical';
      peakCoverageReason = 'No high-skill staff on shift';
    }
  } else {
    peakCoverageReason = 'No staff data available';
  }
  
  const skillMixCoverage: SkillMixCoverage = {
    starMix,
    roleMix,
    peakCoverage,
    peakCoverageReason,
  };
  
  // Generate coaching actions (max 5)
  const coachingActions: CoachingAction[] = [];
  
  // Action 1: Staff with high delay rate
  const highDelayStaff = individuals.filter(i => i.delayRate !== null && i.delayRate > 30);
  for (const ind of highDelayStaff.slice(0, 2)) {
    coachingActions.push({
      id: `delay-${ind.staffId}`,
      action: `Review task estimation with ${ind.name}`,
      reason: `${ind.delayRate}% delay rate on completed quests`,
      targetStaffId: ind.staffId,
      targetStaffName: ind.name,
      priority: ind.delayRate! > 50 ? 'high' : 'medium',
    });
  }
  
  // Action 2: Staff not taking breaks
  const noBreakStaff = individuals.filter(i => i.breakCompliance === false);
  for (const ind of noBreakStaff.slice(0, 1)) {
    coachingActions.push({
      id: `break-${ind.staffId}`,
      action: `Remind ${ind.name} about break requirements`,
      reason: `Worked ${ind.hoursWorked}+ hours without recorded break`,
      targetStaffId: ind.staffId,
      targetStaffName: ind.name,
      priority: 'high',
    });
  }
  
  // Action 3: Quality issues
  const qualityIssueStaff = individuals.filter(i => i.qualityNgCount > 0);
  for (const ind of qualityIssueStaff.slice(0, 1)) {
    coachingActions.push({
      id: `quality-${ind.staffId}`,
      action: `Quality review with ${ind.name}`,
      reason: `${ind.qualityNgCount} quality issue(s) recorded`,
      targetStaffId: ind.staffId,
      targetStaffName: ind.name,
      priority: ind.qualityNgCount > 2 ? 'high' : 'medium',
    });
  }
  
  // Action 4: Low score staff
  const lowScoreStaff = individuals.filter(i => i.score < 60 && i.hoursWorked !== null && i.hoursWorked > 0);
  for (const ind of lowScoreStaff.slice(0, 1)) {
    coachingActions.push({
      id: `score-${ind.staffId}`,
      action: `Performance discussion with ${ind.name}`,
      reason: `Below target score (${ind.score}/100)`,
      targetStaffId: ind.staffId,
      targetStaffName: ind.name,
      priority: 'medium',
    });
  }
  
  // Generate promotion candidates (max 5)
  const promotionCandidates: PromotionCandidate[] = [];
  
  // Criteria: high score, low delay rate, good quality
  for (const ind of individuals) {
    if (ind.starLevel >= 3) continue; // Already max level
    if (ind.hoursWorked === null || ind.hoursWorked < 2) continue; // Not enough data
    
    const criteria: string[] = [];
    
    if (ind.score >= 80) criteria.push(`High score: ${ind.score}/100`);
    if (ind.delayRate !== null && ind.delayRate <= 10) criteria.push(`Low delay rate: ${ind.delayRate}%`);
    if (ind.questsDone >= 5) criteria.push(`Active contributor: ${ind.questsDone} quests`);
    if (ind.qualityOkCount > 0 && ind.qualityNgCount === 0) criteria.push('Perfect quality record');
    
    if (criteria.length >= 2) {
      promotionCandidates.push({
        staffId: ind.staffId,
        staffName: ind.name,
        currentStar: ind.starLevel,
        criteria,
        score: ind.score,
      });
    }
  }
  
  // Sort by score and limit to 5
  promotionCandidates.sort((a, b) => b.score - a.score);
  
  return {
    teamSnapshot,
    skillMixCoverage,
    individuals,
    coachingActions: coachingActions.slice(0, 5),
    promotionCandidates: promotionCandidates.slice(0, 5),
    period,
    timeBand,
    lastUpdate: now.toISOString(),
    dataAvailability: {
      hasLaborData,
      hasQuestData,
      hasQualityData,
    },
  };
};

// ------------------------------------------------------------
// Awards Derivation
// ------------------------------------------------------------

export type AwardCategory = 'perfect-run' | 'speed-master' | 'quality-guardian' | 'team-saver' | 'most-improved';

export interface AwardEvidence {
  laborTimeline: Array<{ time: string; action: string; duration?: number }>;
  questHistory: Array<{ title: string; startedAt: string; completedAt?: string; durationMinutes?: number; estimatedMinutes?: number; qualityStatus?: 'ok' | 'ng' }>;
  scoreBreakdown: { base: number; questBonus: number; speedBonus: number; qualityBonus: number; total: number };
  reasonText: { en: string; ja: string };
}

export interface Award {
  category: AwardCategory;
  categoryLabel: { en: string; ja: string };
  winner: { staffId: string; name: string; starLevel: 1 | 2 | 3; roleCode: string } | null;
  evidenceBullets: string[]; // 3 short evidence points
  reproducibleRule: { en: string; ja: string }; // How to win this award next time
  evidence: AwardEvidence | null;
  status: 'awarded' | 'no-winner' | 'not-tracked';
  notTrackedReason?: string;
}

export interface AwardNominee {
  staffId: string;
  name: string;
  starLevel: 1 | 2 | 3;
  roleCode: string;
  roleName: string;
  score: number;
  questsDone: number;
  delayRate: number | null;
  qualityNgCount: number;
  hoursWorked: number | null;
  avgDurationVsEstimate: number | null;
  scoreTrend: number | null; // positive = improving
}

export interface AwardsSnapshot {
  winnersCount: number;
  eligibleStaffCount: number;
  lastUpdated: string;
  period: Period;
  timeBand: TimeBand;
}

export interface AwardsMetrics {
  snapshot: AwardsSnapshot;
  awards: Award[];
  nominees: AwardNominee[];
  dataAvailability: {
    hasLaborData: boolean;
    hasQuestData: boolean;
    hasQualityData: boolean;
    hasScoreTrendData: boolean;
  };
}

const AWARD_LABELS: Record<AwardCategory, { en: string; ja: string }> = {
  'perfect-run': { en: 'Perfect Run', ja: 'パーフェクトラン' },
  'speed-master': { en: 'Speed Master', ja: 'スピードマスター' },
  'quality-guardian': { en: 'Quality Guardian', ja: '品質ガーディアン' },
  'team-saver': { en: 'Team Saver', ja: 'チームセーバー' },
  'most-improved': { en: 'Most Improved', ja: '最も成長した人' },
};

const AWARD_RULES: Record<AwardCategory, { en: string; ja: string }> = {
  'perfect-run': { 
    en: 'Achieve score >= 85, zero delays, take required breaks, zero quality issues', 
    ja: 'スコア85以上、遅延ゼロ、休憩取得、品質NGゼロを達成' 
  },
  'speed-master': { 
    en: 'Complete quests faster than estimated while maintaining zero quality issues', 
    ja: '品質NGゼロを維持しながら、見積より早くクエストを完了' 
  },
  'quality-guardian': { 
    en: 'Maintain zero quality issues while completing difficult quests', 
    ja: '難易度の高いクエストをこなしながら品質NGゼロを維持' 
  },
  'team-saver': { 
    en: 'Help resolve delayed quests or take over reassigned tasks', 
    ja: '遅延クエストの解決や再アサインタスクの引き受け' 
  },
  'most-improved': { 
    en: 'Show the greatest improvement in score over the past 7 days', 
    ja: '過去7日間で最も大きなスコア改善を達成' 
  },
};

export const deriveAwards = (
  events: DomainEvent[],
  staff: Staff[],
  roles: Role[],
  storeId: string,
  period: Period,
  timeBand: TimeBand
): AwardsMetrics => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Calculate date range based on period
  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date(today);
    const start = new Date(today);
    switch (period) {
      case '7d':
        start.setDate(start.getDate() - 6);
        break;
      case '4w':
        start.setDate(start.getDate() - 27);
        break;
      default: // today
        break;
    }
    return { start, end };
  };
  
  const { start, end } = getDateRange();
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  // Filter staff for this store
  const storeStaff = staff.filter(s => s.storeId === storeId);
  const roleMap = new Map(roles.map(r => [r.id, r]));
  
  // Filter events for date range
  const isInRange = (timestamp: string) => {
    const date = timestamp.split('T')[0];
    return date >= startStr && date <= endStr;
  };
  
  // Get labor events
  const laborEvents = (filterByType(events, 'labor') as LaborEvent[])
    .filter(e => e.storeId === storeId && isInRange(e.timestamp));
  
  // Get decision events (quests)
  const decisionEvents = (filterByType(events, 'decision') as DecisionEvent[])
    .filter(e => e.storeId === storeId && isInRange(e.timestamp));
  
  // Get latest status for each quest
  const questStatuses = new Map<string, DecisionEvent>();
  for (const event of decisionEvents.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )) {
    questStatuses.set(event.proposalId, event);
  }
  
  const completedQuests = Array.from(questStatuses.values()).filter(q => q.action === 'completed');
  const allQuests = Array.from(questStatuses.values()).filter(q => q.action !== 'rejected');
  
  // Data availability flags
  const hasLaborData = laborEvents.length > 0;
  const hasQuestData = allQuests.length > 0;
  const hasQualityData = completedQuests.some(q => q.qualityStatus !== undefined);
  const hasScoreTrendData = period !== 'today'; // Can only calculate trend over time
  
  // Build nominee data for each staff
  const nominees: AwardNominee[] = storeStaff.map(s => {
    const role = roleMap.get(s.roleId);
    
    // Calculate hours worked
    const staffLaborEvents = laborEvents.filter(e => e.staffId === s.id);
    let hoursWorked: number | null = null;
    let tookBreak = false;
    
    if (staffLaborEvents.length > 0) {
      let totalMinutes = 0;
      let checkInTime: Date | null = null;
      
      for (const event of staffLaborEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )) {
        switch (event.action) {
          case 'check-in':
            checkInTime = new Date(event.timestamp);
            break;
          case 'check-out':
            if (checkInTime) {
              totalMinutes += (new Date(event.timestamp).getTime() - checkInTime.getTime()) / 60000;
              checkInTime = null;
            }
            break;
          case 'break-start':
            tookBreak = true;
            break;
        }
      }
      
      if (checkInTime) {
        totalMinutes += (now.getTime() - checkInTime.getTime()) / 60000;
      }
      
      hoursWorked = Math.round(totalMinutes / 6) / 10;
    }
    
    // Calculate quest performance
    const staffQuests = completedQuests.filter(
      q => q.assigneeId === s.id || q.distributedToRoles.includes(s.roleId)
    );
    
    const questsDone = staffQuests.length;
    
    // Calculate avg duration vs estimate
    let avgDurationVsEstimate: number | null = null;
    const questsWithTiming = staffQuests.filter(
      q => q.actualMinutes !== undefined && q.estimatedMinutes !== undefined && q.estimatedMinutes > 0
    );
    if (questsWithTiming.length > 0) {
      const totalRatio = questsWithTiming.reduce(
        (sum, q) => sum + ((q.actualMinutes ?? 0) / (q.estimatedMinutes ?? 1)) * 100,
        0
      );
      avgDurationVsEstimate = Math.round(totalRatio / questsWithTiming.length);
    }
    
    // Calculate delay rate
    const delayedQuests = staffQuests.filter(
      q => q.actualMinutes !== undefined && q.estimatedMinutes !== undefined && 
           q.actualMinutes > q.estimatedMinutes
    );
    const delayRate = questsDone > 0 ? Math.round((delayedQuests.length / questsDone) * 100) : null;
    
    // Quality counts
    const qualityNgCount = staffQuests.filter(q => q.qualityStatus === 'ng').length;
    
    // Break compliance check
    const breakNeeded = hoursWorked !== null && hoursWorked >= 4;
    const breakCompliant = !breakNeeded || tookBreak;
    
    // Calculate score
    let score = 50;
    if (questsDone > 0) {
      score += Math.min(20, questsDone * 2);
    }
    if (avgDurationVsEstimate !== null) {
      score += avgDurationVsEstimate <= 100 ? 15 : Math.max(0, 15 - (avgDurationVsEstimate - 100) / 5);
    }
    if (delayRate !== null) {
      score += Math.max(0, 10 - delayRate / 10);
    }
    if (hasQualityData && staffQuests.length > 0) {
      const okCount = staffQuests.filter(q => q.qualityStatus === 'ok').length;
      const qualityRate = staffQuests.length > 0 ? okCount / staffQuests.length : 0;
      score += qualityRate * 5;
    }
    score = Math.round(Math.min(100, Math.max(0, score)));
    
    // Score trend (simplified: random for demo, should be calculated from historical data)
    const scoreTrend = hasScoreTrendData ? Math.round((Math.random() - 0.3) * 20) : null;
    
    return {
      staffId: s.id,
      name: s.name,
      starLevel: s.starLevel,
      roleCode: role?.code ?? 'unknown',
      roleName: role?.name ?? 'Unknown',
      score,
      questsDone,
      delayRate,
      qualityNgCount,
      hoursWorked,
      avgDurationVsEstimate,
      scoreTrend,
    };
  });
  
  // Sort nominees by score
  nominees.sort((a, b) => b.score - a.score);
  
  // Filter to only staff who worked
  const activeNominees = nominees.filter(n => n.hoursWorked !== null && n.hoursWorked > 0);
  
  // Helper to build evidence for a staff member
  const buildEvidence = (staffId: string): AwardEvidence | null => {
    const staffLaborEvents = laborEvents.filter(e => e.staffId === staffId);
    const staffQuests = completedQuests.filter(
      q => q.assigneeId === staffId
    );
    const nominee = nominees.find(n => n.staffId === staffId);
    
    if (!nominee) return null;
    
    const laborTimeline = staffLaborEvents.map(e => ({
      time: new Date(e.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      action: e.action,
    }));
    
    const questHistory = staffQuests.map(q => ({
      title: q.title,
      startedAt: new Date(q.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      completedAt: q.action === 'completed' ? new Date(q.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : undefined,
      durationMinutes: q.actualMinutes,
      estimatedMinutes: q.estimatedMinutes,
      qualityStatus: q.qualityStatus,
    }));
    
    const scoreBreakdown = {
      base: 50,
      questBonus: Math.min(20, nominee.questsDone * 2),
      speedBonus: nominee.avgDurationVsEstimate !== null && nominee.avgDurationVsEstimate <= 100 ? 15 : 0,
      qualityBonus: nominee.qualityNgCount === 0 ? 5 : 0,
      total: nominee.score,
    };
    
    return {
      laborTimeline,
      questHistory,
      scoreBreakdown,
      reasonText: { en: '', ja: '' }, // Will be filled per award
    };
  };
  
  // Generate awards
  const awards: Award[] = [];
  
  // 1. Perfect Run: score>=85, delay=0, breakCompliance ok, qualityNG=0
  const perfectRunCandidates = activeNominees.filter(
    n => n.score >= 85 && 
         (n.delayRate === null || n.delayRate === 0) && 
         n.qualityNgCount === 0 &&
         n.questsDone > 0
  );
  
  if (!hasQuestData && !hasLaborData) {
    awards.push({
      category: 'perfect-run',
      categoryLabel: AWARD_LABELS['perfect-run'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['perfect-run'],
      evidence: null,
      status: 'not-tracked',
      notTrackedReason: 'No labor or quest data available',
    });
  } else if (perfectRunCandidates.length > 0) {
    const winner = perfectRunCandidates[0];
    const evidence = buildEvidence(winner.staffId);
    if (evidence) {
      evidence.reasonText = {
        en: `${winner.name} achieved a score of ${winner.score} with zero delays and zero quality issues while completing ${winner.questsDone} quests.`,
        ja: `${winner.name}さんは${winner.questsDone}件のクエストを完了し、遅延ゼロ・品質NGゼロでスコア${winner.score}を達成しました。`,
      };
    }
    awards.push({
      category: 'perfect-run',
      categoryLabel: AWARD_LABELS['perfect-run'],
      winner: { staffId: winner.staffId, name: winner.name, starLevel: winner.starLevel, roleCode: winner.roleCode },
      evidenceBullets: [
        `Score: ${winner.score}/100`,
        `Quests completed: ${winner.questsDone}`,
        `Zero delays, zero quality issues`,
      ],
      reproducibleRule: AWARD_RULES['perfect-run'],
      evidence,
      status: 'awarded',
    });
  } else {
    awards.push({
      category: 'perfect-run',
      categoryLabel: AWARD_LABELS['perfect-run'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['perfect-run'],
      evidence: null,
      status: 'no-winner',
    });
  }
  
  // 2. Speed Master: avgDurationVsEstimate is best (lowest), qualityNG=0
  const speedMasterCandidates = activeNominees.filter(
    n => n.avgDurationVsEstimate !== null && 
         n.avgDurationVsEstimate < 100 && 
         n.qualityNgCount === 0 &&
         n.questsDone >= 2
  ).sort((a, b) => (a.avgDurationVsEstimate ?? 999) - (b.avgDurationVsEstimate ?? 999));
  
  if (!hasQuestData) {
    awards.push({
      category: 'speed-master',
      categoryLabel: AWARD_LABELS['speed-master'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['speed-master'],
      evidence: null,
      status: 'not-tracked',
      notTrackedReason: 'No quest data available',
    });
  } else if (speedMasterCandidates.length > 0) {
    const winner = speedMasterCandidates[0];
    const evidence = buildEvidence(winner.staffId);
    if (evidence) {
      evidence.reasonText = {
        en: `${winner.name} completed quests at ${winner.avgDurationVsEstimate}% of estimated time while maintaining zero quality issues.`,
        ja: `${winner.name}さんは見積時間の${winner.avgDurationVsEstimate}%でクエストを完了し、品質NGゼロを維持しました。`,
      };
    }
    awards.push({
      category: 'speed-master',
      categoryLabel: AWARD_LABELS['speed-master'],
      winner: { staffId: winner.staffId, name: winner.name, starLevel: winner.starLevel, roleCode: winner.roleCode },
      evidenceBullets: [
        `Avg duration: ${winner.avgDurationVsEstimate}% of estimate`,
        `Quests completed: ${winner.questsDone}`,
        `Zero quality issues`,
      ],
      reproducibleRule: AWARD_RULES['speed-master'],
      evidence,
      status: 'awarded',
    });
  } else {
    awards.push({
      category: 'speed-master',
      categoryLabel: AWARD_LABELS['speed-master'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['speed-master'],
      evidence: null,
      status: 'no-winner',
    });
  }
  
  // 3. Quality Guardian: qualityNG=0, hardQuestDone (quests with high priority) is highest
  const qualityGuardianCandidates = activeNominees.filter(
    n => n.qualityNgCount === 0 && n.questsDone >= 2
  ).sort((a, b) => b.questsDone - a.questsDone);
  
  if (!hasQualityData) {
    awards.push({
      category: 'quality-guardian',
      categoryLabel: AWARD_LABELS['quality-guardian'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['quality-guardian'],
      evidence: null,
      status: 'not-tracked',
      notTrackedReason: 'Quality tracking not enabled',
    });
  } else if (qualityGuardianCandidates.length > 0) {
    const winner = qualityGuardianCandidates[0];
    const evidence = buildEvidence(winner.staffId);
    if (evidence) {
      evidence.reasonText = {
        en: `${winner.name} completed ${winner.questsDone} quests with zero quality issues, demonstrating exceptional attention to detail.`,
        ja: `${winner.name}さんは${winner.questsDone}件のクエストを品質NGゼロで完了し、卓越した注意力を発揮しました。`,
      };
    }
    awards.push({
      category: 'quality-guardian',
      categoryLabel: AWARD_LABELS['quality-guardian'],
      winner: { staffId: winner.staffId, name: winner.name, starLevel: winner.starLevel, roleCode: winner.roleCode },
      evidenceBullets: [
        `Quests completed: ${winner.questsDone}`,
        `Quality issues: 0`,
        `Score: ${winner.score}/100`,
      ],
      reproducibleRule: AWARD_RULES['quality-guardian'],
      evidence,
      status: 'awarded',
    });
  } else {
    awards.push({
      category: 'quality-guardian',
      categoryLabel: AWARD_LABELS['quality-guardian'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['quality-guardian'],
      evidence: null,
      status: 'no-winner',
    });
  }
  
  // 4. Team Saver: delayedQuestResolvedCount (approximated by quests done when delay rate exists)
  // Simplified: staff who completed the most quests when overall team had delays
  const teamSaverCandidates = activeNominees.filter(
    n => n.questsDone >= 3 && n.score >= 60
  ).sort((a, b) => b.questsDone - a.questsDone);
  
  if (!hasQuestData) {
    awards.push({
      category: 'team-saver',
      categoryLabel: AWARD_LABELS['team-saver'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['team-saver'],
      evidence: null,
      status: 'not-tracked',
      notTrackedReason: 'No quest data available',
    });
  } else if (teamSaverCandidates.length > 0) {
    const winner = teamSaverCandidates[0];
    const evidence = buildEvidence(winner.staffId);
    if (evidence) {
      evidence.reasonText = {
        en: `${winner.name} completed ${winner.questsDone} quests, helping keep operations on track and supporting the team.`,
        ja: `${winner.name}さんは${winner.questsDone}件のクエストを完了し、オペレーションを軌道に乗せチームをサポートしました。`,
      };
    }
    awards.push({
      category: 'team-saver',
      categoryLabel: AWARD_LABELS['team-saver'],
      winner: { staffId: winner.staffId, name: winner.name, starLevel: winner.starLevel, roleCode: winner.roleCode },
      evidenceBullets: [
        `Quests completed: ${winner.questsDone}`,
        `Team contribution score: ${winner.score}`,
        `Hours worked: ${winner.hoursWorked?.toFixed(1) ?? 'N/A'}h`,
      ],
      reproducibleRule: AWARD_RULES['team-saver'],
      evidence,
      status: 'awarded',
    });
  } else {
    awards.push({
      category: 'team-saver',
      categoryLabel: AWARD_LABELS['team-saver'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['team-saver'],
      evidence: null,
      status: 'no-winner',
    });
  }
  
  // 5. Most Improved: scoreTrend (7D) improvement is highest
  const mostImprovedCandidates = activeNominees.filter(
    n => n.scoreTrend !== null && n.scoreTrend > 0
  ).sort((a, b) => (b.scoreTrend ?? 0) - (a.scoreTrend ?? 0));
  
  if (!hasScoreTrendData) {
    awards.push({
      category: 'most-improved',
      categoryLabel: AWARD_LABELS['most-improved'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['most-improved'],
      evidence: null,
      status: 'not-tracked',
      notTrackedReason: 'Trend data requires 7+ days of history',
    });
  } else if (mostImprovedCandidates.length > 0) {
    const winner = mostImprovedCandidates[0];
    const evidence = buildEvidence(winner.staffId);
    if (evidence) {
      evidence.reasonText = {
        en: `${winner.name} improved their score by +${winner.scoreTrend} points over the period, showing great progress.`,
        ja: `${winner.name}さんは期間中にスコアを+${winner.scoreTrend}ポイント改善し、素晴らしい進歩を見せました。`,
      };
    }
    awards.push({
      category: 'most-improved',
      categoryLabel: AWARD_LABELS['most-improved'],
      winner: { staffId: winner.staffId, name: winner.name, starLevel: winner.starLevel, roleCode: winner.roleCode },
      evidenceBullets: [
        `Score improvement: +${winner.scoreTrend}`,
        `Current score: ${winner.score}`,
        `Quests completed: ${winner.questsDone}`,
      ],
      reproducibleRule: AWARD_RULES['most-improved'],
      evidence,
      status: 'awarded',
    });
  } else {
    awards.push({
      category: 'most-improved',
      categoryLabel: AWARD_LABELS['most-improved'],
      winner: null,
      evidenceBullets: [],
      reproducibleRule: AWARD_RULES['most-improved'],
      evidence: null,
      status: 'no-winner',
    });
  }
  
  // Build snapshot
  const winnersCount = awards.filter(a => a.status === 'awarded').length;
  const eligibleStaffCount = activeNominees.length;
  
  const snapshot: AwardsSnapshot = {
    winnersCount,
    eligibleStaffCount,
    lastUpdated: now.toISOString(),
    period,
    timeBand,
  };
  
  return {
    snapshot,
    awards,
    nominees,
    dataAvailability: {
      hasLaborData,
      hasQuestData,
      hasQualityData,
      hasScoreTrendData,
    },
  };
};
