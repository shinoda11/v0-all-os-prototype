'use client';

import React from "react"

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/state/store';
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
  Star,
  AlertTriangle,
  Shield,
  User,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for staff details (would come from DB in production)
const STAFF_DETAILS: Record<string, { skillLevel: 1 | 2 | 3; hourlyRate: number }> = {
  '1': { skillLevel: 3, hourlyRate: 1500 },
  '2': { skillLevel: 2, hourlyRate: 1300 },
  '3': { skillLevel: 2, hourlyRate: 1300 },
  '4': { skillLevel: 1, hourlyRate: 1100 },
  '5': { skillLevel: 3, hourlyRate: 1500 },
  '6': { skillLevel: 2, hourlyRate: 1300 },
  '7': { skillLevel: 1, hourlyRate: 1100 },
  '8': { skillLevel: 2, hourlyRate: 1300 },
};

// Mock shift plan (would come from shift management in production)
const MOCK_SHIFT_PLAN: Record<string, { startTime: string; endTime: string }> = {
  '1': { startTime: '10:00', endTime: '19:00' },
  '2': { startTime: '11:00', endTime: '20:00' },
  '3': { startTime: '10:00', endTime: '15:00' },
  '4': { startTime: '17:00', endTime: '22:00' },
  '5': { startTime: '10:00', endTime: '19:00' },
  '6': { startTime: '11:00', endTime: '20:00' },
  '7': { startTime: '17:00', endTime: '22:00' },
  '8': { startTime: '10:00', endTime: '15:00' },
};

function getStatusConfig(status: StaffStatus): { label: string; color: string; icon: React.ReactNode } {
  if (status === 'out') {
    return { label: '未出勤', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <LogOut className="h-3 w-3" /> };
  }
  if (status === 'working') {
    return { label: '出勤中', color: 'bg-green-100 text-green-800 border-green-200', icon: <LogIn className="h-3 w-3" /> };
  }
  if (status === 'break') {
    return { label: '休憩中', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Coffee className="h-3 w-3" /> };
  }
  return { label: '不明', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <LogOut className="h-3 w-3" /> };
}

type OperationMode = 'self' | 'admin';
type ActionType = 'check-in' | 'check-out' | 'break-start' | 'break-end';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  action: ActionType;
  onConfirm: () => void;
}

function ConfirmDialog({ open, onOpenChange, staffName, action, onConfirm }: ConfirmDialogProps) {
  const actionLabels: Record<ActionType, string> = {
    'check-in': '出勤',
    'check-out': '退勤',
    'break-start': '休憩開始',
    'break-end': '休憩終了',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>操作確認</DialogTitle>
          <DialogDescription>
            {staffName}さんの{actionLabels[action]}を実行しますか？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            キャンセル
          </Button>
          <Button onClick={() => { onConfirm(); onOpenChange(false); }}>
            確認
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkillStars({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i <= level ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  label: string;
  value: string | number;
  isError?: boolean;
  errorMessage?: string;
  lastUpdate?: string;
}

function KPICard({ icon, iconBgColor, label, value, isError, errorMessage, lastUpdate }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBgColor)}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            {isError ? (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{errorMessage}</span>
              </div>
            ) : (
              <p className="text-xl font-bold">{value}</p>
            )}
          </div>
        </div>
        {lastUpdate && (
          <p className="mt-2 text-[10px] text-muted-foreground text-right">
            更新: {new Date(lastUpdate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface StaffRowProps {
  staff: Staff;
  roleName: string;
  status: StaffStatus;
  lastAction: string;
  skillLevel: 1 | 2 | 3;
  hourlyRate: number;
  shiftEndTime?: string;
  mode: OperationMode;
  currentStaffId: string | null;
  onAction: (action: ActionType) => void;
}

function StaffRow({
  staff,
  roleName,
  status,
  lastAction,
  skillLevel,
  hourlyRate,
  shiftEndTime,
  mode,
  currentStaffId,
  onAction,
}: StaffRowProps) {
  const config = getStatusConfig(status);
  const isSelf = mode === 'self' && staff.id === currentStaffId;
  const canOperate = mode === 'admin' || isSelf;

  const getNextSchedule = () => {
    if (status === 'working' && shiftEndTime) {
      return `終了予定: ${shiftEndTime}`;
    }
    if (status === 'out' && shiftEndTime) {
      return `シフト: ${MOCK_SHIFT_PLAN[staff.id]?.startTime ?? '--:--'} - ${shiftEndTime}`;
    }
    return null;
  };

  const nextSchedule = getNextSchedule();

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-4',
        status === 'working' && 'bg-green-50/30',
        status === 'break' && 'bg-yellow-50/30',
        !canOperate && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold">
          {staff.name.charAt(0)}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold">{staff.name}</h4>
            <Badge variant="secondary" className="text-xs">{roleName}</Badge>
            <SkillStars level={skillLevel} />
            <span className="text-xs text-muted-foreground">¥{hourlyRate.toLocaleString()}/h</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', config.color)}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
            {nextSchedule && (
              <span className="text-xs text-muted-foreground">{nextSchedule}</span>
            )}
          </div>
          {lastAction && (
            <p className="text-[10px] text-muted-foreground">
              最終操作: {new Date(lastAction).toLocaleTimeString('ja-JP')}
            </p>
          )}
        </div>
      </div>
      
      {canOperate && (
        <div className="flex gap-2">
          {status === 'out' && (
            <Button size="sm" onClick={() => onAction('check-in')} className="gap-1">
              <LogIn className="h-4 w-4" />
              出勤
            </Button>
          )}
          {status === 'working' && (
            <>
              <Button size="sm" variant="outline" onClick={() => onAction('break-start')} className="gap-1 bg-transparent">
                <Coffee className="h-4 w-4" />
                休憩
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction('check-out')} className="gap-1 bg-transparent">
                <LogOut className="h-4 w-4" />
                退勤
              </Button>
            </>
          )}
          {status === 'break' && (
            <Button size="sm" onClick={() => onAction('break-end')} className="gap-1">
              <Play className="h-4 w-4" />
              休憩終了
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TimeclockPage() {
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  const laborMetrics = selectLaborMetrics(state, today);
  const staffStates = selectStaffStates(state, today);

  const [mode, setMode] = useState<OperationMode>('admin');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    staffId: string;
    staffName: string;
    action: ActionType;
  } | null>(null);

  const storeStaff = state.staff.filter((s) => s.storeId === state.selectedStoreId);

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  // Validate KPI values
  const isHoursValid = laborMetrics.totalHoursToday >= 0;
  const isCostValid = laborMetrics.laborCostEstimate >= 0;

  // Calculate shift summary
  const scheduledCount = storeStaff.filter(s => MOCK_SHIFT_PLAN[s.id]).length;
  const checkedInCount = laborMetrics.activeStaffCount;

  const handleAction = (staffId: string, staffName: string, action: ActionType) => {
    if (mode === 'admin') {
      setConfirmDialog({ open: true, staffId, staffName, action });
    } else {
      executeAction(staffId, action);
    }
  };

  const executeAction = (staffId: string, action: ActionType) => {
    switch (action) {
      case 'check-in':
        actions.checkIn(staffId);
        break;
      case 'check-out':
        actions.checkOut(staffId);
        break;
      case 'break-start':
        actions.startBreak(staffId);
        break;
      case 'break-end':
        actions.endBreak(staffId);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="勤怠管理"
        subtitle={`${shortName} - ${today}`}
      />

      {/* Shift Summary (Read-only) */}
      <Card className="border-dashed">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>本日のシフト概要</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>予定: <strong>{scheduledCount}名</strong></span>
              <span>出勤済: <strong>{checkedInCount}名</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<Users className="h-6 w-6 text-green-600" />}
          iconBgColor="bg-green-100"
          value={laborMetrics.activeStaffCount}
          label="出勤中"
          lastUpdate={now.toISOString()}
        />
        <KPICard
          icon={<Coffee className="h-6 w-6 text-yellow-600" />}
          iconBgColor="bg-yellow-100"
          value={laborMetrics.onBreakCount}
          label="休憩中"
          lastUpdate={now.toISOString()}
        />
        <KPICard
          icon={<Clock className="h-6 w-6 text-blue-600" />}
          iconBgColor="bg-blue-100"
          value={isHoursValid ? `${laborMetrics.totalHoursToday}h` : ''}
          label="総稼働時間"
          isError={!isHoursValid}
          errorMessage="データ不整合"
          lastUpdate={now.toISOString()}
        />
        <KPICard
          icon={<LogOut className="h-6 w-6 text-purple-600" />}
          iconBgColor="bg-purple-100"
          value={isCostValid ? `¥${laborMetrics.laborCostEstimate.toLocaleString()}` : ''}
          label="推定人件費"
          isError={!isCostValid}
          errorMessage="計算中"
          lastUpdate={now.toISOString()}
        />
      </div>

      {/* Mode Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>スタッフ一覧</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">操作モード:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={mode === 'self' ? 'default' : 'outline'}
                  onClick={() => setMode('self')}
                  className={cn('gap-1', mode === 'self' ? '' : 'bg-transparent')}
                >
                  <User className="h-4 w-4" />
                  本人
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'admin' ? 'default' : 'outline'}
                  onClick={() => setMode('admin')}
                  className={cn('gap-1', mode === 'admin' ? '' : 'bg-transparent')}
                >
                  <Shield className="h-4 w-4" />
                  管理者
                </Button>
              </div>
            </div>
          </div>
          {mode === 'self' && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">操作対象:</span>
              <Select value={selectedStaffId ?? ''} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  {storeStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {storeStaff.map((staff) => {
              const staffState = staffStates.get(staff.id) ?? { status: 'out' as const, lastAction: '' };
              const role = state.roles.find((r: Role) => r.id === staff.roleId);
              const details = STAFF_DETAILS[staff.id] ?? { skillLevel: 1, hourlyRate: 1100 };
              const shift = MOCK_SHIFT_PLAN[staff.id];

              return (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  roleName={role?.name ?? ''}
                  status={staffState.status}
                  lastAction={staffState.lastAction}
                  skillLevel={details.skillLevel}
                  hourlyRate={details.hourlyRate}
                  shiftEndTime={shift?.endTime}
                  mode={mode}
                  currentStaffId={selectedStaffId}
                  onAction={(action) => handleAction(staff.id, staff.name, action)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Admin Mode */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog(open ? confirmDialog : null)}
          staffName={confirmDialog.staffName}
          action={confirmDialog.action}
          onConfirm={() => executeAction(confirmDialog.staffId, confirmDialog.action)}
        />
      )}
    </div>
  );
}
