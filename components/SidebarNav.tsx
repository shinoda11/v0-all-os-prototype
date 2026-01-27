'use client';

import React from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';
import {
  BarChart3,
  TrendingUp,
  UtensilsCrossed,
  ChefHat,
  Gauge,
  AlertTriangle,
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronRight,
  Settings,
  ExternalLink,
  FileWarning,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  labelKey: string; // i18n key
  path?: string; // relative path without storeId prefix
  icon: React.ReactNode;
  children?: NavItem[];
  isExternal?: boolean; // For management links from OS pages
}

interface NavSection {
  titleKey: string; // i18n key
  descriptionKey?: string; // i18n key
  items: NavItem[];
}

/**
 * Navigation Structure (KOS / Ops OS / Incidents)
 * 
 * KOS (Manager): Cockpit, Weekly Review, Team Performance, Awards
 * Ops OS (Floor): Today Quests, Time Clock, My Score
 * Incidents: Incident Center (rare events)
 */

// KOS section - 店長・経営向け
const kosSection: NavSection = {
  titleKey: 'nav.kos',
  descriptionKey: 'nav.kosDesc',
  items: [
    {
      labelKey: 'nav.cockpit',
      path: '/os/cockpit',
      icon: <Gauge className="h-5 w-5" />,
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
      icon: <CheckSquare className="h-5 w-5" />,
    },
  ],
};

// Ops OS section - 現場向け
const opsOsSection: NavSection = {
  titleKey: 'nav.opsOs',
  descriptionKey: 'nav.opsOsDesc',
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

// Incidents section - レアイベント
const incidentsSection: NavSection = {
  titleKey: 'nav.incidents',
  descriptionKey: 'nav.incidentsDesc',
  items: [
    {
      labelKey: 'nav.incidentCenter',
      path: '/os/incidents',
      icon: <FileWarning className="h-5 w-5" />,
    },
  ],
};

const navSections: NavSection[] = [kosSection, opsOsSection, incidentsSection];

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
                key={child.label}
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

  return (
    <nav className="flex flex-col gap-1 p-2">
      {navSections.map((section, sectionIndex) => (
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
