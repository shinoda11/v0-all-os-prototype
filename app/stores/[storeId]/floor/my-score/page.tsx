'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/state/store';
import { selectDailyScore } from '@/core/selectors';
import { cn } from '@/lib/utils';
import {
  Trophy,
  CheckCircle,
  Clock,
  Coffee,
  Briefcase,
  TrendingUp,
  ChevronRight,
  Star,
} from 'lucide-react';

/**
 * My Score Page - Personal daily score and achievements
 * Shows individual performance metrics with gamification elements
 * Design Guidelines compliant: 2.1 spacing, 2.4 touch targets, 2.5 typography
 */

// Mock staff selection (in real app, would come from auth)
const MOCK_STAFF_ID = 'staff-1';
const MOCK_STAFF_NAME = '山田 太郎';

// Grade colors
const GRADE_STYLES = {
  S: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  A: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  B: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  C: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  D: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

// Score category config
const CATEGORY_CONFIG = {
  taskCompletion: {
    label: 'タスク完了',
    icon: CheckCircle,
    max: 40,
    description: 'クエストの完了率',
  },
  timeVariance: {
    label: '時間管理',
    icon: Clock,
    max: 25,
    description: '予定時間との差分',
  },
  breakCompliance: {
    label: '休憩遵守',
    icon: Coffee,
    max: 15,
    description: '適切な休憩取得',
  },
  zeroOvertime: {
    label: '残業ゼロ',
    icon: Briefcase,
    max: 20,
    description: '定時退勤の達成',
  },
};

export default function MyScorePage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { state } = useStore();
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const dailyScore = selectDailyScore(state, MOCK_STAFF_ID, selectedDate);
  const gradeStyle = GRADE_STYLES[dailyScore.grade];
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Score</h1>
            <p className="text-sm text-muted-foreground">{MOCK_STAFF_NAME}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date(selectedDate).toLocaleDateString('ja-JP', { 
              month: 'long', 
              day: 'numeric',
              weekday: 'short',
            })}
          </div>
        </div>
      </header>
      
      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Main Score Card */}
        <Card className={cn('border-2', gradeStyle.border)}>
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Grade Badge */}
              <div className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold',
                gradeStyle.bg,
                gradeStyle.text
              )}>
                {dailyScore.grade}
              </div>
              
              {/* Score */}
              <div className="space-y-1">
                <div className="text-5xl font-bold tabular-nums">{dailyScore.total}</div>
                <div className="text-sm text-muted-foreground">/ 100 pts</div>
              </div>
              
              {/* Feedback */}
              <p className="text-sm text-foreground max-w-xs">
                {dailyScore.feedback}
              </p>
              
              {/* Stars for gamification */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-6 w-6',
                      star <= Math.ceil(dailyScore.total / 20)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Score Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              スコア内訳
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.entries(CATEGORY_CONFIG) as Array<[keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]]>).map(([key, config]) => {
              const score = dailyScore.breakdown[key as keyof typeof dailyScore.breakdown];
              const percentage = Math.round((score / config.max) * 100);
              const Icon = config.icon;
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{config.label}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">
                      {score} / {config.max}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn(
                      'h-2',
                      percentage >= 80 ? '[&>div]:bg-emerald-500' :
                      percentage >= 60 ? '[&>div]:bg-amber-500' :
                      '[&>div]:bg-red-500'
                    )}
                  />
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Bottlenecks */}
        {dailyScore.bottlenecks.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-800">改善ポイント</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dailyScore.bottlenecks.map((bottleneck, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                    {bottleneck}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {/* Tomorrow's Actions */}
        {dailyScore.improvements.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                明日への行動
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dailyScore.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                    {improvement}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {/* CTA */}
        <Button className="w-full h-11" asChild>
          <a href={`/stores/${storeId}/floor/todo`}>
            Today Quests を見る
            <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </Button>
      </main>
    </div>
  );
}
