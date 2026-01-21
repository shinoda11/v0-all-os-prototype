'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { MetricCard } from '@/components/MetricCard';
import { LaneTimeline } from '@/components/Timeline';
import { DecisionQueue } from '@/components/DecisionQueue';
import { Drawer } from '@/components/Drawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/state/store';
import {
  selectCockpitMetrics,
  selectCurrentStore,
  selectExceptions,
  selectPrepMetrics,
  selectLaborMetrics,
  selectLaneEvents,
} from '@/core/selectors';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock shift plan data for prototype
const MOCK_SHIFT_SUMMARY = {
  plannedHours: 48,
  skillMix: { star3: 2, star2: 3, star1: 2 },
  roleComposition: { kitchen: 4, hall: 3 },
};

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

// Shift Summary Component (Read-only)
function ShiftSummary() {
  const summary = MOCK_SHIFT_SUMMARY;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          本日のシフト概要
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">予定人時</span>
          <span className="font-medium">{summary.plannedHours}h</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">スキルミックス</span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {summary.skillMix.star3}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {summary.skillMix.star2}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {summary.skillMix.star1}
            </Badge>
          </div>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">役割構成</span>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">厨房 {summary.roleComposition.kitchen}</Badge>
            <Badge variant="secondary" className="text-xs">ホール {summary.roleComposition.hall}</Badge>
          </div>
        </div>
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

export default function CockpitPage() {
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const [timeBand, setTimeBand] = useState<TimeBand>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

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

  // Calculate enhanced metrics
  const now = new Date();
  const lastUpdateTime = now.toISOString();
  
  // Sales calculations
  const salesActual = metrics?.sales?.actual ?? 0;
  const salesForecast = metrics?.sales?.forecast ?? 0;
  const salesDiff = salesActual - salesForecast;
  const salesAchievementRate = metrics?.sales?.achievementRate ?? 0;
  
  // Landing estimate (simplified projection)
  const currentHour = now.getHours();
  const remainingRatio = currentHour < 14 ? 0.6 : currentHour < 17 ? 0.3 : currentHour < 20 ? 0.15 : 0.05;
  const landingMin = Math.round(salesActual + (salesForecast * remainingRatio * 0.85));
  const landingMax = Math.round(salesActual + (salesForecast * remainingRatio * 1.15));
  
  // Labor calculations
  const laborCost = laborMetrics?.laborCostEstimate ?? 0;
  const laborRate = salesActual > 0 ? (laborCost / salesActual) * 100 : 0;
  const salesPerLabor = laborCost > 0 ? salesActual / laborCost : 0;
  const plannedHours = MOCK_SHIFT_SUMMARY.plannedHours;
  const actualHours = laborMetrics?.totalHoursToday ?? 0;
  const breakCount = laborMetrics?.onBreakCount ?? 0;
  
  // Supply/Demand (from prep metrics)
  const stockoutRisk = prepMetrics?.plannedCount ?? 0; // Items not started
  const excessRisk = 0; // Placeholder
  const topRiskItems = stockoutRisk > 0 
    ? [{ name: '仕込み未着手あり', risk: 'stockout' as const }]
    : [];
  
  // Operations
  const delayedCount = prepMetrics?.plannedCount ?? 0;
  const completionRate = prepMetrics?.completionRate ?? 0;
  const bottleneck = delayedCount > 0 ? { task: '仕込み', reason: `${delayedCount}件未着手` } : null;
  
  // Exceptions
  const criticalCount = exceptions.filter((e: ExceptionItem) => e.severity === 'critical').length;
  const warningCount = exceptions.filter((e: ExceptionItem) => e.severity === 'warning').length;
  const topException = exceptions[0] ?? null;

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

  // Now we can have early returns after all hooks
  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="運用コックピット" subtitle={shortName} />
        <TimeBandTabs value={timeBand} onChange={setTimeBand} />
      </div>

      {/* ReplayControls - dev only */}
      {process.env.NODE_ENV === 'development' && <ReplayControls />}

      {/* KPI Cards - Decision Focused */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Sales Card */}
        <MetricCard
          title="売上"
          value={`¥${salesActual.toLocaleString()}`}
          subValue={`予測 ¥${salesForecast.toLocaleString()}`}
          trend={salesDiff >= 0 ? 'up' : 'down'}
          trendValue={`${salesDiff >= 0 ? '+' : ''}¥${salesDiff.toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4" />}
          status={salesAchievementRate >= 100 ? 'success' : salesAchievementRate >= 80 ? 'default' : 'warning'}
          lastUpdate={lastUpdateTime}
        >
          <div className="text-xs text-muted-foreground">
            着地見込: ¥{landingMin.toLocaleString()} 〜 ¥{landingMax.toLocaleString()}
          </div>
        </MetricCard>

        {/* Labor Card - Cost Focused */}
        <MetricCard
          title="レーバー"
          value={`¥${laborCost.toLocaleString()}`}
          subValue={`人件費率 ${laborRate.toFixed(1)}%`}
          icon={<DollarSign className="h-4 w-4" />}
          status={laborRate <= 25 ? 'success' : laborRate <= 30 ? 'default' : 'warning'}
          lastUpdate={lastUpdateTime}
        >
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>売上/人件費</span>
              <span className="font-medium">{salesPerLabor.toFixed(1)}倍</span>
            </div>
            <div className="flex justify-between">
              <span>人時</span>
              <span className={cn('font-medium', actualHours > plannedHours && 'text-red-600')}>
                {actualHours.toFixed(1)}h / {plannedHours}h
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              <span>休憩中 {breakCount}名</span>
            </div>
          </div>
        </MetricCard>

        {/* Supply/Demand Card */}
        <MetricCard
          title="需給"
          value={stockoutRisk > 0 ? `欠品リスク ${stockoutRisk}` : '正常'}
          subValue={excessRisk > 0 ? `過剰リスク ${excessRisk}` : undefined}
          icon={<Package className="h-4 w-4" />}
          status={stockoutRisk > 0 ? 'warning' : 'success'}
          lastUpdate={lastUpdateTime}
        >
          {topRiskItems.length > 0 && (
            <div className="space-y-1">
              {topRiskItems.slice(0, 3).map((item, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className={cn(
                    'text-[10px]',
                    item.risk === 'stockout' ? 'border-red-200 text-red-700' : 'border-yellow-200 text-yellow-700'
                  )}
                >
                  {item.name}
                </Badge>
              ))}
            </div>
          )}
        </MetricCard>

        {/* Operations Card */}
        <MetricCard
          title="オペ"
          value={`完了率 ${completionRate.toFixed(0)}%`}
          subValue={delayedCount > 0 ? `遅延 ${delayedCount}件` : '順調'}
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
          title="例外"
          value={criticalCount > 0 ? `緊急 ${criticalCount}` : warningCount > 0 ? `警告 ${warningCount}` : '正常'}
          subValue={criticalCount > 0 && warningCount > 0 ? `+ 警告 ${warningCount}` : undefined}
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

      {/* Shift Summary + Lane Timeline */}
      <div className="grid gap-6 lg:grid-cols-4">
        <ShiftSummary />
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
