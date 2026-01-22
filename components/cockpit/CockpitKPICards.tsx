'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Package,
  Gauge,
  AlertTriangle,
  Clock,
  DollarSign,
  AlertCircle,
  Coffee,
} from 'lucide-react';
import type {
  SalesKPI,
  LaborKPI,
  SupplyDemandKPI,
  OperationsKPI,
  ExceptionsKPI,
} from '@/core/types';

interface LastUpdateProps {
  timestamp: string;
}

function LastUpdate({ timestamp }: LastUpdateProps) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  let display: string;
  if (diffMins < 1) display = 'たった今';
  else if (diffMins < 60) display = `${diffMins}分前`;
  else display = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  
  return (
    <span className="text-sm text-muted-foreground flex items-center gap-1">
      <Clock className="h-3.5 w-3.5" />
      {display}
    </span>
  );
}

function LoadingValue() {
  return <span className="text-muted-foreground animate-pulse">計算中...</span>;
}

// Sales KPI Card
interface SalesKPICardProps {
  data: SalesKPI | null;
  highlighted?: boolean;
}

export function SalesKPICard({ data, highlighted }: SalesKPICardProps) {
  const TrendIcon = data?.trend === 'up' ? TrendingUp : data?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = data?.trend === 'up' ? 'text-green-600' : data?.trend === 'down' ? 'text-red-600' : 'text-muted-foreground';
  
  const status = data
    ? data.achievementRate >= 100 ? 'success'
    : data.achievementRate >= 80 ? 'warning'
    : 'error'
    : 'default';
    
  const statusColors = {
    success: 'border-green-500/50 bg-green-50/50',
    warning: 'border-yellow-500/50 bg-yellow-50/50',
    error: 'border-red-500/50 bg-red-50/50',
    default: '',
  };

  return (
    <Card className={cn(
      'transition-all duration-300',
      statusColors[status],
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">売上</CardTitle>
        <DollarSign className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? <LoadingValue /> : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">¥{data.actual.toLocaleString()}</span>
              <div className={cn('flex items-center gap-1 text-lg', trendColor)}>
                <TrendIcon className="h-5 w-5" />
                <span>{Math.round(data.achievementRate)}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-base">
              <div className="text-muted-foreground">予測</div>
              <div className="text-right">¥{data.forecast.toLocaleString()}</div>
              <div className="text-muted-foreground">差分</div>
              <div className={cn('text-right', data.diff >= 0 ? 'text-green-600' : 'text-red-600')}>
                {data.diff >= 0 ? '+' : ''}¥{data.diff.toLocaleString()}
              </div>
              <div className="text-muted-foreground">着地見込</div>
              <div className="text-right">
                ¥{data.landingEstimate.min.toLocaleString()}〜{data.landingEstimate.max.toLocaleString()}
              </div>
            </div>
            <LastUpdate timestamp={data.lastUpdate} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Labor KPI Card
interface LaborKPICardProps {
  data: LaborKPI | null;
  highlighted?: boolean;
}

export function LaborKPICard({ data, highlighted }: LaborKPICardProps) {
  const status = data
    ? data.estimatedLaborRate <= 30 ? 'success'
    : data.estimatedLaborRate <= 35 ? 'warning'
    : 'error'
    : 'default';
    
  const statusColors = {
    success: 'border-green-500/50 bg-green-50/50',
    warning: 'border-yellow-500/50 bg-yellow-50/50',
    error: 'border-red-500/50 bg-red-50/50',
    default: '',
  };

  return (
    <Card className={cn(
      'transition-all duration-300',
      statusColors[status],
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">レーバー</CardTitle>
        <Users className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? <LoadingValue /> : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">¥{data.actualCost.toLocaleString()}</span>
              <Badge variant={data.estimatedLaborRate <= 30 ? 'default' : 'destructive'} className="text-base px-2 py-1">
                {data.estimatedLaborRate.toFixed(1)}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-base">
              <div className="text-muted-foreground">売上/人件費</div>
              <div className="text-right">{data.salesPerLaborCost.toFixed(1)}倍</div>
              <div className="text-muted-foreground">予定vs実績人時</div>
              <div className="text-right">{data.plannedHours.toFixed(1)}h / {data.actualHours.toFixed(1)}h</div>
              <div className="text-muted-foreground flex items-center gap-1">
                <Coffee className="h-3 w-3" />休憩中
              </div>
              <div className="text-right">{data.breakCount}名</div>
            </div>
            <LastUpdate timestamp={data.lastUpdate} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Supply Demand KPI Card
interface SupplyDemandKPICardProps {
  data: SupplyDemandKPI | null;
  highlighted?: boolean;
}

export function SupplyDemandKPICard({ data, highlighted }: SupplyDemandKPICardProps) {
  const hasRisk = data && (data.stockoutRisk > 0 || data.excessRisk > 0);
  const status = !data ? 'default' : !hasRisk ? 'success' : data.stockoutRisk > 2 || data.excessRisk > 2 ? 'error' : 'warning';
  
  const statusColors = {
    success: 'border-green-500/50 bg-green-50/50',
    warning: 'border-yellow-500/50 bg-yellow-50/50',
    error: 'border-red-500/50 bg-red-50/50',
    default: '',
  };

  return (
    <Card className={cn(
      'transition-all duration-300',
      statusColors[status],
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">需給</CardTitle>
        <Package className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? <LoadingValue /> : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">
                {!hasRisk ? 'バランス' : data.stockoutRisk > data.excessRisk ? '欠品リスク' : '過剰リスク'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-base">
              <div className="text-muted-foreground">欠品リスク</div>
              <div className={cn('text-right', data.stockoutRisk > 0 && 'text-red-600 font-medium')}>
                {data.stockoutRisk}品目
              </div>
              <div className="text-muted-foreground">過剰リスク</div>
              <div className={cn('text-right', data.excessRisk > 0 && 'text-yellow-600 font-medium')}>
                {data.excessRisk}品目
              </div>
            </div>
            {data.topItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.topItems.slice(0, 3).map((item, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={cn(
                      'text-sm',
                      item.risk === 'stockout' ? 'border-red-300 text-red-700' : 'border-yellow-300 text-yellow-700'
                    )}
                  >
                    {item.name}
                  </Badge>
                ))}
              </div>
            )}
            <LastUpdate timestamp={data.lastUpdate} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Operations KPI Card
interface OperationsKPICardProps {
  data: OperationsKPI | null;
  highlighted?: boolean;
}

export function OperationsKPICard({ data, highlighted }: OperationsKPICardProps) {
  const status = !data ? 'default'
    : data.completionRate >= 80 ? 'success'
    : data.completionRate >= 50 ? 'warning'
    : 'error';
    
  const statusColors = {
    success: 'border-green-500/50 bg-green-50/50',
    warning: 'border-yellow-500/50 bg-yellow-50/50',
    error: 'border-red-500/50 bg-red-50/50',
    default: '',
  };

  return (
    <Card className={cn(
      'transition-all duration-300',
      statusColors[status],
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">オペ</CardTitle>
        <Gauge className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? <LoadingValue /> : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">{Math.round(data.completionRate)}%</span>
              {data.delayedCount > 0 && (
                <Badge variant="destructive" className="text-base px-2 py-1">
                  {data.delayedCount}件遅延
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-base">
              <div className="text-muted-foreground">完了率</div>
              <div className="text-right">{Math.round(data.completionRate)}%</div>
              <div className="text-muted-foreground">遅延タスク</div>
              <div className={cn('text-right', data.delayedCount > 0 && 'text-red-600 font-medium')}>
                {data.delayedCount}件
              </div>
            </div>
            {data.bottleneck && (
              <div className="text-base p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="font-semibold text-yellow-800">ボトルネック</div>
                <div className="text-yellow-700 truncate">{data.bottleneck.task}</div>
              </div>
            )}
            <LastUpdate timestamp={data.lastUpdate} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Exceptions KPI Card
interface ExceptionsKPICardProps {
  data: ExceptionsKPI | null;
  highlighted?: boolean;
}

export function ExceptionsKPICard({ data, highlighted }: ExceptionsKPICardProps) {
  const total = data ? data.criticalCount + data.warningCount : 0;
  const status = !data ? 'default'
    : total === 0 ? 'success'
    : data.criticalCount > 0 ? 'error'
    : 'warning';
    
  const statusColors = {
    success: 'border-green-500/50 bg-green-50/50',
    warning: 'border-yellow-500/50 bg-yellow-50/50',
    error: 'border-red-500/50 bg-red-50/50',
    default: '',
  };

  return (
    <Card className={cn(
      'transition-all duration-300',
      statusColors[status],
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">例外</CardTitle>
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? <LoadingValue /> : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">{total}</span>
              <span className="text-xl text-muted-foreground">件</span>
            </div>
            <div className="flex gap-3 text-base">
              {data.criticalCount > 0 && (
                <Badge variant="destructive" className="text-base px-2 py-1 gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  緊急 {data.criticalCount}
                </Badge>
              )}
              {data.warningCount > 0 && (
                <Badge variant="outline" className="text-base px-2 py-1 gap-1.5 border-yellow-300 text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  警告 {data.warningCount}
                </Badge>
              )}
              {total === 0 && (
                <span className="text-green-600">問題なし</span>
              )}
            </div>
            {data.topException && (
              <div className={cn(
                'text-base p-3 rounded border',
                data.topException.impactType === 'sales' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              )}>
                <div className="font-semibold truncate">{data.topException.title}</div>
                <div className="text-muted-foreground">{data.topException.impact}</div>
              </div>
            )}
            <LastUpdate timestamp={data.lastUpdate} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Combined KPI Row
interface CockpitKPICardsProps {
  sales: SalesKPI | null;
  labor: LaborKPI | null;
  supplyDemand: SupplyDemandKPI | null;
  operations: OperationsKPI | null;
  exceptions: ExceptionsKPI | null;
  highlightedKeys?: string[];
}

export function CockpitKPICards({
  sales,
  labor,
  supplyDemand,
  operations,
  exceptions,
  highlightedKeys = [],
}: CockpitKPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <SalesKPICard data={sales} highlighted={highlightedKeys.includes('sales')} />
      <LaborKPICard data={labor} highlighted={highlightedKeys.includes('labor')} />
      <SupplyDemandKPICard data={supplyDemand} highlighted={highlightedKeys.includes('supplyDemand')} />
      <OperationsKPICard data={operations} highlighted={highlightedKeys.includes('operations')} />
      <ExceptionsKPICard data={exceptions} highlighted={highlightedKeys.includes('exceptions')} />
    </div>
  );
}
