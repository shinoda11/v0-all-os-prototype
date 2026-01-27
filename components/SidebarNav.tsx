'use client';

import React from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
  label: string;
  path?: string; // relative path without storeId prefix
  icon: React.ReactNode;
  children?: NavItem[];
  isExternal?: boolean; // For management links from OS pages
}

interface NavSection {
  title: string;
  description?: string;
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
  title: 'KOS',
  description: 'Manager',
  items: [
    {
      label: 'コックピット',
      path: '/os/cockpit',
      icon: <Gauge className="h-5 w-5" />,
    },
    {
      label: 'Weekly Review',
      path: '/os/labor-weekly',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: 'Team Performance',
      path: '/os/team-performance',
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: 'Awards',
      path: '/os/awards',
      icon: <CheckSquare className="h-5 w-5" />,
    },
  ],
};

// Ops OS section - 現場向け
const opsOsSection: NavSection = {
  title: 'Ops OS',
  description: 'Floor',
  items: [
    {
      label: 'Today Quests',
      path: '/floor/todo',
      icon: <CheckSquare className="h-5 w-5" />,
    },
    {
      label: 'Time Clock',
      path: '/floor/timeclock',
      icon: <Clock className="h-5 w-5" />,
    },
    {
      label: 'My Score',
      path: '/floor/my-score',
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ],
};

// Incidents section - レアイベント
const incidentsSection: NavSection = {
  title: 'Incidents',
  description: 'Rare Events',
  items: [
    {
      label: 'Incident Center',
      path: '/os/incidents',
      icon: <FileWarning className="h-5 w-5" />,
    },
  ],
};

const navSections: NavSection[] = [kosSection, opsOsSection, incidentsSection];

const navItems = navSections.flatMap((section) => section.items);

interface NavGroupProps {
  item: NavItem;
  pathname: string;
  storeId: string;
}

function NavGroup({ item, pathname, storeId }: NavGroupProps) {
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
        {item.label}
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
          {item.label}
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
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
}

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground/70">{description}</p>
      )}
    </div>
  );
}

interface SidebarNavProps {
  storeId: string;
}

export function SidebarNav({ storeId }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {navSections.map((section, sectionIndex) => (
        <div key={section.title} className={cn(sectionIndex > 0 && 'mt-4 pt-4 border-t border-border')}>
          <SectionHeader title={section.title} description={section.description} />
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavGroup key={item.label} item={item} pathname={pathname} storeId={storeId} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
