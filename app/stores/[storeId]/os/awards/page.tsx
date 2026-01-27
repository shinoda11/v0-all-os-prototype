'use client';

import { useState } from 'react';
import { OSHeader } from '@/components/OSHeader';
import { AwardsDashboard } from '@/components/os/AwardsDashboard';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { selectAwards, type Period } from '@/core/selectors';
import type { TimeBand } from '@/core/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AwardsPage() {
  const { t } = useI18n();
  const { state } = useStore();
  const [period, setPeriod] = useState<Period>('today');
  const [timeBand, setTimeBand] = useState<TimeBand>('all');
  
  const metrics = selectAwards(state, period, timeBand);
  
  const periods: { value: Period; labelKey: string }[] = [
    { value: 'today', labelKey: 'awards.period.today' },
    { value: '7d', labelKey: 'awards.period.7d' },
    { value: '4w', labelKey: 'awards.period.4w' },
  ];
  
  return (
    <div className="flex flex-col h-full">
      <OSHeader 
        title={t('awards.title')}
        timeBand={timeBand}
        onTimeBandChange={setTimeBand}
        showTimeBandTabs={true}
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Period Filter */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground mr-2">Period:</span>
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={cn(
                period === p.value && 'bg-primary text-primary-foreground'
              )}
            >
              {t(p.labelKey)}
            </Button>
          ))}
        </div>
        
        {/* Dashboard */}
        <AwardsDashboard metrics={metrics} />
      </div>
    </div>
  );
}
