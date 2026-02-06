'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/state/store';
import { useI18n, useLocaleDateFormat } from '@/i18n/I18nProvider';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  FileText,
  Zap,
  Lock,
  CircleDashed,
} from 'lucide-react';
import type { DayPlan, DayPlanStatus } from '@/core/types';

// Status display configuration
const STATUS_CONFIG: Record<DayPlanStatus, { label: string; labelEn: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', labelEn: 'Draft', color: 'bg-muted text-muted-foreground', icon: <CircleDashed className="h-3 w-3" /> },
  review: { label: 'Review', labelEn: 'Review', color: 'bg-yellow-100 text-yellow-800', icon: <FileText className="h-3 w-3" /> },
  confirmed: { label: 'Confirmed', labelEn: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  live: { label: 'Live', labelEn: 'Live', color: 'bg-green-100 text-green-800', icon: <Zap className="h-3 w-3" /> },
  closed: { label: 'Closed', labelEn: 'Closed', color: 'bg-foreground/10 text-foreground/60', icon: <Lock className="h-3 w-3" /> },
};

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function getWeekdayLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short' });
}

export function PlanningCalendar() {
  const { state, actions } = useStore();
  const { t, locale } = useI18n();
  const { formatCurrency } = useLocaleDateFormat();
  const router = useRouter();
  const params = useParams();
  const storeId = (params?.storeId as string) || state.selectedStoreId || '1';

  // Month navigation
  const [viewMonth, setViewMonth] = useState(() => {
    // Default to next month for planning
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 > 11 ? 0 : now.getMonth() + 1 };
  });

  // If next month wraps around year:
  const viewYear = viewMonth.month === 0 && new Date().getMonth() === 11
    ? new Date().getFullYear() + 1
    : viewMonth.year;

  const monthDays = useMemo(
    () => getMonthDays(viewYear, viewMonth.month),
    [viewYear, viewMonth.month]
  );

  const dayPlans = state.dayPlans || [];
  const boxTemplates = state.boxTemplates || [];
  const taskCards = state.taskCards || [];

  const getDayPlan = (date: string): DayPlan | undefined =>
    dayPlans.find((dp) => dp.date === date && dp.storeId === storeId);

  // Compute task total minutes for a day plan
  const computeTaskMinutes = (plan: DayPlan): number => {
    const seenTasks = new Set<string>();
    let total = 0;
    plan.selectedBoxIds.forEach((boxId) => {
      const box = boxTemplates.find((b) => b.id === boxId);
      if (!box) return;
      box.taskCardIds.forEach((tid) => {
        if (seenTasks.has(tid)) return;
        seenTasks.add(tid);
        const tc = taskCards.find((t) => t.id === tid);
        if (tc && tc.enabled && !tc.isPeak) total += tc.standardMinutes;
      });
    });
    return total;
  };

  const computeLaborHours = (plan: DayPlan): number => {
    return plan.laborSlots.reduce((sum, s) => sum + s.plannedHours, 0);
  };

  const computeLaborRate = (plan: DayPlan): number | null => {
    if (!plan.forecastSales || plan.forecastSales === 0) return null;
    const laborHours = computeLaborHours(plan);
    const avgWage = 1200;
    const laborCost = laborHours * avgWage;
    return (laborCost / plan.forecastSales) * 100;
  };

  // Navigation
  const goToPrevMonth = () => {
    setViewMonth((prev) => {
      const m = prev.month === 0 ? 11 : prev.month - 1;
      const y = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year: y, month: m };
    });
  };

  const goToNextMonth = () => {
    setViewMonth((prev) => {
      const m = prev.month === 11 ? 0 : prev.month + 1;
      const y = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year: y, month: m };
    });
  };

  // Confirm entire month
  const handleConfirmMonth = () => {
    monthDays.forEach((day) => {
      const dateStr = day.toISOString().split('T')[0];
      const plan = getDayPlan(dateStr);
      if (plan && (plan.status === 'draft' || plan.status === 'review')) {
        actions.updateDayPlanStatus(dateStr, 'confirmed');
      }
    });
  };

  // Count plan statuses
  const statusCounts = useMemo(() => {
    const counts: Record<DayPlanStatus, number> = { draft: 0, review: 0, confirmed: 0, live: 0, closed: 0 };
    monthDays.forEach((day) => {
      const dateStr = day.toISOString().split('T')[0];
      const plan = getDayPlan(dateStr);
      if (plan) {
        counts[plan.status]++;
      }
    });
    return counts;
  }, [monthDays, dayPlans, storeId]);

  const monthLabel = new Date(viewYear, viewMonth.month).toLocaleDateString(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: 'long' }
  );

  // Weekday headers
  const weekdayHeaders = locale === 'ja'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fill leading blanks for calendar grid
  const firstDayOfWeek = monthDays[0]?.getDay() ?? 0;
  const trailingBlanks = (7 - ((firstDayOfWeek + monthDays.length) % 7)) % 7;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              {t('planning.title')}
            </h1>
            <p className="text-muted-foreground">{t('planning.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleConfirmMonth}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('planning.confirmMonth')}
            </Button>
          </div>
        </div>

        {/* Status summary */}
        <div className="flex items-center gap-3 mt-4">
          {(Object.keys(STATUS_CONFIG) as DayPlanStatus[]).map((status) => (
            <div key={status} className="flex items-center gap-1.5 text-sm">
              <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', STATUS_CONFIG[status].color)}>
                {STATUS_CONFIG[status].icon}
                <span>{STATUS_CONFIG[status].labelEn}</span>
              </div>
              <span className="text-muted-foreground">{statusCounts[status]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold">{monthLabel}</span>
        <Button variant="ghost" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {weekdayHeaders.map((wd) => (
            <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-2">
              {wd}
            </div>
          ))}

          {/* Leading blanks */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`blank-start-${i}`} className="min-h-[120px]" />
          ))}

          {/* Day cells */}
          {monthDays.map((day) => {
            const dateStr = day.toISOString().split('T')[0];
            const plan = getDayPlan(dateStr);
            const isToday = dateStr === today;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <button
                key={dateStr}
                onClick={() => router.push(`/stores/${storeId}/os/planning/${dateStr}`)}
                className={cn(
                  'min-h-[120px] border rounded-lg p-2 text-left transition-all hover:ring-2 hover:ring-primary/30 hover:border-primary/50 cursor-pointer flex flex-col',
                  isToday && 'ring-2 ring-primary/40 border-primary/60',
                  isWeekend && 'bg-muted/30',
                  !plan && 'border-dashed border-muted-foreground/20'
                )}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-sm font-medium',
                    isToday && 'text-primary font-bold',
                    isWeekend && !isToday && 'text-muted-foreground'
                  )}>
                    {day.getDate()}
                  </span>
                  {plan && (
                    <div className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium', STATUS_CONFIG[plan.status].color)}>
                      {STATUS_CONFIG[plan.status].icon}
                      <span>{STATUS_CONFIG[plan.status].labelEn}</span>
                    </div>
                  )}
                </div>

                {/* Plan details */}
                {plan ? (
                  <div className="flex-1 flex flex-col gap-0.5 text-[11px]">
                    <div className="text-muted-foreground">
                      {t('planning.sales')}: {plan.forecastSales > 0 ? `${(plan.forecastSales / 10000).toFixed(0)}${locale === 'ja' ? '万' : 'k'}` : '--'}
                    </div>
                    <div className="text-muted-foreground">
                      {t('planning.labor')}: {computeLaborHours(plan) > 0 ? `${computeLaborHours(plan).toFixed(1)}h` : '--'}
                    </div>
                    <div className="text-muted-foreground">
                      {t('planning.tasks')}: {computeTaskMinutes(plan) > 0 ? `${computeTaskMinutes(plan)}${t('common.minutes')}` : '--'}
                    </div>
                    {computeLaborRate(plan) !== null && (
                      <div className={cn(
                        'text-[10px] font-medium mt-auto',
                        (computeLaborRate(plan) ?? 0) > 35 ? 'text-red-600' : 'text-green-600'
                      )}>
                        {t('planning.laborRate')}: {computeLaborRate(plan)?.toFixed(1)}%
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/50">{t('planning.noplan')}</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Trailing blanks */}
          {Array.from({ length: trailingBlanks }).map((_, i) => (
            <div key={`blank-end-${i}`} className="min-h-[120px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
