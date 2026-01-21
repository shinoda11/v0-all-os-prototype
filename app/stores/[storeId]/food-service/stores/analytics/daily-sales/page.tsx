'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/state/store';
import { selectMonthlySalesMetrics, selectCurrentStore } from '@/core/selectors';
import type { TimeBand, DailySalesMetrics } from '@/core/types';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function MiniChart({ data }: { data: DailySalesMetrics[] }) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.forecastSales, d.actualSales)), 1);
  const width = 400;
  const height = 100;
  const padding = 10;

  const getX = (index: number) => padding + (index * (width - 2 * padding)) / (data.length - 1 || 1);
  const getY = (value: number) => height - padding - ((value / maxValue) * (height - 2 * padding));

  const forecastPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.forecastSales)}`)
    .join(' ');

  const actualPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.actualSales)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e5e7eb" strokeWidth="1" />
      <path d={forecastPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" />
      <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth="2" />
      <line x1="10" y1="10" x2="30" y2="10" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" />
      <text x="35" y="14" fontSize="10" fill="#6b7280">予測</text>
      <line x1="70" y1="10" x2="90" y2="10" stroke="#3b82f6" strokeWidth="2" />
      <text x="95" y="14" fontSize="10" fill="#6b7280">実績</text>
    </svg>
  );
}

export default function DailySalesPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const [timeBand, setTimeBand] = useState<TimeBand>('all');

  const salesMetrics = selectMonthlySalesMetrics(state, state.selectedMonth, timeBand);

  const { totalForecast, totalActual, overallAchievement } = useMemo(() => {
    const forecast = salesMetrics.reduce((sum, m) => sum + m.forecastSales, 0);
    const actual = salesMetrics.reduce((sum, m) => sum + m.actualSales, 0);
    return {
      totalForecast: forecast,
      totalActual: actual,
      overallAchievement: forecast > 0 ? (actual / forecast) * 100 : 0,
    };
  }, [salesMetrics]);

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  return (
    <div className="space-y-6">
      <PageHeader
        title="日別売上分析"
        subtitle={`${shortName} - ${state.selectedMonth}`}
        actions={<TimeBandTabs value={timeBand} onChange={setTimeBand} />}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="予測売上"
          value={`¥${totalForecast.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="実績売上"
          value={`¥${totalActual.toLocaleString()}`}
          trend={totalActual >= totalForecast ? 'up' : 'down'}
          trendValue={`${Math.round(overallAchievement)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="達成率"
          value={`${Math.round(overallAchievement)}%`}
          status={overallAchievement >= 100 ? 'success' : overallAchievement >= 80 ? 'warning' : 'error'}
        />
        <MetricCard
          title="昨年実績"
          value="-"
          subValue="未連携"
          icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniChart data={salesMetrics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>日別売上一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-sm font-medium">日付</th>
                  <th className="px-3 py-2 text-right text-sm font-medium">予測売上</th>
                  <th className="px-3 py-2 text-right text-sm font-medium">実績売上</th>
                  <th className="px-3 py-2 text-right text-sm font-medium">達成率</th>
                  <th className="px-3 py-2 text-right text-sm font-medium">昨年実績</th>
                </tr>
              </thead>
              <tbody>
                {salesMetrics.map((metric) => {
                  const achievement = metric.achievementRate;
                  const dayName = new Date(metric.date).toLocaleDateString('ja-JP', { weekday: 'short' });
                  const isWeekend = ['土', '日'].includes(dayName);
                  
                  return (
                    <tr
                      key={metric.date}
                      className={cn(
                        'border-b hover:bg-muted/50',
                        isWeekend && 'bg-muted/20'
                      )}
                    >
                      <td className="px-3 py-2 text-sm">
                        <span>{metric.date}</span>
                        <span className={cn(
                          'ml-2',
                          dayName === '日' ? 'text-red-600' : dayName === '土' ? 'text-blue-600' : 'text-muted-foreground'
                        )}>
                          ({dayName})
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-sm">
                        ¥{metric.forecastSales.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-sm">
                        ¥{metric.actualSales.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            achievement >= 100
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : achievement >= 80
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          )}
                        >
                          {metric.forecastSales > 0 ? (
                            <span className="flex items-center gap-1">
                              {achievement >= 100 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.round(achievement)}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-sm">
                        <Badge variant="secondary" className="text-xs">
                          未連携
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
