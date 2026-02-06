// ============================================================
// All Management + All OS - Reducer
// Single reducer for all state mutations
// ============================================================

import { AppState, AppAction, DomainEvent, Incident, IncidentStatus, AgentId, EvidenceItem, Hypothesis, RecommendationDraft, TaskCard, TaskCategory, BoxTemplate, DayPlan, DayPlanStatus } from '@/core/types';

// Highlight duration in milliseconds
const HIGHLIGHT_DURATION = 2000;

// Helper to determine which keys changed based on event type
const getChangedKeysForEvent = (event: DomainEvent): string[] => {
  switch (event.type) {
    case 'sales':
      return ['sales', 'cockpit-sales'];
    case 'labor':
      return ['labor', 'cockpit-labor'];
    case 'prep':
      return ['prep', 'cockpit-operations', 'todo'];
    case 'delivery':
      return ['delivery', 'cockpit-supply', 'exceptions'];
    case 'decision':
      return ['decision', 'todo', 'cockpit-exceptions'];
    case 'forecast':
      return ['forecast', 'cockpit-sales'];
    default:
      return [];
  }
};

export const initialState: AppState = {
  // Master data (will be loaded from mock)
  stores: [],
  staff: [],
  roles: [],
  menus: [],
  prepItems: [],

  // Task Studio
  taskCards: [],
  taskCategories: [],
  boxTemplates: [],

  // Day Plans
  dayPlans: [],

  // Event log
  events: [],

  // UI state
  selectedStoreId: null,
  selectedTimeBand: 'all',
  selectedMonth: new Date().toISOString().substring(0, 7), // Current month

  // Proposals
  proposals: [],

  // Incidents
  incidents: [],

  // Replay
  replay: {
    isPlaying: false,
    isPaused: false,
    currentIndex: 0,
    pendingEvents: [],
  },

  // Highlight
  lastChangedKeys: [],
  highlightUntil: null,
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_STORE':
      return {
        ...state,
        selectedStoreId: action.storeId,
      };

    case 'SET_TIME_BAND':
      return {
        ...state,
        selectedTimeBand: action.timeBand,
      };

    case 'SET_MONTH':
      return {
        ...state,
        selectedMonth: action.month,
      };

    case 'ADD_EVENT': {
      const changedKeys = getChangedKeysForEvent(action.event);
      return {
        ...state,
        events: [...state.events, action.event],
        lastChangedKeys: changedKeys,
        highlightUntil: Date.now() + HIGHLIGHT_DURATION,
      };
    }

    case 'ADD_EVENTS': {
      const allChangedKeys = action.events.flatMap(getChangedKeysForEvent);
      const uniqueKeys = [...new Set(allChangedKeys)];
      return {
        ...state,
        events: [...state.events, ...action.events],
        lastChangedKeys: uniqueKeys,
        highlightUntil: Date.now() + HIGHLIGHT_DURATION,
      };
    }

    case 'SET_PROPOSALS':
      return {
        ...state,
        proposals: action.proposals,
      };

    case 'ADD_PROPOSAL':
      return {
        ...state,
        proposals: [...state.proposals, action.proposal],
      };

    case 'UPDATE_PROPOSAL':
      return {
        ...state,
        proposals: state.proposals.map((p) =>
          p.id === action.proposal.id ? action.proposal : p
        ),
      };

    case 'REMOVE_PROPOSAL':
      return {
        ...state,
        proposals: state.proposals.filter((p) => p.id !== action.proposalId),
      };

    // Incident actions
    case 'ADD_INCIDENT':
      return {
        ...state,
        incidents: [...(state.incidents || []), action.incident],
      };

    case 'UPDATE_INCIDENT':
      return {
        ...state,
        incidents: (state.incidents || []).map((i) =>
          i.id === action.incident.id ? action.incident : i
        ),
      };

    case 'UPDATE_INCIDENT_STATUS':
      return {
        ...state,
        incidents: (state.incidents || []).map((i) =>
          i.id === action.incidentId 
            ? { ...i, status: action.status, updatedAt: new Date().toISOString() } 
            : i
        ),
      };

    case 'ATTACH_AGENT_OUTPUT':
      return {
        ...state,
        incidents: (state.incidents || []).map((i) =>
          i.id === action.incidentId
            ? {
                ...i,
                evidence: [...i.evidence, ...action.evidence],
                hypotheses: [...i.hypotheses, ...action.hypotheses],
                recommendationDrafts: [...i.recommendationDrafts, ...action.drafts],
                updatedAt: new Date().toISOString(),
              }
            : i
        ),
      };

    // Task Studio actions
    case 'ADD_TASK_CARD':
      return {
        ...state,
        taskCards: [...(state.taskCards || []), action.taskCard],
      };

    case 'UPDATE_TASK_CARD':
      return {
        ...state,
        taskCards: (state.taskCards || []).map((t) =>
          t.id === action.taskCard.id ? action.taskCard : t
        ),
      };

    case 'DELETE_TASK_CARD':
      return {
        ...state,
        taskCards: (state.taskCards || []).filter((t) => t.id !== action.taskCardId),
      };

    case 'ADD_TASK_CATEGORY':
      return {
        ...state,
        taskCategories: [...(state.taskCategories || []), action.category],
      };

    case 'UPDATE_TASK_CATEGORY':
      return {
        ...state,
        taskCategories: (state.taskCategories || []).map((c) =>
          c.id === action.category.id ? action.category : c
        ),
      };

    case 'DELETE_TASK_CATEGORY':
      return {
        ...state,
        taskCategories: (state.taskCategories || []).filter((c) => c.id !== action.categoryId),
      };

    // Box Template actions
    case 'ADD_BOX_TEMPLATE':
      return {
        ...state,
        boxTemplates: [...(state.boxTemplates || []), action.boxTemplate],
      };

    case 'UPDATE_BOX_TEMPLATE':
      return {
        ...state,
        boxTemplates: (state.boxTemplates || []).map((b) =>
          b.id === action.boxTemplate.id ? action.boxTemplate : b
        ),
      };

    case 'DELETE_BOX_TEMPLATE':
      return {
        ...state,
        boxTemplates: (state.boxTemplates || []).filter((b) => b.id !== action.boxTemplateId),
      };

    // Day Plan actions
    case 'UPSERT_DAY_PLAN': {
      const existing = (state.dayPlans || []).findIndex(
        (dp) => dp.date === action.dayPlan.date && dp.storeId === action.dayPlan.storeId
      );
      if (existing >= 0) {
        const updated = [...(state.dayPlans || [])];
        updated[existing] = action.dayPlan;
        return { ...state, dayPlans: updated };
      }
      return { ...state, dayPlans: [...(state.dayPlans || []), action.dayPlan] };
    }

    case 'UPDATE_DAY_PLAN_STATUS': {
      return {
        ...state,
        dayPlans: (state.dayPlans || []).map((dp) =>
          dp.date === action.date && dp.storeId === action.storeId
            ? { ...dp, status: action.status, updatedAt: new Date().toISOString() }
            : dp
        ),
      };
    }

    // Slot assignment: bind a staff member to a LaborSlot inside a DayPlan
    case 'ASSIGN_SLOT_STAFF': {
      return {
        ...state,
        dayPlans: (state.dayPlans || []).map((dp) => {
          if (dp.date !== action.date || dp.storeId !== action.storeId) return dp;
          return {
            ...dp,
            laborSlots: dp.laborSlots.map((slot) =>
              slot.id === action.slotId
                ? { ...slot, assignedStaffId: action.staffId, assignedStaffName: action.staffName }
                : slot
            ),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'REPLAY_START':
      return {
        ...state,
        replay: {
          isPlaying: false,
          isPaused: false,
          currentIndex: 0,
          pendingEvents: action.events,
        },
      };

    case 'REPLAY_STEP': {
      if (state.replay.currentIndex >= state.replay.pendingEvents.length) {
        return state;
      }

      const nextEvent = state.replay.pendingEvents[state.replay.currentIndex];
      const changedKeys = getChangedKeysForEvent(nextEvent);

      return {
        ...state,
        events: [...state.events, nextEvent],
        replay: {
          ...state.replay,
          currentIndex: state.replay.currentIndex + 1,
        },
        lastChangedKeys: changedKeys,
        highlightUntil: Date.now() + HIGHLIGHT_DURATION,
      };
    }

    case 'REPLAY_PLAY':
      return {
        ...state,
        replay: {
          ...state.replay,
          isPlaying: true,
          isPaused: false,
        },
      };

    case 'REPLAY_PAUSE':
      return {
        ...state,
        replay: {
          ...state.replay,
          isPlaying: false,
          isPaused: true,
        },
      };

    case 'REPLAY_RESET':
      return {
        ...state,
        replay: {
          isPlaying: false,
          isPaused: false,
          currentIndex: 0,
          pendingEvents: [],
        },
      };

    case 'CLEAR_HIGHLIGHT':
      return {
        ...state,
        lastChangedKeys: [],
        highlightUntil: null,
      };

    case 'LOAD_INITIAL_DATA':
      return {
        ...state,
        ...action.data,
      };

    default:
      return state;
  }
};
