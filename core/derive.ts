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

export const deriveLaborMetrics = (
  events: DomainEvent[],
  storeId: string,
  date: string
): LaborMetrics => {
  const laborEvents = filterByType(events, 'labor') as LaborEvent[];
  const filtered = laborEvents.filter(
    (e) => e.storeId === storeId && e.timestamp.startsWith(date)
  );

  // Track staff states with check-out time
  const staffStates = new Map<string, { 
    checkedIn: boolean; 
    onBreak: boolean; 
    checkInTime?: Date;
    checkOutTime?: Date;
  }>();

  for (const event of filtered.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )) {
    const state = staffStates.get(event.staffId) ?? { checkedIn: false, onBreak: false };
    
    switch (event.action) {
      case 'check-in':
        state.checkedIn = true;
        state.checkInTime = new Date(event.timestamp);
        state.checkOutTime = undefined;
        break;
      case 'check-out':
        state.checkedIn = false;
        state.checkOutTime = new Date(event.timestamp);
        break;
      case 'break-start':
        state.onBreak = true;
        break;
      case 'break-end':
        state.onBreak = false;
        break;
    }
    
    staffStates.set(event.staffId, state);
  }

  let activeStaffCount = 0;
  let onBreakCount = 0;
  let totalHours = 0;
  const now = new Date();

  for (const [, state] of staffStates) {
    if (state.checkedIn) {
      activeStaffCount++;
      if (state.onBreak) onBreakCount++;
    }
    
    // Calculate hours for both active and checked-out staff
    if (state.checkInTime) {
      const endTime = state.checkOutTime ?? now;
      const hours = (endTime.getTime() - state.checkInTime.getTime()) / (1000 * 60 * 60);
      // Only add positive hours to prevent negative values
      if (hours > 0) {
        totalHours += hours;
      }
    }
  }

  return {
    activeStaffCount,
    onBreakCount,
    totalHoursToday: Math.round(totalHours * 10) / 10,
    laborCostEstimate: Math.round(totalHours * 1200), // Simplified: 1200 yen/hour
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

  // Filter to approved/started decisions (active todos)
  const activeTodos = Array.from(proposalStatuses.values()).filter(
    (e) => e.action === 'approved' || e.action === 'started'
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
