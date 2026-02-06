// ============================================================
// All Management + All OS - Commands
// ONLY place where events are created (CQRS Write Side)
// ============================================================

import type {
  DomainEvent,
  SalesEvent,
  LaborEvent,
  PrepEvent,
  DeliveryEvent,
  DecisionEvent,
  ForecastEvent,
  TimeBand,
  Proposal,
} from './types';

// ------------------------------------------------------------
// Helper: Create Proposal from DecisionEvent
// ------------------------------------------------------------

export const proposalFromDecision = (decision: DecisionEvent): Proposal => ({
  id: decision.proposalId,
  type: 'extra-prep',
  title: decision.title,
  description: decision.description,
  reason: '',
  triggeredBy: '',
  priority: decision.priority,
  createdAt: decision.timestamp,
  targetMenuIds: decision.targetMenuIds || [],
  targetPrepItemIds: decision.targetPrepItemIds || [],
  quantity: decision.quantity || 0,
  distributedToRoles: decision.distributedToRoles,
  deadline: decision.deadline || '',
  storeId: decision.storeId,
  timeBand: decision.timeBand,
});

// Helper to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to get current ISO timestamp
const now = (): string => new Date().toISOString();

// Helper to determine time band from hour
export const getTimeBandFromHour = (hour: number): TimeBand => {
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'idle';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'all';
};

// ------------------------------------------------------------
// Sales Commands
// ------------------------------------------------------------

export const recordSale = (
  storeId: string,
  menuId: string,
  quantity: number,
  unitPrice: number,
  timeBand?: TimeBand
): SalesEvent => {
  const timestamp = now();
  const hour = new Date(timestamp).getHours();
  return {
    id: generateId(),
    type: 'sales',
    storeId,
    timestamp,
    timeBand: timeBand ?? getTimeBandFromHour(hour),
    menuId,
    quantity,
    unitPrice,
    total: quantity * unitPrice,
  };
};

// ------------------------------------------------------------
// Labor Commands
// ------------------------------------------------------------

export const recordLaborAction = (
  storeId: string,
  staffId: string,
  action: LaborEvent['action']
): LaborEvent => {
  const timestamp = now();
  const hour = new Date(timestamp).getHours();
  return {
    id: generateId(),
    type: 'labor',
    storeId,
    timestamp,
    timeBand: getTimeBandFromHour(hour),
    staffId,
    action,
  };
};

export const checkIn = (storeId: string, staffId: string): LaborEvent =>
  recordLaborAction(storeId, staffId, 'check-in');

export const checkOut = (storeId: string, staffId: string): LaborEvent =>
  recordLaborAction(storeId, staffId, 'check-out');

export const startBreak = (storeId: string, staffId: string): LaborEvent =>
  recordLaborAction(storeId, staffId, 'break-start');

export const endBreak = (storeId: string, staffId: string): LaborEvent =>
  recordLaborAction(storeId, staffId, 'break-end');

// ------------------------------------------------------------
// Prep Commands
// ------------------------------------------------------------

export const recordPrep = (
  storeId: string,
  prepItemId: string,
  quantity: number,
  status: PrepEvent['status'],
  assignedStaffId?: string,
  decisionId?: string
): PrepEvent => {
  const timestamp = now();
  const hour = new Date(timestamp).getHours();
  return {
    id: generateId(),
    type: 'prep',
    storeId,
    timestamp,
    timeBand: getTimeBandFromHour(hour),
    prepItemId,
    quantity,
    status,
    assignedStaffId,
    decisionId,
  };
};

export const planPrep = (
  storeId: string,
  prepItemId: string,
  quantity: number,
  assignedStaffId?: string
): PrepEvent => recordPrep(storeId, prepItemId, quantity, 'planned', assignedStaffId);

export const startPrep = (
  storeId: string,
  prepItemId: string,
  quantity: number,
  assignedStaffId?: string,
  decisionId?: string
): PrepEvent => recordPrep(storeId, prepItemId, quantity, 'started', assignedStaffId, decisionId);

export const completePrep = (
  storeId: string,
  prepItemId: string,
  quantity: number,
  assignedStaffId?: string,
  decisionId?: string
): PrepEvent => recordPrep(storeId, prepItemId, quantity, 'completed', assignedStaffId, decisionId);

// ------------------------------------------------------------
// Delivery Commands
// ------------------------------------------------------------

export const recordDelivery = (
  storeId: string,
  supplierId: string,
  itemName: string,
  expectedAt: string,
  status: DeliveryEvent['status'],
  actualAt?: string,
  delayMinutes?: number
): DeliveryEvent => {
  const timestamp = now();
  const hour = new Date(timestamp).getHours();
  return {
    id: generateId(),
    type: 'delivery',
    storeId,
    timestamp,
    timeBand: getTimeBandFromHour(hour),
    supplierId,
    itemName,
    expectedAt,
    actualAt,
    status,
    delayMinutes,
  };
};

export const scheduleDelivery = (
  storeId: string,
  supplierId: string,
  itemName: string,
  expectedAt: string
): DeliveryEvent => recordDelivery(storeId, supplierId, itemName, expectedAt, 'scheduled');

export const markDeliveryDelayed = (
  storeId: string,
  supplierId: string,
  itemName: string,
  expectedAt: string,
  delayMinutes: number
): DeliveryEvent =>
  recordDelivery(storeId, supplierId, itemName, expectedAt, 'delayed', undefined, delayMinutes);

export const markDeliveryArrived = (
  storeId: string,
  supplierId: string,
  itemName: string,
  expectedAt: string,
  actualAt: string
): DeliveryEvent => recordDelivery(storeId, supplierId, itemName, expectedAt, 'arrived', actualAt);

// ------------------------------------------------------------
// Decision Commands
// ------------------------------------------------------------

export interface DecisionActorInfo {
  assigneeId?: string;
  assigneeName?: string;
}

export const createDecision = (
  storeId: string,
  proposal: Proposal,
  action: DecisionEvent['action'],
  actor?: DecisionActorInfo
): DecisionEvent => {
  const timestamp = now();
  const hour = new Date(timestamp).getHours();
  return {
    id: generateId(),
    type: 'decision',
    storeId,
    timestamp,
    timeBand: proposal.timeBand ?? getTimeBandFromHour(hour),
    proposalId: proposal.id,
    action,
    title: proposal.title,
    description: proposal.description,
    distributedToRoles: proposal.distributedToRoles,
    targetMenuIds: proposal.targetMenuIds,
    targetPrepItemIds: proposal.targetPrepItemIds,
    quantity: proposal.quantity,
    deadline: proposal.deadline,
    priority: proposal.priority,
    // Assignee tracking: prefer existing proposal-level assignee, then actor
    assigneeId: actor?.assigneeId,
    assigneeName: actor?.assigneeName,
    // Source tracking for incentive abuse prevention
    source: proposal.source ?? 'system',
    managerApprovedForPoints: proposal.managerApprovedForPoints,
  };
};

export const approveProposal = (storeId: string, proposal: Proposal, actor?: DecisionActorInfo): DecisionEvent =>
  createDecision(storeId, proposal, 'approved', actor);

export const rejectProposal = (storeId: string, proposal: Proposal): DecisionEvent =>
  createDecision(storeId, proposal, 'rejected');

export const startDecision = (storeId: string, proposal: Proposal, actor?: DecisionActorInfo): DecisionEvent =>
  createDecision(storeId, proposal, 'started', actor);

export const completeDecision = (storeId: string, proposal: Proposal, actor?: DecisionActorInfo): DecisionEvent =>
  createDecision(storeId, proposal, 'completed', actor);

// ------------------------------------------------------------
// Forecast Commands
// ------------------------------------------------------------

export const upsertForecast = (
  storeId: string,
  date: string,
  timeBand: TimeBand,
  forecastCustomers: number,
  avgSpend: number
): ForecastEvent => {
  return {
    id: generateId(),
    type: 'forecast',
    storeId,
    timestamp: now(),
    timeBand,
    date,
    forecastCustomers,
    avgSpend,
    forecastSales: forecastCustomers * avgSpend,
  };
};
