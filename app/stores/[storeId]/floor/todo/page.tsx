'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { useStateSubscription } from '@/state/eventBus';
import {
  selectActiveTodos,
  selectCompletedTodos,
  selectCurrentStore,
} from '@/core/selectors';
import { proposalFromDecision } from '@/core/commands';
import type { DecisionEvent, TimeBand } from '@/core/types';
import {
  Play,
  CheckCircle,
  Clock,
  Star,
  Timer,
  Users,
  Zap,
  Trophy,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Today Quests - Floor Worker Task Management
 * 
 * Design Guidelines Compliance:
 * - 2.1: Spacing scale 4/8/12/16/24/32
 * - 2.3: State with icon + label
 * - 2.4: Touch targets 44x44 minimum
 * - 2.5: Typography Regular/Bold only
 * - 3.2: Queue card with summary, urgency, recommended action
 */

// Difficulty levels with star display
type Difficulty = 1 | 2 | 3 | 4 | 5;

const DELAY_REASONS = [
  { value: 'material-shortage', label: '材料不足' },
  { value: 'equipment-issue', label: '機器トラブル' },
  { value: 'staff-shortage', label: '人手不足' },
  { value: 'priority-change', label: '優先度変更' },
  { value: 'unexpected-order', label: '想定外の注文' },
  { value: 'other', label: 'その他' },
];

// Estimate difficulty from estimated minutes
function getDifficulty(estimatedMinutes?: number): Difficulty {
  if (!estimatedMinutes) return 2;
  if (estimatedMinutes <= 5) return 1;
  if (estimatedMinutes <= 15) return 2;
  if (estimatedMinutes <= 30) return 3;
  if (estimatedMinutes <= 60) return 4;
  return 5;
}

// Star display component
function DifficultyStars({ difficulty }: { difficulty: Difficulty }) {
  return (
    <div className="flex items-center gap-0.5" title={`難易度: ${difficulty}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i <= difficulty ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

// Timer display for in-progress tasks
function TaskTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const updateTimer = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex items-center gap-2 text-lg font-bold tabular-nums text-primary">
      <Timer className="h-5 w-5 animate-pulse" />
      <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
}

// Quest Card Component
interface QuestCardProps {
  quest: DecisionEvent;
  status: 'waiting' | 'in_progress' | 'done';
  roleNames: string[];
  onStart?: () => void;
  onComplete?: () => void;
  disabled?: boolean;
}

function QuestCard({ quest, status, roleNames, onStart, onComplete, disabled }: QuestCardProps) {
  const difficulty = getDifficulty(quest.estimatedMinutes);
  
  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = quest.deadline && new Date(quest.deadline) < new Date();

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all',
        status === 'waiting' && 'bg-card border-border hover:border-primary/50',
        status === 'in_progress' && 'bg-primary/5 border-primary',
        status === 'done' && 'bg-muted/50 border-muted',
        disabled && status === 'waiting' && 'opacity-60'
      )}
    >
      {/* Header: Title + Difficulty */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className={cn(
          'font-bold',
          status === 'done' && 'line-through text-muted-foreground'
        )}>
          {quest.title}
        </h3>
        <DifficultyStars difficulty={difficulty} />
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
        {/* Role */}
        {roleNames.length > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {roleNames.join(', ')}
          </span>
        )}
        
        {/* Deadline */}
        {quest.deadline && (
          <span className={cn(
            'flex items-center gap-1',
            isOverdue && status !== 'done' && 'text-red-600 font-bold'
          )}>
            <Clock className="h-4 w-4" />
            {formatDeadline(quest.deadline)}
            {isOverdue && status !== 'done' && ' (超過)'}
          </span>
        )}
        
        {/* Estimated time */}
        {quest.estimatedMinutes && (
          <span className="flex items-center gap-1">
            <Timer className="h-4 w-4" />
            {quest.estimatedMinutes}分
          </span>
        )}
      </div>

      {/* Timer for in-progress */}
      {status === 'in_progress' && quest.timestamp && (
        <div className="mb-4">
          <TaskTimer startTime={quest.timestamp} />
        </div>
      )}

      {/* Completion results for done */}
      {status === 'done' && (quest.actualMinutes || quest.actualQuantity) && (
        <div className="mb-4 p-2 bg-muted rounded text-sm">
          <div className="flex items-center gap-4">
            {quest.actualMinutes && (
              <span>実績: {quest.actualMinutes}分</span>
            )}
            {quest.actualQuantity && (
              <span>数量: {quest.actualQuantity}</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === 'waiting' && onStart && (
          <Button 
            onClick={onStart} 
            disabled={disabled}
            className="flex-1 h-11 gap-2"
          >
            <Play className="h-4 w-4" />
            開始
          </Button>
        )}
        {status === 'in_progress' && onComplete && (
          <Button 
            onClick={onComplete}
            className="flex-1 h-11 gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            完了
          </Button>
        )}
      </div>
    </div>
  );
}

// Column Component
interface QuestColumnProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  accentColor?: string;
  children: React.ReactNode;
}

function QuestColumn({ title, icon, count, accentColor, children }: QuestColumnProps) {
  return (
    <div className="flex flex-col min-w-[300px] flex-1">
      {/* Column Header */}
      <div className={cn(
        'flex items-center gap-2 p-4 rounded-t-lg border-b-2',
        accentColor || 'border-border'
      )}>
        {icon}
        <span className="font-bold">{title}</span>
        <Badge variant="secondary" className="ml-auto">{count}</Badge>
      </div>
      
      {/* Column Content */}
      <div className="flex-1 p-4 space-y-3 bg-muted/30 rounded-b-lg min-h-[400px]">
        {children}
      </div>
    </div>
  );
}

// Completion Modal
interface CompletionModalProps {
  quest: DecisionEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { actualMinutes: number; actualQuantity?: number; delayReason?: string }) => void;
  elapsedMinutes: number;
}

function CompletionModal({ quest, open, onOpenChange, onSubmit, elapsedMinutes }: CompletionModalProps) {
  const [actualMinutes, setActualMinutes] = useState(elapsedMinutes);
  const [actualQuantity, setActualQuantity] = useState<number | undefined>(quest?.quantity);
  const [delayReason, setDelayReason] = useState<string>('none');

  useEffect(() => {
    if (quest) {
      setActualMinutes(elapsedMinutes || quest.estimatedMinutes || 0);
      setActualQuantity(quest.quantity);
      setDelayReason('');
    }
  }, [quest, elapsedMinutes]);

  const handleSubmit = () => {
    onSubmit({
      actualMinutes,
      actualQuantity,
      delayReason: delayReason || undefined,
    });
  };

  if (!quest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            クエスト完了
          </DialogTitle>
          <DialogDescription>{quest.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Actual Time */}
          <div className="space-y-2">
            <Label htmlFor="actualMinutes">実績時間（分）</Label>
            <Input
              id="actualMinutes"
              type="number"
              min={0}
              value={actualMinutes}
              onChange={(e) => setActualMinutes(Number(e.target.value))}
              className="h-11"
            />
            {quest.estimatedMinutes && (
              <p className="text-sm text-muted-foreground">
                想定: {quest.estimatedMinutes}分
              </p>
            )}
          </div>

          {/* Actual Quantity (optional) */}
          {quest.quantity && (
            <div className="space-y-2">
              <Label htmlFor="actualQuantity">実績数量（任意）</Label>
              <Input
                id="actualQuantity"
                type="number"
                min={0}
                value={actualQuantity ?? ''}
                onChange={(e) => setActualQuantity(e.target.value ? Number(e.target.value) : undefined)}
                className="h-11"
              />
              <p className="text-sm text-muted-foreground">
                想定: {quest.quantity}
              </p>
            </div>
          )}

          {/* Delay Reason (optional) */}
          <div className="space-y-2">
            <Label htmlFor="delayReason">遅延理由（任意）</Label>
            <Select value={delayReason} onValueChange={setDelayReason}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {DELAY_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="h-11">
            キャンセル
          </Button>
          <Button onClick={handleSubmit} className="h-11 gap-2">
            <CheckCircle className="h-4 w-4" />
            記録して完了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Progress Summary
function ProgressSummary({ 
  waiting, 
  inProgress, 
  done, 
  total 
}: { 
  waiting: number; 
  inProgress: number; 
  done: number; 
  total: number;
}) {
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-6">
          {/* Progress Circle */}
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={`${percentage * 1.76} 176`}
                className="text-primary"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
              {percentage}%
            </span>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{waiting}</div>
              <div className="text-sm text-muted-foreground">待機中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{inProgress}</div>
              <div className="text-sm text-muted-foreground">進行中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{done}</div>
              <div className="text-sm text-muted-foreground">完了</div>
            </div>
          </div>

          {/* Motivation */}
          <div className="flex items-center gap-2 text-sm">
            {percentage === 100 ? (
              <>
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="font-bold text-amber-600">全クエスト達成!</span>
              </>
            ) : percentage >= 50 ? (
              <>
                <Zap className="h-5 w-5 text-primary" />
                <span>あと{total - done}件!</span>
              </>
            ) : (
              <>
                <Target className="h-5 w-5 text-muted-foreground" />
                <span>今日のクエスト</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Page Component
export default function TodayQuestsPage() {
  const { t, locale } = useI18n();
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const [completingQuest, setCompletingQuest] = useState<DecisionEvent | null>(null);
  const [inProgressStartTime, setInProgressStartTime] = useState<string | null>(null);

  // Subscribe to state updates
  useStateSubscription(['todo', 'decision', 'prep']);

  // Get quests
  const activeTodos = selectActiveTodos(state, undefined);
  const completedTodos = selectCompletedTodos(state);

  // Categorize quests
  const waitingQuests = useMemo(() => 
    activeTodos.filter((t) => t.action === 'pending' || t.action === 'approved'),
    [activeTodos]
  );
  
  const inProgressQuests = useMemo(() => 
    activeTodos.filter((t) => t.action === 'started'),
    [activeTodos]
  );
  
  const doneQuests = useMemo(() => 
    completedTodos.slice(0, 10), // Show last 10 completed
    [completedTodos]
  );

  // Check if user already has a task in progress (1 task constraint)
  const hasTaskInProgress = inProgressQuests.length > 0;

  const getRoleNames = (roleIds: string[]) =>
    roleIds.map((roleId) => state.roles.find((r) => r.id === roleId)?.name).filter(Boolean) as string[];

  const handleStart = (quest: DecisionEvent) => {
    const proposal = proposalFromDecision(quest);
    actions.startDecision(proposal);
    
    if (quest.targetPrepItemIds && quest.targetPrepItemIds.length > 0) {
      actions.startPrep(quest.targetPrepItemIds[0], quest.quantity || 1, undefined, quest.proposalId);
    }
  };

  const handleCompleteClick = (quest: DecisionEvent) => {
    setInProgressStartTime(quest.timestamp);
    setCompletingQuest(quest);
  };

  const handleCompleteSubmit = (data: { actualMinutes: number; actualQuantity?: number; delayReason?: string }) => {
    if (!completingQuest) return;

    const completedEvent: DecisionEvent = {
      ...completingQuest,
      id: `${completingQuest.proposalId}-completed-${Date.now()}`,
      action: 'completed',
      timestamp: new Date().toISOString(),
      actualQuantity: data.actualQuantity,
      actualMinutes: data.actualMinutes,
      delayReason: data.delayReason,
    };
    actions.addEvent(completedEvent);

    if (completingQuest.targetPrepItemIds && completingQuest.targetPrepItemIds.length > 0) {
      actions.completePrep(
        completingQuest.targetPrepItemIds[0],
        data.actualQuantity ?? completingQuest.quantity ?? 0,
        undefined,
        completingQuest.proposalId
      );
    }

    setCompletingQuest(null);
    setInProgressStartTime(null);
  };

  // Calculate elapsed minutes for modal
  const getElapsedMinutes = () => {
    if (!inProgressStartTime) return 0;
    const start = new Date(inProgressStartTime).getTime();
    return Math.round((Date.now() - start) / 60000);
  };

  if (!currentStore) {
    return null;
  }

  const totalQuests = waitingQuests.length + inProgressQuests.length + doneQuests.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today Quests"
        subtitle={`${currentStore.name} - ${new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}`}
      />

      {/* Progress Summary */}
      <ProgressSummary
        waiting={waitingQuests.length}
        inProgress={inProgressQuests.length}
        done={doneQuests.length}
        total={totalQuests}
      />

      {/* 3-Column Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Waiting Column */}
        <QuestColumn
          title="待機中"
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          count={waitingQuests.length}
          accentColor="border-muted-foreground"
        >
          {waitingQuests.length === 0 ? (
            <EmptyState type="no_data" title="待機中のクエストなし" />
          ) : (
            waitingQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                status="waiting"
                roleNames={getRoleNames(quest.distributedToRoles)}
                onStart={() => handleStart(quest)}
                disabled={hasTaskInProgress}
              />
            ))
          )}
        </QuestColumn>

        {/* In Progress Column */}
        <QuestColumn
          title="進行中"
          icon={<Play className="h-5 w-5 text-primary" />}
          count={inProgressQuests.length}
          accentColor="border-primary"
        >
          {inProgressQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Play className="h-8 w-8 mb-2 opacity-30" />
              <p>クエストを開始してください</p>
              <p className="text-sm">1つずつ集中して取り組もう</p>
            </div>
          ) : (
            inProgressQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                status="in_progress"
                roleNames={getRoleNames(quest.distributedToRoles)}
                onComplete={() => handleCompleteClick(quest)}
              />
            ))
          )}
        </QuestColumn>

        {/* Done Column */}
        <QuestColumn
          title="完了"
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          count={doneQuests.length}
          accentColor="border-emerald-600"
        >
          {doneQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Trophy className="h-8 w-8 mb-2 opacity-30" />
              <p>完了したクエストがここに表示されます</p>
            </div>
          ) : (
            doneQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                status="done"
                roleNames={getRoleNames(quest.distributedToRoles)}
              />
            ))
          )}
        </QuestColumn>
      </div>

      {/* Completion Modal */}
      <CompletionModal
        quest={completingQuest}
        open={!!completingQuest}
        onOpenChange={(open) => !open && setCompletingQuest(null)}
        onSubmit={handleCompleteSubmit}
        elapsedMinutes={getElapsedMinutes()}
      />
    </div>
  );
}
