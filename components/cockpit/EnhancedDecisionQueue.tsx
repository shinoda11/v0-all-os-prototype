'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Edit2,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  DollarSign,
  Package,
  TrendingDown,
  Wrench,
  Users,
  ChevronRight,
  Send,
} from 'lucide-react';
import type { Proposal, Role } from '@/core/types';

// Effect type icons
const EFFECT_ICONS: Record<string, React.ReactNode> = {
  sales: <DollarSign className="h-3.5 w-3.5" />,
  stockout: <Package className="h-3.5 w-3.5" />,
  waste: <TrendingDown className="h-3.5 w-3.5" />,
  efficiency: <Wrench className="h-3.5 w-3.5" />,
};

const EFFECT_LABELS: Record<string, string> = {
  sales: '売上影響',
  stockout: '欠品回避',
  waste: 'ロス削減',
  efficiency: '工数削減',
};

// Priority configuration
const PRIORITY_CONFIG: Record<Proposal['priority'], {
  label: string;
  color: string;
  icon: React.ReactNode;
}> = {
  critical: {
    label: '緊急',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  high: {
    label: '高',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  medium: {
    label: '中',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Info className="h-3.5 w-3.5" />,
  },
  low: {
    label: '低',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <Info className="h-3.5 w-3.5" />,
  },
};

// Reject reasons
const REJECT_REASONS = [
  '現場判断で不要',
  '在庫状況が異なる',
  '人員不足',
  '時間が足りない',
  'その他',
];

interface ApprovalModalProps {
  proposal: Proposal;
  roles: Role[];
  open: boolean;
  onClose: () => void;
  onApprove: (proposal: Proposal, selectedRoles: string[]) => void;
}

function ApprovalModal({ proposal, roles, open, onClose, onApprove }: ApprovalModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(proposal.distributedToRoles);

  const handleToggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleApprove = () => {
    onApprove(proposal, selectedRoles);
    onClose();
  };

  const todoCount = selectedRoles.length; // Simplified: 1 todo per role

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>提案を承認</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <div className="font-medium">{proposal.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{proposal.description}</div>
          </div>

          <div>
            <Label className="text-sm font-medium">配布先ロール</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {roles.map((role) => (
                <Badge
                  key={role.id}
                  variant={selectedRoles.includes(role.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleToggleRole(role.id)}
                >
                  <Users className="h-3 w-3 mr-1" />
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Send className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              承認すると <span className="font-medium text-primary">{todoCount}件</span> のToDoが現場に配布されます
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleApprove} disabled={selectedRoles.length === 0}>
            <Check className="h-4 w-4 mr-1" />
            承認して配布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectModalProps {
  proposal: Proposal;
  open: boolean;
  onClose: () => void;
  onReject: (proposal: Proposal, reason: string) => void;
}

function RejectModal({ proposal, open, onClose, onReject }: RejectModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const handleReject = () => {
    const reason = selectedReason === 'その他' ? customReason : selectedReason;
    onReject(proposal, reason);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>提案を却下</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <div className="font-medium">{proposal.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{proposal.description}</div>
          </div>

          <div>
            <Label className="text-sm font-medium">却下理由（任意）</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {REJECT_REASONS.map((reason) => (
                <Badge
                  key={reason}
                  variant={selectedReason === reason ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedReason(reason)}
                >
                  {reason}
                </Badge>
              ))}
            </div>
          </div>

          {selectedReason === 'その他' && (
            <div>
              <Label htmlFor="customReason" className="text-sm font-medium">理由を入力</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="却下理由を入力..."
                className="mt-1"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleReject}>
            <X className="h-4 w-4 mr-1" />
            却下
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  roles: Role[];
  onApprove: (proposal: Proposal, selectedRoles: string[]) => void;
  onReject: (proposal: Proposal, reason: string) => void;
  onEdit: (proposal: Proposal) => void;
}

function ProposalCard({ proposal, roles, onApprove, onReject, onEdit }: ProposalCardProps) {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const priority = PRIORITY_CONFIG[proposal.priority];

  // Determine effect type from proposal type
  const getEffectType = (): string => {
    switch (proposal.type) {
      case 'menu-restriction':
      case 'high-margin-priority':
        return 'sales';
      case 'prep-reorder':
      case 'extra-prep':
        return 'stockout';
      case 'scope-reduction':
        return 'waste';
      case 'help-request':
        return 'efficiency';
      default:
        return 'sales';
    }
  };

  const effectType = getEffectType();
  const timeBandLabel = proposal.timeBand === 'lunch' ? 'ランチ' : proposal.timeBand === 'dinner' ? 'ディナー' : '全日';
  const hasDeadline = Boolean(proposal.deadline);
  const deadlineDate = hasDeadline ? new Date(proposal.deadline) : null;
  const isUrgent = deadlineDate && (deadlineDate.getTime() - Date.now()) < 30 * 60 * 1000; // 30 minutes

  // Calculate distributed todo count
  const todoCount = proposal.distributedToRoles.length;

  return (
    <>
      <Card className={cn(
        'transition-all hover:shadow-md',
        proposal.priority === 'critical' && 'border-red-300 bg-red-50/30'
      )}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={cn('gap-1 text-[10px] h-5', priority.color)}>
                  {priority.icon}
                  {priority.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                  {EFFECT_ICONS[effectType]}
                  {EFFECT_LABELS[effectType]}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5">
                  {timeBandLabel}
                </Badge>
              </div>
              <CardTitle className="text-sm font-medium leading-tight">{proposal.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground line-clamp-2">{proposal.reason}</p>

          {/* Impact and scope */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {proposal.targetMenuIds.length > 0 && (
              <span className="text-muted-foreground">
                対象メニュー: <span className="font-medium">{proposal.targetMenuIds.length}品</span>
              </span>
            )}
            {proposal.targetPrepItemIds.length > 0 && (
              <span className="text-muted-foreground">
                対象仕込み: <span className="font-medium">{proposal.targetPrepItemIds.length}品</span>
              </span>
            )}
            {proposal.quantity > 0 && (
              <span className="text-muted-foreground">
                数量: <span className="font-medium">{proposal.quantity}</span>
              </span>
            )}
          </div>

          {/* Deadline and distribution info */}
          <div className="flex items-center justify-between text-[11px]">
            {hasDeadline && (
              <div className={cn(
                'flex items-center gap-1',
                isUrgent ? 'text-red-600 font-medium' : 'text-muted-foreground'
              )}>
                <Clock className="h-3 w-3" />
                {deadlineDate?.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}まで
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Send className="h-3 w-3" />
              配布 {todoCount}件
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => setShowApprovalModal(true)}>
              <Check className="h-3.5 w-3.5 mr-1" />
              承認
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1 bg-transparent" onClick={() => setShowRejectModal(true)}>
              <X className="h-3.5 w-3.5 mr-1" />
              却下
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(proposal)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ApprovalModal
        proposal={proposal}
        roles={roles}
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={onApprove}
      />

      <RejectModal
        proposal={proposal}
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={onReject}
      />
    </>
  );
}

interface EnhancedDecisionQueueProps {
  proposals: Proposal[];
  roles: Role[];
  onApprove: (proposal: Proposal, selectedRoles: string[]) => void;
  onReject: (proposal: Proposal, reason: string) => void;
  onEdit: (proposal: Proposal) => void;
  lastUpdate?: string;
}

export function EnhancedDecisionQueue({
  proposals,
  roles,
  onApprove,
  onReject,
  onEdit,
  lastUpdate,
}: EnhancedDecisionQueueProps) {
  // Sort by priority (critical first)
  const sortedProposals = [...proposals].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">意思決定キュー</CardTitle>
            <Badge variant="secondary" className="text-xs">{proposals.length}件</Badge>
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(lastUpdate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedProposals.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground text-sm">現在の提案はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                roles={roles}
                onApprove={onApprove}
                onReject={onReject}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
