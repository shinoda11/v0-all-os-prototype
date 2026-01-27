'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { OSHeader } from '@/components/OSHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency } from '@/i18n/format';
import { selectIncentiveDistribution, selectCurrentStore } from '@/core/selectors';
import {
  Gift,
  Target,
  TrendingUp,
  Users,
  Star,
  Info,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IncentivesPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { state } = useStore();
  const { t, locale } = useI18n();
  const currentStore = selectCurrentStore(state);
  
  const today = new Date().toISOString().split('T')[0];
  const distribution = selectIncentiveDistribution(state, today);
  const { pool, staffShares, totalPoints, status } = distribution;

  // Summary stats
  const topContributors = staffShares.slice(0, 3);
  const eligibleStaff = staffShares.length;

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <OSHeader
        title={t('incentive.title')}
        subtitle={t('incentive.subtitle')}
        showBackButton
      />

      <main className="flex-1 p-4 space-y-6 max-w-5xl mx-auto w-full">
        {/* Pool Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Target className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('incentive.targetSales')}</div>
                  <div className="text-xl font-bold">{formatCurrency(pool.targetSales, locale)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    {pool.useSalesValue === 'runRate' ? t('incentive.projectedSales') : t('incentive.actualSales')}
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(pool.salesForCalculation, locale)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Gift className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('incentive.overachievement')}</div>
                  <div className="text-xl font-bold text-amber-700">
                    {formatCurrency(pool.overAchievement, locale)}
                    {pool.overAchievementRate !== null && (
                      <span className="text-sm font-normal ml-1">({pool.overAchievementRate}%)</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-200">
                  <Gift className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('incentive.poolAmount')}</div>
                  <div className="text-2xl font-bold text-emerald-700">{formatCurrency(pool.pool, locale)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('incentive.poolShare')}: {(pool.poolShare * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <Badge 
                variant={status === 'finalized' ? 'default' : 'secondary'} 
                className="mt-2"
              >
                {status === 'finalized' ? t('incentive.finalized') : t('incentive.projected')}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Top Contributors */}
        {topContributors.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                {t('incentive.topContributors')}
              </CardTitle>
              <CardDescription>{t('incentive.topContributorsNote')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {topContributors.map((staff, index) => (
                  <div
                    key={staff.staffId}
                    className={cn(
                      'p-4 rounded-lg border',
                      index === 0 ? 'bg-amber-50 border-amber-200' :
                      index === 1 ? 'bg-slate-50 border-slate-200' :
                      'bg-orange-50/50 border-orange-200'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                        index === 0 ? 'bg-amber-500' :
                        index === 1 ? 'bg-slate-400' :
                        'bg-orange-400'
                      )}>
                        {index + 1}
                      </div>
                      <span className="font-medium truncate">{staff.staffName}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('incentive.points')}</span>
                        <span className="font-bold">{staff.points} pt</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('incentive.share')}</span>
                        <span className="font-medium">{staff.sharePercentage}%</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span className="text-muted-foreground">{t('incentive.projectedBonus')}</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(staff.estimatedShare, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribution Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('incentive.distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffShares.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('incentive.noData')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('incentive.staff')}</TableHead>
                      <TableHead className="text-right">{t('incentive.points')}</TableHead>
                      <TableHead className="text-right">{t('incentive.share')}</TableHead>
                      <TableHead className="text-right">{t('incentive.projectedBonus')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffShares.map((staff, index) => (
                      <TableRow key={staff.staffId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-5">{index + 1}</span>
                            <span className="font-medium">{staff.staffName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{staff.points}</TableCell>
                        <TableCell className="text-right font-mono">{staff.sharePercentage}%</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(staff.estimatedShare, locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-6 mt-4 pt-4 border-t text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('incentive.totalPoints')}: </span>
                    <span className="font-bold">{totalPoints} pt</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('incentive.totalPool')}: </span>
                    <span className="font-bold text-emerald-700">{formatCurrency(pool.pool, locale)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Explanation Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                {t('incentive.explanation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('incentive.explanationText')}
              </p>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Hours Worked</span>
                    <span className="text-muted-foreground"> - 10 points per hour</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Quest XP</span>
                    <span className="text-muted-foreground"> - 1 point per XP earned</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                {t('incentive.fairnessNote')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('incentive.fairnessText')}
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                Data sources: Labor events (check-in/out, breaks), Quest completion logs
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
