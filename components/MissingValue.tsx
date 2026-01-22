'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { type MissingReason, getMissingLabel, getMissingTooltip } from '@/lib/format';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle, Link2Off, FileQuestion, Calculator, Loader2 } from 'lucide-react';

/**
 * デザインガイドライン 2.3 準拠
 * 欠損値の表示コンポーネント
 * 
 * - 「--」表示 + ツールチップで理由を説明
 * - アイコンで視覚的に区別（色依存しない）
 */

interface MissingValueProps {
  reason?: MissingReason;
  className?: string;
  showIcon?: boolean;
  inline?: boolean;
}

const REASON_ICONS: Record<MissingReason, React.ReactNode> = {
  not_connected: <Link2Off className="h-4 w-4" />,
  no_data: <FileQuestion className="h-4 w-4" />,
  cannot_calculate: <Calculator className="h-4 w-4" />,
  loading: <Loader2 className="h-4 w-4 animate-spin" />,
};

export function MissingValue({ 
  reason = 'no_data', 
  className,
  showIcon = true,
  inline = false,
}: MissingValueProps) {
  const label = getMissingLabel(reason);
  const tooltip = getMissingTooltip(reason);
  const icon = REASON_ICONS[reason];

  const content = (
    <span 
      className={cn(
        'inline-flex items-center gap-2 text-muted-foreground',
        inline && 'gap-1',
        className
      )}
    >
      {showIcon && icon}
      <span>{inline ? '--' : label}</span>
    </span>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * テーブルセル用の欠損値表示
 * 右寄せ対応、コンパクト表示
 */
export function MissingCell({ 
  reason = 'no_data',
  className,
}: { 
  reason?: MissingReason;
  className?: string;
}) {
  return (
    <MissingValue 
      reason={reason} 
      inline 
      showIcon={false}
      className={cn('justify-end', className)} 
    />
  );
}

/**
 * 値または欠損値を表示するラッパー
 */
export function ValueOrMissing({
  value,
  children,
  reason = 'no_data',
  className,
}: {
  value: unknown;
  children: React.ReactNode;
  reason?: MissingReason;
  className?: string;
}) {
  const isMissing = value === null || value === undefined || 
    (typeof value === 'number' && Number.isNaN(value)) ||
    (typeof value === 'string' && value.trim() === '');

  if (isMissing) {
    return <MissingValue reason={reason} className={className} />;
  }

  return <>{children}</>;
}
