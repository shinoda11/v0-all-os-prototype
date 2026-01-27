'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { AwardCard } from './AwardCard';
import { AwardEvidenceDrawer } from './AwardEvidenceDrawer';
import { useI18n } from '@/i18n/I18nProvider';
import type { AwardsMetrics, Award, AwardNominee } from '@/core/selectors';
import { Trophy, Users, Star, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AwardsDashboardProps {
  metrics: AwardsMetrics;
}

type SortField = 'score' | 'quests' | 'delay' | 'hours';
type SortDirection = 'asc' | 'desc';

export function AwardsDashboard({ metrics }: AwardsDashboardProps) {
  const { t } = useI18n();
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const { snapshot, awards, nominees, dataAvailability } = metrics;
  
  const handleViewEvidence = (award: Award) => {
    setSelectedAward(award);
    setDrawerOpen(true);
  };
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const sortedNominees = [...nominees].sort((a, b) => {
    let aVal: number;
    let bVal: number;
    
    switch (sortField) {
      case 'score':
        aVal = a.score;
        bVal = b.score;
        break;
      case 'quests':
        aVal = a.questsDone;
        bVal = b.questsDone;
        break;
      case 'delay':
        aVal = a.delayRate ?? 999;
        bVal = b.delayRate ?? 999;
        break;
      case 'hours':
        aVal = a.hoursWorked ?? 0;
        bVal = b.hoursWorked ?? 0;
        break;
      default:
        aVal = a.score;
        bVal = b.score;
    }
    
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn(
          'h-3 w-3',
          sortField === field ? 'opacity-100' : 'opacity-30'
        )} />
      </div>
    </TableHead>
  );
  
  return (
    <div className="space-y-6">
      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('awards.snapshot.winners')}</p>
                <p className="text-3xl font-bold">{snapshot.winnersCount}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 text-amber-700">
                <Trophy className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('awards.snapshot.eligible')}</p>
                <p className="text-3xl font-bold">{snapshot.eligibleStaffCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-700">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('awards.snapshot.lastUpdated')}</p>
                <FreshnessBadge lastUpdate={snapshot.lastUpdated} />
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant={dataAvailability.hasLaborData ? 'default' : 'secondary'} className="text-xs">
                  Labor
                </Badge>
                <Badge variant={dataAvailability.hasQuestData ? 'default' : 'secondary'} className="text-xs">
                  Quest
                </Badge>
                <Badge variant={dataAvailability.hasQualityData ? 'default' : 'secondary'} className="text-xs">
                  Quality
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Award Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Awards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {awards.map((award) => (
            <AwardCard 
              key={award.category} 
              award={award} 
              onViewEvidence={handleViewEvidence}
            />
          ))}
        </div>
      </div>
      
      {/* Nominee List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('awards.nominees.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedNominees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('awards.nominees.name')}</TableHead>
                    <TableHead>{t('awards.nominees.star')}</TableHead>
                    <TableHead>{t('awards.nominees.role')}</TableHead>
                    <SortableHeader field="score">{t('awards.nominees.score')}</SortableHeader>
                    <SortableHeader field="quests">{t('awards.nominees.quests')}</SortableHeader>
                    <SortableHeader field="delay">{t('awards.nominees.delay')}</SortableHeader>
                    <TableHead>{t('awards.nominees.quality')}</TableHead>
                    <SortableHeader field="hours">{t('awards.nominees.hours')}</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedNominees.map((nominee) => (
                    <NomineeRow key={nominee.staffId} nominee={nominee} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('awards.nominees.noNominees')}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Evidence Drawer */}
      <AwardEvidenceDrawer 
        award={selectedAward}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function NomineeRow({ nominee }: { nominee: AwardNominee }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{nominee.name}</TableCell>
      <TableCell>
        <div className="flex items-center">
          {Array.from({ length: nominee.starLevel }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {nominee.roleCode}
        </Badge>
      </TableCell>
      <TableCell>
        <span className={cn(
          'font-medium',
          nominee.score >= 80 && 'text-emerald-600',
          nominee.score >= 60 && nominee.score < 80 && 'text-amber-600',
          nominee.score < 60 && 'text-red-600'
        )}>
          {nominee.score}
        </span>
      </TableCell>
      <TableCell>{nominee.questsDone}</TableCell>
      <TableCell>
        {nominee.delayRate !== null ? (
          <span className={cn(
            nominee.delayRate === 0 && 'text-emerald-600',
            nominee.delayRate > 0 && nominee.delayRate <= 20 && 'text-amber-600',
            nominee.delayRate > 20 && 'text-red-600'
          )}>
            {nominee.delayRate}%
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {nominee.qualityNgCount === 0 ? (
          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 text-xs">
            OK
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
            NG: {nominee.qualityNgCount}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {nominee.hoursWorked !== null ? (
          <span>{nominee.hoursWorked.toFixed(1)}h</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}
