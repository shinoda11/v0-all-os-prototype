'use client';

import React from "react"

import { useMemo } from 'react';
import { OSHeader } from '@/components/OSHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '@/state/store';
import {
  selectCurrentStore,
  selectLaborMetrics,
  selectShiftSummary,
} from '@/core/selectors';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Clock,
  AlertTriangle,
  ExternalLink,
  Coffee,
  DollarSign,
  Calendar,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Weekly summary mock data (would be derived from actual events in production)
interface WeeklySummary {
  totalSales: number;
  totalLaborCost: number;
  laborRate: number;
  targetLaborRate: number;
  totalHours: number;
  targetHours: number;
  skillMix: { star3: number; star2: number; star1: number };
  targetSkillMix: { star3: number; star2: number; star1: number };
  weekStart: string;
  weekEnd: string;
}

interface LaborProposal {
  id: string;
  type: 'skill-shortage' | 'break-imbalance' | 'overstaffing' | 'understaffing' | 'cost-overrun';
  title: string;
  description: string;
  timeBand?: 'lunch' | 'idle' | 'dinner';
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

// Generate weekly summary based on current metrics
function useWeeklySummary(storeId: string): WeeklySummary {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Mock data - in production would aggregate from events
  return {
    totalSales: 2450000,
    totalLaborCost: 686000,
    laborRate: 28.0,
    targetLaborRate: 25.0,
    totalHours: 312,
    targetHours: 288,
    skillMix: { star3: 12, star2: 18, star1: 24 },
    targetSkillMix: { star3: 16, star2: 20, star1: 18 },
    weekStart: weekStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    weekEnd: weekEnd.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
  };
}

// Generate labor improvement proposals
function useLaborProposals(summary: WeeklySummary): LaborProposal[] {
  const proposals: LaborProposal[] = [];

  // Check for skill shortage
  if (summary.skillMix.star3 < summary.targetSkillMix.star3) {
    const shortage = summary.targetSkillMix.star3 - summary.skillMix.star3;
    proposals.push({
      id: 'skill-1',
      type: 'skill-shortage',
      title: 'ディナー帯の★3スタッフ不足',
      description: `ディナー帯で★3スタッフが${shortage}名不足しています。ピーク時の品質低下リスクがあります。`,
      timeBand: 'dinner',
      impact: 'サービス品質低下、クレーム増加の可能性',
      priority: 'high',
    });
  }

  // Check for overstaffing in idle time
  if (summary.totalHours > summary.targetHours * 1.05) {
    proposals.push({
      id: 'over-1',
      type: 'overstaffing',
      title: 'アイドル帯の過剰人時',
      description: `週間人時が目標を${Math.round((summary.totalHours - summary.targetHours))}時間超過しています。アイドル帯(14-17時)の人員配置を見直してください。`,
      timeBand: 'idle',
      impact: `人件費 約¥${Math.round((summary.totalHours - summary.targetHours) * 1200).toLocaleString()}の超過`,
      priority: 'medium',
    });
  }

  // Check for break distribution
  proposals.push({
    id: 'break-1',
    type: 'break-imbalance',
    title: '休憩配置の偏り',
    description: 'ランチ後(13:30-14:00)に休憩が集中しています。ディナー準備との兼ね合いで分散を検討してください。',
    timeBand: 'lunch',
    impact: 'ディナー仕込み開始の遅延リスク',
    priority: 'low',
  });

  // Check for labor rate
  if (summary.laborRate > summary.targetLaborRate) {
    proposals.push({
      id: 'cost-1',
      type: 'cost-overrun',
      title: '人件費率の超過',
      description: `人件費率${summary.laborRate.toFixed(1)}%が目標${summary.targetLaborRate.toFixed(1)}%を${(summary.laborRate - summary.targetLaborRate).toFixed(1)}pt超過しています。`,
      impact: `月間利益への影響: 約¥${Math.round((summary.laborRate - summary.targetLaborRate) * summary.totalSales / 100 * 4).toLocaleString()}減`,
      priority: 'high',
    });
  }

  // Check for star1 overreliance
  if (summary.skillMix.star1 > summary.targetSkillMix.star1 * 1.2) {
    proposals.push({
      id: 'skill-2',
      type: 'understaffing',
      title: '★1スタッフへの依存過多',
      description: `★1スタッフが目標比${Math.round((summary.skillMix.star1 / summary.targetSkillMix.star1 - 1) * 100)}%過多です。教育コストとサービス品質への影響を考慮してください。`,
      impact: '教育負荷増加、ミス発生率上昇',
      priority: 'medium',
    });
  }

  return proposals.slice(0, 5); // Max 5 proposals
}

const proposalTypeConfig: Record<LaborProposal['type'], { icon: React.ReactNode; color: string; bgColor: string }> = {
  'skill-shortage': { icon: <Star className="h-4 w-4" />, color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  'break-imbalance': { icon: <Coffee className="h-4 w-4" />, color: 'text-blue-700', bgColor: 'bg-blue-50' },
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

export default function LaborWeeklyPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const storeId = state.selectedStoreId ?? '1';

  const weeklySummary = useWeeklySummary(storeId);
  const proposals = useLaborProposals(weeklySummary);

  const laborRateDiff = weeklySummary.laborRate - weeklySummary.targetLaborRate;
  const hoursDiff = weeklySummary.totalHours - weeklySummary.targetHours;

  return (
    <div className="space-y-6 p-6">
      <OSHeader title="週次労務レビュー" showTimeBandTabs={false} />

      {/* Week Range */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">対象週</CardTitle>
            </div>
            <Badge variant="outline" className="text-sm">
              {weeklySummary.weekStart} 〜 {weeklySummary.weekEnd}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Summary Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              週間売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{weeklySummary.totalSales.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Labor Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              週間人件費
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{weeklySummary.totalLaborCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Labor Rate */}
        <Card className={cn(laborRateDiff > 0 && 'border-red-200 bg-red-50/50')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              人件費率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weeklySummary.laborRate.toFixed(1)}%
            </div>
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              laborRateDiff > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {laborRateDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>目標 {weeklySummary.targetLaborRate.toFixed(1)}% ({laborRateDiff > 0 ? '+' : ''}{laborRateDiff.toFixed(1)}pt)</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Hours */}
        <Card className={cn(hoursDiff > 0 && 'border-yellow-200 bg-yellow-50/50')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              週間人時
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weeklySummary.totalHours}h
            </div>
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              hoursDiff > 0 ? 'text-yellow-600' : 'text-green-600'
            )}>
              {hoursDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>目標 {weeklySummary.targetHours}h ({hoursDiff > 0 ? '+' : ''}{hoursDiff}h)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Mix Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            スキルミックス（週間シフト実績）
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
                <span className="text-sm">ベテラン</span>
              </div>
              <div className="text-right">
                <span className={cn(
                  'text-lg font-bold',
                  weeklySummary.skillMix.star3 < weeklySummary.targetSkillMix.star3 && 'text-red-600'
                )}>
                  {weeklySummary.skillMix.star3}名
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  / 目標{weeklySummary.targetSkillMix.star3}名
                </span>
              </div>
            </div>

            {/* Star 2 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="flex">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-sm">中堅</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold">{weeklySummary.skillMix.star2}名</span>
                <span className="text-xs text-muted-foreground ml-1">
                  / 目標{weeklySummary.targetSkillMix.star2}名
                </span>
              </div>
            </div>

            {/* Star 1 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="flex">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-sm">新人</span>
              </div>
              <div className="text-right">
                <span className={cn(
                  'text-lg font-bold',
                  weeklySummary.skillMix.star1 > weeklySummary.targetSkillMix.star1 * 1.2 && 'text-yellow-600'
                )}>
                  {weeklySummary.skillMix.star1}名
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  / 目標{weeklySummary.targetSkillMix.star1}名
                </span>
              </div>
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
                改善提案
              </CardTitle>
              <CardDescription>
                週次データに基づく労務改善の提案です。編集はAll Managementで行います。
              </CardDescription>
            </div>
            <Badge variant="outline">{proposals.length}件</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              改善提案はありません
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
                          優先度: {priority.label}
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
                        <span>影響: {proposal.impact}</span>
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
              <h3 className="font-semibold text-lg">シフト修正はAll Managementで</h3>
              <p className="text-sm text-muted-foreground">
                労務計画の編集は週次で行います。営業中の変更は原則不可です。
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href={`/stores/${storeId}/management/labor`}>
                All Managementで週次シフト修正へ
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notice */}
      <div className="text-xs text-muted-foreground text-center">
        このページは参照専用です。シフトの編集・承認はAll Managementで行ってください。
      </div>
    </div>
  );
}
