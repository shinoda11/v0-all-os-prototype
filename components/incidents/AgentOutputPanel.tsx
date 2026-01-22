'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/I18nProvider';
import type { AgentId, EvidenceItem } from '@/core/types';
import { cn } from '@/lib/utils';
import { 
  Bot,
  TrendingUp,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
} from 'lucide-react';

interface AgentOutputPanelProps {
  leadAgent: AgentId;
  supportingAgents: AgentId[];
  evidence: EvidenceItem[];
}

// Agent styles
const AGENT_STYLES: Record<AgentId, string> = {
  management: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  plan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  ops: 'bg-orange-100 text-orange-700 border-orange-200',
  pos: 'bg-pink-100 text-pink-700 border-pink-200',
  supply: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  hr: 'bg-violet-100 text-violet-700 border-violet-200',
};

// Agent icons
const AGENT_ICONS: Record<AgentId, React.ReactNode> = {
  management: <BarChart3 className="h-4 w-4" />,
  plan: <TrendingUp className="h-4 w-4" />,
  ops: <Settings className="h-4 w-4" />,
  pos: <ShoppingCart className="h-4 w-4" />,
  supply: <Truck className="h-4 w-4" />,
  hr: <Users className="h-4 w-4" />,
};

// Mock agent outputs (in real implementation, these would come from the incident data)
const getAgentOutput = (agentId: AgentId, evidence: EvidenceItem[]): string[] => {
  switch (agentId) {
    case 'management':
      return [
        '売上データとコスト構造を分析',
        '前週比・前月比のトレンドを確認',
        '利益インパクトを算出',
      ];
    case 'plan':
      return [
        '予測モデルとの乖離を検出',
        '需要パターンの変化を分析',
        '在庫計画への影響を評価',
      ];
    case 'ops':
      return [
        'オペレーション負荷を評価',
        '仕込み・調理工程の調整案を検討',
        'スタッフ配置の最適化を提案',
      ];
    case 'pos':
      return [
        '売上明細データを抽出',
        '時間帯別・チャネル別の傾向を分析',
        '客単価・客数の変動を確認',
      ];
    case 'supply':
      return [
        '在庫状況をリアルタイム確認',
        '発注・納品スケジュールを調整',
        '代替仕入先の確認',
      ];
    case 'hr':
      return [
        'シフト充足率を確認',
        '人件費率の推移を分析',
        'スキルミックスの評価',
      ];
    default:
      return [];
  }
};

export function AgentOutputPanel({ leadAgent, supportingAgents, evidence }: AgentOutputPanelProps) {
  const { t } = useI18n();
  
  const allAgents = [leadAgent, ...supportingAgents];
  
  return (
    <div className="space-y-4">
      {allAgents.map((agentId) => (
        <AgentOutputCard 
          key={agentId}
          agentId={agentId}
          isLead={agentId === leadAgent}
          outputs={getAgentOutput(agentId, evidence)}
        />
      ))}
    </div>
  );
}

interface AgentOutputCardProps {
  agentId: AgentId;
  isLead: boolean;
  outputs: string[];
}

function AgentOutputCard({ agentId, isLead, outputs }: AgentOutputCardProps) {
  const { t } = useI18n();
  
  const agentName = t(`incidents.agent.${agentId}`);
  
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isLead ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('p-1.5 rounded', AGENT_STYLES[agentId])}>
          {AGENT_ICONS[agentId]}
        </span>
        <span className="font-medium text-sm">{agentName}</span>
        {isLead && (
          <Badge variant="outline" className="text-xs">
            {t('incidents.leadAgent')}
          </Badge>
        )}
      </div>
      
      <ul className="space-y-1 ml-8">
        {outputs.map((output, idx) => (
          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-muted-foreground/60">•</span>
            {output}
          </li>
        ))}
      </ul>
    </div>
  );
}
