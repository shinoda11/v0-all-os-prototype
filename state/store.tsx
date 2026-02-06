'use client';

// ============================================================
// All Management + All OS - Store Context
// Single context provider for all application state
// ============================================================

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppAction, DomainEvent, Proposal, TimeBand, Incident, IncidentStatus, AgentId, EvidenceItem, Hypothesis, RecommendationDraft, TaskCard, TaskCategory, BoxTemplate, DayPlan, DayPlanStatus, DecisionEvent } from '@/core/types';
import { appReducer, initialState } from './reducer';
import { loadMockData, loadSampleEvents } from '@/data/mock';
import { generateProposals } from '@/core/proposals';
import * as commands from '@/core/commands';
import { eventBus, type EventBusEventType } from './eventBus';
import * as repo from '@/core/repo';

// ------------------------------------------------------------
// Context Types
// ------------------------------------------------------------

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience actions
  actions: {
    setStore: (storeId: string) => void;
    setTimeBand: (timeBand: TimeBand) => void;
    setMonth: (month: string) => void;
    addEvent: (event: DomainEvent) => void;
    // Forecast
    upsertForecast: (date: string, timeBand: TimeBand, customers: number, avgSpend: number) => void;
    // Labor
    checkIn: (staffId: string) => void;
    checkOut: (staffId: string) => void;
    startBreak: (staffId: string) => void;
    endBreak: (staffId: string) => void;
    // Prep
    startPrep: (prepItemId: string, quantity: number, staffId?: string, decisionId?: string) => void;
    completePrep: (prepItemId: string, quantity: number, staffId?: string, decisionId?: string) => void;
    // Decision
    approveProposal: (proposal: Proposal) => void;
    rejectProposal: (proposal: Proposal) => void;
    startDecision: (proposal: Proposal, actor?: { assigneeId?: string; assigneeName?: string }) => void;
    pauseDecision: (proposal: Proposal, reason?: string) => void;
    resumeDecision: (proposal: Proposal, actor?: { assigneeId?: string; assigneeName?: string }) => void;
    completeDecision: (
      proposal: Proposal,
      actor?: { assigneeId?: string; assigneeName?: string },
      completionData?: {
        sourceQuest?: DecisionEvent;
        actualMinutes?: number;
        actualQuantity?: number;
        delayReason?: string;
        qualityStatus?: 'ok' | 'ng';
        qualityNote?: string;
      }
    ) => void;
    updateProposal: (proposal: Proposal) => void;
    addProposal: (proposal: Proposal) => void;
    // Replay
    startReplay: () => void;
    stepReplay: () => void;
    playReplay: () => void;
    pauseReplay: () => void;
    resetReplay: () => void;
    // Proposals
    refreshProposals: () => void;
    // Incidents
    addIncident: (incident: Incident) => void;
    updateIncident: (incident: Incident) => void;
    updateIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
    attachAgentOutput: (incidentId: string, agentId: AgentId, evidence: EvidenceItem[], hypotheses: Hypothesis[], drafts: RecommendationDraft[]) => void;
    // Create incident from signal (returns incident id or existing incident id)
    createIncidentFromSignal: (params: {
      storeId: string;
      businessDate: string;
      timeBand: TimeBand;
      type: 'demand_drop';
      menuItemId?: string;
      menuName?: string;
      dropRate?: number;
      title: string;
      summary: string;
    }) => { incidentId: string; isNew: boolean };
    findExistingIncident: (storeId: string, businessDate: string, timeBand: TimeBand, type: string, menuItemId?: string) => Incident | undefined;
    // Task Studio
    addTaskCard: (taskCard: TaskCard) => void;
    updateTaskCard: (taskCard: TaskCard) => void;
    deleteTaskCard: (taskCardId: string) => void;
    addTaskCategory: (category: TaskCategory) => void;
    updateTaskCategory: (category: TaskCategory) => void;
    deleteTaskCategory: (categoryId: string) => void;
    // Box Templates
    addBoxTemplate: (boxTemplate: BoxTemplate) => void;
    updateBoxTemplate: (boxTemplate: BoxTemplate) => void;
    deleteBoxTemplate: (boxTemplateId: string) => void;
    // Day Plan (Planning Calendar)
    upsertDayPlan: (dayPlan: DayPlan) => void;
    updateDayPlanStatus: (date: string, status: DayPlanStatus) => void;
    goLiveDayPlan: (date: string) => void;
    // Order Interrupt (POS urgent orders)
    createOrderQuest: (order: { orderId: string; menuItemName: string; quantity: number; slaMinutes?: number }) => string;
    completeOrderQuest: (orderId: string) => void;
    // Data Management
    seedDemoData: () => void;
    resetAllData: () => void;
  };
}

// ------------------------------------------------------------
// Context Creation
// ------------------------------------------------------------

const StoreContext = createContext<StoreContextValue | null>(null);

// ------------------------------------------------------------
// Provider Component
// ------------------------------------------------------------

// Helper to publish events to the event bus
const publishStateUpdate = (
  type: EventBusEventType,
  eventType?: string,
  changedKeys?: string[]
) => {
  eventBus.publish(type, { eventType, changedKeys });
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data from localStorage or fall back to mock data
  useEffect(() => {
    const savedState = repo.loadState();
    
    if (savedState) {
      // Load from localStorage
      dispatch({ type: 'LOAD_INITIAL_DATA', data: savedState });
    } else {
      // No saved state, load mock data
      const mockData = loadMockData();
      dispatch({ type: 'LOAD_INITIAL_DATA', data: mockData });
    }
    
    // Setup cross-tab synchronization
    const cleanup = repo.setupCrossTabSync();
    
    // Subscribe to cross-tab updates
    const unsubscribe = repo.subscribe((newState) => {
      dispatch({ type: 'LOAD_INITIAL_DATA', data: newState });
    });
    
    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  // Handle replay playback (single interval)
  useEffect(() => {
    if (state.replay.isPlaying && !state.replay.isPaused) {
      if (state.replay.currentIndex < state.replay.pendingEvents.length) {
        replayIntervalRef.current = setInterval(() => {
          dispatch({ type: 'REPLAY_STEP' });
        }, 1000);
      } else {
        // Replay finished
        dispatch({ type: 'REPLAY_PAUSE' });
      }
    }

    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
    };
  }, [state.replay.isPlaying, state.replay.isPaused, state.replay.currentIndex, state.replay.pendingEvents.length]);

  // Persist state changes to localStorage
  const isInitializedRef = useRef(false);
  useEffect(() => {
    // Skip initial render to avoid overwriting with initialState
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }
    
    // Save state to localStorage (debounced via RAF)
    const timeoutId = setTimeout(() => {
      repo.saveState(state);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [state]);

  // Handle highlight timeout (single timer)
  useEffect(() => {
    if (state.highlightUntil) {
      const remaining = state.highlightUntil - Date.now();
      if (remaining > 0) {
        highlightTimeoutRef.current = setTimeout(() => {
          dispatch({ type: 'CLEAR_HIGHLIGHT' });
        }, remaining);
      }
    }

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [state.highlightUntil]);

  // Store references for callbacks (to avoid stale closures)
  const storeIdRef = useRef(state.selectedStoreId);
  storeIdRef.current = state.selectedStoreId;
  
  const stateRef = useRef(state);
  stateRef.current = state;

  // Memoized actions - stable references to avoid infinite loops in useEffect dependencies
  const actions = useMemo(() => ({
    setStore: (storeId: string) => {
      dispatch({ type: 'SET_STORE', storeId });
    },

    setTimeBand: (timeBand: TimeBand) => {
      dispatch({ type: 'SET_TIME_BAND', timeBand });
    },

    setMonth: (month: string) => {
      dispatch({ type: 'SET_MONTH', month });
    },

    addEvent: (event: DomainEvent) => {
      dispatch({ type: 'ADD_EVENT', event });
    },

    // Forecast
    upsertForecast: (date: string, timeBand: TimeBand, customers: number, avgSpend: number) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.upsertForecast(storeId, date, timeBand, customers, avgSpend);
      dispatch({ type: 'ADD_EVENT', event });
    },

    // Labor
    checkIn: (staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.checkIn(storeId, staffId);
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('labor:changed', 'check-in', ['labor', 'cockpit-labor']);
    },

    checkOut: (staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.checkOut(storeId, staffId);
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('labor:changed', 'check-out', ['labor', 'cockpit-labor']);
    },

    startBreak: (staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.startBreak(storeId, staffId);
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('labor:changed', 'break-start', ['labor', 'cockpit-labor']);
    },

    endBreak: (staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.endBreak(storeId, staffId);
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('labor:changed', 'break-end', ['labor', 'cockpit-labor']);
    },

    // Prep
    startPrep: (prepItemId: string, quantity: number, staffId?: string, decisionId?: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.startPrep(storeId, prepItemId, quantity, staffId, decisionId);
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('prep:changed', 'prep-started', ['prep', 'cockpit-operations', 'todo']);
    },

    completePrep: (prepItemId: string, quantity: number, staffId?: string, decisionId?: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.completePrep(storeId, prepItemId, quantity, staffId, decisionId);
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('prep:changed', 'prep-completed', ['prep', 'cockpit-operations', 'todo']);
    },

    // Decision - creates decision event and distributes todos
    approveProposal: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      
      // Create the approval decision event
      const decisionEvent = commands.approveProposal(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event: decisionEvent });
      
      // Generate todo events for each distributed role (simulating todo distribution)
      // Each todo is a 'pending' decision event that will appear in floor/todo
      const todoCount = proposal.todoCount ?? 1;
      for (let i = 0; i < todoCount; i++) {
        const todoEvent: DomainEvent = {
          ...decisionEvent,
          id: `${decisionEvent.id}-todo-${i}`,
          action: 'pending',
          title: `[ToDo] ${proposal.title}`,
          description: `${proposal.description} (${i + 1}/${todoCount})`,
        };
        dispatch({ type: 'ADD_EVENT', event: todoEvent });
      }
      
      dispatch({ type: 'REMOVE_PROPOSAL', proposalId: proposal.id });
      publishStateUpdate('decision:changed', 'approved', ['decision', 'todo', 'cockpit-exceptions']);
    },

    rejectProposal: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.rejectProposal(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event });
      dispatch({ type: 'REMOVE_PROPOSAL', proposalId: proposal.id });
      publishStateUpdate('decision:changed', 'rejected', ['decision', 'cockpit-exceptions']);
    },

    startDecision: (proposal: Proposal, actor?: { assigneeId?: string; assigneeName?: string }) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.startDecision(storeId, proposal, actor);
      // If proposal already has no assignee, claim it with actor (self-claim)
      if (!event.assigneeId && actor?.assigneeId) {
        event.assigneeId = actor.assigneeId;
        event.assigneeName = actor.assigneeName;
      }
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('decision:changed', 'started', ['decision', 'todo']);
    },

    pauseDecision: (proposal: Proposal, reason?: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const pauseEvent: DomainEvent = {
        id: `${proposal.id}-paused-${Date.now()}`,
        type: 'decision',
        storeId,
        timestamp: new Date().toISOString(),
        timeBand: proposal.timeBand ?? 'all',
        proposalId: proposal.id,
        action: 'paused',
        title: proposal.title,
        description: proposal.description || '',
        distributedToRoles: proposal.distributedToRoles,
        priority: proposal.priority,
        pausedAt: new Date().toISOString(),
        pauseReason: reason,
      };
      dispatch({ type: 'ADD_EVENT', event: pauseEvent });
      publishStateUpdate('decision:changed', 'paused', ['decision', 'todo']);
    },

    resumeDecision: (proposal: Proposal, actor?: { assigneeId?: string; assigneeName?: string }) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      // Resume is essentially a new start event
      const event = commands.startDecision(storeId, proposal, actor);
      if (!event.assigneeId && actor?.assigneeId) {
        event.assigneeId = actor.assigneeId;
        event.assigneeName = actor.assigneeName;
      }
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('decision:changed', 'started', ['decision', 'todo']);
    },

    // Complete decision - single entry point for all task completions.
    // Generates the 'completed' DecisionEvent, carries over sourceQuest
    // fields (isPeak, refId, etc.), stamps completion data, and triggers
    // prep completion when applicable.
    completeDecision: (
      proposal: Proposal,
      actor?: { assigneeId?: string; assigneeName?: string },
      completionData?: {
        sourceQuest?: DecisionEvent;
        actualMinutes?: number;
        actualQuantity?: number;
        delayReason?: string;
        qualityStatus?: 'ok' | 'ng';
        qualityNote?: string;
      }
    ) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      
      // Create the base completion decision event via commands layer
      const completionEvent = commands.completeDecision(storeId, proposal, actor);

      // Ensure assignee is always set on completion
      if (!completionEvent.assigneeId && actor?.assigneeId) {
        completionEvent.assigneeId = actor.assigneeId;
        completionEvent.assigneeName = actor.assigneeName;
      }

      // Carry over quest-instance fields from the source quest
      // (these aren't on Proposal, so they'd be lost without this)
      const src = completionData?.sourceQuest;
      if (src) {
        completionEvent.isPeak = src.isPeak;
        completionEvent.refId = src.refId;
        completionEvent.targetValue = src.targetValue;
        completionEvent.estimatedMinutes = src.estimatedMinutes;
        completionEvent.quantity = src.quantity;
        completionEvent.targetPrepItemIds = src.targetPrepItemIds;
        completionEvent.targetMenuIds = src.targetMenuIds;
        // Preserve assignee from the in-progress event if actor didn't override
        if (!completionEvent.assigneeId && src.assigneeId) {
          completionEvent.assigneeId = src.assigneeId;
          completionEvent.assigneeName = src.assigneeName;
        }
      }

      // Stamp completion details
      if (completionData) {
        completionEvent.actualMinutes = completionData.actualMinutes;
        completionEvent.actualQuantity = completionData.actualQuantity;
        completionEvent.delayReason = completionData.delayReason;
        completionEvent.qualityStatus = completionData.qualityStatus;
        completionEvent.qualityNote = completionData.qualityNote;
      }

      dispatch({ type: 'ADD_EVENT', event: completionEvent });
      
      // If proposal has prep items, record prep completion events
      const prepItemIds = completionEvent.targetPrepItemIds ?? proposal.targetPrepItemIds;
      if (prepItemIds && prepItemIds.length > 0) {
        for (const prepItemId of prepItemIds) {
          const prepEvent = commands.completePrep(
            storeId,
            prepItemId,
            completionData?.actualQuantity ?? (proposal.quantity || 1),
            actor?.assigneeId,
            completionEvent.id
          );
          dispatch({ type: 'ADD_EVENT', event: prepEvent });
        }
      }
      publishStateUpdate('decision:changed', 'completed', ['decision', 'todo', 'prep', 'cockpit-operations']);
    },

    updateProposal: (proposal: Proposal) => {
      dispatch({ type: 'UPDATE_PROPOSAL', proposal });
    },

    addProposal: (proposal: Proposal) => {
      dispatch({ type: 'ADD_PROPOSAL', proposal });
    },

    // Replay
    startReplay: () => {
      const sampleEvents = loadSampleEvents();
      dispatch({ type: 'REPLAY_START', events: sampleEvents });
      publishStateUpdate('state:updated', 'replay-start', []);
    },

    stepReplay: () => {
      dispatch({ type: 'REPLAY_STEP' });
      publishStateUpdate('replay:step', 'replay-step', ['sales', 'labor', 'prep', 'delivery', 'decision', 'forecast']);
    },

    playReplay: () => {
      dispatch({ type: 'REPLAY_PLAY' });
    },

    pauseReplay: () => {
      dispatch({ type: 'REPLAY_PAUSE' });
    },

    resetReplay: () => {
      dispatch({ type: 'REPLAY_RESET' });
      publishStateUpdate('state:updated', 'replay-reset', []);
    },

    // Proposals - use stateRef to always get fresh state
    refreshProposals: () => {
      const currentState = stateRef.current;
      if (!currentState.selectedStoreId) return;
      const today = new Date().toISOString().split('T')[0];
      const proposals = generateProposals(
        currentState.events,
        currentState.selectedStoreId,
        today,
        currentState.selectedTimeBand,
        currentState.menus,
        currentState.prepItems,
        currentState.roles
      );
      dispatch({ type: 'SET_PROPOSALS', proposals });
      publishStateUpdate('proposal:changed', 'proposals-refreshed', ['proposals']);
    },

    // Incidents
    addIncident: (incident: Incident) => {
      dispatch({ type: 'ADD_INCIDENT', incident });
      publishStateUpdate('state:updated', 'incident-added', ['incidents']);
    },

    updateIncident: (incident: Incident) => {
      dispatch({ type: 'UPDATE_INCIDENT', incident });
      publishStateUpdate('state:updated', 'incident-updated', ['incidents']);
    },

    updateIncidentStatus: (incidentId: string, status: IncidentStatus) => {
      dispatch({ type: 'UPDATE_INCIDENT_STATUS', incidentId, status });
      publishStateUpdate('state:updated', 'incident-status-changed', ['incidents']);
    },

    attachAgentOutput: (incidentId: string, agentId: AgentId, evidence: EvidenceItem[], hypotheses: Hypothesis[], drafts: RecommendationDraft[]) => {
      dispatch({ type: 'ATTACH_AGENT_OUTPUT', incidentId, agentId, evidence, hypotheses, drafts });
      publishStateUpdate('state:updated', 'agent-output-attached', ['incidents']);
    },

    // Find existing incident by signal parameters
    findExistingIncident: (storeId: string, businessDate: string, timeBand: TimeBand, type: string, menuItemId?: string) => {
      const currentState = stateRef.current;
      return (currentState.incidents || []).find((incident) => {
        const baseMatch = 
          incident.storeId === storeId &&
          incident.businessDate === businessDate &&
          incident.timeBand === timeBand &&
          incident.type === type;
        
        if (!baseMatch) return false;
        
        // For demand_drop, also match on menu item if provided
        if (type === 'demand_drop' && menuItemId) {
          // Check if any evidence references this menu
          return incident.evidence.some((ev) => 
            ev.label.includes(menuItemId) || ev.id.includes(menuItemId)
          ) || incident.title.includes(menuItemId);
        }
        
        return baseMatch;
      });
    },

    // Create incident from signal (demand_drop, etc.)
    createIncidentFromSignal: (params) => {
      const currentState = stateRef.current;
      const { storeId, businessDate, timeBand, type, menuItemId, menuName, dropRate, title, summary } = params;
      
      // Check for existing incident
      const existing = (currentState.incidents || []).find((incident) => {
        const baseMatch = 
          incident.storeId === storeId &&
          incident.businessDate === businessDate &&
          incident.timeBand === timeBand &&
          incident.type === type;
        
        if (!baseMatch) return false;
        
        // For demand_drop, match on menu name
        if (type === 'demand_drop' && menuName) {
          return incident.title.includes(menuName);
        }
        
        return baseMatch;
      });
      
      if (existing) {
        return { incidentId: existing.id, isNew: false };
      }
      
      // Create new incident
      const now = new Date().toISOString();
      const incidentId = `incident-${storeId}-${Date.now()}`;
      
      const newIncident: Incident = {
        id: incidentId,
        storeId,
        businessDate,
        timeBand,
        type,
        severity: (dropRate && dropRate >= 40) ? 'critical' : 'warning',
        status: 'open',
        leadAgent: 'management', // demand_drop is always management-led
        supportingAgents: ['plan', 'ops', 'pos', 'supply'],
        title,
        summary,
        evidence: menuName ? [
          {
            id: `ev-${incidentId}-1`,
            label: menuName,
            value: dropRate ? `-${Math.round(dropRate)}%` : '下降検出',
            sourceEventIds: [],
          },
        ] : [],
        hypotheses: [],
        recommendationDrafts: [],
        recipients: [
          { role: 'manager', label: '店長' },
        ],
        createdAt: now,
        updatedAt: now,
      };
      
      dispatch({ type: 'ADD_INCIDENT', incident: newIncident });
      publishStateUpdate('state:updated', 'incident-created-from-signal', ['incidents']);
      
      return { incidentId, isNew: true };
    },

    // Task Studio
    addTaskCard: (taskCard: TaskCard) => {
      dispatch({ type: 'ADD_TASK_CARD', taskCard });
      publishStateUpdate('state:updated', 'task-card-added', ['taskCards']);
    },

    updateTaskCard: (taskCard: TaskCard) => {
      dispatch({ type: 'UPDATE_TASK_CARD', taskCard });
      publishStateUpdate('state:updated', 'task-card-updated', ['taskCards']);
    },

    deleteTaskCard: (taskCardId: string) => {
      dispatch({ type: 'DELETE_TASK_CARD', taskCardId });
      publishStateUpdate('state:updated', 'task-card-deleted', ['taskCards']);
    },

    addTaskCategory: (category: TaskCategory) => {
      dispatch({ type: 'ADD_TASK_CATEGORY', category });
      publishStateUpdate('state:updated', 'task-category-added', ['taskCategories']);
    },

    updateTaskCategory: (category: TaskCategory) => {
      dispatch({ type: 'UPDATE_TASK_CATEGORY', category });
      publishStateUpdate('state:updated', 'task-category-updated', ['taskCategories']);
    },

    deleteTaskCategory: (categoryId: string) => {
      dispatch({ type: 'DELETE_TASK_CATEGORY', categoryId });
      publishStateUpdate('state:updated', 'task-category-deleted', ['taskCategories']);
    },

    // Box Templates
    addBoxTemplate: (boxTemplate: BoxTemplate) => {
      dispatch({ type: 'ADD_BOX_TEMPLATE', boxTemplate });
      publishStateUpdate('state:updated', 'box-template-added', ['boxTemplates']);
    },

    updateBoxTemplate: (boxTemplate: BoxTemplate) => {
      dispatch({ type: 'UPDATE_BOX_TEMPLATE', boxTemplate });
      publishStateUpdate('state:updated', 'box-template-updated', ['boxTemplates']);
    },

    deleteBoxTemplate: (boxTemplateId: string) => {
      dispatch({ type: 'DELETE_BOX_TEMPLATE', boxTemplateId });
      publishStateUpdate('state:updated', 'box-template-deleted', ['boxTemplates']);
    },

    // Day Plan (Planning Calendar)
    upsertDayPlan: (dayPlan: DayPlan) => {
      dispatch({ type: 'UPSERT_DAY_PLAN', dayPlan });
      publishStateUpdate('state:updated', 'day-plan-upserted', ['dayPlans']);
    },

    updateDayPlanStatus: (date: string, status: DayPlanStatus) => {
      const storeId = storeIdRef.current || '1';
      dispatch({ type: 'UPDATE_DAY_PLAN_STATUS', date, storeId, status });
      publishStateUpdate('state:updated', 'day-plan-status-updated', ['dayPlans']);
    },

    // Go Live: generate quests from the day plan's selected boxes
    goLiveDayPlan: (date: string) => {
      const storeId = storeIdRef.current || '1';
      const currentState = stateRef.current;
      const plan = (currentState.dayPlans || []).find((dp) => dp.date === date && dp.storeId === storeId);
      if (!plan) return;

      const boxTemplates = currentState.boxTemplates || [];
      const taskCards = currentState.taskCards || [];
      const now = new Date().toISOString();
      const seenTaskIds = new Set<string>();

      plan.selectedBoxIds.forEach((boxId) => {
        const box = boxTemplates.find((b) => b.id === boxId);
        if (!box) return;

        box.taskCardIds.forEach((taskId) => {
          if (seenTaskIds.has(taskId)) return;
          seenTaskIds.add(taskId);

          const task = taskCards.find((t) => t.id === taskId);
          if (!task || !task.enabled || task.isPeak) return;

          let quantity = task.baseQuantity;
          if (task.quantityMode === 'byForecast') {
            quantity = task.baseQuantity + Math.round(task.coefficient * (plan.forecastSales / 10000));
          } else if (task.quantityMode === 'byOrders') {
            const estimatedOrders = Math.round(plan.forecastSales / 1500);
            quantity = task.baseQuantity + Math.round(task.coefficient * estimatedOrders);
          }

          const questId = `quest-${boxId}-${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const deadline = new Date(Date.now() + task.standardMinutes * 60 * 1000 * 2).toISOString();

          const questEvent: DecisionEvent = {
            id: questId,
            type: 'decision',
            storeId,
            timestamp: now,
            timeBand: box.timeBand,
            proposalId: `plan-${taskId}-${date}`,
            action: 'pending',
            title: task.name,
            description: `${task.name} - ${quantity}`,
            distributedToRoles: [task.role],
            priority: task.starRequirement >= 3 ? 'high' : task.starRequirement >= 2 ? 'medium' : 'low',
            deadline,
            estimatedMinutes: task.standardMinutes,
            quantity,
            source: 'system',
            refId: task.id,
            targetValue: quantity,
          };

          dispatch({ type: 'ADD_EVENT', event: questEvent });
        });
      });

      // Set status to live
      dispatch({ type: 'UPDATE_DAY_PLAN_STATUS', date, storeId, status: 'live' });
      publishStateUpdate('decision:changed', 'day-plan-live', ['decision', 'todo', 'dayPlans']);
    },

    // Order Interrupt - Create urgent order quest
    createOrderQuest: (order: { orderId: string; menuItemName: string; quantity: number; slaMinutes?: number }) => {
      const storeId = storeIdRef.current || 'store-1';
      const now = new Date().toISOString();
      const slaMinutes = order.slaMinutes ?? 3;
      
      // Create order event
      const orderEvent: DomainEvent = {
        id: `order-${order.orderId}`,
        type: 'order',
        storeId,
        timestamp: now,
        timeBand: 'lunch' as TimeBand,
        orderId: order.orderId,
        menuItemName: order.menuItemName,
        quantity: order.quantity,
        priority: 'urgent',
        status: 'pending',
        slaMinutes,
      } as DomainEvent;
      dispatch({ type: 'ADD_EVENT', event: orderEvent });
      
      // Create urgent decision event (Order Quest)
      const questId = `order-quest-${order.orderId}`;
      const deadline = new Date(Date.now() + slaMinutes * 60 * 1000).toISOString();
      const questEvent: DecisionEvent = {
        id: questId,
        type: 'decision',
        storeId,
        timestamp: now,
        timeBand: 'lunch' as TimeBand,
        proposalId: questId,
        action: 'approved', // Ready to start immediately
        title: `[ORDER] ${order.menuItemName} x${order.quantity}`,
        description: `POS注文: ${order.menuItemName} ${order.quantity}点`,
        distributedToRoles: [], // Will be assigned based on role
        priority: 'critical',
        deadline,
        estimatedMinutes: slaMinutes,
        source: 'system',
      };
      dispatch({ type: 'ADD_EVENT', event: questEvent });
      
      publishStateUpdate('state:updated', 'order-quest-created', ['events']);
      return questId;
    },

    completeOrderQuest: (orderId: string) => {
      const now = new Date().toISOString();
      const state = stateRef.current;
      
      // Find and complete the order event
      const orderEvent = state.events.find(e => e.type === 'order' && (e as any).orderId === orderId);
      if (orderEvent) {
        const completedOrder: DomainEvent = {
          ...orderEvent,
          id: `${orderEvent.id}-completed`,
          timestamp: now,
          status: 'completed',
          completedAt: now,
        } as DomainEvent;
        dispatch({ type: 'ADD_EVENT', event: completedOrder });
      }
      
      publishStateUpdate('state:updated', 'order-quest-completed', ['events']);
    },
    
    // Data Management
    seedDemoData: () => {
      const storeId = storeIdRef.current ?? '1';
      const demoData = repo.seedDemoData(storeId);
      
      // Merge with existing mock data
      const mockData = loadMockData();
      const mergedData = {
        ...mockData,
        staff: demoData.staff ?? mockData.staff,
        taskCategories: demoData.taskCategories ?? mockData.taskCategories ?? [],
        taskCards: demoData.taskCards ?? mockData.taskCards ?? [],
        boxTemplates: demoData.boxTemplates ?? mockData.boxTemplates ?? [],
        events: [...(mockData.events ?? []), ...(demoData.events ?? [])],
      };
      
      dispatch({ type: 'LOAD_INITIAL_DATA', data: mergedData });
      publishStateUpdate('state:updated', 'demo-data-seeded', ['staff', 'taskCards', 'events']);
    },
    
    resetAllData: () => {
      repo.clearState();
      const mockData = loadMockData();
      dispatch({ type: 'LOAD_INITIAL_DATA', data: mockData });
      publishStateUpdate('state:updated', 'data-reset', ['all']);
    },
  }), []);

  const actionsWithRefresh = actions;

  return (
    <StoreContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </StoreContext.Provider>
  );
};

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

export const useStore = (): StoreContextValue => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
