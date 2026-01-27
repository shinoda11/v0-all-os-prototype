'use client';

import { useStore } from '@/state/store';
import { useAuth } from '@/state/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Store, Menu, User, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import type { UserRole } from '@/core/types';

interface HeaderBarProps {
  storeId: string;
  onMenuClick?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'Staff',
  manager: 'Manager',
  sv: 'SV',
};

const ROLE_COLORS: Record<UserRole, string> = {
  staff: 'bg-blue-100 text-blue-800',
  manager: 'bg-emerald-100 text-emerald-800',
  sv: 'bg-purple-100 text-purple-800',
};

export function HeaderBar({ storeId, onMenuClick }: HeaderBarProps) {
  const { state } = useStore();
  const { currentUser, setMockUser } = useAuth();
  const currentStore = state.stores.find((s) => s.id === storeId);

  // Short name for display
  const shortName = currentStore?.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '') ?? '';

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">メニューを開く</span>
        </Button>
        <Link href={`/stores/${storeId}/os/cockpit`} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">AT</span>
          </div>
          <span className="hidden font-semibold sm:inline-block">Aburi TORA</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {currentStore && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium">
            <Store className="h-4 w-4" />
            {shortName}
          </div>
        )}
        
        {/* Mock User Switcher (for testing) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{currentUser.name}</span>
              <Badge variant="outline" className={ROLE_COLORS[currentUser.role]}>
                {ROLE_LABELS[currentUser.role]}
              </Badge>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Mock User (テスト用)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setMockUser('sv')}
              className={currentUser.role === 'sv' ? 'bg-accent' : ''}
            >
              <Badge className={`mr-2 ${ROLE_COLORS.sv}`}>SV</Badge>
              佐藤 一郎
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setMockUser('manager')}
              className={currentUser.role === 'manager' ? 'bg-accent' : ''}
            >
              <Badge className={`mr-2 ${ROLE_COLORS.manager}`}>Manager</Badge>
              田中 太郎
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setMockUser('staff')}
              className={currentUser.role === 'staff' ? 'bg-accent' : ''}
            >
              <Badge className={`mr-2 ${ROLE_COLORS.staff}`}>Staff</Badge>
              鈴木 花子
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
