// ============================================================
// All Management + All OS - Selectors
// Memoized selectors that use derive functions
// UI components should ONLY use selectors, never derive directly
// ============================================================

import { AppState, TimeBand, DailySalesMetrics, CockpitMetrics, ExceptionItem, DecisionEvent, ShiftSummary, SupplyDemandMetrics, WeeklyLaborMetrics } from './types';
import {
  deriveForecastTable,
  deriveForecastForDate,
  deriveDailySalesMetrics,
  deriveLaborMetrics,
  derivePrepMetrics,
  deriveCockpitMetrics,
  deriveExceptions,
  deriveActiveTodos,
  deriveCompletedTodos,
  deriveStaffStates,
  deriveCalendarData,
  deriveTodoStats,
  deriveEnhancedCockpitMetrics,
  deriveShiftSummary,
  deriveSupplyDemandMetrics,
  deriveWeeklyLaborMetrics,
  ForecastCell,
  StaffState,
  CalendarCell,
  TodoStats,
} from './derive';
import type { EnhancedCockpitMetrics } from './types';

// ------------------------------------------------------------
// Store Selectors
// ------------------------------------------------------------

export const selectCurrentStore = (state: AppState) =>
  state.stores.find((s) => s.id === state.selectedStoreId) ?? null;

export const selectStoreId = (state: AppState) => state.selectedStoreId;

export const selectStoreStaff = (state: AppState) =>
  state.staff.filter((s) => s.storeId === state.selectedStoreId);

// ------------------------------------------------------------
// Forecast Selectors
// ------------------------------------------------------------

export const selectForecastTable = (
  state: AppState,
  month?: string,
  timeBand?: TimeBand
): Map<string, ForecastCell> => {
  const storeId = state.selectedStoreId;
  if (!storeId) return new Map();
  
  return deriveForecastTable(
    state.events,
    storeId,
    month ?? state.selectedMonth,
    timeBand ?? state.selectedTimeBand
  );
};

export const selectForecastForDate = (
  state: AppState,
  date: string,
  timeBand?: TimeBand
): ForecastCell | null => {
  const storeId = state.selectedStoreId;
  if (!storeId) return null;
  
  return deriveForecastForDate(
    state.events,
    storeId,
    date,
    timeBand ?? state.selectedTimeBand
  );
};

export const selectMonthlyForecastSummary = (
  state: AppState,
  month?: string,
  timeBand?: TimeBand
): { totalCustomers: number; avgSpend: number; totalSales: number } => {
  const table = selectForecastTable(state, month, timeBand);
  
  let totalCustomers = 0;
  let totalSales = 0;
  
  for (const cell of table.values()) {
    totalCustomers += cell.forecastCustomers;
    totalSales += cell.forecastSales;
  }
  
  return {
    totalCustomers,
    avgSpend: totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0,
    totalSales,
  };
};

// ------------------------------------------------------------
// Sales Selectors
// ------------------------------------------------------------

export const selectDailySalesMetrics = (
  state: AppState,
  date: string,
  timeBand?: TimeBand
): DailySalesMetrics => {
  const storeId = state.selectedStoreId;
  if (!storeId) {
    return {
      date,
      timeBand: timeBand ?? state.selectedTimeBand,
      forecastCustomers: 0,
      forecastSales: 0,
      actualCustomers: 0,
      actualSales: 0,
      achievementRate: 0,
    };
  }
  
  return deriveDailySalesMetrics(
    state.events,
    storeId,
    date,
    timeBand ?? state.selectedTimeBand
  );
};

export const selectMonthlySalesMetrics = (
  state: AppState,
  month?: string,
  timeBand?: TimeBand
): DailySalesMetrics[] => {
  const storeId = state.selectedStoreId;
  const targetMonth = month ?? state.selectedMonth;
  const targetTimeBand = timeBand ?? state.selectedTimeBand;
  
  if (!storeId) return [];
  
  // Generate all dates in the month
  const [year, monthNum] = targetMonth.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  
  const metrics: DailySalesMetrics[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${targetMonth}-${String(day).padStart(2, '0')}`;
    metrics.push(deriveDailySalesMetrics(state.events, storeId, date, targetTimeBand));
  }
  
  return metrics;
};

// ------------------------------------------------------------
// Cockpit Selectors
// ------------------------------------------------------------

export const selectCockpitMetrics = (
  state: AppState,
  date?: string,
  timeBand?: TimeBand
): CockpitMetrics => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  const targetTimeBand = timeBand ?? state.selectedTimeBand;
  
  if (!storeId) {
    return {
      sales: { forecast: 0, actual: 0, achievementRate: 0, trend: 'stable' },
      labor: { activeStaffCount: 0, onBreakCount: 0, totalHoursToday: 0, laborCostEstimate: 0 },
      supplyDemand: { status: 'balanced', score: 50 },
      operations: { plannedCount: 0, inProgressCount: 0, completedCount: 0, completionRate: 0 },
      exceptions: { count: 0, criticalCount: 0 },
    };
  }
  
  return deriveCockpitMetrics(state.events, storeId, targetDate, targetTimeBand);
};

export const selectLaborMetrics = (state: AppState, date?: string) => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) {
    return { activeStaffCount: 0, onBreakCount: 0, totalHoursToday: 0, laborCostEstimate: 0 };
  }
  
  return deriveLaborMetrics(state.events, storeId, targetDate);
};

export const selectPrepMetrics = (state: AppState, date?: string) => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) {
    return { plannedCount: 0, inProgressCount: 0, completedCount: 0, completionRate: 0 };
  }
  
  return derivePrepMetrics(state.events, storeId, targetDate);
};

export const selectEnhancedCockpitMetrics = (
  state: AppState,
  date?: string,
  timeBand?: TimeBand
): EnhancedCockpitMetrics | null => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  const targetTimeBand = timeBand ?? state.selectedTimeBand;
  
  if (!storeId) return null;
  
  // Build prep item name map
  const prepItemNames = new Map<string, string>();
  for (const item of state.prepItems) {
    prepItemNames.set(item.id, item.name);
  }
  
  return deriveEnhancedCockpitMetrics(state.events, storeId, targetDate, targetTimeBand, prepItemNames);
};

// ------------------------------------------------------------
// Exception Selectors
// ------------------------------------------------------------

export const selectExceptions = (
  state: AppState,
  date?: string
): ExceptionItem[] => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) return [];
  
  return deriveExceptions(state.events, storeId, targetDate);
};

// ------------------------------------------------------------
// ToDo Selectors
// ------------------------------------------------------------

export const selectActiveTodos = (
  state: AppState,
  roleId?: string
): DecisionEvent[] => {
  const storeId = state.selectedStoreId;
  if (!storeId) return [];
  
  return deriveActiveTodos(state.events, storeId, roleId);
};

export const selectCompletedTodos = (state: AppState): DecisionEvent[] => {
  const storeId = state.selectedStoreId;
  if (!storeId) return [];
  
  return deriveCompletedTodos(state.events, storeId);
};

// ------------------------------------------------------------
// Timeline Selectors
// ------------------------------------------------------------

export const selectRecentEvents = (
  state: AppState,
  limit: number = 20
): AppState['events'] => {
  const storeId = state.selectedStoreId;
  if (!storeId) return [];
  
  // Prioritize non-forecast events to show more variety
  const storeEvents = state.events.filter((e) => e.storeId === storeId);
  
  const nonForecastEvents = storeEvents
    .filter((e) => e.type !== 'forecast')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const forecastEvents = storeEvents
    .filter((e) => e.type === 'forecast')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Take non-forecast events first, then fill remaining with forecast
  const nonForecastLimit = Math.min(limit - 5, nonForecastEvents.length);
  const forecastLimit = Math.max(5, limit - nonForecastLimit);
  
  const result = [
    ...nonForecastEvents.slice(0, nonForecastLimit),
    ...forecastEvents.slice(0, forecastLimit),
  ];
  
  // Sort combined result by timestamp
  return result
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
};

// Lane-based event selection for timeline
export type TimelineLane = 'sales' | 'forecast' | 'prep' | 'delivery' | 'labor' | 'decision';

export interface LaneEvents {
  lane: TimelineLane;
  events: AppState['events'];
}

export const selectLaneEvents = (
  state: AppState,
  perLaneLimit: number = 5,
  timeBand?: TimeBand
): LaneEvents[] => {
  const storeId = state.selectedStoreId;
  if (!storeId) return [];
  
  const today = new Date().toISOString().split('T')[0];
  const targetTimeBand = timeBand ?? state.selectedTimeBand;
  
  // Filter events for current store and today
  const storeEvents = state.events.filter((e) => {
    if (e.storeId !== storeId) return false;
    // For timeBand filtering
    if (targetTimeBand !== 'all') {
      const eventHour = new Date(e.timestamp).getHours();
      if (targetTimeBand === 'lunch' && (eventHour < 11 || eventHour >= 14)) return false;
      if (targetTimeBand === 'idle' && (eventHour < 14 || eventHour >= 17)) return false;
      if (targetTimeBand === 'dinner' && (eventHour < 17 || eventHour >= 22)) return false;
    }
    return true;
  });
  
  const lanes: TimelineLane[] = ['sales', 'forecast', 'prep', 'delivery', 'labor', 'decision'];
  
  return lanes.map((lane) => {
    const laneEvents = storeEvents
      .filter((e) => e.type === lane)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, perLaneLimit);
    
    return { lane, events: laneEvents };
  });
};

// ------------------------------------------------------------
// Highlight Selectors
// ------------------------------------------------------------

export const selectIsHighlighted = (state: AppState, key: string): boolean => {
  if (!state.highlightUntil) return false;
  if (Date.now() > state.highlightUntil) return false;
  return state.lastChangedKeys.includes(key);
};

// ------------------------------------------------------------
// Replay Selectors
// ------------------------------------------------------------

export const selectReplayState = (state: AppState) => state.replay;

export const selectIsReplaying = (state: AppState) =>
  state.replay.isPlaying || state.replay.pendingEvents.length > 0;

// ------------------------------------------------------------
// Staff State Selectors (for Timeclock)
// ------------------------------------------------------------

export const selectStaffStates = (
  state: AppState,
  date?: string
): Map<string, StaffState> => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) return new Map();
  
  const staffIds = state.staff
    .filter((s) => s.storeId === storeId)
    .map((s) => s.id);
  
  return deriveStaffStates(state.events, storeId, targetDate, staffIds);
};

// ------------------------------------------------------------
// Calendar Data Selectors (for Sales Forecast)
// ------------------------------------------------------------

export const selectCalendarData = (
  state: AppState,
  month?: string,
  timeBand?: TimeBand
): CalendarCell[] => {
  const storeId = state.selectedStoreId;
  if (!storeId) return [];
  
  return deriveCalendarData(
    state.events,
    storeId,
    month ?? state.selectedMonth,
    timeBand ?? state.selectedTimeBand
  );
};

// ------------------------------------------------------------
// Todo Stats Selectors
// ------------------------------------------------------------

export const selectTodoStats = (
  state: AppState,
  roleId?: string
): TodoStats => {
  const storeId = state.selectedStoreId;
  if (!storeId) {
    return { pendingCount: 0, inProgressCount: 0, completedCount: 0 };
  }
  
  return deriveTodoStats(state.events, storeId, roleId);
};

// ------------------------------------------------------------
// Shift Summary Selector (Dynamic, replaces MOCK_SHIFT_SUMMARY)
// ------------------------------------------------------------

export const selectShiftSummary = (
  state: AppState,
  date?: string
): ShiftSummary => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) {
    return {
      plannedHours: 0,
      actualHours: 0,
      skillMix: { star3: 0, star2: 0, star1: 0 },
      roleMix: { kitchen: 0, floor: 0, delivery: 0 },
      onBreakCount: 0,
      lastUpdate: new Date().toISOString(),
      isCalculating: true,
    };
  }
  
  return deriveShiftSummary(state.events, state.staff, state.roles, storeId, targetDate);
};

// ------------------------------------------------------------
// Supply/Demand Metrics Selector
// ------------------------------------------------------------

export const selectSupplyDemandMetrics = (
  state: AppState,
  date?: string,
  timeBand?: TimeBand
): SupplyDemandMetrics => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  const targetTimeBand = timeBand ?? state.selectedTimeBand;
  
  if (!storeId) {
    return {
      status: 'normal',
      stockoutRiskCount: 0,
      excessRiskCount: 0,
      topRiskItems: [],
      lastUpdate: new Date().toISOString(),
    };
  }
  
  // Build prep item name map
  const prepItemNames = new Map<string, string>();
  for (const item of state.prepItems) {
    prepItemNames.set(item.id, item.name);
  }
  
  return deriveSupplyDemandMetrics(state.events, storeId, targetDate, targetTimeBand, prepItemNames);
};

// ------------------------------------------------------------
// Weekly Labor Metrics Selector
// ------------------------------------------------------------

export const selectWeeklyLaborMetrics = (
  state: AppState,
  weekStartDate?: string
): WeeklyLaborMetrics => {
  const storeId = state.selectedStoreId;
  
  // Default to current week's Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const targetWeekStart = weekStartDate ?? monday.toISOString().split('T')[0];
  
  if (!storeId) {
    return {
      weekSummary: {
        totalHours: 0,
        totalLaborCost: 0,
        avgLaborRate: null,
        salesPerLaborCost: null,
        totalSales: null,
        staffCountTotal: 0,
        starMixTotal: { star3: 0, star2: 0, star1: 0 },
      },
      dailyRows: [],
      weekStart: targetWeekStart,
      weekEnd: targetWeekStart,
      lastUpdate: new Date().toISOString(),
      isCalculating: true,
    };
  }
  
  return deriveWeeklyLaborMetrics(state.events, storeId, targetWeekStart, state.staff);
};
