'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/state/store';
import { Store, MapPin, ArrowRight, Loader2 } from 'lucide-react';

export default function StoreSelectPage() {
  const router = useRouter();
  const { state, actions } = useStore();

  console.log('[v0] StoreSelectPage render', { storesCount: state.stores.length });

  const handleSelectStore = (storeId: string) => {
    console.log('[v0] handleSelectStore called', storeId);
    actions.setStore(storeId);
    console.log('[v0] pushing to', `/stores/${storeId}/os/cockpit`);
    router.push(`/stores/${storeId}/os/cockpit`);
  };

  // Short name for display
  const getShortName = (name: string) => name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '');

  // Show loading state while stores are being loaded
  if (state.stores.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">AT</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">店舗を選択</h1>
          <p className="text-muted-foreground">管理する店舗を選択してください</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {state.stores.map((store) => (
            <button
              key={store.id}
              type="button"
              className="text-left w-full"
              onClick={() => handleSelectStore(store.id)}
            >
              <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{getShortName(store.name)}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {store.code}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      スタッフ: {state.staff.filter((s) => s.storeId === store.id).length}名
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      選択
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
