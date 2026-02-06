'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Legacy /os/plan route - redirects to /os/plan-builder
 * The Plan Builder (Box Template based) is the single source of quest generation.
 */
export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;

  useEffect(() => {
    router.replace(`/stores/${storeId}/os/plan-builder`);
  }, [router, storeId]);

  return null;
}
