// ============================================================
// All Management + All OS - Core Types
// Single source of truth for all type definitions
// ============================================================

// ------------------------------------------------------------
// Master Data Types
// ------------------------------------------------------------

export type TimeBand = 'all' | 'lunch' | 'idle' | 'dinner';

export interface Store {
  id: string;
  name: string;
  code: string;
}

export interface Staff {
  id: string;
  name: string;
  roleId: string;
  storeId: string;
}

export interface Role {
  id: string;
  name: string;
  code: string; // e.g., 'manager', 'kitchen', 'floor', 'delivery'
}

export interface Menu {
  id: string;
  name: string;
  price: number;
  category: string;
  prepTimeMinutes: number;
}

export interface PrepItem {
  id: string;
  name: string;
  menuIds: string[];
  defaultQuantity: number;
  unit: string;
}

// ------------------------------------------------------------
// Event Types (Union - Single Source of Truth)
// ------------------------------------------------------------

export type EventType =
  | 'sales'
  | 'labor'
  | 'prep'
  | 'delivery'
  | 'decision'
  | 'forecast';

export interface BaseEvent {
  id: string;
  type: EventType;
  storeId: string;
  timestamp: string; // ISO 8601
  timeBand: TimeBand;
}

export interface SalesEvent extends BaseEvent {
  type: 'sales';
  menuId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface LaborEvent extends BaseEvent {
  type: 'labor';
  staffId: string;
  action: 'check-in' | 'check-out' | 'break-start' | 'break-end';
}

export interface PrepEvent extends BaseEvent {
  type: 'prep';
  prepItemId: string;
  quantity: number;
  status: 'planned' | 'started' | 'completed' | 'cancelled';
  assignedStaffId?: string;
  decisionId?: string; // Link to originating decision
}

export interface DeliveryEvent extends BaseEvent {
  type: 'delivery';
  supplierId: string;
  itemName: string;
  expectedAt: string;
  actualAt?: string;
  status: 'scheduled' | 'delayed' | 'arrived' | 'cancelled';
  delayMinutes?: number;
}

export interface DecisionEvent extends BaseEvent {
  type: 'decision';
  proposalId: string;
  action: 'approved' | 'rejected' | 'pending' | 'started' | 'paused' | 'completed';
  title: string;
  description: string;
  distributedToRoles: string[]; // Role IDs
  targetMenuIds?: string[];
  targetPrepItemIds?: string[];
  quantity?: number;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedMinutes?: number;
  linkedExceptionId?: string;
  // Completion result fields
  actualQuantity?: number;
  actualMinutes?: number;
  delayReason?: string;
  hasIssue?: boolean;
  issueNote?: string;
}

export interface ForecastEvent extends BaseEvent {
  type: 'forecast';
  date: string; // YYYY-MM-DD
  forecastCustomers: number;
  avgSpend: number;
  forecastSales: number; // Auto-calculated: forecastCustomers * avgSpend
}

export type DomainEvent =
  | SalesEvent
  | LaborEvent
  | PrepEvent
  | DeliveryEvent
  | DecisionEvent
  | ForecastEvent;

// ------------------------------------------------------------
// Proposal Types (Rule-generated suggestions)
// ------------------------------------------------------------

export type ProposalType =
  | 'menu-restriction'
  | 'prep-reorder'
  | 'help-request'
  | 'scope-reduction'
  | 'high-margin-priority'
  | 'extra-prep';

export interface Proposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  reason: string;
  triggeredBy: string; // Event ID that triggered this
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  // Editable fields
  targetMenuIds: string[];
  targetPrepItemIds: string[];
  quantity: number;
  distributedToRoles: string[];
  deadline: string;
  storeId: string;
  timeBand: TimeBand;
}

// ------------------------------------------------------------
// Derived State Types (Computed from Events)
// ------------------------------------------------------------

export interface DailySalesMetrics {
  date: string;
  timeBand: TimeBand;
  forecastCustomers: number;
  forecastSales: number;
  actualCustomers: number;
  actualSales: number;
  achievementRate: number; // actualSales / forecastSales * 100
}

export interface LaborMetrics {
  activeStaffCount: number;
  onBreakCount: number;
  totalHoursToday: number;
  laborCostEstimate: number;
}

export interface PrepMetrics {
  plannedCount: number;
  inProgressCount: number;
  completedCount: number;
  completionRate: number;
}

export type ExceptionStatus = 'unhandled' | 'proposal-created' | 'ongoing' | 'resolved';
export type ImpactType = 'stockout' | 'delay' | 'excess' | 'quality';
export type ImpactSeverity = 'high' | 'medium' | 'low';

export interface ExceptionImpact {
  timeBand: TimeBand;
  affectedItems: Array<{ id: string; name: string; type: 'prep' | 'menu' }>;
  impactType: ImpactType;
  impactSeverity: ImpactSeverity;
}

export interface ExceptionItem {
  id: string;
  type: 'delivery-delay' | 'staff-shortage' | 'demand-surge' | 'prep-behind';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  relatedEventId: string;
  detectedAt: string;
  resolved: boolean;
  status: ExceptionStatus;
  impact: ExceptionImpact;
  linkedProposalId?: string;
}

export interface CockpitMetrics {
  sales: {
    forecast: number;
    actual: number;
    achievementRate: number;
    trend: 'up' | 'down' | 'stable';
  };
  labor: LaborMetrics;
  supplyDemand: {
    status: 'balanced' | 'oversupply' | 'undersupply';
    score: number; // 0-100
  };
  operations: PrepMetrics;
  exceptions: {
    count: number;
    criticalCount: number;
  };
}

// ------------------------------------------------------------
// Enhanced Cockpit Types
// ------------------------------------------------------------

export interface SalesKPI {
  actual: number;
  forecast: number;
  diff: number;
  landingEstimate: { min: number; max: number };
  achievementRate: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdate: string;
}

export interface LaborKPI {
  actualCost: number;
  estimatedLaborRate: number;
  salesPerLaborCost: number;
  plannedHours: number;
  actualHours: number;
  breakCount: number;
  lastUpdate: string;
}

export interface SupplyDemandKPI {
  stockoutRisk: number;
  excessRisk: number;
  topItems: Array<{ name: string; risk: 'stockout' | 'excess' }>;
  lastUpdate: string;
}

export interface OperationsKPI {
  delayedCount: number;
  completionRate: number;
  bottleneck: { task: string; reason: string } | null;
  lastUpdate: string;
}

export interface ExceptionsKPI {
  criticalCount: number;
  warningCount: number;
  topException: { title: string; impact: string; impactType: 'sales' | 'stockout' } | null;
  lastUpdate: string;
}

export interface EnhancedCockpitMetrics {
  sales: SalesKPI;
  labor: LaborKPI;
  supplyDemand: SupplyDemandKPI;
  operations: OperationsKPI;
  exceptions: ExceptionsKPI;
}

export type TimelineLane = 'sales' | 'forecast' | 'prep' | 'delivery' | 'labor' | 'decision';

export interface TimelineEvent {
  id: string;
  lane: TimelineLane;
  timestamp: string;
  title: string;
  description: string;
  status?: 'normal' | 'warning' | 'critical' | 'success';
  originalEvent: DomainEvent;
}

export interface ShiftPlanEntry {
  staffId: string;
  staffName: string;
  roleId: string;
  roleName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed';
}

// ------------------------------------------------------------
// Application State
// ------------------------------------------------------------

export interface AppState {
  // Master data
  stores: Store[];
  staff: Staff[];
  roles: Role[];
  menus: Menu[];
  prepItems: PrepItem[];

  // Event log (single source of truth)
  events: DomainEvent[];

  // UI state
  selectedStoreId: string | null;
  selectedTimeBand: TimeBand;
  selectedMonth: string; // YYYY-MM

  // Proposals (generated from rules)
  proposals: Proposal[];

  // Replay state
  replay: {
    isPlaying: boolean;
    isPaused: boolean;
    currentIndex: number;
    pendingEvents: DomainEvent[];
  };

  // Highlight tracking
  lastChangedKeys: string[];
  highlightUntil: number | null;
}

// ------------------------------------------------------------
// Action Types (for Reducer)
// ------------------------------------------------------------

export type AppAction =
  | { type: 'SET_STORE'; storeId: string }
  | { type: 'SET_TIME_BAND'; timeBand: TimeBand }
  | { type: 'SET_MONTH'; month: string }
  | { type: 'ADD_EVENT'; event: DomainEvent }
  | { type: 'ADD_EVENTS'; events: DomainEvent[] }
  | { type: 'SET_PROPOSALS'; proposals: Proposal[] }
  | { type: 'UPDATE_PROPOSAL'; proposal: Proposal }
  | { type: 'REMOVE_PROPOSAL'; proposalId: string }
  | { type: 'REPLAY_START'; events: DomainEvent[] }
  | { type: 'REPLAY_STEP' }
  | { type: 'REPLAY_PLAY' }
  | { type: 'REPLAY_PAUSE' }
  | { type: 'REPLAY_RESET' }
  | { type: 'CLEAR_HIGHLIGHT' }
  | { type: 'LOAD_INITIAL_DATA'; data: Partial<AppState> };
