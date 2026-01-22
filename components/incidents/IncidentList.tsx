'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { EmptyState } from '@/components/EmptyState';
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
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
} from 'lucide-react';

/**
 * デザインガイドライン 3.2 キューカード準拠
 * - 一行サマリー
 * - 影響度/緊急度明示
 * - 推奨アクションプレビュー
 * - 2.5タイポグラフィ: Regular/Boldの2段のみ
 */

interface IncidentListProps {
  incidents: Incident[];
  storeId: string;
}

// 2.3: 状態はアイコン+ラベル併用
const SEVERITY_CONFIG: Record<IncidentSeverity, { icon: React.ReactNode; label: string; className: string }> = {
  critical: { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    label: '緊急', 
    className: 'text-red-700 bg-red-50' 
  },
  warning: { 
    icon: <AlertCircle className="h-4 w-4" />, 
    label: '警告', 
    className: 'text-amber-700 bg-amber-50' 
  },
  info: { 
    icon: <Info className="h-4 w-4" />, 
    label: '情報', 
    className: 'text-blue-700 bg-blue-50' 
  },
};

// Status config with icons
const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: '未対応', className: 'text-red-700' },
  investigating: { label: '調査中', className: 'text-amber-700' },
  proposed: { label: '提案あり', className: 'text-blue-700' },
  executing: { label: '実行中', className: 'text-purple-700' },
  resolved: { label: '解決済', className: 'text-emerald-700' },
};

// Incident type icons
const TYPE_ICONS: Record<IncidentType, React.ReactNode> = {
  demand_drop: <TrendingDown className="h-4 w-4" />,
  labor_overrun: <DollarSign className="h-4 w-4" />,
  stockout_risk: <Package className="h-4 w-4" />,
  delivery_delay: <Truck className="h-4 w-4" />,
  ops_delay: <Clock className="h-4 w-4" />,
};

// Styles for severity, status, and agents
const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: 'bg-red-50',
  warning: 'bg-amber-50',
  info: 'bg-blue-50',
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  open: 'bg-red-50',
  investigating: 'bg-amber-50',
  proposed: 'bg-blue-50',
  executing: 'bg-purple-50',
  resolved: 'bg-emerald-50',
};

const AGENT_STYLES: Record<AgentId, string> = {
  management: 'bg-primary',
  operations: 'bg-secondary',
  marketing: 'bg-tertiary',
};

export function IncidentList({ incidents, storeId }: IncidentListProps) {
  const { t } = useI18n();

  if (incidents.length === 0) {
    return (
      <EmptyState 
        type="no_data"
        title={t('incidents.empty')}
        description="現在対応が必要なインシデントはありません"
      />
    );
  }

  // 2.1スペーシング: gap-4=16px
  return (
    <div className="space-y-4">
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
  
  const typeLabel = t(`incidents.type.${incident.type}`);
  const severityConfig = SEVERITY_CONFIG[incident.severity];
  const statusConfig = STATUS_CONFIG[incident.status];

  // 3.2: 推奨アクションプレビュー
  const recommendedAction = incident.status === 'proposed' 
    ? '提案を確認' 
    : incident.status === 'open' 
    ? '対応を開始' 
    : '詳細を確認';

  return (
    <Link href={`/stores/${storeId}/os/incidents/${incident.id}`}>
      {/* 原則3: 枠線は最小限。余白でグルーピング */}
      <div className={cn(
        'p-4 rounded border border-border bg-card transition-all hover:bg-muted/50 cursor-pointer',
        incident.severity === 'critical' && 'border-l-4 border-l-red-500'
      )}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* 3.2: 一行サマリー - タイトル + 影響度 */}
            <div className="flex items-center gap-2">
              {/* 2.3: 状態はアイコン+ラベル併用 */}
              <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-sm', severityConfig.className)}>
                {severityConfig.icon}
                {severityConfig.label}
              </span>
              <h3 className="font-bold truncate">{incident.title}</h3>
            </div>
            
            {/* Summary */}
            <p className="text-sm text-muted-foreground line-clamp-1">
              {incident.summary}
            </p>
            
            {/* Meta: Type + Status */}
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                {TYPE_ICONS[incident.type]}
                {typeLabel}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className={statusConfig.className}>{statusConfig.label}</span>
            </div>
          </div>
          
          {/* Right: 推奨アクション + 時刻 */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* 3.2: 推奨アクションプレビュー */}
            <span className="inline-flex items-center gap-1 text-sm text-primary">
              {recommendedAction}
              <ArrowRight className="h-4 w-4" />
            </span>
            
            {/* Updated time */}
            <FreshnessBadge lastUpdate={incident.updatedAt} compact />
          </div>
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
      </div>
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
