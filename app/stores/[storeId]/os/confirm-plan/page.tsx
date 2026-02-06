'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  CheckCircle,
  AlertCircle,
  UserCheck,
  CalendarDays,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import type { Staff, LaborSlot } from '@/core/types';

// Role labels
const ROLE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  floor: 'Floor',
  cashier: 'Cashier',
  prep: 'Prep',
  runner: 'Runner',
  unknown: 'Unknown',
};

const ROLE_LABELS_JA: Record<string, string> = {
  kitchen: 'キッチン',
  floor: 'フロア',
  cashier: 'レジ',
  prep: '仕込み',
  runner: 'ランナー',
  unknown: '未設定',
};

// Star display
const StarDisplay = ({ level }: { level: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: level }).map((_, i) => (
      <span key={i} className="text-yellow-500 text-xs">{'★'}</span>
    ))}
  </div>
);

export default function ConfirmPlanPage() {
  const { state, actions } = useStore();
  const { t, locale } = useI18n();
  const params = useParams();
  const routeStoreId = params?.storeId as string;
  const storeId = state.selectedStoreId || '1';

  // Date selector - defaults to today
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Find the DayPlan for the selected date
  const dayPlan = useMemo(
    () => (state.dayPlans || []).find((dp) => dp.date === selectedDate && dp.storeId === storeId),
    [state.dayPlans, selectedDate, storeId]
  );

  // Staff for this store
  const staff = useMemo(
    () => state.staff?.filter((s) => s.storeId === storeId) || [],
    [state.staff, storeId]
  );

  const roleLabels = locale === 'ja' ? ROLE_LABELS_JA : ROLE_LABELS;

  // Get eligible staff for a slot based on star level and role
  const getEligibleStaff = (slot: LaborSlot): Staff[] => {
    return staff.filter((s) => {
      const staffStar = s.starLevel || 1;
      return staffStar >= slot.starLevel;
    });
  };

  // Check all slots assigned
  const allSlotsAssigned = useMemo(() => {
    if (!dayPlan) return false;
    return dayPlan.laborSlots.every((slot) => !!slot.assignedStaffId);
  }, [dayPlan]);

  // Handle assigning staff to slot
  const handleAssignStaff = (slotId: string, staffId: string) => {
    const staffMember = staff.find((s) => s.id === staffId);
    if (!staffMember) return;
    actions.assignSlotStaff(selectedDate, slotId, staffId, staffMember.name);
  };

  // Handle confirming the plan and going live
  const handleConfirmAndGoLive = () => {
    // Update status to confirmed, then live
    actions.updateDayPlanStatus(selectedDate, 'confirmed');
    actions.goLiveDayPlan(selectedDate);
  };

  // Get plans with slots for the date picker
  const plansWithSlots = useMemo(
    () => (state.dayPlans || []).filter((dp) => dp.storeId === storeId && dp.laborSlots?.length > 0),
    [state.dayPlans, storeId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('confirmPlan.title')}</h1>
          <p className="text-muted-foreground">{t('confirmPlan.subtitle')}</p>
        </div>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-sm">{t('confirmPlan.selectDate')}</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-[200px] h-9"
              />
            </div>
            {plansWithSlots.length > 0 && (
              <div className="flex gap-2 ml-4">
                {plansWithSlots.map((plan) => (
                  <Button
                    key={plan.date}
                    variant={plan.date === selectedDate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDate(plan.date)}
                  >
                    {plan.date}
                    <Badge
                      variant="secondary"
                      className={cn(
                        'ml-2 text-xs',
                        plan.status === 'live' && 'bg-green-100 text-green-700',
                        plan.status === 'confirmed' && 'bg-blue-100 text-blue-700',
                        plan.status === 'draft' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {plan.status}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No plan found */}
      {!dayPlan && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-medium">{t('confirmPlan.noPlan')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('confirmPlan.noPlanDesc')}</p>
            </div>
            <Link href={`/stores/${routeStoreId}/os/plan-builder`}>
              <Button>{t('confirmPlan.goToPlanBuilder')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Plan found - show slot assignments */}
      {dayPlan && (
        <>
          {/* Plan Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                {t('confirmPlan.slotAssignment')}
              </CardTitle>
              <CardDescription>
                {t('confirmPlan.slotAssignmentDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan meta */}
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
                <span>{t('confirmPlan.forecast')}: {dayPlan.forecastSales.toLocaleString()}{locale === 'ja' ? '円' : '¥'}</span>
                <span>|</span>
                <span>{t('confirmPlan.boxes')}: {dayPlan.selectedBoxIds.length}</span>
                <span>|</span>
                <span>{t('confirmPlan.slots')}: {dayPlan.laborSlots.length}</span>
                <span>|</span>
                <Badge
                  variant="outline"
                  className={cn(
                    dayPlan.status === 'live' && 'bg-green-100 text-green-700 border-green-300',
                    dayPlan.status === 'confirmed' && 'bg-blue-100 text-blue-700 border-blue-300',
                    dayPlan.status === 'draft' && 'bg-muted'
                  )}
                >
                  {dayPlan.status.toUpperCase()}
                </Badge>
              </div>

              {/* Status banner */}
              {dayPlan.status === 'live' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('confirmPlan.alreadyLive')}</span>
                </div>
              )}

              {/* Slot assignment table */}
              <div className="space-y-3">
                {dayPlan.laborSlots.map((slot) => {
                  const eligible = getEligibleStaff(slot);
                  const isAssigned = !!slot.assignedStaffId;

                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        'border rounded-lg p-4 transition-colors',
                        isAssigned ? 'border-green-200 bg-green-50/50' : 'border-amber-300 bg-amber-50/50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Slot info */}
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-sm px-3 py-1',
                              isAssigned ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                            )}
                          >
                            {roleLabels[slot.role] || slot.role}
                          </Badge>
                          <StarDisplay level={slot.starLevel} />
                          <span className="text-sm text-muted-foreground">{slot.plannedHours}h</span>
                        </div>

                        {/* Staff selector */}
                        <div className="flex items-center gap-2">
                          {isAssigned && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          <Select
                            value={slot.assignedStaffId || ''}
                            onValueChange={(value) => handleAssignStaff(slot.id, value)}
                            disabled={dayPlan.status === 'live'}
                          >
                            <SelectTrigger className={cn(
                              'w-52',
                              !isAssigned && dayPlan.status !== 'live' && 'border-amber-400'
                            )}>
                              <SelectValue placeholder={t('confirmPlan.selectStaff')} />
                            </SelectTrigger>
                            <SelectContent>
                              {eligible.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{s.name}</span>
                                    <StarDisplay level={s.starLevel || 1} />
                                  </div>
                                </SelectItem>
                              ))}
                              {eligible.length === 0 && (
                                <div className="text-xs text-muted-foreground p-2">
                                  {t('planBuilder.noEligibleStaff')}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Assignment progress */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">
                  {t('confirmPlan.assigned')}: {dayPlan.laborSlots.filter((s) => s.assignedStaffId).length} / {dayPlan.laborSlots.length}
                </span>
                {!allSlotsAssigned && dayPlan.status !== 'live' && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {t('confirmPlan.notAllAssigned')}
                  </div>
                )}
              </div>

              {/* Actions */}
              {dayPlan.status !== 'live' && (
                <div className="flex justify-between pt-2">
                  <Link href={`/stores/${routeStoreId}/os/plan-builder`}>
                    <Button variant="outline">{t('confirmPlan.backToPlan')}</Button>
                  </Link>
                  <Button
                    onClick={handleConfirmAndGoLive}
                    disabled={!allSlotsAssigned}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {t('confirmPlan.confirmAndGoLive')}
                  </Button>
                </div>
              )}

              {dayPlan.status === 'live' && (
                <div className="flex justify-end pt-2">
                  <Link href={`/stores/${routeStoreId}/floor/todo`}>
                    <Button className="gap-2">
                      <Play className="h-4 w-4" />
                      {t('planBuilder.startExecution')}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
