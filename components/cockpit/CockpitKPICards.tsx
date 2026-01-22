'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  CheckCircle,
  ArrowRight,
  XCircle,
} from 'lucide-react';
import type {
  SalesKPI,
  LaborKPI,
  SupplyDemandKPI,
  OperationsKPI,
  ExceptionsKPI,
} from '@/core/types';

/* ===== Design Guidelines Compliance =====
 * 3.1 KPIカード必須要素: タイトル、主要数値、差分/達成度、状態ラベル、次の一手
 * 2.3 状態表現: 色だけでなくアイコン+ラベル併用
 * 2.3 欠損値: 「データなし」「計算中」で統一
 * 2.1 スペーシング: 8/12/16/24スケール使用
 */

// 状態ラベル: 色+アイコン+テキストで表現 (2.3準拠)
type StatusType = 'success' | 'warning' | 'danger' | 'neutral';

const STATUS_CONFIG: Record<StatusType, { icon: React.ReactNode; label: string; className: string }> = {
  success: { 
    icon: <CheckCircle className="h-4 w-4" />, 
    label: '正常', 
    className: 'text-emerald-700 bg-emerald-50 border-emerald-200' 
  },
  warning: { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    label: '注意', 
    className: 'text-amber-700 bg-amber-50 border-amber-200' 
  },
  danger: { 
    icon: <XCircle className="h-4 w-4" />, 
    label: '危険', 
    className: 'text-red-700 bg-red-50 border-red-200' 
  },
  neutral: { 
    icon: <Minus className="h-4 w-4" />, 
    label: '--', 
    className: 'text-gray-500 bg-gray-50 border-gray-200' 
  },
};

function StatusBadge({ status }: { status: StatusType }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded border', config.className)}>
      {config.icon}
      {config.label}
    </span>
  );
}

interface LastUpdateProps {
  timestamp: string | null | undefined;
}

function LastUpdate({ timestamp }: LastUpdateProps) {
  if (!timestamp) {
    return <span className="text-sm text-muted-foreground">更新時刻不明</span>;
  }
  
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return <span className="text-sm text-muted-foreground">更新時刻不明</span>;
  }
  
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

// 欠損値表示の統一 (2.3準拠)
function NoData({ reason = 'データなし' }: { reason?: string }) {
  return (
    <span className="text-muted-foreground" title={reason}>
      {reason}
    </span>
  );
}

function LoadingValue() {
  return <span className="text-muted-foreground animate-pulse">計算中...</span>;
}

// 数値のフォーマット（NaN対策）
function formatNumber(value: number | null | undefined, fallback = '--'): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString();
}

function formatPercent(value: number | null | undefined, fallback = '--'): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return `${Math.round(value)}%`;
}

// Sales KPI Card
interface SalesKPICardProps {
  data: SalesKPI | null;
  highlighted?: boolean;
  onAction?: () => void;
}

export function SalesKPICard({ data, highlighted, onAction }: SalesKPICardProps) {
  const TrendIcon = data?.trend === 'up' ? TrendingUp : data?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = data?.trend === 'up' ? 'text-emerald-700' : data?.trend === 'down' ? 'text-red-700' : 'text-muted-foreground';
  
  const status: StatusType = data
    ? data.achievementRate >= 100 ? 'success'
    : data.achievementRate >= 80 ? 'warning'
    : 'danger'
    : 'neutral';
    
  // 次の一手を決定 (3.1準拠)
  const nextAction = data
    ? data.achievementRate < 80 ? '売上施策を確認'
    : data.achievementRate < 100 ? '追加施策を検討'
    : '詳細を確認'
    : null;

  return (
    <Card className={cn(
      'transition-all duration-200 flex flex-col',
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">売上</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {!data ? <NoData reason="データなし" /> : (
          <>
            {/* 主要数値 */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">¥{formatNumber(data.actual)}</span>
              <div className={cn('flex items-center gap-1 text-base', trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{formatPercent(data.achievementRate)}</span>
              </div>
            </div>
            
            {/* 詳細数値 */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="text-muted-foreground">予測</div>
              <div className="text-right">¥{formatNumber(data.forecast)}</div>
              <div className="text-muted-foreground">差分</div>
              <div className={cn('text-right font-medium', data.diff >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                {data.diff >= 0 ? '+' : ''}¥{formatNumber(data.diff)}
              </div>
              <div className="text-muted-foreground">着地見込</div>
              <div className="text-right text-sm">
                ¥{formatNumber(data.landingEstimate?.min)}〜{formatNumber(data.landingEstimate?.max)}
              </div>
            </div>
            
            {/* フッター: 更新時刻 + 次の一手 */}
            <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
              <LastUpdate timestamp={data.lastUpdate} />
              {nextAction && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-sm text-primary hover:text-primary"
                  onClick={onAction}
                >
                  {nextAction}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
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
  onAction?: () => void;
}

export function LaborKPICard({ data, highlighted, onAction }: LaborKPICardProps) {
  const status: StatusType = data
    ? data.estimatedLaborRate <= 30 ? 'success'
    : data.estimatedLaborRate <= 35 ? 'warning'
    : 'danger'
    : 'neutral';
    
  const nextAction = data
    ? data.estimatedLaborRate > 35 ? 'シフト調整'
    : data.estimatedLaborRate > 30 ? '状況を確認'
    : '詳細を確認'
    : null;

  return (
    <Card className={cn(
      'transition-all duration-200 flex flex-col',
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">労務</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {!data ? <NoData reason="データなし" /> : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">¥{formatNumber(data.actualCost)}</span>
              <span className={cn(
                'text-base font-medium px-2 py-0.5 rounded',
                data.estimatedLaborRate <= 30 ? 'bg-emerald-100 text-emerald-700' : 
                data.estimatedLaborRate <= 35 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              )}>
                人件費率 {data.estimatedLaborRate?.toFixed(1) ?? '--'}%
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="text-muted-foreground">売上/人件費</div>
              <div className="text-right">{data.salesPerLaborCost?.toFixed(1) ?? '--'}倍</div>
              <div className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />人時
              </div>
              <div className="text-right">{data.actualHours?.toFixed(1) ?? '--'}h / {data.plannedHours?.toFixed(1) ?? '--'}h</div>
              <div className="text-muted-foreground flex items-center gap-1">
                <Coffee className="h-3 w-3" />休憩中
              </div>
              <div className="text-right">{data.breakCount ?? 0}名</div>
            </div>
            
            <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
              <LastUpdate timestamp={data.lastUpdate} />
              {nextAction && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-sm text-primary hover:text-primary"
                  onClick={onAction}
                >
                  {nextAction}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
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
  onAction?: () => void;
}

export function SupplyDemandKPICard({ data, highlighted, onAction }: SupplyDemandKPICardProps) {
  const hasRisk = data && (data.stockoutRisk > 0 || data.excessRisk > 0);
  const status: StatusType = !data ? 'neutral' : !hasRisk ? 'success' : data.stockoutRisk > 2 || data.excessRisk > 2 ? 'danger' : 'warning';
  
  const statusLabel = !hasRisk ? 'バランス良好' : data?.stockoutRisk && data.stockoutRisk > (data.excessRisk ?? 0) ? '欠品リスク' : '過剰リスク';
  
  const nextAction = data
    ? hasRisk ? '在庫を確認'
    : '詳細を確認'
    : null;

  return (
    <Card className={cn(
      'transition-all duration-200 flex flex-col',
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">需給</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {!data ? <NoData reason="データなし" /> : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{statusLabel}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />欠品リスク
              </div>
              <div className={cn('text-right', (data.stockoutRisk ?? 0) > 0 && 'text-red-700 font-medium')}>
                {data.stockoutRisk ?? 0}品目
              </div>
              <div className="text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />過剰リスク
              </div>
              <div className={cn('text-right', (data.excessRisk ?? 0) > 0 && 'text-amber-700 font-medium')}>
                {data.excessRisk ?? 0}品目
              </div>
            </div>
            
            {data.topItems && data.topItems.length > 0 && (
              <div className="p-2 bg-gray-50 rounded text-sm">
                <div className="text-muted-foreground text-xs mb-1">注意品目</div>
                <div className="flex flex-wrap gap-1">
                  {data.topItems.slice(0, 3).map((item, i) => (
                    <span
                      key={i}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                        item.risk === 'stockout' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {item.risk === 'stockout' ? <XCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
              <LastUpdate timestamp={data.lastUpdate} />
              {nextAction && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-sm text-primary hover:text-primary"
                  onClick={onAction}
                >
                  {nextAction}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
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
  onAction?: () => void;
}

export function OperationsKPICard({ data, highlighted, onAction }: OperationsKPICardProps) {
  const status: StatusType = !data ? 'neutral'
    : (data.completionRate ?? 0) >= 80 ? 'success'
    : (data.completionRate ?? 0) >= 50 ? 'warning'
    : 'danger';
    
  const nextAction = data
    ? (data.delayedCount ?? 0) > 0 ? '遅延を確認'
    : data.bottleneck ? 'ボトルネック対応'
    : '詳細を確認'
    : null;

  return (
    <Card className={cn(
      'transition-all duration-200 flex flex-col',
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">オペ運営</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {!data ? <NoData reason="データなし" /> : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">完了 {formatPercent(data.completionRate)}</span>
              {(data.delayedCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded bg-red-100 text-red-700">
                  <AlertCircle className="h-3 w-3" />
                  {data.delayedCount}件遅延
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3 text-emerald-500" />完了率
              </div>
              <div className="text-right">{formatPercent(data.completionRate)}</div>
              <div className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />遅延
              </div>
              <div className={cn('text-right', (data.delayedCount ?? 0) > 0 && 'text-red-700 font-medium')}>{data.delayedCount ?? 0}件</div>
            </div>
            
            {data.bottleneck && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                <div className="flex items-center gap-1 text-amber-700 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  ボトルネック
                </div>
                <div className="text-amber-600 truncate mt-1">{data.bottleneck.task}</div>
              </div>
            )}
            
            <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
              <LastUpdate timestamp={data.lastUpdate} />
              {nextAction && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-sm text-primary hover:text-primary"
                  onClick={onAction}
                >
                  {nextAction}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
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
  onAction?: () => void;
}

export function ExceptionsKPICard({ data, highlighted, onAction }: ExceptionsKPICardProps) {
  const total = data ? (data.criticalCount ?? 0) + (data.warningCount ?? 0) : 0;
  const status: StatusType = !data ? 'neutral'
    : total === 0 ? 'success'
    : (data.criticalCount ?? 0) > 0 ? 'danger'
    : 'warning';
    
  const nextAction = data
    ? (data.criticalCount ?? 0) > 0 ? '緊急対応'
    : (data.warningCount ?? 0) > 0 ? '例外を確認'
    : '詳細を確認'
    : null;

  return (
    <Card className={cn(
      'transition-all duration-200 flex flex-col',
      highlighted && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">例外</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {!data ? <NoData reason="データなし" /> : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {total === 0 ? '問題なし' : `危険 ${total}件`}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(data.criticalCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded bg-red-100 text-red-700">
                  <XCircle className="h-3.5 w-3.5" />
                  緊急 {data.criticalCount}件
                </span>
              )}
              {(data.warningCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  警告 {data.warningCount}件
                </span>
              )}
              {total === 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                  例外なし
                </span>
              )}
            </div>
            
            {data.topException && (
              <div className={cn(
                'p-2 rounded border text-sm',
                data.topException.impactType === 'sales' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
              )}>
                <div className="font-medium truncate">{data.topException.title}</div>
                <div className="text-muted-foreground text-xs">{data.topException.impact}</div>
              </div>
            )}
            
            <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
              <LastUpdate timestamp={data.lastUpdate} />
              {nextAction && (
                <Button 
                  variant={(data.criticalCount ?? 0) > 0 ? 'default' : 'ghost'}
                  size="sm" 
                  className={cn(
                    'h-8 text-sm',
                    (data.criticalCount ?? 0) > 0 ? '' : 'text-primary hover:text-primary'
                  )}
                  onClick={onAction}
                >
                  {nextAction}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Combined KPI Row - Using guideline spacing (16/24px gap)
interface CockpitKPICardsProps {
  sales: SalesKPI | null;
  labor: LaborKPI | null;
  supplyDemand: SupplyDemandKPI | null;
  operations: OperationsKPI | null;
  exceptions: ExceptionsKPI | null;
  highlightedKeys?: string[];
  onSalesAction?: () => void;
  onLaborAction?: () => void;
  onSupplyAction?: () => void;
  onOpsAction?: () => void;
  onExceptionsAction?: () => void;
}

export function CockpitKPICards({
  sales,
  labor,
  supplyDemand,
  operations,
  exceptions,
  highlightedKeys = [],
  onSalesAction,
  onLaborAction,
  onSupplyAction,
  onOpsAction,
  onExceptionsAction,
}: CockpitKPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <SalesKPICard data={sales} highlighted={highlightedKeys.includes('sales')} onAction={onSalesAction} />
      <LaborKPICard data={labor} highlighted={highlightedKeys.includes('labor')} onAction={onLaborAction} />
      <SupplyDemandKPICard data={supplyDemand} highlighted={highlightedKeys.includes('supplyDemand')} onAction={onSupplyAction} />
      <OperationsKPICard data={operations} highlighted={highlightedKeys.includes('operations')} onAction={onOpsAction} />
      <ExceptionsKPICard data={exceptions} highlighted={highlightedKeys.includes('exceptions')} onAction={onExceptionsAction} />
    </div>
  );
}
