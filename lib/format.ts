/**
 * デザインガイドライン 2.3 準拠
 * 欠損値の表現統一とフォーマットユーティリティ
 * 
 * 欠損理由:
 * - 「未連携」: 外部システムとの連携が未設定
 * - 「データなし」: 連携済みだが該当期間にデータが存在しない
 * - 「算出不可」: 必要な入力値が揃わず計算できない
 */

// 欠損理由の型定義
export type MissingReason = 'not_connected' | 'no_data' | 'cannot_calculate' | 'loading';

// 欠損理由のラベル
export const MISSING_LABELS: Record<MissingReason, string> = {
  not_connected: '未連携',
  no_data: 'データなし',
  cannot_calculate: '算出不可',
  loading: '読み込み中',
};

// 欠損理由の説明（ツールチップ用）
export const MISSING_TOOLTIPS: Record<MissingReason, string> = {
  not_connected: '外部システムとの連携が未設定です',
  no_data: '該当期間にデータが存在しません',
  cannot_calculate: '必要な入力値が揃わず計算できません',
  loading: 'データを読み込んでいます',
};

/**
 * 数値をフォーマット。NaN/null/undefinedは「--」を返す
 */
export function formatNumber(
  value: number | null | undefined,
  options?: {
    fallback?: string;
    reason?: MissingReason;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { fallback = '--', locale = 'ja-JP', minimumFractionDigits, maximumFractionDigits } = options ?? {};
  
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  
  return value.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/**
 * 通貨をフォーマット
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: {
    fallback?: string;
    reason?: MissingReason;
    currency?: string;
  }
): string {
  const { fallback = '--', currency = 'JPY' } = options ?? {};
  
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  
  if (currency === 'JPY') {
    return `¥${value.toLocaleString('ja-JP')}`;
  }
  
  return value.toLocaleString('ja-JP', {
    style: 'currency',
    currency,
  });
}

/**
 * パーセントをフォーマット
 */
export function formatPercent(
  value: number | null | undefined,
  options?: {
    fallback?: string;
    reason?: MissingReason;
    decimals?: number;
  }
): string {
  const { fallback = '--', decimals = 0 } = options ?? {};
  
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  
  return `${value.toFixed(decimals)}%`;
}

/**
 * 時刻をフォーマット
 */
export function formatTime(
  value: string | Date | null | undefined,
  options?: {
    fallback?: string;
    reason?: MissingReason;
    locale?: 'ja' | 'en';
  }
): string {
  const { fallback = '--', locale = 'ja' } = options ?? {};
  
  if (!value) {
    return fallback;
  }
  
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  
  return date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 日付をフォーマット
 */
export function formatDate(
  value: string | Date | null | undefined,
  options?: {
    fallback?: string;
    reason?: MissingReason;
    locale?: 'ja' | 'en';
    format?: 'short' | 'long';
  }
): string {
  const { fallback = '--', locale = 'ja', format = 'short' } = options ?? {};
  
  if (!value) {
    return fallback;
  }
  
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  
  if (format === 'short') {
    return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      month: 'numeric',
      day: 'numeric',
    });
  }
  
  return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 値が欠損かどうかをチェック
 */
export function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

/**
 * 欠損値のラベルを取得
 */
export function getMissingLabel(reason: MissingReason = 'no_data'): string {
  return MISSING_LABELS[reason];
}

/**
 * 欠損値のツールチップを取得
 */
export function getMissingTooltip(reason: MissingReason = 'no_data'): string {
  return MISSING_TOOLTIPS[reason];
}
