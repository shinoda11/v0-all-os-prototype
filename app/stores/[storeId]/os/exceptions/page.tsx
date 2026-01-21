'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/state/store';
import { selectExceptions, selectCurrentStore } from '@/core/selectors';
import type { ExceptionItem, Proposal, ProposalType, ExpectedEffect, TimeBand, ImpactType } from '@/core/types';
import {
  AlertTriangle,
  AlertCircle,
  Truck,
  Users,
  TrendingUp,
  ChefHat,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  Send,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Exception type config
const EXCEPTION_CONFIG: Record<
  ExceptionItem['type'],
  { icon: React.ReactNode; color: string; label: string }
> = {
  'delivery-delay': {
    icon: <Truck className="h-5 w-5" />,
    color: 'text-purple-600',
    label: '配送遅延',
  },
  'staff-shortage': {
    icon: <Users className="h-5 w-5" />,
    color: 'text-blue-600',
    label: '人員不足',
  },
  'demand-surge': {
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'text-green-600',
    label: '需要急増',
  },
  'prep-behind': {
    icon: <ChefHat className="h-5 w-5" />,
    color: 'text-orange-600',
    label: '仕込み遅延',
  },
};

// Impact type labels
const IMPACT_TYPE_LABELS: Record<ImpactType, { label: string; color: string }> = {
  stockout: { label: '欠品', color: 'bg-red-100 text-red-800' },
  delay: { label: '遅延', color: 'bg-yellow-100 text-yellow-800' },
  excess: { label: '過剰', color: 'bg-blue-100 text-blue-800' },
  quality: { label: '品質', color: 'bg-purple-100 text-purple-800' },
};

// Impact severity labels
const IMPACT_SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: 'bg-red-100 text-red-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: '低', color: 'bg-green-100 text-green-800' },
};

// TimeBand labels
const TIME_BAND_LABELS: Record<TimeBand, string> = {
  all: '終日',
  lunch: 'ランチ',
  idle: 'アイドル',
  dinner: 'ディナー',
};

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unhandled: { label: '未対応', color: 'bg-red-100 text-red-800 border-red-200' },
  'proposal-created': { label: '提案済み', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ongoing: { label: '対応中', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  resolved: { label: '解消', color: 'bg-green-100 text-green-800 border-green-200' },
};

// Proposal type options
const PROPOSAL_TYPE_OPTIONS: Array<{ value: ProposalType; label: string }> = [
  { value: 'menu-restriction', label: 'メニュー制限' },
  { value: 'prep-reorder', label: '仕込み順序変更' },
  { value: 'extra-prep', label: '仕込み量変更' },
  { value: 'scope-reduction', label: '休憩調整' },
  { value: 'help-request', label: '配置ローテーション' },
];

// Expected effect options
const EFFECT_OPTIONS: Array<{ value: ExpectedEffect; label: string }> = [
  { value: 'sales-impact', label: '売上影響' },
  { value: 'stockout-avoidance', label: '欠品回避' },
  { value: 'waste-reduction', label: 'ロス削減' },
  { value: 'labor-savings', label: '工数削減' },
];

// Exception Card Component
interface ExceptionCardProps {
  exception: ExceptionItem;
  onCreateProposal: () => void;
  onResolve: () => void;
}

function ExceptionCard({ exception, onCreateProposal, onResolve }: ExceptionCardProps) {
  const config = EXCEPTION_CONFIG[exception.type];
  const isCritical = exception.severity === 'critical';
  const statusConfig = STATUS_CONFIG[exception.status];
  const impactTypeConfig = IMPACT_TYPE_LABELS[exception.impact.impactType];
  const impactSeverityConfig = IMPACT_SEVERITY_LABELS[exception.impact.impactSeverity];
  const hasProposal = exception.status === 'proposal-created' || exception.linkedProposalId;

  return (
    <Card className={cn('transition-all', isCritical && 'border-red-200 bg-red-50/30')}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5', config.color)}>{config.icon}</div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium">{exception.title}</h3>
                  <Badge variant={isCritical ? 'destructive' : 'secondary'} className="text-xs">
                    {isCritical ? '緊急' : '注意'}
                  </Badge>
                  <Badge className={cn('text-xs border', statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{exception.description}</p>
              </div>
            </div>
          </div>

          {/* Impact Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">影響範囲</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {TIME_BAND_LABELS[exception.impact.timeBand]}
              </Badge>
              <Badge className={cn('text-xs', impactTypeConfig.color)}>
                {impactTypeConfig.label}
              </Badge>
              <Badge className={cn('text-xs', impactSeverityConfig.color)}>
                影響度: {impactSeverityConfig.label}
              </Badge>
            </div>
            {exception.impact.affectedItems.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-muted-foreground">対象品目:</span>
                {exception.impact.affectedItems.map((item) => (
                  <Badge key={item.id} variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {item.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              検出: {new Date(exception.detectedAt).toLocaleTimeString('ja-JP')}
            </p>
            <div className="flex gap-2">
              {!hasProposal && exception.status === 'unhandled' && (
                <Button size="sm" variant="outline" onClick={onCreateProposal} className="gap-1 bg-transparent">
                  <FileText className="h-4 w-4" />
                  提案作成
                </Button>
              )}
              {exception.status !== 'resolved' && (
                <Button size="sm" variant="outline" onClick={onResolve} className="gap-1 bg-transparent">
                  <CheckCircle2 className="h-4 w-4" />
                  解消
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Proposal Draft Drawer Component
interface ProposalDraftDrawerProps {
  exception: ExceptionItem | null;
  roles: Array<{ id: string; name: string; code: string }>;
  open: boolean;
  onClose: () => void;
  onSubmit: (proposal: Proposal) => void;
}

function ProposalDraftDrawer({ exception, roles, open, onClose, onSubmit }: ProposalDraftDrawerProps) {
  const [proposalType, setProposalType] = useState<ProposalType>('menu-restriction');
  const [selectedEffects, setSelectedEffects] = useState<ExpectedEffect[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');

  // Reset form when exception changes
  React.useEffect(() => {
    if (exception) {
      // Auto-select proposal type based on exception type
      const typeMapping: Record<ExceptionItem['type'], ProposalType> = {
        'delivery-delay': 'menu-restriction',
        'staff-shortage': 'help-request',
        'demand-surge': 'extra-prep',
        'prep-behind': 'prep-reorder',
      };
      setProposalType(typeMapping[exception.type]);

      // Auto-select effects based on impact type
      const effectMapping: Record<ImpactType, ExpectedEffect[]> = {
        stockout: ['stockout-avoidance', 'sales-impact'],
        delay: ['stockout-avoidance', 'labor-savings'],
        excess: ['waste-reduction'],
        quality: ['waste-reduction', 'sales-impact'],
      };
      setSelectedEffects(effectMapping[exception.impact.impactType] || []);

      // Auto-select roles based on exception type
      const roleMapping: Record<ExceptionItem['type'], string[]> = {
        'delivery-delay': ['kitchen'],
        'staff-shortage': ['manager'],
        'demand-surge': ['kitchen', 'floor'],
        'prep-behind': ['kitchen'],
      };
      const defaultRoleCodes = roleMapping[exception.type] || [];
      const matchingRoleIds = roles
        .filter((r) => defaultRoleCodes.includes(r.code))
        .map((r) => r.id);
      setSelectedRoles(matchingRoleIds);

      // Auto-set deadline (1 hour from now)
      const deadlineDate = new Date();
      deadlineDate.setHours(deadlineDate.getHours() + 1);
      setDeadline(deadlineDate.toTimeString().slice(0, 5));
    }
  }, [exception, roles]);

  const handleEffectToggle = (effect: ExpectedEffect) => {
    setSelectedEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    );
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = () => {
    if (!exception) return;

    const now = new Date();
    const [hours, minutes] = deadline.split(':').map(Number);
    const deadlineDate = new Date();
    deadlineDate.setHours(hours, minutes, 0, 0);

    const proposal: Proposal = {
      id: `proposal-${Date.now()}`,
      type: proposalType,
      title: `${PROPOSAL_TYPE_OPTIONS.find((o) => o.value === proposalType)?.label}: ${exception.title}`,
      description: exception.description,
      reason: `${EXCEPTION_CONFIG[exception.type].label}への対応`,
      triggeredBy: exception.relatedEventId || exception.id,
      priority: exception.severity === 'critical' ? 'critical' : 'high',
      createdAt: now.toISOString(),
      targetMenuIds: exception.impact.affectedItems.filter((i) => i.type === 'menu').map((i) => i.id),
      targetPrepItemIds: exception.impact.affectedItems.filter((i) => i.type === 'prep').map((i) => i.id),
      quantity: 1,
      distributedToRoles: selectedRoles,
      deadline: deadlineDate.toISOString(),
      storeId: exception.id.split('-')[1] || '1',
      timeBand: exception.impact.timeBand,
      expectedEffects: selectedEffects,
      todoCount: selectedRoles.length || 1,
      status: 'pending',
    };

    onSubmit(proposal);
    onClose();
  };

  if (!exception) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            提案ドラフト作成
          </SheetTitle>
          <SheetDescription>
            例外「{exception.title}」に対する提案を作成します
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Proposal Type */}
          <div className="space-y-2">
            <Label>提案タイプ</Label>
            <Select value={proposalType} onValueChange={(v) => setProposalType(v as ProposalType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPOSAL_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason (Auto) */}
          <div className="space-y-2">
            <Label>理由（自動）</Label>
            <div className="p-3 bg-muted rounded-lg text-sm">
              {EXCEPTION_CONFIG[exception.type].label}への対応 - {exception.description}
            </div>
          </div>

          {/* Expected Effects */}
          <div className="space-y-2">
            <Label>期待効果</Label>
            <div className="grid grid-cols-2 gap-2">
              {EFFECT_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={selectedEffects.includes(option.value)}
                    onCheckedChange={() => handleEffectToggle(option.value)}
                  />
                  <label htmlFor={option.value} className="text-sm cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Target Roles */}
          <div className="space-y-2">
            <Label>配布先ロール</Label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={role.id}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <label htmlFor={role.id} className="text-sm cursor-pointer">
                    {role.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>期限</Label>
            <Input
              type="time"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">配布サマリー</div>
            <div className="text-sm">
              <span className="font-medium">{selectedRoles.length}</span> 件のToDoを配布
              <span className="text-muted-foreground ml-2">
                ({roles.filter((r) => selectedRoles.includes(r.id)).map((r) => r.name).join(', ') || 'なし'})
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={selectedRoles.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              キューへ送信
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Main Page Component
export default function ExceptionsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const exceptions = selectExceptions(state);

  const [selectedExceptionForProposal, setSelectedExceptionForProposal] = useState<ExceptionItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  // Count by status
  const statusCounts = {
    unhandled: exceptions.filter((e) => e.status === 'unhandled').length,
    proposalCreated: exceptions.filter((e) => e.status === 'proposal-created').length,
    ongoing: exceptions.filter((e) => e.status === 'ongoing').length,
    resolved: exceptions.filter((e) => e.status === 'resolved').length,
  };

  const criticalCount = exceptions.filter((e) => e.severity === 'critical' && e.status !== 'resolved').length;
  const warningCount = exceptions.filter((e) => e.severity === 'warning' && e.status !== 'resolved').length;

  const handleCreateProposal = (exception: ExceptionItem) => {
    setSelectedExceptionForProposal(exception);
    setDrawerOpen(true);
  };

  const handleSubmitProposal = (proposal: Proposal) => {
    actions.addProposal(proposal);
    // In a real app, would also update exception status to 'proposal-created'
  };

  const handleResolve = (id: string) => {
    // In real app, would update exception status
    console.log('Resolve exception:', id);
  };

  // Active exceptions (not resolved)
  const activeExceptions = exceptions.filter((e) => e.status !== 'resolved');

  return (
    <div className="space-y-6">
      <PageHeader title="例外センター" subtitle={shortName} />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard
          title="未対応"
          value={`${statusCounts.unhandled}件`}
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          status={statusCounts.unhandled > 0 ? 'error' : 'default'}
        />
        <MetricCard
          title="提案済み"
          value={`${statusCounts.proposalCreated}件`}
          icon={<FileText className="h-4 w-4 text-blue-600" />}
        />
        <MetricCard
          title="対応中"
          value={`${statusCounts.ongoing}件`}
          icon={<Clock className="h-4 w-4 text-yellow-600" />}
        />
        <MetricCard
          title="緊急 / 注意"
          value={`${criticalCount} / ${warningCount}`}
          icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
          status={criticalCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Exception list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>例外一覧</span>
            <Badge variant="outline">{activeExceptions.length}件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeExceptions.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8 text-green-500" />}
              title="例外なし"
              description="現在対応が必要な例外はありません"
            />
          ) : (
            <div className="space-y-4">
              {activeExceptions.map((exception) => (
                <ExceptionCard
                  key={exception.id}
                  exception={exception}
                  onCreateProposal={() => handleCreateProposal(exception)}
                  onResolve={() => handleResolve(exception.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal Draft Drawer */}
      <ProposalDraftDrawer
        exception={selectedExceptionForProposal}
        roles={state.roles}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedExceptionForProposal(null);
        }}
        onSubmit={handleSubmitProposal}
      />
    </div>
  );
}
