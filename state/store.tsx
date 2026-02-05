'use client';

// ============================================================
// All Management + All OS - Store Context
// Single context provider for all application state
// ============================================================

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppAction, DomainEvent, DecisionEvent, Proposal, TimeBand, Incident, IncidentStatus, AgentId, EvidenceItem, Hypothesis, RecommendationDraft, TaskCard, TaskCategory, BoxTemplate } from '@/core/types';
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
    startDecision: (proposal: Proposal) => void;
    pauseDecision: (proposal: Proposal, reason?: string) => void;
    resumeDecision: (proposal: Proposal) => void;
    completeDecision: (proposal: Proposal) => void;
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
    // Order Interrupt (POS urgent orders)
    createOrderQuest: (order: { orderId: string; menuItemName: string; quantity: number; slaMinutes?: number }) => string;
    completeOrderQuest: (orderId: string) => void;
    // Data Management
    seedDemoData: () => void;
    resetAllData: () => void;
    // Quest Actions (work directly with quest/event IDs)
    startQuest: (questId: string, staffId?: string) => void;
    pauseQuest: (questId: string, reason?: string) => void;
    resumeQuest: (questId: string) => void;
    completeQuest: (questId: string, data?: { actualMinutes?: number; qualityStatus?: 'ok' | 'ng'; qualityNote?: string }) => void;
    assignQuest: (questId: string, staffId: string) => void;
    createPeakQuest: (title: string, staffId?: string) => string;
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

    startDecision: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.startDecision(storeId, proposal);
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

    resumeDecision: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      // Resume is essentially a new start event
      const event = commands.startDecision(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event });
      publishStateUpdate('decision:changed', 'started', ['decision', 'todo']);
    },

    // Complete decision - marks todo as done and records prep event if applicable
    completeDecision: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      
      // Create the completion decision event
      const completionEvent = commands.completeDecision(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event: completionEvent });
      
      // If proposal has prep items, record prep completion events
      // This closes the loop and updates cockpit metrics
      if (proposal.targetPrepItemIds && proposal.targetPrepItemIds.length > 0) {
        for (const prepItemId of proposal.targetPrepItemIds) {
          const prepEvent = commands.completePrep(
            storeId,
            prepItemId,
            proposal.quantity || 1,
            undefined, // staffId
            completionEvent.id // link to decision
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
    
    // Quest Actions - work directly with event IDs
    startQuest: (questId: string, staffId?: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const state = stateRef.current;
      
      // Find the quest event
      const questEvent = state.events.find(e => e.id === questId && e.type === 'decision') as DecisionEvent | undefined;
      if (!questEvent) return;
      
      const startEvent: DomainEvent = {
        ...questEvent,
        id: `${questEvent.proposalId}-started-${Date.now()}`,
        action: 'started',
        timestamp: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        assigneeId: staffId || questEvent.assigneeId,
      };
      dispatch({ type: 'ADD_EVENT', event: startEvent });
      publishStateUpdate('decision:changed', 'started', ['decision', 'todo']);
    },
    
    pauseQuest: (questId: string, reason?: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const state = stateRef.current;
      
      const questEvent = state.events.find(e => e.id === questId && e.type === 'decision') as DecisionEvent | undefined;
      if (!questEvent) return;
      
      const pauseEvent: DomainEvent = {
        ...questEvent,
        id: `${questEvent.proposalId}-paused-${Date.now()}`,
        action: 'paused',
        timestamp: new Date().toISOString(),
        pausedAt: new Date().toISOString(),
        pauseReason: reason,
      };
      dispatch({ type: 'ADD_EVENT', event: pauseEvent });
      publishStateUpdate('decision:changed', 'paused', ['decision', 'todo']);
    },
    
    resumeQuest: (questId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const state = stateRef.current;
      
      const questEvent = state.events.find(e => e.id === questId && e.type === 'decision') as DecisionEvent | undefined;
      if (!questEvent) return;
      
      const resumeEvent: DomainEvent = {
        ...questEvent,
        id: `${questEvent.proposalId}-started-${Date.now()}`,
        action: 'started',
        timestamp: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_EVENT', event: resumeEvent });
      publishStateUpdate('decision:changed', 'started', ['decision', 'todo']);
    },
    
    completeQuest: (questId: string, data?: { actualMinutes?: number; qualityStatus?: 'ok' | 'ng'; qualityNote?: string }) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const state = stateRef.current;
      
      const questEvent = state.events.find(e => e.id === questId && e.type === 'decision') as DecisionEvent | undefined;
      if (!questEvent) return;
      
      const completeEvent: DomainEvent = {
        ...questEvent,
        id: `${questEvent.proposalId}-completed-${Date.now()}`,
        action: 'completed',
        timestamp: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        actualMinutes: data?.actualMinutes,
        qualityStatus: data?.qualityStatus,
        qualityNote: data?.qualityNote,
      };
      dispatch({ type: 'ADD_EVENT', event: completeEvent });
      publishStateUpdate('decision:changed', 'completed', ['decision', 'todo', 'prep', 'cockpit-operations']);
    },
    
    assignQuest: (questId: string, staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const state = stateRef.current;
      
      const questEvent = state.events.find(e => e.id === questId && e.type === 'decision') as DecisionEvent | undefined;
      if (!questEvent) return;
      
      const staff = state.staff.find(s => s.id === staffId);
      
      const assignEvent: DomainEvent = {
        ...questEvent,
        id: `${questEvent.proposalId}-assigned-${Date.now()}`,
        timestamp: new Date().toISOString(),
        assigneeId: staffId,
        assigneeName: staff?.name,
      };
      dispatch({ type: 'ADD_EVENT', event: assignEvent });
      publishStateUpdate('decision:changed', 'assigned', ['decision', 'todo']);
    },
    
    createPeakQuest: (title: string, staffId?: string) => {
      const storeId = storeIdRef.current ?? '1';
      const state = stateRef.current;
      const now = new Date().toISOString();
      const questId = `peak-${Date.now()}`;
      
      const staff = staffId ? state.staff.find(s => s.id === staffId) : null;
      
      const peakQuest: DomainEvent = {
        id: questId,
        type: 'decision',
        storeId,
        timestamp: now,
        timeBand: 'lunch',
        proposalId: questId,
        action: 'pending',
        title: title || 'Peak Order',
        description: 'Urgent peak order - prioritize immediately',
        distributedToRoles: ['kitchen', 'hall'],
        priority: 'critical',
        estimatedMinutes: 10,
        source: 'peak',
        assigneeId: staffId,
        assigneeName: staff?.name,
      };
      dispatch({ type: 'ADD_EVENT', event: peakQuest });
      publishStateUpdate('decision:changed', 'peak-quest-created', ['decision', 'todo']);
      return questId;
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
