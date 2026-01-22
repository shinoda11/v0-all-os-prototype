'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { useI18n } from '@/i18n/I18nProvider';
import type { Incident, IncidentSeverity, IncidentStatus, IncidentType, AgentId, TimeBand } from '@/core/types';
import { cn } from '@/lib/utils';
import { 
  ChevronRight, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Truck, 
  Clock,
  Bot,
  Users,
} from 'lucide-react';

interface IncidentListProps {
  incidents: Incident[];
  storeId: string;
}

// Severity badge styles
const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

// Status badge styles
const STATUS_STYLES: Record<IncidentStatus, string> = {
  open: 'bg-red-50 text-red-600',
  investigating: 'bg-amber-50 text-amber-600',
  proposed: 'bg-blue-50 text-blue-600',
  executing: 'bg-purple-50 text-purple-600',
  resolved: 'bg-green-50 text-green-600',
};

// Agent badge styles
const AGENT_STYLES: Record<AgentId, string> = {
  management: 'bg-indigo-100 text-indigo-700',
  plan: 'bg-cyan-100 text-cyan-700',
  ops: 'bg-orange-100 text-orange-700',
  pos: 'bg-pink-100 text-pink-700',
  supply: 'bg-emerald-100 text-emerald-700',
  hr: 'bg-violet-100 text-violet-700',
};

// Incident type icons
const TYPE_ICONS: Record<IncidentType, React.ReactNode> = {
  demand_drop: <TrendingDown className="h-4 w-4" />,
  labor_overrun: <DollarSign className="h-4 w-4" />,
  stockout_risk: <Package className="h-4 w-4" />,
  delivery_delay: <Truck className="h-4 w-4" />,
  ops_delay: <Clock className="h-4 w-4" />,
};

export function IncidentList({ incidents, storeId }: IncidentListProps) {
  const { t } = useI18n();

  if (incidents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t('incidents.empty')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} storeId={storeId} />
      ))}
    </div>
  );
}

interface IncidentCardProps {
  incident: Incident;
  storeId: string;
}

function IncidentCard({ incident, storeId }: IncidentCardProps) {
  const { t } = useI18n();
  
  const timeBandLabel = t(`timeband.${incident.timeBand}`);
  const typeLabel = t(`incidents.type.${incident.type}`);
  const severityLabel = t(`incidents.severity.${incident.severity}`);
  const statusLabel = t(`incidents.status.${incident.status}`);
  const leadAgentLabel = t(`incidents.agent.${incident.leadAgent}`);

  return (
    <Link href={`/stores/${storeId}/os/incidents/${incident.id}`}>
      <Card className={cn(
        'transition-all hover:shadow-md hover:border-primary/30 cursor-pointer',
        incident.severity === 'critical' && 'border-l-4 border-l-red-500'
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Main content */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Title row */}
              <div className="flex items-center gap-3">
                <span className={cn(
                  'shrink-0 p-2 rounded',
                  SEVERITY_STYLES[incident.severity]
                )}>
                  {TYPE_ICONS[incident.type]}
                </span>
                <h3 className="font-semibold text-lg truncate">{incident.title}</h3>
              </div>
              
              {/* Summary */}
              <p className="text-base text-muted-foreground line-clamp-1">
                {incident.summary}
              </p>
              
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Type */}
                <Badge variant="outline" className="text-base font-normal px-3 py-1">
                  {typeLabel}
                </Badge>
                
                {/* Severity */}
                <Badge className={cn('text-base font-normal border px-3 py-1', SEVERITY_STYLES[incident.severity])}>
                  {severityLabel}
                </Badge>
                
                {/* Status */}
                <Badge variant="secondary" className={cn('text-base font-normal px-3 py-1', STATUS_STYLES[incident.status])}>
                  {statusLabel}
                </Badge>
                
                {/* Time band */}
                <span className="text-base text-muted-foreground">
                  {timeBandLabel}
                </span>
              </div>
            </div>
            
            {/* Right: Agents & time */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              {/* Lead agent */}
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <Badge className={cn('text-base font-medium px-3 py-1', AGENT_STYLES[incident.leadAgent])}>
                  {leadAgentLabel}
                </Badge>
              </div>
              
              {/* Supporting agents */}
              {incident.supportingAgents.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-1">
                    {incident.supportingAgents.slice(0, 3).map((agentId) => (
                      <Badge 
                        key={agentId} 
                        variant="outline"
                        className={cn('text-sm px-2 py-0.5', AGENT_STYLES[agentId])}
                      >
                        {t(`incidents.agent.${agentId}`).slice(0, 2)}
                      </Badge>
                    ))}
                    {incident.supportingAgents.length > 3 && (
                      <span className="text-sm text-muted-foreground">
                        +{incident.supportingAgents.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Updated time */}
              <FreshnessBadge lastUpdate={incident.updatedAt} compact />
              
              {/* Arrow */}
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Utility function to sort incidents
export function sortIncidents(incidents: Incident[]): Incident[] {
  const severityOrder: Record<IncidentSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  
  return [...incidents].sort((a, b) => {
    // First by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Then by updatedAt (newest first)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

// Utility function to filter incidents
export function filterIncidents(
  incidents: Incident[],
  filter: 'all' | 'open' | 'critical' | 'management'
): Incident[] {
  switch (filter) {
    case 'open':
      return incidents.filter(i => i.status !== 'resolved');
    case 'critical':
      return incidents.filter(i => i.severity === 'critical');
    case 'management':
      return incidents.filter(i => i.leadAgent === 'management');
    default:
      return incidents;
  }
}
