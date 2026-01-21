'use client';

import React from "react";
import { useState } from 'react';
import { SidebarNav } from './SidebarNav';
import { HeaderBar } from './HeaderBar';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface AppShellProps {
  storeId: string;
  children: React.ReactNode;
}

export function AppShell({ storeId, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <HeaderBar storeId={storeId} onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
            <span className="font-semibold">メニュー</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-full overflow-y-auto pt-4 lg:pt-0">
            <SidebarNav storeId={storeId} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
