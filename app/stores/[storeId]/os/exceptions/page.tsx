'use client';

import type React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowRight,
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

export default function ExceptionsPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const exceptions = selectExceptions(state);

  const criticalCount = exceptions.filter((e) => e.severity === 'critical').length;
  const warningCount = exceptions.filter((e) => e.severity === 'warning').length;

  const handleCreateProposal = () => {
    router.push(`/stores/${storeId}/os/cockpit`);
  };

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  return (
    <div className="space-y-6">
      <PageHeader title="例外センター" subtitle={shortName} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="例外合計"
          value={exceptions.length.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          status={exceptions.length === 0 ? 'success' : 'warning'}
        />
        <MetricCard
          title="緊急"
          value={criticalCount.toString()}
          icon={<AlertCircle className="h-5 w-5" />}
          status={criticalCount === 0 ? 'success' : 'error'}
        />
        <MetricCard
          title="警告"
          value={warningCount.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          status={warningCount === 0 ? 'success' : 'warning'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>例外一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8 text-green-600" />}
              title="例外なし"
              description="現在、対応が必要な例外はありません"
            />
          ) : (
            <div className="space-y-4">
              {exceptions.map((exception) => {
                const config = EXCEPTION_CONFIG[exception.type];
                return (
                  <div
                    key={exception.id}
                    className={cn(
                      'flex items-start gap-4 rounded-lg border p-4 transition-colors',
                      exception.severity === 'critical'
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-yellow-300 bg-yellow-50/50'
                    )}
                  >
                    <div className={cn('mt-0.5', config.color)}>
                      {config.icon}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            exception.severity === 'critical'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }
                        >
                          {exception.severity === 'critical' ? '緊急' : '警告'}
                        </Badge>
                        <Badge variant="secondary">{config.label}</Badge>
                      </div>
                      <h4 className="font-semibold">{exception.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {exception.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        検出時刻: {new Date(exception.detectedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateProposal}
                        className="gap-1 bg-transparent"
                      >
                        提案を作成
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
