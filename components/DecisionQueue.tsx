'use client';

import React from "react"

import { Proposal } from '@/core/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, X, Edit2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface DecisionQueueProps {
  proposals: Proposal[];
  onApprove: (proposal: Proposal) => void;
  onReject: (proposal: Proposal) => void;
  onEdit: (proposal: Proposal) => void;
}

const priorityConfig: Record<
  Proposal['priority'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  critical: {
    label: '緊急',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  high: {
    label: '高',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  medium: {
    label: '中',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Info className="h-4 w-4" />,
  },
  low: {
    label: '低',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <Info className="h-4 w-4" />,
  },
};

export function DecisionQueue({
  proposals,
  onApprove,
  onReject,
  onEdit,
}: DecisionQueueProps) {
  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">現在の提案はありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => {
        const priority = priorityConfig[proposal.priority];
        return (
          <Card
            key={proposal.id}
            className={cn(
              'transition-all hover:shadow-md',
              proposal.priority === 'critical' && 'border-red-300 bg-red-50/30'
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('gap-1', priority.color)}
                    >
                      {priority.icon}
                      {priority.label}
                    </Badge>
                    <Badge variant="secondary">{proposal.type}</Badge>
                  </div>
                  <CardTitle className="text-lg">{proposal.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {proposal.description}
              </p>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">理由:</span> {proposal.reason}
              </div>
              {proposal.quantity > 0 && (
                <div className="text-sm">
                  <span className="font-medium">数量:</span> {proposal.quantity}
                </div>
              )}
              {proposal.deadline && (
                <div className="text-sm">
                  <span className="font-medium">期限:</span>{' '}
                  {new Date(proposal.deadline).toLocaleString('ja-JP')}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => onApprove(proposal)}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  承認
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(proposal)}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  却下
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(proposal)}
                  className="gap-1"
                >
                  <Edit2 className="h-4 w-4" />
                  編集
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
