'use client';

import { RoleGuard } from '@/components/RoleGuard';

interface FloorLayoutProps {
  children: React.ReactNode;
}

/**
 * Floor Layout - Staff View (Ops OS)
 * Requires 'staff' role or higher (all roles can access)
 */
export default function FloorLayout({ children }: FloorLayoutProps) {
  return (
    <RoleGuard requiredRole="staff">
      {children}
    </RoleGuard>
  );
}
