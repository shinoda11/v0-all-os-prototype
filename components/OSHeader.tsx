'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { useAskPanel } from '@/components/AppShell';
import { useStore } from '@/state/store';
import { useAuth } from '@/state/auth';
import { selectCurrentStore } from '@/core/selectors';
import { useI18n, useLocaleDateFormat } from '@/i18n/I18nProvider';
import type { TimeBand } from '@/core/types';
import { RefreshCw, Globe, MessageCircle, Users, Briefcase, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OSHeaderProps {
  title: string;
  timeBand?: TimeBand;
  onTimeBandChange?: (timeBand: TimeBand) => void;
  showTimeBandTabs?: boolean;
}

export function OSHeader({
  title,
  timeBand = 'all',
  onTimeBandChange,
  showTimeBandTabs = true,
}: OSHeaderProps) {
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const { locale, setLocale, t } = useI18n();
  const { formatDate, formatTime } = useLocaleDateFormat();
  const askPanel = useAskPanel();
  const { canSwitchView, currentUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  // Determine current view from pathname
  const isManagerView = pathname.includes('/os/');
  const currentView = isManagerView ? 'manager' : 'staff';
  
  // Handle view switch
  const handleViewSwitch = (view: 'manager' | 'staff') => {
    if (!currentStore) return;
    const storeId = currentStore.id;
    if (view === 'manager') {
      router.push(`/stores/${storeId}/os/cockpit`);
    } else {
      router.push(`/stores/${storeId}/floor/todo`);
    }
  };

  // Use stable initial date to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
  }, []);

  // Get current business date (today for now)
  const today = mounted ? new Date() : new Date('2024-01-01'); // Stable initial value
  const businessDate = formatDate(today, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  // Last updated time - only show on client to avoid hydration mismatch
  const lastUpdatedStr = mounted && currentTime ? formatTime(currentTime) : '--:--';

  const shortName = currentStore?.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '') ?? '';

  const toggleLocale = () => {
    setLocale(locale === 'ja' ? 'en' : 'ja');
  };

  return (
    <div className="space-y-4">
      {/* OS Label and Store Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="default" className="bg-primary text-primary-foreground font-semibold text-base px-3 py-1">
            {t('os.header.badge')}
          </Badge>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            {currentStore && (
              <p className="text-base text-muted-foreground">{shortName}</p>
            )}
          </div>
        </div>

        {/* Business Date, Last Updated, and Language Toggle */}
        <div className="flex items-center gap-6 text-base">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('os.header.businessDate')}:</span>
            <span className="font-medium">{businessDate}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>{t('os.header.lastUpdated')}: {lastUpdatedStr}</span>
          </div>
          
          {/* View Switcher - Only for Manager+ */}
          {canSwitchView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" className="px-3 gap-2">
                  {currentView === 'manager' ? (
                    <Briefcase className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  <span>{t(currentView === 'manager' ? 'view.manager' : 'view.staff')}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => handleViewSwitch('manager')}
                  className={currentView === 'manager' ? 'bg-accent' : ''}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  {t('view.manager')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleViewSwitch('staff')}
                  className={currentView === 'staff' ? 'bg-accent' : ''}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {t('view.staff')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="default"
            onClick={toggleLocale}
            className="px-3 gap-2"
          >
            <Globe className="h-4 w-4" />
            <span>{locale === 'ja' ? 'English' : '日本語'}</span>
          </Button>
          
          {/* Ask OS Button */}
          <Button
            variant="default"
            size="default"
            onClick={askPanel.toggle}
            className="px-4 gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{t('os.header.askOS')}</span>
          </Button>
        </div>
      </div>

      {/* Time Band Tabs */}
      {showTimeBandTabs && onTimeBandChange && (
        <div className="flex items-center justify-between border-b border-border pb-4">
          <TimeBandTabs value={timeBand} onChange={onTimeBandChange} />
        </div>
      )}
    </div>
  );
}
