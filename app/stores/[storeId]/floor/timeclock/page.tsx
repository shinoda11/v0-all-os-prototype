'use client';

import { PageHeader } from '@/components/PageHeader';
import { StatsGrid } from '@/components/StatsGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<StaffStatus, { label: string; color: string }> = {
  out: { label: '退勤', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  in: { label: '出勤中', color: 'bg-green-100 text-green-800 border-green-200' },
  break: { label: '休憩中', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

interface StaffCardProps {
  staff: Staff;
  roleName: string;
  status: StaffStatus;
  lastAction: string;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onBreakStart: () => void;
  onBreakEnd: () => void;
}

function StaffCard({
  staff,
  roleName,
  status,
  lastAction,
  onCheckIn,
  onCheckOut,
  onBreakStart,
  onBreakEnd,
}: StaffCardProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-4',
        status === 'in' && 'bg-green-50/30',
        status === 'break' && 'bg-yellow-50/30'
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold">
          {staff.name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{staff.name}</h4>
            <Badge variant="secondary">{roleName}</Badge>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
          {lastAction && (
            <p className="text-xs text-muted-foreground">
              最終アクション: {new Date(lastAction).toLocaleTimeString('ja-JP')}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {status === 'out' && (
          <Button size="sm" onClick={onCheckIn} className="gap-1">
            <LogIn className="h-4 w-4" />
            出勤
          </Button>
        )}
        {status === 'in' && (
          <>
            <Button size="sm" variant="outline" onClick={onBreakStart} className="gap-1 bg-transparent">
              <Coffee className="h-4 w-4" />
              休憩
            </Button>
            <Button size="sm" variant="outline" onClick={onCheckOut} className="gap-1 bg-transparent">
              <LogOut className="h-4 w-4" />
              退勤
            </Button>
          </>
        )}
        {status === 'break' && (
          <Button size="sm" onClick={onBreakEnd} className="gap-1">
            <Play className="h-4 w-4" />
            休憩終了
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TimeclockPage() {
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const today = new Date().toISOString().split('T')[0];
  
  const laborMetrics = selectLaborMetrics(state, today);
  const staffStates = selectStaffStates(state, today);

  const storeStaff = state.staff.filter((s) => s.storeId === state.selectedStoreId);

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  const stats = [
    {
      icon: <Users className="h-6 w-6 text-green-600" />,
      iconBgColor: 'bg-green-100',
      value: laborMetrics.activeStaffCount,
      label: '出勤中',
    },
    {
      icon: <Coffee className="h-6 w-6 text-yellow-600" />,
      iconBgColor: 'bg-yellow-100',
      value: laborMetrics.onBreakCount,
      label: '休憩中',
    },
    {
      icon: <Clock className="h-6 w-6 text-blue-600" />,
      iconBgColor: 'bg-blue-100',
      value: `${laborMetrics.totalHoursToday}h`,
      label: '総稼働時間',
    },
    {
      icon: <LogOut className="h-6 w-6 text-purple-600" />,
      iconBgColor: 'bg-purple-100',
      value: `¥${laborMetrics.laborCostEstimate.toLocaleString()}`,
      label: '推定人件費',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="勤怠管理"
        subtitle={`${shortName} - ${today}`}
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>スタッフ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {storeStaff.map((staff) => {
              const staffState = staffStates.get(staff.id) ?? { status: 'out' as const, lastAction: '' };
              const role = state.roles.find((r: Role) => r.id === staff.roleId);

              return (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  roleName={role?.name ?? ''}
                  status={staffState.status}
                  lastAction={staffState.lastAction}
                  onCheckIn={() => actions.checkIn(staff.id)}
                  onCheckOut={() => actions.checkOut(staff.id)}
                  onBreakStart={() => actions.startBreak(staff.id)}
                  onBreakEnd={() => actions.endBreak(staff.id)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
