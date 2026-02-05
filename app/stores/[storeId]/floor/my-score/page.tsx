'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { selectDailyScore, selectTodayEarnings, selectIncentiveDistribution } from '@/core/selectors';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/state/auth';
import type { ScoreDeduction, DeductionCategory } from '@/core/selectors';
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
  AlertCircle,
  ExternalLink,
  Info,
  Banknote,
  Gift,
  Target,
} from 'lucide-react';

/**
 * My Score Page - Personal daily score and achievements
 * Shows individual performance metrics with gamification elements
 * Design Guidelines compliant: 2.1 spacing, 2.4 touch targets, 2.5 typography
 */



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
    labelKey: 'myscore.taskCompletion',
    icon: CheckCircle,
    max: 40,
  },
  timeVariance: {
    labelKey: 'myscore.timeVariance',
    icon: Clock,
    max: 25,
  },
  breakCompliance: {
    labelKey: 'myscore.breakCompliance',
    icon: Coffee,
    max: 15,
  },
  zeroOvertime: {
    labelKey: 'myscore.zeroOvertime',
    icon: Briefcase,
    max: 20,
  },
};

// Deduction category icons and colors
const DEDUCTION_CATEGORY_CONFIG: Record<DeductionCategory, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  task: { icon: CheckCircle, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  time: { icon: Clock, color: 'text-amber-700', bgColor: 'bg-amber-50' },
  break: { icon: Coffee, color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  overtime: { icon: Briefcase, color: 'text-red-700', bgColor: 'bg-red-50' },
};

// Why This Score Panel Component
function WhyThisScorePanel({ 
  deductions, 
  storeId,
  stats,
}: { 
  deductions: ScoreDeduction[];
  storeId: string;
  stats: {
    totalQuests: number;
    completedQuests: number;
    onTimeQuests: number;
    breaksTaken: number;
    breaksExpected: number;
    plannedHours: number;
    actualHours: number;
    overtimeMinutes: number;
  };
}) {
  const { t } = useI18n();
  const topDeductions = deductions.slice(0, 3);
  
  // Generate link based on event type
  const getEventLink = (deduction: ScoreDeduction): string => {
    if (deduction.eventType === 'quest') {
      return `/stores/${storeId}/floor/todo`;
    }
    return `/stores/${storeId}/floor/timeclock`;
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          {t('myscore.whyThisScore')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs border-b border-border pb-3">
          <div>
            <div className="font-bold tabular-nums">{stats.completedQuests}/{stats.totalQuests}</div>
            <div className="text-muted-foreground">{t('myscore.stats.quests')}</div>
          </div>
          <div>
            <div className="font-bold tabular-nums">{stats.onTimeQuests}/{stats.completedQuests || 0}</div>
            <div className="text-muted-foreground">{t('myscore.stats.onTime')}</div>
          </div>
          <div>
            <div className="font-bold tabular-nums">{stats.breaksTaken}/{stats.breaksExpected}</div>
            <div className="text-muted-foreground">{t('myscore.stats.breaks')}</div>
          </div>
          <div>
            <div className="font-bold tabular-nums">{stats.actualHours}h</div>
            <div className="text-muted-foreground">{t('myscore.stats.hours')}</div>
          </div>
          <div>
            <div className={cn(
              'font-bold tabular-nums',
              stats.overtimeMinutes > 0 ? 'text-red-700' : 'text-emerald-700'
            )}>
              {stats.overtimeMinutes}m
            </div>
            <div className="text-muted-foreground">{t('myscore.stats.overtime')}</div>
          </div>
        </div>
        
        {/* Deductions list */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase">
            {t('myscore.topDeductions')}
          </div>
          
          {topDeductions.length === 0 ? (
            <div className="text-sm text-emerald-700 flex items-center gap-2 py-2">
              <CheckCircle className="h-4 w-4" />
              {t('myscore.noDeductions')}
            </div>
          ) : (
            <ul className="space-y-2">
              {topDeductions.map((deduction) => {
                const config = DEDUCTION_CATEGORY_CONFIG[deduction.category];
                const Icon = config.icon;
                
                return (
                  <li key={deduction.id} className="flex items-start gap-2">
                    <div className={cn(
                      'p-1 rounded shrink-0',
                      config.bgColor
                    )}>
                      <Icon className={cn('h-3 w-3', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm truncate">{deduction.reason}</span>
                        <span className="text-xs font-bold text-red-600 tabular-nums shrink-0">
                          -{deduction.points}pt
                        </span>
                      </div>
                      {deduction.details && (
                        <div className="text-xs text-muted-foreground">
                          {deduction.details.expected && deduction.details.actual && (
                            <span>
                              {deduction.details.expected} → {deduction.details.actual}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Link 
                      href={getEventLink(deduction)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyScorePage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { state } = useStore();
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Get current staff member
  const myStaff = state.staff.find((s) => 
    s.storeId === state.selectedStoreId && s.id === `staff-${currentUser.id}`
  ) ?? state.staff.find((s) => s.storeId === state.selectedStoreId);
  
  const staffId = myStaff?.id ?? 'staff-1';
  const staffName = myStaff?.name ?? currentUser.name;
  
  const dailyScore = selectDailyScore(state, staffId, selectedDate);
  const gradeStyle = GRADE_STYLES[dailyScore.grade];
  
  // Get earnings data
  const todayEarnings = selectTodayEarnings(state, staffId, selectedDate);
  const incentiveDistribution = selectIncentiveDistribution(state, selectedDate);
  const myShare = incentiveDistribution.staffShares.find(s => s.staffId === staffId);
  
  // i18n category labels
  const categoryLabels = {
    taskCompletion: t('myscore.taskCompletion'),
    timeVariance: t('myscore.timeVariance'),
    breakCompliance: t('myscore.breakCompliance'),
    zeroOvertime: t('myscore.zeroOvertime'),
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{t('myscore.title')}</h1>
            <p className="text-sm text-muted-foreground">{staffName}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date(selectedDate).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { 
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
        
        {/* Earnings Card */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-700" />
              {t('earnings.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEarnings.status === 'not-tracked' || !todayEarnings.netHoursWorked ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {t('earnings.notWorked')}
              </div>
            ) : (
              <>
                {/* Base Pay Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('earnings.hoursWorked')}</span>
                  </div>
                  <span className="font-bold tabular-nums">{todayEarnings.netHoursWorked?.toFixed(1)}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground ml-6">{t('earnings.basePay')}</span>
                  <span className="font-bold tabular-nums">{formatCurrency(todayEarnings.basePay)}</span>
                </div>
                
                {/* Incentive Share */}
                <div className="border-t border-emerald-200 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">{t('earnings.questsDone')}</span>
                    </div>
                    <span className="font-bold tabular-nums">{todayEarnings.questCountDone ?? 0}</span>
                  </div>
                  {myShare && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-bold">{t('earnings.yourShare')}</span>
                      <span className="font-bold tabular-nums text-blue-700">{myShare.sharePercentage}%</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground text-right">
                    {t('earnings.starBasedDistribution')}
                  </div>
                </div>
                
                {/* Projected Bonus */}
                <div className="border-t border-emerald-200 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">{t('earnings.projectedBonus')}</span>
                    </div>
                    <span className="font-bold tabular-nums text-amber-700">
                      {formatCurrency(myShare?.estimatedShare ?? 0)}
                    </span>
                  </div>
                </div>
                
                {/* Projected Total */}
                <div className="border-t border-emerald-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{t('earnings.projectedTotal')}</span>
                    <span className="text-xl font-bold tabular-nums text-emerald-700">
                      {formatCurrency((todayEarnings.basePay ?? 0) + (myShare?.estimatedShare ?? 0))}
                    </span>
                  </div>
                </div>
                
                {todayEarnings.qualityNgCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    <AlertCircle className="h-3 w-3" />
                    {t('earnings.qualityPenalty')}
                  </div>
                )}
                
                {todayEarnings.adHocQuestCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                    <Info className="h-3 w-3" />
                    {t('earnings.adHocNote').replace('{count}', String(todayEarnings.adHocQuestCount))}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground text-center">
                  {t('earnings.estimated')}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Score Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {t('myscore.breakdown')}
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
                      <span className="text-sm">{t(config.labelKey)}</span>
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
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Why This Score Panel */}
        <WhyThisScorePanel 
          deductions={dailyScore.deductions}
          storeId={storeId}
          stats={dailyScore.stats}
        />
        
        {/* Improvements for Tomorrow */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('myscore.improvements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyScore.improvements.length > 0 ? (
              <ul className="space-y-2">
                {dailyScore.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                    {improvement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('myscore.noImprovements')}</p>
            )}
          </CardContent>
        </Card>
        
        {/* CTA */}
        <Button className="w-full h-11" asChild>
          <a href={`/stores/${storeId}/floor/todo`}>
            {t('myscore.goToQuests')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </Button>
      </main>
    </div>
  );
}
