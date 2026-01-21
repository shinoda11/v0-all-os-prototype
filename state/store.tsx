'use client';

// ============================================================
// All Management + All OS - Store Context
// Single context provider for all application state
// ============================================================

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppAction, DomainEvent, Proposal, TimeBand } from '@/core/types';
import { appReducer, initialState } from './reducer';
import { loadMockData, loadSampleEvents } from '@/data/mock';
import { generateProposals } from '@/core/proposals';
import * as commands from '@/core/commands';

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
    completeDecision: (proposal: Proposal) => void;
    updateProposal: (proposal: Proposal) => void;
    // Replay
    startReplay: () => void;
    stepReplay: () => void;
    playReplay: () => void;
    pauseReplay: () => void;
    resetReplay: () => void;
    // Proposals
    refreshProposals: () => void;
  };
}

// ------------------------------------------------------------
// Context Creation
// ------------------------------------------------------------

const StoreContext = createContext<StoreContextValue | null>(null);

// ------------------------------------------------------------
// Provider Component
// ------------------------------------------------------------

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial mock data
  useEffect(() => {
    const mockData = loadMockData();
    dispatch({ type: 'LOAD_INITIAL_DATA', data: mockData });
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
    },

    checkOut: (staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.checkOut(storeId, staffId);
      dispatch({ type: 'ADD_EVENT', event });
    },

    startBreak: (staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.startBreak(storeId, staffId);
      dispatch({ type: 'ADD_EVENT', event });
    },

    endBreak: (staffId: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.endBreak(storeId, staffId);
      dispatch({ type: 'ADD_EVENT', event });
    },

    // Prep
    startPrep: (prepItemId: string, quantity: number, staffId?: string, decisionId?: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.startPrep(storeId, prepItemId, quantity, staffId, decisionId);
      dispatch({ type: 'ADD_EVENT', event });
    },

    completePrep: (prepItemId: string, quantity: number, staffId?: string, decisionId?: string) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.completePrep(storeId, prepItemId, quantity, staffId, decisionId);
      dispatch({ type: 'ADD_EVENT', event });
    },

    // Decision
    approveProposal: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.approveProposal(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event });
      dispatch({ type: 'REMOVE_PROPOSAL', proposalId: proposal.id });
    },

    rejectProposal: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.rejectProposal(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event });
      dispatch({ type: 'REMOVE_PROPOSAL', proposalId: proposal.id });
    },

    startDecision: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.startDecision(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event });
    },

    completeDecision: (proposal: Proposal) => {
      const storeId = storeIdRef.current;
      if (!storeId) return;
      const event = commands.completeDecision(storeId, proposal);
      dispatch({ type: 'ADD_EVENT', event });
    },

    updateProposal: (proposal: Proposal) => {
      dispatch({ type: 'UPDATE_PROPOSAL', proposal });
    },

    // Replay
    startReplay: () => {
      const sampleEvents = loadSampleEvents();
      dispatch({ type: 'REPLAY_START', events: sampleEvents });
    },

    stepReplay: () => {
      dispatch({ type: 'REPLAY_STEP' });
    },

    playReplay: () => {
      dispatch({ type: 'REPLAY_PLAY' });
    },

    pauseReplay: () => {
      dispatch({ type: 'REPLAY_PAUSE' });
    },

    resetReplay: () => {
      dispatch({ type: 'REPLAY_RESET' });
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
