'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/state/store';

export default function CockpitRedirect() {
  const router = useRouter();
  const { state } = useStore();

  useEffect(() => {
    // Always redirect to store 1 for prototype
    router.replace('/stores/1/os/cockpit');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">リダイレクト中...</p>
    </div>
  );
}
