'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

/* ===== Design Guidelines Compliance =====
 * 2.3: 状態は色+アイコン+ラベル併用。色依存禁止
 * 2.1: スペーシング 4/8/12/16/24/32
 * 2.4: ターゲットサイズ44x44相当
 */

export type FreshnessStatus = 'fresh' | 'warning' | 'stale';

interface FreshnessBadgeProps {
  lastUpdate: string | Date | null | undefined;
  className?: string;
  showTime?: boolean;
  compact?: boolean;
}

export function getFreshnessStatus(lastUpdate: string | Date | null | undefined): FreshnessStatus {
  if (!lastUpdate) return 'stale';
  const updateTime = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  if (Number.isNaN(updateTime.getTime())) return 'stale';
  
  const now = new Date();
  const diffMinutes = (now.getTime() - updateTime.getTime()) / (1000 * 60);
  
  if (diffMinutes < 2) return 'fresh';
  if (diffMinutes < 5) return 'warning';
  return 'stale';
}

export function formatUpdateTime(lastUpdate: string | Date | null | undefined, locale: 'ja' | 'en' = 'ja'): string {
  // 2.3: 欠損値は「--」で統一
  if (!lastUpdate) return '--';
  const updateTime = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
  if (Number.isNaN(updateTime.getTime())) return '--';
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
  const [mounted, setMounted] = useState(false);
  
  // Only render time on client to avoid hydration mismatch due to timezone differences
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const status = getFreshnessStatus(lastUpdate);
  const time = mounted ? formatUpdateTime(lastUpdate, locale) : '--:--';
  const label = getFreshnessLabel(status, t);
  
  // 2.3: 状態はアイコン+ラベル併用。色のみに依存しない
  const statusConfig = {
    fresh: {
      icon: CheckCircle,
      label: '最新',
    },
    warning: {
      icon: Clock,
      label: '古いデータ',
    },
    stale: {
      icon: AlertCircle,
      label: '古いデータ',
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  if (compact) {
    return (
      <div 
        className={cn(
          'inline-flex items-center gap-2 text-sm text-muted-foreground',
          className
        )}
        title={`${config.label}: ${time}`}
      >
        <Icon className="h-4 w-4" />
        <span>{time}</span>
      </div>
    );
  }
  
  // 2.1スペーシング準拠: px-2=8px, py-1=4px, gap-2=8px
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded text-sm text-muted-foreground bg-secondary',
        status === 'stale' && 'bg-amber-50 text-amber-800',
        className
      )}
      title={config.label}
    >
      <Icon className="h-4 w-4" />
      <span>{status === 'stale' ? config.label : ''}</span>
      {showTime && <span>{time}</span>}
    </div>
  );
}

// Utility component for inline use in headers
export function FreshnessIndicator({ 
  lastUpdate,
  className,
}: { 
  lastUpdate: string | Date | null | undefined; 
  className?: string;
}) {
  const { locale, t } = useI18n();
  const [mounted, setMounted] = useState(false);
  
  // Only render time on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const status = getFreshnessStatus(lastUpdate);
  const time = mounted ? formatUpdateTime(lastUpdate, locale) : '--:--';
  const label = getFreshnessLabel(status, t);
  
  return (
    <div 
      className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
      title={`${label} (${time})`}
    >
      <Clock className="h-4 w-4" />
      <span>{time}</span>
      {status === 'stale' && (
        <span className="text-amber-700">古いデータ</span>
      )}
    </div>
  );
}
