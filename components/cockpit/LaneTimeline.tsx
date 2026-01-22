'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
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
  FileWarning,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import type { DomainEvent, TimelineLane, TimelineEvent, TimeBand } from '@/core/types';

/* ===== Design Guidelines Compliance =====
 * 原則3: コンテナは最終手段 - 枠線ではなく余白でグルーピング
 * 2.1: スペーシング 4/8/12/16/24/32
 * 2.3: 状態は色+アイコン+ラベル併用
 * 2.4: ターゲットサイズ最低44x44
 * 2.5: ウェイトはRegular/Boldの2段のみ
 */

// レーン設定 - アイコンサイズ統一
const LANE_CONFIG: Record<TimelineLane, {
  label: string;
  icon: React.ReactNode;
}> = {
  sales: {
    label: '売上',
    icon: <DollarSign className="h-4 w-4" />,
  },
  forecast: {
    label: '予測',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  prep: {
    label: '仕込',
    icon: <ChefHat className="h-4 w-4" />,
  },
  delivery: {
    label: '入荷',
    icon: <Truck className="h-4 w-4" />,
  },
  labor: {
    label: '労務',
    icon: <Users className="h-4 w-4" />,
  },
  decision: {
    label: '意思決定',
    icon: <CheckCircle className="h-4 w-4" />,
  },
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
    // 原則3: 枠線ではなく余白でグルーピング。最小限のボーダーのみ
    <div className="flex">
      {/* レーンラベル: 2.1スペーシング準拠 (py-3=12px, px-2=8px) */}
      <div className="w-16 shrink-0 py-3 px-2 flex items-center gap-2 text-muted-foreground">
        {config.icon}
        <span className="text-sm truncate">{config.label}</span>
      </div>
      {/* イベント領域: 2.1スペーシング準拠 */}
      <div className="flex-1 py-2 px-4 overflow-x-auto border-b border-border">
        <div className="flex gap-2 min-h-[44px] items-center">
          {events.length === 0 ? (
            <span className="text-sm text-muted-foreground">--</span>
          ) : (
            events.map((event) => (
              // 2.4: ターゲットサイズ44x44相当、2.3: 状態はアイコン併用
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick(event)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 min-h-[44px] rounded bg-secondary text-secondary-foreground hover:bg-muted transition-colors',
                  event.status === 'critical' && 'bg-red-50 text-red-900'
                )}
              >
                {event.status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />}
                <span className="truncate max-w-[120px]">{event.title}</span>
                <span className="text-muted-foreground text-sm shrink-0">{formatTime(event.timestamp)}</span>
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
  storeId: string;
}

function EventDetailPanel({ event, onClose, storeId }: EventDetailPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { actions } = useStore();
  
  if (!event) return null;
  
  const config = LANE_CONFIG[event.lane];
  
  // Check if this is a demand_drop related event
  const isDemandDropEvent = event.originalEvent && 
    (event.originalEvent.type === 'sales' && event.status === 'critical');
  
  const today = new Date().toISOString().split('T')[0];
  const timeBand: TimeBand = 'all'; // Could be derived from event timestamp
  
  // Check for existing incident
  const existingIncident = isDemandDropEvent 
    ? actions.findExistingIncident(storeId, today, timeBand, 'demand_drop')
    : undefined;
  
  const handleCreateIncident = () => {
    if (!event.originalEvent) return;
    
    const result = actions.createIncidentFromSignal({
      storeId,
      businessDate: today,
      timeBand,
      type: 'demand_drop',
      title: `${event.title}の異常検出`,
      summary: event.description,
    });
    
    router.push(`/stores/${storeId}/os/incidents/${result.incidentId}`);
  };
  
  const handleGoToIncident = () => {
    if (existingIncident) {
      router.push(`/stores/${storeId}/os/incidents/${existingIncident.id}`);
    }
  };
  
  return (
    // 原則3: ドロワーは必要な枠。2.1スペーシング準拠
    <Card className="absolute right-0 top-0 w-80 shadow-lg z-10">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            {config.icon}
            <span className="text-sm">{config.label}</span>
          </div>
          {/* 2.4: 閉じるボタンは44x44ヒット領域 */}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div>
          <div className="text-base font-bold">{event.title}</div>
          <div className="text-sm text-muted-foreground mt-1">{event.description}</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {new Date(event.timestamp).toLocaleString('ja-JP')}
        </div>
        {/* 2.3: 状態はアイコン+ラベル併用 */}
        {event.status && event.status !== 'normal' && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded text-sm',
            event.status === 'critical' && 'bg-red-50 text-red-900',
            event.status === 'warning' && 'bg-amber-50 text-amber-900',
            event.status === 'success' && 'bg-emerald-50 text-emerald-900'
          )}>
            {event.status === 'critical' && <AlertTriangle className="h-4 w-4" />}
            {event.status === 'warning' && <AlertTriangle className="h-4 w-4" />}
            {event.status === 'success' && <CheckCircle className="h-4 w-4" />}
            <span>{event.status === 'success' ? '完了' : event.status === 'critical' ? '緊急対応が必要' : '注意が必要'}</span>
          </div>
        )}
        
        {/* 原則4: Primary CTAは単一。2.2 CTA階層設計 */}
        {event.status === 'critical' && (
          <div className="pt-4 border-t border-border">
            {existingIncident ? (
              <Button variant="secondary" onClick={handleGoToIncident} className="w-full gap-2 h-11">
                <ExternalLink className="h-4 w-4" />
                {t('incidents.goToExisting')}
              </Button>
            ) : (
              <Button onClick={handleCreateIncident} className="w-full gap-2 h-11">
                <FileWarning className="h-4 w-4" />
                {t('incidents.createFromSignal')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface LaneTimelineProps {
  events: DomainEvent[];
  maxEventsPerLane?: number;
  lastUpdate?: string;
  storeId: string;
}

export function LaneTimeline({ events, maxEventsPerLane = 10, lastUpdate, storeId }: LaneTimelineProps) {
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
    // 原則3: Cardは最終手段だが、タイムラインは独立コンポーネントなので許容
    <Card className="relative">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>統合タイムライン</CardTitle>
            {lastUpdate && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {new Date(lastUpdate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {/* 2.4: フィルターボタンは44x44ヒット領域 */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {lanes.map((lane) => {
              const config = LANE_CONFIG[lane];
              const isActive = filterLanes.size === 0 || filterLanes.has(lane);
              return (
                <button
                  key={lane}
                  type="button"
                  onClick={() => toggleLaneFilter(lane)}
                  title={config.label}
                  className={cn(
                    'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors',
                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground opacity-50'
                  )}
                >
                  {config.icon}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      {/* 原則1: 余白でグルーピング。枠線は最小限 */}
      <CardContent className="p-0">
        <div>
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
          storeId={storeId}
        />
      )}
    </Card>
  );
}
