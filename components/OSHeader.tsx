'use client';

import { Badge } from '@/components/ui/badge';
import { TimeBandTabs } from '@/components/TimeBandTabs';
import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';
import type { TimeBand } from '@/core/types';
import { RefreshCw } from 'lucide-react';

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

  // Get current business date (today for now)
  const today = new Date();
  const businessDate = today.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  // Mock last updated time (would come from state in real app)
  const lastUpdated = new Date();
  const lastUpdatedStr = lastUpdated.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const shortName = currentStore?.name.replace('Aburi TORA 熟成鮨と炙り鮨 ', '') ?? '';

  return (
    <div className="space-y-4">
      {/* OS Label and Store Info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="bg-primary text-primary-foreground font-semibold">
            All OS
          </Badge>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
            {currentStore && (
              <p className="text-sm text-muted-foreground">{shortName}</p>
            )}
          </div>
        </div>

        {/* Business Date and Last Updated */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">営業日:</span>
            <span className="font-medium">{businessDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>更新: {lastUpdatedStr}</span>
          </div>
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
