'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Target,
  Package,
  Users,
  TrendingUp,
  Play,
  Clock,
  DollarSign,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { TimeBand, BoxTemplate, TaskCard, Staff, DecisionEvent } from '@/core/types';
import { CalendarDays } from 'lucide-react';

// Step type
type Step = 'forecast' | 'boxes' | 'assignment' | 'projection';

// Time band labels
const TIME_BAND_LABELS: Record<TimeBand, string> = {
  lunch: 'ランチ',
  idle: 'アイドル',
  dinner: 'ディナー',
};

// Role labels
const ROLE_LABELS: Record<string, string> = {
  kitchen: 'キッチン',
  floor: 'フロア',
  cashier: 'レジ',
  prep: '仕込み',
  runner: 'ランナー',
  unknown: '未設定',
};

// Star display
const StarDisplay = ({ level }: { level: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: level }).map((_, i) => (
      <span key={i} className="text-yellow-500 text-xs">★</span>
    ))}
  </div>
);

export function PlanBuilder() {
  const { state, actions } = useStore();
  const { t, locale } = useI18n();
  const params = useParams();
  const routeStoreId = params?.storeId as string;
  const storeId = state.selectedStoreId || '1';
  const [hasGenerated, setHasGenerated] = useState(false);
  // Plan Date: defaults to today
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Get data from state
  const taskCards = state.taskCards?.length ? state.taskCards : [];
  const boxTemplates = state.boxTemplates?.length ? state.boxTemplates : [];
  const staff = state.staff?.filter((s) => s.storeId === storeId) || [];

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('forecast');

  // Step 1: Forecast & Target state
  const [forecastSales, setForecastSales] = useState(280000);
  const [targetSales, setTargetSales] = useState(250000);
  const [timeBandSplit, setTimeBandSplit] = useState({
    lunch: 40,
    idle: 15,
    dinner: 45,
  });

  // Step 2: Box selection state
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);

  // Step 3: Assignment state - boxId -> staffId mapping
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Calculate recommended boxes based on forecast
  const recommendedBoxes = useMemo(() => {
    return boxTemplates.filter((box) => {
      if (!box.enabled) return false;
      if (box.boxRule.type === 'always') return true;
      if (box.boxRule.type === 'salesRange' && box.boxRule.minSales) {
        return forecastSales >= box.boxRule.minSales;
      }
      return false;
    });
  }, [boxTemplates, forecastSales]);

  // Auto-select recommended boxes when moving to step 2
  const handleMoveToBoxes = () => {
    setSelectedBoxIds(recommendedBoxes.map((b) => b.id));
    setCurrentStep('boxes');
  };

  // Get tasks for selected boxes
  const selectedTasks = useMemo(() => {
    const taskIds = new Set<string>();
    selectedBoxIds.forEach((boxId) => {
      const box = boxTemplates.find((b) => b.id === boxId);
      if (box) {
        box.taskCardIds.forEach((tid) => taskIds.add(tid));
      }
    });
    return taskCards.filter((t) => taskIds.has(t.id) && t.enabled);
  }, [selectedBoxIds, boxTemplates, taskCards]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalMinutes = 0;
    let totalXP = 0;

    selectedTasks.forEach((task) => {
      let quantity = task.baseQuantity;
      if (task.quantityMode === 'byForecast') {
        quantity = task.baseQuantity + Math.round(task.coefficient * forecastSales);
      } else if (task.quantityMode === 'byOrders') {
        const estimatedOrders = Math.round(forecastSales / 1500);
        quantity = task.baseQuantity + Math.round(task.coefficient * estimatedOrders);
      }
      totalMinutes += task.standardMinutes * Math.max(1, Math.ceil(quantity / task.baseQuantity));
      totalXP += task.xpReward;
    });

    const requiredHours = totalMinutes / 60;
    const scheduledHours = staff.length * 6; // Mock: assume 6 hours average
    const hourlyWage = 1200; // Mock hourly wage
    const laborCost = scheduledHours * hourlyWage;

    return {
      totalMinutes,
      totalXP,
      requiredHours,
      scheduledHours,
      laborCost,
      riskLevel: requiredHours > scheduledHours * 0.9 ? 'high' : requiredHours > scheduledHours * 0.7 ? 'medium' : 'low',
    };
  }, [selectedTasks, forecastSales, staff.length]);

  // Check if all boxes are assigned
  const unassignedBoxes = useMemo(() => {
    return selectedBoxIds.filter((boxId) => !assignments[boxId]);
  }, [selectedBoxIds, assignments]);

  const canGenerate = unassignedBoxes.length === 0 && selectedBoxIds.length > 0;

  // Get eligible staff for a box based on tasks' roles and star requirements
  const getEligibleStaff = (box: BoxTemplate): Staff[] => {
    const boxTasks = taskCards.filter((t) => box.taskCardIds.includes(t.id));
    const requiredRoles = new Set(boxTasks.map((t) => t.role));
    const minStar = Math.max(...boxTasks.map((t) => t.starRequirement));

    return staff.filter((s) => {
      const staffStar = s.starLevel || 1;
      return staffStar >= minStar;
    });
  };

  // Generate Today Quests - creates pending DecisionEvents linked via refId
  const handleGenerate = () => {
    const now = new Date().toISOString();
    const storeId = state.selectedStoreId || '1';
    const today = planDate; // Use selected plan date

    // Track seen taskIds to avoid duplicate quests for the same task across boxes
    const seenTaskIds = new Set<string>();

    selectedBoxIds.forEach((boxId) => {
      const box = boxTemplates.find((b) => b.id === boxId);
      if (!box) return;

      const assignedStaffId = assignments[boxId];
      const assignedStaff = staff.find((s) => s.id === assignedStaffId);

      box.taskCardIds.forEach((taskId) => {
        if (seenTaskIds.has(taskId)) return; // skip duplicates
        seenTaskIds.add(taskId);

        const task = taskCards.find((t) => t.id === taskId);
        if (!task || !task.enabled) return;

        // Calculate quantity based on mode
        let quantity = task.baseQuantity;
        if (task.quantityMode === 'byForecast') {
          quantity = task.baseQuantity + Math.round(task.coefficient * (forecastSales / 10000));
        } else if (task.quantityMode === 'byOrders') {
          const estimatedOrders = Math.round(forecastSales / 1500);
          quantity = task.baseQuantity + Math.round(task.coefficient * estimatedOrders);
        }

        const questId = `quest-${boxId}-${taskId}-${Date.now()}`;
        const deadline = new Date(Date.now() + task.standardMinutes * 60 * 1000 * 2).toISOString();

        const questEvent: DecisionEvent = {
          id: questId,
          type: 'decision',
          storeId,
          timestamp: now,
          timeBand: box.timeBand,
          proposalId: `plan-${taskId}-${today}`,
          action: 'pending',
          title: task.name,
          description: `${task.name} - 数量: ${quantity}`,
          distributedToRoles: [task.role],
          // Assignee from Prompt6 pattern
          assigneeId: assignedStaffId || undefined,
          assigneeName: assignedStaff?.name || undefined,
          priority: task.starRequirement >= 3 ? 'high' : task.starRequirement >= 2 ? 'medium' : 'low',
          deadline,
          estimatedMinutes: task.standardMinutes,
          quantity,
          source: 'system',
          // refId-based linking (replaces title matching)
          refId: task.id,
          targetValue: quantity,
          // Business date for day-based filtering
          businessDate: planDate,
        };

        actions.addEvent(questEvent);
      });
    });

    // Mark as generated - show CTA to start execution
    setHasGenerated(true);
  };

  // Step indicator component
  const StepIndicator = () => {
    const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
      { key: 'forecast', label: t('planBuilder.step1'), icon: <Target className="h-4 w-4" /> },
      { key: 'boxes', label: t('planBuilder.step2'), icon: <Package className="h-4 w-4" /> },
      { key: 'assignment', label: t('planBuilder.step3'), icon: <Users className="h-4 w-4" /> },
      { key: 'projection', label: t('planBuilder.step4'), icon: <TrendingUp className="h-4 w-4" /> },
    ];
    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <button
              onClick={() => setCurrentStep(step.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                currentStep === step.key
                  ? 'bg-primary text-primary-foreground'
                  : index < currentIndex
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {index < currentIndex ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                step.icon
              )}
              <span className="text-sm font-medium">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Empty state: no task cards or no box templates
  const hasNoData = taskCards.length === 0 || boxTemplates.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">{t('planBuilder.title')}</h1>
        <p className="text-muted-foreground">{t('planBuilder.subtitle')}</p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {hasNoData ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-medium">{t('plan.noTemplates')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('plan.noTemplatesDesc')}</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => actions.seedDemoData()}>
                    {t('taskCatalog.loadDemo')}
                  </Button>
                  <span className="text-sm text-muted-foreground">{t('common.or')}</span>
                  <Link href={`/stores/${routeStoreId}/os/task-catalog`}>
                    <Button>{t('plan.goToTaskCatalog')}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
          <>
          <StepIndicator />

          {/* Step 1: Forecast & Target */}
          {currentStep === 'forecast' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {t('planBuilder.forecastTarget')}
                </CardTitle>
                <CardDescription>{t('planBuilder.forecastTargetDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Date picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {t('planBuilder.planDate')}
                  </Label>
                  <Input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="max-w-[220px]"
                  />
                  {planDate !== new Date().toISOString().slice(0, 10) && (
                    <p className="text-xs text-amber-600 font-medium">
                      {t('planBuilder.futureDate')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>{t('planBuilder.forecastSales')}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={forecastSales}
                        onChange={(e) => setForecastSales(Number(e.target.value))}
                        className="pl-9"
                        step={10000}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('planBuilder.forecastSalesHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('planBuilder.targetSales')}</Label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={targetSales}
                        onChange={(e) => setTargetSales(Number(e.target.value))}
                        className="pl-9"
                        step={10000}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('planBuilder.targetSalesHint')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>{t('planBuilder.timeBandSplit')}</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['lunch', 'idle', 'dinner'] as TimeBand[]).map((band) => (
                      <div key={band} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{TIME_BAND_LABELS[band]}</span>
                          <span className="text-sm font-medium">{timeBandSplit[band]}%</span>
                        </div>
                        <Input
                          type="range"
                          min={0}
                          max={100}
                          value={timeBandSplit[band]}
                          onChange={(e) => setTimeBandSplit({ ...timeBandSplit, [band]: Number(e.target.value) })}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {((forecastSales * timeBandSplit[band]) / 100).toLocaleString()}円
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {forecastSales > targetSales && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">
                      {t('planBuilder.overTarget')}: +{((forecastSales - targetSales) / 1000).toFixed(0)}千円
                      ({t('planBuilder.incentivePoolEligible')})
                    </span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleMoveToBoxes}>
                    {t('planBuilder.next')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Box Selection */}
          {currentStep === 'boxes' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('planBuilder.boxSelection')}
                </CardTitle>
                <CardDescription>{t('planBuilder.boxSelectionDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg">
                  <span className="text-sm">
                    {t('planBuilder.recommendedBoxes')}: {recommendedBoxes.length}{t('planBuilder.boxesUnit')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBoxIds(recommendedBoxes.map((b) => b.id))}
                  >
                    {t('planBuilder.selectRecommended')}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {boxTemplates.filter((b) => b.enabled).map((box) => {
                    const isSelected = selectedBoxIds.includes(box.id);
                    const isRecommended = recommendedBoxes.some((r) => r.id === box.id);
                    const boxTasks = taskCards.filter((t) => box.taskCardIds.includes(t.id));
                    const totalMinutes = boxTasks.reduce((sum, t) => sum + t.standardMinutes, 0);

                    return (
                      <div
                        key={box.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBoxIds(selectedBoxIds.filter((id) => id !== box.id));
                          } else {
                            setSelectedBoxIds([...selectedBoxIds, box.id]);
                          }
                        }}
                        className={cn(
                          'border rounded-lg p-4 cursor-pointer transition-all',
                          isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={isSelected} />
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {box.name}
                                {isRecommended && (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                    {t('planBuilder.recommended')}
                                  </Badge>
                                )}
                              </div>
                              {box.description && (
                                <p className="text-xs text-muted-foreground">{box.description}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">{TIME_BAND_LABELS[box.timeBand]}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span>{boxTasks.length} {t('planBuilder.tasksUnit')}</span>
                          <span>{totalMinutes} {t('planBuilder.minutes')}</span>
                          {box.boxRule.type === 'salesRange' && box.boxRule.minSales && (
                            <span>{(box.boxRule.minSales / 10000).toFixed(0)}万円+</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">
                    {t('planBuilder.selectedSummary')}: {selectedBoxIds.length}{t('planBuilder.boxesUnit')}, {selectedTasks.length}{t('planBuilder.tasksUnit')}, {totals.totalMinutes}{t('planBuilder.minutes')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('forecast')}>
                    {t('planBuilder.back')}
                  </Button>
                  <Button onClick={() => setCurrentStep('assignment')} disabled={selectedBoxIds.length === 0}>
                    {t('planBuilder.next')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Assignment */}
          {currentStep === 'assignment' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('planBuilder.assignment')}
                </CardTitle>
                <CardDescription>{t('planBuilder.assignmentDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {unassignedBoxes.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {unassignedBoxes.length}{t('planBuilder.unassignedWarning')}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  {selectedBoxIds.map((boxId) => {
                    const box = boxTemplates.find((b) => b.id === boxId);
                    if (!box) return null;

                    const eligibleStaff = getEligibleStaff(box);
                    const isAssigned = !!assignments[boxId];
                    const boxTasks = taskCards.filter((t) => box.taskCardIds.includes(t.id));
                    const maxStar = Math.max(...boxTasks.map((t) => t.starRequirement));

                    return (
                      <div
                        key={boxId}
                        className={cn(
                          'border rounded-lg p-4',
                          !isAssigned && 'border-red-300 bg-red-50/50'
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {box.name}
                              <Badge variant="outline">{TIME_BAND_LABELS[box.timeBand]}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{boxTasks.length}{t('planBuilder.tasksUnit')}</span>
                              <span>|</span>
                              <span>{t('planBuilder.requiredStar')}: </span>
                              <StarDisplay level={maxStar} />
                            </div>
                          </div>
                          <Select
                            value={assignments[boxId] || ''}
                            onValueChange={(value) => setAssignments({ ...assignments, [boxId]: value })}
                          >
                            <SelectTrigger className={cn('w-48', !isAssigned && 'border-red-400')}>
                              <SelectValue placeholder={t('planBuilder.selectStaff')} />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleStaff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{s.name}</span>
                                    <StarDisplay level={s.starLevel || 1} />
                                  </div>
                                </SelectItem>
                              ))}
                              {eligibleStaff.length === 0 && (
                                <div className="text-xs text-muted-foreground p-2">
                                  {t('planBuilder.noEligibleStaff')}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('boxes')}>
                    {t('planBuilder.back')}
                  </Button>
                  <Button onClick={() => setCurrentStep('projection')}>
                    {t('planBuilder.next')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Projection */}
          {currentStep === 'projection' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('planBuilder.projection')}
                </CardTitle>
                <CardDescription>{t('planBuilder.projectionDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">{totals.totalMinutes}</div>
                    <div className="text-xs text-muted-foreground">{t('planBuilder.totalMinutes')}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">{totals.requiredHours.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">{t('planBuilder.requiredHours')}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">{totals.scheduledHours}h</div>
                    <div className="text-xs text-muted-foreground">{t('planBuilder.scheduledHours')}</div>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg text-center',
                    totals.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                    totals.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  )}>
                    <div className="text-2xl font-bold">
                      {totals.riskLevel === 'high' ? t('planBuilder.riskHigh') :
                       totals.riskLevel === 'medium' ? t('planBuilder.riskMedium') :
                       t('planBuilder.riskLow')}
                    </div>
                    <div className="text-xs">{t('planBuilder.delayRisk')}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('planBuilder.laborUtilization')}</span>
                    <span>{Math.round((totals.requiredHours / totals.scheduledHours) * 100)}%</span>
                  </div>
                  <Progress value={Math.min(100, (totals.requiredHours / totals.scheduledHours) * 100)} />
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('planBuilder.projectedSales')}</div>
                    <div className="text-xl font-bold">{forecastSales.toLocaleString()}円</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('planBuilder.projectedLabor')}</div>
                    <div className="text-xl font-bold">{totals.laborCost.toLocaleString()}円</div>
                  </div>
                </div>

                {forecastSales > targetSales && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                      <Zap className="h-4 w-4" />
                      {t('planBuilder.incentivePool')}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">{t('planBuilder.overAchievement')}</div>
                        <div className="font-bold text-green-700">+{(forecastSales - targetSales).toLocaleString()}円</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('planBuilder.poolRate')}</div>
                        <div className="font-bold">75%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('planBuilder.estimatedPool')}</div>
                        <div className="font-bold text-green-700">{Math.round((forecastSales - targetSales) * 0.75).toLocaleString()}円</div>
                      </div>
                    </div>
                  </div>
                )}

                {!canGenerate && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{t('planBuilder.cannotGenerate')}</span>
                  </div>
                )}

                {!hasGenerated ? (
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep('assignment')}>
                      {t('planBuilder.back')}
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={!canGenerate}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {t('planBuilder.generate')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t('planBuilder.generateSuccess')}</span>
                    </div>
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setHasGenerated(false);
                          setCurrentStep('forecast');
                          setSelectedBoxIds([]);
                          setAssignments({});
                        }}
                      >
                        {t('planBuilder.buildAnother')}
                      </Button>
                      <Link href={`/stores/${routeStoreId}/floor/todo`}>
                        <Button className="gap-2">
                          <ChevronRight className="h-4 w-4" />
                          {t('planBuilder.startExecution')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
