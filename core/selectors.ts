// ============================================================
// All Management + All OS - Selectors
// Memoized selectors that use derive functions
// UI components should ONLY use selectors, never derive directly
// ============================================================

import { AppState, TimeBand, DailySalesMetrics, CockpitMetrics, ExceptionItem, DecisionEvent, ShiftSummary, SupplyDemandMetrics, Incident, IncidentSeverity, IncidentStatus, ForecastCell, StaffState, CalendarCell, TodoStats, WeeklyLaborMetrics } from './types';
import {
  deriveDailySalesMetrics,
  deriveLaborMetrics,
  derivePrepMetrics,
  deriveCockpitMetrics,
  deriveExceptions,
  deriveLaneEvents,
  deriveShiftSummary,
  deriveSupplyDemandMetrics,
  deriveTodoStats,
  deriveEnhancedCockpitMetrics,
  deriveWeeklyLaborMetrics,
  deriveLaborGuardrailSummary,
  deriveCalendarData,
  deriveStaffStates,
  deriveDailyScore,
  deriveTeamDailyScore,
  deriveForecastTable,
  deriveForecastForDate,
  deriveActiveTodos,
  deriveCompletedTodos,
  deriveTeamPerformanceMetrics,
  deriveAwards,
  deriveTodayEarnings,
  deriveIncentivePool,
  deriveIncentiveDistribution,
  // Types from derive
  type DailyScore,
  type TeamDailyScore,
  type StaffDailyScore,
  type DailyScoreBreakdown,
  type ScoreDeduction,
  type DeductionCategory,
  type Period,
  type TeamPerformanceMetrics,
  type AwardsMetrics,
  type Award,
  type AwardNominee,
  type AwardEvidence,
  type AwardCategory,
  type TodayEarnings,
  type IncentivePool,
  type IncentiveDistribution,
  type StaffIncentiveShare,
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

import { deriveDemandDropExceptions } from './derive';

export const selectExceptions = (
  state: AppState,
  date?: string
): ExceptionItem[] => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) return [];
  
  // Get base exceptions from events
  const baseExceptions = deriveExceptions(state.events, storeId, targetDate);
  
  // Get demand drop exceptions
  const demandDropExceptions = deriveDemandDropExceptions(storeId);
  
  // Combine and sort by severity and detection time
  const allExceptions = [...baseExceptions, ...demandDropExceptions];
  allExceptions.sort((a, b) => {
    // Critical first
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    // Then by detection time (newest first)
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });
  
  return allExceptions;
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
// Incident Selectors
// ------------------------------------------------------------

// Get all incidents for current store
export const selectIncidents = (state: AppState): Incident[] => {
  const storeId = state.selectedStoreId;
  if (!storeId) return [];
  
  return (state.incidents || [])
    .filter((i) => i.storeId === storeId)
    .sort((a, b) => {
      // Sort by severity (critical > warning > info), then by updatedAt desc
      const severityOrder: Record<IncidentSeverity, number> = { critical: 3, warning: 2, info: 1 };
      const sevDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
};

// Get open (unresolved) incidents
export const selectOpenIncidents = (state: AppState): Incident[] => {
  return selectIncidents(state).filter((i) => i.status !== 'resolved');
};

// Get critical incidents
export const selectCriticalIncidents = (state: AppState): Incident[] => {
  return selectIncidents(state).filter((i) => i.severity === 'critical' && i.status !== 'resolved');
};

// Get management-led incidents
export const selectManagementLedIncidents = (state: AppState): Incident[] => {
  return selectIncidents(state).filter((i) => i.leadAgent === 'management');
};

// Get incidents by type
export const selectIncidentsByType = (state: AppState, type: string): Incident[] => {
  return selectIncidents(state).filter((i) => i.type === type);
};

// Get today's key incidents (for Ask OS)
export const selectTodayKeyIncidents = (state: AppState): Incident[] => {
  const today = new Date().toISOString().split('T')[0];
  return selectOpenIncidents(state)
    .filter((i) => i.businessDate === today)
    .slice(0, 5);
};

// Find incident by menu/item name (for Ask OS demand drop queries)
export const selectIncidentByMenuName = (state: AppState, menuName: string): Incident | null => {
  const incidents = selectIncidents(state);
  return incidents.find((i) => 
    i.type === 'demand_drop' && 
    (i.title.includes(menuName) || i.evidence.some((e) => e.label.includes(menuName)))
  ) ?? null;
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
    return { 
      pendingCount: 0, 
      inProgressCount: 0, 
      completedCount: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      total: 0,
    };
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
      plannedHours: null,
      actualHours: 0,
      activeStaffCount: 0,
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
        questCompletionRate: 0,
        avgDayScore: null,
        overtimeDays: 0,
        totalOvertimeMinutes: 0,
        totalQuestDelays: 0,
      },
      dailyRows: [],
      weakTimeBands: [],
      chronicDelayQuests: [],
      winningMix: null,
      weekStart: targetWeekStart,
      weekEnd: targetWeekStart,
      lastUpdate: new Date().toISOString(),
      isCalculating: true,
    };
  }
  
  return deriveWeeklyLaborMetrics(state.events, storeId, targetWeekStart, state.staff);
};

// ------------------------------------------------------------
// Daily Score Selectors
// ------------------------------------------------------------

export const selectDailyScore = (
  state: AppState,
  staffId?: string,
  date?: string
): DailyScore => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) {
    return {
      total: 0,
      breakdown: { taskCompletion: 0, timeVariance: 0, breakCompliance: 0, zeroOvertime: 0 },
      grade: 'D',
      feedback: 'データがありません',
      bottlenecks: [],
      improvements: [],
      deductions: [],
      stats: {
        totalQuests: 0,
        completedQuests: 0,
        onTimeQuests: 0,
        breaksTaken: 0,
        breaksExpected: 0,
        plannedHours: 0,
        actualHours: 0,
        overtimeMinutes: 0,
      },
    };
  }
  
  return deriveDailyScore(state.events, state.staff, storeId, targetDate, staffId);
};

export const selectTeamDailyScore = (
  state: AppState,
  date?: string
): TeamDailyScore => {
  const storeId = state.selectedStoreId;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) {
    return {
      total: 0,
      breakdown: { taskCompletion: 0, timeVariance: 0, breakCompliance: 0, zeroOvertime: 0 },
      grade: 'D',
      feedback: 'データがありません',
      bottlenecks: [],
      improvements: [],
      deductions: [],
      stats: {
        totalQuests: 0,
        completedQuests: 0,
        onTimeQuests: 0,
        breaksTaken: 0,
        breaksExpected: 0,
        plannedHours: 0,
        actualHours: 0,
        overtimeMinutes: 0,
      },
      staffScores: [],
      topPerformers: [],
      needsSupport: [],
    };
  }
  
  return deriveTeamDailyScore(state.events, state.staff, storeId, targetDate);
};

// ------------------------------------------------------------
// Team Performance Metrics Selector
// ------------------------------------------------------------

export const selectTeamPerformanceMetrics = (
  state: AppState,
  period: Period = 'today',
  timeBand: TimeBand = 'all'
): TeamPerformanceMetrics => {
  const storeId = state.selectedStoreId;
  
  if (!storeId) {
    return {
      teamSnapshot: {
        teamScoreAvg: null,
        questCompletion: { completed: 0, total: 0, rate: null },
        delayRate: null,
        breakCompliance: null,
        overtimeRate: null,
        qualityNgRate: null,
      },
      skillMixCoverage: {
        starMix: { star1: 0, star2: 0, star3: 0 },
        roleMix: new Map(),
        peakCoverage: null,
        peakCoverageReason: 'No store selected',
      },
      individuals: [],
      coachingActions: [],
      promotionCandidates: [],
      period,
      timeBand,
      lastUpdate: new Date().toISOString(),
      dataAvailability: {
        hasLaborData: false,
        hasQuestData: false,
        hasQualityData: false,
      },
    };
  }
  
  return deriveTeamPerformanceMetrics(
    state.events,
    state.staff,
    state.roles,
    storeId,
    period,
    timeBand
  );
};

// ------------------------------------------------------------
// Awards Selector
// ------------------------------------------------------------

export const selectAwards = (
  state: AppState,
  period: Period = 'today',
  timeBand: TimeBand = 'all'
): AwardsMetrics => {
  const storeId = state.selectedStoreId;
  
  if (!storeId) {
    return {
      snapshot: {
        winnersCount: 0,
        eligibleStaffCount: 0,
        lastUpdated: new Date().toISOString(),
        period,
        timeBand,
      },
      awards: [],
      nominees: [],
      dataAvailability: {
        hasLaborData: false,
        hasQuestData: false,
        hasQualityData: false,
        hasScoreTrendData: false,
      },
    };
  }
  
  return deriveAwards(
    state.events,
    state.staff,
    state.roles,
    storeId,
    period,
    timeBand
  );
};

// ------------------------------------------------------------
// Earnings & Incentive Selectors
// ------------------------------------------------------------

export const selectTodayEarnings = (
  state: AppState,
  staffId: string,
  businessDate?: string
): TodayEarnings => {
  const date = businessDate ?? new Date().toISOString().split('T')[0];
  return deriveTodayEarnings(state.events, state.staff, staffId, date);
};

export const selectIncentivePool = (
  state: AppState,
  businessDate?: string
): IncentivePool => {
  const storeId = state.selectedStoreId;
  const date = businessDate ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) {
    return {
      storeId: '',
      businessDate: date,
      targetSales: 0,
      actualSales: 0,
      runRateSales: 0,
      useSalesValue: 'actual',
      salesForCalculation: 0,
      overAchievement: 0,
      overAchievementRate: null,
      poolShare: 0,
      pool: 0,
      status: 'not-tracked',
    };
  }
  
  return deriveIncentivePool(state.events, storeId, date);
};

export const selectIncentiveDistribution = (
  state: AppState,
  businessDate?: string
): IncentiveDistribution => {
  const storeId = state.selectedStoreId;
  const date = businessDate ?? new Date().toISOString().split('T')[0];
  
  if (!storeId) {
    return {
      storeId: '',
      businessDate: date,
      pool: {
        storeId: '',
        businessDate: date,
        targetSales: 0,
        actualSales: 0,
        runRateSales: 0,
        useSalesValue: 'actual',
        salesForCalculation: 0,
        overAchievement: 0,
        overAchievementRate: null,
        poolShare: 0,
        pool: 0,
        status: 'not-tracked',
      },
      totalStars: 0,
      eligibilityMinQuestsDone: 1,
      eligibleStaffCount: 0,
      totalStaffCount: 0,
      staffShares: [],
      status: 'not-tracked',
      lastUpdate: new Date().toISOString(),
    };
  }
  
  return deriveIncentiveDistribution(state.events, state.staff, storeId, date);
};

// Re-export types from derive for easier access
export type { 
  DailyScore, 
  TeamDailyScore, 
  StaffDailyScore, 
  ScoreDeduction, 
  DeductionCategory, 
  DailyScoreBreakdown, 
  Period, 
  TeamPerformanceMetrics,
  TeamSnapshot,
  SkillMixCoverage,
  IndividualPerformance,
  CoachingAction,
  PromotionCandidate,
  AwardsMetrics,
  Award,
  AwardNominee,
  AwardEvidence,
  AwardCategory,
  TodayEarnings,
  IncentivePool,
  IncentiveDistribution,
  StaffIncentiveShare,
} from './derive';
