'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { useStateSubscription } from '@/state/eventBus';
import {
  selectActiveTodos,
  selectCompletedTodos,
  selectCurrentStore,
} from '@/core/selectors';
import type { DecisionEvent, Staff, BoxTemplate, TaskCard } from '@/core/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Package } from 'lucide-react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Users,
  Timer,
  Star,
  RefreshCw,
  AlertOctagon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Ops Monitor - Manager Quest Management
 * 
 * Shows all quests with assignees, progress, and delays.
 * Allows reassignment of quests to different staff.
 */

// Timer display for elapsed time
function ElapsedTimer({ startTime }: { startTime: string }) {
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
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;

  if (hours > 0) {
    return (
      <span className="tabular-nums font-medium text-primary">
        {hours}h {String(displayMinutes).padStart(2, '0')}m
      </span>
    );
  }
  return (
    <span className="tabular-nums font-medium text-primary">
      {minutes}m
    </span>
  );
}

// Check if quest is delayed (past deadline or over estimated time)
function isQuestDelayed(quest: DecisionEvent): boolean {
  if (quest.action !== 'started') return false;
  
  // Check deadline
  if (quest.deadline && new Date(quest.deadline) < new Date()) {
    return true;
  }
  
  // Check if over estimated time
  if (quest.estimatedMinutes && quest.timestamp) {
    const elapsedMinutes = (Date.now() - new Date(quest.timestamp).getTime()) / 60000;
    if (elapsedMinutes > quest.estimatedMinutes * 1.5) { // 50% over estimate = delayed
      return true;
    }
  }
  
  return false;
}

// Quest Card for Ops Monitor
interface OpsQuestCardProps {
  quest: DecisionEvent;
  status: 'not_started' | 'in_progress' | 'delayed' | 'completed';
  staffMap: Map<string, Staff>;
  onReassign: (quest: DecisionEvent) => void;
}

function OpsQuestCard({ quest, status, staffMap, onReassign }: OpsQuestCardProps) {
  const { t } = useI18n();
  
  const assignee = quest.assigneeId ? staffMap.get(quest.assigneeId) : null;
  const assigneeName = quest.assigneeName || assignee?.name || t('opsMonitor.unassigned');
  const starLevel = assignee?.starLevel ?? 1;
  
  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        status === 'not_started' && 'bg-card border-border',
        status === 'in_progress' && 'bg-primary/5 border-primary',
        status === 'delayed' && 'bg-red-50 border-red-400',
        status === 'completed' && 'bg-muted/50 border-muted'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className={cn(
          'font-medium text-sm',
          status === 'completed' && 'line-through text-muted-foreground'
        )}>
          {quest.title}
        </h4>
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs shrink-0',
            quest.priority === 'critical' && 'bg-red-100 text-red-800 border-red-200',
            quest.priority === 'high' && 'bg-amber-100 text-amber-800 border-amber-200',
            quest.priority === 'medium' && 'bg-blue-100 text-blue-800 border-blue-200',
            quest.priority === 'low' && 'bg-muted text-muted-foreground'
          )}
        >
          {quest.priority}
        </Badge>
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(
          'font-medium',
          !quest.assigneeId && 'text-amber-600'
        )}>
          {assigneeName}
        </span>
        {assignee && (
          <span className="flex items-center gap-0.5">
            {[1, 2, 3].map((i) => (
              <Star
                key={i}
                className={cn(
                  'h-3 w-3',
                  i <= starLevel ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                )}
              />
            ))}
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
        {quest.deadline && (
          <span className={cn(
            'flex items-center gap-1',
            status === 'delayed' && 'text-red-600 font-medium'
          )}>
            <Clock className="h-3 w-3" />
            {formatDeadline(quest.deadline)}
          </span>
        )}
        {quest.estimatedMinutes && (
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {quest.estimatedMinutes}min
          </span>
        )}
      </div>

      {/* Elapsed time for in-progress/delayed */}
      {(status === 'in_progress' || status === 'delayed') && quest.timestamp && (
        <div className="flex items-center gap-2 text-sm mb-2">
          <span className="text-muted-foreground">{t('opsMonitor.elapsed')}:</span>
          <ElapsedTimer startTime={quest.timestamp} />
          {status === 'delayed' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      )}

      {/* Completion results */}
      {status === 'completed' && quest.actualMinutes && (
        <div className="text-xs text-muted-foreground mb-2">
          実績: {quest.actualMinutes}min
          {quest.qualityStatus && (
            <Badge 
              variant="outline" 
              className={cn(
                'ml-2',
                quest.qualityStatus === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              )}
            >
              {quest.qualityStatus.toUpperCase()}
            </Badge>
          )}
        </div>
      )}

      {/* Reassign button (only for not_started, in_progress, delayed) */}
      {status !== 'completed' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReassign(quest)}
          className="w-full h-8 text-xs gap-1 mt-1"
        >
          <RefreshCw className="h-3 w-3" />
          {t('opsMonitor.reassign')}
        </Button>
      )}
    </div>
  );
}

// Column Component
interface OpsColumnProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  accentColor: string;
  children: React.ReactNode;
}

function OpsColumn({ title, icon, count, accentColor, children }: OpsColumnProps) {
  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      <div className={cn(
        'flex items-center gap-2 p-3 rounded-t-lg border-b-2',
        accentColor
      )}>
        {icon}
        <span className="font-bold text-sm">{title}</span>
        <Badge variant="secondary" className="ml-auto">{count}</Badge>
      </div>
      <div className="flex-1 p-3 space-y-2 bg-muted/30 rounded-b-lg min-h-[300px] max-h-[500px] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// Bottleneck Card
interface BottleneckCardProps {
  type: 'delayed' | 'not_started';
  quest: DecisionEvent;
  onReassign: (quest: DecisionEvent) => void;
}

function BottleneckCard({ type, quest, onReassign }: BottleneckCardProps) {
  const { t } = useI18n();
  
  return (
    <div className={cn(
      'p-3 rounded-lg border flex items-center justify-between gap-4',
      type === 'delayed' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-full',
          type === 'delayed' ? 'bg-red-100' : 'bg-amber-100'
        )}>
          {type === 'delayed' ? (
            <AlertOctagon className="h-4 w-4 text-red-600" />
          ) : (
            <Clock className="h-4 w-4 text-amber-600" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium">{quest.title}</div>
          <div className="text-xs text-muted-foreground">
            {type === 'delayed' ? t('opsMonitor.bottleneck.delayed') : t('opsMonitor.bottleneck.notStarted')}
            {quest.assigneeName && ` - ${quest.assigneeName}`}
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onReassign(quest)}
        className="gap-1 shrink-0"
      >
        <RefreshCw className="h-3 w-3" />
        {t('opsMonitor.reassign')}
      </Button>
    </div>
  );
}

// Reassign Modal
interface ReassignModalProps {
  quest: DecisionEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: Staff[];
  onConfirm: (questId: string, newAssigneeId: string) => void;
}

function ReassignModal({ quest, open, onOpenChange, staffList, onConfirm }: ReassignModalProps) {
  const { t } = useI18n();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  useEffect(() => {
    if (quest) {
      setSelectedStaffId('');
    }
  }, [quest]);

  if (!quest) return null;

  const handleConfirm = () => {
    if (selectedStaffId) {
      onConfirm(quest.id, selectedStaffId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t('opsMonitor.reassignModal.title')}
          </DialogTitle>
          <DialogDescription>{quest.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Assignee */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">
              {t('opsMonitor.reassignModal.currentAssignee')}:
            </span>
            <span className="font-medium">
              {quest.assigneeName || t('opsMonitor.unassigned')}
            </span>
          </div>

          {/* New Assignee Selection */}
          <div className="space-y-2">
            <Label>{t('opsMonitor.reassignModal.newAssignee')}</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('opsMonitor.reassignModal.newAssignee')} />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex items-center gap-2">
                      <span>{staff.name}</span>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-3 w-3',
                              i <= staff.starLevel ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="h-11">
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedStaffId}
            className="h-11 gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {t('opsMonitor.reassignModal.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Box Performance Card
interface BoxStatsProps {
  box: BoxTemplate;
  tasks: TaskCard[];
  allQuests: DecisionEvent[];
}

function BoxStatsCard({ box, tasks, allQuests }: BoxStatsProps) {
  const { t } = useI18n();
  
  // Find quests that might be related to this box's tasks
  const boxTaskNames = tasks
    .filter((task) => box.taskCardIds.includes(task.id))
    .map((task) => task.name);
  
  // Match quests by task name (simplified matching)
  const relatedQuests = allQuests.filter((q) => 
    boxTaskNames.some((name) => q.title.includes(name) || q.description?.includes(name))
  );
  
  const completedQuests = relatedQuests.filter((q) => q.action === 'completed');
  const totalTasks = box.taskCardIds.length;
  const completedCount = completedQuests.length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / Math.max(totalTasks, relatedQuests.length)) * 100) : 0;
  
  // Delayed count
  const delayedCount = completedQuests.filter((q) => {
    if (!q.deadline || !q.completedAt) return false;
    return new Date(q.completedAt) > new Date(q.deadline);
  }).length;
  
  // Average duration
  const durations = completedQuests
    .filter((q) => q.actualMinutes !== undefined)
    .map((q) => q.actualMinutes!);
  const avgDuration = durations.length > 0 
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
    : null;

  return (
    <Card className={cn('min-w-[200px]', !box.enabled && 'opacity-50')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            {box.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{box.timeBand}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('opsMonitor.completionRate')}</span>
            <span className="font-bold">{completionRate}%</span>
          </div>
          <Progress 
            value={completionRate} 
            className={cn(
              'h-2',
              completionRate >= 80 ? '[&>div]:bg-emerald-500' :
              completionRate >= 50 ? '[&>div]:bg-amber-500' :
              '[&>div]:bg-red-500'
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div>
            <div className={cn('font-bold tabular-nums', delayedCount > 0 ? 'text-red-600' : 'text-emerald-600')}>
              {delayedCount}
            </div>
            <div className="text-muted-foreground">{t('opsMonitor.delayed')}</div>
          </div>
          <div>
            <div className="font-bold tabular-nums">
              {avgDuration !== null ? `${avgDuration}m` : '-'}
            </div>
            <div className="text-muted-foreground">{t('opsMonitor.avgTime')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Staff Performance Table
interface StaffPerformance {
  staffId: string;
  staffName: string;
  starLevel: number;
  completedCount: number;
  avgMinutes: number | null;
  qualityNgCount: number;
  onTimeRate: number;
}

function StaffPerformanceTable({ 
  staffPerformance 
}: { 
  staffPerformance: StaffPerformance[];
}) {
  const { t } = useI18n();

  if (staffPerformance.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('opsMonitor.noStaffData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('opsMonitor.staff')}</TableHead>
            <TableHead className="text-center">{t('opsMonitor.completed')}</TableHead>
            <TableHead className="text-center">{t('opsMonitor.avgTime')}</TableHead>
            <TableHead className="text-center">{t('opsMonitor.onTimeRate')}</TableHead>
            <TableHead className="text-center">{t('opsMonitor.qualityNg')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffPerformance.map((perf) => (
            <TableRow key={perf.staffId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{perf.staffName}</span>
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-3 w-3',
                          i <= perf.starLevel ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                        )}
                      />
                    ))}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center tabular-nums font-medium">{perf.completedCount}</TableCell>
              <TableCell className="text-center tabular-nums">
                {perf.avgMinutes !== null ? `${perf.avgMinutes}m` : '-'}
              </TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant="outline" 
                  className={cn(
                    'tabular-nums',
                    perf.onTimeRate >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    perf.onTimeRate >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  )}
                >
                  {perf.onTimeRate}%
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {perf.qualityNgCount > 0 ? (
                  <Badge variant="destructive" className="tabular-nums">
                    {perf.qualityNgCount}
                  </Badge>
                ) : (
                  <span className="text-emerald-600">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// Summary Card
function SummaryCard({ 
  notStarted, 
  inProgress, 
  delayed, 
  completed, 
  total 
}: { 
  notStarted: number; 
  inProgress: number; 
  delayed: number;
  completed: number; 
  total: number;
}) {
  const { t } = useI18n();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('opsMonitor.summary')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Progress Circle */}
          <div className="relative h-14 w-14 shrink-0">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray={`${percentage * 1.51} 151`} className="text-primary" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {percentage}%
            </span>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-muted-foreground">{notStarted}</div>
              <div className="text-xs text-muted-foreground">{t('opsMonitor.notStarted')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">{inProgress}</div>
              <div className="text-xs text-muted-foreground">{t('opsMonitor.inProgress')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{delayed}</div>
              <div className="text-xs text-muted-foreground">{t('opsMonitor.delayed')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-600">{completed}</div>
              <div className="text-xs text-muted-foreground">{t('opsMonitor.completed')}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Page Component
export default function OpsMonitorPage() {
  const { t, locale } = useI18n();
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const [reassigningQuest, setReassigningQuest] = useState<DecisionEvent | null>(null);

  // Subscribe to state updates
  useStateSubscription(['todo', 'decision', 'prep']);

  // Get all quests
  const activeTodos = selectActiveTodos(state, undefined);
  const completedTodos = selectCompletedTodos(state);
  const allQuests = useMemo(() => [...activeTodos, ...completedTodos], [activeTodos, completedTodos]);

  // Box templates and tasks
  const boxTemplates = state.boxTemplates || [];
  const taskCards = state.taskCards || [];

  // Staff map for lookups
  const storeStaff = useMemo(() => 
    state.staff.filter((s) => s.storeId === state.selectedStoreId),
    [state.staff, state.selectedStoreId]
  );
  const staffMap = useMemo(() => 
    new Map(storeStaff.map((s) => [s.id, s])),
    [storeStaff]
  );

  // Calculate staff performance
  const staffPerformance = useMemo<StaffPerformance[]>(() => {
    return storeStaff.map((s) => {
      const staffCompleted = completedTodos.filter((q) => q.assigneeId === s.id);
      const durations = staffCompleted
        .filter((q) => q.actualMinutes !== undefined)
        .map((q) => q.actualMinutes!);
      const avgMinutes = durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
        : null;
      
      const qualityNgCount = staffCompleted.filter((q) => q.qualityStatus === 'ng').length;
      
      const onTimeCount = staffCompleted.filter((q) => {
        if (!q.deadline || !q.completedAt) return true;
        return new Date(q.completedAt) <= new Date(q.deadline);
      }).length;
      const onTimeRate = staffCompleted.length > 0 
        ? Math.round((onTimeCount / staffCompleted.length) * 100) 
        : 100;
      
      return {
        staffId: s.id,
        staffName: s.name,
        starLevel: s.starLevel,
        completedCount: staffCompleted.length,
        avgMinutes,
        qualityNgCount,
        onTimeRate,
      };
    }).sort((a, b) => b.completedCount - a.completedCount);
  }, [storeStaff, completedTodos]);

  // Categorize quests
  const notStartedQuests = useMemo(() => 
    activeTodos.filter((q) => q.action === 'pending' || q.action === 'approved'),
    [activeTodos]
  );
  
  const inProgressQuests = useMemo(() => 
    activeTodos.filter((q) => q.action === 'started' && !isQuestDelayed(q)),
    [activeTodos]
  );
  
  const delayedQuests = useMemo(() => 
    activeTodos.filter((q) => q.action === 'started' && isQuestDelayed(q)),
    [activeTodos]
  );
  
  const doneQuests = useMemo(() => 
    completedTodos.slice(0, 20),
    [completedTodos]
  );

  // Bottlenecks: Top 3 (prioritize delayed, then not started with high priority)
  const bottlenecks = useMemo(() => {
    const items: Array<{ type: 'delayed' | 'not_started'; quest: DecisionEvent }> = [];
    
    // Add delayed quests first
    delayedQuests.forEach((q) => items.push({ type: 'delayed', quest: q }));
    
    // Add high priority not started
    notStartedQuests
      .filter((q) => q.priority === 'critical' || q.priority === 'high')
      .forEach((q) => items.push({ type: 'not_started', quest: q }));
    
    return items.slice(0, 3);
  }, [delayedQuests, notStartedQuests]);

  const totalQuests = notStartedQuests.length + inProgressQuests.length + delayedQuests.length + doneQuests.length;

  // Handle reassign
  const handleReassign = (questId: string, newAssigneeId: string) => {
    const newStaff = staffMap.get(newAssigneeId);
    if (!newStaff) return;
    
    // Find the quest and create an updated event
    const quest = [...activeTodos, ...completedTodos].find((q) => q.id === questId);
    if (!quest) return;
    
    // Create a new event with updated assignee
    const updatedEvent: DecisionEvent = {
      ...quest,
      id: `${quest.proposalId}-reassigned-${Date.now()}`,
      timestamp: new Date().toISOString(),
      assigneeId: newAssigneeId,
      assigneeName: newStaff.name,
    };
    
    actions.addEvent(updatedEvent);
  };

  if (!currentStore) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('opsMonitor.title')}
        subtitle={`${currentStore.name} - ${new Date().toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', day: 'numeric' })}`}
      />

      {/* Summary */}
      <SummaryCard
        notStarted={notStartedQuests.length}
        inProgress={inProgressQuests.length}
        delayed={delayedQuests.length}
        completed={doneQuests.length}
        total={totalQuests}
      />

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('opsMonitor.bottlenecks')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bottlenecks.map((item, idx) => (
              <BottleneckCard
                key={`${item.type}-${item.quest.id}-${idx}`}
                type={item.type}
                quest={item.quest}
                onReassign={setReassigningQuest}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Box Performance */}
      {boxTemplates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('opsMonitor.boxPerformance')}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {boxTemplates.filter((b) => b.enabled).map((box) => (
              <BoxStatsCard
                key={box.id}
                box={box}
                tasks={taskCards}
                allQuests={allQuests}
              />
            ))}
          </div>
        </div>
      )}

      {/* Staff Performance */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('opsMonitor.staffPerformance')}
        </h2>
        <StaffPerformanceTable staffPerformance={staffPerformance} />
      </div>

      {/* 4-Column Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Not Started */}
        <OpsColumn
          title={t('opsMonitor.notStarted')}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          count={notStartedQuests.length}
          accentColor="border-muted-foreground"
        >
          {notStartedQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm">
              <Clock className="h-6 w-6 mb-2 opacity-30" />
              <p>No pending quests</p>
            </div>
          ) : (
            notStartedQuests.map((quest) => (
              <OpsQuestCard
                key={quest.id}
                quest={quest}
                status="not_started"
                staffMap={staffMap}
                onReassign={setReassigningQuest}
              />
            ))
          )}
        </OpsColumn>

        {/* In Progress */}
        <OpsColumn
          title={t('opsMonitor.inProgress')}
          icon={<Play className="h-4 w-4 text-primary" />}
          count={inProgressQuests.length}
          accentColor="border-primary"
        >
          {inProgressQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm">
              <Play className="h-6 w-6 mb-2 opacity-30" />
              <p>No active quests</p>
            </div>
          ) : (
            inProgressQuests.map((quest) => (
              <OpsQuestCard
                key={quest.id}
                quest={quest}
                status="in_progress"
                staffMap={staffMap}
                onReassign={setReassigningQuest}
              />
            ))
          )}
        </OpsColumn>

        {/* Delayed */}
        <OpsColumn
          title={t('opsMonitor.delayed')}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          count={delayedQuests.length}
          accentColor="border-red-500"
        >
          {delayedQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-emerald-600 text-sm">
              <CheckCircle className="h-6 w-6 mb-2 opacity-50" />
              <p>No delays</p>
            </div>
          ) : (
            delayedQuests.map((quest) => (
              <OpsQuestCard
                key={quest.id}
                quest={quest}
                status="delayed"
                staffMap={staffMap}
                onReassign={setReassigningQuest}
              />
            ))
          )}
        </OpsColumn>

        {/* Completed */}
        <OpsColumn
          title={t('opsMonitor.completed')}
          icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
          count={doneQuests.length}
          accentColor="border-emerald-600"
        >
          {doneQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm">
              <CheckCircle className="h-6 w-6 mb-2 opacity-30" />
              <p>No completed quests</p>
            </div>
          ) : (
            doneQuests.map((quest) => (
              <OpsQuestCard
                key={quest.id}
                quest={quest}
                status="completed"
                staffMap={staffMap}
                onReassign={setReassigningQuest}
              />
            ))
          )}
        </OpsColumn>
      </div>

      {/* Reassign Modal */}
      <ReassignModal
        quest={reassigningQuest}
        open={!!reassigningQuest}
        onOpenChange={(open) => !open && setReassigningQuest(null)}
        staffList={storeStaff}
        onConfirm={handleReassign}
      />
    </div>
  );
}
