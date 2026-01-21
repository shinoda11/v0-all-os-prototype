'use client';

import React from "react"

import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatsGrid } from '@/components/StatsGrid';
import { EmptyState } from '@/components/EmptyState';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { useStateSubscription } from '@/state/eventBus';
import {
  selectActiveTodos,
  selectCompletedTodos,
  selectCurrentStore,
  selectTodoStats,
} from '@/core/selectors';
import { proposalFromDecision } from '@/core/commands';
import type { DecisionEvent, Proposal, TimeBand } from '@/core/types';
import {
  CheckCircle,
  Play,
  Pause,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  Timer,
  Package,
  Users,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_CONFIG: Record<Proposal['priority'], { labelKey: string; color: string; icon: React.ReactNode }> = {
  critical: { labelKey: 'exceptions.critical', color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="h-3 w-3" /> },
  high: { labelKey: 'todo.high', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertTriangle className="h-3 w-3" /> },
  medium: { labelKey: 'todo.medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: null },
  low: { labelKey: 'todo.low', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: null },
};

const DELAY_REASONS = [
  { value: 'material-shortage', labelKey: 'completion.materialShortage' },
  { value: 'equipment-issue', labelKey: 'completion.equipmentIssue' },
  { value: 'staff-shortage', labelKey: 'completion.staffShortage' },
  { value: 'priority-change', labelKey: 'completion.priorityChange' },
  { value: 'unexpected-order', labelKey: 'completion.unexpectedOrder' },
  { value: 'other', labelKey: 'completion.other' },
];

interface CompletionData {
  actualQuantity: number;
  actualMinutes: number;
  delayReason?: string;
  hasIssue: boolean;
  issueNote?: string;
}

interface TodoCardProps {
  todo: DecisionEvent;
  roleNames: string[];
  status: 'pending' | 'active' | 'paused' | 'completed';
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
}

function TodoCard({ todo, roleNames, status, onStart, onPause, onResume, onComplete }: TodoCardProps) {
  const { t, locale } = useI18n();
  const priority = PRIORITY_CONFIG[todo.priority];
  const isCompleted = status === 'completed';
  const isPaused = status === 'paused';

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 0) {
      return { text: locale === 'ja' ? `${Math.abs(diffMins)}分超過` : `${Math.abs(diffMins)}min over`, isOverdue: true };
    }
    if (diffMins < 60) {
      return { text: locale === 'ja' ? `残り${diffMins}分` : `${diffMins}min left`, isOverdue: false };
    }
    return { text: date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' }), isOverdue: false };
  };

  const deadlineInfo = todo.deadline ? formatDeadline(todo.deadline) : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        isCompleted
          ? 'bg-muted/30 border-muted'
          : isPaused
          ? 'bg-yellow-50/50 border-yellow-200'
          : todo.priority === 'critical'
          ? 'border-red-200 bg-red-50/30'
          : 'hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Priority and Role Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn(priority.color, 'gap-1')}>
              {priority.icon}
              {t(priority.labelKey)}
            </Badge>
            {roleNames.map((name) => (
              <Badge key={name} variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {name}
              </Badge>
            ))}
            {todo.linkedExceptionId && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('todo.exceptionResponse')}
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 gap-1">
                <CheckSquare className="h-3 w-3" />
                {t('todo.completed')}
              </Badge>
            )}
            {isPaused && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
                <Pause className="h-3 w-3" />
                {t('todo.paused')}
              </Badge>
            )}
          </div>

          {/* Title and Description */}
          <div>
            <h4 className={cn('font-semibold text-base', isCompleted && 'line-through text-muted-foreground')}>
              {todo.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">{todo.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {todo.quantity && todo.quantity > 0 && (
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('todo.quantity')}:</span>
                <span className="font-medium">{todo.quantity}</span>
              </div>
            )}
            {todo.estimatedMinutes && (
              <div className="flex items-center gap-1.5">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('todo.estimate')}:</span>
                <span className="font-medium">{todo.estimatedMinutes}{locale === 'ja' ? '分' : 'min'}</span>
              </div>
            )}
            {deadlineInfo && (
              <div className={cn(
                'flex items-center gap-1.5',
                deadlineInfo.isOverdue && 'text-red-600'
              )}>
                <Clock className="h-4 w-4" />
                <span className={deadlineInfo.isOverdue ? '' : 'text-muted-foreground'}>{t('todo.deadline')}:</span>
                <span className="font-medium">{deadlineInfo.text}</span>
              </div>
            )}
          </div>

          {/* Completion Results (if completed) */}
          {isCompleted && (todo.actualQuantity || todo.actualMinutes) && (
            <div className="pt-2 border-t border-muted text-sm text-muted-foreground">
              <div className="flex gap-4">
                {todo.actualQuantity && (
                  <span>{t('todo.actual')}: {todo.actualQuantity}</span>
                )}
                {todo.actualMinutes && (
                  <span>{locale === 'ja' ? '所要時間' : 'Time'}: {todo.actualMinutes}{locale === 'ja' ? '分' : 'min'}</span>
                )}
                {todo.delayReason && (
                  <span>{t('completion.delayReason')}: {t(DELAY_REASONS.find(r => r.value === todo.delayReason)?.labelKey || 'completion.none')}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {status === 'pending' && onStart && (
            <Button size="sm" onClick={onStart} className="gap-1">
              <Play className="h-4 w-4" />
              {t('todo.start')}
            </Button>
          )}
          {status === 'active' && (
            <>
              {onPause && (
                <Button size="sm" variant="outline" onClick={onPause} className="gap-1 bg-transparent">
                  <Pause className="h-4 w-4" />
                  {t('todo.pause')}
                </Button>
              )}
              {onComplete && (
                <Button size="sm" onClick={onComplete} className="gap-1">
                  <CheckCircle className="h-4 w-4" />
                  {t('todo.complete')}
                </Button>
              )}
            </>
          )}
          {status === 'paused' && onResume && (
            <Button size="sm" onClick={onResume} className="gap-1">
              <Play className="h-4 w-4" />
              {t('todo.resume')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface CompletionModalProps {
  todo: DecisionEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompletionData) => void;
}

function CompletionModal({ todo, open, onOpenChange, onSubmit }: CompletionModalProps) {
  const { t, locale } = useI18n();
  const [actualQuantity, setActualQuantity] = useState(todo?.quantity ?? 0);
  const [actualMinutes, setActualMinutes] = useState(todo?.estimatedMinutes ?? 0);
  const [delayReason, setDelayReason] = useState<string>('none'); // Updated default value
  const [hasIssue, setHasIssue] = useState(false);
  const [issueNote, setIssueNote] = useState('');

  // Reset form when todo changes
  useState(() => {
    if (todo) {
      setActualQuantity(todo.quantity ?? 0);
      setActualMinutes(todo.estimatedMinutes ?? 0);
      setDelayReason('none'); // Updated default value
      setHasIssue(false);
      setIssueNote('');
    }
  });

  const handleSubmit = () => {
    onSubmit({
      actualQuantity,
      actualMinutes,
      delayReason: delayReason || undefined,
      hasIssue,
      issueNote: hasIssue ? issueNote : undefined,
    });
    onOpenChange(false);
  };

  if (!todo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('completion.title')}</DialogTitle>
          <DialogDescription>
            {todo.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Actual Quantity */}
          <div className="space-y-2">
            <Label htmlFor="actualQuantity">{t('completion.actualQuantity')}</Label>
            <Input
              id="actualQuantity"
              type="number"
              min={0}
              value={actualQuantity}
              onChange={(e) => setActualQuantity(Number(e.target.value))}
            />
            {todo.quantity && (
              <p className="text-xs text-muted-foreground">{t('completion.recommended')}: {todo.quantity}</p>
            )}
          </div>

          {/* Actual Minutes */}
          <div className="space-y-2">
            <Label htmlFor="actualMinutes">{t('completion.timeTaken')}</Label>
            <Input
              id="actualMinutes"
              type="number"
              min={0}
              value={actualMinutes}
              onChange={(e) => setActualMinutes(Number(e.target.value))}
            />
            {todo.estimatedMinutes && (
              <p className="text-xs text-muted-foreground">{t('completion.estimate')}: {todo.estimatedMinutes}{locale === 'ja' ? '分' : 'min'}</p>
            )}
          </div>

          {/* Delay Reason (optional) */}
          <div className="space-y-2">
            <Label htmlFor="delayReason">{t('completion.delayReason')}</Label>
            <Select value={delayReason} onValueChange={setDelayReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('completion.none')}</SelectItem>
                {DELAY_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {t(reason.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issue Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasIssue"
              checked={hasIssue}
              onCheckedChange={(checked) => setHasIssue(checked === true)}
            />
            <Label htmlFor="hasIssue" className="text-sm font-normal">
              {t('completion.hasIssue')}
            </Label>
          </div>

          {/* Issue Note (if has issue) */}
          {hasIssue && (
            <div className="space-y-2">
              <Label htmlFor="issueNote">{t('completion.issueContent')}</Label>
              <Textarea
                id="issueNote"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder={t('completion.issueContentPlaceholder')}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {t('completion.record')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TodoPage() {
  const { t, locale } = useI18n();
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [timeBand, setTimeBand] = useState<TimeBand>(state.selectedTimeBand);
  const [completingTodo, setCompletingTodo] = useState<DecisionEvent | null>(null);

  // Subscribe to state updates via event bus
  const { lastUpdateTime: busUpdateTime } = useStateSubscription(['todo', 'decision', 'prep']);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const activeTodos = selectActiveTodos(state, selectedRole);
  const completedTodos = selectCompletedTodos(state);
  const todoStats = selectTodoStats(state, selectedRole);

  // Update last update time from event bus or periodically
  useEffect(() => {
    setLastUpdate(new Date(busUpdateTime));
  }, [busUpdateTime]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds as fallback
    return () => clearInterval(interval);
  }, []);

  // Update last update when time band changes
  const handleTimeBandChange = useCallback((newTimeBand: TimeBand) => {
    setTimeBand(newTimeBand);
    setLastUpdate(new Date());
  }, []);

  // Filter todos by time band
  const filteredActiveTodos = useMemo(() => {
    if (timeBand === 'all') return activeTodos;
    return activeTodos.filter((todo) => todo.timeBand === timeBand || todo.timeBand === 'all');
  }, [activeTodos, timeBand]);

  const filteredCompletedTodos = useMemo(() => {
    if (timeBand === 'all') return completedTodos;
    return completedTodos.filter((todo) => todo.timeBand === timeBand || todo.timeBand === 'all');
  }, [completedTodos, timeBand]);

  // pending = distributed todos waiting to start, approved = legacy approval events
  const pendingTodos = filteredActiveTodos.filter((t) => t.action === 'pending' || t.action === 'approved');
  const inProgressTodos = filteredActiveTodos.filter((t) => t.action === 'started');
  const pausedTodos = filteredActiveTodos.filter((t) => t.action === 'paused');

  const handleStart = (todo: DecisionEvent) => {
    const proposal = proposalFromDecision(todo);
    actions.startDecision(proposal);
    
    if (todo.targetPrepItemIds && todo.targetPrepItemIds.length > 0) {
      actions.startPrep(todo.targetPrepItemIds[0], todo.quantity || 1, undefined, todo.proposalId);
    }
  };

  const handlePause = (todo: DecisionEvent) => {
    // Add paused event
    const pausedEvent: DecisionEvent = {
      ...todo,
      id: `${todo.proposalId}-paused-${Date.now()}`,
      action: 'paused',
      timestamp: new Date().toISOString(),
    };
    actions.addEvent(pausedEvent);
  };

  const handleResume = (todo: DecisionEvent) => {
    // Resume by adding started event again
    const startedEvent: DecisionEvent = {
      ...todo,
      id: `${todo.proposalId}-resumed-${Date.now()}`,
      action: 'started',
      timestamp: new Date().toISOString(),
    };
    actions.addEvent(startedEvent);
  };

  const handleCompleteClick = (todo: DecisionEvent) => {
    setCompletingTodo(todo);
  };

  const handleCompleteSubmit = (data: CompletionData) => {
    if (!completingTodo) return;

    const proposal = proposalFromDecision(completingTodo);
    
    // Add completed event with results
    const completedEvent: DecisionEvent = {
      ...completingTodo,
      id: `${completingTodo.proposalId}-completed-${Date.now()}`,
      action: 'completed',
      timestamp: new Date().toISOString(),
      actualQuantity: data.actualQuantity,
      actualMinutes: data.actualMinutes,
      delayReason: data.delayReason,
      hasIssue: data.hasIssue,
      issueNote: data.issueNote,
    };
    actions.addEvent(completedEvent);

    // Also complete prep if linked - this creates prep_event that updates cockpit metrics
    if (completingTodo.targetPrepItemIds && completingTodo.targetPrepItemIds.length > 0) {
      actions.completePrep(
        completingTodo.targetPrepItemIds[0],
        data.actualQuantity,
        undefined,
        completingTodo.proposalId
      );
    }

    setCompletingTodo(null);
    setLastUpdate(new Date()); // Update last refresh time
  };

  const getRoleNames = (roleIds: string[]) =>
    roleIds.map((roleId) => state.roles.find((r) => r.id === roleId)?.name).filter(Boolean) as string[];

  const getTodoStatus = (todo: DecisionEvent): 'pending' | 'active' | 'paused' | 'completed' => {
    if (todo.action === 'completed') return 'completed';
    if (todo.action === 'paused') return 'paused';
    if (todo.action === 'started') return 'active';
    return 'pending';
  };

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  const stats = [
    {
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      iconBgColor: 'bg-yellow-100',
      value: pendingTodos.length,
      label: t('todo.pending'),
    },
    {
      icon: <Play className="h-6 w-6 text-blue-600" />,
      iconBgColor: 'bg-blue-100',
      value: inProgressTodos.length + pausedTodos.length,
      label: t('todo.inProgress'),
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-600" />,
      iconBgColor: 'bg-green-100',
      value: filteredCompletedTodos.length,
      label: t('todo.completed'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('todo.title')}
        subtitle={shortName}
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              {t('todo.lastUpdate')}: {lastUpdate.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <TimeBandTabs value={timeBand} onChange={handleTimeBandChange} />
          </div>
        }
      />

      {/* Role Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">{t('todo.roleFilter')}:</span>
        <div className="flex gap-1 flex-wrap">
          <Badge
            variant={selectedRole === undefined ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedRole(undefined)}
          >
            {t('common.all')}
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

      <StatsGrid stats={stats} />

      {/* Pending Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            {t('todo.pendingTasks')}
            {pendingTodos.length > 0 && (
              <Badge variant="secondary">{pendingTodos.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTodos.length === 0 ? (
            <EmptyState title={t('todo.noTasks')} />
          ) : (
            <div className="space-y-4">
              {pendingTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  roleNames={getRoleNames(todo.distributedToRoles)}
                  status="pending"
                  onStart={() => handleStart(todo)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* In Progress Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            {t('todo.inProgressTasks')}
            {(inProgressTodos.length + pausedTodos.length) > 0 && (
              <Badge variant="secondary">{inProgressTodos.length + pausedTodos.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inProgressTodos.length === 0 && pausedTodos.length === 0 ? (
            <EmptyState title={t('todo.noTasks')} />
          ) : (
            <div className="space-y-4">
              {inProgressTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  roleNames={getRoleNames(todo.distributedToRoles)}
                  status="active"
                  onPause={() => handlePause(todo)}
                  onComplete={() => handleCompleteClick(todo)}
                />
              ))}
              {pausedTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  roleNames={getRoleNames(todo.distributedToRoles)}
                  status="paused"
                  onResume={() => handleResume(todo)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t('todo.completedTasks')}
            {filteredCompletedTodos.length > 0 && (
              <Badge variant="secondary">{filteredCompletedTodos.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCompletedTodos.length === 0 ? (
            <EmptyState title={t('todo.noTasks')} />
          ) : (
            <div className="space-y-4">
              {filteredCompletedTodos.slice(0, 5).map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  roleNames={getRoleNames(todo.distributedToRoles)}
                  status="completed"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Modal */}
      <CompletionModal
        todo={completingTodo}
        open={!!completingTodo}
        onOpenChange={(open) => !open && setCompletingTodo(null)}
        onSubmit={handleCompleteSubmit}
      />
    </div>
  );
}
