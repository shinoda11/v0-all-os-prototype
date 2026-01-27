'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/state/store';
import { useAuth } from '@/state/auth';
import { useI18n } from '@/i18n/I18nProvider';
import { formatHours } from '@/i18n/format';
import { selectCurrentStore, selectLaborMetrics, selectStaffStates, selectTodayEarnings, selectIncentiveDistribution } from '@/core/selectors';
import { formatCurrency } from '@/lib/format';
import type { StaffStatus } from '@/core/derive';
import {
  LogIn,
  LogOut,
  Coffee,
  Play,
  Clock,
  Users,
  Banknote,
  Gift,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Time Clock Page - Design Guidelines Compliant
 * 
 * Requirements:
 * - Check in / Break start / Break end / Check out
 * - Current state display (On duty / On break / Off duty)
 * - Simple 4-button interface for floor staff
 * 
 * Design Guidelines:
 * - 2.1: Spacing 4/8/12/16/24/32
 * - 2.4: Touch target 44x44
 * - 2.5: Regular/Bold only
 * - 2.3: Status with icon + label
 */

type ClockAction = 'check-in' | 'break-start' | 'break-end' | 'check-out';

// Status display config with icon + label (2.3 compliance)
const STATUS_CONFIG: Record<StaffStatus, { 
  label: string; 
  labelEn: string;
  icon: React.ReactNode; 
  className: string;
}> = {
  working: { 
    label: '出勤中', 
    labelEn: 'On Duty',
    icon: <LogIn className="h-5 w-5" />, 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
  },
  break: { 
    label: '休憩中', 
    labelEn: 'On Break',
    icon: <Coffee className="h-5 w-5" />, 
    className: 'bg-amber-50 text-amber-700 border-amber-200' 
  },
  out: { 
    label: '未出勤', 
    labelEn: 'Off Duty',
    icon: <LogOut className="h-5 w-5" />, 
    className: 'bg-secondary text-muted-foreground' 
  },
};

// Clock button config
const ACTION_CONFIG: Record<ClockAction, {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'outline';
}> = {
  'check-in': { label: 'Check In', icon: <LogIn className="h-5 w-5" />, variant: 'default' },
  'break-start': { label: 'Break Start', icon: <Coffee className="h-5 w-5" />, variant: 'secondary' },
  'break-end': { label: 'Break End', icon: <Play className="h-5 w-5" />, variant: 'default' },
  'check-out': { label: 'Check Out', icon: <LogOut className="h-5 w-5" />, variant: 'outline' },
};

function CurrentTimeDisplay() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="text-center">
      <div className="text-4xl font-bold tabular-nums">
        {time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {time.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
      </div>
    </div>
  );
}

interface StatusCardProps {
  status: StaffStatus;
  staffName: string;
  lastAction?: string;
}

function StatusCard({ status, staffName, lastAction }: StatusCardProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <Card className={cn('border-2', config.className)}>
      <CardContent className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className={cn('p-4 rounded-full', config.className)}>
            {config.icon}
          </div>
        </div>
        <div className="text-2xl font-bold">{config.labelEn}</div>
        <div className="text-lg text-muted-foreground">{config.label}</div>
        <div className="text-sm text-muted-foreground mt-2">{staffName}</div>
        {lastAction && (
          <div className="text-sm text-muted-foreground mt-1">
            Last: {new Date(lastAction).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ClockButtonProps {
  action: ClockAction;
  onClick: () => void;
  disabled?: boolean;
}

function ClockButton({ action, onClick, disabled }: ClockButtonProps) {
  const config = ACTION_CONFIG[action];
  
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={config.variant}
      className={cn(
        'h-16 text-lg gap-3 flex-1',
        config.variant === 'outline' && 'bg-transparent'
      )}
    >
      {config.icon}
      {config.label}
    </Button>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

function SummaryCard({ icon, label, value, className }: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded bg-muted">{icon}</div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EarningsCardProps {
  hoursWorked: number | null;
  basePay: number | null;
  projectedBonus: number;
  hasQualityPenalty: boolean;
  t: (key: string) => string;
}

function EarningsCard({ hoursWorked, basePay, projectedBonus, hasQualityPenalty, t }: EarningsCardProps) {
  const projectedTotal = (basePay ?? 0) + projectedBonus;
  const notWorked = hoursWorked === null || hoursWorked === 0;
  
  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Banknote className="h-4 w-4 text-emerald-700" />
          {t('earnings.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notWorked ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {t('earnings.notWorked')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">{t('earnings.hoursWorked')}</div>
                <div className="text-lg font-bold tabular-nums">{hoursWorked?.toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('earnings.basePay')}</div>
                <div className="text-lg font-bold tabular-nums">{formatCurrency(basePay)}</div>
              </div>
            </div>
            <div className="border-t border-emerald-200 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">{t('earnings.projectedBonus')}</span>
                </div>
                <span className="font-bold tabular-nums text-amber-700">
                  {formatCurrency(projectedBonus)}
                </span>
              </div>
            </div>
            <div className="border-t border-emerald-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{t('earnings.projectedTotal')}</span>
                <span className="text-xl font-bold tabular-nums text-emerald-700">
                  {formatCurrency(projectedTotal)}
                </span>
              </div>
            </div>
            {hasQualityPenalty && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                {t('earnings.qualityPenalty')}
              </div>
            )}
            <div className="text-xs text-muted-foreground text-center">
              {t('earnings.estimated')}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function TimeclockPage() {
  const { state, actions } = useStore();
  const { currentUser } = useAuth();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  
  const laborMetrics = selectLaborMetrics(state, today);
  const staffStates = selectStaffStates(state, today);
  
  // Self-service: only the current user can clock in/out
  // Map auth user to staff record by matching staffId pattern
  const myStaff = state.staff.find((s) => 
    s.storeId === state.selectedStoreId && s.id === `staff-${currentUser.id}`
  ) ?? state.staff.find((s) => s.storeId === state.selectedStoreId);
  
  // Get earnings data
  const todayEarnings = myStaff ? selectTodayEarnings(state, myStaff.id, today) : null;
  const incentiveDistribution = selectIncentiveDistribution(state, today);
  const myShare = incentiveDistribution.staffShares.find(s => s.staffId === myStaff?.id);
  
  if (!currentStore || !myStaff) {
    return null;
  }
  
  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');
  const staffState = staffStates.get(myStaff.id);
  const currentStatus: StaffStatus = staffState?.status ?? 'out';
  
  // Determine available actions based on current status
  const getAvailableActions = (status: StaffStatus): ClockAction[] => {
    switch (status) {
      case 'out':
        return ['check-in'];
      case 'working':
        return ['break-start', 'check-out'];
      case 'break':
        return ['break-end'];
      default:
        return [];
    }
  };
  
  const availableActions = getAvailableActions(currentStatus);
  
  const handleAction = (action: ClockAction) => {
    if (!myStaff) return;
    
    switch (action) {
      case 'check-in':
        actions.checkIn(myStaff.id);
        break;
      case 'check-out':
        actions.checkOut(myStaff.id);
        break;
      case 'break-start':
        actions.startBreak(myStaff.id);
        break;
      case 'break-end':
        actions.endBreak(myStaff.id);
        break;
    }
  };
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('timeclock.title')}
        subtitle={shortName}
      />
      
      {/* Current Time */}
      <Card>
        <CardContent className="p-6">
          <CurrentTimeDisplay />
        </CardContent>
      </Card>
      
      {/* Earnings Card */}
      <EarningsCard
        hoursWorked={todayEarnings?.netHoursWorked ?? null}
        basePay={todayEarnings?.basePay ?? null}
        projectedBonus={myShare?.estimatedShare ?? 0}
        hasQualityPenalty={(todayEarnings?.qualityNgCount ?? 0) > 0}
        t={t}
      />
      
      {/* Current Status - Self-service for current user only */}
      <StatusCard
        status={currentStatus}
        staffName={myStaff.name}
        lastAction={staffState?.lastAction}
      />
      
      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            {availableActions.map((action) => (
              <ClockButton
                key={action}
                action={action}
                onClick={() => handleAction(action)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Summary for Manager View */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          label={t('timeclock.onDuty')}
          value={`${laborMetrics.activeStaffCount}${t('timeclock.persons')}`}
        />
        <SummaryCard
          icon={<Coffee className="h-5 w-5 text-amber-600" />}
          label={t('timeclock.onBreak')}
          value={`${laborMetrics.onBreakCount}${t('timeclock.persons')}`}
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5 text-blue-600" />}
          label={t('timeclock.workHours')}
          value={formatHours(laborMetrics.totalHoursToday, locale)}
        />
      </div>
    </div>
  );
}
