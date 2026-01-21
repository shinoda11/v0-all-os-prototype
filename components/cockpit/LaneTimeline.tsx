'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  BarChart3,
  ChefHat,
  Truck,
  Users,
  CheckCircle,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { DomainEvent, TimelineLane, TimelineEvent } from '@/core/types';

const LANE_CONFIG: Record<TimelineLane, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  sales: {
    label: '売上',
    icon: <DollarSign className="h-3.5 w-3.5" />,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  forecast: {
    label: '予測',
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  prep: {
    label: '仕込み',
    icon: <ChefHat className="h-3.5 w-3.5" />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  delivery: {
    label: '配送',
    icon: <Truck className="h-3.5 w-3.5" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  labor: {
    label: '労務',
    icon: <Users className="h-3.5 w-3.5" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  decision: {
    label: '意思決定',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
  },
};

const STATUS_STYLES = {
  normal: 'border-l-2 border-l-gray-300',
  warning: 'border-l-2 border-l-yellow-500 bg-yellow-50/50',
  critical: 'border-l-2 border-l-red-500 bg-red-50/50',
  success: 'border-l-2 border-l-green-500 bg-green-50/50',
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function mapEventToTimelineEvent(event: DomainEvent): TimelineEvent {
  let lane: TimelineLane;
  let title: string;
  let description: string;
  let status: TimelineEvent['status'] = 'normal';

  switch (event.type) {
    case 'sales':
      lane = 'sales';
      title = `¥${event.total.toLocaleString()}`;
      description = `${event.quantity}点`;
      break;
    case 'forecast':
      lane = 'forecast';
      title = `予測更新`;
      description = `${event.timeBand === 'lunch' ? 'ランチ' : 'ディナー'}: ${event.forecastCustomers}名 / ¥${event.forecastSales.toLocaleString()}`;
      break;
    case 'prep':
      lane = 'prep';
      const prepStatusLabels = { planned: '計画', started: '開始', completed: '完了', cancelled: 'キャンセル' };
      title = prepStatusLabels[event.status];
      description = `${event.prepItemId} × ${event.quantity}`;
      status = event.status === 'completed' ? 'success' : event.status === 'cancelled' ? 'critical' : 'normal';
      break;
    case 'delivery':
      lane = 'delivery';
      title = event.itemName;
      const deliveryStatusLabels = { scheduled: '予定', delayed: '遅延', arrived: '到着', cancelled: 'キャンセル' };
      description = deliveryStatusLabels[event.status];
      if (event.status === 'delayed') {
        description += ` (${event.delayMinutes}分)`;
        status = (event.delayMinutes ?? 0) > 30 ? 'critical' : 'warning';
      } else if (event.status === 'arrived') {
        status = 'success';
      }
      break;
    case 'labor':
      lane = 'labor';
      const laborActionLabels = { 'check-in': '出勤', 'check-out': '退勤', 'break-start': '休憩開始', 'break-end': '休憩終了' };
      title = laborActionLabels[event.action];
      description = event.staffId;
      status = event.action === 'check-in' ? 'success' : event.action === 'check-out' ? 'normal' : 'warning';
      break;
    case 'decision':
      lane = 'decision';
      title = event.title;
      const decisionActionLabels = { approved: '承認', rejected: '却下', pending: '保留', started: '実行中', completed: '完了' };
      description = decisionActionLabels[event.action];
      status = event.action === 'approved' || event.action === 'completed' ? 'success' 
        : event.action === 'rejected' ? 'critical' : 'normal';
      break;
    default:
      lane = 'sales';
      title = 'Unknown';
      description = '';
  }

  return {
    id: event.id,
    lane,
    timestamp: event.timestamp,
    title,
    description,
    status,
    originalEvent: event,
  };
}

interface LaneRowProps {
  lane: TimelineLane;
  events: TimelineEvent[];
  onEventClick: (event: TimelineEvent) => void;
}

function LaneRow({ lane, events, onEventClick }: LaneRowProps) {
  const config = LANE_CONFIG[lane];
  
  return (
    <div className="flex border-b border-border last:border-b-0">
      <div className={cn(
        'w-20 shrink-0 py-2 px-2 flex items-center gap-1.5',
        config.bgColor, config.color
      )}>
        {config.icon}
        <span className="text-xs font-medium">{config.label}</span>
      </div>
      <div className="flex-1 py-1 px-2 overflow-x-auto">
        <div className="flex gap-1.5 min-h-[32px] items-center">
          {events.length === 0 ? (
            <span className="text-xs text-muted-foreground">イベントなし</span>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick(event)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-background border hover:bg-muted/50 transition-colors',
                  STATUS_STYLES[event.status ?? 'normal']
                )}
              >
                <span className="font-medium truncate max-w-[100px]">{event.title}</span>
                <span className="text-muted-foreground text-[10px]">{formatTime(event.timestamp)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface EventDetailPanelProps {
  event: TimelineEvent | null;
  onClose: () => void;
}

function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  if (!event) return null;
  
  const config = LANE_CONFIG[event.lane];
  
  return (
    <Card className="absolute right-0 top-0 w-72 shadow-lg z-10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className={cn('flex items-center gap-2', config.color)}>
            {config.icon}
            <span className="text-sm font-medium">{config.label}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="font-medium">{event.title}</div>
          <div className="text-sm text-muted-foreground">{event.description}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(event.timestamp).toLocaleString('ja-JP')}
        </div>
        {event.status && event.status !== 'normal' && (
          <Badge
            variant={event.status === 'success' ? 'default' : event.status === 'critical' ? 'destructive' : 'outline'}
            className={cn(
              event.status === 'warning' && 'border-yellow-300 text-yellow-700'
            )}
          >
            {event.status === 'success' ? '完了' : event.status === 'critical' ? '緊急' : '警告'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

interface LaneTimelineProps {
  events: DomainEvent[];
  maxEventsPerLane?: number;
  lastUpdate?: string;
}

export function LaneTimeline({ events, maxEventsPerLane = 10, lastUpdate }: LaneTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [filterLanes, setFilterLanes] = useState<Set<TimelineLane>>(new Set());

  // Convert and group events by lane
  const timelineEvents = events.map(mapEventToTimelineEvent);
  const eventsByLane: Record<TimelineLane, TimelineEvent[]> = {
    sales: [],
    forecast: [],
    prep: [],
    delivery: [],
    labor: [],
    decision: [],
  };

  for (const event of timelineEvents) {
    eventsByLane[event.lane].push(event);
  }

  // Sort each lane by timestamp (newest first)
  for (const lane of Object.keys(eventsByLane) as TimelineLane[]) {
    eventsByLane[lane].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    eventsByLane[lane] = eventsByLane[lane].slice(0, maxEventsPerLane);
  }

  const lanes: TimelineLane[] = ['sales', 'forecast', 'prep', 'delivery', 'labor', 'decision'];
  const visibleLanes = filterLanes.size > 0 ? lanes.filter(l => filterLanes.has(l)) : lanes;

  const toggleLaneFilter = (lane: TimelineLane) => {
    const newFilter = new Set(filterLanes);
    if (newFilter.has(lane)) {
      newFilter.delete(lane);
    } else {
      newFilter.add(lane);
    }
    setFilterLanes(newFilter);
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">統合タイムライン</CardTitle>
            {lastUpdate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(lastUpdate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {lanes.map((lane) => {
              const config = LANE_CONFIG[lane];
              const isActive = filterLanes.size === 0 || filterLanes.has(lane);
              return (
                <button
                  key={lane}
                  type="button"
                  onClick={() => toggleLaneFilter(lane)}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isActive ? config.bgColor : 'bg-muted/50 opacity-50'
                  )}
                >
                  <span className={cn('text-xs', isActive ? config.color : 'text-muted-foreground')}>
                    {config.icon}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t border-border">
          {visibleLanes.map((lane) => (
            <LaneRow
              key={lane}
              lane={lane}
              events={eventsByLane[lane]}
              onEventClick={setSelectedEvent}
            />
          ))}
        </div>
      </CardContent>
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </Card>
  );
}
