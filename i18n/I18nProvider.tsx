'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ja, type MessageKey } from './messages/ja';
import { en } from './messages/en';

export type Locale = 'ja' | 'en';

const MESSAGES: Record<Locale, Record<string, string>> = {
  ja,
  en,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = 'app-locale';

function getInitialLocale(): Locale {
  // Check localStorage first (client-side only)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'ja' || stored === 'en') {
      return stored;
    }
    
    // Check URL query param
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam === 'ja' || langParam === 'en') {
      return langParam;
    }
  }
  
  // Default to Japanese
  return 'ja';
}

function updateUrlLocale(locale: Locale) {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.set('lang', locale);
  window.history.replaceState({}, '', url.toString());
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ja');
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize locale on mount
  useEffect(() => {
    const initialLocale = getInitialLocale();
    setLocaleState(initialLocale);
    setIsHydrated(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    
    // Persist to localStorage
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    
    // Update URL
    updateUrlLocale(newLocale);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const messages = MESSAGES[locale];
    let message = messages[key];
    
    // If key not found, return key itself (makes missing translations visible)
    if (!message) {
      return key;
    }
    
    // Replace variables like {count}, {date}, etc.
    if (vars) {
      for (const [varKey, value] of Object.entries(vars)) {
        message = message.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(value));
      }
    }
    
    return message;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
  }), [locale, setLocale, t]);

  // Show children even before hydration to avoid flash
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Convenience hook for just the translation function
export function useT() {
  const { t } = useI18n();
  return t;
}

// Hook for getting locale-aware date formatting
export function useLocaleDateFormat() {
  const { locale } = useI18n();
  
  return useMemo(() => ({
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', options);
    },
    formatTime: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        ...options,
      });
    },
    formatDateTime: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US');
    },
    formatCurrency: (amount: number) => {
      if (locale === 'ja') {
        return `¥${amount.toLocaleString('ja-JP')}`;
      }
      return `$${(amount / 150).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
  }), [locale]);
}
