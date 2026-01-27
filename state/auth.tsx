'use client';

// ============================================================
// Auth Context - Mock User Authentication
// Provides current user and role-based access control
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CurrentUser, UserRole } from '@/core/types';
import { hasRoleLevel } from '@/core/types';

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
  const [currentUser, setCurrentUser] = useState<CurrentUser>(MOCK_USERS[defaultRole]);

  const setMockUser = useCallback((role: UserRole) => {
    setCurrentUser(MOCK_USERS[role]);
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
