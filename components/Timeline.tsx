'use client';

import React from "react"

import { DomainEvent } from '@/core/types';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  Users,
  ChefHat,
  Truck,
  CheckCircle,
  BarChart3,
} from 'lucide-react';

interface TimelineProps {
  events: DomainEvent[];
  maxItems?: number;
}

const eventConfig: Record<
  DomainEvent['type'],
  { icon: React.ReactNode; color: string; label: string }
> = {
  sales: {
    icon: <DollarSign className="h-4 w-4" />,
    color: 'bg-green-500',
    label: '売上',
  },
  labor: {
    icon: <Users className="h-4 w-4" />,
    color: 'bg-blue-500',
    label: '勤怠',
  },
  prep: {
    icon: <ChefHat className="h-4 w-4" />,
    color: 'bg-orange-500',
    label: '仕込み',
  },
  delivery: {
    icon: <Truck className="h-4 w-4" />,
    color: 'bg-purple-500',
    label: '配送',
  },
  decision: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'bg-teal-500',
    label: '意思決定',
  },
  forecast: {
    icon: <BarChart3 className="h-4 w-4" />,
    color: 'bg-indigo-500',
    label: '予測',
  },
};

function getEventDescription(event: DomainEvent): string {
  switch (event.type) {
    case 'sales':
      return `¥${event.total.toLocaleString()} (${event.quantity}点)`;
    case 'labor':
      const actionLabels: Record<string, string> = {
        'check-in': '出勤',
        'check-out': '退勤',
        'break-start': '休憩開始',
        'break-end': '休憩終了',
      };
      return actionLabels[event.action] || event.action;
    case 'prep':
      const statusLabels: Record<string, string> = {
        planned: '計画',
        started: '開始',
        completed: '完了',
        cancelled: 'キャンセル',
      };
      return `${statusLabels[event.status]} (${event.quantity}${event.prepItemId})`;
    case 'delivery':
      return `${event.itemName} - ${event.status === 'delayed' ? `${event.delayMinutes}分遅延` : event.status}`;
    case 'decision':
      return `${event.title} - ${event.action}`;
    case 'forecast':
      return `予測更新: ${event.date}`;
    default:
      return '';
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export function Timeline({ events, maxItems = 10 }: TimelineProps) {
  const displayEvents = events.slice(0, maxItems);

  if (displayEvents.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        イベントがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayEvents.map((event, index) => {
        const config = eventConfig[event.type];
        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-white',
                  config.color
                )}
              >
                {config.icon}
              </div>
              {index < displayEvents.length - 1 && (
                <div className="mt-2 h-full w-px bg-border" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(event.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {getEventDescription(event)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
