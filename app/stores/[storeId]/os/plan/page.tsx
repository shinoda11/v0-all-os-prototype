'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import type { TaskCard, Staff, DomainEvent, DecisionEvent } from '@/core/types';
import { createTodayPlanFromTemplates } from '@/core/repo';
import { Calendar, Play, Users, Clock, Package, Star, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split('T')[0];

// Check if quest events exist for a specific date
const getQuestsForDate = (events: DomainEvent[], date: string): DecisionEvent[] => {
  return events.filter(e => 
    e.type === 'decision' && 
    e.id.includes(date) &&
    (e as DecisionEvent).action === 'pending'
  ) as DecisionEvent[];
};

// Role display names
const ROLE_NAMES: Record<string, string> = {
  kitchen: 'キッチン',
  floor: 'フロア',
  cashier: 'レジ',
  prep: '仕込み',
  runner: 'デリバリー',
  unknown: 'その他',
};

// Star rating component
function StarRating({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i <= level ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

export default function PlanPage() {
  const { t, locale } = useI18n();
  const { state, actions } = useStore();
  const params = useParams();
  const storeId = params.storeId as string;
  
  const taskCards = state.taskCards ?? [];
  const taskCategories = state.taskCategories ?? [];
  const staff = state.staff ?? [];
  const events = state.events ?? [];
  
  const today = getTodayDate();
  const [selectedDate] = useState(today);
  
  // Get existing quests for today
  const todayQuests = useMemo(() => getQuestsForDate(events, selectedDate), [events, selectedDate]);
  const hasQuestsForToday = todayQuests.length > 0;
  
  // Get enabled task cards
  const enabledTaskCards = taskCards.filter(t => t.enabled);
  
  // Calculate summary stats
  const summary = useMemo(() => {
    const totalTasks = enabledTaskCards.length;
    const totalMinutes = enabledTaskCards.reduce((sum, t) => sum + t.standardMinutes, 0);
    const totalXP = enabledTaskCards.reduce((sum, t) => sum + t.xpReward, 0);
    
    // Group by category
    const byCategory: Record<string, { count: number; minutes: number }> = {};
    enabledTaskCards.forEach(task => {
      const catId = task.categoryId;
      if (!byCategory[catId]) byCategory[catId] = { count: 0, minutes: 0 };
      byCategory[catId].count++;
      byCategory[catId].minutes += task.standardMinutes;
    });
    
    // Group by role
    const byRole: Record<string, { count: number; minutes: number }> = {};
    enabledTaskCards.forEach(task => {
      if (!byRole[task.role]) byRole[task.role] = { count: 0, minutes: 0 };
      byRole[task.role].count++;
      byRole[task.role].minutes += task.standardMinutes;
    });
    
    return { totalTasks, totalMinutes, totalXP, byCategory, byRole };
  }, [enabledTaskCards]);

  const getCategoryName = (categoryId: string) => {
    return taskCategories.find(c => c.id === categoryId)?.name ?? categoryId;
  };

  // Generate today's plan from templates
  const handleGeneratePlan = () => {
    if (enabledTaskCards.length === 0) {
      alert(t('plan.noTemplates'));
      return;
    }
    
    // Create quest events from task templates
    const questEvents = createTodayPlanFromTemplates(enabledTaskCards, storeId, selectedDate);
    
    // Add events to store
    questEvents.forEach(event => {
      actions.addEvent(event);
    });
  };

  // Auto-assign quests by staff stars
  const handleAutoAssign = () => {
    // Get on-duty staff (for demo, use all staff)
    const availableStaff = staff.filter(s => s.starLevel >= 1);
    
    if (availableStaff.length === 0) {
      alert(t('plan.noStaff'));
      return;
    }
    
    // Simple assignment: match quest star requirements with staff stars
    todayQuests.forEach(quest => {
      // Find matching staff by role and stars (simple heuristic)
      const matchingStaff = availableStaff.filter(s => {
        // For demo, just pick anyone with enough stars
        return s.starLevel >= 1;
      });
      
      if (matchingStaff.length > 0) {
        // Round-robin assignment
        const assignee = matchingStaff[Math.floor(Math.random() * matchingStaff.length)];
        
        // Update the quest with assignment
        const updatedEvent: DomainEvent = {
          ...quest,
          assignedTo: assignee.id,
          assignedAt: new Date().toISOString(),
        };
        
        actions.updateEvent(updatedEvent);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('plan.title')}</h1>
          <p className="text-muted-foreground">{t('plan.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2 py-1.5 px-3">
            <Calendar className="h-4 w-4" />
            {new Date(selectedDate).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Badge>
        </div>
      </div>

      {/* Status Card */}
      <Card className={cn(
        'border-2',
        hasQuestsForToday ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'
      )}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {hasQuestsForToday ? (
                <>
                  <div className="p-2 rounded-full bg-emerald-100">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-800">{t('plan.planGenerated')}</div>
                    <div className="text-sm text-emerald-700">
                      {todayQuests.length} {t('plan.questsCreated')}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-full bg-amber-100">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-800">{t('plan.noPlanYet')}</div>
                    <div className="text-sm text-amber-700">
                      {enabledTaskCards.length} {t('plan.templatesAvailable')}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasQuestsForToday ? (
                <>
                  <Button variant="outline" onClick={handleAutoAssign} className="gap-2">
                    <Zap className="h-4 w-4" />
                    {t('plan.autoAssign')}
                  </Button>
                  <Link href={`/stores/${storeId}/os/ops-monitor`}>
                    <Button className="gap-2">
                      {t('plan.viewOpsMonitor')}
                    </Button>
                  </Link>
                </>
              ) : (
                <Button onClick={handleGeneratePlan} className="gap-2" disabled={enabledTaskCards.length === 0}>
                  <Play className="h-4 w-4" />
                  {t('plan.generateBacklog')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.totalTasks}</div>
                <div className="text-sm text-muted-foreground">{t('plan.totalQuests')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.totalMinutes}m</div>
                <div className="text-sm text-muted-foreground">{t('plan.totalMinutes')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.totalXP}</div>
                <div className="text-sm text-muted-foreground">{t('plan.totalXP')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{staff.length}</div>
                <div className="text-sm text-muted-foreground">{t('plan.availableStaff')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Category */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('plan.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('taskCatalog.category')}</TableHead>
                  <TableHead className="text-right">{t('plan.questCount')}</TableHead>
                  <TableHead className="text-right">{t('plan.minutes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.byCategory).map(([catId, data]) => (
                  <TableRow key={catId}>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(catId)}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{data.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{data.minutes}m</TableCell>
                  </TableRow>
                ))}
                {Object.keys(summary.byCategory).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      {t('plan.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('plan.byRole')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('taskCatalog.role')}</TableHead>
                  <TableHead className="text-right">{t('plan.questCount')}</TableHead>
                  <TableHead className="text-right">{t('plan.minutes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.byRole).map(([role, data]) => (
                  <TableRow key={role}>
                    <TableCell>{ROLE_NAMES[role] ?? role}</TableCell>
                    <TableCell className="text-right tabular-nums">{data.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{data.minutes}m</TableCell>
                  </TableRow>
                ))}
                {Object.keys(summary.byRole).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      {t('plan.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Today's Quests (if generated) */}
      {hasQuestsForToday && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('plan.todaysQuests')}</CardTitle>
            <CardDescription>{t('plan.questsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('taskCatalog.name')}</TableHead>
                  <TableHead>{t('plan.assignedTo')}</TableHead>
                  <TableHead className="text-right">{t('taskCatalog.expectedMinutes')}</TableHead>
                  <TableHead>{t('plan.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayQuests.map(quest => {
                  const assignedStaff = staff.find(s => s.id === (quest as any).assignedTo);
                  return (
                    <TableRow key={quest.id}>
                      <TableCell className="font-medium">{quest.title}</TableCell>
                      <TableCell>
                        {assignedStaff ? (
                          <div className="flex items-center gap-2">
                            <span>{assignedStaff.name}</span>
                            <StarRating level={assignedStaff.starLevel ?? 1} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t('plan.unassigned')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quest.estimatedMinutes ?? '-'}m
                      </TableCell>
                      <TableCell>
                        <Badge variant={assignedStaff ? 'default' : 'secondary'}>
                          {assignedStaff ? t('plan.assigned') : t('plan.pending')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
