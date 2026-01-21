'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Clock, Coffee } from 'lucide-react';
import type { ShiftPlanEntry, Staff, Role } from '@/core/types';
import type { StaffState } from '@/core/derive';

interface ShiftPlanDisplayProps {
  staff: Staff[];
  roles: Role[];
  staffStates: Map<string, StaffState>;
  lastUpdate?: string;
}

export function ShiftPlanDisplay({ staff, roles, staffStates, lastUpdate }: ShiftPlanDisplayProps) {
  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? roleId;

  // Group staff by role
  const staffByRole = new Map<string, Staff[]>();
  for (const s of staff) {
    const existing = staffByRole.get(s.roleId) ?? [];
    existing.push(s);
    staffByRole.set(s.roleId, existing);
  }

  const getStatusBadge = (staffId: string) => {
    const state = staffStates.get(staffId);
    if (!state) return null;

    switch (state.status) {
      case 'working':
        return <Badge variant="default" className="text-[10px] h-4 px-1.5">勤務中</Badge>;
      case 'break':
        return (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-yellow-300 text-yellow-700 gap-0.5">
            <Coffee className="h-2.5 w-2.5" />
            休憩
          </Badge>
        );
      case 'out':
        return <Badge variant="secondary" className="text-[10px] h-4 px-1.5 text-muted-foreground">未出勤</Badge>;
      default:
        return null;
    }
  };

  const formatWorkTime = (staffId: string) => {
    const state = staffStates.get(staffId);
    if (!state?.checkInTime) return null;

    const now = new Date();
    const diffMs = now.getTime() - state.checkInTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return (
      <span className="text-[10px] text-muted-foreground">
        {hours}h{mins}m
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">本日の配置計画</CardTitle>
            <Badge variant="outline" className="text-[10px]">読み取り専用</Badge>
          </div>
          {lastUpdate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {new Date(lastUpdate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from(staffByRole.entries()).map(([roleId, roleStaff]) => (
          <div key={roleId}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">{getRoleName(roleId)}</span>
              <span className="text-[10px] text-muted-foreground">({roleStaff.length}名)</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {roleStaff.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center justify-between px-2 py-1 rounded text-xs border',
                    staffStates.get(s.id)?.status === 'working' ? 'bg-green-50/50 border-green-200' :
                    staffStates.get(s.id)?.status === 'break' ? 'bg-yellow-50/50 border-yellow-200' :
                    'bg-muted/30 border-border'
                  )}
                >
                  <span className="truncate">{s.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {formatWorkTime(s.id)}
                    {getStatusBadge(s.id)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
