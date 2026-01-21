// ============================================================
// All Management + All OS - Reducer
// Single reducer for all state mutations
// ============================================================

import { AppState, AppAction, DomainEvent } from '@/core/types';

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

  // Event log
  events: [],

  // UI state
  selectedStoreId: null,
  selectedTimeBand: 'all',
  selectedMonth: new Date().toISOString().substring(0, 7), // Current month

  // Proposals
  proposals: [],

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
