'use client';

import { useState } from 'react';
import { Drawer } from '@/components/Drawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import type { Award } from '@/core/selectors';
import { Clock, CheckCircle2, AlertCircle, Copy, Check, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AwardEvidenceDrawerProps {
  award: Award | null;
  open: boolean;
  onClose: () => void;
}

export function AwardEvidenceDrawer({ award, open, onClose }: AwardEvidenceDrawerProps) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  
  if (!award || !award.evidence) return null;
  
  const { evidence, winner } = award;
  const categoryLabel = locale === 'ja' ? award.categoryLabel.ja : award.categoryLabel.en;
  const reasonText = locale === 'ja' ? evidence.reasonText.ja : evidence.reasonText.en;
  
  const handleCopy = async () => {
    const text = `${categoryLabel} - ${winner?.name}\n\n${reasonText}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Drawer 
      open={open} 
      onClose={onClose}
      title={t('awards.evidence.title')}
    >
      <div className="space-y-4 p-4">
        {/* Winner Header */}
        {winner && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">{winner.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="bg-amber-100 border-amber-300">
                  {categoryLabel}
                </Badge>
                <span className="flex items-center">
                  {Array.from({ length: winner.starLevel }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Labor Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('awards.evidence.laborTimeline')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evidence.laborTimeline.length > 0 ? (
              <div className="space-y-2">
                {evidence.laborTimeline.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-12">{item.time}</span>
                    <Badge variant="outline" className={cn(
                      item.action === 'check-in' && 'bg-emerald-100 text-emerald-800',
                      item.action === 'check-out' && 'bg-slate-100 text-slate-800',
                      item.action === 'break-start' && 'bg-blue-100 text-blue-800',
                      item.action === 'break-end' && 'bg-blue-100 text-blue-800',
                    )}>
                      {item.action}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('awards.evidence.noLabor')}</p>
            )}
          </CardContent>
        </Card>
        
        {/* Quest History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('awards.evidence.questHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evidence.questHistory.length > 0 ? (
              <div className="space-y-2">
                {evidence.questHistory.map((quest, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{quest.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {quest.startedAt} - {quest.completedAt ?? '...'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {quest.durationMinutes !== undefined && quest.estimatedMinutes !== undefined && (
                        <Badge variant="outline" className={cn(
                          quest.durationMinutes <= quest.estimatedMinutes 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        )}>
                          {quest.durationMinutes}m / {quest.estimatedMinutes}m
                        </Badge>
                      )}
                      {quest.qualityStatus && (
                        <Badge variant="outline" className={cn(
                          quest.qualityStatus === 'ok' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        )}>
                          {quest.qualityStatus.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('awards.evidence.noQuests')}</p>
            )}
          </CardContent>
        </Card>
        
        {/* Score Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('awards.evidence.scoreBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('awards.evidence.base')}</span>
                <span>{evidence.scoreBreakdown.base}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('awards.evidence.questBonus')}</span>
                <span className="text-emerald-600">+{evidence.scoreBreakdown.questBonus}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('awards.evidence.speedBonus')}</span>
                <span className="text-emerald-600">+{evidence.scoreBreakdown.speedBonus}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('awards.evidence.qualityBonus')}</span>
                <span className="text-emerald-600">+{evidence.scoreBreakdown.qualityBonus}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-medium">
                <span>{t('awards.evidence.total')}</span>
                <span className="text-lg">{evidence.scoreBreakdown.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Award Reason */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{t('awards.evidence.reason')}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 gap-1"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    {t('awards.evidence.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    {t('awards.evidence.copyText')}
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{reasonText}</p>
          </CardContent>
        </Card>
      </div>
    </Drawer>
  );
}
