'use client';

import React from "react"

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { OSHeader } from '@/components/OSHeader';
import { MetricCard } from '@/components/MetricCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/state/store';
import { selectExceptions, selectCurrentStore } from '@/core/selectors';
import type { ExceptionItem, ExceptionStatus, ImpactType, ProposalType, Role, TimeBand } from '@/core/types';
import {
  AlertTriangle,
  AlertCircle,
  Truck,
  Users,
  TrendingUp,
  ChefHat,
  FileText,
  Clock,
  Package,
  Zap,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Exception type configuration
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
const IMPACT_TYPE_LABELS: Record<ImpactType, { label: string; icon: React.ReactNode }> = {
  stockout: { label: '欠品', icon: <Package className="h-4 w-4" /> },
  delay: { label: '遅延', icon: <Clock className="h-4 w-4" /> },
  excess: { label: '過剰', icon: <TrendingUp className="h-4 w-4" /> },
  quality: { label: '品質', icon: <AlertTriangle className="h-4 w-4" /> },
};

// Status labels and colors
const STATUS_CONFIG: Record<ExceptionStatus, { label: string; color: string }> = {
  unhandled: { label: '未対応', color: 'bg-red-100 text-red-800 border-red-200' },
  'proposal-created': { label: '提案済み', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ongoing: { label: '対応中', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  resolved: { label: '解消', color: 'bg-green-100 text-green-800 border-green-200' },
};

// Proposal type options
const PROPOSAL_TYPES: Array<{ value: ProposalType; label: string; description: string }> = [
  { value: 'menu-restriction', label: 'メニュー制限', description: '特定メニューの販売を一時停止' },
  { value: 'prep-reorder', label: '仕込み順序変更', description: '仕込み作業の優先順位を変更' },
  { value: 'extra-prep', label: '仕込み量調整', description: '仕込み量を増減' },
  { value: 'help-request', label: '休憩調整', description: 'スタッフの休憩タイミングを調整' },
  { value: 'scope-reduction', label: '配置ローテ', description: 'スタッフの配置を変更' },
];

// Expected effects options
const EXPECTED_EFFECTS = [
  { id: 'prevent-stockout', label: '欠品防止' },
  { id: 'improve-efficiency', label: '効率改善' },
  { id: 'reduce-waste', label: '廃棄削減' },
  { id: 'improve-quality', label: '品質向上' },
  { id: 'cost-reduction', label: 'コスト削減' },
];

// TimeBand labels
const TIME_BAND_LABELS: Record<TimeBand, string> = {
  all: '終日',
  lunch: 'ランチ',
  idle: 'アイドル',
  dinner: 'ディナー',
};

interface ProposalDraft {
  exceptionId: string;
  proposalType: ProposalType | '';
  reason: string;
  expectedEffects: string[];
  targetRoles: string[];
  deadline: string;
}

export default function ExceptionsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const exceptions = selectExceptions(state);

  const [selectedException, setSelectedException] = useState<ExceptionItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [proposalDraft, setProposalDraft] = useState<ProposalDraft>({
    exceptionId: '',
    proposalType: '',
    reason: '',
    expectedEffects: [],
    targetRoles: [],
    deadline: '',
  });

  // Exception counts by status
  const statusCounts = {
    unhandled: exceptions.filter((e) => e.status === 'unhandled').length,
    proposalCreated: exceptions.filter((e) => e.status === 'proposal-created').length,
    inProgress: exceptions.filter((e) => e.status === 'ongoing').length,
    resolved: exceptions.filter((e) => e.status === 'resolved').length,
  };

  const criticalCount = exceptions.filter((e) => e.severity === 'critical').length;
  const warningCount = exceptions.filter((e) => e.severity === 'warning').length;

  const handleCreateProposalDraft = (exception: ExceptionItem) => {
    // Prevent duplicate creation
    if (exception.status !== 'unhandled') {
      return;
    }

    // Auto-generate reason based on exception type
    const autoReason = generateAutoReason(exception);
    
    // Auto-set deadline (2 hours from now)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 2);
    const deadlineStr = deadline.toISOString().slice(0, 16);

    setSelectedException(exception);
    setProposalDraft({
      exceptionId: exception.id,
      proposalType: suggestProposalType(exception),
      reason: autoReason,
      expectedEffects: suggestExpectedEffects(exception),
      targetRoles: suggestTargetRoles(exception, state.roles),
      deadline: deadlineStr,
    });
    setIsSheetOpen(true);
  };

  const handleSubmitProposal = () => {
    if (!selectedException || !proposalDraft.proposalType) return;

    // Create proposal and add to decision queue
    const proposal = {
      id: `prop-${Date.now()}`,
      type: proposalDraft.proposalType as ProposalType,
      title: `${EXCEPTION_CONFIG[selectedException.type].label}への対応`,
      description: proposalDraft.reason,
      reason: proposalDraft.reason,
      triggeredBy: selectedException.id,
      priority: selectedException.severity === 'critical' ? 'high' as const : 'medium' as const,
      createdAt: new Date().toISOString(),
      targetMenuIds: [],
      targetPrepItemIds: selectedException.impact.affectedItems
        .filter((i) => i.type === 'prep')
        .map((i) => i.id),
      quantity: 0,
      distributedToRoles: proposalDraft.targetRoles,
      deadline: proposalDraft.deadline,
      storeId,
      timeBand: selectedException.impact.timeBand,
    };

    // Add to proposals
    actions.setProposals([...state.proposals, proposal]);

    // Close sheet and reset
    setIsSheetOpen(false);
    setSelectedException(null);
    setProposalDraft({
      exceptionId: '',
      proposalType: '',
      reason: '',
      expectedEffects: [],
      targetRoles: [],
      deadline: '',
    });
  };

  if (!currentStore) {
    return null;
  }

  return (
    <div className="space-y-6">
      <OSHeader title="例外センター" showTimeBandTabs={false} />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="未対応"
          value={statusCounts.unhandled.toString()}
          icon={<AlertCircle className="h-5 w-5" />}
          status={statusCounts.unhandled === 0 ? 'success' : 'error'}
        />
        <MetricCard
          title="提案済み"
          value={statusCounts.proposalCreated.toString()}
          icon={<FileText className="h-5 w-5" />}
          status="normal"
        />
        <MetricCard
          title="対応中"
          value={statusCounts.inProgress.toString()}
          icon={<Clock className="h-5 w-5" />}
          status={statusCounts.inProgress > 0 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="解消済み"
          value={statusCounts.resolved.toString()}
          icon={<CheckCircle2 className="h-5 w-5" />}
          status="success"
        />
      </div>

      {/* Exception List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>例外一覧</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                緊急 {criticalCount}
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                警告 {warningCount}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8 text-green-600" />}
              title="例外なし"
              description="現在、対応が必要な例外はありません"
            />
          ) : (
            <div className="space-y-4">
              {exceptions.map((exception) => {
                const config = EXCEPTION_CONFIG[exception.type];
                const impactConfig = IMPACT_TYPE_LABELS[exception.impact.impactType];
                const statusConfig = STATUS_CONFIG[exception.status];
                const isUnhandled = exception.status === 'unhandled';

                return (
                  <div
                    key={exception.id}
                    className={cn(
                      'rounded-lg border p-4 transition-colors',
                      exception.severity === 'critical'
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-yellow-300 bg-yellow-50/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn('mt-0.5', config.color)}>
                        {config.icon}
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              exception.severity === 'critical'
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }
                          >
                            {exception.severity === 'critical' ? '緊急' : '警告'}
                          </Badge>
                          <Badge variant="secondary">{config.label}</Badge>
                        </div>

                        {/* Title and Description */}
                        <div>
                          <h4 className="font-semibold">{exception.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {exception.description}
                          </p>
                        </div>

                        {/* Impact Scope */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">影響帯:</span>
                            <span className="font-medium">
                              {TIME_BAND_LABELS[exception.impact.timeBand]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {impactConfig.icon}
                            <span className="text-muted-foreground">影響タイプ:</span>
                            <span className="font-medium">{impactConfig.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">影響度:</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                exception.impact.impactSeverity === 'high'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : exception.impact.impactSeverity === 'medium'
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              )}
                            >
                              {exception.impact.impactSeverity === 'high'
                                ? '高'
                                : exception.impact.impactSeverity === 'medium'
                                ? '中'
                                : '低'}
                            </Badge>
                          </div>
                          {exception.impact.affectedItems.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">影響品目:</span>
                              <span className="font-medium">
                                {exception.impact.affectedItems.map((i) => i.name).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Detection time */}
                        <p className="text-xs text-muted-foreground">
                          検出時刻: {new Date(exception.detectedAt).toLocaleString('ja-JP')}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div>
                        <Button
                          variant={isUnhandled ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleCreateProposalDraft(exception)}
                          disabled={!isUnhandled}
                          className="gap-1"
                        >
                          {isUnhandled ? (
                            <>
                              提案ドラフトを作成
                              <ArrowRight className="h-4 w-4" />
                            </>
                          ) : (
                            '作成済み'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal Draft Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>提案ドラフトを作成</SheetTitle>
            <SheetDescription>
              {selectedException && (
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className={EXCEPTION_CONFIG[selectedException.type].color}>
                    {EXCEPTION_CONFIG[selectedException.type].label}
                  </Badge>
                  {selectedException.title}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Proposal Type */}
            <div className="space-y-2">
              <Label>提案タイプ</Label>
              <Select
                value={proposalDraft.proposalType}
                onValueChange={(value) =>
                  setProposalDraft({ ...proposalDraft, proposalType: value as ProposalType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="提案タイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason (auto-generated) */}
            <div className="space-y-2">
              <Label>理由（自動生成）</Label>
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                {proposalDraft.reason}
              </div>
            </div>

            {/* Expected Effects */}
            <div className="space-y-2">
              <Label>期待効果（複数選択可）</Label>
              <div className="space-y-2">
                {EXPECTED_EFFECTS.map((effect) => (
                  <div key={effect.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={effect.id}
                      checked={proposalDraft.expectedEffects.includes(effect.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProposalDraft({
                            ...proposalDraft,
                            expectedEffects: [...proposalDraft.expectedEffects, effect.id],
                          });
                        } else {
                          setProposalDraft({
                            ...proposalDraft,
                            expectedEffects: proposalDraft.expectedEffects.filter(
                              (e) => e !== effect.id
                            ),
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={effect.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {effect.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Roles */}
            <div className="space-y-2">
              <Label>配布先ロール（複数選択可）</Label>
              <div className="space-y-2">
                {state.roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={proposalDraft.targetRoles.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProposalDraft({
                            ...proposalDraft,
                            targetRoles: [...proposalDraft.targetRoles, role.id],
                          });
                        } else {
                          setProposalDraft({
                            ...proposalDraft,
                            targetRoles: proposalDraft.targetRoles.filter(
                              (r) => r !== role.id
                            ),
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
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
                type="datetime-local"
                value={proposalDraft.deadline}
                onChange={(e) =>
                  setProposalDraft({ ...proposalDraft, deadline: e.target.value })
                }
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setIsSheetOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitProposal}
                disabled={!proposalDraft.proposalType}
              >
                意思決定キューへ追加
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Helper functions

function generateAutoReason(exception: ExceptionItem): string {
  switch (exception.type) {
    case 'delivery-delay':
      return `配送遅延により${exception.impact.affectedItems.map((i) => i.name).join('、')}の供給が不足する可能性があります。早急な対応が必要です。`;
    case 'staff-shortage':
      return `人員不足により、${TIME_BAND_LABELS[exception.impact.timeBand]}帯のオペレーションに支障が出る可能性があります。`;
    case 'prep-behind':
      return `仕込みの進捗が遅れており、${TIME_BAND_LABELS[exception.impact.timeBand]}帯の提供に影響する可能性があります。`;
    case 'demand-surge':
      return `予測を上回る需要により、在庫不足のリスクがあります。仕込み量の調整を検討してください。`;
    default:
      return '例外が検出されました。対応が必要です。';
  }
}

function suggestProposalType(exception: ExceptionItem): ProposalType {
  switch (exception.type) {
    case 'delivery-delay':
      return 'menu-restriction';
    case 'staff-shortage':
      return 'help-request';
    case 'prep-behind':
      return 'prep-reorder';
    case 'demand-surge':
      return 'extra-prep';
    default:
      return 'menu-restriction';
  }
}

function suggestExpectedEffects(exception: ExceptionItem): string[] {
  switch (exception.impact.impactType) {
    case 'stockout':
      return ['prevent-stockout'];
    case 'delay':
      return ['improve-efficiency'];
    case 'excess':
      return ['reduce-waste'];
    case 'quality':
      return ['improve-quality'];
    default:
      return [];
  }
}

function suggestTargetRoles(exception: ExceptionItem, roles: Role[]): string[] {
  // Default to kitchen and manager roles
  const defaultRoleCodes = ['kitchen', 'manager'];
  return roles
    .filter((r) => defaultRoleCodes.includes(r.code))
    .map((r) => r.id);
}
