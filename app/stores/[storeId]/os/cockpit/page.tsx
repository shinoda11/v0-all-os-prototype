'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { OSHeader } from '@/components/OSHeader';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { MetricCard } from '@/components/MetricCard';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/state/store';
import { useStateSubscription } from '@/state/eventBus';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatCurrencyDiff, formatPercent, formatHours, formatRatio } from '@/i18n/format';
import {
  selectCockpitMetrics,
  selectCurrentStore,
  selectExceptions,
  selectPrepMetrics,
  selectLaborMetrics,
  selectShiftSummary,
  selectTodoStats,
  selectTeamDailyScore,
  selectIncentivePool,
  selectIncentiveDistribution,
  selectOpenIncidents,
  selectCriticalIncidents,
  } from '@/core/selectors';
import { deriveLaborGuardrailSummary } from '@/core/derive';
import { TodayBriefingModal, type OperationMode } from '@/components/cockpit/TodayBriefingModal';
import type { TimeBand, Proposal, Role, ExceptionItem } from '@/core/types';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  AlertTriangle,
  DollarSign,
  Clock,
  Coffee,
  Star,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Target,
  CheckSquare,
  Trophy,
  Gift,
  ExternalLink,
  ClipboardList,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function ReplayControls() {
  const { state, actions } = useStore();
  const { replay } = state;
  const isReplayActive = replay.pendingEvents.length > 0;
  const replayProgress = isReplayActive
    ? Math.round((replay.currentIndex / replay.pendingEvents.length) * 100)
    : 0;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">リプレイ制御</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => actions.startReplay()}
              disabled={isReplayActive}
              className="bg-transparent"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              読込
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => actions.stepReplay()}
              disabled={!isReplayActive || replay.currentIndex >= replay.pendingEvents.length}
              className="bg-transparent"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Step
            </Button>
            {replay.isPlaying ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => actions.pauseReplay()}
                className="bg-transparent"
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => actions.playReplay()}
                disabled={!isReplayActive || replay.currentIndex >= replay.pendingEvents.length}
                className="bg-transparent"
              >
                <Play className="h-4 w-4 mr-1" />
                Play
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => actions.resetReplay()}
              disabled={!isReplayActive}
              className="bg-transparent"
            >
              Reset
            </Button>
          </div>
          {isReplayActive && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${replayProgress}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {replay.currentIndex}/{replay.pendingEvents.length}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Shift Summary + Quest Progress Component
function DynamicShiftSummary() {
  const { state } = useStore();
  const { t } = useI18n();
  const params = useParams();
  const storeId = params.storeId as string;
  const summary = selectShiftSummary(state);
  const todoStats = selectTodoStats(state);
  
  // Calculate quest completion rate
  const questTotal = todoStats.total;
  const questDone = todoStats.completed;
  const questInProgress = todoStats.inProgress;
  const questCompletionRate = questTotal > 0 ? Math.round((questDone / questTotal) * 100) : 0;
  
  // Format hours display - show "—" when plannedHours is null (not tracked)
  const formatHoursDisplay = () => {
    const actualDisplay = `${summary.actualHours.toFixed(1)}h`;
    const plannedDisplay = summary.plannedHours !== null ? `${summary.plannedHours}h` : '—';
    return `${actualDisplay} / ${plannedDisplay}`;
  };
  
  // Check if hours are over planned (only when planned is available)
  const isOverPlanned = summary.plannedHours !== null && summary.actualHours > summary.plannedHours;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Staff & Quest Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <FreshnessBadge lastUpdate={summary.lastUpdate} />
            <Link href={`/stores/${storeId}/os/live-staff`}>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                詳細
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staff Summary */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground">STAFF</div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              On Duty
            </span>
            <span className="font-bold">{summary.activeStaffCount}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              On Break
            </span>
            <span className="font-bold">{summary.onBreakCount}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Hours</span>
            <span className={cn('font-bold', isOverPlanned && 'text-red-700')}>
              {formatHoursDisplay()}
            </span>
          </div>
        </div>
        
        {/* Quest Progress */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="text-xs font-bold text-muted-foreground">QUESTS</div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              Completion
            </span>
            <span className={cn(
              'font-bold',
              questTotal === 0 ? 'text-muted-foreground' :
              questCompletionRate >= 80 ? 'text-emerald-700' : 
              questCompletionRate >= 50 ? 'text-amber-700' : 'text-red-700'
            )}>
              {questTotal === 0 ? '—' : `${questCompletionRate}%`}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">In Progress</span>
            <span className="font-bold">{questInProgress}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Done / Total</span>
            <span className="font-bold">{questDone} / {questTotal}</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all',
                questTotal === 0 ? 'bg-muted' :
                questCompletionRate >= 80 ? 'bg-emerald-500' : 
                questCompletionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: questTotal === 0 ? '0%' : `${questCompletionRate}%` }}
            />
          </div>
          {/* Bottleneck message when no quests */}
          {questTotal === 0 && (
            <div className="text-xs text-muted-foreground italic">
              {t('cockpit.quest.noQuestsBottleneck')}
            </div>
          )}
          {/* Open Ops Monitor button */}
          <Link href={`/stores/${storeId}/os/ops-monitor`}>
            <Button variant="outline" size="sm" className="w-full mt-2 gap-2">
              <ClipboardList className="h-4 w-4" />
              {t('cockpit.openOpsMonitor')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Team Daily Score Component
function TeamScoreCard() {
  const { state } = useStore();
  const teamScore = selectTeamDailyScore(state);
  
  const gradeColors = {
    S: 'bg-amber-100 text-amber-800',
    A: 'bg-emerald-100 text-emerald-800',
    B: 'bg-blue-100 text-blue-800',
    C: 'bg-gray-100 text-gray-800',
    D: 'bg-red-100 text-red-800',
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Team Score
          </CardTitle>
          <div className={cn(
            'px-2 py-0.5 rounded text-sm font-bold',
            gradeColors[teamScore.grade]
          )}>
            {teamScore.grade}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold tabular-nums">{teamScore.total}</span>
          <span className="text-sm text-muted-foreground">/ 100 pts</span>
        </div>
        
        {/* Score Breakdown Mini */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className="font-bold">{teamScore.breakdown.taskCompletion}</div>
            <div className="text-muted-foreground">Task</div>
          </div>
          <div>
            <div className="font-bold">{teamScore.breakdown.timeVariance}</div>
            <div className="text-muted-foreground">Time</div>
          </div>
          <div>
            <div className="font-bold">{teamScore.breakdown.breakCompliance}</div>
            <div className="text-muted-foreground">Break</div>
          </div>
          <div>
            <div className="font-bold">{teamScore.breakdown.zeroOvertime}</div>
            <div className="text-muted-foreground">OT</div>
          </div>
        </div>
        
        {/* Bottlenecks */}
        {teamScore.bottlenecks.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border">
            <div className="text-xs font-bold text-muted-foreground">BOTTLENECKS</div>
            {teamScore.bottlenecks.slice(0, 2).map((b, i) => (
              <div key={i} className="text-sm text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {b}
              </div>
            ))}
          </div>
        )}
        
        {/* Top Performers */}
        {teamScore.topPerformers.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border">
            <div className="text-xs font-bold text-muted-foreground">TOP PERFORMERS</div>
            {teamScore.topPerformers.slice(0, 2).map((p) => (
              <div key={p.staffId} className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {p.staffName}
                </span>
                <span className="font-bold">{p.score}pts</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Needs Support */}
        {teamScore.needsSupport.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border">
            <div className="text-xs font-bold text-muted-foreground">NEEDS SUPPORT</div>
            {teamScore.needsSupport.slice(0, 2).map((s) => (
              <div key={s.staffId} className="text-sm">
                <span className="text-red-700">{s.staffName}</span>
                <span className="text-muted-foreground"> - {s.issue}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Time band sales distribution by store (can be customized per store)
const STORE_SALES_DISTRIBUTION: Record<string, { lunch: number; idle: number; dinner: number }> = {
  '1': { lunch: 0.35, idle: 0.10, dinner: 0.55 }, // 二子玉川 - dinner heavy
  '2': { lunch: 0.40, idle: 0.10, dinner: 0.50 }, // 自由が丘 - balanced
  '3': { lunch: 0.30, idle: 0.15, dinner: 0.55 }, // 豊洲 - office area, lunch lighter
  '4': { lunch: 0.35, idle: 0.10, dinner: 0.55 }, // 駒沢 - default
};

const DEFAULT_DISTRIBUTION = { lunch: 0.35, idle: 0.10, dinner: 0.55 };

// Time band hours definition
const TIME_BAND_HOURS = {
  lunch: { start: 11, end: 14 },
  idle: { start: 14, end: 17 },
  dinner: { start: 17, end: 22 },
};

// Calculate current time band and progress within it
function getCurrentTimeBandInfo(now: Date) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  
  let currentBand: 'lunch' | 'idle' | 'dinner' | 'before' | 'after' = 'before';
  let progress = 0;
  let bandMinutesElapsed = 0;
  let bandTotalMinutes = 0;
  
  if (hour >= TIME_BAND_HOURS.lunch.start && hour < TIME_BAND_HOURS.lunch.end) {
    currentBand = 'lunch';
    const bandStart = TIME_BAND_HOURS.lunch.start * 60;
    const bandEnd = TIME_BAND_HOURS.lunch.end * 60;
    bandMinutesElapsed = currentMinutes - bandStart;
    bandTotalMinutes = bandEnd - bandStart;
    progress = bandMinutesElapsed / bandTotalMinutes;
  } else if (hour >= TIME_BAND_HOURS.idle.start && hour < TIME_BAND_HOURS.idle.end) {
    currentBand = 'idle';
    const bandStart = TIME_BAND_HOURS.idle.start * 60;
    const bandEnd = TIME_BAND_HOURS.idle.end * 60;
    bandMinutesElapsed = currentMinutes - bandStart;
    bandTotalMinutes = bandEnd - bandStart;
    progress = bandMinutesElapsed / bandTotalMinutes;
  } else if (hour >= TIME_BAND_HOURS.dinner.start && hour < TIME_BAND_HOURS.dinner.end) {
    currentBand = 'dinner';
    const bandStart = TIME_BAND_HOURS.dinner.start * 60;
    const bandEnd = TIME_BAND_HOURS.dinner.end * 60;
    bandMinutesElapsed = currentMinutes - bandStart;
    bandTotalMinutes = bandEnd - bandStart;
    progress = bandMinutesElapsed / bandTotalMinutes;
  } else if (hour >= TIME_BAND_HOURS.dinner.end) {
    currentBand = 'after';
    progress = 1;
  }
  
  return { currentBand, progress, bandMinutesElapsed, bandTotalMinutes };
}

// Calculate landing estimate with time band curve
function calculateLandingEstimate(
  storeId: string,
  salesActual: number,
  salesForecast: number,
  now: Date
): {
  min: number;
  max: number;
  pace: number;
  explanation: string;
  currentBand: string;
  bandProgress: number;
} {
  const distribution = STORE_SALES_DISTRIBUTION[storeId] ?? DEFAULT_DISTRIBUTION;
  const { currentBand, progress } = getCurrentTimeBandInfo(now);
  
  // Calculate expected sales up to current point based on time band curve
  let expectedSalesRatio = 0;
  let completedBandsRatio = 0;
  let currentBandExpectedRatio = 0;
  
  if (currentBand === 'before') {
    // Before lunch - no sales expected yet
    expectedSalesRatio = 0;
  } else if (currentBand === 'lunch') {
    currentBandExpectedRatio = distribution.lunch * progress;
    expectedSalesRatio = currentBandExpectedRatio;
    completedBandsRatio = 0;
  } else if (currentBand === 'idle') {
    completedBandsRatio = distribution.lunch;
    currentBandExpectedRatio = distribution.idle * progress;
    expectedSalesRatio = completedBandsRatio + currentBandExpectedRatio;
  } else if (currentBand === 'dinner') {
    completedBandsRatio = distribution.lunch + distribution.idle;
    currentBandExpectedRatio = distribution.dinner * progress;
    expectedSalesRatio = completedBandsRatio + currentBandExpectedRatio;
  } else {
    // After closing
    expectedSalesRatio = 1;
    completedBandsRatio = 1;
  }
  
  // Calculate pace: actual vs expected at this point
  const expectedSales = salesForecast * expectedSalesRatio;
  const pace = expectedSales > 0 ? salesActual / expectedSales : 1;
  
  // Calculate remaining sales based on pace
  const remainingRatio = 1 - expectedSalesRatio;
  const projectedRemaining = salesForecast * remainingRatio * pace;
  
  // Landing estimate with confidence range
  const landing = salesActual + projectedRemaining;
  const min = Math.round(landing * 0.92); // -8% variance
  const max = Math.round(landing * 1.08); // +8% variance
  
  // Generate explanation
  const bandLabels: Record<string, string> = {
    lunch: 'ランチ',
    idle: 'アイドル',
    dinner: 'ディナー',
    before: '営業前',
    after: '営業終了',
  };
  
  const bandLabel = bandLabels[currentBand] ?? currentBand;
  const progressPercent = Math.round(progress * 100);
  const paceText = pace >= 1.05 ? '好調' : pace >= 0.95 ? '計画通り' : pace >= 0.85 ? 'やや遅れ' : '遅れ';
  const paceSign = pace >= 1 ? '+' : '';
  const pacePercent = Math.round((pace - 1) * 100);
  
  let explanation = '';
  if (currentBand === 'before') {
    explanation = '営業前';
  } else if (currentBand === 'after') {
    explanation = `本日終了 ペース${paceSign}${pacePercent}%`;
  } else {
    explanation = `${bandLabel}${progressPercent}% ${paceText}(${paceSign}${pacePercent}%)`;
  }
  
  return {
    min,
    max,
    pace,
    explanation,
    currentBand,
    bandProgress: progress,
  };
}

export default function CockpitPage() {
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();
  const [timeBand, setTimeBand] = useState<TimeBand>('all');
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [operationMode, setOperationMode] = useState<OperationMode>('sales');

  // Subscribe to state updates via event bus
  const { lastUpdateTime: busUpdateTime } = useStateSubscription([
    'sales', 'labor', 'prep', 'delivery', 'decision', 'cockpit-sales', 'cockpit-labor', 'cockpit-operations'
  ]);

  // All hooks must be called before any early returns
  const selectedStoreId = state.selectedStoreId;
  
  const metrics = selectCockpitMetrics(state, undefined, timeBand);
  const laborMetrics = selectLaborMetrics(state);
  const prepMetrics = selectPrepMetrics(state);
  const exceptions = selectExceptions(state);
  const shiftSummary = selectShiftSummary(state);
  const incentivePool = selectIncentivePool(state);
  
  // Active incidents for strip
  const openIncidents = selectOpenIncidents(state);
  const criticalIncidents = selectCriticalIncidents(state);
  const today = new Date().toISOString().split('T')[0];
  const incentiveDistribution = selectIncentiveDistribution(state, today);
  const todoStats = selectTodoStats(state);

  // Calculate enhanced metrics - use bus update time for freshness
  const now = new Date();
  const lastUpdateTime = busUpdateTime;
  
  // Sales calculations
  const salesActual = metrics?.sales?.actual ?? 0;
  const salesForecast = metrics?.sales?.forecast ?? 0;
  const salesDiff = salesActual - salesForecast;
  const salesAchievementRate = metrics?.sales?.achievementRate ?? 0;
  
  // Landing estimate with time band curve
  const landingEstimate = calculateLandingEstimate(
    selectedStoreId ?? '1',
    salesActual,
    salesForecast,
    now
  );
  const landingMin = landingEstimate.min;
  const landingMax = landingEstimate.max;
  const landingExplanation = landingEstimate.explanation;
  
  // Labor calculations (using dynamic shift summary)
  const laborCost = laborMetrics?.laborCostEstimate ?? 0;
  const laborRate = salesActual > 0 ? (laborCost / salesActual) * 100 : 0;
  const salesPerLabor = laborCost > 0 ? salesActual / laborCost : 0;
  const plannedHours = shiftSummary?.plannedHours ?? 48;
  const actualHours = shiftSummary?.actualHours ?? laborMetrics?.totalHoursToday ?? 0;
  const breakCount = shiftSummary?.onBreakCount ?? laborMetrics?.onBreakCount ?? 0;
  
  // Labor guardrail calculation
  const dayOfWeek = now.getDay();
  const dayType: 'weekday' | 'weekend' = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
  const plannedLaborCostDaily = plannedHours * 1200; // Average wage assumption
  const runRateSalesDaily = landingEstimate.min > 0 ? (landingEstimate.min + landingEstimate.max) / 2 : salesForecast;
  
  const guardrailSummary = deriveLaborGuardrailSummary({
    businessDate: now.toISOString().split('T')[0],
    dayType,
    forecastSalesDaily: salesForecast,
    runRateSalesDaily,
    plannedLaborCostDaily,
    actualLaborCostSoFar: laborCost,
  });
  
  // Operations
  const delayedCount = prepMetrics?.plannedCount ?? 0;
  const completionRate = prepMetrics?.completionRate ?? 0;
  const bottleneck = delayedCount > 0 ? { task: '仕込み', reason: `${delayedCount}件未着手` } : null;
  
  // Time band forecasts for briefing modal
  const timeBandForecasts = [
    { band: 'lunch' as TimeBand, label: t('timeband.lunch'), salesForecast: Math.round(salesForecast * 0.35), weight: 35 },
    { band: 'idle' as TimeBand, label: t('timeband.idle'), salesForecast: Math.round(salesForecast * 0.15), weight: 15 },
    { band: 'dinner' as TimeBand, label: t('timeband.dinner'), salesForecast: Math.round(salesForecast * 0.50), weight: 50 },
  ];
  
  // Initial todos for briefing (proposals converted to todos)
  const initialTodos = state.proposals.filter((p) => 
    p.storeId === selectedStoreId && 
    (p.type === 'extra-prep' || p.type === 'prep-reorder')
  );

  // Briefing modal handlers
  const handleDistributeTodos = (todos: Proposal[], mode: OperationMode) => {
    setOperationMode(mode);
    // Distribute todos by approving each one
    for (const todo of todos) {
      actions.approveProposal(todo);
    }
    setBriefingOpen(false);
  };

  // Now we can have early returns after all hooks
  if (!currentStore) {
    return (
<div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  return (
    <div className="space-y-6">
      {/* OS Header with Ask OS button */}
      <OSHeader
        title={t('cockpit.title')}
        timeBand={timeBand}
        onTimeBandChange={setTimeBand}
        showTimeBandTabs={false}
      />
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PageHeader title={t('cockpit.title')} subtitle={shortName} />
          <Button
            onClick={() => setBriefingOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
          >
            <Target className="h-4 w-4" />
            {t('briefing.button')}
          </Button>
        </div>
        <TimeBandTabs value={timeBand} onChange={setTimeBand} />
      </div>
      
      {/* Today's Briefing Modal */}
      <TodayBriefingModal
        open={briefingOpen}
        onOpenChange={setBriefingOpen}
        forecastSales={salesForecast}
        timeBandForecasts={timeBandForecasts}
        shiftSummary={shiftSummary}
        guardrailSummary={guardrailSummary}
        prepMetrics={prepMetrics}
        initialTodos={initialTodos}
        onDistributeTodos={handleDistributeTodos}
        onClose={() => setBriefingOpen(false)}
      />

      {/* ReplayControls - dev only */}
      {process.env.NODE_ENV === 'development' && <ReplayControls />}

      {/* Active Incidents Strip - Only shows when there are active incidents */}
      {openIncidents.length > 0 && (
        <Card className={cn(
          'border',
          criticalIncidents.length > 0 ? 'border-red-300 bg-red-50/50' : 'border-amber-300 bg-amber-50/50'
        )}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  'p-2 rounded-full',
                  criticalIncidents.length > 0 ? 'bg-red-100' : 'bg-amber-100'
                )}>
                  <Bell className={cn(
                    'h-4 w-4',
                    criticalIncidents.length > 0 ? 'text-red-600' : 'text-amber-600'
                  )} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {t('cockpit.activeIncidents')}
                    </span>
                    <Badge variant="outline" className={cn(
                      'text-xs',
                      criticalIncidents.length > 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                    )}>
                      {openIncidents.length}
                    </Badge>
                    {criticalIncidents.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {criticalIncidents.length} {t('cockpit.critical')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {openIncidents.slice(0, 2).map(i => i.title).join(' / ')}
                  </div>
                </div>
              </div>
              <Link href={`/stores/${currentStore?.id}/os/incidents?filter=open`}>
                <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                  {t('cockpit.viewIncidents')}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards - Focused on People + Quests + Sales/Labor */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sales Card */}
        <MetricCard
          title={t('cockpit.sales')}
          value={formatCurrency(salesActual, locale)}
          subValue={`${t('cockpit.forecast')} ${formatCurrency(salesForecast, locale)}`}
          trend={salesDiff >= 0 ? 'up' : 'down'}
          trendValue={formatCurrencyDiff(salesDiff, locale)}
          icon={<TrendingUp className="h-4 w-4" />}
          status={salesAchievementRate >= 100 ? 'success' : salesAchievementRate >= 80 ? 'default' : 'warning'}
          lastUpdate={lastUpdateTime}
        >
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground truncate">
              {t('cockpit.landing')}: {formatCurrency(landingMin, locale)} ~ {formatCurrency(landingMax, locale)}
            </div>
            <div className="text-[10px] text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded truncate">
              {landingExplanation}
            </div>
          </div>
        </MetricCard>

        {/* Labor Card - Simplified */}
        <MetricCard
          title={t('cockpit.labor')}
          value={formatCurrency(laborCost, locale)}
          subValue={`${t('cockpit.laborRate')} ${formatPercent(laborRate, locale)}`}
          icon={<DollarSign className="h-4 w-4" />}
          status={guardrailSummary.status === 'danger' ? 'error' : guardrailSummary.status === 'caution' ? 'warning' : 'success'}
          lastUpdate={lastUpdateTime}
        >
          <div className="space-y-1.5 text-xs">
            {/* Compact guardrail status */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('cockpit.currentProjection')}</span>
              <span className={cn(
                'font-medium',
                guardrailSummary.status === 'danger' ? 'text-red-600' : 
                guardrailSummary.status === 'caution' ? 'text-yellow-600' : 'text-green-600'
              )}>
                {formatPercent(guardrailSummary.projectedLaborRateEOD * 100, locale)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('cockpit.deltaToGood')}</span>
              <span className={cn(
                'font-medium',
                guardrailSummary.deltaToGood > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {guardrailSummary.deltaToGood > 0 ? '+' : ''}{(guardrailSummary.deltaToGood * 100).toFixed(1)}pt
              </span>
            </div>
            {/* Hours and break */}
            <div className="flex justify-between items-center pt-1 border-t">
              <span className="text-muted-foreground">{t('shift.hours')}</span>
              <span className={cn('font-medium', actualHours > plannedHours && 'text-red-600')}>
                {formatHours(actualHours, locale)} / {formatHours(plannedHours, locale, 0)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Coffee className="h-3 w-3" />
              <span>{t('cockpit.onBreak')} {breakCount}</span>
            </div>
          </div>
        </MetricCard>

        {/* Incentive Pool Card */}
        <MetricCard
          title={t('incentive.title')}
          value={formatCurrency(incentivePool.pool, locale)}
          subValue={`${t('incentive.overachievement')} ${formatCurrency(incentivePool.overAchievement, locale)}`}
          icon={<Gift className="h-4 w-4" />}
          status={incentivePool.pool > 0 ? 'success' : 'default'}
          lastUpdate={lastUpdateTime}
        >
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('incentive.targetSales')}</span>
              <span className="font-medium">{formatCurrency(incentivePool.targetSales, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('incentive.projectedSales')}</span>
              <span className="font-medium">{formatCurrency(incentivePool.salesForCalculation, locale)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-muted">
              <span className="text-muted-foreground">{t('incentive.poolShare')}</span>
              <span className="font-medium">{(incentivePool.poolShare * 100).toFixed(0)}%</span>
            </div>
            {/* Payout per star */}
            <div className="flex justify-between pt-1 border-t border-muted">
              <span className="text-muted-foreground">{t('incentive.payoutPerStar')}</span>
              <span className="font-medium text-emerald-700">
                {incentiveDistribution.totalStars > 0 
                  ? formatCurrency(incentivePool.pool / incentiveDistribution.totalStars, locale)
                  : '-'}
              </span>
            </div>
            <div className="text-muted-foreground text-[10px] pt-1">
              {t('incentive.totalStarsOnDuty')}: {incentiveDistribution.totalStars}
            </div>
            {/* Downside note */}
            <div className="pt-2 text-[10px] text-muted-foreground italic">
              {t('incentive.downsideNote')}
            </div>
            <Link
              href={`/stores/${currentStore?.id}/os/incentives`}
              className="flex items-center justify-end gap-1 pt-1 text-primary hover:underline"
            >
              {t('incentive.viewDetails')}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </MetricCard>
      </div>

      {/* Staff Status + Team Score */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DynamicShiftSummary />
        <TeamScoreCard />
      </div>
    </div>
  );
}
