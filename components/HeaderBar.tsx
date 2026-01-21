'use client';

import { useStore } from '@/state/store';
import { Button } from '@/components/ui/button';
import { Store, Menu, LogOut } from 'lucide-react';
import Link from 'next/link';

interface HeaderBarProps {
  storeId: string;
  onMenuClick?: () => void;
}

export function HeaderBar({ storeId, onMenuClick }: HeaderBarProps) {
  const { state } = useStore();
  const currentStore = state.stores.find((s) => s.id === storeId);

  // Short name for display
  const shortName = currentStore?.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '') ?? '';

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">メニューを開く</span>
        </Button>
        <Link href={`/stores/${storeId}/os/cockpit`} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">AT</span>
          </div>
          <span className="hidden font-semibold sm:inline-block">Aburi TORA</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {currentStore && (
          <Link
            href="/stores/select"
            className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/80"
          >
            <Store className="h-4 w-4" />
            {shortName}
          </Link>
        )}
        <Link href="/login">
          <Button variant="ghost" size="icon">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">ログアウト</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
