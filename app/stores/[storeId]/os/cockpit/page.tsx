'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { MetricCard } from '@/components/MetricCard';
import { LaneTimeline } from '@/components/Timeline';
import { DecisionQueue } from '@/components/DecisionQueue';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { Drawer } from '@/components/Drawer';
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
  selectLaneEvents,
  selectShiftSummary,
  selectSupplyDemandMetrics,
} from '@/core/selectors';
import { deriveLaborGuardrailSummary } from '@/core/derive';
import { TodayBriefingModal, type OperationMode } from '@/components/cockpit/TodayBriefingModal';
import type { TimeBand, Proposal, Role, ExceptionItem, RiskItem } from '@/core/types';
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

// Shift Summary Component (Read-only, dynamically calculated)
function DynamicShiftSummary() {
  const { state } = useStore();
  const summary = selectShiftSummary(state);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            本日のシフト概要
            {summary.isCalculating && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">計算中</Badge>
            )}
          </CardTitle>
          <FreshnessBadge lastUpdate={summary.lastUpdate} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">人時</span>
          <span className={cn('font-medium', summary.actualHours > summary.plannedHours && 'text-red-600')}>
            {summary.actualHours.toFixed(1)}h / {summary.plannedHours}h
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">スキルミックス</span>
          <div className="flex gap-2">
            {summary.skillMix.star3 > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {summary.skillMix.star3}
              </Badge>
            )}
            {summary.skillMix.star2 > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {summary.skillMix.star2}
              </Badge>
            )}
            {summary.skillMix.star1 > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {summary.skillMix.star1}
              </Badge>
            )}
            {summary.skillMix.star3 === 0 && summary.skillMix.star2 === 0 && summary.skillMix.star1 === 0 && (
              <span className="text-xs text-muted-foreground">--</span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">役割構成</span>
          <div className="flex gap-2">
            {summary.roleMix.kitchen > 0 && (
              <Badge variant="secondary" className="text-xs">厨房 {summary.roleMix.kitchen}</Badge>
            )}
            {summary.roleMix.floor > 0 && (
              <Badge variant="secondary" className="text-xs">ホール {summary.roleMix.floor}</Badge>
            )}
            {summary.roleMix.delivery > 0 && (
              <Badge variant="secondary" className="text-xs">配達 {summary.roleMix.delivery}</Badge>
            )}
            {summary.roleMix.kitchen === 0 && summary.roleMix.floor === 0 && summary.roleMix.delivery === 0 && (
              <span className="text-xs text-muted-foreground">--</span>
            )}
          </div>
        </div>
        {summary.onBreakCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coffee className="h-3 w-3" />
            <span>休憩中 {summary.onBreakCount}名</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProposalEditorProps {
  proposal: Proposal;
  roles: Role[];
  onChange: (proposal: Proposal) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ProposalEditor({ proposal, roles, onChange, onSave, onCancel }: ProposalEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label>タイトル</Label>
        <Input
          value={proposal.title}
          onChange={(e) => onChange({ ...proposal, title: e.target.value })}
        />
      </div>
      <div>
        <Label>説明</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          rows={3}
          value={proposal.description}
          onChange={(e) => onChange({ ...proposal, description: e.target.value })}
        />
      </div>
      <div>
        <Label>数量</Label>
        <Input
          type="number"
          value={proposal.quantity}
          onChange={(e) => onChange({ ...proposal, quantity: Number.parseInt(e.target.value) || 0 })}
        />
      </div>
      <div>
        <Label>配布先ロール</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {roles.map((role) => (
            <Badge
              key={role.id}
              variant={proposal.distributedToRoles.includes(role.id) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer',
                !proposal.distributedToRoles.includes(role.id) && 'hover:bg-muted'
              )}
              onClick={() => {
                const newRoles = proposal.distributedToRoles.includes(role.id)
                  ? proposal.distributedToRoles.filter((r) => r !== role.id)
                  : [...proposal.distributedToRoles, role.id];
                onChange({ ...proposal, distributedToRoles: newRoles });
              }}
            >
              {role.name}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <Label>優先度</Label>
        <div className="flex gap-2 mt-2">
          {(['low', 'medium', 'high', 'critical'] as const).map((priority) => (
            <Badge
              key={priority}
              variant={proposal.priority === priority ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => onChange({ ...proposal, priority })}
            >
              {priority === 'critical' ? '緊急' : priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <Label>期限</Label>
        <Input
          type="datetime-local"
          value={proposal.deadline?.slice(0, 16) || ''}
          onChange={(e) => onChange({ ...proposal, deadline: new Date(e.target.value).toISOString() })}
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button onClick={onSave}>保存</Button>
        <Button variant="outline" onClick={onCancel} className="bg-transparent">
          キャンセル
        </Button>
      </div>
    </div>
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [operationMode, setOperationMode] = useState<OperationMode>('sales');

  // Subscribe to state updates via event bus
  const { lastUpdateTime: busUpdateTime } = useStateSubscription([
    'sales', 'labor', 'prep', 'delivery', 'decision', 'cockpit-sales', 'cockpit-labor', 'cockpit-operations'
  ]);

  // All hooks must be called before any early returns
  const eventsLength = state.events.length;
  const selectedStoreId = state.selectedStoreId;
  const lastRefreshKey = useRef('');
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const metrics = selectCockpitMetrics(state, undefined, timeBand);
  const laborMetrics = selectLaborMetrics(state);
  const prepMetrics = selectPrepMetrics(state);
  const exceptions = selectExceptions(state);
  const laneEvents = selectLaneEvents(state, 5, timeBand);
  const shiftSummary = selectShiftSummary(state);
  const supplyDemandMetrics = selectSupplyDemandMetrics(state, undefined, timeBand);

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
  
  // Supply/Demand (dynamic)
  const stockoutRisk = supplyDemandMetrics?.stockoutRiskCount ?? 0;
  const excessRisk = supplyDemandMetrics?.excessRiskCount ?? 0;
  const topRiskItems = supplyDemandMetrics?.topRiskItems ?? [];
  const supplyDemandStatus = supplyDemandMetrics?.status ?? 'normal';
  
  // Operations
  const delayedCount = prepMetrics?.plannedCount ?? 0;
  const completionRate = prepMetrics?.completionRate ?? 0;
  const bottleneck = delayedCount > 0 ? { task: '仕込み', reason: `${delayedCount}件未着手` } : null;
  
  // Exceptions
  const criticalCount = exceptions.filter((e: ExceptionItem) => e.severity === 'critical').length;
  const warningCount = exceptions.filter((e: ExceptionItem) => e.severity === 'warning').length;
  const topException = exceptions[0] ?? null;
  
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

  // Refresh proposals when events change
  useEffect(() => {
    const key = `${selectedStoreId}-${eventsLength}`;
    if (selectedStoreId && lastRefreshKey.current !== key) {
      lastRefreshKey.current = key;
      actionsRef.current.refreshProposals();
    }
  }, [eventsLength, selectedStoreId]);

  const handleApprove = (proposal: Proposal) => {
    actions.approveProposal(proposal);
  };

  const handleReject = (proposal: Proposal) => {
    actions.rejectProposal(proposal);
  };

  const handleEdit = (proposal: Proposal) => {
    setEditingProposal({ ...proposal });
    setDrawerOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingProposal) {
      actions.updateProposal(editingProposal);
      setDrawerOpen(false);
      setEditingProposal(null);
    }
  };
  
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

      {/* KPI Cards - Decision Focused */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

        {/* Labor Card - Cost Focused with Guardrail */}
        <MetricCard
          title={t('cockpit.labor')}
          value={formatCurrency(laborCost, locale)}
          subValue={`${t('cockpit.laborRate')} ${formatPercent(laborRate, locale)}`}
          icon={<DollarSign className="h-4 w-4" />}
          status={guardrailSummary.status === 'danger' ? 'error' : guardrailSummary.status === 'caution' ? 'warning' : 'success'}
          lastUpdate={lastUpdateTime}
        >
          <div className="space-y-2 text-xs">
            {/* Guardrail Summary */}
            <div className="bg-muted/50 rounded-md p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span>{t('cockpit.guardrail')}</span>
                <Badge variant="outline" className="text-[9px] px-1">
                  {dayType === 'weekend' ? t('cockpit.weekend') : t('cockpit.weekday')}
                </Badge>
              </div>
              {/* Good scenario */}
              <div className="flex justify-between items-center">
                <span className="text-green-600">{t('cockpit.goodScenario')}</span>
                <span className="text-green-600 font-medium">
                  {formatCurrency(guardrailSummary.goodRateSales, locale)} @ {formatPercent(guardrailSummary.selectedBracket.goodRate * 100, locale)}
                </span>
              </div>
              {/* Bad scenario */}
              <div className="flex justify-between items-center">
                <span className="text-red-600">{t('cockpit.badScenario')}</span>
                <span className="text-red-600 font-medium">
                  {formatCurrency(guardrailSummary.badRateSales, locale)} @ {formatPercent(guardrailSummary.selectedBracket.badRate * 100, locale)}
                </span>
              </div>
              {/* Current projection */}
              <div className="flex justify-between items-center border-t border-muted pt-1.5">
                <span className="font-medium">{t('cockpit.currentProjection')}</span>
                <span className={cn(
                  'font-medium',
                  guardrailSummary.status === 'danger' ? 'text-red-600' : 
                  guardrailSummary.status === 'caution' ? 'text-yellow-600' : 'text-green-600'
                )}>
                  {formatCurrency(runRateSalesDaily, locale)} @ {formatPercent(guardrailSummary.projectedLaborRateEOD * 100, locale)}
                </span>
              </div>
              {/* Delta to good */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('cockpit.deltaToGood')}</span>
                <span className={cn(
                  'font-medium',
                  guardrailSummary.deltaToGood > 0 ? 'text-red-600' : 'text-green-600'
                )}>
                  {guardrailSummary.deltaToGood > 0 ? '+' : ''}{(guardrailSummary.deltaToGood * 100).toFixed(1)}pt
                </span>
              </div>
            </div>
            
            {/* Hours and break info */}
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>{t('shift.hours')}</span>
                <span className={cn('font-medium', actualHours > plannedHours && 'text-red-600')}>
                  {formatHours(actualHours, locale)} / {formatHours(plannedHours, locale, 0)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Coffee className="h-3 w-3" />
                <span>{t('cockpit.onBreak')} {breakCount}</span>
              </div>
            </div>
          </div>
        </MetricCard>

        {/* Supply/Demand Card - Enhanced */}
        <MetricCard
          title={t('cockpit.supplyDemand')}
          value={
            supplyDemandStatus === 'danger' ? t('cockpit.danger') :
            supplyDemandStatus === 'caution' ? t('cockpit.caution') : t('cockpit.normal')
          }
          subValue={
            stockoutRisk > 0 || excessRisk > 0 
              ? `${t('cockpit.stockoutRisk')} ${stockoutRisk} / ${t('cockpit.excessRisk')} ${excessRisk}`
              : undefined
          }
          icon={<Package className="h-4 w-4" />}
          status={
            supplyDemandStatus === 'danger' ? 'error' :
            supplyDemandStatus === 'caution' ? 'warning' : 'success'
          }
          lastUpdate={supplyDemandMetrics?.lastUpdate ?? lastUpdateTime}
        >
          {topRiskItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {topRiskItems.map((item: RiskItem, i: number) => (
                <div key={i} className="text-[10px] flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[9px] px-1 shrink-0',
                        item.riskType === 'stockout' ? 'border-red-200 text-red-700 bg-red-50' : 'border-yellow-200 text-yellow-700 bg-yellow-50'
                      )}
                    >
                      {item.riskType === 'stockout' ? t('cockpit.stockoutRisk') : t('cockpit.excessRisk')}
                    </Badge>
                    <span className="font-medium truncate">{item.itemName}</span>
                  </div>
                  <span className="text-muted-foreground pl-1 truncate">→ {item.recommendedAction}</span>
                </div>
              ))}
            </div>
          )}
        </MetricCard>

        {/* Operations Card */}
        <MetricCard
          title={t('cockpit.operations')}
          value={`${t('cockpit.prepCompleted')} ${completionRate.toFixed(0)}%`}
          subValue={delayedCount > 0 ? `${t('todo.pending')} ${delayedCount}` : t('cockpit.normal')}
          icon={<Clock className="h-4 w-4" />}
          status={completionRate >= 80 ? 'success' : completionRate >= 50 ? 'warning' : 'error'}
          lastUpdate={lastUpdateTime}
        >
          {bottleneck && (
            <div className="text-xs text-red-600">
              ボトルネック: {bottleneck.task} ({bottleneck.reason})
            </div>
          )}
        </MetricCard>

        {/* Exceptions Card */}
        <MetricCard
          title={t('cockpit.exceptions')}
          value={criticalCount > 0 ? `${t('cockpit.danger')} ${criticalCount}` : warningCount > 0 ? `${t('cockpit.caution')} ${warningCount}` : t('cockpit.normal')}
          subValue={criticalCount > 0 && warningCount > 0 ? `+ ${t('cockpit.caution')} ${warningCount}` : undefined}
          icon={<AlertTriangle className="h-4 w-4" />}
          status={criticalCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'}
          lastUpdate={lastUpdateTime}
        >
          {topException && (
            <div className="text-xs text-muted-foreground truncate">
              {topException.title}
            </div>
          )}
        </MetricCard>
      </div>

      {/* Shift Summary (Dynamic) + Lane Timeline */}
      <div className="grid gap-6 lg:grid-cols-4">
        <DynamicShiftSummary />
        <div className="lg:col-span-3">
          <LaneTimeline laneEvents={laneEvents} maxPerLane={5} />
        </div>
      </div>

      {/* Decision Queue */}
      <DecisionQueue
        proposals={state.proposals}
        roles={state.roles}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={handleEdit}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="提案を編集"
      >
        {editingProposal && (
          <ProposalEditor
            proposal={editingProposal}
            roles={state.roles}
            onChange={setEditingProposal}
            onSave={handleSaveEdit}
            onCancel={() => setDrawerOpen(false)}
          />
        )}
      </Drawer>
    </div>
  );
}
