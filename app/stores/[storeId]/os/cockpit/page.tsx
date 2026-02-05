'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { selectCurrentStore, selectCockpitMetrics, selectActiveTodos, selectCompletedTodos, selectOpenIncidents } from '@/core/selectors';
import { useStateSubscription } from '@/state/eventBus';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  ClipboardList,
  Play,
} from 'lucide-react';
import type { TimeBand } from '@/core/types';

export default function CockpitPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();

  // Subscribe to state updates
  useStateSubscription(['sales', 'labor', 'prep', 'decision', 'cockpit-sales', 'cockpit-operations']);

  // Early return if store not loaded
  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  // Get metrics
  const metrics = selectCockpitMetrics(state, 'all');
  const activeTodos = selectActiveTodos(state, undefined);
  const completedTodos = selectCompletedTodos(state);
  const incidents = selectOpenIncidents(state);

  // Calculate quest progress
  const questTotal = activeTodos.length + completedTodos.length;
  const questCompleted = completedTodos.length;
  const questProgress = questTotal > 0 ? Math.round((questCompleted / questTotal) * 100) : 0;

  // Sales status
  const salesAchievement = metrics?.salesActual && metrics?.salesForecast && metrics.salesForecast > 0
    ? Math.round((metrics.salesActual / metrics.salesForecast) * 100)
    : 0;
  const salesStatus = salesAchievement >= 100 ? 'success' : salesAchievement >= 80 ? 'warning' : 'danger';

  // Labor rate
  const laborRate = metrics?.laborRate ?? 0;
  const laborStatus = laborRate <= 30 ? 'success' : laborRate <= 35 ? 'warning' : 'danger';

  const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;
  const formatPercent = (value: number) => `${Math.round(value)}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('cockpit.title')}
        subtitle={`${currentStore.name} - ${new Date().toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', day: 'numeric' })}`}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales KPI */}
        <Card className={cn(
          'border-l-4',
          salesStatus === 'success' && 'border-l-emerald-500',
          salesStatus === 'warning' && 'border-l-amber-500',
          salesStatus === 'danger' && 'border-l-red-500'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('cockpit.sales.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.salesActual ?? 0)}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'text-sm font-medium',
                salesStatus === 'success' && 'text-emerald-600',
                salesStatus === 'warning' && 'text-amber-600',
                salesStatus === 'danger' && 'text-red-600'
              )}>
                {formatPercent(salesAchievement)} {t('cockpit.sales.achievement')}
              </span>
              {salesAchievement >= 100 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : salesAchievement >= 80 ? (
                <Minus className="h-4 w-4 text-amber-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {t('cockpit.sales.forecast')}: {formatCurrency(metrics?.salesForecast ?? 0)}
            </div>
          </CardContent>
        </Card>

        {/* Labor KPI */}
        <Card className={cn(
          'border-l-4',
          laborStatus === 'success' && 'border-l-emerald-500',
          laborStatus === 'warning' && 'border-l-amber-500',
          laborStatus === 'danger' && 'border-l-red-500'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('cockpit.labor.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(laborRate)}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'text-sm font-medium',
                laborStatus === 'success' && 'text-emerald-600',
                laborStatus === 'warning' && 'text-amber-600',
                laborStatus === 'danger' && 'text-red-600'
              )}>
                {t('cockpit.labor.rate')}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {t('cockpit.labor.staffOnDuty')}: {metrics?.staffOnDuty ?? 0}{t('common.people')}
            </div>
          </CardContent>
        </Card>

        {/* Quest Progress */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {t('cockpit.quest.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questCompleted}/{questTotal}</div>
            <Progress value={questProgress} className="mt-2 h-2" />
            <div className="text-xs text-muted-foreground mt-2">
              {formatPercent(questProgress)} {t('cockpit.quest.complete')}
            </div>
            
            {/* CTA when no quests */}
            {questTotal === 0 && (
              <Link href={`/stores/${storeId}/os/plan`}>
                <Button variant="default" size="sm" className="w-full mt-3 gap-2">
                  <Play className="h-4 w-4" />
                  {t('cockpit.generateTodayPlan')}
                </Button>
              </Link>
            )}
            
            {questTotal > 0 && (
              <Link href={`/stores/${storeId}/os/ops-monitor`}>
                <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {t('cockpit.openOpsMonitor')}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Incidents */}
        <Card className={cn(
          'border-l-4',
          incidents.length === 0 ? 'border-l-emerald-500' : 'border-l-red-500'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('cockpit.incidents.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents.length === 0 ? (
                <span className="text-emerald-600">{t('cockpit.incidents.none')}</span>
              ) : (
                <span className="text-red-600">{incidents.length}{t('cockpit.incidents.count')}</span>
              )}
            </div>
            {incidents.length > 0 && (
              <div className="mt-2 space-y-1">
                {incidents.slice(0, 2).map((incident) => (
                  <div key={incident.id} className="text-xs text-muted-foreground truncate">
                    {incident.title}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('cockpit.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href={`/stores/${storeId}/os/ops-monitor`}>
              <Button variant="outline" size="sm" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                {t('nav.opsMonitor')}
              </Button>
            </Link>
            <Link href={`/stores/${storeId}/os/task-catalog`}>
              <Button variant="outline" size="sm" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {t('nav.taskCatalog')}
              </Button>
            </Link>
            <Link href={`/stores/${storeId}/os/plan`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Play className="h-4 w-4" />
                {t('nav.plan')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
