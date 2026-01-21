'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/state/store';
import { AppShell } from '@/components/AppShell';

// Valid store IDs (hardcoded to avoid race condition with store loading)
const VALID_STORE_IDS = ['1', '2', '3', '4'];

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { storeId: string };
}

export default function StoreLayout({ children, params }: StoreLayoutProps) {
  const { storeId } = params;
  const router = useRouter();
  const { actions } = useStore();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Sync route param to context - use useLayoutEffect for synchronous update
  useLayoutEffect(() => {
    actionsRef.current.setStore(storeId);
  }, [storeId]);

  // Validate storeId and redirect if invalid
  if (!VALID_STORE_IDS.includes(storeId)) {
    router.replace('/stores/select');
    return null;
  }
  return <AppShell storeId={storeId}>{children}</AppShell>;
}
