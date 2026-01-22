'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/state/store';
import { OSHeader } from '@/components/OSHeader';
import { IncidentDetail } from '@/components/incidents/IncidentDetail';
import { useI18n } from '@/i18n/I18nProvider';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function IncidentDetailPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const incidentId = params.incidentId as string;
  const { state } = useStore();
  const { t } = useI18n();
  
  // Find the incident
  const incident = state.incidents?.find(i => i.id === incidentId);
  
  if (!incident) {
    return (
      <div className="space-y-6">
        <OSHeader title={t('incidents.title')} showTimeBandTabs={false} />
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Incident not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <OSHeader 
        title={t('incidents.title')} 
        showTimeBandTabs={false}
      />
      <IncidentDetail incident={incident} storeId={storeId} />
    </div>
  );
}
