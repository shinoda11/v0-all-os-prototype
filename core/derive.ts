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

  // Track staff states
  const staffStates = new Map<string, { checkedIn: boolean; onBreak: boolean; checkInTime?: Date }>();

  for (const event of filtered.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )) {
    const state = staffStates.get(event.staffId) ?? { checkedIn: false, onBreak: false };
    
    switch (event.action) {
      case 'check-in':
        state.checkedIn = true;
        state.checkInTime = new Date(event.timestamp);
        break;
      case 'check-out':
        state.checkedIn = false;
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
      if (state.checkInTime) {
        totalHours += (now.getTime() - state.checkInTime.getTime()) / (1000 * 60 * 60);
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

  // Check delivery delays
  const deliveryEvents = filterByType(events, 'delivery') as DeliveryEvent[];
  const delayedDeliveries = deliveryEvents.filter(
    (e) => e.storeId === storeId && e.status === 'delayed'
  );

  for (const delivery of delayedDeliveries) {
    exceptions.push({
      id: `exc-${delivery.id}`,
      type: 'delivery-delay',
      severity: (delivery.delayMinutes ?? 0) > 30 ? 'critical' : 'warning',
      title: `配送遅延: ${delivery.itemName}`,
      description: `${delivery.delayMinutes}分遅延中`,
      relatedEventId: delivery.id,
      detectedAt: delivery.timestamp,
      resolved: false,
    });
  }

  // Check staff shortage (simplified: less than 3 active staff is a shortage)
  const laborMetrics = deriveLaborMetrics(events, storeId, date);
  if (laborMetrics.activeStaffCount < 3) {
    exceptions.push({
      id: `exc-labor-${date}`,
      type: 'staff-shortage',
      severity: laborMetrics.activeStaffCount < 2 ? 'critical' : 'warning',
      title: '人員不足',
      description: `現在の出勤人数: ${laborMetrics.activeStaffCount}名`,
      relatedEventId: '',
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  }

  // Check prep behind schedule
  const prepMetrics = derivePrepMetrics(events, storeId, date);
  if (prepMetrics.completionRate < 50 && prepMetrics.plannedCount > 0) {
    exceptions.push({
      id: `exc-prep-${date}`,
      type: 'prep-behind',
      severity: prepMetrics.completionRate < 30 ? 'critical' : 'warning',
      title: '仕込み遅延',
      description: `進捗率: ${Math.round(prepMetrics.completionRate)}%`,
      relatedEventId: '',
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  }

  // Check demand surge (actual > 120% of forecast)
  const salesMetrics = deriveDailySalesMetrics(events, storeId, date, 'all');
  if (salesMetrics.achievementRate > 120) {
    exceptions.push({
      id: `exc-demand-${date}`,
      type: 'demand-surge',
      severity: salesMetrics.achievementRate > 150 ? 'critical' : 'warning',
      title: '需要急増',
      description: `予測比 ${Math.round(salesMetrics.achievementRate)}%`,
      relatedEventId: '',
      detectedAt: new Date().toISOString(),
      resolved: false,
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

export type StaffStatus = 'out' | 'in' | 'break';

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
          status: 'in', 
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
          status: 'in', 
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
