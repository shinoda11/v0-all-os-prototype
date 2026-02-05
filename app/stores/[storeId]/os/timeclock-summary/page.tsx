'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { formatHours } from '@/i18n/format';
import { selectCurrentStore, selectLaborMetrics, selectStaffStates } from '@/core/selectors';
import type { StaffStatus } from '@/core/derive';
import {
  LogIn,
  LogOut,
  Coffee,
  Clock,
  Users,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Time Clock Summary Page - Manager View
 * 
 * Shows aggregated staff metrics without clock-in/out buttons:
 * - On Duty count
 * - On Break count
 * - Total worked hours vs planned hours
 * - Overtime indicator
 * - Staff status table
 */

// Status display config
const STATUS_CONFIG: Record<StaffStatus, { 
  label: string; 
  labelEn: string;
  icon: React.ReactNode; 
  className: string;
}> = {
  working: { 
    label: '出勤中', 
    labelEn: 'On Duty',
    icon: <LogIn className="h-4 w-4" />, 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
  },
  break: { 
    label: '休憩中', 
    labelEn: 'On Break',
    icon: <Coffee className="h-4 w-4" />, 
    className: 'bg-amber-50 text-amber-700 border-amber-200' 
  },
  out: { 
    label: '未出勤', 
    labelEn: 'Off Duty',
    icon: <LogOut className="h-4 w-4" />, 
    className: 'bg-secondary text-muted-foreground' 
  },
};

function CurrentTimeDisplay() {
  const [time, setTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (!time) return <div className="h-12" />;
  
  return (
    <div className="text-center">
      <div className="text-3xl font-bold tabular-nums">
        {time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {time.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
  subValue?: string;
  alert?: boolean;
}

function SummaryCard({ icon, label, value, className, subValue, alert }: SummaryCardProps) {
  return (
    <Card className={cn(className, alert && 'border-red-200 bg-red-50')}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded', alert ? 'bg-red-100' : 'bg-muted')}>{icon}</div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className={cn('text-xl font-bold', alert && 'text-red-700')}>{value}</div>
          {subValue && (
            <div className="text-xs text-muted-foreground">{subValue}</div>
          )}
        </div>
        {alert && <AlertTriangle className="h-5 w-5 text-red-600" />}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: StaffStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      {config.icon}
      {config.labelEn}
    </Badge>
  );
}

export default function TimeclockSummaryPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const { t, locale } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  
  const laborMetrics = selectLaborMetrics(state, today);
  const staffStates = selectStaffStates(state, today);
  
  // Get all staff for this store
  const storeStaff = state.staff.filter(s => s.storeId === state.selectedStoreId);
  
  if (!currentStore) {
    return null;
  }
  
  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');
  
  // Mock planned hours (would come from schedule in real app)
  const plannedHours = 32; // Example: 4 staff x 8 hours
  const actualHours = laborMetrics.totalHoursToday;
  const isOvertime = actualHours > plannedHours;
  const overtimeHours = Math.max(0, actualHours - plannedHours);
  
  // Build staff table data
  const staffTableData = storeStaff.map(staff => {
    const staffState = staffStates.get(staff.id);
    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      starLevel: staff.starLevel,
      status: staffState?.status ?? 'out' as StaffStatus,
      hoursWorked: staffState?.hoursWorked ?? 0,
      lastAction: staffState?.lastAction,
    };
  }).sort((a, b) => {
    // Sort by status: working > break > out
    const statusOrder = { working: 0, break: 1, out: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('timeclockSummary.title')}
        subtitle={shortName}
      />
      
      {/* Current Time */}
      <Card>
        <CardContent className="p-4">
          <CurrentTimeDisplay />
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          label={t('timeclockSummary.onDuty')}
          value={laborMetrics.activeStaffCount}
          subValue={`/ ${storeStaff.length} ${t('timeclockSummary.total')}`}
        />
        <SummaryCard
          icon={<Coffee className="h-5 w-5 text-amber-600" />}
          label={t('timeclockSummary.onBreak')}
          value={laborMetrics.onBreakCount}
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5 text-blue-600" />}
          label={t('timeclockSummary.actualHours')}
          value={formatHours(actualHours, locale)}
          subValue={`${t('timeclockSummary.planned')}: ${formatHours(plannedHours, locale)}`}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label={t('timeclockSummary.overtime')}
          value={isOvertime ? `+${formatHours(overtimeHours, locale)}` : '-'}
          alert={isOvertime}
        />
      </div>
      
      {/* Staff Status Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('timeclockSummary.staffStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('timeclockSummary.name')}</TableHead>
                <TableHead>{t('timeclockSummary.role')}</TableHead>
                <TableHead className="text-center">{t('timeclockSummary.stars')}</TableHead>
                <TableHead>{t('timeclockSummary.status')}</TableHead>
                <TableHead className="text-right">{t('timeclockSummary.hoursWorked')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffTableData.map(staff => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium">{staff.name}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{staff.role}</TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-0.5">
                      {[1, 2, 3].map(i => (
                        <Star
                          key={i}
                          className={cn(
                            'h-4 w-4',
                            i <= staff.starLevel ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                          )}
                        />
                      ))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={staff.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {staff.status === 'out' ? '-' : formatHours(staff.hoursWorked, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
