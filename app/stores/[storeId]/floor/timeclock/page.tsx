'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { formatHours } from '@/i18n/format';
import { selectCurrentStore, selectLaborMetrics, selectStaffStates } from '@/core/selectors';
import type { Staff, Role } from '@/core/types';
import type { StaffStatus } from '@/core/derive';
import {
  LogIn,
  LogOut,
  Coffee,
  Play,
  Clock,
  Users,
  User,
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

export default function TimeclockPage() {
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  
  const laborMetrics = selectLaborMetrics(state, today);
  const staffStates = selectStaffStates(state, today);
  
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  const storeStaff = state.staff.filter((s) => s.storeId === state.selectedStoreId);
  
  // Auto-select first staff if none selected
  useEffect(() => {
    if (!selectedStaffId && storeStaff.length > 0) {
      setSelectedStaffId(storeStaff[0].id);
    }
  }, [selectedStaffId, storeStaff]);
  
  if (!currentStore) {
    return null;
  }
  
  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');
  const selectedStaff = storeStaff.find(s => s.id === selectedStaffId);
  const staffState = selectedStaffId ? staffStates.get(selectedStaffId) : null;
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
    if (!selectedStaffId) return;
    
    switch (action) {
      case 'check-in':
        actions.checkIn(selectedStaffId);
        break;
      case 'check-out':
        actions.checkOut(selectedStaffId);
        break;
      case 'break-start':
        actions.startBreak(selectedStaffId);
        break;
      case 'break-end':
        actions.endBreak(selectedStaffId);
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
      
      {/* Staff Selector */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('timeclock.selectStaff')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Select value={selectedStaffId ?? ''} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="h-12 text-lg">
              <SelectValue placeholder={t('timeclock.selectStaff')} />
            </SelectTrigger>
            <SelectContent>
              {storeStaff.map((staff) => {
                const state = staffStates.get(staff.id);
                const status = state?.status ?? 'out';
                const statusConfig = STATUS_CONFIG[status];
                return (
                  <SelectItem key={staff.id} value={staff.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <span>{staff.name}</span>
                      <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                        {locale === 'ja' ? statusConfig.label : statusConfig.labelEn}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Current Status */}
      {selectedStaff && (
        <StatusCard
          status={currentStatus}
          staffName={selectedStaff.name}
          lastAction={staffState?.lastAction}
        />
      )}
      
      {/* Action Buttons */}
      {selectedStaff && (
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
      )}
      
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
