'use client';

import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useStore } from '@/state/store';
import { AppShell } from '@/components/AppShell';
import { useViewMode } from '@/core/viewMode';

// Valid store IDs (hardcoded to avoid race condition with store loading)
const VALID_STORE_IDS = ['1', '2', '3', '4'];

interface StoreLayoutProps {
  children: React.ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  const params = useParams();
  const storeId = params.storeId as string;
  const router = useRouter();
  const pathname = usePathname();
  const { actions } = useStore();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const [isValidStore, setIsValidStore] = useState(true);
  const [, setViewMode] = useViewMode();

  // Sync route param to context - use useLayoutEffect for synchronous update
  useLayoutEffect(() => {
    actionsRef.current.setStore(storeId);
  }, [storeId]);

  // Sync viewMode to match current route so sidebar / header never show the wrong UI
  useEffect(() => {
    const storePrefix = `/stores/${storeId}`;
    if (pathname.startsWith(`${storePrefix}/os`)) {
      setViewMode('manager');
    } else if (pathname.startsWith(`${storePrefix}/floor`)) {
      setViewMode('staff');
    }
  }, [pathname, storeId, setViewMode]);

  // Validate storeId and redirect if invalid
  useEffect(() => {
    if (!VALID_STORE_IDS.includes(storeId)) {
      setIsValidStore(false);
      router.replace('/stores/1/os/cockpit');
    } else {
      setIsValidStore(true);
    }
  }, [storeId, router]);

  if (!isValidStore) {
    return null;
  }
  
  return (
    <AppShell storeId={storeId}>
      {children}
    </AppShell>
  );
}
