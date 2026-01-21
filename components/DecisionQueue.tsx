'use client';

import React from 'react';
import type { Proposal, Role, ExpectedEffect, TimeBand } from '@/core/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';
import {
  Check,
  X,
  Edit2,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Users,
  Target,
  TrendingUp,
  ShieldAlert,
  Trash2,
  Wrench,
  ListTodo,
} from 'lucide-react';

interface DecisionQueueProps {
  proposals: Proposal[];
  roles: Role[];
  onApprove: (proposal: Proposal) => void;
  onReject: (proposal: Proposal) => void;
  onEdit: (proposal: Proposal) => void;
}

const priorityConfig: Record<
  Proposal['priority'],
  { labelKey: string; color: string; icon: React.ReactNode }
> = {
  critical: {
    labelKey: 'cockpit.danger',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  high: {
    labelKey: 'todo.high',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  medium: {
    labelKey: 'todo.medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Info className="h-4 w-4" />,
  },
  low: {
    labelKey: 'todo.low',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <Info className="h-4 w-4" />,
  },
};

const effectConfig: Record<ExpectedEffect, { labelKey: string; icon: React.ReactNode; color: string }> = {
  'sales-impact': {
    labelKey: 'effect.salesImpact',
    icon: <TrendingUp className="h-3 w-3" />,
    color: 'bg-green-100 text-green-700',
  },
  'stockout-avoidance': {
    labelKey: 'effect.stockoutAvoidance',
    icon: <ShieldAlert className="h-3 w-3" />,
    color: 'bg-blue-100 text-blue-700',
  },
  'waste-reduction': {
    labelKey: 'effect.wasteReduction',
    icon: <Trash2 className="h-3 w-3" />,
    color: 'bg-amber-100 text-amber-700',
  },
  'labor-savings': {
    labelKey: 'effect.laborSavings',
    icon: <Wrench className="h-3 w-3" />,
    color: 'bg-purple-100 text-purple-700',
  },
};

const timeBandLabelKeys: Record<TimeBand, string> = {
  all: 'timeband.all',
  lunch: 'timeband.lunch',
  idle: 'timeband.idle',
  dinner: 'timeband.dinner',
};

const timeBandLabels = timeBandLabelKeys;

function formatDeadline(deadline: string): string {
  try {
    const date = new Date(deadline);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins < 0) return '期限超過';
    if (diffMins < 60) return `あと${diffMins}分`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `あと${diffHours}時間`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  } catch {
    return '--';
  }
}

function getRoleNames(roleIds: string[], roles: Role[]): string {
  return roleIds
    .map((id) => roles.find((r) => r.id === id)?.name ?? id)
    .join('、');
}

export function DecisionQueue({
  proposals,
  roles,
  onApprove,
  onReject,
  onEdit,
}: DecisionQueueProps) {
  const { t } = useI18n();
  
  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{t('decision.noProposals')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => {
        const priority = priorityConfig[proposal.priority];
        const deadlineText = formatDeadline(proposal.deadline);
        const isOverdue = deadlineText === '期限超過';

        return (
          <Card
            key={proposal.id}
            className={cn(
              'transition-all hover:shadow-md',
              proposal.priority === 'critical' && 'border-red-300 bg-red-50/30',
              isOverdue && 'border-red-400'
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn('gap-1', priority.color)}
                    >
                      {priority.icon}
                      {t(priority.labelKey)}
                    </Badge>
                    <Badge variant="secondary">{proposal.type}</Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'gap-1',
                        isOverdue ? 'border-red-300 text-red-700' : 'border-gray-200'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {deadlineText}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{proposal.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reason */}
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">理由: </span>
                {proposal.reason}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">
                {proposal.description}
              </p>

              {/* Expected Effects */}
              <div className="flex flex-wrap gap-1.5">
                {(proposal.expectedEffects ?? []).map((effect) => {
                  const config = effectConfig[effect];
                  return (
                    <Badge
                      key={effect}
                      variant="secondary"
                      className={cn('gap-1 text-xs', config.color)}
                    >
                      {config.icon}
                      {t(config.labelKey)}
                    </Badge>
                  );
                })}
              </div>

              {/* Impact Scope */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{t('timeband.' + proposal.timeBand)}</span>
                </div>
                {proposal.targetMenuIds.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>対象メニュー: {proposal.targetMenuIds.length}品</span>
                  </div>
                )}
                {proposal.targetPrepItemIds.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>対象仕込み: {proposal.targetPrepItemIds.length}品</span>
                  </div>
                )}
                {proposal.quantity > 0 && (
                  <div className="flex items-center gap-1">
                    <span>数量: {proposal.quantity}</span>
                  </div>
                )}
              </div>

              {/* Todo Distribution Info */}
              <div className="flex items-center gap-4 p-2 bg-muted/50 rounded-md text-sm">
                <div className="flex items-center gap-1.5">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{proposal.todoCount ?? 1}件</span>
                  <span className="text-muted-foreground">のToDoを配布</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">配布先:</span>
                  <span className="font-medium">
                    {getRoleNames(proposal.distributedToRoles, roles) || '未設定'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  onClick={() => onApprove(proposal)}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  {t('decision.approve')} ({proposal.todoCount ?? 1})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(proposal)}
                  className="gap-1 bg-transparent"
                >
                  <X className="h-4 w-4" />
                  {t('decision.reject')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(proposal)}
                  className="gap-1"
                >
                  <Edit2 className="h-4 w-4" />
                  {t('common.edit')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
