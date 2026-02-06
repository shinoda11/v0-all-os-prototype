'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { useViewMode } from '@/core/viewMode';
import { selectActiveTodos } from '@/core/selectors';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Database,
  BookOpen,
  ClipboardList,
  UserCheck,
  Play,
  Check,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface MvpStep {
  id: string;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
  href: string;
  isComplete: boolean;
  isCurrent: boolean;
}

interface MvpFlowWizardProps {
  storeId: string;
}

export function MvpFlowWizard({ storeId }: MvpFlowWizardProps) {
  const { state, actions } = useStore();
  const { t } = useI18n();
  const [viewMode, setViewMode] = useViewMode();

  // Derive completion status for each step
  const steps = useMemo<MvpStep[]>(() => {
    const hasTaskCards = (state.taskCards || []).length > 0;
    const hasBoxTemplates = (state.boxTemplates || []).length > 0;
    const hasDataset = hasTaskCards && hasBoxTemplates;

    const today = new Date().toISOString().slice(0, 10);
    const todayPlan = (state.dayPlans || []).find(
      (dp) => dp.date === today && dp.storeId === (state.selectedStoreId || '1')
    );
    const hasDraftPlan = !!todayPlan && ['draft', 'review', 'confirmed', 'live'].includes(todayPlan.status);
    const isConfirmed = !!todayPlan && ['confirmed', 'live'].includes(todayPlan.status);
    const isLive = !!todayPlan && todayPlan.status === 'live';

    const hasActiveTodos = selectActiveTodos(state, undefined).length > 0;
    const isStaffView = viewMode === 'staff';

    // Find the first incomplete step
    const completions = [hasDataset, hasTaskCards && hasBoxTemplates, hasDraftPlan, isConfirmed || isLive, isLive && isStaffView];
    const firstIncompleteIdx = completions.findIndex((c) => !c);

    return [
      {
        id: 'load-dataset',
        labelKey: 'mvp.step1',
        descKey: 'mvp.step1Desc',
        icon: <Database className="h-5 w-5" />,
        href: '#load',
        isComplete: hasDataset,
        isCurrent: firstIncompleteIdx === 0,
      },
      {
        id: 'task-catalog',
        labelKey: 'mvp.step2',
        descKey: 'mvp.step2Desc',
        icon: <BookOpen className="h-5 w-5" />,
        href: `/stores/${storeId}/os/task-catalog`,
        isComplete: hasTaskCards && hasBoxTemplates,
        isCurrent: firstIncompleteIdx === 1,
      },
      {
        id: 'build-plan',
        labelKey: 'mvp.step3',
        descKey: 'mvp.step3Desc',
        icon: <ClipboardList className="h-5 w-5" />,
        href: `/stores/${storeId}/os/plan-builder`,
        isComplete: hasDraftPlan,
        isCurrent: firstIncompleteIdx === 2,
      },
      {
        id: 'confirm-plan',
        labelKey: 'mvp.step4',
        descKey: 'mvp.step4Desc',
        icon: <UserCheck className="h-5 w-5" />,
        href: `/stores/${storeId}/os/confirm-plan`,
        isComplete: isConfirmed || isLive,
        isCurrent: firstIncompleteIdx === 3,
      },
      {
        id: 'execute',
        labelKey: 'mvp.step5',
        descKey: 'mvp.step5Desc',
        icon: <Play className="h-5 w-5" />,
        href: `/stores/${storeId}/floor/todo`,
        isComplete: isLive && isStaffView && hasActiveTodos,
        isCurrent: firstIncompleteIdx === 4,
      },
    ];
  }, [state, storeId, viewMode]);

  const allDone = steps.every((s) => s.isComplete);
  const completedCount = steps.filter((s) => s.isComplete).length;

  const handleLoadDataset = () => {
    actions.seedDemoData();
  };

  const handleSwitchToStaff = () => {
    setViewMode('staff');
  };

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            {t('mvp.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('mvp.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
          <div className="flex gap-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-colors',
                  step.isComplete
                    ? 'bg-primary'
                    : step.isCurrent
                      ? 'bg-primary/40 animate-pulse'
                      : 'bg-muted-foreground/20'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isLoadStep = step.id === 'load-dataset';
          const isExecuteStep = step.id === 'execute';

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-4 rounded-lg px-4 py-3 transition-all',
                step.isComplete
                  ? 'bg-primary/5'
                  : step.isCurrent
                    ? 'bg-background border-2 border-primary/30 shadow-sm'
                    : 'bg-muted/30 opacity-60'
              )}
            >
              {/* Step number / check */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold',
                  step.isComplete
                    ? 'bg-primary text-primary-foreground'
                    : step.isCurrent
                      ? 'bg-primary/10 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {step.isComplete ? <Check className="h-4 w-4" /> : idx + 1}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  'shrink-0',
                  step.isComplete
                    ? 'text-primary'
                    : step.isCurrent
                      ? 'text-primary'
                      : 'text-muted-foreground'
                )}
              >
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{t(step.labelKey)}</div>
                <div className="text-xs text-muted-foreground truncate">{t(step.descKey)}</div>
              </div>

              {/* Action button */}
              {step.isCurrent && !step.isComplete && (
                <>
                  {isLoadStep ? (
                    <Button size="sm" onClick={handleLoadDataset} className="shrink-0 gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      {t('mvp.loadData')}
                    </Button>
                  ) : isExecuteStep ? (
                    <Button size="sm" onClick={handleSwitchToStaff} className="shrink-0 gap-1.5">
                      <Play className="h-3.5 w-3.5" />
                      {t('mvp.switchToStaff')}
                    </Button>
                  ) : (
                    <Link href={step.href}>
                      <Button size="sm" className="shrink-0 gap-1.5">
                        {t('mvp.go')}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {step.isComplete && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* All done message */}
      {allDone && (
        <div className="mt-4 p-3 rounded-lg bg-primary/10 text-center">
          <p className="text-sm font-medium text-primary">{t('mvp.allDone')}</p>
        </div>
      )}
    </div>
  );
}
