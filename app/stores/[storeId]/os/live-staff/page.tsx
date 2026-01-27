'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { OSHeader } from '@/components/OSHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { formatHours } from '@/i18n/format';
import { selectCurrentStore, selectLaborMetrics, selectStaffStates } from '@/core/selectors';
import type { Staff } from '@/core/types';
import type { StaffStatus } from '@/core/derive';
import {
  Users,
  Coffee,
  Clock,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Live Staff Page - Manager View
 * 
 * Shows all staff status without action buttons.
 * Manager can see overview but cannot clock in/out for staff.
 */

// Status display config
const STATUS_CONFIG: Record<StaffStatus, { 
  label: string; 
  labelEn: string;
  icon: React.ReactNode; 
  className: string;
  bgClass: string;
}> = {
  working: { 
    label: '出勤中', 
    labelEn: 'On Duty',
    icon: <UserCheck className="h-4 w-4" />, 
    className: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  break: { 
    label: '休憩中', 
    labelEn: 'On Break',
    icon: <Coffee className="h-4 w-4" />, 
    className: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  out: { 
    label: '未出勤', 
    labelEn: 'Off Duty',
    icon: <UserX className="h-4 w-4" />, 
    className: 'text-muted-foreground',
    bgClass: 'bg-muted/50 border-border',
  },
};

function CurrentTimeDisplay() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="text-center">
      <div className="text-3xl font-bold tabular-nums">
        {time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-sm text-muted-foreground">
        {time.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function SummaryCard({ icon, label, value, subValue, variant = 'default' }: SummaryCardProps) {
  const variantClasses = {
    default: '',
    success: 'border-emerald-200 bg-emerald-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
    danger: 'border-red-200 bg-red-50/50',
  };
  
  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-background">{icon}</div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StaffRowProps {
  staff: Staff;
  status: StaffStatus;
  lastAction?: string;
  hoursWorked: number;
  breakMinutes: number;
  hasBreakWarning: boolean;
  locale: string;
}

function StaffRow({ staff, status, lastAction, hoursWorked, breakMinutes, hasBreakWarning, locale }: StaffRowProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg border',
      config.bgClass
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-full', config.bgClass, config.className)}>
          {config.icon}
        </div>
        <div>
          <div className="font-medium">{staff.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', config.className)}>
              {locale === 'ja' ? config.label : config.labelEn}
            </Badge>
            {lastAction && (
              <span>
                {new Date(lastAction).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {status !== 'out' && (
          <>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">稼働</div>
              <div className="font-bold tabular-nums">{hoursWorked.toFixed(1)}h</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">休憩</div>
              <div className={cn(
                'font-bold tabular-nums',
                hasBreakWarning && 'text-red-600'
              )}>
                {breakMinutes}m
                {hasBreakWarning && (
                  <AlertTriangle className="h-3 w-3 inline ml-1 text-red-600" />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LiveStaffPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  
  const laborMetrics = selectLaborMetrics(state, today);
  const staffStates = selectStaffStates(state, today);
  
  const storeStaff = state.staff.filter((s) => s.storeId === state.selectedStoreId);
  
  if (!currentStore) {
    return null;
  }
  
  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');
  
  // Group staff by status
  const staffByStatus = {
    working: storeStaff.filter(s => staffStates.get(s.id)?.status === 'working'),
    break: storeStaff.filter(s => staffStates.get(s.id)?.status === 'break'),
    out: storeStaff.filter(s => !staffStates.get(s.id) || staffStates.get(s.id)?.status === 'out'),
  };
  
  // Calculate break warnings (staff working >4h without break)
  const breakWarnings = staffByStatus.working.filter(s => {
    const state = staffStates.get(s.id);
    if (!state) return false;
    const hoursWorked = state.totalMinutes / 60;
    const breakTaken = state.breakMinutes > 0;
    return hoursWorked >= 4 && !breakTaken;
  });
  
  return (
    <div className="space-y-6">
      <OSHeader
        title={t('liveStaff.title')}
        showTimeBandTabs={false}
      />
      
      {/* Current Time */}
      <Card>
        <CardContent className="p-4">
          <CurrentTimeDisplay />
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          label={t('liveStaff.onDuty')}
          value={laborMetrics.activeStaffCount}
          subValue={`/ ${storeStaff.length}${t('timeclock.persons')}`}
          variant="success"
        />
        <SummaryCard
          icon={<Coffee className="h-5 w-5 text-amber-600" />}
          label={t('liveStaff.onBreak')}
          value={laborMetrics.onBreakCount}
          variant={laborMetrics.onBreakCount > 0 ? 'warning' : 'default'}
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5 text-blue-600" />}
          label={t('liveStaff.totalHours')}
          value={formatHours(laborMetrics.totalHoursToday, locale)}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label={t('liveStaff.breakWarning')}
          value={breakWarnings.length}
          variant={breakWarnings.length > 0 ? 'danger' : 'default'}
        />
      </div>
      
      {/* Break Warning Alert */}
      {breakWarnings.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-800">{t('liveStaff.breakWarningTitle')}</div>
                <div className="text-sm text-red-700">
                  {breakWarnings.map(s => s.name).join('、')} - {t('liveStaff.breakWarningDesc')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Staff List by Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('liveStaff.staffList')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* On Duty */}
          {staffByStatus.working.map(staff => {
            const state = staffStates.get(staff.id);
            return (
              <StaffRow
                key={staff.id}
                staff={staff}
                status="working"
                lastAction={state?.lastAction}
                hoursWorked={(state?.totalMinutes ?? 0) / 60}
                breakMinutes={state?.breakMinutes ?? 0}
                hasBreakWarning={breakWarnings.some(w => w.id === staff.id)}
                locale={locale}
              />
            );
          })}
          
          {/* On Break */}
          {staffByStatus.break.map(staff => {
            const state = staffStates.get(staff.id);
            return (
              <StaffRow
                key={staff.id}
                staff={staff}
                status="break"
                lastAction={state?.lastAction}
                hoursWorked={(state?.totalMinutes ?? 0) / 60}
                breakMinutes={state?.breakMinutes ?? 0}
                hasBreakWarning={false}
                locale={locale}
              />
            );
          })}
          
          {/* Off Duty - collapsed */}
          {staffByStatus.out.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2">
                {t('liveStaff.offDuty')} ({staffByStatus.out.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {staffByStatus.out.map(staff => (
                  <Badge key={staff.id} variant="outline" className="text-muted-foreground">
                    {staff.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
