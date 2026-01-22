'use client';

import React, { useState, createContext, useContext } from 'react';
import { SidebarNav } from './SidebarNav';
import { HeaderBar } from './HeaderBar';
import { AskDrawer } from './AskDrawer';
import { useStore } from '@/state/store';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// Context for Ask Panel state
interface AskPanelContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const AskPanelContext = createContext<AskPanelContextValue | null>(null);

export function useAskPanel() {
  const context = useContext(AskPanelContext);
  if (!context) {
    throw new Error('useAskPanel must be used within AppShell');
  }
  return context;
}

interface AppShellProps {
  storeId: string;
  children: React.ReactNode;
}

export function AppShell({ storeId, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [askPanelOpen, setAskPanelOpen] = useState(false);
  const { actions } = useStore();
  
  const askPanelContext: AskPanelContextValue = {
    isOpen: askPanelOpen,
    open: () => setAskPanelOpen(true),
    close: () => setAskPanelOpen(false),
    toggle: () => setAskPanelOpen(prev => !prev),
  };
  
  const handleAddProposal = (proposal: any) => {
    actions.addProposal(proposal);
  };

  return (
    <AskPanelContext.Provider value={askPanelContext}>
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

          {/* Main content - shrinks when Ask Panel is open */}
          <main className={cn(
            'flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6 transition-all duration-300',
            askPanelOpen && 'lg:mr-[400px]'
          )}>
            {children}
          </main>
          
          {/* Ask Panel - slides in from right */}
          <aside className={cn(
            'fixed top-14 right-0 bottom-0 w-[400px] transform transition-transform duration-300 ease-in-out z-30',
            askPanelOpen ? 'translate-x-0' : 'translate-x-full'
          )}>
            <AskDrawer
              open={askPanelOpen}
              onClose={() => setAskPanelOpen(false)}
              onAddProposal={handleAddProposal}
              storeId={storeId}
            />
          </aside>
        </div>
      </div>
    </AskPanelContext.Provider>
  );
}
