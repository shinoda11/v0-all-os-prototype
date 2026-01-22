'use client';

import type React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Link2Off, 
  FileQuestion, 
  Loader2, 
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

/**
 * デザインガイドライン 2.3 準拠
 * Empty State カタログ
 * 
 * 種類:
 * - not_connected: 外部システム未連携
 * - no_data: データなし
 * - loading: 読み込み中
 * - no_permission: 権限なし
 * - error: エラー発生
 */

export type EmptyStateType = 'not_connected' | 'no_data' | 'loading' | 'no_permission' | 'error';

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const DEFAULT_CONFIG: Record<EmptyStateType, { icon: React.ReactNode; title: string; description: string }> = {
  not_connected: {
    icon: <Link2Off className="h-8 w-8" />,
    title: '未連携',
    description: '外部システムとの連携が未設定です。設定画面から連携してください。',
  },
  no_data: {
    icon: <FileQuestion className="h-8 w-8" />,
    title: 'データなし',
    description: '該当するデータが見つかりませんでした。',
  },
  loading: {
    icon: <Loader2 className="h-8 w-8 animate-spin" />,
    title: '読み込み中',
    description: 'データを取得しています。しばらくお待ちください。',
  },
  no_permission: {
    icon: <ShieldAlert className="h-8 w-8" />,
    title: 'アクセス権限がありません',
    description: 'このデータを閲覧する権限がありません。管理者にお問い合わせください。',
  },
  error: {
    icon: <AlertCircle className="h-8 w-8" />,
    title: 'エラーが発生しました',
    description: 'データの取得中にエラーが発生しました。再度お試しください。',
  },
};

export function EmptyState({ 
  type = 'no_data',
  icon, 
  title, 
  description,
  action,
  className,
}: EmptyStateProps) {
  const config = DEFAULT_CONFIG[type];
  const displayIcon = icon ?? config.icon;
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;

  return (
    // 2.1スペーシング準拠: py-16=64px相当、gap-4=16px
    <div className={cn(
      'flex flex-col items-center justify-center py-16 text-center',
      className
    )}>
      {displayIcon && (
        <div className="rounded-full bg-muted p-4 mb-4 text-muted-foreground">
          {displayIcon}
        </div>
      )}
      {/* 2.5タイポグラフィ: font-bold使用 */}
      <h3 className="text-lg font-bold text-foreground">{displayTitle}</h3>
      {displayDescription && (
        <p className="text-sm text-muted-foreground mt-2 max-w-md">{displayDescription}</p>
      )}
      {/* 原則4: Primary CTA単一 */}
      {action && (
        <Button onClick={action.onClick} className="mt-6 h-11">
          {action.label}
        </Button>
      )}
    </div>
  );
}
