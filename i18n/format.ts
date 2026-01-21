/**
 * Locale-aware formatting utilities for numbers, currency, dates, and time.
 * These functions provide consistent formatting across the application
 * while respecting the user's locale preferences.
 */

export type SupportedLocale = 'ja' | 'en';

/**
 * Format currency values with locale-appropriate symbols and separators.
 * @param value - The numeric value to format
 * @param locale - The locale ('ja' or 'en')
 * @param currency - The currency code (default: 'JPY')
 * @returns Formatted currency string (e.g., "¥1,234" or "¥1,234")
 */
export function formatCurrency(
  value: number,
  locale: SupportedLocale,
  currency: string = 'JPY'
): string {
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  // For JPY, we don't show decimal places
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  };

  return new Intl.NumberFormat(localeCode, options).format(value);
}

/**
 * Format currency with +/- sign for differences.
 * @param value - The numeric value (positive or negative)
 * @param locale - The locale ('ja' or 'en')
 * @param currency - The currency code (default: 'JPY')
 * @returns Formatted currency string with sign (e.g., "+¥1,234" or "-¥500")
 */
export function formatCurrencyDiff(
  value: number,
  locale: SupportedLocale,
  currency: string = 'JPY'
): string {
  const formatted = formatCurrency(Math.abs(value), locale, currency);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format plain numbers with locale-appropriate separators.
 * @param value - The numeric value to format
 * @param locale - The locale ('ja' or 'en')
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string (e.g., "1,234" or "1,234.56")
 */
export function formatNumber(
  value: number,
  locale: SupportedLocale,
  decimals: number = 0
): string {
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  return new Intl.NumberFormat(localeCode, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage values.
 * @param value - The percentage value (e.g., 25.5 for 25.5%)
 * @param locale - The locale ('ja' or 'en')
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "25.5%")
 */
export function formatPercent(
  value: number,
  locale: SupportedLocale,
  decimals: number = 1
): string {
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  // Note: Intl.NumberFormat percent style expects decimal (0.255 for 25.5%)
  // We receive the value as already percentage (25.5), so we format manually
  const formatted = new Intl.NumberFormat(localeCode, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  
  return `${formatted}%`;
}

/**
 * Format time in HH:MM format.
 * @param date - The Date object or ISO string
 * @param locale - The locale ('ja' or 'en')
 * @returns Formatted time string (e.g., "14:30" or "2:30 PM")
 */
export function formatTimeHHMM(
  date: Date | string,
  locale: SupportedLocale
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  return d.toLocaleTimeString(localeCode, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format hours with appropriate suffix.
 * @param value - The number of hours (can be decimal)
 * @param locale - The locale ('ja' or 'en')
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted hours string (e.g., "10.5h" or "10.5 h")
 */
export function formatHours(
  value: number,
  locale: SupportedLocale,
  decimals: number = 1
): string {
  const formatted = formatNumber(value, locale, decimals);
  // Japanese uses no space before unit, English typically uses a space
  return locale === 'ja' ? `${formatted}h` : `${formatted} h`;
}

/**
 * Format minutes with appropriate suffix.
 * @param value - The number of minutes
 * @param locale - The locale ('ja' or 'en')
 * @returns Formatted minutes string (e.g., "30分" or "30 min")
 */
export function formatMinutes(
  value: number,
  locale: SupportedLocale
): string {
  const formatted = formatNumber(value, locale, 0);
  return locale === 'ja' ? `${formatted}分` : `${formatted} min`;
}

/**
 * Format a ratio/multiplier value.
 * @param value - The ratio value (e.g., 3.5 for 3.5x)
 * @param locale - The locale ('ja' or 'en')
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted ratio string (e.g., "3.5倍" or "3.5x")
 */
export function formatRatio(
  value: number,
  locale: SupportedLocale,
  decimals: number = 1
): string {
  const formatted = formatNumber(value, locale, decimals);
  return locale === 'ja' ? `${formatted}倍` : `${formatted}x`;
}

/**
 * Format a date in a readable format.
 * @param date - The Date object or ISO string
 * @param locale - The locale ('ja' or 'en')
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return d.toLocaleDateString(localeCode, options ?? defaultOptions);
}

/**
 * Format a short date (month/day only).
 * @param date - The Date object or ISO string
 * @param locale - The locale ('ja' or 'en')
 * @returns Formatted short date string (e.g., "1/21" or "Jan 21")
 */
export function formatDateShort(
  date: Date | string,
  locale: SupportedLocale
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  if (locale === 'ja') {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  
  return d.toLocaleDateString(localeCode, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format weekday name.
 * @param date - The Date object or ISO string
 * @param locale - The locale ('ja' or 'en')
 * @param format - 'short' (Mon) or 'long' (Monday)
 * @returns Formatted weekday string
 */
export function formatWeekday(
  date: Date | string,
  locale: SupportedLocale,
  format: 'short' | 'long' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  return d.toLocaleDateString(localeCode, { weekday: format });
}

/**
 * Format a date with weekday.
 * @param date - The Date object or ISO string
 * @param locale - The locale ('ja' or 'en')
 * @returns Formatted date with weekday (e.g., "1/21 (火)" or "Tue, Jan 21")
 */
export function formatDateWithWeekday(
  date: Date | string,
  locale: SupportedLocale
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
  
  if (locale === 'ja') {
    const weekday = d.toLocaleDateString(localeCode, { weekday: 'short' });
    return `${d.getMonth() + 1}/${d.getDate()} (${weekday})`;
  }
  
  return d.toLocaleDateString(localeCode, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
