'use client';

import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  highlighted?: boolean;
  status?: 'success' | 'warning' | 'error' | 'default';
  lastUpdate?: string;
  children?: React.ReactNode;
}

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
}: MetricCardProps) {
  const statusColors = {
    success: 'border-green-500/50 bg-green-50/50',
    warning: 'border-yellow-500/50 bg-yellow-50/50',
    error: 'border-red-500/50 bg-red-50/50',
    default: '',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-muted-foreground',
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        statusColors[status],
        highlighted && 'ring-2 ring-primary ring-offset-2 animate-pulse'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2">
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
          {trend && trendValue && (
            <div className={cn('flex items-center gap-1 text-xs', trendColors[trend])}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {children}
        {lastUpdate && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <Clock className="h-2.5 w-2.5" />
            <span>更新 {formatTime(lastUpdate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
