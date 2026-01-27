'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { 
  selectExceptions,
  selectLaborMetrics,
  selectDailySalesMetrics,
  selectTodayKeyIncidents,
  selectCriticalIncidents,
  selectIncidentByMenuName,
  selectTodoStats,
  selectTeamDailyScore,
} from '@/core/selectors';
import { detectDemandDrops, deriveLaborGuardrailSummary, type DemandDropDetectionResult, type LaborGuardrailInput } from '@/core/derive';
import type { Proposal, ExceptionItem, DemandDropMeta, Incident } from '@/core/types';
import { 
  Send, 
  TrendingDown, 
  DollarSign, 
  Target,
  Lightbulb,
  FileText,
  ChevronRight,
  Sparkles,
  BarChart3,
  X,
  FileWarning,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Message types
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Assistant-specific fields
  conclusion?: string;
  evidence?: Array<{ label: string; value: string; link?: string }>;
  confidence?: 'high' | 'medium' | 'low';
  relatedExceptionId?: string;
  // Incident link - always guide to incident detail for evidence
  relatedIncidentId?: string;
  incidentLink?: string;
  canCreateIncident?: boolean;
  incidentCreateParams?: {
    menuName?: string;
    dropRate?: number;
    title: string;
    summary: string;
  };
  // Legacy proposal (now redirects to incident)
  canCreateProposal?: boolean;
  proposalData?: Partial<Proposal>;
}

// Question chip type
interface QuestionChip {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  handler: () => Message;
}

// Confidence colors
const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
};

interface AskDrawerProps {
  open: boolean;
  onClose: () => void;
  onAddProposal: (proposal: Proposal) => void;
  storeId: string;
}

export function AskDrawer({ open, onClose, onAddProposal, storeId }: AskDrawerProps) {
  const { t, locale } = useI18n();
  const { state, actions } = useStore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Get current data
  const exceptions = selectExceptions(state);
  const laborMetrics = selectLaborMetrics(state);
  const today = new Date().toISOString().split('T')[0];
  const salesMetrics = selectDailySalesMetrics(state, today);
  
  // Get incidents
  const todayIncidents = selectTodayKeyIncidents(state);
  const criticalIncidents = selectCriticalIncidents(state);
  
  // Calculate labor guardrail summary
  const dayOfWeek = new Date().getDay();
  const dayType: 'weekday' | 'weekend' = dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';
  const laborGuardrailInput: LaborGuardrailInput = {
    businessDate: today,
    dayType,
    forecastSalesDaily: salesMetrics.forecastSales,
    runRateSalesDaily: salesMetrics.actualSales > 0 ? salesMetrics.actualSales * (24 / new Date().getHours() || 1) : salesMetrics.forecastSales,
    plannedLaborCostDaily: laborMetrics.laborCostEstimate * 1.2, // Estimate full day
    actualLaborCostSoFar: laborMetrics.laborCostEstimate,
  };
  const laborRateStatus = deriveLaborGuardrailSummary(laborGuardrailInput);
  
  // Get demand drops
  const demandDrops = detectDemandDrops(storeId);
  
  // Get todo stats and team score
  const todoStats = selectTodoStats(state);
  const teamScore = selectTeamDailyScore(state);
  
  // Removed debug logs
  
  // Generate unique message ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  // Handler for "Today's projected outcome"
  const handleTodayProjection = useCallback((): Message => {
    const forecast = salesMetrics.forecastSales;
    const actual = salesMetrics.actualSales;
    const achievementRate = salesMetrics.achievementRate;
    const hourOfDay = new Date().getHours();
    // Project EOD based on current run rate
    const projectedEOD = hourOfDay > 10 ? Math.round(actual * (24 / hourOfDay)) : forecast;
    
    // Determine confidence based on data freshness and variance
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (hourOfDay >= 18) confidence = 'high';
    else if (hourOfDay >= 14) confidence = 'medium';
    else confidence = 'low';
    
    const conclusionText = achievementRate >= 100
      ? t('ask.projection.conclusionGood', { rate: achievementRate.toFixed(1) })
      : t('ask.projection.conclusionBehind', { rate: achievementRate.toFixed(1), gap: Math.round(forecast - actual).toLocaleString() });
    
    return {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: conclusionText,
      evidence: [
        { label: t('ask.projection.forecast'), value: `¥${forecast.toLocaleString()}` },
        { label: t('ask.projection.actual'), value: `¥${actual.toLocaleString()}` },
        { label: t('ask.projection.projectedEOD'), value: `¥${projectedEOD.toLocaleString()}`, link: `/stores/${storeId}/os/cockpit` },
        { label: t('ask.projection.achievementRate'), value: `${achievementRate.toFixed(1)}%` },
      ],
      confidence,
      canCreateProposal: achievementRate < 95,
      proposalData: achievementRate < 95 ? {
        type: 'high-margin-priority',
        title: t('ask.projection.proposalTitle'),
        description: t('ask.projection.proposalDesc', { gap: Math.round(forecast - actual).toLocaleString() }),
        reason: t('ask.projection.proposalReason', { rate: achievementRate.toFixed(1) }),
      } : undefined,
    };
  }, [salesMetrics, storeId, t]);
  
  // Handler for "Reason for poor labor cost ratio"
  const handleLaborRateReason = useCallback((): Message => {
    const currentRate = laborRateStatus?.projectedLaborRateEOD ?? 0;
    const targetRate = laborRateStatus?.selectedBracket?.goodRate ?? 28;
    const status = laborRateStatus?.status ?? 'unknown';
    
    // Calculate delta
    const delta = currentRate - targetRate;
    const isOverBudget = delta > 0;
    
    // Determine confidence
    const confidence: 'high' | 'medium' | 'low' = status === 'danger' || status === 'caution' ? 'high' : 'medium';
    
    // Build reasons based on analysis
    const reasons: string[] = [];
    if (isOverBudget) {
      if (laborMetrics.activeStaffCount > 3) {
        reasons.push(t('ask.labor.reasonOverstaffed', { count: laborMetrics.activeStaffCount }));
      }
      if (salesMetrics.achievementRate < 90) {
        reasons.push(t('ask.labor.reasonLowSales', { rate: salesMetrics.achievementRate.toFixed(1) }));
      }
      if (reasons.length === 0) {
        reasons.push(t('ask.labor.reasonGeneral'));
      }
    }
    
    const conclusionText = isOverBudget
      ? t('ask.labor.conclusionOver', { current: currentRate.toFixed(1), target: targetRate.toFixed(1), delta: delta.toFixed(1) })
      : t('ask.labor.conclusionGood', { current: currentRate.toFixed(1), target: targetRate.toFixed(1) });
    
    return {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: conclusionText,
      evidence: [
        { label: t('ask.labor.currentRate'), value: `${currentRate.toFixed(1)}%` },
        { label: t('ask.labor.targetRate'), value: `${targetRate.toFixed(1)}%` },
        { label: t('ask.labor.activeStaff'), value: `${laborMetrics.activeStaffCount}${t('ask.labor.people')}`, link: `/stores/${storeId}/floor/timeclock` },
        { label: t('ask.labor.laborCost'), value: `¥${laborMetrics.laborCostEstimate.toLocaleString()}`, link: `/stores/${storeId}/os/labor-weekly` },
        ...(reasons.length > 0 ? [{ label: t('ask.labor.possibleCauses'), value: reasons.join('、') }] : []),
      ],
      confidence,
      canCreateProposal: isOverBudget && delta > 2,
      proposalData: isOverBudget && delta > 2 ? {
        type: 'scope-reduction',
        title: t('ask.labor.proposalTitle'),
        description: t('ask.labor.proposalDesc', { delta: delta.toFixed(1) }),
        reason: t('ask.labor.proposalReason', { current: currentRate.toFixed(1), target: targetRate.toFixed(1) }),
      } : undefined,
    };
  }, [laborRateStatus, laborMetrics, salesMetrics, storeId, t]);
  
  // Handler for "Products with declining demand"
  const handleDemandDropProducts = useCallback((): Message => {
    if (demandDrops.length === 0) {
      return {
        id: generateId(),
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        conclusion: t('ask.demandDrop.noDrops'),
        evidence: [],
        confidence: 'high',
        canCreateProposal: false,
      };
    }
    
    // Find the most significant drop
    const topDrop = demandDrops[0];
    const dropPercent = Math.round(topDrop.dropRate * 100);
    
    // Find related incident
    const relatedIncident = selectIncidentByMenuName(state, topDrop.menuName);
    
    return {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: t('ask.demandDrop.conclusion', { 
        count: demandDrops.length, 
        topMenu: topDrop.menuName, 
        dropRate: dropPercent 
      }),
      evidence: [
        { label: t('ask.demandDrop.topItem'), value: topDrop.menuName },
        { label: t('ask.demandDrop.dropRate'), value: `-${dropPercent}%` },
        { label: t('ask.demandDrop.avg3Day'), value: `${topDrop.avg3Day}${t('ask.demandDrop.units')}` },
        { label: t('ask.demandDrop.avg7Day'), value: `${topDrop.avg7Day}${t('ask.demandDrop.units')}` },
        { label: t('ask.demandDrop.affectedChannels'), value: topDrop.affectedChannels.map(c => c.channel).join(', ') || t('ask.demandDrop.allChannels') },
      ],
      confidence: topDrop.severity === 'critical' ? 'high' : 'medium',
      // Always link to incident for evidence
      relatedIncidentId: relatedIncident?.id,
      incidentLink: relatedIncident 
        ? `/stores/${storeId}/os/incidents/${relatedIncident.id}`
        : undefined,
      canCreateIncident: !relatedIncident,
      incidentCreateParams: !relatedIncident ? {
        menuName: topDrop.menuName,
        dropRate: dropPercent,
        title: `${topDrop.menuName}の出数${dropPercent}%下降`,
        summary: t('ask.demandDrop.conclusion', { count: 1, topMenu: topDrop.menuName, dropRate: dropPercent }),
      } : undefined,
    };
  }, [demandDrops, state, storeId, t]);
  
  // Handler for "Why specific tasks are slow"
  const handleTaskDelayReason = useCallback((): Message => {
    const completionRate = todoStats.total > 0 
      ? Math.round((todoStats.completed / todoStats.total) * 100)
      : 100;
    
    // Analyze time variance from team score
    const timeVarianceScore = teamScore.breakdown.timeVariance;
    const maxTimeScore = 25;
    const onTimeRate = Math.round((timeVarianceScore / maxTimeScore) * 100);
    
    // Find potential causes
    const causes: string[] = [];
    if (teamScore.breakdown.taskCompletion < 32) {
      causes.push(t('ask.taskDelay.causeOverloaded'));
    }
    if (teamScore.breakdown.breakCompliance < 12) {
      causes.push(t('ask.taskDelay.causeNoBreak'));
    }
    if (todoStats.inProgress > 3) {
      causes.push(t('ask.taskDelay.causeTooManyWIP'));
    }
    if (causes.length === 0) {
      causes.push(t('ask.taskDelay.causeEstimation'));
    }
    
    const conclusionText = onTimeRate < 80
      ? t('ask.taskDelay.conclusionSlow', { rate: onTimeRate })
      : t('ask.taskDelay.conclusionGood', { rate: onTimeRate });
    
    return {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: conclusionText,
      evidence: [
        { label: t('ask.taskDelay.onTimeRate'), value: `${onTimeRate}%` },
        { label: t('ask.taskDelay.inProgress'), value: `${todoStats.inProgress}${t('ask.labor.tasks')}`, link: `/stores/${storeId}/floor/todo` },
        { label: t('ask.taskDelay.completed'), value: `${todoStats.completed}/${todoStats.total}${t('ask.labor.tasks')}` },
        { label: t('ask.taskDelay.possibleCauses'), value: causes.slice(0, 2).join('、') },
      ],
      confidence: onTimeRate < 70 ? 'high' : 'medium',
      canCreateProposal: onTimeRate < 70,
      proposalData: onTimeRate < 70 ? {
        type: 'scope-reduction',
        title: t('ask.taskDelay.proposalTitle'),
        description: t('ask.taskDelay.proposalDesc'),
        reason: causes[0],
      } : undefined,
    };
  }, [todoStats, teamScore, storeId, t]);
  
  // Handler for "Why today's completion rate is low"
  const handleLowCompletionReason = useCallback((): Message => {
    const score = teamScore.total;
    const completionRate = todoStats.total > 0 
      ? Math.round((todoStats.completed / todoStats.total) * 100)
      : 100;
    
    // Get bottlenecks from team score
    const bottlenecks = teamScore.bottlenecks.slice(0, 3);
    
    const conclusionText = score < 70
      ? t('ask.completion.conclusionLow', { score, rate: completionRate })
      : t('ask.completion.conclusionGood', { score, rate: completionRate });
    
    return {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: conclusionText,
      evidence: [
        { label: t('ask.completion.teamScore'), value: `${score}pts (${teamScore.grade})`, link: `/stores/${storeId}/os/cockpit` },
        { label: t('ask.completion.questCompletion'), value: `${completionRate}%` },
        { label: t('ask.completion.taskScore'), value: `${teamScore.breakdown.taskCompletion}/40pts` },
        { label: t('ask.completion.timeScore'), value: `${teamScore.breakdown.timeVariance}/25pts` },
        ...(bottlenecks.length > 0 ? [{ label: t('ask.completion.bottlenecks'), value: bottlenecks.join('、') }] : []),
      ],
      confidence: score < 60 ? 'high' : 'medium',
      canCreateProposal: score < 60,
      proposalData: score < 60 ? {
        type: 'scope-reduction',
        title: t('ask.completion.proposalTitle'),
        description: t('ask.completion.proposalDesc', { bottleneck: bottlenecks[0] || t('ask.completion.general') }),
        reason: teamScore.feedback,
      } : undefined,
    };
  }, [todoStats, teamScore, storeId, t]);
  
  // Handler for "Today's key incidents"
  const handleTodayKeyIncidents = useCallback((): Message => {
    if (todayIncidents.length === 0) {
      return {
        id: generateId(),
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        conclusion: t('ask.incidents.noIncidents'),
        evidence: [],
        confidence: 'high',
      };
    }
    
    const criticalCount = criticalIncidents.length;
    let conclusionText = t('ask.incidents.summary', { count: todayIncidents.length });
    if (criticalCount > 0) {
      conclusionText += ' ' + t('ask.incidents.criticalCount', { count: criticalCount });
    }
    
    return {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: conclusionText,
      evidence: todayIncidents.slice(0, 3).map((incident) => ({
        label: incident.title,
        value: t(`incidents.severity.${incident.severity}`),
        link: `/stores/${storeId}/os/incidents/${incident.id}`,
      })),
      confidence: 'high',
      incidentLink: `/stores/${storeId}/os/incidents`,
    };
  }, [todayIncidents, criticalIncidents, storeId, t]);
  
  // Question chips
  const questionChips: QuestionChip[] = [
    {
      id: 'today-projection',
      labelKey: 'ask.chip.todayProjection',
      icon: <Target className="h-4 w-4" />,
      handler: handleTodayProjection,
    },
    {
      id: 'labor-rate-reason',
      labelKey: 'ask.chip.laborRateReason',
      icon: <DollarSign className="h-4 w-4" />,
      handler: handleLaborRateReason,
    },
    {
      id: 'task-delay-reason',
      labelKey: 'ask.chip.taskDelayReason',
      icon: <Clock className="h-4 w-4" />,
      handler: handleTaskDelayReason,
    },
    {
      id: 'low-completion-reason',
      labelKey: 'ask.chip.lowCompletionReason',
      icon: <CheckSquare className="h-4 w-4" />,
      handler: handleLowCompletionReason,
    },
    {
      id: 'demand-drop-products',
      labelKey: 'ask.chip.demandDropProducts',
      icon: <TrendingDown className="h-4 w-4" />,
      handler: handleDemandDropProducts,
    },
    {
      id: 'today-key-incidents',
      labelKey: 'ask.chip.todayKeyIncidents',
      icon: <FileWarning className="h-4 w-4" />,
      handler: handleTodayKeyIncidents,
    },
  ];
  
  // Handle question chip click
  const handleChipClick = (chip: QuestionChip) => {
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      type: 'user',
      content: t(chip.labelKey),
      timestamp: new Date(),
    };
    
    // Get assistant response
    const assistantMessage = chip.handler();
    
    setMessages(prev => [...prev, userMessage, assistantMessage]);
  };
  
  // Handle free text input
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const userMessage: Message = {
      id: generateId(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    
    // Simple keyword matching for demo
    let assistantMessage: Message;
    const lowerInput = inputValue.toLowerCase();
    
    if (lowerInput.includes('着地') || lowerInput.includes('売上') || lowerInput.includes('projection') || lowerInput.includes('sales')) {
      assistantMessage = handleTodayProjection();
    } else if (lowerInput.includes('人件費') || lowerInput.includes('労務') || lowerInput.includes('labor')) {
      assistantMessage = handleLaborRateReason();
    } else if (lowerInput.includes('案件') || lowerInput.includes('incident') || lowerInput.includes('主要')) {
      assistantMessage = handleTodayKeyIncidents();
    } else if (lowerInput.includes('出数') || lowerInput.includes('下降') || lowerInput.includes('demand') || lowerInput.includes('drop')) {
      assistantMessage = handleDemandDropProducts();
    } else {
      // Default response
      assistantMessage = {
        id: generateId(),
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        conclusion: t('ask.defaultResponse'),
        evidence: [],
        confidence: 'low',
        canCreateProposal: false,
      };
    }
    
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputValue('');
  };
  
  // Handle incident creation from Ask
  const handleCreateIncidentFromAsk = (message: Message) => {
    if (!message.incidentCreateParams) return;
    
    const result = actions.createIncidentFromSignal({
      storeId,
      businessDate: today,
      timeBand: 'all',
      type: 'demand_drop',
      menuName: message.incidentCreateParams.menuName,
      dropRate: message.incidentCreateParams.dropRate,
      title: message.incidentCreateParams.title,
      summary: message.incidentCreateParams.summary,
    });
    
    // Navigate to incident detail
    router.push(`/stores/${storeId}/os/incidents/${result.incidentId}`);
    
    // Add confirmation message
    const confirmMessage: Message = {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: t('ask.incidentCreated'),
      incidentLink: `/stores/${storeId}/os/incidents/${result.incidentId}`,
      confidence: 'high',
    };
    
    setMessages(prev => [...prev, confirmMessage]);
  };

  // Handle proposal creation (now redirects to incident detail)
  const handleCreateProposal = (message: Message) => {
    // If there's an incident link, navigate there instead
    if (message.incidentLink) {
      router.push(message.incidentLink);
      return;
    }
    
    if (!message.proposalData) return;
    
    const now = new Date();
    const deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const proposal: Proposal = {
      id: `prop-ask-${now.getTime()}`,
      type: message.proposalData.type ?? 'scope-reduction',
      title: message.proposalData.title ?? '',
      description: message.proposalData.description ?? '',
      reason: message.proposalData.reason ?? '',
      triggeredBy: message.relatedExceptionId ?? 'ask-os',
      priority: message.confidence === 'high' ? 'high' : 'medium',
      createdAt: now.toISOString(),
      targetMenuIds: message.proposalData.targetMenuIds ?? [],
      targetPrepItemIds: [],
      quantity: 0,
      distributedToRoles: state.roles.map(r => r.id),
      deadline: deadline.toISOString(),
      storeId,
      timeBand: 'all',
      expectedEffects: ['sales-impact'],
      todoCount: 1,
      status: 'pending',
    };
    
    onAddProposal(proposal);
    
    // Add confirmation message
    const confirmMessage: Message = {
      id: generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      conclusion: t('ask.proposalCreated'),
      evidence: [
        { label: t('ask.proposalType'), value: proposal.type },
        { label: t('ask.proposalTitle'), value: proposal.title },
      ],
      confidence: 'high',
      canCreateProposal: false,
    };
    
    setMessages(prev => [...prev, confirmMessage]);
  };
  
  if (!open) return null;
  
  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold text-base">{t('ask.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('ask.description')}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-foreground mb-3">{t('ask.suggestedQuestions')}</p>
                <div className="flex flex-col gap-2">
                  {questionChips.map(chip => (
                    <Button
                      key={chip.id}
                      variant="outline"
                      className="justify-start gap-3 h-auto py-3 px-4 text-left bg-transparent hover:bg-muted/50"
                      onClick={() => handleChipClick(chip)}
                    >
                      <span className="shrink-0 text-muted-foreground">{chip.icon}</span>
                      <span className="text-sm">{t(chip.labelKey)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div key={message.id} className={cn('flex', message.type === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.type === 'user' ? (
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ) : (
                    <Card className="w-full border-muted">
                      <CardContent className="p-4 space-y-3">
                        {/* Conclusion */}
                        {message.conclusion && (
                          <div className="flex items-start gap-2.5">
                            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm leading-relaxed">{message.conclusion}</p>
                          </div>
                        )}
                        
                        {/* Evidence */}
                        {message.evidence && message.evidence.length > 0 && (
                          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <BarChart3 className="h-3.5 w-3.5" />
                              {t('ask.evidence')}
                            </div>
                            <div className="space-y-2">
                              {message.evidence.map((ev, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm gap-2">
                                  <span className="text-muted-foreground truncate">{ev.label}</span>
                                  {ev.link ? (
                                    <a href={ev.link} className="font-medium text-primary hover:underline flex items-center gap-1 shrink-0">
                                      {ev.value}
                                      <ChevronRight className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="font-semibold shrink-0">{ev.value}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Confidence & Actions */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          {message.confidence && (
                            <Badge variant="secondary" className={cn('text-xs', CONFIDENCE_COLORS[message.confidence])}>
                              {t(`ask.confidence.${message.confidence}`)}
                            </Badge>
                          )}
                          
                          {message.canCreateProposal && (
                            <Button
                              size="sm"
                              onClick={() => handleCreateProposal(message)}
                              className="gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {t('ask.createProposal')}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
              
              {/* Show chips again after messages */}
              <div className="pt-4 mt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('ask.otherQuestions')}</p>
                <div className="flex flex-col gap-1.5">
                  {questionChips.map(chip => (
                    <Button
                      key={chip.id}
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2 h-auto py-2 px-3 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleChipClick(chip)}
                    >
                      {chip.icon}
                      {t(chip.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
      {/* Input Area */}
      <div className="px-4 py-3 border-t bg-muted/20 shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('ask.inputPlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
