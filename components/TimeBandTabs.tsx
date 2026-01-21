'use client';

import { TimeBand } from '@/core/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';

interface TimeBandTabsProps {
  value: TimeBand;
  onChange: (value: TimeBand) => void;
}

const timeBands: { value: TimeBand; labelKey: string }[] = [
  { value: 'all', labelKey: 'timeband.all' },
  { value: 'lunch', labelKey: 'timeband.lunch' },
  { value: 'idle', labelKey: 'timeband.idle' },
  { value: 'dinner', labelKey: 'timeband.dinner' },
];

export function TimeBandTabs({ value, onChange }: TimeBandTabsProps) {
  const { t } = useI18n();
  
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1">
      {timeBands.map((band) => (
        <button
          key={band.value}
          onClick={() => onChange(band.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === band.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t(band.labelKey)}
        </button>
      ))}
    </div>
  );
}
