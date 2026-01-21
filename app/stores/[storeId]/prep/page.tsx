'use client';

import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';
import { derivePrepMetrics } from '@/core/derive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { Progress } from '@/components/ui/progress';

export default function PrepPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);

  if (!currentStore) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const prepMetrics = derivePrepMetrics(state.events, currentStore.id, today);

  // Group prep items by unit
  const prepItemsByUnit = state.prepItems.reduce((acc, item) => {
    const unit = item.unit || '個';
    if (!acc[unit]) {
      acc[unit] = [];
    }
    acc[unit].push(item);
    return acc;
  }, {} as Record<string, typeof state.prepItems>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="仕込み管理"
        description={`${currentStore.name} の仕込み品目一覧`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              仕込み品目数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.prepItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              本日の完了
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {prepMetrics.completed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              進行中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {prepMetrics.inProgress}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              進捗率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prepMetrics.progressPercent}%
            </div>
            <Progress value={prepMetrics.progressPercent} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>仕込み品目一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {state.prepItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="space-y-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {item.id}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      1バッチあたり
                    </div>
                    <div className="font-medium">
                      {item.batchSize} {item.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      所要時間
                    </div>
                    <div className="font-medium">{item.prepTimeMinutes}分</div>
                  </div>
                  <Badge variant="outline">{item.unit}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
