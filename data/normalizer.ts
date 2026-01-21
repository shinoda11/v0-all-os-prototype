// ============================================================
// Event Normalizer
// Converts external IDs to internal IDs
// ============================================================

import type { DomainEvent, Staff } from '@/core/types';

// Store ID mapping: external -> internal
const STORE_ID_MAP: Record<string, string> = {
  store_futakotamagawa: '1',
  store_jiyugaoka: '2',
  store_toyosu: '3',
  store_komazawa: '4',
};

// Staff ID mapping: external -> internal
const STAFF_ID_MAP: Record<string, string> = {
  staff_tanaka: 'staff-1',
  staff_suzuki: 'staff-2',
  staff_sato: 'staff-3',
  staff_yamada: 'staff-4',
  staff_takahashi: 'staff-5',
  staff_ito: 'staff-6',
  staff_nakamura: 'staff-7',
  staff_kobayashi: 'staff-8',
  staff_kato: 'staff-9',
};

/**
 * Normalize a store ID from external format to internal format
 */
export function normalizeStoreId(externalId: string): string {
  return STORE_ID_MAP[externalId] ?? externalId;
}

/**
 * Normalize a staff ID from external format to internal format
 */
export function normalizeStaffId(externalId: string): string {
  return STAFF_ID_MAP[externalId] ?? externalId;
}

/**
 * Normalize staff records from JSON
 */
export function normalizeStaff(
  staff: Array<{ id: string; name: string; roleId: string; storeId: string }>
): Staff[] {
  return staff.map((s) => ({
    id: normalizeStaffId(s.id),
    name: s.name,
    roleId: s.roleId,
    storeId: normalizeStoreId(s.storeId),
  }));
}

/**
 * Normalize a single event from JSON format to internal format
 */
export function normalizeEvent(event: Record<string, unknown>): DomainEvent {
  const base = {
    ...event,
    storeId: normalizeStoreId(event.storeId as string),
  };

  // Handle labor events with staffId
  if (event.type === 'labor' && event.staffId) {
    return {
      ...base,
      staffId: normalizeStaffId(event.staffId as string),
    } as DomainEvent;
  }

  // Handle prep events with assignedStaffId
  if (event.type === 'prep' && event.assignedStaffId) {
    return {
      ...base,
      assignedStaffId: normalizeStaffId(event.assignedStaffId as string),
    } as DomainEvent;
  }

  return base as DomainEvent;
}

/**
 * Normalize an array of events from JSON format to internal format
 */
export function normalizeEvents(events: Array<Record<string, unknown>>): DomainEvent[] {
  return events.map(normalizeEvent);
}
