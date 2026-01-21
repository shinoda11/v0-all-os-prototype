'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  ChefHat,
  Target,
  Scale,
  Zap,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatPercent, formatHours } from '@/i18n/format';
import type { Proposal, ShiftSummary, PrepMetrics, TimeBand } from '@/core/types';
import type { LaborGuardrailSummary } from '@/core/derive';

// Operation mode affects proposal weights
export type OperationMode = 'sales' | 'loss' | 'ops';

interface TimeBandForecast {
  band: TimeBand;
  label: string;
  salesForecast: number;
  weight: number; // percentage
}

interface TodayBriefingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Today's data
  forecastSales: number;
  timeBandForecasts: TimeBandForecast[];
  shiftSummary: ShiftSummary;
  guardrailSummary: LaborGuardrailSummary;
  prepMetrics: PrepMetrics;
  initialTodos: Proposal[];
  // Callbacks
  onDistributeTodos: (todos: Proposal[], mode: OperationMode) => void;
  onClose: () => void;
}

export function TodayBriefingModal({
  open,
  onOpenChange,
  forecastSales,
  timeBandForecasts,
  shiftSummary,
  guardrailSummary,
  prepMetrics,
  initialTodos,
  onDistributeTodos,
  onClose,
}: TodayBriefingModalProps) {
  const { t, locale } = useI18n();
  const [operationMode, setOperationMode] = useState<OperationMode>('sales');
  const [isDistributing, setIsDistributing] = useState(false);

  // Filter todos for next 2 hours (prep-related)
  const next2HourTodos = useMemo(() => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    return initialTodos.filter((todo) => {
      if (!todo.deadline) return true; // Include if no deadline
      const deadline = new Date(todo.deadline);
      return deadline <= twoHoursLater;
    }).slice(0, 5); // Max 5 initial todos
  }, [initialTodos]);

  const handleDistribute = async () => {
    setIsDistributing(true);
    // Simulate distribution delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    onDistributeTodos(next2HourTodos, operationMode);
    setIsDistributing(false);
    onClose();
  };

  const operationModes = [
    {
      value: 'sales' as OperationMode,
      label: t('briefing.modeSales'),
      description: t('briefing.modeSalesDesc'),
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      value: 'loss' as OperationMode,
      label: t('briefing.modeLoss'),
      description: t('briefing.modeLossDesc'),
      icon: Scale,
      color: 'text-blue-600',
    },
    {
      value: 'ops' as OperationMode,
      label: t('briefing.modeOps'),
      description: t('briefing.modeOpsDesc'),
      icon: Zap,
      color: 'text-purple-600',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="h-5 w-5 text-primary" />
            {t('briefing.title')}
          </DialogTitle>
          <DialogDescription>
            {t('briefing.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. Sales Forecast */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {t('briefing.salesForecast')}
            </h3>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-3xl font-bold">
                    {formatCurrency(forecastSales, locale)}
                  </span>
                  <Badge variant="outline">{t('briefing.dailyTarget')}</Badge>
                </div>
                <div className="space-y-2">
                  {timeBandForecasts.map((band) => (
                    <div key={band.band} className="flex items-center gap-3">
                      <span className="w-16 text-sm text-muted-foreground">
                        {band.label}
                      </span>
                      <Progress value={band.weight} className="flex-1 h-2" />
                      <span className="w-24 text-sm text-right">
                        {formatCurrency(band.salesForecast, locale)}
                      </span>
                      <span className="w-12 text-xs text-muted-foreground text-right">
                        {formatPercent(band.weight, locale, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 2. Shift Summary (Read-only) */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {t('briefing.shiftSummary')}
            </h3>
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('briefing.plannedHours')}
                    </div>
                    <div className="text-2xl font-semibold">
                      {formatHours(shiftSummary.plannedHours, locale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('briefing.skillMix')}
                    </div>
                    <div className="flex items-center gap-2">
                      {[3, 2, 1].map((level) => {
                        const count = shiftSummary.skillMix[`star${level}` as keyof typeof shiftSummary.skillMix];
                        return (
                          <div key={level} className="flex items-center gap-1">
                            <div className="flex">
                              {Array.from({ length: level }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-3 w-3 fill-yellow-400 text-yellow-400"
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('briefing.roleMix')}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <ChefHat className="h-3 w-3" />
                        {shiftSummary.roleMix.kitchen}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {shiftSummary.roleMix.floor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {shiftSummary.roleMix.delivery}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 3. Labor Guardrail */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              {t('briefing.laborGuardrail')}
            </h3>
            <Card className={cn(
              guardrailSummary.status === 'danger' && 'border-red-200 bg-red-50/50',
              guardrailSummary.status === 'caution' && 'border-yellow-200 bg-yellow-50/50',
              guardrailSummary.status === 'safe' && 'border-green-200 bg-green-50/50'
            )}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Good scenario */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 font-medium">
                      {t('cockpit.goodScenario')}
                    </span>
                    <span className="text-green-600">
                      {formatCurrency(guardrailSummary.goodRateSales, locale)} @ {formatPercent(guardrailSummary.selectedBracket.goodRate * 100, locale)}
                    </span>
                  </div>
                  {/* Bad scenario */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-600 font-medium">
                      {t('cockpit.badScenario')}
                    </span>
                    <span className="text-red-600">
                      {formatCurrency(guardrailSummary.badRateSales, locale)} @ {formatPercent(guardrailSummary.selectedBracket.badRate * 100, locale)}
                    </span>
                  </div>
                  {/* Status indicator */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">{t('briefing.currentStatus')}</span>
                    <Badge
                      variant={
                        guardrailSummary.status === 'danger'
                          ? 'destructive'
                          : guardrailSummary.status === 'caution'
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {guardrailSummary.status === 'danger'
                        ? t('cockpit.danger')
                        : guardrailSummary.status === 'caution'
                          ? t('cockpit.caution')
                          : t('cockpit.normal')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 4. Initial Prep Todos (Next 2 hours) */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('briefing.initialTodos')}
              <Badge variant="outline" className="ml-auto">
                {next2HourTodos.length} {t('briefing.items')}
              </Badge>
            </h3>
            <Card>
              <CardContent className="pt-4">
                {next2HourTodos.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {t('briefing.noTodos')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {next2HourTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{todo.title}</span>
                        </div>
                        <Badge
                          variant={
                            todo.priority === 'critical'
                              ? 'destructive'
                              : todo.priority === 'high'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {todo.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* 5. Operation Mode Selection */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              {t('briefing.operationMode')}
            </h3>
            <RadioGroup
              value={operationMode}
              onValueChange={(v) => setOperationMode(v as OperationMode)}
              className="grid grid-cols-3 gap-3"
            >
              {operationModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = operationMode === mode.value;
                return (
                  <Label
                    key={mode.value}
                    htmlFor={mode.value}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    )}
                  >
                    <RadioGroupItem
                      value={mode.value}
                      id={mode.value}
                      className="sr-only"
                    />
                    <Icon className={cn('h-6 w-6', mode.color)} />
                    <span className="font-medium text-sm">{mode.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center">
                      {mode.description}
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          </section>
        </div>

        {/* CTAs */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="bg-transparent">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDistribute}
            disabled={isDistributing}
            className="gap-2"
          >
            {isDistributing ? (
              <>
                <span className="animate-spin">⏳</span>
                {t('briefing.distributing')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('briefing.distributeTodos')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
