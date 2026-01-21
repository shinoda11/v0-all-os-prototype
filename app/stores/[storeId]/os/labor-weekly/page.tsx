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
  type: 'skill-shortage' | 'break-imbalance' | 'overstaffing' | 'understaffing' | 'cost-overrun';
  title: string;
  description: string;
  timeBand?: 'lunch' | 'idle' | 'dinner';
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

// Generate labor improvement proposals based on metrics
function generateProposals(metrics: WeeklyLaborMetrics): LaborProposal[] {
  const proposals: LaborProposal[] = [];
  const { weekSummary, dailyRows } = metrics;
  
  // Check for labor rate overrun
  if (weekSummary.avgLaborRate !== null && weekSummary.avgLaborRate > TARGETS.laborRate) {
    const diff = weekSummary.avgLaborRate - TARGETS.laborRate;
    proposals.push({
      id: 'cost-1',
      type: 'cost-overrun',
      title: '人件費率の超過',
      description: `人件費率${weekSummary.avgLaborRate.toFixed(1)}%が目標${TARGETS.laborRate.toFixed(1)}%を${diff.toFixed(1)}pt超過しています。`,
      impact: weekSummary.totalSales 
        ? `月間利益への影響: 約¥${Math.round(diff * weekSummary.totalSales / 100 * 4).toLocaleString()}減`
        : '利益への影響あり',
      priority: diff > 3 ? 'high' : 'medium',
    });
  }
  
  // Check for skill mix imbalance
  const totalStaff = weekSummary.starMixTotal.star3 + weekSummary.starMixTotal.star2 + weekSummary.starMixTotal.star1;
  if (totalStaff > 0) {
    const star3Ratio = weekSummary.starMixTotal.star3 / totalStaff;
    const star1Ratio = weekSummary.starMixTotal.star1 / totalStaff;
    
    if (star3Ratio < TARGETS.star3Ratio * 0.8) {
      proposals.push({
        id: 'skill-1',
        type: 'skill-shortage',
        title: 'ディナー帯の★3スタッフ不足',
        description: `★3スタッフの配置が目標比${Math.round((1 - star3Ratio / TARGETS.star3Ratio) * 100)}%不足しています。`,
        timeBand: 'dinner',
        impact: 'サービス品質低下、クレーム増加の可能性',
        priority: 'high',
      });
    }
    
    if (star1Ratio > TARGETS.star1Ratio * 1.3) {
      proposals.push({
        id: 'skill-2',
        type: 'understaffing',
        title: '★1スタッフへの依存過多',
        description: `★1スタッフが目標比${Math.round((star1Ratio / TARGETS.star1Ratio - 1) * 100)}%過多です。`,
        impact: '教育負荷増加、ミス発生率上昇',
        priority: 'medium',
      });
    }
  }
  
  // Check for overstaffing on specific days
  const avgDailyHours = weekSummary.totalHours / 7;
  const highHoursDays = dailyRows.filter(r => r.hours > avgDailyHours * 1.3);
  if (highHoursDays.length >= 2) {
    proposals.push({
      id: 'over-1',
      type: 'overstaffing',
      title: 'アイドル帯の過剰人時',
      description: `${highHoursDays.map(d => d.dayLabel).join('・')}曜日の人時が週平均を大きく上回っています。`,
      timeBand: 'idle',
      impact: `週間で約${Math.round((highHoursDays.reduce((s, d) => s + d.hours, 0) - avgDailyHours * highHoursDays.length) * 1200).toLocaleString()}円の超過`,
      priority: 'medium',
    });
  }
  
  // Always add break distribution suggestion
  proposals.push({
    id: 'break-1',
    type: 'break-imbalance',
    title: '休憩配置の確認推奨',
    description: 'ランチ後(13:30-14:00)に休憩が集中していないか確認してください。',
    timeBand: 'lunch',
    impact: 'ディナー仕込み開始の遅延リスク',
    priority: 'low',
  });
  
  return proposals.slice(0, 5);
}

const proposalTypeConfig: Record<LaborProposal['type'], { icon: React.ReactNode; color: string; bgColor: string }> = {
  'skill-shortage': { icon: <Star className="h-4 w-4" />, color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  'break-imbalance': { icon: <Clock className="h-4 w-4" />, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  'overstaffing': { icon: <Users className="h-4 w-4" />, color: 'text-orange-700', bgColor: 'bg-orange-50' },
  'understaffing': { icon: <Users className="h-4 w-4" />, color: 'text-red-700', bgColor: 'bg-red-50' },
  'cost-overrun': { icon: <DollarSign className="h-4 w-4" />, color: 'text-red-700', bgColor: 'bg-red-50' },
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
  const proposals = useMemo(() => generateProposals(metrics), [metrics]);
  
  const { weekSummary, dailyRows } = metrics;
  
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
                <TableHead className="text-right">{t('laborWeekly.hours')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.laborCost')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.sales')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.laborRate')}</TableHead>
                <TableHead className="text-right">{t('laborWeekly.staffCount')}</TableHead>
                <TableHead>{t('laborWeekly.skillMix')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRows.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">
                    {row.date.slice(5).replace('-', '/')} ({row.dayLabel})
                  </TableCell>
                  <TableCell className="text-right">{formatHours(row.hours, locale)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.laborCost, locale)}</TableCell>
                  <TableCell className="text-right">
                    {row.sales !== null 
                      ? formatCurrency(row.sales, locale)
                      : <span className="text-muted-foreground">--</span>
                    }
                  </TableCell>
                  <TableCell className={cn(
                    'text-right',
                    row.laborRate !== null && row.laborRate > TARGETS.laborRate && 'text-red-600 font-medium'
                  )}>
                    {row.laborRate !== null ? formatPercent(row.laborRate, locale) : '--'}
                  </TableCell>
                  <TableCell className="text-right">{row.staffCount}</TableCell>
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
              ))}
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
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
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
