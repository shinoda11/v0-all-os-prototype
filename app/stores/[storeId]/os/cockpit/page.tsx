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
} from '@/core/selectors';
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
  const recentEvents = selectRecentEvents(state, 20);

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

      <ReplayControls />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="売上"
          value={`¥${metrics.sales.actualSales.toLocaleString()}`}
          subValue={`予測: ¥${metrics.sales.forecastSales.toLocaleString()}`}
          trend={metrics.sales.achievementRate >= 100 ? 'up' : 'down'}
          trendValue={`${Math.round(metrics.sales.achievementRate)}%`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="稼働人数"
          value={`${metrics.labor.activeStaffCount}名`}
          subValue={`休憩中: ${metrics.labor.onBreakCount}名`}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="仕込み進捗"
          value={`${Math.round(metrics.prep.completionRate)}%`}
          subValue={`${metrics.prep.completedCount}/${metrics.prep.plannedCount + metrics.prep.inProgressCount + metrics.prep.completedCount}件完了`}
          trend={metrics.prep.completionRate >= 80 ? 'up' : 'down'}
          icon={<Package className="h-4 w-4" />}
        />
        <MetricCard
          title="例外"
          value={`${metrics.exceptions.length}件`}
          subValue={metrics.exceptions.filter((e) => e.severity === 'critical').length > 0 ? '要対応あり' : '正常'}
          trend={metrics.exceptions.length > 0 ? 'down' : 'up'}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Timeline events={recentEvents} />
        </div>
        <div>
          <DecisionQueue
            proposals={state.proposals}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
          />
        </div>
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
