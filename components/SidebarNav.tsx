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

// Management section - 計画・マスター・分析
const managementSection: NavSection = {
  title: 'Management',
  description: '計画・マスター・分析',
  items: [
    {
      label: '売上管理',
      icon: <TrendingUp className="h-4 w-4" />,
      children: [
        {
          label: '売上予測入力',
          path: '/food-service/stores/sales-forecast',
          icon: <BarChart3 className="h-4 w-4" />,
        },
      ],
    },
    {
      label: '分析・レポート',
      icon: <BarChart3 className="h-4 w-4" />,
      children: [
        {
          label: '日別売上分析',
          path: '/food-service/stores/analytics/daily-sales',
          icon: <TrendingUp className="h-4 w-4" />,
        },
      ],
    },
    {
      label: 'メニュー',
      icon: <UtensilsCrossed className="h-4 w-4" />,
      children: [
        {
          label: 'メニュー管理',
          path: '/menu',
          icon: <UtensilsCrossed className="h-4 w-4" />,
        },
      ],
    },
    {
      label: '仕込み',
      icon: <ChefHat className="h-4 w-4" />,
      children: [
        {
          label: '仕込み管理',
          path: '/prep',
          icon: <ChefHat className="h-4 w-4" />,
        },
      ],
    },
  ],
};

// OS section - 運用・意思決定
const osSection: NavSection = {
  title: 'All OS',
  description: '運用・意思決定',
  items: [
    {
      label: '運用コックピット',
      path: '/os/cockpit',
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      label: '例外センター',
      path: '/os/exceptions',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      label: '週次労務レビュー',
      path: '/os/labor-weekly',
      icon: <Clock className="h-4 w-4" />,
    },
  ],
};

// Floor section - 現場実行
const floorSection: NavSection = {
  title: 'Floor',
  description: '現場実行',
  items: [
    {
      label: '現場ToDo',
      path: '/floor/todo',
      icon: <CheckSquare className="h-4 w-4" />,
    },
    {
      label: '勤怠',
      path: '/floor/timeclock',
      icon: <Clock className="h-4 w-4" />,
    },
  ],
};

const navSections: NavSection[] = [osSection, floorSection, managementSection];

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
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <div className="ml-4 space-y-1 border-l border-border pl-3">
          {item.children.map((child) => {
            const childHref = buildHref(child.path);
            return (
              <Link
                key={child.label}
                href={childHref}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
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
    <div className="px-3 py-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {description && (
        <p className="text-[10px] text-muted-foreground/70">{description}</p>
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
