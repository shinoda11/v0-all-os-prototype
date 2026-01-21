// ============================================================
// All Management + All OS - Selectors
// Memoized selectors that use derive functions
// UI components should ONLY use selectors, never derive directly
// ============================================================

import { AppState, TimeBand, DailySalesMetrics, CockpitMetrics, ExceptionItem, DecisionEvent } from './types';
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
