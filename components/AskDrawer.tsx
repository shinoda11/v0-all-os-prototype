'use client';

import React, { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { 
  selectExceptions,
  selectLaborMetrics,
  selectDailySalesMetrics,
} from '@/core/selectors';
import { detectDemandDrops, deriveLaborGuardrailSummary, type DemandDropDetectionResult, type LaborGuardrailInput } from '@/core/derive';
import type { Proposal, ExceptionItem, DemandDropMeta } from '@/core/types';
import { 
  MessageCircle, 
  Send, 
  TrendingDown, 
  DollarSign, 
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronRight,
  Sparkles,
  BarChart3,
  Users,
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
  const { state } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Get current data
  const exceptions = selectExceptions(state);
  const laborMetrics = selectLaborMetrics(state);
  const today = new Date().toISOString().split('T')[0];
  const salesMetrics = selectDailySalesMetrics(state, today);
  
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
    
    // Find related exception
    const relatedException = exceptions.find(
      e => e.type === 'demand-drop' && e.demandDropMeta?.menuId === topDrop.menuId
    );
    
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
        { label: t('ask.demandDrop.topItem'), value: topDrop.menuName, link: `/stores/${storeId}/os/exceptions` },
        { label: t('ask.demandDrop.dropRate'), value: `-${dropPercent}%` },
        { label: t('ask.demandDrop.avg3Day'), value: `${topDrop.avg3Day}${t('ask.demandDrop.units')}` },
        { label: t('ask.demandDrop.avg7Day'), value: `${topDrop.avg7Day}${t('ask.demandDrop.units')}` },
        { label: t('ask.demandDrop.affectedChannels'), value: topDrop.affectedChannels.map(c => c.channel).join(', ') || t('ask.demandDrop.allChannels') },
      ],
      confidence: topDrop.severity === 'critical' ? 'high' : 'medium',
      relatedExceptionId: relatedException?.id,
      canCreateProposal: true,
      proposalData: {
        type: 'prep-amount-adjust',
        title: t('ask.demandDrop.proposalTitle', { menu: topDrop.menuName }),
        description: t('ask.demandDrop.proposalDesc', { dropRate: dropPercent }),
        reason: t('ask.demandDrop.proposalReason', { menu: topDrop.menuName, dropRate: dropPercent }),
        targetMenuIds: [topDrop.menuId],
      },
    };
  }, [demandDrops, exceptions, storeId, t]);
  
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
      id: 'demand-drop-products',
      labelKey: 'ask.chip.demandDropProducts',
      icon: <TrendingDown className="h-4 w-4" />,
      handler: handleDemandDropProducts,
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
  
  // Handle proposal creation
  const handleCreateProposal = (message: Message) => {
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
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('ask.title')}
          </SheetTitle>
          <SheetDescription>{t('ask.description')}</SheetDescription>
        </SheetHeader>
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('ask.suggestedQuestions')}</p>
              <div className="flex flex-wrap gap-2">
                {questionChips.map(chip => (
                  <Button
                    key={chip.id}
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                    onClick={() => handleChipClick(chip)}
                  >
                    {chip.icon}
                    {t(chip.labelKey)}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div key={message.id} className={cn('flex', message.type === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.type === 'user' ? (
                    <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[85%]">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ) : (
                    <Card className="max-w-[95%] w-full">
                      <CardContent className="p-4 space-y-3">
                        {/* Conclusion */}
                        {message.conclusion && (
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-sm font-medium">{message.conclusion}</p>
                          </div>
                        )}
                        
                        {/* Evidence */}
                        {message.evidence && message.evidence.length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <BarChart3 className="h-3 w-3" />
                              {t('ask.evidence')}
                            </div>
                            <div className="space-y-1.5">
                              {message.evidence.map((ev, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{ev.label}</span>
                                  {ev.link ? (
                                    <a href={ev.link} className="font-medium text-primary hover:underline flex items-center gap-1">
                                      {ev.value}
                                      <ChevronRight className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="font-medium">{ev.value}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Confidence & Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          {message.confidence && (
                            <Badge className={cn('text-xs', CONFIDENCE_COLORS[message.confidence])}>
                              {t(`ask.confidence.${message.confidence}`)}
                            </Badge>
                          )}
                          
                          {message.canCreateProposal && (
                            <Button
                              size="sm"
                              onClick={() => handleCreateProposal(message)}
                              className="gap-1"
                            >
                              <FileText className="h-3 w-3" />
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
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">{t('ask.otherQuestions')}</p>
                <div className="flex flex-wrap gap-2">
                  {questionChips.map(chip => (
                    <Button
                      key={chip.id}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs bg-transparent"
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
        </ScrollArea>
        
        {/* Input Area */}
        <div className="px-6 py-4 border-t bg-muted/30">
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
      </SheetContent>
    </Sheet>
  );
}
