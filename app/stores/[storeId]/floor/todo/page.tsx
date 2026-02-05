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
import { useAuth } from '@/state/auth';
import { useI18n } from '@/i18n/I18nProvider';
import { useStateSubscription } from '@/state/eventBus';
import {
  selectActiveTodos,
  selectCompletedTodos,
  selectCurrentStore,
} from '@/core/selectors';
import { proposalFromDecision } from '@/core/commands';
import type { DecisionEvent, TimeBand } from '@/core/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Play,
  Pause,
  CheckCircle,
  Clock,
  Star,
  Timer,
  Users,
  Zap,
  Trophy,
  Target,
  AlertCircle,
  RotateCcw,
  Bell,
  ChefHat,
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

const DELAY_REASON_KEYS = [
  { value: 'none', labelKey: 'quests.delayReason.none' },
  { value: 'material-shortage', labelKey: 'quests.delayReason.materialShortage' },
  { value: 'equipment-issue', labelKey: 'quests.delayReason.equipmentIssue' },
  { value: 'staff-shortage', labelKey: 'quests.delayReason.staffShortage' },
  { value: 'priority-change', labelKey: 'quests.delayReason.priorityChange' },
  { value: 'unexpected-order', labelKey: 'quests.delayReason.unexpectedOrder' },
  { value: 'other', labelKey: 'quests.delayReason.other' },
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
  status: 'waiting' | 'in_progress' | 'paused' | 'done';
  roleNames: string[];
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function QuestCard({ quest, status, roleNames, onStart, onPause, onResume, onComplete, disabled, disabledReason }: QuestCardProps) {
  const { t } = useI18n();
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
        status === 'paused' && 'bg-amber-50 border-amber-300',
        status === 'done' && 'bg-muted/50 border-muted',
        disabled && status === 'waiting' && 'opacity-60'
      )}
    >
  {/* Header: Title + Difficulty */}
  <div className="flex items-start justify-between gap-2 mb-3">
  <div className="flex items-center gap-2 flex-wrap">
    <h3 className={cn(
    'font-bold',
    status === 'done' && 'line-through text-muted-foreground'
    )}>
    {quest.title}
    </h3>
    {status === 'paused' && (
    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
      {t('quests.paused')}
    </Badge>
    )}
    {/* Ad-hoc quest indicator - no points unless manager approved */}
    {quest.source === 'ad-hoc' && !quest.managerApprovedForPoints && (
    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 text-xs">
      {t('quests.adHoc')} (0pt)
    </Badge>
    )}
    {quest.source === 'ad-hoc' && quest.managerApprovedForPoints && (
    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
      {t('quests.managerApproved')}
    </Badge>
    )}
  </div>
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
  {status === 'done' && (quest.actualMinutes || quest.actualQuantity || quest.qualityStatus) && (
  <div className="mb-4 p-2 bg-muted rounded text-sm space-y-1">
  <div className="flex items-center gap-4">
  {quest.actualMinutes && (
  <span>実績: {quest.actualMinutes}分</span>
  )}
  {quest.actualQuantity && (
  <span>数量: {quest.actualQuantity}</span>
  )}
  </div>
  {quest.qualityStatus && (
  <div className="flex items-center gap-2">
    <span className={cn(
    'px-2 py-0.5 rounded text-xs font-medium',
    quest.qualityStatus === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
    )}>
    {quest.qualityStatus === 'ok' ? 'OK' : 'NG'}
    </span>
    {quest.qualityNote && <span className="text-xs text-muted-foreground">{quest.qualityNote}</span>}
  </div>
  )}
  </div>
  )}

      {/* Disabled reason message */}
      {disabled && disabledReason && status === 'waiting' && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === 'waiting' && onStart && (
          <Button 
            onClick={onStart} 
            disabled={disabled}
            className="flex-1 h-11 gap-2"
            variant={disabled ? 'secondary' : 'default'}
          >
            <Play className="h-4 w-4" />
            {t('quests.start')}
          </Button>
        )}
        {status === 'in_progress' && (
          <>
            {onPause && (
              <Button 
                onClick={onPause}
                variant="outline"
                className="h-11 gap-2"
              >
                <Pause className="h-4 w-4" />
                {t('quests.pause')}
              </Button>
            )}
            {onComplete && (
              <Button 
                onClick={onComplete}
                className="flex-1 h-11 gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {t('quests.complete')}
              </Button>
            )}
          </>
        )}
        {status === 'paused' && onResume && (
          <Button 
            onClick={onResume}
            variant="outline"
            className="flex-1 h-11 gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
          >
            <RotateCcw className="h-4 w-4" />
            {t('quests.resume')}
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
  onSubmit: (data: { 
    actualMinutes: number; 
    actualQuantity?: number; 
    delayReason?: string;
    qualityStatus: 'ok' | 'ng';
    qualityNote?: string;
  }) => void;
  elapsedMinutes: number;
}

function CompletionModal({ quest, open, onOpenChange, onSubmit, elapsedMinutes }: CompletionModalProps) {
  const { t } = useI18n();
  const [actualMinutes, setActualMinutes] = useState(elapsedMinutes);
  const [actualQuantity, setActualQuantity] = useState<number | undefined>(quest?.quantity);
  const [delayReason, setDelayReason] = useState<string>('none');
  const [qualityStatus, setQualityStatus] = useState<'ok' | 'ng'>('ok');
  const [qualityNote, setQualityNote] = useState('');

  useEffect(() => {
    if (quest) {
      setActualMinutes(elapsedMinutes || quest.estimatedMinutes || 0);
      setActualQuantity(quest.quantity);
      setDelayReason('none');
      setQualityStatus('ok');
      setQualityNote('');
    }
  }, [quest, elapsedMinutes]);

  const handleSubmit = () => {
    onSubmit({
      actualMinutes,
      actualQuantity,
      delayReason: delayReason !== 'none' ? delayReason : undefined,
      qualityStatus,
      qualityNote: qualityStatus === 'ng' ? qualityNote : undefined,
    });
  };

  if (!quest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {t('quests.completeModal.title')}
          </DialogTitle>
          <DialogDescription>{quest.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Actual Time */}
          <div className="space-y-2">
            <Label htmlFor="actualMinutes">{t('quests.completeModal.actualTime')}</Label>
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
                {t('quests.estimatedTime')}: {quest.estimatedMinutes}min
              </p>
            )}
          </div>

          {/* Actual Quantity (optional) */}
          {quest.quantity && (
            <div className="space-y-2">
              <Label htmlFor="actualQuantity">{t('quests.completeModal.quantity')}</Label>
              <Input
                id="actualQuantity"
                type="number"
                min={0}
                value={actualQuantity ?? ''}
                onChange={(e) => setActualQuantity(e.target.value ? Number(e.target.value) : undefined)}
                className="h-11"
              />
              <p className="text-sm text-muted-foreground">
                {t('quests.estimatedTime')}: {quest.quantity}
              </p>
            </div>
          )}

          {/* Delay Reason (optional) */}
          <div className="space-y-2">
            <Label htmlFor="delayReason">{t('quests.completeModal.delayReason')}</Label>
            <Select value={delayReason} onValueChange={setDelayReason}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELAY_REASON_KEYS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {t(reason.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality Status */}
          <div className="space-y-3 pt-2 border-t">
            <Label>{t('quests.completeModal.qualityStatus')}</Label>
            <RadioGroup 
              value={qualityStatus} 
              onValueChange={(v) => setQualityStatus(v as 'ok' | 'ng')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ok" id="quality-ok" />
                <Label 
                  htmlFor="quality-ok" 
                  className={cn(
                    'cursor-pointer px-3 py-1.5 rounded-full text-sm transition-colors',
                    qualityStatus === 'ok' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {t('quests.completeModal.qualityOk')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ng" id="quality-ng" />
                <Label 
                  htmlFor="quality-ng" 
                  className={cn(
                    'cursor-pointer px-3 py-1.5 rounded-full text-sm transition-colors',
                    qualityStatus === 'ng' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {t('quests.completeModal.qualityNg')}
                </Label>
              </div>
            </RadioGroup>
            
            {/* Quality Note (only shown when NG) */}
            {qualityStatus === 'ng' && (
              <div className="space-y-2">
                <Label htmlFor="qualityNote">{t('quests.completeModal.qualityNote')}</Label>
                <Textarea
                  id="qualityNote"
                  value={qualityNote}
                  onChange={(e) => setQualityNote(e.target.value)}
                  placeholder="問題の詳細を入力..."
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="h-11">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="h-11 gap-2">
            <CheckCircle className="h-4 w-4" />
            {t('quests.completeModal.submit')}
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
  paused,
  done, 
  total 
}: { 
  waiting: number; 
  inProgress: number; 
  paused: number;
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
          <div className="flex-1 grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-muted-foreground">{waiting}</div>
              <div className="text-xs text-muted-foreground">待機</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{inProgress}</div>
              <div className="text-xs text-muted-foreground">進行中</div>
            </div>
            {paused > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold text-amber-600">{paused}</div>
                <div className="text-xs text-muted-foreground">停止中</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-600">{done}</div>
              <div className="text-xs text-muted-foreground">完了</div>
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

// Order Interrupt Modal
interface OrderInterruptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderQuest: DecisionEvent | null;
  currentQuest: DecisionEvent | null;
  onAccept: () => void;
}

function OrderInterruptModal({ open, onOpenChange, orderQuest, currentQuest, onAccept }: OrderInterruptModalProps) {
  const { t } = useI18n();
  
  if (!orderQuest) return null;

  // Calculate SLA timer
  const deadline = orderQuest.deadline ? new Date(orderQuest.deadline) : null;
  const remainingMs = deadline ? deadline.getTime() - Date.now() : 0;
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecs = remainingSeconds % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Bell className="h-5 w-5 animate-pulse" />
            {t('quests.orderInterrupt.title')}
          </DialogTitle>
          <DialogDescription>{t('quests.orderInterrupt.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order details */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <ChefHat className="h-6 w-6 text-red-600" />
              <span className="font-bold text-lg">{orderQuest.title.replace('[ORDER] ', '')}</span>
            </div>
            <p className="text-sm text-muted-foreground">{orderQuest.description}</p>
            
            {/* SLA Timer */}
            <div className="mt-3 flex items-center gap-2">
              <Timer className="h-4 w-4 text-red-600" />
              <span className={cn(
                'font-bold tabular-nums',
                remainingSeconds < 60 ? 'text-red-600' : 'text-amber-600'
              )}>
                SLA: {remainingMinutes}:{String(remainingSecs).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Current task info */}
          {currentQuest && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <p className="font-medium text-amber-800">{t('quests.orderInterrupt.currentTask')}</p>
              <p className="text-amber-700">{currentQuest.title}</p>
              <p className="text-xs text-amber-600 mt-1">{t('quests.orderInterrupt.willPause')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('quests.orderInterrupt.later')}
          </Button>
          <Button onClick={onAccept} className="bg-red-600 hover:bg-red-700 gap-2">
            <Play className="h-4 w-4" />
            {currentQuest ? t('quests.orderInterrupt.pauseAndStart') : t('quests.orderInterrupt.startNow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Resume Prompt after Order completion
interface ResumePromptProps {
  pausedQuest: DecisionEvent | null;
  onResume: () => void;
  onDismiss: () => void;
}

function ResumePrompt({ pausedQuest, onResume, onDismiss }: ResumePromptProps) {
  const { t } = useI18n();
  
  if (!pausedQuest) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom">
      <Card className="border-amber-300 bg-amber-50 shadow-lg">
        <CardContent className="p-4 flex items-center gap-4">
          <RotateCcw className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">{t('quests.resumePrompt.title')}</p>
            <p className="text-sm text-amber-700">{pausedQuest.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              {t('common.dismiss')}
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={onResume}>
              {t('quests.resume')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Page Component
export default function TodayQuestsPage() {
  const { t, locale } = useI18n();
  const { state, actions } = useStore();
  const { currentUser } = useAuth();
  const currentStore = selectCurrentStore(state);
  const [completingQuest, setCompletingQuest] = useState<DecisionEvent | null>(null);
  const [inProgressStartTime, setInProgressStartTime] = useState<string | null>(null);
  
  // Order interrupt state
  const [pendingOrderQuest, setPendingOrderQuest] = useState<DecisionEvent | null>(null);
  const [showOrderInterrupt, setShowOrderInterrupt] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [lastPausedQuest, setLastPausedQuest] = useState<DecisionEvent | null>(null);
  const processedOrdersRef = useRef<Set<string>>(new Set());

  // Subscribe to state updates
  useStateSubscription(['todo', 'decision', 'prep', 'order']);

  // Get quests - filter by current user's assigned quests or role
  const allActiveTodos = selectActiveTodos(state, undefined);
  const allCompletedTodos = selectCompletedTodos(state);
  
  // Find current user's staff record
  const myStaff = state.staff.find((s) => 
    s.storeId === state.selectedStoreId && s.id === `staff-${currentUser.id}`
  ) ?? state.staff.find((s) => s.storeId === state.selectedStoreId);
  const myRoleId = myStaff?.roleId;
  
  // Filter to only show quests assigned to current user or their role
  const activeTodos = useMemo(() => 
    allActiveTodos.filter((quest) => 
      quest.assigneeId === myStaff?.id || 
      (myRoleId && quest.distributedToRoles.includes(myRoleId))
    ),
    [allActiveTodos, myStaff?.id, myRoleId]
  );
  
  const completedTodos = useMemo(() => 
    allCompletedTodos.filter((quest) => 
      quest.assigneeId === myStaff?.id || 
      (myRoleId && quest.distributedToRoles.includes(myRoleId))
    ),
    [allCompletedTodos, myStaff?.id, myRoleId]
  );

  // Categorize quests - Order quests at the top
  const orderQuests = useMemo(() =>
    activeTodos.filter((t) => t.title.startsWith('[ORDER]') && (t.action === 'pending' || t.action === 'approved')),
    [activeTodos]
  );
  
  const regularWaitingQuests = useMemo(() => 
    activeTodos.filter((t) => !t.title.startsWith('[ORDER]') && (t.action === 'pending' || t.action === 'approved')),
    [activeTodos]
  );
  
  // Combined waiting: orders first, then regular
  const waitingQuests = useMemo(() => [...orderQuests, ...regularWaitingQuests], [orderQuests, regularWaitingQuests]);
  
  const inProgressQuests = useMemo(() => 
    activeTodos.filter((t) => t.action === 'started'),
    [activeTodos]
  );
  
  const pausedQuests = useMemo(() => 
    activeTodos.filter((t) => t.action === 'paused'),
    [activeTodos]
  );
  
  const doneQuests = useMemo(() => 
    completedTodos.slice(0, 10), // Show last 10 completed
    [completedTodos]
  );

  // Check if user already has a task in progress (1 task constraint)
  // Paused tasks don't block starting new tasks
  const hasTaskInProgress = inProgressQuests.length > 0;
  const currentInProgressQuest = inProgressQuests[0] || null;

  // Detect new urgent order quests and show interrupt modal
  useEffect(() => {
    if (orderQuests.length > 0) {
      const newOrder = orderQuests.find((q) => !processedOrdersRef.current.has(q.id));
      if (newOrder) {
        processedOrdersRef.current.add(newOrder.id);
        setPendingOrderQuest(newOrder);
        setShowOrderInterrupt(true);
      }
    }
  }, [orderQuests]);

  // Handle order interrupt acceptance
  const handleAcceptOrderInterrupt = useCallback(() => {
    if (!pendingOrderQuest) return;
    
    // If there's a task in progress, pause it first
    if (currentInProgressQuest) {
      const proposal = proposalFromDecision(currentInProgressQuest);
      actions.pauseDecision(proposal);
      setLastPausedQuest(currentInProgressQuest);
    }
    
    // Start the order quest
    const orderProposal = proposalFromDecision(pendingOrderQuest);
    actions.startDecision(orderProposal);
    
    setShowOrderInterrupt(false);
    setPendingOrderQuest(null);
  }, [pendingOrderQuest, currentInProgressQuest, actions]);

  // Demo: Simulate POS order
  const handleSimulateOrder = () => {
    const orderId = `order-${Date.now()}`;
    const menuItems = ['サーモン握り', 'マグロ丼', 'えび天ぷら', 'うな重', 'カツ丼'];
    const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    
    actions.createOrderQuest({
      orderId,
      menuItemName: menuItem,
      quantity,
      slaMinutes: 3,
    });
  };

  const getRoleNames = (roleIds: string[]) =>
    roleIds.map((roleId) => state.roles.find((r) => r.id === roleId)?.name).filter(Boolean) as string[];

  const handleStart = (quest: DecisionEvent) => {
    // Single-task constraint: don't allow starting if another task is in progress
    if (hasTaskInProgress) return;
    
    const proposal = proposalFromDecision(quest);
    actions.startDecision(proposal);
    
    if (quest.targetPrepItemIds && quest.targetPrepItemIds.length > 0) {
      actions.startPrep(quest.targetPrepItemIds[0], quest.quantity || 1, undefined, quest.proposalId);
    }
  };

  const handlePause = (quest: DecisionEvent) => {
    const proposal = proposalFromDecision(quest);
    actions.pauseDecision(proposal);
  };

  const handleResume = (quest: DecisionEvent) => {
    // Single-task constraint: don't allow resuming if another task is in progress
    if (hasTaskInProgress) return;
    
    const proposal = proposalFromDecision(quest);
    actions.resumeDecision(proposal);
  };

  const handleCompleteClick = (quest: DecisionEvent) => {
    setInProgressStartTime(quest.timestamp);
    setCompletingQuest(quest);
  };

  const handleCompleteSubmit = (data: { 
    actualMinutes: number; 
    actualQuantity?: number; 
    delayReason?: string;
    qualityStatus: 'ok' | 'ng';
    qualityNote?: string;
  }) => {
    if (!completingQuest) return;

    const completedEvent: DecisionEvent = {
      ...completingQuest,
      id: `${completingQuest.proposalId}-completed-${Date.now()}`,
      action: 'completed',
      timestamp: new Date().toISOString(),
      actualQuantity: data.actualQuantity,
      actualMinutes: data.actualMinutes,
      delayReason: data.delayReason,
      qualityStatus: data.qualityStatus,
      qualityNote: data.qualityNote,
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

    // If completing an order quest and there's a paused task, show resume prompt
    const wasOrderQuest = completingQuest.title.startsWith('[ORDER]');
    
    setCompletingQuest(null);
    setInProgressStartTime(null);
    
    if (wasOrderQuest && lastPausedQuest) {
      setShowResumePrompt(true);
    }
  };

  // Handle resume from prompt
  const handleResumeFromPrompt = () => {
    if (lastPausedQuest) {
      const proposal = proposalFromDecision(lastPausedQuest);
      actions.resumeDecision(proposal);
      setLastPausedQuest(null);
    }
    setShowResumePrompt(false);
  };

  const handleDismissResumePrompt = () => {
    setShowResumePrompt(false);
    setLastPausedQuest(null);
  };

  // Calculate elapsed minutes for modal
  const getElapsedMinutes = () => {
    if (!inProgressStartTime) return 0;
    const start = new Date(inProgressStartTime).getTime();
    return Math.round((Date.now() - start) / 60000);
  };

  const totalQuests = waitingQuests.length + inProgressQuests.length + pausedQuests.length + doneQuests.length;

  if (!currentStore) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={t('quests.title')}
          subtitle={`${currentStore.name} - ${new Date().toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', day: 'numeric' })}`}
        />
        {/* Demo: Simulate POS Order */}
        <Button 
          variant="outline" 
          onClick={handleSimulateOrder}
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
        >
          <Bell className="h-4 w-4" />
          {t('quests.simulateOrder')}
        </Button>
      </div>

      {/* Progress Summary */}
<ProgressSummary
  waiting={waitingQuests.length}
  inProgress={inProgressQuests.length}
  paused={pausedQuests.length}
  done={doneQuests.length}
  total={totalQuests}
  />

      {/* 3-Column Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Waiting Column */}
        <QuestColumn
          title={t('quests.waiting')}
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          count={waitingQuests.length}
          accentColor="border-muted-foreground"
        >
          {waitingQuests.length === 0 ? (
            <EmptyState type="no_data" title={t('quests.noQuests')} />
          ) : (
  waitingQuests.map((quest) => (
  <QuestCard
  key={quest.id}
  quest={quest}
  status="waiting"
  roleNames={getRoleNames(quest.distributedToRoles)}
  onStart={() => handleStart(quest)}
  disabled={hasTaskInProgress}
  disabledReason={hasTaskInProgress ? t('quests.singleTaskReason') : undefined}
  />
  ))
          )}
        </QuestColumn>

  {/* In Progress Column */}
  <QuestColumn
  title={t('quests.inProgress')}
  icon={<Play className="h-5 w-5 text-primary" />}
  count={inProgressQuests.length + pausedQuests.length}
  accentColor="border-primary"
  >
  {inProgressQuests.length === 0 && pausedQuests.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
  <Play className="h-8 w-8 mb-2 opacity-30" />
  <p>{t('quests.start')}</p>
  </div>
  ) : (
  <>
    {/* Active in-progress tasks */}
    {inProgressQuests.map((quest) => (
    <QuestCard
    key={quest.id}
    quest={quest}
    status="in_progress"
    roleNames={getRoleNames(quest.distributedToRoles)}
    onPause={() => handlePause(quest)}
    onComplete={() => handleCompleteClick(quest)}
    />
    ))}
    {/* Paused tasks */}
    {pausedQuests.map((quest) => (
    <QuestCard
    key={quest.id}
    quest={quest}
    status="paused"
    roleNames={getRoleNames(quest.distributedToRoles)}
    onResume={() => handleResume(quest)}
    disabled={hasTaskInProgress}
    disabledReason={hasTaskInProgress ? t('quests.singleTaskReason') : undefined}
    />
    ))}
  </>
  )}
  </QuestColumn>

        {/* Done Column */}
        <QuestColumn
          title={t('quests.done')}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          count={doneQuests.length}
          accentColor="border-emerald-600"
        >
          {doneQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Trophy className="h-8 w-8 mb-2 opacity-30" />
              <p>{t('quests.noQuests')}</p>
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

      {/* Order Interrupt Modal */}
      <OrderInterruptModal
        open={showOrderInterrupt}
        onOpenChange={setShowOrderInterrupt}
        orderQuest={pendingOrderQuest}
        currentQuest={currentInProgressQuest}
        onAccept={handleAcceptOrderInterrupt}
      />

      {/* Resume Prompt */}
      {showResumePrompt && (
        <ResumePrompt
          pausedQuest={lastPausedQuest}
          onResume={handleResumeFromPrompt}
          onDismiss={handleDismissResumePrompt}
        />
      )}
    </div>
  );
}
