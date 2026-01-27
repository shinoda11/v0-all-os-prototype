'use client';

import { RoleGuard } from '@/components/RoleGuard';

interface OsLayoutProps {
  children: React.ReactNode;
}

/**
 * OS Layout - Manager View (KOS)
 * Requires 'manager' role or higher
 */
export default function OsLayout({ children }: OsLayoutProps) {
  return (
    <RoleGuard requiredRole="manager">
      {children}
    </RoleGuard>
  );
}
