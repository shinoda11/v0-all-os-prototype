'use client';

// ============================================================
// All OS - Repository Layer
// Provides localStorage persistence with cross-tab synchronization
// ============================================================

import type { AppState, Staff, DomainEvent, Proposal, Incident, TaskCard, TaskCategory, BoxTemplate } from './types';

// Storage key for the entire app state
const STORAGE_KEY = 'all_os_store_v1';

// Type for subscription callback
type StateChangeCallback = (state: AppState) => void;

// Subscribers list
const subscribers: Set<StateChangeCallback> = new Set();

// ============================================================
// Core Repository Functions
// ============================================================

/**
 * Load state from localStorage
 * Returns null if no state exists
 */
export function loadState(): AppState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    
    const parsed = JSON.parse(serialized);
    return parsed as AppState;
  } catch (error) {
    console.error('[repo] Failed to load state from localStorage:', error);
    return null;
  }
}

/**
 * Save state to localStorage and notify subscribers
 */
export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    
    // Notify all subscribers in this tab
    notifySubscribers(state);
  } catch (error) {
    console.error('[repo] Failed to save state to localStorage:', error);
  }
}

/**
 * Subscribe to state changes (both same-tab and cross-tab)
 * Returns an unsubscribe function
 */
export function subscribe(callback: StateChangeCallback): () => void {
  subscribers.add(callback);
  
  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Notify all subscribers of state change
 */
function notifySubscribers(state: AppState): void {
  subscribers.forEach((callback) => {
    try {
      callback(state);
    } catch (error) {
      console.error('[repo] Subscriber callback error:', error);
    }
  });
}

/**
 * Setup cross-tab synchronization via storage event
 * Call this once when the app initializes
 */
export function setupCrossTabSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const newState = JSON.parse(event.newValue) as AppState;
        notifySubscribers(newState);
      } catch (error) {
        console.error('[repo] Failed to parse cross-tab state update:', error);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageEvent);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Clear all stored state (for debugging/reset)
 */
export function clearState(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[repo] Failed to clear state:', error);
  }
}

// ============================================================
// Seed Demo Data
// Creates initial demo data for prototyping
// ============================================================

/**
 * Create demo staff members with stars and hourly rates
 */
export function createDemoStaff(): Staff[] {
  return [
    { id: 'staff-1', name: '田中太郎', roleId: 'manager', storeId: '1', starLevel: 3, wage: 1500 },
    { id: 'staff-2', name: '鈴木花子', roleId: 'kitchen', storeId: '1', starLevel: 2, wage: 1200 },
    { id: 'staff-3', name: '佐藤健一', roleId: 'kitchen', storeId: '1', starLevel: 3, wage: 1350 },
    { id: 'staff-4', name: '山田美咲', roleId: 'floor', storeId: '1', starLevel: 1, wage: 1100 },
    { id: 'staff-5', name: '高橋翔太', roleId: 'floor', storeId: '1', starLevel: 2, wage: 1200 },
    { id: 'staff-6', name: '伊藤さくら', roleId: 'delivery', storeId: '1', starLevel: 1, wage: 1100 },
  ];
}

/**
 * Create demo task categories
 */
export function createDemoCategories(): TaskCategory[] {
  return [
    { id: 'cat-prep', name: '仕込み' },
    { id: 'cat-clean', name: '清掃' },
    { id: 'cat-stock', name: '在庫管理' },
    { id: 'cat-service', name: 'サービス' },
  ];
}

/**
 * Create demo task cards (quest templates)
 */
export function createDemoTaskCards(): TaskCard[] {
  return [
    // Prep tasks
    { 
      id: 'task-1', categoryId: 'cat-prep', name: '野菜カット（朝仕込み）', 
      role: 'kitchen', starRequirement: 2, standardMinutes: 30, 
      quantityMode: 'byForecast', baseQuantity: 10, coefficient: 1.2,
      qualityCheck: 'photo', xpReward: 50, enabled: true 
    },
    { 
      id: 'task-2', categoryId: 'cat-prep', name: 'スープ仕込み', 
      role: 'kitchen', starRequirement: 3, standardMinutes: 45, 
      quantityMode: 'fixed', baseQuantity: 20, coefficient: 1,
      qualityCheck: 'none', xpReward: 60, enabled: true 
    },
    { 
      id: 'task-3', categoryId: 'cat-prep', name: 'デザート準備', 
      role: 'kitchen', starRequirement: 1, standardMinutes: 20, 
      quantityMode: 'byForecast', baseQuantity: 15, coefficient: 0.8,
      qualityCheck: 'none', xpReward: 30, enabled: true 
    },
    // Cleaning tasks
    { 
      id: 'task-4', categoryId: 'cat-clean', name: 'フロア清掃', 
      role: 'floor', starRequirement: 1, standardMinutes: 15, 
      quantityMode: 'fixed', baseQuantity: 1, coefficient: 1,
      qualityCheck: 'photo', xpReward: 20, enabled: true 
    },
    { 
      id: 'task-5', categoryId: 'cat-clean', name: 'キッチン清掃', 
      role: 'kitchen', starRequirement: 1, standardMinutes: 20, 
      quantityMode: 'fixed', baseQuantity: 1, coefficient: 1,
      qualityCheck: 'photo', xpReward: 25, enabled: true 
    },
    { 
      id: 'task-6', categoryId: 'cat-clean', name: 'トイレ清掃', 
      role: 'floor', starRequirement: 1, standardMinutes: 10, 
      quantityMode: 'fixed', baseQuantity: 1, coefficient: 1,
      qualityCheck: 'photo', xpReward: 15, enabled: true 
    },
    // Stock tasks
    { 
      id: 'task-7', categoryId: 'cat-stock', name: '在庫確認', 
      role: 'kitchen', starRequirement: 2, standardMinutes: 15, 
      quantityMode: 'fixed', baseQuantity: 1, coefficient: 1,
      qualityCheck: 'none', xpReward: 20, enabled: true 
    },
    { 
      id: 'task-8', categoryId: 'cat-stock', name: '発注作成', 
      role: 'kitchen', starRequirement: 3, standardMinutes: 20, 
      quantityMode: 'fixed', baseQuantity: 1, coefficient: 1,
      qualityCheck: 'none', xpReward: 40, enabled: true 
    },
    // Service tasks
    { 
      id: 'task-9', categoryId: 'cat-service', name: 'テーブルセッティング', 
      role: 'floor', starRequirement: 1, standardMinutes: 10, 
      quantityMode: 'byOrders', baseQuantity: 5, coefficient: 0.5,
      qualityCheck: 'none', xpReward: 15, enabled: true 
    },
    { 
      id: 'task-10', categoryId: 'cat-service', name: 'デリバリー配達', 
      role: 'runner', starRequirement: 1, standardMinutes: 25, 
      quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1,
      qualityCheck: 'none', xpReward: 35, enabled: true 
    },
    // Peak task (urgent POS order interrupt)
    {
      id: 'task-peak-1', categoryId: 'cat-service', name: 'Order: Salmon Nigiri x 4',
      role: 'kitchen', starRequirement: 1, standardMinutes: 3,
      quantityMode: 'fixed', baseQuantity: 4, coefficient: 1,
      qualityCheck: 'none', xpReward: 40, enabled: true,
      isPeak: true,
    },
  ];
}

/**
 * Create demo box templates
 */
export function createDemoBoxTemplates(): BoxTemplate[] {
  return [
    {
      id: 'box-lunch-basic',
      name: 'ランチ基本セット',
      timeBand: 'lunch',
      taskCardIds: ['task-1', 'task-2', 'task-4', 'task-9'],
      boxRule: { type: 'always' },
      enabled: true,
      description: 'ランチ帯の必須タスク（仕込み・清掃・セッティング）',
    },
    {
      id: 'box-lunch-busy',
      name: 'ランチ繁忙セット',
      timeBand: 'lunch',
      taskCardIds: ['task-3', 'task-7', 'task-10'],
      boxRule: { type: 'salesRange', minSales: 200000 },
      enabled: true,
      description: '売上20万円以上のランチ帯追加タスク',
    },
    {
      id: 'box-dinner-basic',
      name: 'ディナー基本セット',
      timeBand: 'dinner',
      taskCardIds: ['task-1', 'task-2', 'task-5', 'task-6'],
      boxRule: { type: 'always' },
      enabled: true,
      description: 'ディナー帯の必須タスク（仕込み・清掃）',
    },
    {
      id: 'box-dinner-busy',
      name: 'ディナー繁忙セット',
      timeBand: 'dinner',
      taskCardIds: ['task-3', 'task-7', 'task-8'],
      boxRule: { type: 'salesRange', minSales: 250000 },
      enabled: true,
      description: '売上25万円以上のディナー帯追加タスク',
    },
  ];
}

/**
 * Create today's quest instances from task cards
 */
export function createTodayPlanFromTemplates(
  taskCards: TaskCard[],
  storeId: string,
  date: string
): DomainEvent[] {
  const questEvents: DomainEvent[] = [];
  // Exclude peak tasks from the daily plan (they are created on-demand via Simulate Order)
  const enabledTasks = taskCards.filter(t => t.enabled && !t.isPeak);
  
  for (const task of enabledTasks) {
    // Create a pending decision event for each task card
    const questEvent: DomainEvent = {
      id: `quest-${task.id}-${date}-${Date.now()}`,
      type: 'decision',
      storeId,
      timestamp: new Date().toISOString(),
      timeBand: 'all',
      proposalId: `plan-${task.id}-${date}`,
      action: 'pending',
      title: task.name,
      description: `標準時間: ${task.standardMinutes}分 / XP: ${task.xpReward}`,
      distributedToRoles: [task.role],
      priority: 'medium',
      estimatedMinutes: task.standardMinutes,
      source: 'system',
      // refId-based linking (replaces title matching)
      refId: task.id,
      targetValue: task.baseQuantity,
    };
    questEvents.push(questEvent);
  }
  
  return questEvents;
}

/**
 * Seed demo data - creates staff, task templates, and today's plan
 * Returns partial state to merge with existing state
 */
export function seedDemoData(storeId: string = '1'): Partial<AppState> {
  const today = new Date().toISOString().split('T')[0];
  
  const staff = createDemoStaff();
  const taskCategories = createDemoCategories();
  const taskCards = createDemoTaskCards();
  const boxTemplates = createDemoBoxTemplates();
  const todayQuests = createTodayPlanFromTemplates(taskCards, storeId, today);
  
  return {
    staff,
    taskCategories,
    taskCards,
    boxTemplates,
    events: todayQuests,
  };
}

/**
 * Check if demo data needs to be seeded
 */
export function needsSeedData(state: AppState | null): boolean {
  if (!state) return true;
  if (!state.staff || state.staff.length === 0) return true;
  if (!state.taskCards || state.taskCards.length === 0) return true;
  return false;
}
