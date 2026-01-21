'use client';

import React from "react"

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/state/store';
import { selectExceptions, selectCurrentStore } from '@/core/selectors';
import type { ExceptionItem } from '@/core/types';
import {
  AlertTriangle,
  AlertCircle,
  Truck,
  Users,
  TrendingUp,
  ChefHat,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EXCEPTION_CONFIG: Record<
  ExceptionItem['type'],
  { icon: React.ReactNode; color: string; label: string }
> = {
  'delivery-delay': {
    icon: <Truck className="h-5 w-5" />,
    color: 'text-purple-600',
    label: '配送遅延',
  },
  'staff-shortage': {
    icon: <Users className="h-5 w-5" />,
    color: 'text-blue-600',
    label: '人員不足',
  },
  'demand-surge': {
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'text-green-600',
    label: '需要急増',
  },
  'prep-behind': {
    icon: <ChefHat className="h-5 w-5" />,
    color: 'text-orange-600',
    label: '仕込み遅延',
  },
};

interface ExceptionCardProps {
  exception: ExceptionItem;
  onResolve: () => void;
}

function ExceptionCard({ exception, onResolve }: ExceptionCardProps) {
  const config = EXCEPTION_CONFIG[exception.type];
  const isCritical = exception.severity === 'critical';

  return (
    <Card className={cn('transition-all', isCritical && 'border-red-200 bg-red-50/30')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5', config.color)}>{config.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{exception.title}</h3>
                <Badge variant={isCritical ? 'destructive' : 'secondary'} className="text-xs">
                  {isCritical ? '緊急' : '注意'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{exception.description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                検出: {new Date(exception.detectedAt).toLocaleTimeString('ja-JP')}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onResolve} className="shrink-0 bg-transparent">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            解消
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExceptionsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const exceptions = selectExceptions(state);

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');
  const criticalCount = exceptions.filter((e) => e.severity === 'critical').length;
  const warningCount = exceptions.filter((e) => e.severity === 'warning').length;

  const handleResolve = (id: string) => {
    // In real app, would update exception status
    console.log('Resolve exception:', id);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="例外センター" subtitle={shortName} />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="緊急対応"
          value={`${criticalCount}件`}
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          trend={criticalCount > 0 ? 'down' : 'up'}
        />
        <MetricCard
          title="注意"
          value={`${warningCount}件`}
          icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}
        />
        <MetricCard
          title="合計"
          value={`${exceptions.length}件`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Exception list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">例外一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8 text-green-500" />}
              title="例外なし"
              description="現在対応が必要な例外はありません"
            />
          ) : (
            <div className="space-y-4">
              {exceptions.map((exception) => (
                <ExceptionCard
                  key={exception.id}
                  exception={exception}
                  onResolve={() => handleResolve(exception.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
