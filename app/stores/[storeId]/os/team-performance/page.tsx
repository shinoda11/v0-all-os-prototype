'use client';

import React, { useState, useMemo } from 'react';
import { OSHeader } from '@/components/OSHeader';
import { Drawer } from '@/components/Drawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import {
  selectCurrentStore,
  selectTeamPerformanceMetrics,
} from '@/core/selectors';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Coffee,
  Timer,
  Award,
  ChevronRight,
  Lightbulb,
  UserPlus,
  Info,
  DollarSign,
  Package,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Period, IndividualPerformance, CoachingAction, PromotionCandidate } from '@/core/derive';
import type { TimeBand } from '@/core/types';

// Star rating display
function StarRating({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(level)].map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
      ))}
      {[...Array(3 - level)].map((_, i) => (
        <Star key={i + level} className="h-3 w-3 text-muted-foreground/30" />
      ))}
    </div>
  );
}

// Metric Card with null handling
function SnapshotCard({ 
  title, 
  value, 
  suffix = '', 
  status,
  icon: Icon,
  isInverse = false, // true = lower is better (delay, NG rate)
  notTrackedMessage,
}: { 
  title: string; 
  value: number | null; 
  suffix?: string;
  status?: 'good' | 'warning' | 'bad' | null;
  icon: React.ElementType;
  isInverse?: boolean;
  notTrackedMessage?: string;
}) {
  const { t } = useI18n();
  
  let displayStatus = status;
  if (status === null && value !== null) {
    if (isInverse) {
      displayStatus = value <= 10 ? 'good' : value <= 30 ? 'warning' : 'bad';
    } else {
      displayStatus = value >= 80 ? 'good' : value >= 60 ? 'warning' : 'bad';
    }
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {value !== null ? (
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-3xl font-bold tabular-nums',
              displayStatus === 'good' ? 'text-emerald-600' :
              displayStatus === 'warning' ? 'text-amber-600' :
              displayStatus === 'bad' ? 'text-red-600' :
              'text-foreground'
            )}>
              {value}
            </span>
            <span className="text-lg text-muted-foreground">{suffix}</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-xl text-muted-foreground">
              {notTrackedMessage ?? t('teamPerformance.snapshot.notTracked')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Peak Coverage Badge
function PeakCoverageBadge({ coverage, reason }: { coverage: 'good' | 'warning' | 'critical' | null; reason: string }) {
  const { t } = useI18n();
  
  if (coverage === null) {
    return <span className="text-muted-foreground text-sm">{reason}</span>;
  }
  
  const config = {
    good: { label: t('teamPerformance.skillMix.peakGood'), className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    warning: { label: t('teamPerformance.skillMix.peakWarning'), className: 'bg-amber-100 text-amber-800 border-amber-200' },
    critical: { label: t('teamPerformance.skillMix.peakCritical'), className: 'bg-red-100 text-red-800 border-red-200' },
  };
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={config[coverage].className}>
        {config[coverage].label}
      </Badge>
      <span className="text-sm text-muted-foreground truncate">{reason}</span>
    </div>
  );
}

// Priority Badge for Coaching Actions
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const { t } = useI18n();
  
  const config = {
    high: { label: t('teamPerformance.coaching.priority.high'), className: 'bg-red-100 text-red-800 border-red-200' },
    medium: { label: t('teamPerformance.coaching.priority.medium'), className: 'bg-amber-100 text-amber-800 border-amber-200' },
    low: { label: t('teamPerformance.coaching.priority.low'), className: 'bg-blue-100 text-blue-800 border-blue-200' },
  };
  
  return (
    <Badge variant="outline" className={config[priority].className}>
      {config[priority].label}
    </Badge>
  );
}

// Staff Detail Drawer
function StaffDetailDrawer({ 
  individual, 
  isOpen, 
  onClose 
}: { 
  individual: IndividualPerformance | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { t } = useI18n();
  
  if (!individual) return null;
  
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={t('teamPerformance.staffDetail.title')}>
      <div className="space-y-6 p-4">
        {/* Staff Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold">{individual.name.charAt(0)}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold">{individual.name}</h3>
            <div className="flex items-center gap-2">
              <StarRating level={individual.starLevel} />
              <span className="text-sm text-muted-foreground">{individual.roleName}</span>
            </div>
          </div>
        </div>
        
        {/* Performance Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">{t('teamPerformance.individuals.score')}</div>
            <div className={cn(
              'text-2xl font-bold',
              individual.score >= 80 ? 'text-emerald-600' :
              individual.score >= 60 ? 'text-amber-600' :
              'text-red-600'
            )}>
              {individual.score}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">{t('teamPerformance.individuals.hours')}</div>
            <div className="text-2xl font-bold">
              {individual.hoursWorked !== null ? `${individual.hoursWorked}h` : '-'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">{t('teamPerformance.individuals.quests')}</div>
            <div className="text-2xl font-bold">
              {individual.questsDone}/{individual.questsTotal}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">{t('teamPerformance.individuals.delayRate')}</div>
            <div className={cn(
              'text-2xl font-bold',
              individual.delayRate === null ? 'text-muted-foreground' :
              individual.delayRate <= 10 ? 'text-emerald-600' :
              individual.delayRate <= 30 ? 'text-amber-600' :
              'text-red-600'
            )}>
              {individual.delayRate !== null ? `${individual.delayRate}%` : '-'}
            </div>
          </div>
        </div>
        
        {/* Quality Summary */}
        <div>
          <h4 className="font-medium mb-2">{t('teamPerformance.individuals.quality')}</h4>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>OK: {individual.qualityOkCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>NG: {individual.qualityNgCount}</span>
            </div>
          </div>
        </div>
        
        {/* Break Compliance */}
        <div>
          <h4 className="font-medium mb-2">{t('teamPerformance.individuals.breakOk')}</h4>
          {individual.breakCompliance === null ? (
            <span className="text-muted-foreground">{t('teamPerformance.individuals.na')}</span>
          ) : individual.breakCompliance ? (
            <Badge className="bg-emerald-100 text-emerald-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('teamPerformance.individuals.ok')}
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="h-3 w-3 mr-1" />
              {t('teamPerformance.individuals.ng')}
            </Badge>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default function TeamPerformancePage() {
  const { t, locale } = useI18n();
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const storeId = currentStore?.id ?? '1';
  
  const [period, setPeriod] = useState<Period>('today');
  const [timeBand, setTimeBand] = useState<TimeBand>('all');
  const [selectedStaff, setSelectedStaff] = useState<IndividualPerformance | null>(null);
  const [showRecommendationToast, setShowRecommendationToast] = useState(false);
  
  // Get metrics
  const metrics = selectTeamPerformanceMetrics(state, period, timeBand);
  
  if (!currentStore) {
    return null;
  }
  
  const { teamSnapshot, skillMixCoverage, individuals, coachingActions, promotionCandidates, dataAvailability } = metrics;
  
  // Handle promotion recommendation
  const handleCreateRecommendation = (candidate: PromotionCandidate) => {
    // In real implementation, this would open Ask OS or create a draft
    const text = `推薦: ${candidate.staffName}さん (現在★${candidate.currentStar}) の昇格を提案します。\n理由:\n${candidate.criteria.map(c => `- ${c}`).join('\n')}`;
    console.log('[v0] Recommendation text:', text);
    setShowRecommendationToast(true);
    setTimeout(() => setShowRecommendationToast(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <OSHeader
        title={t('teamPerformance.title')}
        showTimeBandTabs={false}
      />

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="today">{t('teamPerformance.period.today')}</TabsTrigger>
                <TabsTrigger value="7d">{t('teamPerformance.period.7d')}</TabsTrigger>
                <TabsTrigger value="4w">{t('teamPerformance.period.4w')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time Band:</span>
            <Select value={timeBand} onValueChange={(v) => setTimeBand(v as TimeBand)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <FreshnessBadge lastUpdate={metrics.lastUpdate} />
          </div>
        </div>
        
        {/* Data Availability Warning */}
        {(!dataAvailability.hasLaborData || !dataAvailability.hasQuestData) && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              {!dataAvailability.hasLaborData && <div>{t('teamPerformance.empty.noLabor')}</div>}
              {!dataAvailability.hasQuestData && <div>{t('teamPerformance.empty.noQuests')}</div>}
            </div>
          </div>
        )}
        
        {/* Team Snapshot Cards (6) */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <SnapshotCard
            title={t('teamPerformance.snapshot.teamScore')}
            value={teamSnapshot.teamScoreAvg}
            suffix="pt"
            icon={Target}
          />
          <SnapshotCard
            title={t('teamPerformance.snapshot.questCompletion')}
            value={teamSnapshot.questCompletion.rate}
            suffix="%"
            icon={CheckCircle}
            notTrackedMessage={
              teamSnapshot.questCompletion.total === 0 
                ? t('teamPerformance.snapshot.noData')
                : undefined
            }
          />
          <SnapshotCard
            title={t('teamPerformance.snapshot.delayRate')}
            value={teamSnapshot.delayRate}
            suffix="%"
            icon={Timer}
            isInverse={true}
          />
          <SnapshotCard
            title={t('teamPerformance.snapshot.breakCompliance')}
            value={teamSnapshot.breakCompliance}
            suffix="%"
            icon={Coffee}
          />
          <SnapshotCard
            title={t('teamPerformance.snapshot.overtimeRate')}
            value={teamSnapshot.overtimeRate}
            suffix="%"
            icon={Clock}
            isInverse={true}
          />
          <SnapshotCard
            title={t('teamPerformance.snapshot.qualityNgRate')}
            value={teamSnapshot.qualityNgRate}
            suffix="%"
            icon={AlertTriangle}
            isInverse={true}
            notTrackedMessage={
              !dataAvailability.hasQualityData
                ? t('teamPerformance.empty.noQuality')
                : undefined
            }
          />
        </div>
        
        {/* Weekly Efficiency Summary (mock data for 7-day period) */}
        {period === '7d' && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  {t('teamPerformance.efficiency.title')}
                </CardTitle>
                <Link href={`/stores/${storeId}/os/weekly-review`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t('teamPerformance.efficiency.reviewWeek')}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-3 rounded-lg bg-white border">
                  <div className="text-sm text-muted-foreground">{t('teamPerformance.efficiency.totalSales')}</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {locale === 'ja' ? '¥2,450,000' : '$24,500'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white border">
                  <div className="text-sm text-muted-foreground">{t('teamPerformance.efficiency.totalLaborHours')}</div>
                  <div className="text-2xl font-bold">168h</div>
                </div>
                <div className="p-3 rounded-lg bg-white border">
                  <div className="text-sm text-muted-foreground">{t('teamPerformance.efficiency.salesPerLaborHour')}</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {locale === 'ja' ? '¥14,583' : '$145.83'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white border">
                  <div className="text-sm text-muted-foreground">{t('teamPerformance.efficiency.laborRate')}</div>
                  <div className="text-2xl font-bold text-amber-600">28.5%</div>
                  <div className="text-xs text-muted-foreground">{t('teamPerformance.efficiency.laborRateNote')}</div>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-blue-100 text-sm text-blue-800 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                {t('teamPerformance.efficiency.insight')}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottlenecks Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('teamPerformance.bottlenecks.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Delayed Quests Count */}
              <div className="p-4 rounded-lg border bg-amber-50/50 border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('teamPerformance.bottlenecks.delayedQuests')}</span>
                  <Badge variant="outline" className={cn(
                    teamSnapshot.delayRate !== null && teamSnapshot.delayRate > 20 
                      ? 'bg-red-100 text-red-800 border-red-200' 
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  )}>
                    {teamSnapshot.delayRate !== null ? `${teamSnapshot.delayRate}%` : '-'}
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-amber-700">
                  {teamSnapshot.questCompletion.delayed ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('teamPerformance.bottlenecks.of')} {teamSnapshot.questCompletion.total ?? 0} {t('teamPerformance.bottlenecks.totalQuests')}
                </div>
              </div>

              {/* Top 3 Bottleneck Boxes */}
              <div className="p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-3">{t('teamPerformance.bottlenecks.topBoxes')}</div>
                <div className="space-y-2">
                  {[
                    { name: 'Grill Station', delayCount: 5, avgDelay: 8 },
                    { name: 'Prep Kitchen', delayCount: 3, avgDelay: 12 },
                    { name: 'Dishwash', delayCount: 2, avgDelay: 5 },
                  ].map((box, idx) => (
                    <div key={box.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{box.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-600 tabular-nums">{box.delayCount} {t('teamPerformance.bottlenecks.delays')}</span>
                        <span className="text-muted-foreground tabular-nums">avg +{box.avgDelay}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Contributors & Needs Support */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Contributors */}
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
                {t('teamPerformance.topContributors.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {individuals.length > 0 ? (
                <div className="space-y-3">
                  {individuals
                    .filter(ind => ind.questsDone > 0)
                    .sort((a, b) => b.questsDone - a.questsDone)
                    .slice(0, 3)
                    .map((ind, idx) => (
                      <div key={ind.staffId} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-emerald-600">{idx + 1}</span>
                          <div>
                            <div className="font-medium">{ind.name}</div>
                            <div className="flex items-center gap-1">
                              <StarRating level={ind.starLevel} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-700">{ind.questsDone} quests</div>
                          <div className="text-xs text-muted-foreground">Score: {ind.score}</div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {t('teamPerformance.snapshot.noData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Needs Support */}
          <Card className="border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                {t('teamPerformance.needsSupport.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {individuals.length > 0 ? (
                <div className="space-y-3">
                  {individuals
                    .filter(ind => 
                      (ind.delayRate !== null && ind.delayRate > 30) ||
                      ind.qualityNgCount > 0 ||
                      (ind.hoursWorked !== null && ind.hoursWorked > 8)
                    )
                    .slice(0, 3)
                    .map((ind) => (
                      <div key={ind.staffId} className="p-2 rounded-lg bg-amber-50/50 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ind.name}</span>
                            <StarRating level={ind.starLevel} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {ind.delayRate !== null && ind.delayRate > 30 && (
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                              <Timer className="h-3 w-3 mr-1" />
                              {t('teamPerformance.needsSupport.highDelay')} {ind.delayRate}%
                            </Badge>
                          )}
                          {ind.qualityNgCount > 0 && (
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              {ind.qualityNgCount} NG
                            </Badge>
                          )}
                          {ind.hoursWorked !== null && ind.hoursWorked > 8 && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {t('teamPerformance.needsSupport.overtime')} {(ind.hoursWorked - 8).toFixed(1)}h
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  {individuals.filter(ind => 
                    (ind.delayRate !== null && ind.delayRate > 30) ||
                    ind.qualityNgCount > 0 ||
                    (ind.hoursWorked !== null && ind.hoursWorked > 8)
                  ).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {t('teamPerformance.needsSupport.none')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {t('teamPerformance.snapshot.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Skill Mix Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('teamPerformance.skillMix.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Star Mix */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('teamPerformance.skillMix.starMix')}</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold ml-1">{skillMixCoverage.starMix.star3}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold ml-1">{skillMixCoverage.starMix.star2}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold ml-1">{skillMixCoverage.starMix.star1}</span>
                  </div>
                </div>
              </div>
              
              {/* Role Mix */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('teamPerformance.skillMix.roleMix')}</div>
                <div className="flex flex-wrap gap-2">
                  {skillMixCoverage.roleMix.size > 0 ? (
                    Array.from(skillMixCoverage.roleMix.entries()).map(([role, count]) => (
                      <Badge key={role} variant="outline">
                        {role}: {count}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">{t('teamPerformance.snapshot.noData')}</span>
                  )}
                </div>
              </div>
              
              {/* Peak Coverage */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('teamPerformance.skillMix.peakCoverage')}</div>
                <PeakCoverageBadge 
                  coverage={skillMixCoverage.peakCoverage} 
                  reason={skillMixCoverage.peakCoverageReason}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Individual Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('teamPerformance.individuals.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {individuals.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('teamPerformance.individuals.name')}</TableHead>
                      <TableHead className="text-center">{t('teamPerformance.individuals.star')}</TableHead>
                      <TableHead>{t('teamPerformance.individuals.role')}</TableHead>
                      <TableHead className="text-right">{t('teamPerformance.individuals.hours')}</TableHead>
                      <TableHead className="text-center">{t('teamPerformance.individuals.quests')}</TableHead>
                      <TableHead className="text-center">{t('teamPerformance.individuals.durationVsEst')}</TableHead>
                      <TableHead className="text-center">{t('teamPerformance.individuals.delayRate')}</TableHead>
                      <TableHead className="text-center">{t('teamPerformance.individuals.breakOk')}</TableHead>
                      <TableHead className="text-center">{t('teamPerformance.individuals.quality')}</TableHead>
                      <TableHead className="text-center">{t('teamPerformance.individuals.score')}</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {individuals.map((ind) => (
                      <TableRow 
                        key={ind.staffId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedStaff(ind)}
                      >
                        <TableCell className="font-medium">{ind.name}</TableCell>
                        <TableCell className="text-center">
                          <StarRating level={ind.starLevel} />
                        </TableCell>
                        <TableCell>
                          <span className="truncate max-w-[80px] block">{ind.roleName}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {ind.hoursWorked !== null ? (
                            `${ind.hoursWorked}h`
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {ind.questsDone}/{ind.questsTotal}
                        </TableCell>
                        <TableCell className="text-center">
                          {ind.avgDurationVsEstimate !== null ? (
                            <span className={cn(
                              'tabular-nums',
                              ind.avgDurationVsEstimate <= 100 ? 'text-emerald-600' :
                              ind.avgDurationVsEstimate <= 120 ? 'text-amber-600' :
                              'text-red-600'
                            )}>
                              {ind.avgDurationVsEstimate}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {ind.delayRate !== null ? (
                            <span className={cn(
                              'tabular-nums',
                              ind.delayRate <= 10 ? 'text-emerald-600' :
                              ind.delayRate <= 30 ? 'text-amber-600' :
                              'text-red-600'
                            )}>
                              {ind.delayRate}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {ind.breakCompliance === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : ind.breakCompliance ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(ind.qualityOkCount + ind.qualityNgCount) > 0 ? (
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <span className="text-emerald-600">{ind.qualityOkCount}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-red-600">{ind.qualityNgCount}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            'font-bold tabular-nums',
                            ind.score >= 80 ? 'text-emerald-600' :
                            ind.score >= 60 ? 'text-amber-600' :
                            'text-red-600'
                          )}>
                            {ind.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('teamPerformance.individuals.noStaff')}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Coaching Actions (max 5) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              {t('teamPerformance.coaching.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coachingActions.length > 0 ? (
              <div className="space-y-3">
                {coachingActions.map((action) => (
                  <div 
                    key={action.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <PriorityBadge priority={action.priority} />
                          {action.targetStaffName && (
                            <span className="text-sm text-muted-foreground">
                              {action.targetStaffName}
                            </span>
                          )}
                        </div>
                        <p className="font-medium">{action.action}</p>
                        <p className="text-sm text-muted-foreground">{action.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('teamPerformance.coaching.noActions')}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Promotion Candidates (max 5) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-500" />
              {t('teamPerformance.promotion.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {promotionCandidates.length > 0 ? (
              <div className="space-y-3">
                {promotionCandidates.map((candidate) => (
                  <div 
                    key={candidate.staffId}
                    className="p-4 rounded-lg border bg-purple-50/50 border-purple-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold">{candidate.staffName}</h4>
                          <Badge variant="outline" className="bg-purple-100 text-purple-800">
                            {t('teamPerformance.promotion.currentStar')} ★{candidate.currentStar}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {t('teamPerformance.individuals.score')}: {candidate.score}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {t('teamPerformance.promotion.criteria')}:
                        </div>
                        <ul className="text-sm space-y-1">
                          {candidate.criteria.map((c, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateRecommendation(candidate)}
                      >
                        <Award className="h-4 w-4 mr-1" />
                        {t('teamPerformance.promotion.createRecommendation')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('teamPerformance.promotion.noCandidates')}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Toast for recommendation created */}
        {showRecommendationToast && (
          <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg">
            {t('teamPerformance.promotion.recommendationCreated')}
          </div>
        )}
      </main>
      
      {/* Staff Detail Drawer */}
      <StaffDetailDrawer
        individual={selectedStaff}
        isOpen={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
      />
    </div>
  );
}
