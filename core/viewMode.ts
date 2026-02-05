'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserRole } from '@/core/types';

export type ViewMode = 'manager' | 'staff';

const VIEW_MODE_STORAGE_KEY = 'all_os_view_mode';
const MOCK_USER_STORAGE_KEY = 'all_os_mock_user_role';

/**
 * Determine default view mode based on user role.
 * Manager+ gets 'manager' view, staff gets 'staff' view.
 */
function getDefaultViewModeForRole(role: UserRole): ViewMode {
  return role === 'manager' || role === 'owner' ? 'manager' : 'staff';
}

/**
 * Hook to manage view mode (Manager vs Staff) with localStorage persistence.
 * Automatically syncs with user role when role changes.
 * Returns the current mode and a setter function.
 */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void, boolean] {
  const [mode, setModeState] = useState<ViewMode>('staff');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount, considering user role for default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedViewMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      const storedUserRole = localStorage.getItem(MOCK_USER_STORAGE_KEY) as UserRole | null;
      
      if (storedViewMode === 'manager' || storedViewMode === 'staff') {
        // Use stored view mode if available
        setModeState(storedViewMode);
      } else if (storedUserRole) {
        // No stored view mode, default based on user role
        const defaultMode = getDefaultViewModeForRole(storedUserRole);
        setModeState(defaultMode);
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, defaultMode);
      } else {
        // Fallback to manager as default
        setModeState('manager');
      }
      setIsLoaded(true);
    }
  }, []);

  // Setter that also persists to localStorage
  const setMode = useCallback((newMode: ViewMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newMode);
    }
  }, []);

  return [mode, setMode, isLoaded];
}

/**
 * Check if the current path matches the view mode.
 * Manager paths: /os/*
 * Staff paths: /floor/*
 */
export function isPathMatchingViewMode(pathname: string, mode: ViewMode): boolean {
  const isManagerPath = pathname.includes('/os/');
  const isStaffPath = pathname.includes('/floor/');
  
  if (mode === 'manager') {
    return isManagerPath || !isStaffPath; // Allow non-floor pages for managers
  } else {
    return isStaffPath || !isManagerPath; // Allow non-os pages for staff
  }
}

/**
 * Get the mismatch type if any
 */
export function getViewModeMismatch(
  pathname: string, 
  mode: ViewMode
): 'manager-in-staff-page' | 'staff-in-manager-page' | null {
  const isManagerPath = pathname.includes('/os/');
  const isStaffPath = pathname.includes('/floor/');
  
  if (mode === 'manager' && isStaffPath) {
    return 'manager-in-staff-page';
  }
  if (mode === 'staff' && isManagerPath) {
    return 'staff-in-manager-page';
  }
  return null;
}
