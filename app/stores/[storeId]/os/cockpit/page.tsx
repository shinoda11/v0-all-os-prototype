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
          {/* CTA when no quests - direct to Plan page */}
          {questTotal === 0 && (
            <div className="text-center py-2">
              <div className="text-xs text-muted-foreground mb-2">
                {t('cockpit.quest.noQuestsBottleneck')}
              </div>
              <Link href={`/stores/${storeId}/os/plan`}>
                <Button variant="default" size="sm" className="gap-2">
                  <Play className="h-4 w-4" />
                  {t('cockpit.generateTodayPlan')}
                </Button>
              </Link>
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
    'sales', 'labor', 'prep', 'delivery', 'decision', 'cockpit-sales', 'cockpit-operations'
  ]);

  // Get current data from state
  const metrics = selectCockpitMetrics(state, timeBand);
  const exceptions = selectExceptions(state, timeBand);
  const prepMetrics = selectPrepMetrics(state, timeBand);
  const laborMetrics = selectLaborMetrics(state, timeBand);
  const incentivePool = selectIncentivePool(state);
  const incentiveDistribution = selectIncentiveDistribution(state);
  const openIncidents = selectOpenIncidents(state);
  const criticalIncidents = selectCriticalIncidents(state);
  
  // Get labor guardrail summary
  const laborGuardrail = deriveLaborGuardrailSummary(state.events, state.selectedStoreId ?? '1');
  
  // Derive shift totals
  const shiftTotals = selectShiftSummary(state);
  
  // Determine time band based on current time for context
  const now = new Date();
  const currentHour = now.getHours();
  
  // Calculate landing estimate
  const landingEstimate = calculateLandingEstimate(
    currentStore.id,
    metrics.salesActual,
    metrics.salesForecast,
    now
  );

  // Sales CTA logic
  const salesGap = metrics.salesActual - metrics.salesForecast;
  const salesGapPercent = metrics.salesForecast > 0 
    ? ((metrics.salesActual - metrics.salesForecast) / metrics.salesForecast) * 100 
    : 0;
  const isBehindTarget = salesGapPercent < -5;
  
  // Labor guardrail status
  const laborStatus = laborGuardrail.status;
  const laborStatusColor = laborStatus === 'green' ? 'emerald' : laborStatus === 'yellow' ? 'amber' : 'red';

  // Get incentive CTA message
  const getIncentiveCTA = () => {
    if (incentivePool.locked) {
      return { message: t('cockpit.incentive.locked'), type: 'warning' as const };
    }
    if (incentivePool.currentPool > 0) {
      return { message: t('cockpit.incentive.available'), type: 'success' as const };
    }
    return { message: t('cockpit.incentive.empty'), type: 'neutral' as const };
  };
  const incentiveCTA = getIncentiveCTA();

  if (!currentStore) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <OSHeader storeName={currentStore.name} lastUpdate={busUpdateTime} />
      
      <div className="flex items-center gap-4 flex-wrap">
        <TimeBandTabs value={timeBand} onChange={setTimeBand} />
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setBriefingOpen(true)}
          className="ml-auto"
        >
          Today Briefing
        </Button>
      </div>

      {/* Hero Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card - Enhanced with landing estimate */}
        <Card className={cn(
          isBehindTarget && 'border-red-200 bg-red-50/50'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('cockpit.sales.title')}
              </CardTitle>
              <FreshnessBadge lastUpdate={metrics.lastSalesUpdate} compact />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatCurrency(metrics.salesActual, locale)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatCurrency(metrics.salesForecast, locale)}
              </span>
            </div>
            <div className={cn(
              'flex items-center gap-1 text-sm',
              salesGapPercent >= 0 ? 'text-emerald-700' : 'text-red-700'
            )}>
              {salesGapPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatCurrencyDiff(salesGap, locale)} ({salesGapPercent >= 0 ? '+' : ''}{salesGapPercent.toFixed(1)}%)
            </div>
            {/* Landing Estimate */}
            <div className="pt-2 border-t border-border space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Landing Est.</span>
                <span className="font-medium tabular-nums">
                  ¥{landingEstimate.min.toLocaleString()}〜¥{landingEstimate.max.toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {landingEstimate.explanation}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labor Card - with guardrail status */}
        <Card className={cn(
          laborStatus === 'red' && 'border-red-200 bg-red-50/50',
          laborStatus === 'yellow' && 'border-amber-200 bg-amber-50/50'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('cockpit.labor.title')}
              </CardTitle>
              <Badge variant={laborStatus === 'green' ? 'default' : laborStatus === 'yellow' ? 'secondary' : 'destructive'}>
                {laborStatus.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatPercent(laborMetrics.laborCostPercent, locale)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatPercent(laborMetrics.laborCostTarget, locale)} target
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hours</span>
              <span className="font-medium">{formatHours(laborMetrics.totalHours, locale)} / {formatHours(laborMetrics.plannedHours, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Productivity</span>
              <span className="font-medium">{formatCurrency(laborMetrics.salesPerHour, locale)}/h</span>
            </div>
            {laborGuardrail.alerts.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className={cn('text-xs', `text-${laborStatusColor}-700`)}>
                  {laborGuardrail.alerts[0]}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prep Status */}
        <Card className={cn(
          prepMetrics.completionRate < 70 && 'border-amber-200 bg-amber-50/50'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('cockpit.prep.title')}
              </CardTitle>
              <FreshnessBadge lastUpdate={prepMetrics.lastUpdate} compact />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatPercent(prepMetrics.completionRate, locale)}
              </span>
              <span className="text-sm text-muted-foreground">complete</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{prepMetrics.completed} / {prepMetrics.total}</span>
            </div>
            {prepMetrics.critical > 0 && (
              <div className="flex items-center gap-1 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {prepMetrics.critical} critical items behind
              </div>
            )}
            <Link href={`/stores/${currentStore.id}/os/prep-monitor`}>
              <Button variant="ghost" size="sm" className="w-full mt-2 gap-2 text-xs">
                <ExternalLink className="h-3 w-3" />
                View Prep Monitor
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Incentive Pool */}
        <Card className={cn(
          incentivePool.locked && 'border-amber-200 bg-amber-50/50'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gift className="h-4 w-4" />
                {t('cockpit.incentive.title')}
              </CardTitle>
              {incentivePool.locked && (
                <Badge variant="secondary">Locked</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatCurrency(incentivePool.currentPool, locale)}
              </span>
              <span className="text-sm text-muted-foreground">pool</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Distributed</span>
              <span className="font-medium">{formatCurrency(incentivePool.distributed, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Eligible</span>
              <span className="font-medium">{incentiveDistribution.eligibleCount} staff</span>
            </div>
            <div className={cn(
              'text-xs pt-2 border-t border-border',
              incentiveCTA.type === 'success' && 'text-emerald-700',
              incentiveCTA.type === 'warning' && 'text-amber-700'
            )}>
              {incentiveCTA.message}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Summary + Team Score Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DynamicShiftSummary />
        <TeamScoreCard />
        
        {/* Incidents Card */}
        <Card className={cn(
          criticalIncidents.length > 0 ? 'border-red-200 bg-red-50/50' :
          openIncidents.length > 0 ? 'border-amber-200 bg-amber-50/50' : ''
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t('cockpit.incidents.title')}
              </CardTitle>
              <Badge variant={criticalIncidents.length > 0 ? 'destructive' : openIncidents.length > 0 ? 'secondary' : 'default'}>
                {openIncidents.length} Open
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {openIncidents.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                {t('cockpit.incidents.none')}
              </div>
            ) : (
              <>
                {criticalIncidents.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-red-700">CRITICAL</div>
                    {criticalIncidents.slice(0, 2).map((incident) => (
                      <div key={incident.id} className="text-sm text-red-700 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {incident.title}
                      </div>
                    ))}
                  </div>
                )}
                {openIncidents.filter(i => i.severity !== 'critical').length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-700">OTHER</div>
                    {openIncidents.filter(i => i.severity !== 'critical').slice(0, 2).map((incident) => (
                      <div key={incident.id} className="text-sm flex items-center gap-1">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', 
                          incident.severity === 'high' ? 'bg-red-500' :
                          incident.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                        )} />
                        {incident.title}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <Link href={`/stores/${currentStore.id}/os/incidents`}>
              <Button variant="outline" size="sm" className="w-full mt-2 gap-2">
                <ExternalLink className="h-3 w-3" />
                {t('cockpit.incidents.viewAll')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Exceptions List */}
      {exceptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t('cockpit.exceptions.title')} ({exceptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exceptions.slice(0, 5).map((exception, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={exception.severity === 'high' ? 'destructive' : 'secondary'}>
                      {exception.type}
                    </Badge>
                    <span>{exception.message}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{exception.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ReplayControls - dev only */}
      {process.env.NODE_ENV === 'development' && <ReplayControls />}

      {/* Today Briefing Modal */}
      <TodayBriefingModal 
        open={briefingOpen} 
        onOpenChange={setBriefingOpen}
        mode={operationMode}
        onModeChange={setOperationMode}
      />
    </div>
  );
}
