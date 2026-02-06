'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  ArrowLeft,
  Target,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TimeBand, DayPlan, LaborSlot, BoxTemplate, DayPlanStatus } from '@/core/types';

type Tab = 'forecast' | 'boxes' | 'labor' | 'projection';

const TAB_CONFIG: { key: Tab; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'forecast', labelKey: 'dayPlan.tabForecast', icon: <Target className="h-4 w-4" /> },
  { key: 'boxes', labelKey: 'dayPlan.tabBoxes', icon: <Package className="h-4 w-4" /> },
  { key: 'labor', labelKey: 'dayPlan.tabLabor', icon: <Users className="h-4 w-4" /> },
  { key: 'projection', labelKey: 'dayPlan.tabProjection', icon: <TrendingUp className="h-4 w-4" /> },
];

const TIME_BAND_LABELS: Record<TimeBand, string> = {
  all: 'All',
  lunch: 'Lunch',
  idle: 'Idle',
  dinner: 'Dinner',
};

const ROLE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  floor: 'Floor',
  cashier: 'Cashier',
  prep: 'Prep',
  runner: 'Runner',
  unknown: 'Other',
};

const STATUS_CONFIG: Record<DayPlanStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  review: { label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  live: { label: 'Live', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', color: 'bg-foreground/10 text-foreground/60' },
};

export function DayPlanEditor() {
  const { state, actions } = useStore();
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams();
  const storeId = (params?.storeId as string) || state.selectedStoreId || '1';
  const dateParam = params?.date as string; // YYYY-MM-DD

  const boxTemplates = state.boxTemplates || [];
  const taskCards = state.taskCards || [];

  // Load existing day plan or create default
  const existingPlan = (state.dayPlans || []).find(
    (dp) => dp.date === dateParam && dp.storeId === storeId
  );

  // Local state for editing
  const [activeTab, setActiveTab] = useState<Tab>('forecast');
  const [forecastSales, setForecastSales] = useState(existingPlan?.forecastSales ?? 0);
  const [targetSales, setTargetSales] = useState(existingPlan?.targetSales ?? 0);
  const [timeBandSplit, setTimeBandSplit] = useState(
    existingPlan?.timeBandSplit ?? { lunch: 40, idle: 15, dinner: 45 }
  );
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>(existingPlan?.selectedBoxIds ?? []);
  const [laborSlots, setLaborSlots] = useState<LaborSlot[]>(existingPlan?.laborSlots ?? []);
  const [status, setStatus] = useState<DayPlanStatus>(existingPlan?.status ?? 'draft');

  // Sync from existing plan when it changes (e.g., after Go Live)
  useEffect(() => {
    if (existingPlan) {
      setStatus(existingPlan.status);
    }
  }, [existingPlan?.status]);

  // Auto-save on changes
  const savePlan = () => {
    const plan: DayPlan = {
      date: dateParam,
      storeId,
      status,
      forecastSales,
      targetSales,
      timeBandSplit,
      selectedBoxIds,
      laborSlots,
      updatedAt: new Date().toISOString(),
    };
    actions.upsertDayPlan(plan);
  };

  // Save when switching tabs or significant changes
  useEffect(() => {
    const timeout = setTimeout(savePlan, 500);
    return () => clearTimeout(timeout);
  }, [forecastSales, targetSales, timeBandSplit, selectedBoxIds, laborSlots, status]);

  // Recommended boxes based on forecast
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

  // Selected tasks from boxes
  const selectedTasks = useMemo(() => {
    const taskIds = new Set<string>();
    selectedBoxIds.forEach((boxId) => {
      const box = boxTemplates.find((b) => b.id === boxId);
      if (box) box.taskCardIds.forEach((tid) => taskIds.add(tid));
    });
    return taskCards.filter((t) => taskIds.has(t.id) && t.enabled && !t.isPeak);
  }, [selectedBoxIds, boxTemplates, taskCards]);

  // Projection totals
  const totals = useMemo(() => {
    let totalMinutes = 0;
    selectedTasks.forEach((task) => {
      let qty = task.baseQuantity;
      if (task.quantityMode === 'byForecast') {
        qty = task.baseQuantity + Math.round(task.coefficient * (forecastSales / 10000));
      } else if (task.quantityMode === 'byOrders') {
        const orders = Math.round(forecastSales / 1500);
        qty = task.baseQuantity + Math.round(task.coefficient * orders);
      }
      totalMinutes += task.standardMinutes * Math.max(1, Math.ceil(qty / task.baseQuantity));
    });

    const requiredHours = totalMinutes / 60;
    const plannedHours = laborSlots.reduce((s, ls) => s + ls.plannedHours, 0);
    const avgWage = 1200;
    const laborCost = plannedHours * avgWage;
    const laborRate = forecastSales > 0 ? (laborCost / forecastSales) * 100 : 0;

    return { totalMinutes, requiredHours, plannedHours, laborCost, laborRate };
  }, [selectedTasks, forecastSales, laborSlots]);

  // Labor slot management
  const addLaborSlot = () => {
    setLaborSlots([
      ...laborSlots,
      {
        id: `slot-${Date.now()}`,
        timeBand: 'lunch',
        role: 'kitchen',
        starLevel: 1,
        plannedHours: 4,
      },
    ]);
  };

  const updateLaborSlot = (id: string, updates: Partial<LaborSlot>) => {
    setLaborSlots(laborSlots.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeLaborSlot = (id: string) => {
    setLaborSlots(laborSlots.filter((s) => s.id !== id));
  };

  // Actions
  const handleConfirm = () => {
    setStatus('confirmed');
    const plan: DayPlan = {
      date: dateParam,
      storeId,
      status: 'confirmed',
      forecastSales,
      targetSales,
      timeBandSplit,
      selectedBoxIds,
      laborSlots,
      updatedAt: new Date().toISOString(),
    };
    actions.upsertDayPlan(plan);
  };

  const handleGoLive = () => {
    // First save as confirmed if needed
    const plan: DayPlan = {
      date: dateParam,
      storeId,
      status: 'confirmed',
      forecastSales,
      targetSales,
      timeBandSplit,
      selectedBoxIds,
      laborSlots,
      updatedAt: new Date().toISOString(),
    };
    actions.upsertDayPlan(plan);
    // Then go live (generates quests)
    actions.goLiveDayPlan(dateParam);
    setStatus('live');
  };

  const isLiveOrClosed = status === 'live' || status === 'closed';

  // Date display
  const dateDisplay = new Date(dateParam + 'T00:00:00').toLocaleDateString(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/stores/${storeId}/os/planning`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('planning.backToCalendar')}
          </Button>
          <Badge className={cn('text-xs', STATUS_CONFIG[status].color)}>
            {STATUS_CONFIG[status].label}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold">{dateDisplay}</h1>
        <p className="text-muted-foreground">{t('dayPlan.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="border-b px-6">
        <div className="flex gap-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">

          {/* TAB: Forecast */}
          {activeTab === 'forecast' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {t('dayPlan.forecastTitle')}
                </CardTitle>
                <CardDescription>{t('dayPlan.forecastDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>{t('planBuilder.forecastSales')}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={forecastSales || ''}
                        onChange={(e) => setForecastSales(Number(e.target.value))}
                        className="pl-9"
                        step={10000}
                        disabled={isLiveOrClosed}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('planBuilder.targetSales')}</Label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={targetSales || ''}
                        onChange={(e) => setTargetSales(Number(e.target.value))}
                        className="pl-9"
                        step={10000}
                        disabled={isLiveOrClosed}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>{t('planBuilder.timeBandSplit')}</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['lunch', 'idle', 'dinner'] as const).map((band) => (
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
                          disabled={isLiveOrClosed}
                        />
                        {forecastSales > 0 && (
                          <p className="text-xs text-muted-foreground text-right">
                            {((forecastSales * timeBandSplit[band]) / 100).toLocaleString()}{locale === 'ja' ? '円' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {forecastSales > targetSales && targetSales > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">
                      {t('planBuilder.overTarget')}: +{((forecastSales - targetSales) / 1000).toFixed(0)}{'k'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB: Boxes */}
          {activeTab === 'boxes' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('dayPlan.boxesTitle')}
                </CardTitle>
                <CardDescription>{t('dayPlan.boxesDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {forecastSales > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                    <span className="text-sm">
                      {t('planBuilder.recommendedBoxes')}: {recommendedBoxes.length}{t('planBuilder.boxesUnit')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBoxIds(recommendedBoxes.map((b) => b.id))}
                      disabled={isLiveOrClosed}
                    >
                      {t('planBuilder.selectRecommended')}
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {boxTemplates.filter((b) => b.enabled).map((box) => {
                    const isSelected = selectedBoxIds.includes(box.id);
                    const isRecommended = recommendedBoxes.some((r) => r.id === box.id);
                    const boxTasks = taskCards.filter((tc) => box.taskCardIds.includes(tc.id));
                    const totalMin = boxTasks.reduce((s, tc) => s + tc.standardMinutes, 0);

                    return (
                      <div
                        key={box.id}
                        onClick={() => {
                          if (isLiveOrClosed) return;
                          if (isSelected) {
                            setSelectedBoxIds(selectedBoxIds.filter((id) => id !== box.id));
                          } else {
                            setSelectedBoxIds([...selectedBoxIds, box.id]);
                          }
                        }}
                        className={cn(
                          'border rounded-lg p-4 transition-all',
                          isLiveOrClosed ? 'opacity-70' : 'cursor-pointer',
                          isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={isSelected} disabled={isLiveOrClosed} />
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
                          <span>{totalMin} {t('planBuilder.minutes')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {boxTemplates.filter((b) => b.enabled).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('dayPlan.noBoxTemplates')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB: Labor Slots */}
          {activeTab === 'labor' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('dayPlan.laborTitle')}
                </CardTitle>
                <CardDescription>{t('dayPlan.laborDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {laborSlots.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    {t('dayPlan.noSlots')}
                  </div>
                )}

                <div className="space-y-3">
                  {laborSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Select
                        value={slot.timeBand}
                        onValueChange={(v) => updateLaborSlot(slot.id, { timeBand: v as TimeBand })}
                        disabled={isLiveOrClosed}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['lunch', 'idle', 'dinner'] as const).map((tb) => (
                            <SelectItem key={tb} value={tb}>{TIME_BAND_LABELS[tb]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={slot.role}
                        onValueChange={(v) => updateLaborSlot(slot.id, { role: v })}
                        disabled={isLiveOrClosed}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={String(slot.starLevel)}
                        onValueChange={(v) => updateLaborSlot(slot.id, { starLevel: Number(v) as 1 | 2 | 3 })}
                        disabled={isLiveOrClosed}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3].map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              {'★'.repeat(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={slot.plannedHours}
                          onChange={(e) => updateLaborSlot(slot.id, { plannedHours: Number(e.target.value) })}
                          className="w-20"
                          min={0}
                          max={12}
                          step={0.5}
                          disabled={isLiveOrClosed}
                        />
                        <span className="text-sm text-muted-foreground">h</span>
                      </div>

                      {!isLiveOrClosed && (
                        <Button variant="ghost" size="sm" onClick={() => removeLaborSlot(slot.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {!isLiveOrClosed && (
                  <Button variant="outline" onClick={addLaborSlot} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dayPlan.addSlot')}
                  </Button>
                )}

                {laborSlots.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('dayPlan.totalPlannedHours')}</span>
                      <span className="font-medium">{totals.plannedHours.toFixed(1)}h</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB: Projection */}
          {activeTab === 'projection' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('dayPlan.projectionTitle')}
                </CardTitle>
                <CardDescription>{t('dayPlan.projectionDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Metrics grid */}
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
                    <div className="text-2xl font-bold">{totals.plannedHours.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">{t('dayPlan.plannedHours')}</div>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg text-center',
                    totals.laborRate > 35 ? 'bg-red-100 text-red-700' :
                    totals.laborRate > 28 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  )}>
                    <div className="text-2xl font-bold">
                      {forecastSales > 0 ? `${totals.laborRate.toFixed(1)}%` : '--'}
                    </div>
                    <div className="text-xs">{t('dayPlan.projectedLaborRate')}</div>
                  </div>
                </div>

                {/* Utilization bar */}
                {totals.plannedHours > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('planBuilder.laborUtilization')}</span>
                      <span>{Math.round((totals.requiredHours / totals.plannedHours) * 100)}%</span>
                    </div>
                    <Progress value={Math.min(100, (totals.requiredHours / totals.plannedHours) * 100)} />
                  </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('planBuilder.projectedSales')}</div>
                    <div className="text-xl font-bold">{forecastSales > 0 ? `${forecastSales.toLocaleString()}${locale === 'ja' ? '円' : ''}` : '--'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('planBuilder.projectedLabor')}</div>
                    <div className="text-xl font-bold">{totals.laborCost > 0 ? `${totals.laborCost.toLocaleString()}${locale === 'ja' ? '円' : ''}` : '--'}</div>
                  </div>
                </div>

                {/* Warnings */}
                {selectedBoxIds.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{t('dayPlan.noBoxesSelected')}</span>
                  </div>
                )}

                {laborSlots.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{t('dayPlan.noLaborSlots')}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  {!isLiveOrClosed && status !== 'confirmed' && (
                    <Button variant="outline" onClick={handleConfirm} disabled={selectedBoxIds.length === 0}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('dayPlan.confirmPlan')}
                    </Button>
                  )}

                  {!isLiveOrClosed && (
                    <Button
                      onClick={handleGoLive}
                      disabled={selectedBoxIds.length === 0}
                      className="bg-green-600 hover:bg-green-700 text-white ml-auto"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {t('dayPlan.goLive')}
                    </Button>
                  )}

                  {isLiveOrClosed && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 w-full">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">{t('dayPlan.isLive')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
