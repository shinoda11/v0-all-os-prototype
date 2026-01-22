'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

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

export function formatUpdateTime(lastUpdate: string | Date, locale: 'ja' | 'en' = 'ja'): string {
  const updateTime = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  return updateTime.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

export function getFreshnessLabel(status: FreshnessStatus, t: (key: string) => string): string {
  switch (status) {
    case 'fresh': return t('freshness.fresh');
    case 'warning': return t('freshness.warning');
    case 'stale': return t('freshness.stale');
  }
}

export function FreshnessBadge({ 
  lastUpdate, 
  className,
  showTime = true,
  compact = false,
}: FreshnessBadgeProps) {
  const { locale, t } = useI18n();
  const status = getFreshnessStatus(lastUpdate);
  const time = formatUpdateTime(lastUpdate, locale);
  
  // All monochrome - gray scale only
  const statusConfig = {
    fresh: {
      icon: CheckCircle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
    },
    warning: {
      icon: Clock,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
    },
    stale: {
      icon: AlertCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
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
  const { locale, t } = useI18n();
  const status = getFreshnessStatus(lastUpdate);
  
  // All monochrome dots
  const dotColors = {
    fresh: 'bg-gray-400',
    warning: 'bg-gray-400',
    stale: 'bg-gray-500',
  };
  
  return (
    <div 
      className={cn('flex items-center gap-1', className)}
      title={`${getFreshnessLabel(status, t)} (${formatUpdateTime(lastUpdate, locale)})`}
    >
      <div className={cn('h-1.5 w-1.5 rounded-full', dotColors[status])} />
      <span className="text-[10px] text-muted-foreground">
        {formatUpdateTime(lastUpdate, locale)}
      </span>
    </div>
  );
}
