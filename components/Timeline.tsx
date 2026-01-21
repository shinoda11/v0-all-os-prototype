'use client';

import React, { useState } from 'react';
import { DomainEvent, TimeBand } from '@/core/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DollarSign,
  Users,
  ChefHat,
  Truck,
  CheckCircle,
  BarChart3,
  X,
  Clock,
  Package,
  AlertTriangle,
} from 'lucide-react';

// Lane definitions
export type TimelineLane = 'sales' | 'forecast' | 'prep' | 'delivery' | 'labor' | 'decision';

const LANE_CONFIG: Record<TimelineLane, { 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  sales: {
    icon: <DollarSign className="h-3 w-3" />,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    label: '売上',
  },
  forecast: {
    icon: <BarChart3 className="h-3 w-3" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    label: '予測',
  },
  prep: {
    icon: <ChefHat className="h-3 w-3" />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    label: '仕込み',
  },
  delivery: {
    icon: <Truck className="h-3 w-3" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    label: '配送',
  },
  labor: {
    icon: <Users className="h-3 w-3" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    label: '労務',
  },
  decision: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    label: '意思決定',
  },
};

function getEventSummary(event: DomainEvent): string {
  switch (event.type) {
    case 'sales':
      return `¥${event.total.toLocaleString()}`;
    case 'labor': {
      const labels: Record<string, string> = {
        'check-in': '出勤',
        'check-out': '退勤',
        'break-start': '休憩開始',
        'break-end': '休憩終了',
      };
      return labels[event.action] || event.action;
    }
    case 'prep': {
      const labels: Record<string, string> = {
        planned: '計画',
        started: '開始',
        completed: '完了',
        cancelled: 'キャンセル',
      };
      return labels[event.status] || event.status;
    }
    case 'delivery':
      return event.status === 'delayed' ? `${event.delayMinutes}分遅延` : event.status;
    case 'decision':
      return event.title;
    case 'forecast':
      return `¥${event.forecastSales.toLocaleString()}`;
    default:
      return '';
  }
}

function getEventDescription(event: DomainEvent): string {
  switch (event.type) {
    case 'sales':
      return `${event.quantity}点 / 客単価 ¥${Math.round(event.total / (event.quantity || 1)).toLocaleString()}`;
    case 'labor':
      return `スタッフID: ${event.staffId}`;
    case 'prep':
      return `${event.prepItemId} x ${event.quantity}`;
    case 'delivery':
      return `${event.itemName}${event.delayMinutes ? ` (予定より${event.delayMinutes}分遅れ)` : ''}`;
    case 'decision':
      return event.description || '';
    case 'forecast':
      return `${event.timeBand === 'lunch' ? 'ランチ' : event.timeBand === 'dinner' ? 'ディナー' : event.timeBand} / 予測客数 ${event.forecastCustomers}人`;
    default:
      return '';
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function getTimeBandFromEvent(event: DomainEvent): TimeBand {
  if (event.type === 'forecast') return event.timeBand;
  const hour = new Date(event.timestamp).getHours();
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'idle';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'all';
}

interface EventChipProps {
  event: DomainEvent;
  onClick: () => void;
}

function EventChip({ event, onClick }: EventChipProps) {
  const lane = event.type as TimelineLane;
  const config = LANE_CONFIG[lane];
  const isWarning = 
    (event.type === 'delivery' && event.status === 'delayed') ||
    (event.type === 'prep' && event.status === 'cancelled');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all',
        'hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 cursor-pointer',
        config.bgColor,
        config.color,
        isWarning && 'ring-2 ring-red-300'
      )}
    >
      {config.icon}
      <span className="max-w-[100px] truncate">{getEventSummary(event)}</span>
      <span className="text-[10px] opacity-70">{formatTime(event.timestamp)}</span>
    </button>
  );
}

interface EventDetailPanelProps {
  event: DomainEvent | null;
  open: boolean;
  onClose: () => void;
}

function EventDetailPanel({ event, open, onClose }: EventDetailPanelProps) {
  if (!event) return null;

  const lane = event.type as TimelineLane;
  const config = LANE_CONFIG[lane];
  const timeBand = getTimeBandFromEvent(event);
  const timeBandLabel = timeBand === 'lunch' ? 'ランチ' : timeBand === 'dinner' ? 'ディナー' : timeBand === 'idle' ? 'アイドル' : '全日';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className={cn('p-1.5 rounded', config.bgColor, config.color)}>
              {config.icon}
            </span>
            {config.label}イベント
          </SheetTitle>
          <SheetDescription>
            {formatTime(event.timestamp)} のイベント詳細
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Summary */}
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-lg font-semibold">{getEventSummary(event)}</div>
            <div className="text-sm text-muted-foreground mt-1">{getEventDescription(event)}</div>
          </div>

          {/* Impact Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              影響範囲
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded border">
                <div className="text-muted-foreground text-xs">タイムバンド</div>
                <div className="font-medium">{timeBandLabel}</div>
              </div>
              <div className="p-2 rounded border">
                <div className="text-muted-foreground text-xs">時刻</div>
                <div className="font-medium">{formatTime(event.timestamp)}</div>
              </div>
            </div>
          </div>

          {/* Event-specific details */}
          {event.type === 'prep' && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                対象品目
              </h4>
              <div className="p-2 rounded border text-sm">
                <div className="font-medium">{event.prepItemId}</div>
                <div className="text-muted-foreground">数量: {event.quantity}</div>
              </div>
            </div>
          )}

          {event.type === 'delivery' && event.status === 'delayed' && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <Clock className="h-4 w-4" />
                配送遅延
              </div>
              <div className="text-sm text-red-600 mt-1">
                {event.delayMinutes}分の遅延が発生しています。仕込み計画への影響を確認してください。
              </div>
            </div>
          )}

          {event.type === 'decision' && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">関連ToDo</h4>
              <div className="p-2 rounded border text-sm">
                <div className="font-medium">{event.title}</div>
                <div className="text-muted-foreground mt-1">{event.description}</div>
                <Badge variant="outline" className="mt-2">
                  {event.action === 'approved' ? '承認済み' : event.action === 'completed' ? '完了' : event.action}
                </Badge>
              </div>
            </div>
          )}

          {/* Action Button */}
          {(event.type === 'delivery' && event.status === 'delayed') && (
            <Button className="w-full" size="sm">
              関連提案を作成
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export interface LaneEvents {
  lane: TimelineLane;
  events: DomainEvent[];
}

interface LaneTimelineProps {
  laneEvents: LaneEvents[];
  maxPerLane?: number;
}

export function LaneTimeline({ laneEvents, maxPerLane = 5 }: LaneTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<DomainEvent | null>(null);

  // Get all unique timestamps for the time axis
  const allEvents = laneEvents.flatMap(l => l.events);
  
  if (allEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          イベントがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">統合タイムライン</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Lane rows */}
        {laneEvents.map(({ lane, events }) => {
          const config = LANE_CONFIG[lane];
          const displayEvents = events.slice(0, maxPerLane);
          
          return (
            <div key={lane} className="flex items-start gap-3">
              {/* Lane label */}
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium w-20 shrink-0',
                config.bgColor,
                config.color
              )}>
                {config.icon}
                <span>{config.label}</span>
              </div>
              
              {/* Events in lane */}
              <div className="flex-1 flex flex-wrap gap-1.5 min-h-[28px] items-center">
                {displayEvents.length > 0 ? (
                  displayEvents.map((event) => (
                    <EventChip
                      key={event.id}
                      event={event}
                      onClick={() => setSelectedEvent(event)}
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Detail Panel */}
        <EventDetailPanel
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      </CardContent>
    </Card>
  );
}

// Legacy export for backward compatibility
interface TimelineProps {
  events: DomainEvent[];
  maxItems?: number;
}

export function Timeline({ events, maxItems = 10 }: TimelineProps) {
  // Convert flat events to lane structure
  const lanes: TimelineLane[] = ['sales', 'forecast', 'prep', 'delivery', 'labor', 'decision'];
  const laneEvents: LaneEvents[] = lanes.map(lane => ({
    lane,
    events: events
      .filter(e => e.type === lane)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5),
  }));

  return <LaneTimeline laneEvents={laneEvents} maxPerLane={5} />;
}
