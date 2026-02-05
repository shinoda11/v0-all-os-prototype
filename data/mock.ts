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
  Incident,
} from '@/core/types';

import mockSushiData from './mock_sushi_events.json';
import { normalizeEvents, normalizeStaff } from './normalizer';

// ------------------------------------------------------------
// Incentive Policy Configuration
// (Will be replaced by All Management API later)
// ------------------------------------------------------------

export interface IncentivePolicy {
  poolShare: number; // Percentage of over-achievement allocated to pool (e.g., 0.75 = 75%)
  // Eligibility: checkedIn AND questDone >= minQuestsDone
  eligibilityMinQuestsDone: number; // Minimum quests completed to be eligible (e.g., 1)
  // Distribution is based purely on starLevel
}

export const INCENTIVE_POLICY: IncentivePolicy = {
  poolShare: 0.75,
  eligibilityMinQuestsDone: 1, // Must complete at least 1 quest to participate
};

// ------------------------------------------------------------
// Daily Target Sales Configuration
// (Will be replaced by All Management API later)
// ------------------------------------------------------------

export interface DailyTargetSales {
  storeId: string;
  businessDate: string;
  targetSales: number;
}

// Generate daily target sales for demo (based on day of week)
export const getDailyTargetSales = (storeId: string, businessDate: string): number => {
  const date = new Date(businessDate);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Different targets by store and day type
  const baseTargets: Record<string, { weekday: number; weekend: number }> = {
    '1': { weekday: 280000, weekend: 420000 }, // 二子玉川店
    '2': { weekday: 250000, weekend: 380000 }, // 自由が丘店
    '3': { weekday: 320000, weekend: 480000 }, // 豊洲店
    '4': { weekday: 230000, weekend: 350000 }, // 駒沢店
  };
  
  const storeTarget = baseTargets[storeId] ?? { weekday: 250000, weekend: 380000 };
  return isWeekend ? storeTarget.weekend : storeTarget.weekday;
};

// ------------------------------------------------------------
// Labor Guardrails Configuration
// (Will be replaced by All Management API later)
// ------------------------------------------------------------

export interface LaborGuardrailBracket {
  highSales: number;
  lowSales: number;
  cost: number;
  goodRate: number;  // 良好な人件費率（これ以下なら安心）
  badRate: number;   // 危険な人件費率（これ以上なら要対応）
}

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
// Sample Incidents
// ------------------------------------------------------------

const generateSampleIncidents = (storeId: string): Incident[] => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: `incident-${storeId}-1`,
      storeId,
      businessDate: today,
      timeBand: 'lunch',
      type: 'demand_drop',
      severity: 'critical',
      status: 'investigating',
      leadAgent: 'management',
      supportingAgents: ['plan', 'ops', 'pos', 'supply'],
      title: '炙りサーモン握りの出数45%下降',
      summary: '直近3日間で炙りサーモン握りの出数が前週比45%下降。全チャネル（店内・テイクアウト・デリバリー）で同様の傾向。',
      evidence: [
        {
          id: 'ev-1-1',
          label: '直近3日平均出数',
          value: '16.5食/日',
          period: '直近3日',
          sourceEventIds: [],
        },
        {
          id: 'ev-1-2',
          label: '前週平均出数',
          value: '30食/日',
          period: '前週',
          sourceEventIds: [],
        },
        {
          id: 'ev-1-3',
          label: '下降率',
          value: '-45%',
          sourceEventIds: [],
        },
      ],
      hypotheses: [
        {
          id: 'hyp-1-1',
          title: '季節要因による需要減',
          confidence: 'mid',
          rationale: '冬季は炙り系より熟成系が好まれる傾向',
          evidenceRefs: ['ev-1-1', 'ev-1-2'],
        },
        {
          id: 'hyp-1-2',
          title: '競合店の価格攻勢',
          confidence: 'low',
          rationale: '近隣店舗でサーモン関連のキャンペーン実施の可能性',
          evidenceRefs: ['ev-1-3'],
        },
      ],
      recommendationDrafts: [
        {
          id: 'rec-1-1',
          type: 'prep-adjustment',
          title: '炙りサーモンの仕込み量を30%削減',
          reason: '出数下降に伴う廃棄ロス防止',
          expectedEffect: {
            type: 'cost',
            value: 15000,
            unit: '¥',
            description: '1日あたりの廃棄ロス削減',
          },
          scope: 'ランチ・ディナー',
          deadline: '本日中',
          distributedToRoles: ['kitchen', 'manager'],
        },
      ],
      recipients: [
        { role: 'manager', label: '店長' },
        { role: 'area_manager', label: 'エリアマネージャー' },
      ],
      createdAt: twoHoursAgo,
      updatedAt: now,
    },
    {
      id: `incident-${storeId}-2`,
      storeId,
      businessDate: today,
      timeBand: 'lunch',
      type: 'labor_overrun',
      severity: 'warning',
      status: 'proposed',
      leadAgent: 'hr',
      supportingAgents: ['plan', 'ops'],
      title: '人件費率が目標を5pt超過',
      summary: '現在の人件費率が19%で、目標14%を5pt超過。売上達成率85%に対してスタッフ配置が過剰。',
      evidence: [
        {
          id: 'ev-2-1',
          label: '現在の人件費率',
          value: '19%',
          sourceEventIds: [],
        },
        {
          id: 'ev-2-2',
          label: '目標人件費率',
          value: '14%',
          sourceEventIds: [],
        },
        {
          id: 'ev-2-3',
          label: '稼働中スタッフ',
          value: '5名',
          sourceEventIds: [],
        },
      ],
      hypotheses: [
        {
          id: 'hyp-2-1',
          title: '売上未達による相対的上昇',
          confidence: 'high',
          rationale: '売上達成率85%のため、人件費率が相対的に上昇',
          evidenceRefs: ['ev-2-1', 'ev-2-2'],
        },
      ],
      recommendationDrafts: [
        {
          id: 'rec-2-1',
          type: 'labor-adjustment',
          title: 'アイドル時間帯のシフト調整',
          reason: '人件費率改善のため、閑散時間帯の人員を1名削減',
          expectedEffect: {
            type: 'cost',
            value: 2500,
            unit: '¥',
            description: '本日の人件費削減',
          },
          scope: 'アイドル時間帯（14:00-17:00）',
          deadline: '本日14:00まで',
          distributedToRoles: ['manager'],
        },
      ],
      recipients: [
        { role: 'manager', label: '店長' },
      ],
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    {
      id: `incident-${storeId}-3`,
      storeId,
      businessDate: today,
      timeBand: 'dinner',
      type: 'stockout_risk',
      severity: 'warning',
      status: 'open',
      leadAgent: 'ops',
      supportingAgents: ['supply', 'plan'],
      title: '特選うにの在庫残り30%',
      summary: 'ディナータイム開始時点で特選うにの在庫が残り30%。予測需要を考慮すると20:00頃に欠品の可能性。',
      evidence: [
        {
          id: 'ev-3-1',
          label: '現在の在庫',
          value: '5貫分',
          sourceEventIds: [],
        },
        {
          id: 'ev-3-2',
          label: '予測需要',
          value: '12貫',
          timeBand: 'dinner',
          sourceEventIds: [],
        },
      ],
      hypotheses: [],
      recommendationDrafts: [],
      recipients: [
        { role: 'manager', label: '店長' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `incident-${storeId}-4`,
      storeId,
      businessDate: today,
      timeBand: 'all',
      type: 'delivery_delay',
      severity: 'info',
      status: 'resolved',
      leadAgent: 'ops',
      supportingAgents: ['supply'],
      title: '仕入れ配送90分遅延（解決済）',
      summary: '本日の魚介仕入れが90分遅延したが、代替対応により影響なし。',
      evidence: [
        {
          id: 'ev-4-1',
          label: '遅延時間',
          value: '90分',
          sourceEventIds: [],
        },
        {
          id: 'ev-4-2',
          label: '対応策',
          value: '代替仕入先から緊急調達',
          sourceEventIds: [],
        },
      ],
      hypotheses: [],
      recommendationDrafts: [],
      recipients: [],
      createdAt: twoHoursAgo,
      updatedAt: oneHourAgo,
    },
  ];
};

// ------------------------------------------------------------
// Normalized Events from JSON
// ------------------------------------------------------------

const normalizedJsonEvents = normalizeEvents(mockSushiData.events as Array<Record<string, unknown>>);

// ------------------------------------------------------------
// Generate Quest/Decision Events for Daily Score Testing
// ------------------------------------------------------------

const generateQuestEvents = (storeId: string): DomainEvent[] => {
  const events: DomainEvent[] = [];
  const today = new Date().toISOString().split('T')[0];
  const baseTime = new Date(`${today}T09:00:00`);
  
  // Sample quests for the day
  const quests = [
    { id: 'quest-1', title: 'ランチ仕込み', estimatedMin: 30, actualMin: 28, status: 'completed' },
    { id: 'quest-2', title: 'シャリ補充', estimatedMin: 15, actualMin: 18, status: 'completed' },
    { id: 'quest-3', title: '在庫確認', estimatedMin: 20, actualMin: 25, status: 'completed' },
    { id: 'quest-4', title: 'テーブル清掃', estimatedMin: 10, actualMin: 10, status: 'completed' },
    { id: 'quest-5', title: 'ディナー準備', estimatedMin: 45, actualMin: null, status: 'started' },
    { id: 'quest-6', title: 'デリバリー梱包', estimatedMin: 15, actualMin: null, status: 'pending' },
  ];
  
  let timeOffset = 0;
  
  for (const quest of quests) {
    const questTime = new Date(baseTime.getTime() + timeOffset * 60 * 1000);
    
    // Create approval event
    events.push({
      id: `${quest.id}-approved-${storeId}`,
      type: 'decision',
      storeId,
      timestamp: questTime.toISOString(),
      action: 'approved',
      proposalId: quest.id,
      title: quest.title,
      description: `本日のタスク: ${quest.title}`,
      reason: 'マネージャー承認',
      expectedEffect: 'labor-savings',
      distributedToRoles: ['kitchen', 'floor'],
      estimatedMinutes: quest.estimatedMin,
    });
    
    timeOffset += 5;
    
    if (quest.status === 'started' || quest.status === 'completed') {
      // Create started event
      const startTime = new Date(questTime.getTime() + 10 * 60 * 1000);
      events.push({
        id: `${quest.id}-started-${storeId}`,
        type: 'decision',
        storeId,
        timestamp: startTime.toISOString(),
        action: 'started',
        proposalId: quest.id,
        title: quest.title,
        description: `タスク開始: ${quest.title}`,
        reason: 'スタッフ着手',
        expectedEffect: 'labor-savings',
        distributedToRoles: ['kitchen', 'floor'],
        estimatedMinutes: quest.estimatedMin,
      });
      timeOffset += quest.estimatedMin;
    }
    
    if (quest.status === 'completed' && quest.actualMin !== null) {
      // Create completed event
      const completeTime = new Date(questTime.getTime() + (10 + quest.actualMin) * 60 * 1000);
      events.push({
        id: `${quest.id}-completed-${storeId}`,
        type: 'decision',
        storeId,
        timestamp: completeTime.toISOString(),
        action: 'completed',
        proposalId: quest.id,
        title: quest.title,
        description: `タスク完了: ${quest.title}`,
        reason: 'スタッフ完了報告',
        expectedEffect: 'labor-savings',
        distributedToRoles: ['kitchen', 'floor'],
        estimatedMinutes: quest.estimatedMin,
        actualMinutes: quest.actualMin,
      });
      timeOffset += 5;
    }
  }
  
  return events;
};

// ------------------------------------------------------------
// Generate Labor Events for Daily Score Testing
// ------------------------------------------------------------

const generateLaborEvents = (storeId: string, staff: Staff[]): DomainEvent[] => {
  const events: DomainEvent[] = [];
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  // Get staff for this store
  const storeStaff = staff.filter(s => s.storeId === storeId);
  
  // Generate labor events for each staff member
  for (const member of storeStaff) {
    // Check-in at 9:00 AM
    const checkInTime = new Date(`${today}T09:00:00`);
    
    // Only generate events if check-in time is in the past
    if (checkInTime <= now) {
      events.push({
        id: `labor-checkin-${member.id}-${today}`,
        type: 'labor',
        storeId,
        timestamp: checkInTime.toISOString(),
        staffId: member.id,
        action: 'check-in',
      });
      
      // Break at 12:30 (if past that time)
      const breakStartTime = new Date(`${today}T12:30:00`);
      if (breakStartTime <= now) {
        events.push({
          id: `labor-breakstart-${member.id}-${today}`,
          type: 'labor',
          storeId,
          timestamp: breakStartTime.toISOString(),
          staffId: member.id,
          action: 'break-start',
        });
        
        // Break end at 13:00 (if past that time)
        const breakEndTime = new Date(`${today}T13:00:00`);
        if (breakEndTime <= now) {
          events.push({
            id: `labor-breakend-${member.id}-${today}`,
            type: 'labor',
            storeId,
            timestamp: breakEndTime.toISOString(),
            staffId: member.id,
            action: 'break-end',
          });
        }
      }
      
      // Check-out at 17:30 for some staff (simulating completed shifts)
      // Only for first 2 staff members to show variety
      const checkOutTime = new Date(`${today}T17:30:00`);
      if (checkOutTime <= now && storeStaff.indexOf(member) < 2) {
        events.push({
          id: `labor-checkout-${member.id}-${today}`,
          type: 'labor',
          storeId,
          timestamp: checkOutTime.toISOString(),
          staffId: member.id,
          action: 'check-out',
        });
      }
    }
  }
  
  return events;
};

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

  // Generate sample incidents for the first store (demo)
  const sampleIncidents = generateSampleIncidents('1');

  return {
    stores: STORES,
    staff: STAFF,
    roles: ROLES,
    menus: MENUS,
    prepItems: PREP_ITEMS,
    events: allEvents,
    incidents: sampleIncidents,
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

// ------------------------------------------------------------
// Menu Sales Time Series (for demand drop detection)
// ------------------------------------------------------------

export type SalesChannel = 'dine-in' | 'takeout' | 'delivery';

export interface MenuSalesRecord {
  menuId: string;
  date: string; // YYYY-MM-DD
  timeBand: 'lunch' | 'idle' | 'dinner';
  channel: SalesChannel;
  qty: number;
}

// Generate mock menu sales history for the past 10 days
export const generateMenuSalesHistory = (storeId: string): MenuSalesRecord[] => {
  const records: MenuSalesRecord[] = [];
  const today = new Date();
  const menuIds = ['menu-1', 'menu-2', 'menu-3', 'menu-4', 'menu-5'];
  const channels: SalesChannel[] = ['dine-in', 'takeout', 'delivery'];
  const timeBands: Array<'lunch' | 'idle' | 'dinner'> = ['lunch', 'idle', 'dinner'];

  // Base quantities for each menu (typical daily sales)
  const baseQty: Record<string, number> = {
    'menu-1': 25, // 熟成まぐろ握り
    'menu-2': 30, // 炙りサーモン握り - will have demand drop
    'menu-3': 12, // 特選うに軍艦
    'menu-4': 18, // 玉子焼き
    'menu-5': 8,  // 特上盛り合わせ
  };

  // Channel distribution (typical)
  const channelDist: Record<SalesChannel, number> = {
    'dine-in': 0.6,
    'takeout': 0.25,
    'delivery': 0.15,
  };

  // Time band distribution
  const timeBandDist: Record<string, number> = {
    'lunch': 0.35,
    'idle': 0.15,
    'dinner': 0.50,
  };

  for (let dayOffset = 10; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = [0, 6].includes(date.getDay());
    const weekendMultiplier = isWeekend ? 1.3 : 1.0;

    for (const menuId of menuIds) {
      // Apply demand drop for menu-2 (炙りサーモン握り) in last 3 days
      let dropMultiplier = 1.0;
      if (menuId === 'menu-2' && dayOffset <= 2) {
        dropMultiplier = 0.55; // 45% drop
      }

      for (const timeBand of timeBands) {
        for (const channel of channels) {
          const base = baseQty[menuId] || 10;
          const qty = Math.round(
            base *
            weekendMultiplier *
            dropMultiplier *
            timeBandDist[timeBand] *
            channelDist[channel] *
            (0.8 + Math.random() * 0.4) // Add some variance
          );

          if (qty > 0) {
            records.push({
              menuId,
              date: dateStr,
              timeBand,
              channel,
              qty,
            });
          }
        }
      }
    }
  }

  return records;
};

// Get menu sales history (cached per store)
const menuSalesCache: Record<string, MenuSalesRecord[]> = {};

export const getMenuSalesHistory = (storeId: string): MenuSalesRecord[] => {
  if (!menuSalesCache[storeId]) {
    menuSalesCache[storeId] = generateMenuSalesHistory(storeId);
  }
  return menuSalesCache[storeId];
};
