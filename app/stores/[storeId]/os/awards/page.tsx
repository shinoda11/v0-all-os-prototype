'use client';

import { useState, useMemo } from 'react';
import { OSHeader } from '@/components/OSHeader';
import { AwardsDashboard } from '@/components/os/AwardsDashboard';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { selectAwards, type Period } from '@/core/selectors';
import type { TimeBand } from '@/core/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Clock,
  CheckCircle,
  Users,
  Shield,
  Star,
  Send,
  X,
  Sparkles,
  Eye,
} from 'lucide-react';

// Award category definitions for MVP manager selection
interface AwardCategory {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  color: string;
}

const AWARD_CATEGORIES: AwardCategory[] = [
  {
    id: 'time-master',
    labelKey: 'awards.manage.timeMaster',
    descriptionKey: 'awards.manage.timeMasterDesc',
    icon: <Clock className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'quest-finisher',
    labelKey: 'awards.manage.questFinisher',
    descriptionKey: 'awards.manage.questFinisherDesc',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'team-saver',
    labelKey: 'awards.category.team-saver',
    descriptionKey: 'awards.manage.teamSaverDesc',
    icon: <Users className="h-5 w-5" />,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    id: 'quality-keeper',
    labelKey: 'awards.manage.qualityKeeper',
    descriptionKey: 'awards.manage.qualityKeeperDesc',
    icon: <Shield className="h-5 w-5" />,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
];

// Mock nominees (auto-generated from logs)
interface Nominee {
  id: string;
  name: string;
  starLevel: number;
  score: number;
  reason: string;
}

const MOCK_NOMINEES: Record<string, Nominee[]> = {
  'time-master': [
    { id: 'staff-1', name: '田中太郎', starLevel: 3, score: 95, reason: '全クエスト目標時間内に完了' },
    { id: 'staff-2', name: '佐藤花子', starLevel: 2, score: 88, reason: '平均完了時間が目標より20%早い' },
    { id: 'staff-3', name: '鈴木一郎', starLevel: 2, score: 82, reason: '遅延ゼロを達成' },
  ],
  'quest-finisher': [
    { id: 'staff-4', name: '高橋美咲', starLevel: 3, score: 92, reason: '今週最多の15クエスト完了' },
    { id: 'staff-1', name: '田中太郎', starLevel: 3, score: 87, reason: '12クエスト完了、品質100%' },
    { id: 'staff-5', name: '山田健太', starLevel: 1, score: 78, reason: '10クエスト完了、成長著しい' },
  ],
  'team-saver': [
    { id: 'staff-2', name: '佐藤花子', starLevel: 2, score: 90, reason: '他スタッフのヘルプ3件対応' },
    { id: 'staff-6', name: '伊藤真由', starLevel: 2, score: 85, reason: '急な欠員をカバー' },
    { id: 'staff-3', name: '鈴木一郎', starLevel: 2, score: 80, reason: '新人教育を積極的に担当' },
  ],
  'quality-keeper': [
    { id: 'staff-4', name: '高橋美咲', starLevel: 3, score: 98, reason: '品質チェック全てOK' },
    { id: 'staff-1', name: '田中太郎', starLevel: 3, score: 94, reason: '品質NGゼロ、確認作業も丁寧' },
    { id: 'staff-2', name: '佐藤花子', starLevel: 2, score: 89, reason: '品質問題の早期発見に貢献' },
  ],
};

interface CategorySelection {
  winnerId: string | null;
  reason: string;
}

export default function AwardsPage() {
  const { t } = useI18n();
  const { state } = useStore();
  const [period, setPeriod] = useState<Period>('7d');
  const [timeBand, setTimeBand] = useState<TimeBand>('all');
  const [activeTab, setActiveTab] = useState<'view' | 'manage'>('manage');
  
  const metrics = selectAwards(state, period, timeBand);
  
  // Selection state for manager awards
  const [selections, setSelections] = useState<Record<string, CategorySelection>>(() => {
    const initial: Record<string, CategorySelection> = {};
    AWARD_CATEGORIES.forEach(cat => {
      initial[cat.id] = { winnerId: null, reason: '' };
    });
    return initial;
  });
  
  const [isPublished, setIsPublished] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const allSelected = useMemo(() => {
    return AWARD_CATEGORIES.every(cat => selections[cat.id]?.winnerId);
  }, [selections]);
  
  const getWinnerName = (categoryId: string): string | null => {
    const winnerId = selections[categoryId]?.winnerId;
    if (!winnerId) return null;
    const nominees = MOCK_NOMINEES[categoryId] || [];
    const winner = nominees.find(n => n.id === winnerId);
    return winner?.name ?? null;
  };
  
  const handleSelectWinner = (categoryId: string, nomineeId: string) => {
    setSelections(prev => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], winnerId: nomineeId },
    }));
  };
  
  const handleReasonChange = (categoryId: string, reason: string) => {
    setSelections(prev => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], reason },
    }));
  };
  
  const handlePublish = () => {
    setShowPreview(true);
  };
  
  const confirmPublish = () => {
    setIsPublished(true);
    setShowPreview(false);
  };
  
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
        showTimeBandTabs={false}
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Tabs for View vs Manage */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'view' | 'manage')} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="manage" className="gap-2">
                <Trophy className="h-4 w-4" />
                {t('awards.manage.tab')}
              </TabsTrigger>
              <TabsTrigger value="view" className="gap-2">
                <Eye className="h-4 w-4" />
                {t('awards.view.tab')}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'view' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">{t('awards.period.label')}:</span>
                {periods.map((p) => (
                  <Button
                    key={p.value}
                    variant={period === p.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriod(p.value)}
                  >
                    {t(p.labelKey)}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {/* Manage Awards Tab */}
          <TabsContent value="manage" className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  {t('awards.manage.title')}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('awards.manage.subtitle')}
                </p>
              </div>
              {!isPublished && (
                <Button 
                  onClick={handlePublish}
                  disabled={!allSelected}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {t('awards.manage.publish')}
                </Button>
              )}
              {isPublished && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 py-1.5 px-3">
                  <CheckCircle className="h-4 w-4" />
                  {t('awards.manage.published')}
                </Badge>
              )}
            </div>

            {/* Published Banner */}
            {isPublished && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800">{t('awards.manage.publishedMessage')}</p>
                      <p className="text-sm text-emerald-700">{t('awards.manage.publishedNote')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Award Categories */}
            <div className="grid gap-6">
              {AWARD_CATEGORIES.map((category) => {
                const nominees = MOCK_NOMINEES[category.id] || [];
                const selection = selections[category.id];
                
                return (
                  <Card key={category.id} className={cn('transition-all', selection.winnerId && 'ring-2 ring-emerald-200')}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg border', category.color)}>
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{t(category.labelKey)}</CardTitle>
                          <CardDescription>{t(category.descriptionKey)}</CardDescription>
                        </div>
                        {selection.winnerId && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('awards.manage.selected')}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={selection.winnerId ?? ''}
                        onValueChange={(value) => handleSelectWinner(category.id, value)}
                        disabled={isPublished}
                      >
                        <div className="space-y-3">
                          {nominees.map((nominee, idx) => (
                            <div 
                              key={nominee.id}
                              className={cn(
                                'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                                selection.winnerId === nominee.id 
                                  ? 'bg-emerald-50 border-emerald-300' 
                                  : 'bg-muted/30 hover:bg-muted/50'
                              )}
                            >
                              <RadioGroupItem value={nominee.id} id={`${category.id}-${nominee.id}`} />
                              <Label 
                                htmlFor={`${category.id}-${nominee.id}`}
                                className="flex-1 flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {nominee.name}
                                      <span className="flex items-center gap-0.5">
                                        {[1, 2, 3].map(i => (
                                          <Star
                                            key={i}
                                            className={cn(
                                              'h-3 w-3',
                                              i <= nominee.starLevel ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                                            )}
                                          />
                                        ))}
                                      </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{nominee.reason}</div>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="tabular-nums">
                                  {t('awards.manage.score')}: {nominee.score}
                                </Badge>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                      
                      {/* Optional reason input */}
                      {selection.winnerId && !isPublished && (
                        <div className="mt-4 pt-4 border-t">
                          <Label htmlFor={`reason-${category.id}`} className="text-sm text-muted-foreground">
                            {t('awards.manage.reasonLabel')}
                          </Label>
                          <Input
                            id={`reason-${category.id}`}
                            placeholder={t('awards.manage.reasonPlaceholder')}
                            value={selection.reason}
                            onChange={(e) => handleReasonChange(category.id, e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          {/* View Dashboard Tab */}
          <TabsContent value="view">
            <AwardsDashboard metrics={metrics} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  {t('awards.manage.previewTitle')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>{t('awards.manage.previewSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {AWARD_CATEGORIES.map((category) => {
                const winnerName = getWinnerName(category.id);
                const reason = selections[category.id]?.reason;
                
                return (
                  <div key={category.id} className={cn('p-3 rounded-lg border', category.color)}>
                    <div className="flex items-center gap-2 mb-1">
                      {category.icon}
                      <span className="font-medium">{t(category.labelKey)}</span>
                    </div>
                    <div className="text-lg font-bold">{winnerName}</div>
                    {reason && (
                      <div className="text-sm text-muted-foreground mt-1">"{reason}"</div>
                    )}
                  </div>
                );
              })}
              
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>
                  {t('awards.manage.cancel')}
                </Button>
                <Button className="flex-1 gap-2" onClick={confirmPublish}>
                  <Send className="h-4 w-4" />
                  {t('awards.manage.confirmPublish')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
