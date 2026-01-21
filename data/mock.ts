// ============================================================
// All Management + All OS - Mock Data
// Initial master data and sample events for demo
// ============================================================

import type {
  Store,
  Staff,
  Role,
  Menu,
  PrepItem,
  DomainEvent,
  AppState,
  LaborGuardrailBracket,
} from '@/core/types';

import mockSushiData from './mock_sushi_events.json';
import { normalizeEvents, normalizeStaff } from './normalizer';

// Re-export for convenience
export type { LaborGuardrailBracket };

// ------------------------------------------------------------
// Labor Guardrails Configuration
// (Will be replaced by All Management API later)
// ------------------------------------------------------------

export const LABOR_GUARDRAILS_CONFIG = {
  weekday: [
    { highSales: 200000, lowSales: 150000, cost: 28000, goodRate: 0.14, badRate: 0.19 },
    { highSales: 300000, lowSales: 200000, cost: 36000, goodRate: 0.12, badRate: 0.18 },
    { highSales: 400000, lowSales: 300000, cost: 42000, goodRate: 0.105, badRate: 0.14 },
    { highSales: 500000, lowSales: 400000, cost: 48000, goodRate: 0.096, badRate: 0.12 },
  ] as LaborGuardrailBracket[],
  weekend: [
    { highSales: 600000, lowSales: 450000, cost: 48000, goodRate: 0.08, badRate: 0.107 },
    { highSales: 800000, lowSales: 600000, cost: 56000, goodRate: 0.07, badRate: 0.093 },
    { highSales: 1000000, lowSales: 800000, cost: 62000, goodRate: 0.062, badRate: 0.078 },
    { highSales: 1200000, lowSales: 1000000, cost: 68000, goodRate: 0.057, badRate: 0.068 },
  ] as LaborGuardrailBracket[],
};

// ------------------------------------------------------------
// Master Data (canonical IDs)
// ------------------------------------------------------------

export const STORES: Store[] = [
  { id: '1', name: 'Aburi TORA 熟成鮨と炙り鮨 二子玉川店', code: 'FUTAKO' },
  { id: '2', name: 'Aburi TORA 熟成鮨と炙り鮨 自由が丘店', code: 'JIYUGAOKA' },
  { id: '3', name: 'Aburi TORA 熟成鮨と炙り鮨 豊洲店', code: 'TOYOSU' },
  { id: '4', name: 'Aburi TORA 熟成鮨と炙り鮨 駒沢店', code: 'KOMAZAWA' },
];

export const ROLES: Role[] = [
  { id: 'role-manager', name: 'マネージャー', code: 'manager' },
  { id: 'role-kitchen', name: 'キッチン', code: 'kitchen' },
  { id: 'role-floor', name: 'フロア', code: 'floor' },
  { id: 'role-delivery', name: 'デリバリー', code: 'delivery' },
];

export const STAFF: Staff[] = [
  // 二子玉川店
  { id: 'staff-1', name: '田中 太郎', roleId: 'role-manager', storeId: '1', starLevel: 3, wage: 1800 },
  { id: 'staff-2', name: '鈴木 花子', roleId: 'role-kitchen', storeId: '1', starLevel: 3, wage: 1500 },
  { id: 'staff-3', name: '佐藤 一郎', roleId: 'role-kitchen', storeId: '1', starLevel: 2, wage: 1300 },
  { id: 'staff-4', name: '山田 美咲', roleId: 'role-floor', storeId: '1', starLevel: 2, wage: 1200 },
  { id: 'staff-5', name: '高橋 健太', roleId: 'role-floor', storeId: '1', starLevel: 1, wage: 1100 },
  { id: 'staff-6', name: '伊藤 愛', roleId: 'role-delivery', storeId: '1', starLevel: 1, wage: 1100 },
  // 自由が丘店
  { id: 'staff-7', name: '中村 裕子', roleId: 'role-manager', storeId: '2', starLevel: 3, wage: 1800 },
  { id: 'staff-8', name: '小林 誠', roleId: 'role-kitchen', storeId: '2', starLevel: 2, wage: 1300 },
  { id: 'staff-9', name: '加藤 恵', roleId: 'role-floor', storeId: '2', starLevel: 2, wage: 1200 },
  // 豊洲店
  { id: 'staff-10', name: '渡辺 大輔', roleId: 'role-manager', storeId: '3', starLevel: 3, wage: 1800 },
  { id: 'staff-11', name: '松本 由美', roleId: 'role-kitchen', storeId: '3', starLevel: 2, wage: 1300 },
  { id: 'staff-12', name: '井上 健', roleId: 'role-floor', storeId: '3', starLevel: 1, wage: 1100 },
  // 駒沢店
  { id: 'staff-13', name: '木村 直樹', roleId: 'role-manager', storeId: '4', starLevel: 3, wage: 1800 },
  { id: 'staff-14', name: '林 美穂', roleId: 'role-kitchen', storeId: '4', starLevel: 2, wage: 1300 },
  { id: 'staff-15', name: '斎藤 翔', roleId: 'role-floor', storeId: '4', starLevel: 1, wage: 1100 },
];

export const MENUS: Menu[] = [
  { id: 'menu-1', name: '熟成まぐろ握り', price: 2800, category: 'main', prepTimeMinutes: 5 },
  { id: 'menu-2', name: '炙りサーモン握り', price: 3200, category: 'main', prepTimeMinutes: 6 },
  { id: 'menu-3', name: '特選うに軍艦', price: 4500, category: 'main', prepTimeMinutes: 3 },
  { id: 'menu-4', name: '玉子焼き', price: 1800, category: 'side', prepTimeMinutes: 8 },
  { id: 'menu-5', name: '特上盛り合わせ', price: 5800, category: 'main', prepTimeMinutes: 15 },
  { id: 'menu-6', name: '日本酒（一合）', price: 800, category: 'drink', prepTimeMinutes: 1 },
  { id: 'menu-7', name: 'お茶', price: 0, category: 'drink', prepTimeMinutes: 1 },
];

export const PREP_ITEMS: PrepItem[] = [
  { id: 'prep-1', name: '熟成まぐろ', menuIds: ['menu-1', 'menu-5'], defaultQuantity: 30, unit: '貫' },
  { id: 'prep-2', name: '炙りサーモン', menuIds: ['menu-2', 'menu-5'], defaultQuantity: 25, unit: '貫' },
  { id: 'prep-3', name: 'うに', menuIds: ['menu-3', 'menu-5'], defaultQuantity: 15, unit: '貫' },
  { id: 'prep-4', name: 'シャリ', menuIds: ['menu-1', 'menu-2', 'menu-3', 'menu-4', 'menu-5'], defaultQuantity: 100, unit: '個' },
  { id: 'prep-5', name: '玉子焼き', menuIds: ['menu-4'], defaultQuantity: 20, unit: '本' },
];

// ------------------------------------------------------------
// Normalized Events from JSON
// ------------------------------------------------------------

const normalizedJsonEvents = normalizeEvents(mockSushiData.events as Array<Record<string, unknown>>);

// ------------------------------------------------------------
// Generate Initial Forecast Events
// ------------------------------------------------------------

const generateInitialForecasts = (storeId: string): DomainEvent[] => {
  const forecasts: DomainEvent[] = [];
  const today = new Date();
  
  // Generate forecasts for today and tomorrow only (2 days for demo)
  for (let i = 0; i < 2; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = [0, 6].includes(date.getDay());

    // Lunch forecast
    forecasts.push({
      id: `forecast-${storeId}-${dateStr}-lunch`,
      type: 'forecast',
      storeId,
      timestamp: new Date(`${dateStr}T06:00:00`).toISOString(),
      timeBand: 'lunch',
      date: dateStr,
      forecastCustomers: isWeekend ? 45 : 30,
      avgSpend: 3500,
      forecastSales: isWeekend ? 157500 : 105000,
    });

    // Dinner forecast
    forecasts.push({
      id: `forecast-${storeId}-${dateStr}-dinner`,
      type: 'forecast',
      storeId,
      timestamp: new Date(`${dateStr}T06:00:00`).toISOString(),
      timeBand: 'dinner',
      date: dateStr,
      forecastCustomers: isWeekend ? 60 : 40,
      avgSpend: 5000,
      forecastSales: isWeekend ? 300000 : 200000,
    });
  }

  return forecasts;
};

// ------------------------------------------------------------
// Load Functions
// ------------------------------------------------------------

export const loadMockData = (): Partial<AppState> => {
  // Generate forecasts for all stores
  const allForecasts: DomainEvent[] = [];
  for (const store of STORES) {
    allForecasts.push(...generateInitialForecasts(store.id));
  }

  // Combine forecasts with normalized JSON events
  const allEvents = [...allForecasts, ...normalizedJsonEvents];

  return {
    stores: STORES,
    staff: STAFF,
    roles: ROLES,
    menus: MENUS,
    prepItems: PREP_ITEMS,
    events: allEvents,
    selectedMonth: new Date().toISOString().substring(0, 7),
  };
};

export const loadSampleEvents = (): DomainEvent[] => {
  // Return normalized events from JSON for replay
  return normalizedJsonEvents;
};

// ------------------------------------------------------------
// Debug: Event count by type for a store
// ------------------------------------------------------------

export const getEventCountsByType = (
  events: DomainEvent[],
  storeId: string
): Record<string, number> => {
  const counts: Record<string, number> = {
    sales: 0,
    labor: 0,
    prep: 0,
    delivery: 0,
    decision: 0,
    forecast: 0,
  };

  for (const event of events) {
    if (event.storeId === storeId) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
  }

  return counts;
};
