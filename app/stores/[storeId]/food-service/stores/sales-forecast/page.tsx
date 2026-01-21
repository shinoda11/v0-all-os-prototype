'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/state/store';
import { selectCalendarData, selectMonthlyForecastSummary, selectCurrentStore } from '@/core/selectors';
import type { TimeBand } from '@/core/types';
import { Download, Users, Wallet, TrendingUp } from 'lucide-react';

export default function SalesForecastPage() {
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const [timeBand, setTimeBand] = useState<TimeBand>('all');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ customers: string; avgSpend: string }>({ customers: '', avgSpend: '' });

  const calendarData = selectCalendarData(state, state.selectedMonth, timeBand);
  const summary = selectMonthlyForecastSummary(state, state.selectedMonth, timeBand);

  const handleCellClick = (date: string, customers: number, avgSpend: number) => {
    if (timeBand === 'all') return;
    setEditingCell(date);
    setEditValues({
      customers: customers.toString(),
      avgSpend: avgSpend.toString(),
    });
  };

  const handleSave = (date: string) => {
    const customers = parseInt(editValues.customers) || 0;
    const avgSpend = parseInt(editValues.avgSpend) || 0;
    actions.upsertForecast(date, timeBand, customers, avgSpend);
    setEditingCell(null);
  };

  const handleCancel = () => {
    setEditingCell(null);
  };

  const handleExportCSV = () => {
    const headers = ['日付', '曜日', '予測客数', '平均客単価', '予測売上'];
    const rows = calendarData.map((cell) => [
      cell.date,
      cell.dayOfWeek,
      cell.customers,
      cell.avgSpend,
      cell.sales,
    ]);
    
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    alert(`CSV Export:\n\n${csv}`);
  };

  if (!currentStore) {
    return null;
  }

  const shortName = currentStore.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  return (
    <div className="space-y-6">
      <PageHeader
        title="売上予測入力"
        subtitle={`${shortName} - ${state.selectedMonth}`}
        actions={
          <>
            <TimeBandTabs value={timeBand} onChange={setTimeBand} />
            <Button variant="outline" onClick={handleExportCSV} className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              CSV出力
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="予測客数合計"
          value={summary.totalCustomers.toLocaleString()}
          subValue="人"
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="平均客単価"
          value={`¥${summary.avgSpend.toLocaleString()}`}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          title="予測売上合計"
          value={`¥${summary.totalSales.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>日別予測入力</CardTitle>
          {timeBand === 'all' && (
            <p className="text-sm text-muted-foreground">
              編集するにはタイムバンドを選択してください
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-sm font-medium">日付</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">曜日</th>
                  <th className="px-3 py-2 text-right text-sm font-medium">予測客数</th>
                  <th className="px-3 py-2 text-right text-sm font-medium">平均客単価</th>
                  <th className="px-3 py-2 text-right text-sm font-medium">予測売上</th>
                  <th className="px-3 py-2 text-center text-sm font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {calendarData.map((cell) => {
                  const isWeekend = ['土', '日'].includes(cell.dayOfWeek);
                  const isEditing = editingCell === cell.date;
                  
                  return (
                    <tr
                      key={cell.date}
                      className={`border-b hover:bg-muted/50 ${isWeekend ? 'bg-muted/20' : ''}`}
                    >
                      <td className="px-3 py-2 text-sm">{cell.date}</td>
                      <td className={`px-3 py-2 text-sm ${cell.dayOfWeek === '日' ? 'text-red-600' : cell.dayOfWeek === '土' ? 'text-blue-600' : ''}`}>
                        {cell.dayOfWeek}
                      </td>
                      {isEditing ? (
                        <>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={editValues.customers}
                              onChange={(e) => setEditValues({ ...editValues, customers: e.target.value })}
                              className="h-8 w-24 text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={editValues.avgSpend}
                              onChange={(e) => setEditValues({ ...editValues, avgSpend: e.target.value })}
                              className="h-8 w-24 text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-sm">
                            ¥{((parseInt(editValues.customers) || 0) * (parseInt(editValues.avgSpend) || 0)).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <Button size="sm" onClick={() => handleSave(cell.date)}>
                                保存
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancel}>
                                取消
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-right text-sm">{cell.customers.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm">¥{cell.avgSpend.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm">¥{cell.sales.toLocaleString()}</td>
                          <td className="px-3 py-2 text-center">
                            {timeBand !== 'all' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCellClick(cell.date, cell.customers, cell.avgSpend)}
                              >
                                編集
                              </Button>
                            )}
                          </td>
                        </>
                      )}
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
