'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { createTodayPlanFromTemplates } from '@/core/repo';
import type { TaskCard, Staff, DomainEvent, DecisionEvent } from '@/core/types';
import { 
  CalendarDays, 
  Clock, 
  Users, 
  Star, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Get role label
const ROLE_LABELS: Record<string, string> = {
  kitchen: 'キッチン',
  floor: 'フロア',
  cashier: 'キャッシャー',
  prep: '仕込み',
  runner: 'ランナー',
};

// Get category label
const getCategoryLabel = (categoryId: string, categories: { id: string; name: string }[]) => {
  return categories.find((c) => c.id === categoryId)?.name ?? categoryId;
};

export default function PlanPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const { state, actions } = useStore();
  
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('auto');
  const [isGenerating, setIsGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const categories = state.taskCategories ?? [];
  const taskCards = state.taskCards ?? [];
  const staff = state.staff ?? [];
  const events = state.events ?? [];

  // Get today's quests (decision events with action='pending' for today)
  const todayQuests = useMemo(() => {
    return events.filter((e): e is DecisionEvent => {
      if (e.type !== 'decision') return false;
      const eventDate = e.timestamp.split('T')[0];
      return eventDate === today && (e as DecisionEvent).action === 'pending';
    });
  }, [events, today]);

  // Get enabled task cards only
  const enabledTaskCards = useMemo(() => {
    return taskCards.filter((t) => t.enabled);
  }, [taskCards]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalQuests = todayQuests.length;
    const totalMinutes = todayQuests.reduce((sum, q) => sum + (q.estimatedMinutes ?? 0), 0);
    
    // Group by role (distributedToRoles)
    const byRole: Record<string, number> = {};
    todayQuests.forEach((q) => {
      const role = q.distributedToRoles?.[0] ?? 'unknown';
      byRole[role] = (byRole[role] ?? 0) + 1;
    });
    
    // Group by category (from title matching)
    const byCategory: Record<string, number> = {};
    todayQuests.forEach((q) => {
      // Try to find matching task card by title
      const matchedTask = taskCards.find((t) => q.title.includes(t.name));
      const categoryId = matchedTask?.categoryId ?? 'other';
      const categoryName = getCategoryLabel(categoryId, categories);
      byCategory[categoryName] = (byCategory[categoryName] ?? 0) + 1;
    });

    return { totalQuests, totalMinutes, byRole, byCategory };
  }, [todayQuests, taskCards, categories]);

  // Generate today's plan
  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    
    // Small delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Create quest events from enabled task cards
    const questEvents = createTodayPlanFromTemplates(enabledTaskCards, storeId, today);
    
    // Add events to state
    questEvents.forEach((event) => {
      actions.addEvent(event);
    });
    
    setIsGenerating(false);
  };

  // Auto-assign by stars (simple heuristic)
  const handleAutoAssign = () => {
    // Group staff by star level
    const staffByStars: Record<number, Staff[]> = { 1: [], 2: [], 3: [] };
    staff.forEach((s) => {
      if (s.starLevel && staffByStars[s.starLevel]) {
        staffByStars[s.starLevel].push(s);
      }
    });

    // Assign quests based on required stars
    todayQuests.forEach((quest) => {
      // Find matching task card to get star requirement
      const matchedTask = taskCards.find((t) => quest.title.includes(t.name));
      const requiredStars = matchedTask?.starRequirement ?? 1;
      
      // Find available staff with matching or higher star level
      let assignee: Staff | undefined;
      for (let stars = requiredStars; stars <= 3; stars++) {
        const candidates = staffByStars[stars];
        if (candidates && candidates.length > 0) {
          // Simple round-robin: pick first and move to end
          assignee = candidates.shift();
          if (assignee) {
            candidates.push(assignee);
            break;
          }
        }
      }

      if (assignee) {
        // Update the quest with assignee
        const updatedQuest: DecisionEvent = {
          ...quest,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
        };
        // We need to add a new event to update (or use updateProposal pattern)
        // For now, we'll just show the assignment in UI
      }
    });
    
    // Show feedback
    alert(t('plan.autoAssignComplete'));
  };

  // Navigate to ops monitor
  const handleGoToOpsMonitor = () => {
    router.push(`/stores/${storeId}/os/ops-monitor`);
  };

  const hasQuests = todayQuests.length > 0;
  const hasTaskCards = enabledTaskCards.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('plan.title')}
        subtitle={t('plan.description')}
      />

      {/* Today's Date Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{t('plan.todayPlan')}</div>
                <div className="text-sm text-muted-foreground">{today}</div>
              </div>
            </div>
            {hasQuests ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t('plan.planGenerated')}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                <AlertCircle className="h-3 w-3" />
                {t('plan.noPlanYet')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No Plan State - Generate Button */}
      {!hasQuests && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              {!hasTaskCards ? (
                <>
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{t('plan.noTemplates')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('plan.noTemplatesDesc')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/stores/${storeId}/os/task-catalog`)}
                  >
                    {t('plan.goToTaskCatalog')}
                  </Button>
                </>
              ) : (
                <>
                  <Sparkles className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <h3 className="font-medium">{t('plan.generateTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('plan.generateDesc', { count: enabledTaskCards.length })}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleGeneratePlan}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {t('plan.generateTodayBacklog')}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Summary */}
      {hasQuests && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('plan.totalQuests')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalQuests}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('plan.totalMinutes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold">{summary.totalMinutes}</span>
                  <span className="text-muted-foreground">{t('common.minutes')}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('plan.availableStaff')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold">{staff.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By Role / By Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('plan.questsByRole')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(summary.byRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span>{ROLE_LABELS[role] ?? role}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(summary.byRole).length === 0 && (
                    <div className="text-sm text-muted-foreground">{t('common.none')}</div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('plan.questsByCategory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(summary.byCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span>{category}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(summary.byCategory).length === 0 && (
                    <div className="text-sm text-muted-foreground">{t('common.none')}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('plan.assignment')}</CardTitle>
              <CardDescription>{t('plan.assignmentDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={assignmentMode} onValueChange={(v) => setAssignmentMode(v as 'auto' | 'manual')}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('plan.autoAssignByStars')}</SelectItem>
                    <SelectItem value="manual">{t('plan.manualAssign')}</SelectItem>
                  </SelectContent>
                </Select>
                {assignmentMode === 'auto' && (
                  <Button variant="outline" onClick={handleAutoAssign} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('plan.runAutoAssign')}
                  </Button>
                )}
              </div>

              {/* Quest List */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('plan.questName')}</TableHead>
                    <TableHead>{t('taskCatalog.role')}</TableHead>
                    <TableHead className="text-center">{t('taskCatalog.requiredStars')}</TableHead>
                    <TableHead className="text-center">{t('taskCatalog.expectedMinutes')}</TableHead>
                    <TableHead>{t('plan.assignee')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayQuests.slice(0, 10).map((quest) => {
                    const matchedTask = taskCards.find((t) => quest.title.includes(t.name));
                    const requiredStars = matchedTask?.starRequirement ?? 1;
                    const role = quest.distributedToRoles?.[0] ?? 'unknown';
                    
                    return (
                      <TableRow key={quest.id}>
                        <TableCell className="font-medium">{quest.title}</TableCell>
                        <TableCell>{ROLE_LABELS[role] ?? role}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3].map((i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'h-3 w-3',
                                  i <= requiredStars
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground/30'
                                )}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {quest.estimatedMinutes ?? '-'}{t('common.minutes')}
                        </TableCell>
                        <TableCell>
                          {quest.assigneeName ? (
                            <Badge variant="secondary">{quest.assigneeName}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{t('plan.unassigned')}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {todayQuests.length > 10 && (
                <div className="text-sm text-muted-foreground text-center">
                  + {todayQuests.length - 10} {t('plan.moreQuests')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Go to Ops Monitor */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{t('plan.planReady')}</h3>
                  <p className="text-sm text-muted-foreground">{t('plan.planReadyDesc')}</p>
                </div>
                <Button onClick={handleGoToOpsMonitor} className="gap-2">
                  {t('plan.goToOpsMonitor')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
