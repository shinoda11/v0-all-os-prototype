'use client';

// ============================================================
// Auth Context - Mock User Authentication
// Provides current user and role-based access control
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { CurrentUser, UserRole } from '@/core/types';
import { hasRoleLevel } from '@/core/types';

// Storage keys for persisting selections
const MOCK_USER_STORAGE_KEY = 'all_os_mock_user_role';
const VIEW_MODE_STORAGE_KEY = 'all_os_view_mode';

// ------------------------------------------------------------
// Mock Users for Development
// ------------------------------------------------------------

const MOCK_USERS: Record<string, CurrentUser> = {
  manager: {
    id: 'user-1',
    name: '田中 太郎',
    role: 'manager',
    storeId: '1',
  },
  staff: {
    id: 'user-2',
    name: '鈴木 花子',
    role: 'staff',
    storeId: '1',
  },
  sv: {
    id: 'user-3',
    name: '佐藤 一郎',
    role: 'sv',
    storeId: '1',
  },
};

// ------------------------------------------------------------
// Context Types
// ------------------------------------------------------------

interface AuthContextValue {
  currentUser: CurrentUser;
  setMockUser: (role: UserRole) => void;
  canAccessManagerView: boolean;
  canAccessStaffView: boolean;
  canSwitchView: boolean;
  hasRole: (requiredRole: UserRole) => boolean;
}

// ------------------------------------------------------------
// Context Creation
// ------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ------------------------------------------------------------
// Provider Component
// ------------------------------------------------------------

interface AuthProviderProps {
  children: React.ReactNode;
  defaultRole?: UserRole;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  defaultRole = 'manager' 
}) => {
  // Initialize from localStorage if available (client-side only)
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem(MOCK_USER_STORAGE_KEY);
      if (savedRole && MOCK_USERS[savedRole]) {
        return MOCK_USERS[savedRole];
      }
    }
    return MOCK_USERS[defaultRole];
  });
  
  // Sync state with localStorage on mount (handles SSR hydration)
  useEffect(() => {
    const savedRole = localStorage.getItem(MOCK_USER_STORAGE_KEY);
    if (savedRole && MOCK_USERS[savedRole] && MOCK_USERS[savedRole].id !== currentUser.id) {
      setCurrentUser(MOCK_USERS[savedRole]);
    }
  }, []);

  const setMockUser = useCallback((role: UserRole) => {
    setCurrentUser(MOCK_USERS[role]);
    // Persist to localStorage
    localStorage.setItem(MOCK_USER_STORAGE_KEY, role);
    
    // Reset view mode based on new user's role
    const defaultViewMode = (role === 'manager' || role === 'owner' || role === 'sv') ? 'manager' : 'staff';
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, defaultViewMode);
  }, []);

  const hasRole = useCallback((requiredRole: UserRole) => {
    return hasRoleLevel(currentUser.role, requiredRole);
  }, [currentUser.role]);

  // Manager+ can access /os pages
  const canAccessManagerView = hasRole('manager');
  
  // All roles (staff+) can access /floor pages
  const canAccessStaffView = hasRole('staff');
  
  // Only manager+ can switch between views
  const canSwitchView = hasRole('manager');

  return (
    <AuthContext.Provider value={{
      currentUser,
      setMockUser,
      canAccessManagerView,
      canAccessStaffView,
      canSwitchView,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
