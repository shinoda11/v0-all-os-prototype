'use client';

import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/state/store';
import { AppShell } from '@/components/AppShell';

const VALID_STORE_IDS = ['1', '2', '3', '4'];

interface StoreLayoutProps {
  children: React.ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  const params = useParams();
  const storeId = params.storeId as string;
  const router = useRouter();
  const { actions } = useStore();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const [isValidStore, setIsValidStore] = useState(true);

  useLayoutEffect(() => {
    actionsRef.current.setStore(storeId);
  }, [storeId]);

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
