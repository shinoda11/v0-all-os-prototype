'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatsGrid } from '@/components/StatsGrid';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/state/store';
import { selectActiveTodos, selectCompletedTodos, selectCurrentStore, selectTodoStats } from '@/core/selectors';
import { proposalFromDecision } from '@/core/commands';
import type { DecisionEvent, Proposal } from '@/core/types';
import {
  CheckCircle,
  Play,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_CONFIG: Record<Proposal['priority'], { label: string; color: string }> = {
  critical: { label: '緊急', color: 'bg-red-100 text-red-800 border-red-200' },
  high: { label: '高', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  low: { label: '低', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

interface TodoCardProps {
  todo: DecisionEvent;
  roleNames: string[];
  onStart?: () => void;
  onComplete?: () => void;
  completed?: boolean;
}

function TodoCard({ todo, roleNames, onStart, onComplete, completed }: TodoCardProps) {
  const priority = PRIORITY_CONFIG[todo.priority];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        completed
          ? 'bg-muted/30 border-muted'
          : todo.priority === 'critical'
          ? 'border-red-200 bg-red-50/30'
          : 'hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={priority.color}>
              {todo.priority === 'critical' ? (
                <AlertCircle className="h-3 w-3 mr-1" />
              ) : todo.priority === 'high' ? (
                <AlertTriangle className="h-3 w-3 mr-1" />
              ) : null}
              {priority.label}
            </Badge>
            {roleNames.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
            {completed && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <CheckSquare className="h-3 w-3 mr-1" />
                完了
              </Badge>
            )}
          </div>
          <h4 className={cn('font-semibold', completed && 'line-through text-muted-foreground')}>
            {todo.title}
          </h4>
          <p className="text-sm text-muted-foreground">{todo.description}</p>
          {todo.quantity && todo.quantity > 0 && (
            <p className="text-sm">
              <span className="font-medium">数量:</span> {todo.quantity}
            </p>
          )}
          {todo.deadline && (
            <p className="text-xs text-muted-foreground">
              期限: {new Date(todo.deadline).toLocaleString('ja-JP')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onStart && (
            <Button size="sm" onClick={onStart} className="gap-1">
              <Play className="h-4 w-4" />
              開始
            </Button>
          )}
          {onComplete && (
            <Button size="sm" onClick={onComplete} className="gap-1">
              <CheckCircle className="h-4 w-4" />
              完了
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TodoPage() {
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);

  const activeTodos = selectActiveTodos(state, selectedRole);
  const completedTodos = selectCompletedTodos(state);
  const todoStats = selectTodoStats(state, selectedRole);

  const pendingTodos = activeTodos.filter((t) => t.action === 'approved');
  const inProgressTodos = activeTodos.filter((t) => t.action === 'started');

  const handleStart = (todo: DecisionEvent) => {
    const proposal = proposalFromDecision(todo);
    actions.startDecision(proposal);
    
    if (todo.targetPrepItemIds && todo.targetPrepItemIds.length > 0) {
      actions.startPrep(todo.targetPrepItemIds[0], todo.quantity || 1, undefined, todo.proposalId);
    }
  };

  const handleComplete = (todo: DecisionEvent) => {
    const proposal = proposalFromDecision(todo);
    actions.completeDecision(proposal);
    
    if (todo.targetPrepItemIds && todo.targetPrepItemIds.length > 0) {
      actions.completePrep(todo.targetPrepItemIds[0], todo.quantity || 1, undefined, todo.proposalId);
    }
  };

  const getRoleNames = (roleIds: string[]) =>
    roleIds.map((roleId) => state.roles.find((r) => r.id === roleId)?.name).filter(Boolean) as string[];

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  const stats = [
    {
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      iconBgColor: 'bg-yellow-100',
      value: todoStats.pendingCount,
      label: '待機中',
    },
    {
      icon: <Play className="h-6 w-6 text-blue-600" />,
      iconBgColor: 'bg-blue-100',
      value: todoStats.inProgressCount,
      label: '進行中',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-600" />,
      iconBgColor: 'bg-green-100',
      value: todoStats.completedCount,
      label: '完了',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="現場ToDo"
        subtitle={shortName}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ロール絞り込み:</span>
            <div className="flex gap-1">
              <Badge
                variant={selectedRole === undefined ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedRole(undefined)}
              >
                すべて
              </Badge>
              {state.roles.map((role) => (
                <Badge
                  key={role.id}
                  variant={selectedRole === role.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedRole(role.id)}
                >
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            待機中のタスク
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTodos.length === 0 ? (
            <EmptyState title="待機中のタスクはありません" />
          ) : (
            <div className="space-y-4">
              {pendingTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  roleNames={getRoleNames(todo.distributedToRoles)}
                  onStart={() => handleStart(todo)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            進行中のタスク
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inProgressTodos.length === 0 ? (
            <EmptyState title="進行中のタスクはありません" />
          ) : (
            <div className="space-y-4">
              {inProgressTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  roleNames={getRoleNames(todo.distributedToRoles)}
                  onComplete={() => handleComplete(todo)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            完了したタスク
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTodos.length === 0 ? (
            <EmptyState title="完了したタスクはありません" />
          ) : (
            <div className="space-y-4">
              {completedTodos.slice(0, 5).map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  roleNames={getRoleNames(todo.distributedToRoles)}
                  completed
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
