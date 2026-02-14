'use client';

// ============================================================
// All OS - Repository Layer
// Provides localStorage persistence with cross-tab synchronization
// ============================================================

import type { AppState, Staff, DomainEvent, Proposal, Incident, TaskCard, TaskCategory, BoxTemplate } from './types';
import { TASK_CARDS as SEED_TASK_CARDS, TASK_CATEGORIES as SEED_TASK_CATEGORIES, BOX_TEMPLATES as SEED_BOX_TEMPLATES } from '@/data/taskCardSeed';

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
  // Use real seed data (157 cards, 12 categories) instead of old demo stubs
  const taskCategories = SEED_TASK_CATEGORIES;
  const taskCards = SEED_TASK_CARDS;
  const boxTemplates = SEED_BOX_TEMPLATES;
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
