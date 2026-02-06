'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { selectCurrentStore, selectActiveTodos, selectCompletedTodos } from '@/core/selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/PageHeader';
import { useParams } from 'next/navigation';
import { MvpFlowWizard } from '@/components/os/MvpFlowWizard';
import { 
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';

export default function CockpitPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();
  const params = useParams();
  const storeId = params?.storeId as string;

  // Early return if store not loaded
  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  // Get quest data
  const activeTodos = selectActiveTodos(state, undefined);
  const completedTodos = selectCompletedTodos(state);
  const totalQuests = activeTodos.length + completedTodos.length;
  const completedCount = completedTodos.length;
  const progressPercent = totalQuests > 0 ? Math.round((completedCount / totalQuests) * 100) : 0;

  // Get staff data
  const storeStaff = state.staff.filter(s => s.storeId === state.selectedStoreId);
  const onDutyStaff = storeStaff.filter(s => {
    const laborEvents = state.events.filter(e => e.type === 'labor' && (e as any).staffId === s.id);
    if (laborEvents.length === 0) return false;
    const lastEvent = laborEvents[laborEvents.length - 1] as any;
    return lastEvent.action === 'clockIn' || lastEvent.action === 'breakEnd';
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('cockpit.title')}
        subtitle={`${currentStore.name} - ${new Date().toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', day: 'numeric' })}`}
      />

      {/* MVP Flow Wizard - 5-step guided demo path */}
      <MvpFlowWizard storeId={storeId} />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('cockpit.sales')}</span>
            </div>
            <div className="text-2xl font-bold mt-1">--</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('cockpit.staff')}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{onDutyStaff.length}/{storeStaff.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('cockpit.quests')}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{completedCount}/{totalQuests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('cockpit.progress')}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{progressPercent}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Quest Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t('cockpit.questProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercent} className="h-3" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} / {totalQuests} {t('cockpit.questsCompleted')}
            </span>
            <Badge variant={progressPercent >= 80 ? 'default' : progressPercent >= 50 ? 'secondary' : 'outline'}>
              {progressPercent}%
            </Badge>
          </div>

          {totalQuests === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                {t('cockpit.noQuests')}
              </p>
              <Link href={`/stores/${storeId}/os/plan-builder`}>
                <Button size="sm">
                  {t('cockpit.generatePlan')}
                </Button>
              </Link>
            </div>
          ) : (
            <Link href={`/stores/${storeId}/os/ops-monitor`}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <ClipboardList className="h-4 w-4" />
                {t('cockpit.openOpsMonitor')}
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
