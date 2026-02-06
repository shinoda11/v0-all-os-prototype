'use client';

import React from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/state/auth';
import { useViewMode, type ViewMode } from '@/core/viewMode';
import type { UserRole } from '@/core/types';
import {
  BarChart3,
  TrendingUp,
  Gauge,
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronRight,
  FileWarning,
  Users,
  ClipboardList,
  BookOpen,
  Trophy,
  CalendarCheck,
  Settings2,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  labelKey: string; // i18n key
  path?: string; // relative path without storeId prefix
  icon: React.ReactNode;
  children?: NavItem[];
  isExternal?: boolean; // For management links from OS pages
  requiredRole?: UserRole; // Minimum role required to see this item
}

interface NavSection {
  titleKey: string; // i18n key
  descriptionKey?: string; // i18n key
  items: NavItem[];
  requiredRole?: UserRole; // Minimum role required to see this section
  viewMode?: ViewMode; // Which view mode this section belongs to
}

/**
 * Navigation Structure (KOS / Ops OS)
 * 
 * KOS (Manager): Cockpit, Daily Plan, Ops Monitor, Live Staff,
 *   Weekly Review, Team Performance, Awards, Incident Center
 * Ops OS (Staff): Today Quests, Time Clock, My Score
 */

// Setup section - Task/Plan configuration (Manager+)
const setupSection: NavSection = {
  titleKey: 'nav.setup',
  descriptionKey: 'nav.setupDesc',
  requiredRole: 'manager',
  viewMode: 'manager',
  items: [
    {
      labelKey: 'nav.taskCatalog',
      path: '/os/task-catalog',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.taskStudio',
      path: '/os/task-studio',
      icon: <Wrench className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.planning',
      path: '/os/planning',
      icon: <CalendarCheck className="h-5 w-5" />,
    },
  ],
};

// KOS section - 店長・経営向け (Manager+)
const kosSection: NavSection = {
  titleKey: 'nav.kos',
  descriptionKey: 'nav.kosDesc',
  requiredRole: 'manager',
  viewMode: 'manager',
  items: [
    {
      labelKey: 'nav.cockpit',
      path: '/os/cockpit',
      icon: <Gauge className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.opsMonitor',
      path: '/os/ops-monitor',
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.liveStaff',
      path: '/os/live-staff',
      icon: <Users className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.weeklyReview',
      path: '/os/weekly-review',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.teamPerformance',
      path: '/os/team-performance',
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.awards',
      path: '/os/awards',
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.incidentCenter',
      path: '/os/incidents',
      icon: <FileWarning className="h-5 w-5" />,
    },
  ],
};

// Ops OS section - 現場向け (All roles)
const opsOsSection: NavSection = {
  titleKey: 'nav.opsOs',
  descriptionKey: 'nav.opsOsDesc',
  requiredRole: 'staff',
  viewMode: 'staff',
  items: [
    {
      labelKey: 'nav.todayQuests',
      path: '/floor/todo',
      icon: <CheckSquare className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.timeClock',
      path: '/floor/timeclock',
      icon: <Clock className="h-5 w-5" />,
    },
    {
      labelKey: 'nav.myScore',
      path: '/floor/my-score',
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ],
};

const navSections: NavSection[] = [setupSection, kosSection, opsOsSection];

interface NavGroupProps {
  item: NavItem;
  pathname: string;
  storeId: string;
  t: (key: string) => string;
}

function NavGroup({ item, pathname, storeId, t }: NavGroupProps) {
  const buildHref = (path: string | undefined) => {
    if (!path || path === '#') return '#';
    return `/stores/${storeId}${path}`;
  };

  const isActive = (path: string | undefined) => {
    if (!path || path === '#') return false;
    const fullPath = buildHref(path);
    return pathname === fullPath;
  };

  const hasActiveChild = item.children?.some((child) => isActive(child.path));
  const [isOpen, setIsOpen] = useState(hasActiveChild || false);

  if (!item.children) {
    const href = buildHref(item.path);
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors',
          isActive(item.path)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {item.icon}
        {t(item.labelKey)}
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors',
          hasActiveChild
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <span className="flex items-center gap-3">
          {item.icon}
          {t(item.labelKey)}
        </span>
        {isOpen ? (
          <ChevronDown className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
      </button>
      {isOpen && (
        <div className="ml-4 space-y-1 border-l border-border pl-4">
          {item.children.map((child) => {
            const childHref = buildHref(child.path);
            return (
              <Link
                key={child.labelKey}
                href={childHref}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-base transition-colors',
                  isActive(child.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {child.icon}
                {t(child.labelKey)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarNavProps {
  storeId: string;
}

export function SidebarNav({ storeId }: SidebarNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { hasRole } = useAuth();
  const [viewMode, , viewModeLoaded] = useViewMode();

  // Show nothing until viewMode is loaded from localStorage to prevent flash
  if (!viewModeLoaded) {
    return (
      <nav className="flex flex-col gap-1 p-2">
        {/* Skeleton placeholders while loading */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </nav>
    );
  }

  // Filter sections based on user role AND view mode
  const visibleSections = navSections.filter(section => {
    // Check role requirement
    const hasRequiredRole = !section.requiredRole || hasRole(section.requiredRole);
    // Check view mode - if section has a viewMode, it must match current viewMode
    const matchesViewMode = !section.viewMode || section.viewMode === viewMode;
    return hasRequiredRole && matchesViewMode;
  });

  return (
    <nav className="flex flex-col gap-1 p-2">
      {visibleSections.map((section, sectionIndex) => (
        <div key={section.titleKey} className={cn(sectionIndex > 0 && 'mt-4 pt-4 border-t border-border')}>
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t(section.titleKey)}
            </h3>
            {section.descriptionKey && (
              <p className="text-sm text-muted-foreground/70">{t(section.descriptionKey)}</p>
            )}
          </div>
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavGroup key={item.labelKey} item={item} pathname={pathname} storeId={storeId} t={t} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
