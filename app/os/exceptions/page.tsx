'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/state/store';

export default function ExceptionsRedirect() {
  const router = useRouter();
  const { state } = useStore();

  useEffect(() => {
    if (state.selectedStoreId) {
      router.replace(`/stores/${state.selectedStoreId}/os/exceptions`);
    } else {
      router.replace('/stores/select');
    }
  }, [state.selectedStoreId, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">リダイレクト中...</p>
    </div>
  );
}
