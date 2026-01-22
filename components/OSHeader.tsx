'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { AskDrawer } from '@/components/AskDrawer';
import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';
import { useI18n, useLocaleDateFormat } from '@/i18n/I18nProvider';
import type { TimeBand, Proposal } from '@/core/types';
import { RefreshCw, Globe, MessageCircle } from 'lucide-react';

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
  const { state, actions } = useStore();
  const currentStore = selectCurrentStore(state);
  const { locale, setLocale, t } = useI18n();
  const { formatDate, formatTime } = useLocaleDateFormat();
  const [askDrawerOpen, setAskDrawerOpen] = useState(false);
  
  const handleAddProposal = (proposal: Proposal) => {
    actions.addProposal(proposal);
  };

  // Get current business date (today for now)
  const today = new Date();
  const businessDate = formatDate(today, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  // Mock last updated time (would come from state in real app)
  const lastUpdated = new Date();
  const lastUpdatedStr = formatTime(lastUpdated);

  const shortName = currentStore?.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '') ?? '';

  const toggleLocale = () => {
    setLocale(locale === 'ja' ? 'en' : 'ja');
  };

  return (
    <div className="space-y-4">
      {/* OS Label and Store Info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="bg-primary text-primary-foreground font-semibold">
            {t('os.header.badge')}
          </Badge>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
            {currentStore && (
              <p className="text-sm text-muted-foreground">{shortName}</p>
            )}
          </div>
        </div>

        {/* Business Date, Last Updated, and Language Toggle */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('os.header.businessDate')}:</span>
            <span className="font-medium">{businessDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('os.header.lastUpdated')}: {lastUpdatedStr}</span>
          </div>
          
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="h-7 px-2 text-xs gap-1.5"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{locale === 'ja' ? 'English' : '日本語'}</span>
          </Button>
          
          {/* Ask OS Button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setAskDrawerOpen(true)}
            className="h-7 px-3 text-xs gap-1.5"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{t('os.header.askOS')}</span>
          </Button>
        </div>
      </div>
      
      {/* Ask OS Drawer */}
      {currentStore && (
        <AskDrawer
          open={askDrawerOpen}
          onClose={() => setAskDrawerOpen(false)}
          onAddProposal={handleAddProposal}
          storeId={currentStore.id}
        />
      )}

      {/* Time Band Tabs */}
      {showTimeBandTabs && onTimeBandChange && (
        <div className="flex items-center justify-between border-b border-border pb-4">
          <TimeBandTabs value={timeBand} onChange={onTimeBandChange} />
        </div>
      )}
    </div>
  );
}
