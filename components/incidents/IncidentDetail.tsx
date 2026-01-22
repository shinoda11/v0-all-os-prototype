'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { AgentOutputPanel } from './AgentOutputPanel';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import type { 
  Incident, 
  IncidentSeverity, 
  IncidentStatus, 
  AgentId,
  EvidenceItem,
  Hypothesis,
  RecommendationDraft,
  Proposal,
} from '@/core/types';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft,
  Bot,
  Users,
  Copy,
  Check,
  Plus,
  Lightbulb,
  BarChart3,
  Target,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface IncidentDetailProps {
  incident: Incident;
  storeId: string;
}

// Reuse styles from IncidentList
const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  open: 'bg-red-50 text-red-600',
  investigating: 'bg-amber-50 text-amber-600',
  proposed: 'bg-blue-50 text-blue-600',
  executing: 'bg-purple-50 text-purple-600',
  resolved: 'bg-green-50 text-green-600',
};

const AGENT_STYLES: Record<AgentId, string> = {
  management: 'bg-indigo-100 text-indigo-700',
  plan: 'bg-cyan-100 text-cyan-700',
  ops: 'bg-orange-100 text-orange-700',
  pos: 'bg-pink-100 text-pink-700',
  supply: 'bg-emerald-100 text-emerald-700',
  hr: 'bg-violet-100 text-violet-700',
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  mid: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

export function IncidentDetail({ incident, storeId }: IncidentDetailProps) {
  const { t, locale } = useI18n();
  const { actions } = useStore();
  const [briefCopied, setBriefCopied] = useState(false);
  const [addedDrafts, setAddedDrafts] = useState<Set<string>>(new Set());
  const [agentOutputsExpanded, setAgentOutputsExpanded] = useState(false);

  // Generate brief text for clipboard
  const generateBrief = (): string => {
    const lines: string[] = [];
    
    // Title
    lines.push(t('incidents.brief.title').replace('{title}', incident.title));
    lines.push('');
    
    // Conclusion
    lines.push(`■ ${t('incidents.brief.conclusion')}`);
    lines.push(incident.summary);
    lines.push('');
    
    // Facts
    lines.push(`■ ${t('incidents.brief.facts')}`);
    incident.evidence.forEach((ev, idx) => {
      lines.push(`${idx + 1}. ${ev.label}: ${ev.value}${ev.period ? ` (${ev.period})` : ''}`);
    });
    lines.push('');
    
    // Hypotheses
    lines.push(`■ ${t('incidents.brief.hypotheses')}`);
    incident.hypotheses.slice(0, 3).forEach((hyp, idx) => {
      const confLabel = t(`incidents.detail.confidence.${hyp.confidence}`);
      lines.push(`${idx + 1}. ${hyp.title} [${confLabel}]`);
      lines.push(`   ${hyp.rationale}`);
    });
    lines.push('');
    
    // Actions
    lines.push(`■ ${t('incidents.brief.actions')}`);
    incident.recommendationDrafts.slice(0, 3).forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${rec.title}`);
      lines.push(`   ${t('incidents.detail.expectedEffect')}: ${rec.expectedEffect.description || `${rec.expectedEffect.value}${rec.expectedEffect.unit}`}`);
      lines.push(`   ${t('incidents.detail.deadline')}: ${rec.deadline}`);
    });
    lines.push('');
    
    // Monitoring
    lines.push(`■ ${t('incidents.brief.monitoring')}`);
    lines.push(t('incidents.brief.closeCondition'));
    lines.push(`- ${t('incidents.brief.kpiRecovery')}`);
    lines.push(`- ${t('incidents.brief.proposalExecuted')}`);
    
    return lines.join('\n');
  };

  const handleCopyBrief = async () => {
    const brief = generateBrief();
    await navigator.clipboard.writeText(brief);
    setBriefCopied(true);
    setTimeout(() => setBriefCopied(false), 2000);
  };

  const handleAddToQueue = (draft: RecommendationDraft) => {
    // Convert draft to proposal
    const proposal: Proposal = {
      id: `proposal-${Date.now()}-${draft.id}`,
      storeId,
      businessDate: incident.businessDate,
      type: draft.type,
      title: draft.title,
      description: draft.reason,
      reason: draft.reason,
      expectedEffect: draft.expectedEffect,
      targetMenuId: undefined,
      targetPrepId: undefined,
      deadline: draft.deadline,
      distributeToRoles: draft.distributedToRoles,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    
    actions.addProposal(proposal);
    setAddedDrafts(prev => new Set(prev).add(draft.id));
  };

  const typeLabel = t(`incidents.type.${incident.type}`);
  const severityLabel = t(`incidents.severity.${incident.severity}`);
  const statusLabel = t(`incidents.status.${incident.status}`);
  const leadAgentLabel = t(`incidents.agent.${incident.leadAgent}`);
  const timeBandLabel = t(`timeband.${incident.timeBand}`);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link 
        href={`/stores/${storeId}/os/incidents`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('incidents.detail.backToList')}
      </Link>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Title and meta */}
            <div className="space-y-3">
              <h1 className="text-xl font-bold">{incident.title}</h1>
              <p className="text-muted-foreground">{incident.summary}</p>
              
              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{typeLabel}</Badge>
                <Badge className={cn('border', SEVERITY_STYLES[incident.severity])}>
                  {severityLabel}
                </Badge>
                <Badge variant="secondary" className={STATUS_STYLES[incident.status]}>
                  {statusLabel}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {incident.businessDate} / {timeBandLabel}
                </span>
                <FreshnessBadge lastUpdate={incident.updatedAt} />
              </div>
              
              {/* Agents */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('incidents.leadAgent')}:</span>
                  <Badge className={AGENT_STYLES[incident.leadAgent]}>{leadAgentLabel}</Badge>
                </div>
                {incident.supportingAgents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('incidents.supportingAgents')}:</span>
                    <div className="flex gap-1">
                      {incident.supportingAgents.map(agentId => (
                        <Badge key={agentId} variant="outline" className={AGENT_STYLES[agentId]}>
                          {t(`incidents.agent.${agentId}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: CTAs */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleCopyBrief}
                className="gap-2 bg-transparent"
              >
                {briefCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    {t('incidents.detail.briefCopied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {t('incidents.detail.copyBrief')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Evidence & Hypotheses */}
        <div className="space-y-6">
          {/* Evidence Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t('incidents.detail.evidenceSection')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {incident.evidence.map((ev) => (
                <EvidenceCard key={ev.id} evidence={ev} />
              ))}
            </CardContent>
          </Card>

          {/* Hypotheses Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                {t('incidents.detail.hypothesesSection')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {incident.hypotheses.map((hyp, idx) => (
                <HypothesisCard 
                  key={hyp.id} 
                  hypothesis={hyp} 
                  rank={idx + 1}
                  evidence={incident.evidence}
                />
              ))}
            </CardContent>
          </Card>

          {/* Supporting Agent Outputs (Collapsible) */}
          <Card>
            <CardHeader className="pb-3">
              <button
                onClick={() => setAgentOutputsExpanded(!agentOutputsExpanded)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t('incidents.detail.agentOutputs')}
                </CardTitle>
                {agentOutputsExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {agentOutputsExpanded && (
              <CardContent>
                <AgentOutputPanel 
                  leadAgent={incident.leadAgent}
                  supportingAgents={incident.supportingAgents}
                  evidence={incident.evidence}
                />
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column: Recommendations */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                {t('incidents.detail.recommendationsSection')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incident.recommendationDrafts.map((draft, idx) => (
                <RecommendationCard
                  key={draft.id}
                  draft={draft}
                  index={idx}
                  isAdded={addedDrafts.has(draft.id)}
                  onAddToQueue={() => handleAddToQueue(draft)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Evidence Card Component
function EvidenceCard({ evidence }: { evidence: EvidenceItem }) {
  const { t } = useI18n();
  
  return (
    <div className="p-3 bg-muted/40 rounded-lg space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{evidence.label}</span>
        <span className="font-semibold">{evidence.value}</span>
      </div>
      {evidence.period && (
        <div className="text-xs text-muted-foreground">
          {t('incidents.detail.period')}: {evidence.period}
        </div>
      )}
      {evidence.sourceEventIds.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          {t('incidents.detail.sourceEvents')}: {evidence.sourceEventIds.join(', ')}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/60">
          {t('incidents.detail.noSourceEvents')}
        </div>
      )}
    </div>
  );
}

// Hypothesis Card Component
function HypothesisCard({ 
  hypothesis, 
  rank,
  evidence 
}: { 
  hypothesis: Hypothesis; 
  rank: number;
  evidence: EvidenceItem[];
}) {
  const { t } = useI18n();
  
  const referencedEvidence = evidence.filter(ev => 
    hypothesis.evidenceRefs.includes(ev.id)
  );
  
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
          <span className="font-medium">{hypothesis.title}</span>
        </div>
        <Badge className={cn('text-xs shrink-0', CONFIDENCE_STYLES[hypothesis.confidence])}>
          {t(`incidents.detail.confidence.${hypothesis.confidence}`)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{hypothesis.rationale}</p>
      {referencedEvidence.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          <span className="text-xs text-muted-foreground">{t('incidents.detail.evidenceRef')}:</span>
          {referencedEvidence.map(ev => (
            <Badge key={ev.id} variant="outline" className="text-xs">
              {ev.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({
  draft,
  index,
  isAdded,
  onAddToQueue,
}: {
  draft: RecommendationDraft;
  index: number;
  isAdded: boolean;
  onAddToQueue: () => void;
}) {
  const { t } = useI18n();
  
  // Map index to priority label (売上優先 / ロス優先 / オペ優先)
  const priorityLabels = ['Sales Priority', 'Loss Priority', 'Ops Priority'];
  const priorityColors = [
    'border-l-green-500 bg-green-50/30',
    'border-l-amber-500 bg-amber-50/30',
    'border-l-blue-500 bg-blue-50/30',
  ];
  
  return (
    <div className={cn(
      'p-4 border rounded-lg border-l-4 space-y-3',
      priorityColors[index % 3]
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {priorityLabels[index % 3]}
          </div>
          <h4 className="font-medium">{draft.title}</h4>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">{draft.reason}</p>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">{t('incidents.detail.expectedEffect')}:</span>
          <div className="font-medium">
            {draft.expectedEffect.description || `${draft.expectedEffect.value}${draft.expectedEffect.unit}`}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">{t('incidents.detail.scope')}:</span>
          <div className="font-medium">{draft.scope}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{t('incidents.detail.deadline')}:</span>
          <span className="font-medium">{draft.deadline}</span>
        </div>
        
        <Button
          size="sm"
          onClick={onAddToQueue}
          disabled={isAdded}
          className="gap-1.5"
        >
          {isAdded ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              {t('incidents.detail.addToQueue')}
            </>
          )}
        </Button>
      </div>
      
      {draft.distributedToRoles.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          {t('incidents.detail.distributedTo')}: {draft.distributedToRoles.join(', ')}
        </div>
      )}
    </div>
  );
}
