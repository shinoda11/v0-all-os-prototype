'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { MetricCard } from '@/components/MetricCard';
import { Timeline } from '@/components/Timeline';
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
  selectRecentEvents,
  selectCurrentStore,
  selectIsHighlighted,
} from '@/core/selectors';
import { getEventCountsByType } from '@/data/mock';
import type { TimeBand, Proposal, Role } from '@/core/types';
import {
  TrendingUp,
  Users,
  Package,
  Gauge,
  AlertTriangle,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function DebugInfo({ storeId }: { storeId: string }) {
  const { state } = useStore();
  const eventCounts = getEventCountsByType(state.events, storeId);

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-amber-700">Debug Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="font-medium text-amber-700">storeId:</span>{' '}
            <span className="font-mono">{storeId}</span>
          </div>
          <div>
            <span className="font-medium text-amber-700">total events:</span>{' '}
            <span className="font-mono">{state.events.length}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-amber-700">by type:</span>
            {Object.entries(eventCounts).map(([type, count]) => (
              <span key={type} className="font-mono">
                {type}={count}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReplayControls() {
  const { state, actions } = useStore();
  const { replay } = state;
  const isReplayActive = replay.pendingEvents.length > 0;
  const replayProgress = isReplayActive
    ? Math.round((replay.currentIndex / replay.pendingEvents.length) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">リプレイ制御</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => actions.startReplay()}
              disabled={isReplayActive}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              読込
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => actions.stepReplay()}
              disabled={!isReplayActive || replay.currentIndex >= replay.pendingEvents.length}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Step
            </Button>
            {replay.isPlaying ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => actions.pauseReplay()}
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
          onChange={(e) => onChange({ ...proposal, quantity: parseInt(e.target.value) || 0 })}
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
        <Button variant="outline" onClick={onCancel}>
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
  const recentEvents = selectRecentEvents(state, 15);
  const salesHighlighted = selectIsHighlighted(state, 'cockpit-sales');
  const laborHighlighted = selectIsHighlighted(state, 'cockpit-labor');
  const operationsHighlighted = selectIsHighlighted(state, 'cockpit-operations');
  const exceptionsHighlighted = selectIsHighlighted(state, 'cockpit-exceptions');

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
      <PageHeader
        title="運用コックピット"
        subtitle={shortName}
        actions={<TimeBandTabs value={timeBand} onChange={setTimeBand} />}
      />

      <DebugInfo storeId={currentStore.id} />

      <ReplayControls />

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard
          title="売上"
          value={`¥${metrics.sales.actual.toLocaleString()}`}
          subValue={`予測: ¥${metrics.sales.forecast.toLocaleString()}`}
          trend={metrics.sales.trend}
          trendValue={`${Math.round(metrics.sales.achievementRate)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          highlighted={salesHighlighted}
          status={
            metrics.sales.achievementRate >= 100
              ? 'success'
              : metrics.sales.achievementRate >= 80
              ? 'warning'
              : 'error'
          }
        />
        <MetricCard
          title="レーバー"
          value={`${metrics.labor.activeStaffCount}名`}
          subValue={`休憩中: ${metrics.labor.onBreakCount}名`}
          icon={<Users className="h-5 w-5" />}
          highlighted={laborHighlighted}
          status={metrics.labor.activeStaffCount >= 3 ? 'success' : 'warning'}
        />
        <MetricCard
          title="需給"
          value={metrics.supplyDemand.status === 'balanced' ? 'バランス' : 
                 metrics.supplyDemand.status === 'oversupply' ? '供給過多' : '需要過多'}
          subValue={`スコア: ${metrics.supplyDemand.score}`}
          icon={<Package className="h-5 w-5" />}
          status={metrics.supplyDemand.status === 'balanced' ? 'success' : 'warning'}
        />
        <MetricCard
          title="オペ進捗"
          value={`${Math.round(metrics.operations.completionRate)}%`}
          subValue={`完了: ${metrics.operations.completedCount}/${
            metrics.operations.plannedCount + metrics.operations.inProgressCount + metrics.operations.completedCount
          }`}
          icon={<Gauge className="h-5 w-5" />}
          highlighted={operationsHighlighted}
          status={
            metrics.operations.completionRate >= 80
              ? 'success'
              : metrics.operations.completionRate >= 50
              ? 'warning'
              : 'error'
          }
        />
        <MetricCard
          title="例外"
          value={metrics.exceptions.count.toString()}
          subValue={
            metrics.exceptions.criticalCount > 0
              ? `緊急: ${metrics.exceptions.criticalCount}`
              : 'なし'
          }
          icon={<AlertTriangle className="h-5 w-5" />}
          highlighted={exceptionsHighlighted}
          status={
            metrics.exceptions.count === 0
              ? 'success'
              : metrics.exceptions.criticalCount > 0
              ? 'error'
              : 'warning'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>統合タイムライン</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline events={recentEvents} maxItems={10} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>意思決定キュー</CardTitle>
              <Badge variant="secondary">{state.proposals.length}件</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DecisionQueue
              proposals={state.proposals}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
            />
          </CardContent>
        </Card>
      </div>

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
