'use client';

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'manager' | 'staff';

const STORAGE_KEY = 'all_os_view_mode';

/**
 * Hook to manage view mode (Manager vs Staff) with localStorage persistence.
 * Returns the current mode and a setter function.
 */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void, boolean] {
  const [mode, setModeState] = useState<ViewMode>('staff');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'manager' || stored === 'staff') {
        setModeState(stored);
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
