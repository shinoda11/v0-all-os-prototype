'use client';

import React, { useState, useMemo } from 'react';
import { OSHeader } from '@/components/OSHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/state/store';
import {
  selectCurrentStore,
  selectWeeklyLaborMetrics,
  selectTeamDailyScore,
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
  CheckSquare,
  Target,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { WeeklyLaborMetrics } from '@/core/types';

// Target values
const TARGETS = {
  laborRate: 25.0,
  productivity: 4.0, // 売上/人件費
  star3Ratio: 0.3,
  taskCompletionRate: 0.85,
  zeroOvertimeRate: 0.9,
};

// Proposal types for weekly improvements
interface WeeklyProposal {
  id: string;
  category: 'skill-mix' | 'time-band' | 'quest' | 'overtime' | 'break';
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionHref?: string;
}

// Generate weekly improvement proposals
function generateWeeklyProposals(
  laborMetrics: WeeklyLaborMetrics,
  avgDailyScore: number,
  taskCompletionRate: number
): WeeklyProposal[] {
  const proposals: WeeklyProposal[] = [];
  const { weekSummary, dailyRows } = laborMetrics;
  
  // 1. Skill Mix Analysis
  const totalStaff = weekSummary.starMixTotal.star3 + weekSummary.starMixTotal.star2 + weekSummary.starMixTotal.star1;
  if (totalStaff > 0) {
    const star3Ratio = weekSummary.starMixTotal.star3 / totalStaff;
    const star2Ratio = weekSummary.starMixTotal.star2 / totalStaff;
    
    if (star3Ratio < TARGETS.star3Ratio * 0.8) {
      proposals.push({
        id: 'skill-1',
        category: 'skill-mix',
        title: 'ディナー帯の★3不足',
        description: `★3スタッフの配置が目標比${Math.round((1 - star3Ratio / TARGETS.star3Ratio) * 100)}%不足。ピーク帯のサービス品質に影響します。`,
        impact: 'サービス品質、顧客満足度',
        priority: 'high',
        actionLabel: 'シフト調整',
        actionHref: '/management/shifts',
      });
    }
    
    if (star2Ratio < 0.3) {
      proposals.push({
        id: 'skill-2',
        category: 'skill-mix',
        title: '★2スタッフの育成推奨',
        description: '中堅層が不足しています。★1→★2への育成を加速させましょう。',
        impact: '長期的な人材構成',
        priority: 'medium',
        actionLabel: '育成計画',
        actionHref: '/management/training',
      });
    }
  }
  
  // 2. Weak Time Band Analysis
  const avgDailyHours = weekSummary.totalHours / 7;
  const highHoursDays = dailyRows.filter(r => r.hours > avgDailyHours * 1.25);
  const lowProductivityDays = dailyRows.filter(r => 
    r.sales && r.laborCost && (r.sales / r.laborCost) < TARGETS.productivity * 0.8
  );
  
  if (lowProductivityDays.length >= 2) {
    proposals.push({
      id: 'time-1',
      category: 'time-band',
      title: 'アイドル帯の生産性改善',
      description: `${lowProductivityDays.map(d => d.dayLabel).join('・')}曜の生産性が目標を下回っています。`,
      impact: `週間利益: 約¥${Math.round(lowProductivityDays.length * 5000).toLocaleString()}相当`,
      priority: 'high',
      actionLabel: '人員配置見直し',
      actionHref: '/management/labor-plan',
    });
  }
  
  // 3. Quest/Task Completion
  if (taskCompletionRate < TARGETS.taskCompletionRate) {
    const gap = TARGETS.taskCompletionRate - taskCompletionRate;
    proposals.push({
      id: 'quest-1',
      category: 'quest',
      title: '特定クエストの遅延常習',
      description: `タスク完了率${Math.round(taskCompletionRate * 100)}%が目標${Math.round(TARGETS.taskCompletionRate * 100)}%を下回っています。`,
      impact: 'オペレーション効率、品質',
      priority: gap > 0.15 ? 'high' : 'medium',
      actionLabel: 'クエスト確認',
      actionHref: '/floor/todo',
    });
  }
  
  // 4. Overtime Analysis
  const overtimeDays = dailyRows.filter(r => r.hours > 8 * (r.staffCount || 1));
  if (overtimeDays.length >= 2) {
    proposals.push({
      id: 'ot-1',
      category: 'overtime',
      title: '残業発生パターン',
      description: `${overtimeDays.map(d => d.dayLabel).join('・')}曜に残業が発生。計画の見直しを検討してください。`,
      impact: '人件費、スタッフ疲労',
      priority: 'medium',
      actionLabel: '労務計画',
      actionHref: '/management/labor-plan',
    });
  }
  
  // 5. Break Distribution
  proposals.push({
    id: 'break-1',
    category: 'break',
    title: '休憩配置の偏り確認',
    description: 'ランチ後(13:30-14:00)に休憩が集中していないか確認。ディナー準備に影響する可能性があります。',
    impact: 'ディナー仕込み開始時刻',
    priority: 'low',
    actionLabel: '休憩計画',
    actionHref: '/management/breaks',
  });
  
  return proposals.slice(0, 5);
}

const categoryConfig: Record<WeeklyProposal['category'], { icon: React.ReactNode; color: string; bgColor: string }> = {
  'skill-mix': { icon: <Star className="h-4 w-4" />, color: 'text-amber-700', bgColor: 'bg-amber-50' },
  'time-band': { icon: <Clock className="h-4 w-4" />, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  'quest': { icon: <CheckSquare className="h-4 w-4" />, color: 'text-purple-700', bgColor: 'bg-purple-50' },
  'overtime': { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-700', bgColor: 'bg-red-50' },
  'break': { icon: <Users className="h-4 w-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
};

const priorityBadge: Record<WeeklyProposal['priority'], string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-800',
};

// Week selector options
function getWeekOptions() {
  const options = [];
  const today = new Date();
  
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(today);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - (i * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const label = i === 0 ? '今週' : i === 1 ? '先週' : `${i}週前`;
    options.push({
      value: weekStart.toISOString().split('T')[0],
      label: `${label} (${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`,
    });
  }
  
  return options;
}

export default function WeeklyReviewPage() {
  const { state } = useStore();
  const store = selectCurrentStore(state);
  const weekOptions = useMemo(() => getWeekOptions(), []);
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0]?.value ?? '');
  
  const laborMetrics = selectWeeklyLaborMetrics(state, selectedWeek);
  const teamScore = selectTeamDailyScore(state, selectedWeek);
  
  // Mock task completion rate (would come from todo stats aggregation)
  const taskCompletionRate = teamScore.breakdown.taskCompletion / 40; // 40 is max points
  
  const proposals = useMemo(() => 
    generateWeeklyProposals(laborMetrics, teamScore.total, taskCompletionRate),
    [laborMetrics, teamScore, taskCompletionRate]
  );
  
  const { weekSummary } = laborMetrics;
  
  // Grade color
  const gradeColors = {
    S: 'bg-amber-100 text-amber-800 border-amber-200',
    A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    B: 'bg-blue-100 text-blue-800 border-blue-200',
    C: 'bg-gray-100 text-gray-800 border-gray-200',
    D: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="min-h-screen bg-background">
      <OSHeader
        layer="kos"
        storeName={store?.name ?? 'Store'}
        currentDate={new Date()}
      />
      
      <main className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Weekly Review</h1>
            <p className="text-muted-foreground">週次の振り返りと改善提案</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="週を選択" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FreshnessBadge lastUpdate={laborMetrics.lastUpdate} />
          </div>
        </div>
        
        {/* Weekly Metrics Overview */}
        <div className="grid gap-4 md:grid-cols-5">
          {/* Team Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Team Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold tabular-nums">{teamScore.total}</span>
                <span className={cn(
                  'px-2 py-1 rounded text-sm font-bold border',
                  gradeColors[teamScore.grade]
                )}>
                  {teamScore.grade}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">週平均</p>
            </CardContent>
          </Card>
          
          {/* Labor Cost Ratio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                人件費率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {weekSummary.avgLaborRate?.toFixed(1) ?? '--'}
                </span>
                <span className="text-lg text-muted-foreground">%</span>
                {weekSummary.avgLaborRate !== null && (
                  weekSummary.avgLaborRate <= TARGETS.laborRate ? (
                    <TrendingDown className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  )
                )}
              </div>
              <p className="text-sm text-muted-foreground">目標: {TARGETS.laborRate}%</p>
            </CardContent>
          </Card>
          
          {/* Productivity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                生産性
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {weekSummary.salesPerLaborCost?.toFixed(1) ?? '--'}
                </span>
                <span className="text-lg text-muted-foreground">倍</span>
              </div>
              <p className="text-sm text-muted-foreground">売上/人件費</p>
            </CardContent>
          </Card>
          
          {/* Skill Mix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                星ミックス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-bold ml-1">{weekSummary.starMixTotal.star3}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-bold ml-1">{weekSummary.starMixTotal.star2}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-bold ml-1">{weekSummary.starMixTotal.star1}</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">延べ人数</p>
            </CardContent>
          </Card>
          
          {/* Task Completion */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                タスク完了度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {Math.round(taskCompletionRate * 100)}
                </span>
                <span className="text-lg text-muted-foreground">%</span>
                {taskCompletionRate >= TARGETS.taskCompletionRate ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">目標: {Math.round(TARGETS.taskCompletionRate * 100)}%</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Improvement Proposals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <CardTitle>改善提案</CardTitle>
              </div>
              <Badge variant="outline">{proposals.length}件</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {proposals.map((proposal) => {
              const config = categoryConfig[proposal.category];
              return (
                <div
                  key={proposal.id}
                  className={cn(
                    'p-4 rounded border border-border',
                    config.bgColor
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Title + Priority */}
                      <div className="flex items-center gap-2">
                        <span className={cn('p-1 rounded', config.color)}>
                          {config.icon}
                        </span>
                        <h3 className="font-bold">{proposal.title}</h3>
                        <Badge className={priorityBadge[proposal.priority]}>
                          {proposal.priority === 'high' ? '高' : proposal.priority === 'medium' ? '中' : '低'}
                        </Badge>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm text-muted-foreground">
                        {proposal.description}
                      </p>
                      
                      {/* Impact */}
                      <div className="text-sm">
                        <span className="text-muted-foreground">影響: </span>
                        <span className={config.color}>{proposal.impact}</span>
                      </div>
                    </div>
                    
                    {/* Action CTA - Links to Management */}
                    <Link href={proposal.actionHref ?? '#'}>
                      <Button variant="secondary" size="sm" className="shrink-0 gap-1">
                        {proposal.actionLabel}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
            
            {proposals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                改善提案はありません。素晴らしい週でした！
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* CTA to Management */}
        <div className="flex justify-end">
          <Link href="/management">
            <Button className="gap-2">
              計画修正へ
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
