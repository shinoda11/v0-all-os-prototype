'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { useAskPanel } from '@/components/AppShell';
import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';
import { useI18n, useLocaleDateFormat } from '@/i18n/I18nProvider';
import type { TimeBand } from '@/core/types';
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
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const { locale, setLocale, t } = useI18n();
  const { formatDate, formatTime } = useLocaleDateFormat();
  const askPanel = useAskPanel();

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
