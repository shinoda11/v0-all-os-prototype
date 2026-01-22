'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { OSHeader } from '@/components/OSHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IncidentList, sortIncidents, filterIncidents } from '@/components/incidents/IncidentList';
import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';
import { useI18n } from '@/i18n/I18nProvider';
import type { TimeBand } from '@/core/types';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'open' | 'critical' | 'management';

const FILTERS: { key: FilterType; labelKey: string }[] = [
  { key: 'all', labelKey: 'incidents.filter.all' },
  { key: 'open', labelKey: 'incidents.filter.open' },
  { key: 'critical', labelKey: 'incidents.filter.critical' },
  { key: 'management', labelKey: 'incidents.filter.management' },
];

export default function IncidentsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { t } = useI18n();
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  
  const [timeBand, setTimeBand] = useState<TimeBand>('all');
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Get incidents from state
  const incidents = state.incidents || [];
  
  // Filter by time band
  const timeBandFiltered = useMemo(() => {
    if (timeBand === 'all') return incidents;
    return incidents.filter(i => i.timeBand === timeBand);
  }, [incidents, timeBand]);
  
  // Apply filter and sort
  const displayedIncidents = useMemo(() => {
    const filtered = filterIncidents(timeBandFiltered, filter);
    return sortIncidents(filtered);
  }, [timeBandFiltered, filter]);
  
  // Count by filter
  const counts = useMemo(() => ({
    all: timeBandFiltered.length,
    open: timeBandFiltered.filter(i => i.status !== 'resolved').length,
    critical: timeBandFiltered.filter(i => i.severity === 'critical').length,
    management: timeBandFiltered.filter(i => i.leadAgent === 'management').length,
  }), [timeBandFiltered]);
  
  const shortName = currentStore?.shortName || storeId;

  return (
    <div className="space-y-6">
      {/* OS Header */}
      <OSHeader
        title={t('incidents.title')}
        timeBand={timeBand}
        onTimeBandChange={setTimeBand}
        showTimeBandTabs={false}
      />
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader 
          title={t('incidents.title')} 
          subtitle={shortName}
        />
        
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, labelKey }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(key)}
              className={cn(
                'gap-1.5',
                filter !== key && 'bg-transparent'
              )}
            >
              {t(labelKey)}
              <Badge 
                variant="secondary" 
                className={cn(
                  'ml-1 text-[10px] px-1.5 py-0',
                  filter === key ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                )}
              >
                {counts[key]}
              </Badge>
            </Button>
          ))}
        </div>
      </div>
      
      {/* Time band tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['all', 'lunch', 'idle', 'dinner'] as TimeBand[]).map((tb) => (
          <Button
            key={tb}
            variant="ghost"
            size="sm"
            onClick={() => setTimeBand(tb)}
            className={cn(
              'text-xs',
              timeBand === tb && 'bg-muted font-medium'
            )}
          >
            {t(`timeband.${tb}`)}
          </Button>
        ))}
      </div>
      
      {/* Incident List */}
      <IncidentList incidents={displayedIncidents} storeId={storeId} />
    </div>
  );
}
