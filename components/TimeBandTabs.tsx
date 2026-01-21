'use client';

import { TimeBand } from '@/core/types';
import { cn } from '@/lib/utils';

interface TimeBandTabsProps {
  value: TimeBand;
  onChange: (value: TimeBand) => void;
}

const timeBands: { value: TimeBand; label: string }[] = [
  { value: 'all', label: '全日' },
  { value: 'lunch', label: 'ランチ' },
  { value: 'idle', label: 'アイドル' },
  { value: 'dinner', label: 'ディナー' },
];

export function TimeBandTabs({ value, onChange }: TimeBandTabsProps) {
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
          {band.label}
        </button>
      ))}
    </div>
  );
}
