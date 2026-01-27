'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/state/auth';
import type { UserRole } from '@/core/types';

interface RoleGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
}

/**
 * RoleGuard - Protects routes based on user role
 * Redirects to /forbidden if user doesn't have required role
 */
export function RoleGuard({ requiredRole, children }: RoleGuardProps) {
  const { hasRole } = useAuth();
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;

  const hasAccess = hasRole(requiredRole);

  useEffect(() => {
    if (!hasAccess) {
      router.replace(`/stores/${storeId}/forbidden`);
    }
  }, [hasAccess, router, storeId]);

  // Show nothing while redirecting
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
