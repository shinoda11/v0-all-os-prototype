'use client';

import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';

export default function MenuPage() {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);

  if (!currentStore) {
    return null;
  }

  // Group menus by category
  const menusByCategory = state.menus.reduce((acc, menu) => {
    const category = menu.category || '未分類';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, typeof state.menus>);

  const categories = Object.keys(menusByCategory);

  return (
    <div className="space-y-6">
      <PageHeader
        title="メニュー管理"
        description={`${currentStore.name} のメニュー一覧`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              メニュー数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.menus.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              カテゴリ数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平均単価
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{Math.round(state.menus.reduce((sum, m) => sum + m.price, 0) / state.menus.length).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {categories.map((category) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category}
                <Badge variant="secondary">{menusByCategory[category].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {menusByCategory[category].map((menu) => (
                  <div
                    key={menu.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{menu.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {menu.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">¥{menu.price.toLocaleString()}</div>
                      {menu.prepItemIds && menu.prepItemIds.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          仕込み: {menu.prepItemIds.length}品目
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
