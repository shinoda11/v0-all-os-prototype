// ============================================================
// All Management + All OS - Core Types
// Single source of truth for all type definitions
// ============================================================

// ------------------------------------------------------------
// User Role Types (RBAC)
// ------------------------------------------------------------

export type UserRole = 'staff' | 'manager' | 'sv';

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  storeId: string;
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  staff: 1,
  manager: 2,
  sv: 3,
};

// Check if user has at least the required role level
export const hasRoleLevel = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

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
  starLevel: 1 | 2 | 3; // Skill level
  wage: number; // Hourly wage in yen
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
  | 'forecast'
  | 'order';

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
  // Assignee tracking
  assigneeId?: string; // Staff ID of assigned person
  assigneeName?: string; // Staff name for display
  // Source tracking for incentive abuse prevention
  source?: 'system' | 'manager' | 'ad-hoc'; // system=auto-generated, manager=assigned, ad-hoc=self-created
  managerApprovedForPoints?: boolean; // true if manager approved ad-hoc quest for points
  // Completion result fields
  actualQuantity?: number;
  actualMinutes?: number;
  delayReason?: string;
  hasIssue?: boolean;
  issueNote?: string;
  // Quality flag (OK/NG) for completion quality tracking
  qualityStatus?: 'ok' | 'ng';
  qualityNote?: string;
  // Pause tracking
  pausedAt?: string;
  pauseReason?: string;
}

export interface ForecastEvent extends BaseEvent {
  type: 'forecast';
  date: string; // YYYY-MM-DD
  forecastCustomers: number;
  avgSpend: number;
  forecastSales: number; // Auto-calculated: forecastCustomers * avgSpend
}

// Order event for POS urgent orders (interrupt handling)
export interface OrderEvent extends BaseEvent {
  type: 'order';
  orderId: string;
  menuItemName: string;
  quantity: number;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  slaMinutes: number; // SLA target (e.g., 3 minutes)
  startedAt?: string;
  completedAt?: string;
}

export type DomainEvent =
  | SalesEvent
  | LaborEvent
  | PrepEvent
  | DeliveryEvent
  | DecisionEvent
  | ForecastEvent
  | OrderEvent;

// ------------------------------------------------------------
// Proposal Types (Rule-generated suggestions)
// ------------------------------------------------------------

export type ProposalType =
  | 'menu-restriction'
  | 'prep-reorder'
  | 'help-request'
  | 'scope-reduction'
  | 'high-margin-priority'
  | 'extra-prep'
  // Demand drop specific actions
  | 'prep-amount-adjust'
  | 'quality-check'
  | 'channel-switch';

export type ExpectedEffect = 'sales-impact' | 'stockout-avoidance' | 'waste-reduction' | 'labor-savings';

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
  // Enhanced fields for decision making
  expectedEffects: ExpectedEffect[];
  todoCount: number; // Number of todos that will be generated on approval
  status: 'pending' | 'approved' | 'rejected';
  // Source tracking for incentive abuse prevention
  source?: 'system' | 'manager' | 'ad-hoc'; // system=auto-generated, manager=assigned, ad-hoc=self-created
  managerApprovedForPoints?: boolean; // true if manager approved ad-hoc for points
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
  type: 'delivery-delay' | 'staff-shortage' | 'demand-surge' | 'prep-behind' | 'demand-drop';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  relatedEventId: string;
  detectedAt: string;
  resolved: boolean;
  status: ExceptionStatus;
  impact: ExceptionImpact;
  linkedProposalId?: string;
  // Demand drop specific fields
  demandDropMeta?: DemandDropMeta;
}

// Demand drop detection metadata
export interface DemandDropMeta {
  menuId: string;
  menuName: string;
  dropRate: number; // e.g., 0.35 = 35% drop
  absoluteDrop: number; // absolute quantity drop
  avg3Day: number;
  avg7Day: number;
  affectedTimeBands: Array<{ timeBand: TimeBand; dropRate: number }>;
  affectedChannels: Array<{ channel: string; dropRate: number }>;
  hypotheses: Array<{ id: string; text: string; confidence: 'high' | 'medium' | 'low' }>;
  recommendedActions: Array<{ 
    id: string; 
    text: string; 
    proposalType: ProposalType;
    expectedEffect: ExpectedEffect;
    targetRoles: string[];
  }>;
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

// Dynamic Shift Summary (replaces MOCK_SHIFT_SUMMARY)
export interface ShiftSummary {
  plannedHours: number | null; // null when shift plan is not available
  actualHours: number;
  activeStaffCount: number; // Count of currently active staff
  skillMix: { star3: number; star2: number; star1: number };
  roleMix: { kitchen: number; floor: number; delivery: number };
  onBreakCount: number;
  lastUpdate: string;
  isCalculating: boolean; // True when data is incomplete
}

// Todo Stats for Quest Progress
export interface TodoStats {
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  // Aliases for easier access
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
}

// Enhanced Supply/Demand Metrics
export type RiskType = 'stockout' | 'excess';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface RiskItem {
  itemId: string;
  itemName: string;
  riskType: RiskType;
  riskLevel: RiskLevel;
  impact: string; // e.g., "ディナー帯影響"
  recommendedAction: string; // e.g., "メニュー制限提案"
}

export interface SupplyDemandMetrics {
  status: 'normal' | 'caution' | 'danger';
  stockoutRiskCount: number;
  excessRiskCount: number;
  topRiskItems: RiskItem[];
  lastUpdate: string;
}

// Weekly Labor Metrics (derived from events)
export interface WeeklyLaborDailyRow {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g., "月", "火"
  hours: number;
  laborCost: number;
  laborRate: number | null; // null if sales not available
  salesPerLaborCost: number | null;
  staffCount: number;
  starMix: { star3: number; star2: number; star1: number };
  sales: number | null; // null if sales_event not available
  // HR-focused fields for weekly review
  dayScore: number | null; // Daily team score (0-100)
  overtimeFlag: boolean; // True if overtime occurred
  overtimeMinutes: number; // Minutes of overtime
  questDelayCount: number; // Number of delayed quests
  questCompletedCount: number; // Number of completed quests
  questTotalCount: number; // Total quests for the day
}

export interface WeeklyLaborMetrics {
  weekSummary: {
    totalHours: number;
    totalLaborCost: number;
    avgLaborRate: number | null;
    salesPerLaborCost: number | null;
    totalSales: number | null;
    staffCountTotal: number;
    starMixTotal: { star3: number; star2: number; star1: number };
    // HR-focused summary fields
    avgDayScore: number | null; // Average daily score
    overtimeDays: number; // Number of days with overtime
    totalOvertimeMinutes: number; // Total overtime across week
    totalQuestDelays: number; // Total delayed quests
    questCompletionRate: number; // Overall quest completion rate
  };
  dailyRows: WeeklyLaborDailyRow[];
  // Winning patterns analysis
  winningMix: {
    dayLabel: string;
    starMix: { star3: number; star2: number; star1: number };
    score: number;
  } | null;
  weakTimeBands: Array<{
    dayLabel: string;
    issue: 'low_score' | 'overtime' | 'quest_delay';
    value: number;
  }>;
  chronicDelayQuests: Array<{
    questTitle: string;
    delayCount: number;
    avgDelayMinutes: number;
  }>;
  weekStart: string;
  weekEnd: string;
  lastUpdate: string;
  isCalculating: boolean;
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
// Incident & Agent Router Types
// ------------------------------------------------------------

// Agent identifiers for the multi-agent system
export type AgentId = 'management' | 'plan' | 'ops' | 'pos' | 'supply' | 'hr';

// Incident types that can be detected from signals
export type IncidentType = 'demand_drop' | 'labor_overrun' | 'stockout_risk' | 'delivery_delay' | 'ops_delay';

// Severity levels for incidents
export type IncidentSeverity = 'info' | 'warning' | 'critical';

// Status progression for incidents
export type IncidentStatus = 'open' | 'investigating' | 'proposed' | 'executing' | 'resolved';

// Evidence item collected by agents
export interface EvidenceItem {
  id: string;
  label: string;
  value: string;
  timeBand?: TimeBand;
  channel?: string;
  period?: string;
  sourceEventIds: string[];
}

// Hypothesis generated by agents
export interface Hypothesis {
  id: string;
  title: string;
  confidence: 'high' | 'mid' | 'low';
  rationale: string;
  evidenceRefs: string[]; // References to EvidenceItem ids
}

// Recommendation draft before becoming a Proposal
export interface RecommendationDraft {
  id: string;
  type: ProposalType;
  title: string;
  reason: string;
  expectedEffect: ExpectedEffect;
  scope: string;
  deadline: string;
  distributedToRoles: string[];
}

// Incident recipient for notifications
export interface IncidentRecipient {
  role: 'area_manager' | 'manager';
  label: string;
}

// Main Incident interface
export interface Incident {
  id: string;
  storeId: string;
  businessDate: string; // YYYY-MM-DD
  timeBand: TimeBand;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  leadAgent: AgentId;
  supportingAgents: AgentId[];
  title: string;
  summary: string;
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  recommendationDrafts: RecommendationDraft[];
  recipients: IncidentRecipient[];
  createdAt: string;
  updatedAt: string;
}

// Agent Router configuration
export const AGENT_ROUTER_CONFIG: Record<IncidentType, { lead: AgentId; support: AgentId[] }> = {
  demand_drop: { lead: 'management', support: ['plan', 'ops', 'pos', 'supply'] },
  stockout_risk: { lead: 'ops', support: ['supply', 'plan'] },
  labor_overrun: { lead: 'hr', support: ['plan', 'ops'] },
  delivery_delay: { lead: 'ops', support: ['supply'] },
  ops_delay: { lead: 'ops', support: ['hr'] },
};

// Agent display names
export const AGENT_NAMES: Record<AgentId, string> = {
  management: '経営分析エージェント',
  plan: '計画エージェント',
  ops: 'オペレーションエージェント',
  pos: 'POSエージェント',
  supply: '仕入エージェント',
  hr: '人事エージェント',
};

// Incident type display names
export const INCIDENT_TYPE_NAMES: Record<IncidentType, string> = {
  demand_drop: '出数下降',
  labor_overrun: '人件費超過',
  stockout_risk: '欠品リスク',
  delivery_delay: '配送遅延',
  ops_delay: 'オペ遅延',
};

// ------------------------------------------------------------
// Task Card Types (Task Studio)
// ------------------------------------------------------------

export type TaskRole = 'kitchen' | 'floor' | 'cashier' | 'prep' | 'runner' | 'unknown';
export type StarRequirement = 1 | 2 | 3;
export type QuantityMode = 'fixed' | 'byForecast' | 'byOrders';
export type QualityCheck = 'none' | 'photo' | 'ai';

export interface TaskCard {
  id: string;
  categoryId: string;
  name: string;
  role: TaskRole;
  starRequirement: StarRequirement;
  standardMinutes: number;
  quantityMode: QuantityMode;
  baseQuantity: number;
  coefficient: number; // byForecast/byOrders時に使う
  qualityCheck: QualityCheck;
  xpReward: number;
  enabled: boolean;
  notes?: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  parentId?: string;
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
  
  // Task Studio
  taskCards: TaskCard[];
  taskCategories: TaskCategory[];

  // Event log (single source of truth)
  events: DomainEvent[];

  // UI state
  selectedStoreId: string | null;
  selectedTimeBand: TimeBand;
  selectedMonth: string; // YYYY-MM

  // Proposals (generated from rules)
  proposals: Proposal[];

  // Incidents (multi-agent system)
  incidents: Incident[];

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
  | { type: 'ADD_PROPOSAL'; proposal: Proposal }
  | { type: 'UPDATE_PROPOSAL'; proposal: Proposal }
  | { type: 'REMOVE_PROPOSAL'; proposalId: string }
  // Incident actions
  | { type: 'ADD_INCIDENT'; incident: Incident }
  | { type: 'UPDATE_INCIDENT'; incident: Incident }
  | { type: 'UPDATE_INCIDENT_STATUS'; incidentId: string; status: IncidentStatus }
  | { type: 'ATTACH_AGENT_OUTPUT'; incidentId: string; agentId: AgentId; evidence: EvidenceItem[]; hypotheses: Hypothesis[]; drafts: RecommendationDraft[] }
  // Task Studio actions
  | { type: 'ADD_TASK_CARD'; taskCard: TaskCard }
  | { type: 'UPDATE_TASK_CARD'; taskCard: TaskCard }
  | { type: 'DELETE_TASK_CARD'; taskCardId: string }
  | { type: 'ADD_TASK_CATEGORY'; category: TaskCategory }
  | { type: 'UPDATE_TASK_CATEGORY'; category: TaskCategory }
  | { type: 'DELETE_TASK_CATEGORY'; categoryId: string }
  // Replay actions
  | { type: 'REPLAY_START'; events: DomainEvent[] }
  | { type: 'REPLAY_STEP' }
  | { type: 'REPLAY_PLAY' }
  | { type: 'REPLAY_PAUSE' }
  | { type: 'REPLAY_RESET' }
  | { type: 'CLEAR_HIGHLIGHT' }
  | { type: 'LOAD_INITIAL_DATA'; data: Partial<AppState> };
