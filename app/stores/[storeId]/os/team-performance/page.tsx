'use client';

import React, { useState, useMemo } from 'react';
import { OSHeader } from '@/components/OSHeader';
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
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import {
  selectCurrentStore,
  selectLaborMetrics,
  selectStaffStates,
} from '@/core/selectors';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Clock,
  Trophy,
  Target,
  Award,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Staff } from '@/core/types';

// Staff performance data interface
interface StaffPerformance {
  staff: Staff;
  questsCompleted: number;
  questsTotal: number;
  avgCompletionTime: number; // percentage vs estimate
  qualityScore: number; // 0-100
  attendanceScore: number; // 0-100
  overallScore: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  rank: number;
}

// Mock performance calculation (would be derived from events)
function calculateStaffPerformance(staff: Staff[], storeId: string): StaffPerformance[] {
  const storeStaff = staff.filter(s => s.storeId === storeId);
  
  // Generate mock performance data
  const performances: StaffPerformance[] = storeStaff.map((s, idx) => {
    // Randomized but deterministic based on staff id
    const seed = s.id.charCodeAt(s.id.length - 1);
    const questsCompleted = 10 + (seed % 15);
    const questsTotal = questsCompleted + (seed % 5);
    const avgCompletionTime = 85 + (seed % 30);
    const qualityScore = 70 + (seed % 30);
    const attendanceScore = 80 + (seed % 20);
    const overallScore = Math.round((qualityScore * 0.4 + attendanceScore * 0.3 + Math.min(100, avgCompletionTime) * 0.3));
    
    return {
      staff: s,
      questsCompleted,
      questsTotal,
      avgCompletionTime,
      qualityScore,
      attendanceScore,
      overallScore,
      trend: seed % 3 === 0 ? 'up' : seed % 3 === 1 ? 'down' : 'stable',
      rank: 0, // Will be set after sorting
    };
  });
  
  // Sort by overall score and assign ranks
  performances.sort((a, b) => b.overallScore - a.overallScore);
  performances.forEach((p, idx) => {
    p.rank = idx + 1;
  });
  
  return performances;
}

// Star rating display
function StarRating({ level }: { level: number }) {
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

// Trend indicator
function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  }
  if (trend === 'down') {
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  }
  return <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">-</span>;
}

// Rank badge
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
        <Trophy className="h-3 w-3 mr-1" />
        1st
      </Badge>
    );
  }
  if (rank === 2) {
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200">
        2nd
      </Badge>
    );
  }
  if (rank === 3) {
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
        3rd
      </Badge>
    );
  }
  return (
    <span className="text-muted-foreground text-sm">{rank}th</span>
  );
}

export default function TeamPerformancePage() {
  const { t, locale } = useI18n();
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const today = new Date().toISOString().split('T')[0];
  const laborMetrics = selectLaborMetrics(state, today);
  
  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'quests' | 'quality'>('rank');
  
  // Calculate staff performances
  const performances = useMemo(() => {
    if (!currentStore) return [];
    return calculateStaffPerformance(state.staff, currentStore.id);
  }, [state.staff, currentStore]);
  
  // Sort performances
  const sortedPerformances = useMemo(() => {
    const sorted = [...performances];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.staff.name.localeCompare(b.staff.name));
        break;
      case 'quests':
        sorted.sort((a, b) => b.questsCompleted - a.questsCompleted);
        break;
      case 'quality':
        sorted.sort((a, b) => b.qualityScore - a.qualityScore);
        break;
      default:
        sorted.sort((a, b) => a.rank - b.rank);
    }
    return sorted;
  }, [performances, sortBy]);
  
  // Summary stats
  const avgScore = performances.length > 0 
    ? Math.round(performances.reduce((sum, p) => sum + p.overallScore, 0) / performances.length)
    : 0;
  const totalQuests = performances.reduce((sum, p) => sum + p.questsCompleted, 0);
  const avgQuality = performances.length > 0
    ? Math.round(performances.reduce((sum, p) => sum + p.qualityScore, 0) / performances.length)
    : 0;
  
  if (!currentStore) {
    return null;
  }
  
  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  return (
    <div className="flex flex-col h-full bg-background">
      <OSHeader
        title={t('teamPerformance.title')}
        showTimeBandTabs={false}
      />

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Team Members */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('teamPerformance.teamSize')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {performances.length}
                </span>
                <span className="text-lg text-muted-foreground">{t('teamPerformance.members')}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Average Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('teamPerformance.avgScore')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-3xl font-bold tabular-nums',
                  avgScore >= 90 ? 'text-emerald-600' :
                  avgScore >= 70 ? 'text-blue-600' :
                  'text-amber-600'
                )}>
                  {avgScore}
                </span>
                <span className="text-lg text-muted-foreground">pt</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Total Quests */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4" />
                {t('teamPerformance.questsCompleted')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold tabular-nums text-emerald-600">
                  {totalQuests}
                </span>
                <span className="text-lg text-muted-foreground">{t('teamPerformance.quests')}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Average Quality */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                {t('teamPerformance.avgQuality')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-3xl font-bold tabular-nums',
                  avgQuality >= 90 ? 'text-emerald-600' :
                  avgQuality >= 70 ? 'text-blue-600' :
                  'text-amber-600'
                )}>
                  {avgQuality}
                </span>
                <span className="text-lg text-muted-foreground">%</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                {t('teamPerformance.topPerformers')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {performances.slice(0, 3).map((perf) => (
                <div
                  key={perf.staff.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    perf.rank === 1 ? 'bg-amber-50 border-amber-200' :
                    perf.rank === 2 ? 'bg-slate-50 border-slate-200' :
                    'bg-orange-50 border-orange-200'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <RankBadge rank={perf.rank} />
                    <TrendIndicator trend={perf.trend} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">{perf.staff.name}</h3>
                    <StarRating level={perf.staff.skillLevel} />
                  </div>
                  <div className="mt-3 pt-3 border-t text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teamPerformance.score')}</span>
                      <span className="font-bold">{perf.overallScore}pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teamPerformance.quests')}</span>
                      <span>{perf.questsCompleted}/{perf.questsTotal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Staff Performance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('teamPerformance.staffList')}
              </CardTitle>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rank">{t('teamPerformance.sortByRank')}</SelectItem>
                  <SelectItem value="name">{t('teamPerformance.sortByName')}</SelectItem>
                  <SelectItem value="quests">{t('teamPerformance.sortByQuests')}</SelectItem>
                  <SelectItem value="quality">{t('teamPerformance.sortByQuality')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">{t('teamPerformance.rank')}</TableHead>
                    <TableHead>{t('teamPerformance.name')}</TableHead>
                    <TableHead className="text-center">{t('teamPerformance.level')}</TableHead>
                    <TableHead className="text-center">{t('teamPerformance.quests')}</TableHead>
                    <TableHead className="text-center">{t('teamPerformance.quality')}</TableHead>
                    <TableHead className="text-center">{t('teamPerformance.attendance')}</TableHead>
                    <TableHead className="text-center">{t('teamPerformance.score')}</TableHead>
                    <TableHead className="w-[50px]">{t('teamPerformance.trend')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPerformances.map((perf) => (
                    <TableRow key={perf.staff.id}>
                      <TableCell>
                        <RankBadge rank={perf.rank} />
                      </TableCell>
                      <TableCell className="font-medium">{perf.staff.name}</TableCell>
                      <TableCell className="text-center">
                        <StarRating level={perf.staff.skillLevel} />
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {perf.questsCompleted}/{perf.questsTotal}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-medium tabular-nums',
                          perf.qualityScore >= 90 ? 'text-emerald-600' :
                          perf.qualityScore >= 70 ? 'text-blue-600' :
                          'text-amber-600'
                        )}>
                          {perf.qualityScore}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-medium tabular-nums',
                          perf.attendanceScore >= 90 ? 'text-emerald-600' :
                          perf.attendanceScore >= 70 ? 'text-blue-600' :
                          'text-amber-600'
                        )}>
                          {perf.attendanceScore}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-bold tabular-nums',
                          perf.overallScore >= 90 ? 'text-emerald-600' :
                          perf.overallScore >= 70 ? 'text-blue-600' :
                          'text-amber-600'
                        )}>
                          {perf.overallScore}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TrendIndicator trend={perf.trend} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Link to Awards */}
        <div className="flex justify-end">
          <Link href={`/stores/${currentStore.id}/os/awards`}>
            <Button variant="outline" className="gap-2">
              {t('teamPerformance.viewAwards')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
