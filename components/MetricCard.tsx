'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { FreshnessBadge, getFreshnessStatus } from '@/components/FreshnessBadge';
import { MissingValue } from '@/components/MissingValue';
import { isMissing, type MissingReason } from '@/lib/format';

/**
 * デザインガイドライン準拠
 * - 2.3: 状態はアイコン+ラベル併用、欠損値統一
 * - 2.5: フォントウェイトはRegular/Boldの2段
 * - 原則3: 枠線最小限
 */

interface MetricCardProps {
  title: string;
  value: string | number | null | undefined;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  highlighted?: boolean;
  status?: 'success' | 'warning' | 'error' | 'default';
  lastUpdate?: string | null;
  children?: React.ReactNode;
  missingReason?: MissingReason;
}

// 2.3: 状態はアイコン+ラベル併用
const STATUS_CONFIG = {
  success: { icon: CheckCircle, label: '正常', className: 'text-emerald-700' },
  warning: { icon: AlertTriangle, label: '注意', className: 'text-amber-700' },
  error: { icon: XCircle, label: '危険', className: 'text-red-700' },
  default: { icon: null, label: '', className: '' },
};

export function MetricCard({
  title,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  highlighted = false,
  status = 'default',
  lastUpdate,
  children,
  missingReason = 'no_data',
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-red-700' : 'text-muted-foreground';
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  // Check if data is stale for visual warning
  const freshness = lastUpdate ? getFreshnessStatus(lastUpdate) : null;
  const valueMissing = isMissing(value);

  return (
    <Card
      className={cn(
        'transition-all',
        highlighted && 'ring-2 ring-primary ring-offset-2',
        freshness === 'stale' && 'opacity-80'
      )}
    >
      {/* 2.1スペーシング: p-4=16px */}
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <CardTitle className="text-sm text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* 2.3: 状態はアイコン+ラベル併用 */}
          {StatusIcon && (
            <span className={cn('flex items-center gap-1 text-sm', statusConfig.className)}>
              <StatusIcon className="h-4 w-4" />
              <span>{statusConfig.label}</span>
            </span>
          )}
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {/* 2.3: 欠損値の統一表示 */}
        {valueMissing ? (
          <MissingValue reason={missingReason} />
        ) : (
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        )}
        <div className="flex items-center gap-2">
          {subValue && (
            <p className="text-sm text-muted-foreground">{subValue}</p>
          )}
          {trend && trendValue && !valueMissing && (
            <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {lastUpdate && (
          <FreshnessBadge lastUpdate={lastUpdate} compact />
        )}
        {children}
      </CardContent>
    </Card>
  );
}
