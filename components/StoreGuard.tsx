'use client';

import type React from 'react';
import { AppShell } from './AppShell';
import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';

interface StoreGuardProps {
  children: React.ReactNode;
}

export function StoreGuard({ children }: StoreGuardProps) {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);

  if (!currentStore) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">店舗を選択してください</p>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
