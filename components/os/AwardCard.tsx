'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import type { Award } from '@/core/selectors';
import { Trophy, Star, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AwardCardProps {
  award: Award;
  onViewEvidence: (award: Award) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'perfect-run': <Trophy className="h-5 w-5" />,
  'speed-master': <Star className="h-5 w-5" />,
  'quality-guardian': <Star className="h-5 w-5" />,
  'team-saver': <Star className="h-5 w-5" />,
  'most-improved': <Star className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'perfect-run': 'bg-amber-100 text-amber-800 border-amber-300',
  'speed-master': 'bg-blue-100 text-blue-800 border-blue-300',
  'quality-guardian': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'team-saver': 'bg-purple-100 text-purple-800 border-purple-300',
  'most-improved': 'bg-rose-100 text-rose-800 border-rose-300',
};

export function AwardCard({ award, onViewEvidence }: AwardCardProps) {
  const { t, locale } = useI18n();
  
  const categoryLabel = locale === 'ja' 
    ? award.categoryLabel.ja 
    : award.categoryLabel.en;
  
  const reproducibleRule = locale === 'ja'
    ? award.reproducibleRule.ja
    : award.reproducibleRule.en;
  
  const statusBadge = () => {
    switch (award.status) {
      case 'awarded':
        return (
          <Badge variant="default" className="bg-emerald-600">
            {t('awards.status.awarded')}
          </Badge>
        );
      case 'no-winner':
        return (
          <Badge variant="secondary">
            {t('awards.status.noWinner')}
          </Badge>
        );
      case 'not-tracked':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {t('awards.status.notTracked')}
          </Badge>
        );
    }
  };
  
  return (
    <Card className={cn(
      'relative overflow-hidden transition-shadow hover:shadow-md',
      award.status === 'awarded' && 'ring-2 ring-amber-400/50'
    )}>
      {/* Category Color Bar */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1',
        award.status === 'awarded' ? CATEGORY_COLORS[award.category].split(' ')[0] : 'bg-muted'
      )} />
      
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className={cn(
              'p-1.5 rounded-md',
              CATEGORY_COLORS[award.category]
            )}>
              {CATEGORY_ICONS[award.category]}
            </span>
            <span className="truncate">{categoryLabel}</span>
          </CardTitle>
          {statusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Winner Section */}
        {award.status === 'awarded' && award.winner && (
          <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{award.winner.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="flex items-center">
                  {Array.from({ length: award.winner.starLevel }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="mx-1">|</span>
                <span className="truncate">{award.winner.roleCode}</span>
              </div>
            </div>
          </div>
        )}
        
        {award.status === 'no-winner' && (
          <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{t('awards.card.noWinner')}</span>
          </div>
        )}
        
        {award.status === 'not-tracked' && (
          <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
            <div className="flex-1">
              <span className="text-sm">{t('awards.card.notTracked')}</span>
              {award.notTrackedReason && (
                <p className="text-xs mt-0.5">{award.notTrackedReason}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Evidence Bullets */}
        {award.status === 'awarded' && award.evidenceBullets.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t('awards.card.evidence')}</p>
            <ul className="text-sm space-y-0.5">
              {award.evidenceBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span className="truncate">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Reproducible Rule */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t('awards.card.howToWin')}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{reproducibleRule}</p>
        </div>
        
        {/* View Evidence Button */}
        {award.status === 'awarded' && award.evidence && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => onViewEvidence(award)}
          >
            {t('awards.card.viewEvidence')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
