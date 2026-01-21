'use client';

import React, { useState, useMemo } from 'react';
import { OSHeader } from '@/components/OSHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatCurrency, formatPercent, formatHours, formatNumber } from '@/i18n/format';
import {
  selectCurrentStore,
  selectWeeklyLaborMetrics,
} from '@/core/selectors';
import { evaluateDailyGuardrail, type DailyGuardrailResult } from '@/core/derive';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Clock,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Calendar,
  Lightbulb,
  CheckCircle,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { WeeklyLaborMetrics } from '@/core/types';

// Target values (would come from store config in production)
const TARGETS = {
  laborRate: 25.0,
  star3Ratio: 0.3,
  star2Ratio: 0.4,
  star1Ratio: 0.3,
};

interface LaborProposal {
  id: string;
  type: 'bad-days-warning' | 'skill-shortage' | 'timeband-focus' | 'overstaffing';
  title: string;
  description: string;
  timeBand?: 'lunch' | 'idle' | 'dinner';
  affectedDays?: string[];
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

interface DailyGuardrailInfo {
  date: string;
  dayLabel: string;
  dayOfWeek: number;
  guardrail: DailyGuardrailResult | null;
}

// Generate labor improvement proposals based on guardrail analysis
function generateProposals(
  metrics: WeeklyLaborMetrics,
  dailyGuardrails: DailyGuardrailInfo[]
): LaborProposal[] {
  const proposals: LaborProposal[] = [];
  
  // Count BAD and CAUTION days
  const badDays = dailyGuardrails.filter(d => d.guardrail?.status === 'bad');
  const cautionDays = dailyGuardrails.filter(d => d.guardrail?.status === 'caution');
  const goodDays = dailyGuardrails.filter(d => d.guardrail?.status === 'good');
  
  // 1. BAD days warning (highest priority)
  if (badDays.length > 0) {
    const avgDeltaToBad = badDays.reduce((sum, d) => sum + (d.guardrail?.deltaToBad ?? 0), 0) / badDays.length;
    proposals.push({
      id: 'bad-days-1',
      type: 'bad-days-warning',
      title: `${badDays.length}日がBADゾーン`,
      description: `${badDays.map(d => d.dayLabel).join('・')}曜日で人件費率がBADラインを超過。売上見込み下振れ時の対応を準備してください。`,
      affectedDays: badDays.map(d => d.dayLabel),
      impact: `平均${(avgDeltaToBad * 100).toFixed(1)}pt超過 → 次週は休憩調整・早上がり検討`,
      priority: 'high',
    });
  }
  
  // 2. CAUTION days focus (if no BAD days or as secondary)
  if (cautionDays.length >= 2 && proposals.length < 2) {
    // Identify which time band is most problematic
    // For simplicity, assume weekdays = lunch risk, weekends = dinner risk
    const weekdayCaution = cautionDays.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
    const weekendCaution = cautionDays.filter(d => d.dayOfWeek === 0 || d.dayOfWeek === 6);
    
    if (weekdayCaution.length > weekendCaution.length) {
      proposals.push({
        id: 'timeband-1',
        type: 'timeband-focus',
        title: '平日ランチ帯の人件費注意',
        description: `平日${weekdayCaution.length}日でCAUTIONゾーン。ランチ帯の人員配置を見直してください。`,
        timeBand: 'lunch',
        affectedDays: weekdayCaution.map(d => d.dayLabel),
        impact: '売上下振れ時にBADゾーンに転落するリスク',
        priority: 'medium',
      });
    } else if (weekendCaution.length > 0) {
      proposals.push({
        id: 'timeband-2',
        type: 'timeband-focus',
        title: '土日ディナー帯の人件費注意',
        description: `土日${weekendCaution.length}日でCAUTIONゾーン。ディナー帯のスキルミックスを確認してください。`,
        timeBand: 'dinner',
        affectedDays: weekendCaution.map(d => d.dayLabel),
        impact: '繁忙期に人件費率が悪化する可能性',
        priority: 'medium',
      });
    }
  }
  
  // 3. Overstaffing check based on hours variance
  const { weekSummary, dailyRows } = metrics;
  const avgDailyHours = weekSummary.totalHours / 7;
  const highHoursDays = dailyRows.filter(r => r.hours > avgDailyHours * 1.3);
  if (highHoursDays.length >= 2 && proposals.length < 3) {
    proposals.push({
      id: 'over-1',
      type: 'overstaffing',
      title: '人時配分の偏り',
      description: `${highHoursDays.map(d => d.dayLabel).join('・')}曜日の人時が週平均の130%超。アイドル帯に余剰がないか確認してください。`,
      timeBand: 'idle',
      affectedDays: highHoursDays.map(d => d.dayLabel),
      impact: `週間${Math.round((highHoursDays.reduce((s, d) => s + d.hours, 0) - avgDailyHours * highHoursDays.length)).toFixed(1)}h過剰`,
      priority: goodDays.length >= 5 ? 'low' : 'medium',
    });
  }
  
  // Limit to 3 proposals max
  return proposals.slice(0, 3);
}

const proposalTypeConfig: Record<LaborProposal['type'], { icon: React.ReactNode; color: string; bgColor: string }> = {
  'bad-days-warning': { icon: <XCircle className="h-4 w-4" />, color: 'text-red-700', bgColor: 'bg-red-50' },
  'skill-shortage': { icon: <Star className="h-4 w-4" />, color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  'timeband-focus': { icon: <Clock className="h-4 w-4" />, color: 'text-amber-700', bgColor: 'bg-amber-50' },
  'overstaffing': { icon: <Users className="h-4 w-4" />, color: 'text-orange-700', bgColor: 'bg-orange-50' },
};

const guardrailStatusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  good: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-50', label: 'GOOD' },
  caution: { icon: <MinusCircle className="h-4 w-4" />, color: 'text-yellow-600', bgColor: 'bg-yellow-50', label: 'CAUTION' },
  bad: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-50', label: 'BAD' },
};

const timeBandLabels: Record<string, string> = {
  lunch: 'ランチ',
  idle: 'アイドル',
  dinner: 'ディナー',
};

const priorityConfig: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' }> = {
  high: { label: '高', variant: 'destructive' },
  medium: { label: '中', variant: 'default' },
  low: { label: '低', variant: 'secondary' },
};

// Generate week options (current week and past 4 weeks)
function getWeekOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  
  for (let i = 0; i < 5; i++) {
    const weekStart = new Date(today);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - (i * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const label = i === 0 ? '今週' : i === 1 ? '先週' : `${i}週前`;
    const dateLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
    
    options.push({
      value: weekStart.toISOString().split('T')[0],
      label: `${label} (${dateLabel})`,
    });
  }
  
  return options;
}

export default function LaborWeeklyPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();
  const storeId = state.selectedStoreId ?? '1';
  
  // Week selection
  const weekOptions = useMemo(() => getWeekOptions(), []);
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0]?.value ?? '');
  
  // Get metrics for selected week
  const metrics = selectWeeklyLaborMetrics(state, selectedWeek);
  
  const { weekSummary, dailyRows } = metrics;
  
  // Calculate guardrail status for each day
  const dailyGuardrails = useMemo((): DailyGuardrailInfo[] => {
    return dailyRows.map((row) => {
      const date = new Date(row.date);
      const dayOfWeek = date.getDay();
      const guardrail = evaluateDailyGuardrail(row.sales, row.laborCost, dayOfWeek);
      return {
        date: row.date,
        dayLabel: row.dayLabel,
        dayOfWeek,
        guardrail,
      };
    });
  }, [dailyRows]);
  
  const proposals = useMemo(() => generateProposals(metrics, dailyGuardrails), [metrics, dailyGuardrails]);
  
  // Calculate diffs from targets
  const laborRateDiff = weekSummary.avgLaborRate !== null 
    ? weekSummary.avgLaborRate - TARGETS.laborRate 
    : null;

  return (
    <div className="space-y-6 p-6">
      <OSHeader title={t('laborWeekly.title')} showTimeBandTabs={false} />

      {/* Week Selector */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t('laborWeekly.targetWeek')}</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={t('laborWeekly.selectWeek')} />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FreshnessBadge lastUpdate={metrics.lastUpdate} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calculating State */}
      {metrics.isCalculating && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{t('laborWeekly.dataInsufficient')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Summary Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('laborWeekly.weeklySales')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weekSummary.totalSales !== null 
                ? formatCurrency(weekSummary.totalSales, locale)
                : <span className="text-muted-foreground text-lg">{t('laborWeekly.notCalculated')}</span>
              }
            </div>
          </CardContent>
        </Card>

        {/* Labor Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('laborWeekly.weeklyLaborCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(weekSummary.totalLaborCost, locale)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatHours(weekSummary.totalHours, locale)}
            </div>
          </CardContent>
        </Card>

        {/* Labor Rate */}
        <Card className={cn(laborRateDiff !== null && laborRateDiff > 0 && 'border-red-200 bg-red-50/50')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('laborWeekly.laborRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weekSummary.avgLaborRate !== null 
                ? formatPercent(weekSummary.avgLaborRate, locale)
                : <span className="text-muted-foreground text-lg">--</span>
              }
            </div>
            {laborRateDiff !== null && (
              <div className={cn(
                'flex items-center gap-1 text-xs mt-1',
                laborRateDiff > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {laborRateDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{t('laborWeekly.target')} {formatPercent(TARGETS.laborRate, locale)} ({laborRateDiff > 0 ? '+' : ''}{formatNumber(laborRateDiff, locale, 1)}pt)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Hours */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('laborWeekly.weeklyHours')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(weekSummary.totalHours, locale)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('laborWeekly.activeStaff')}: {weekSummary.staffCountTotal}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            {t('laborWeekly.dailyBreakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t('laborWeekly.date')}</TableHead>
                <TableHead className="text-center w-[90px]">{t('laborWeekly.guardrail')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.sales')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.laborCost')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.laborRate')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.hours')}</TableHead>
                <TableHead>{t('laborWeekly.skillMix')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRows.map((row, idx) => {
                const guardrailInfo = dailyGuardrails[idx];
                const guardrail = guardrailInfo?.guardrail;
                const statusConfig = guardrail ? guardrailStatusConfig[guardrail.status] : null;
                
                return (
                  <TableRow key={row.date} className={cn(
                    guardrail?.status === 'bad' && 'bg-red-50/50',
                    guardrail?.status === 'caution' && 'bg-yellow-50/30'
                  )}>
                    <TableCell className="font-medium">
                      {row.date.slice(5).replace('-', '/')} ({row.dayLabel})
                    </TableCell>
                    <TableCell className="text-center">
                      {statusConfig ? (
                        <Badge 
                          variant="outline" 
                          className={cn('gap-1 text-[10px]', statusConfig.color, statusConfig.bgColor)}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.sales !== null 
                        ? formatCurrency(row.sales, locale)
                        : <span className="text-muted-foreground">--</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.laborCost, locale)}</TableCell>
                    <TableCell className={cn(
                      'text-right',
                      guardrail?.status === 'bad' && 'text-red-600 font-medium',
                      guardrail?.status === 'caution' && 'text-yellow-600 font-medium'
                    )}>
                      {row.laborRate !== null ? (
                        <div className="flex flex-col items-end">
                          <span>{formatPercent(row.laborRate, locale)}</span>
                          {guardrail && guardrail.deltaToGood !== 0 && (
                            <span className={cn(
                              'text-[10px]',
                              guardrail.deltaToGood > 0 ? 'text-red-500' : 'text-green-500'
                            )}>
                              {guardrail.deltaToGood > 0 ? '+' : ''}{(guardrail.deltaToGood * 100).toFixed(1)}pt
                            </span>
                          )}
                        </div>
                      ) : '--'}
                    </TableCell>
                    <TableCell className="text-right">{formatHours(row.hours, locale)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {row.starMix.star3 > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                            {row.starMix.star3}
                          </Badge>
                        )}
                        {row.starMix.star2 > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                            {row.starMix.star2}
                          </Badge>
                        )}
                        {row.starMix.star1 > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                            {row.starMix.star1}
                          </Badge>
                        )}
                        {row.staffCount === 0 && (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Skill Mix Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {t('laborWeekly.skillMixWeekly')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Star 3 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="flex">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-sm">{t('laborWeekly.veteran')}</span>
              </div>
              <span className="text-lg font-bold">{weekSummary.starMixTotal.star3}</span>
            </div>

            {/* Star 2 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="flex">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-sm">{t('laborWeekly.intermediate')}</span>
              </div>
              <span className="text-lg font-bold">{weekSummary.starMixTotal.star2}</span>
            </div>

            {/* Star 1 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="flex">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-sm">{t('laborWeekly.newbie')}</span>
              </div>
              <span className="text-lg font-bold">{weekSummary.starMixTotal.star1}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Improvement Proposals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                {t('laborWeekly.suggestions')}
              </CardTitle>
              <CardDescription>
                {t('laborWeekly.suggestionsDesc')}
              </CardDescription>
            </div>
            <Badge variant="outline">{proposals.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('laborWeekly.noSuggestions')}
            </div>
          ) : (
            proposals.map((proposal) => {
              const config = proposalTypeConfig[proposal.type];
              const priority = priorityConfig[proposal.priority];
              return (
                <div
                  key={proposal.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    config.bgColor
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-full', config.bgColor, config.color)}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{proposal.title}</h4>
                        <Badge variant={priority.variant} className="text-[10px]">
                          {t('laborWeekly.priority')}: {priority.label}
                        </Badge>
                        {proposal.timeBand && (
                          <Badge variant="outline" className="text-[10px]">
                            {timeBandLabels[proposal.timeBand]}帯
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {proposal.description}
                      </p>
                      {proposal.affectedDays && proposal.affectedDays.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {proposal.affectedDays.map(day => (
                            <Badge key={day} variant="secondary" className="text-[10px]">
                              {day}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />
                        <span>{t('laborWeekly.impact')}: {proposal.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* CTA to All Management */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted-foreground">
                {t('laborWeekly.suggestionsDesc')}
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href={`/stores/${storeId}/management/labor`}>
                {t('laborWeekly.editShift')}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
