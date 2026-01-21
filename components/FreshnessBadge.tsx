'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

export type FreshnessStatus = 'fresh' | 'warning' | 'stale';

interface FreshnessBadgeProps {
  lastUpdate: string | Date;
  className?: string;
  showTime?: boolean;
  compact?: boolean;
}

export function getFreshnessStatus(lastUpdate: string | Date): FreshnessStatus {
  const updateTime = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  const now = new Date();
  const diffMinutes = (now.getTime() - updateTime.getTime()) / (1000 * 60);
  
  if (diffMinutes < 2) return 'fresh';
  if (diffMinutes < 5) return 'warning';
  return 'stale';
}

export function formatUpdateTime(lastUpdate: string | Date): string {
  const updateTime = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  return updateTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export function getFreshnessLabel(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh': return '最新';
    case 'warning': return '少し前';
    case 'stale': return '更新が必要';
  }
}

export function FreshnessBadge({ 
  lastUpdate, 
  className,
  showTime = true,
  compact = false,
}: FreshnessBadgeProps) {
  const status = getFreshnessStatus(lastUpdate);
  const time = formatUpdateTime(lastUpdate);
  
  const statusConfig = {
    fresh: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    warning: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    stale: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  if (compact) {
    return (
      <div 
        className={cn(
          'inline-flex items-center gap-1 text-[10px]',
          config.color,
          className
        )}
        title={`最終更新: ${time}`}
      >
        <Icon className="h-2.5 w-2.5" />
        <span>{time}</span>
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] border',
        config.bgColor,
        config.borderColor,
        config.color,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {showTime && <span>{time}</span>}
    </div>
  );
}

// Utility component for inline use in headers
export function FreshnessIndicator({ 
  lastUpdate,
  className,
}: { 
  lastUpdate: string | Date; 
  className?: string;
}) {
  const status = getFreshnessStatus(lastUpdate);
  
  const dotColors = {
    fresh: 'bg-green-500',
    warning: 'bg-yellow-500',
    stale: 'bg-red-500',
  };
  
  return (
    <div 
      className={cn('flex items-center gap-1', className)}
      title={`${getFreshnessLabel(status)} (${formatUpdateTime(lastUpdate)})`}
    >
      <div className={cn('h-1.5 w-1.5 rounded-full', dotColors[status])} />
      <span className="text-[10px] text-muted-foreground">
        {formatUpdateTime(lastUpdate)}
      </span>
    </div>
  );
}
