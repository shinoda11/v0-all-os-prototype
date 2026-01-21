'use client';

// ============================================================
// Event Bus - Pub/Sub for state updates
// Lightweight event system for UI updates without WebSocket
// ============================================================

export type EventBusEventType = 
  | 'state:updated'      // General state update
  | 'event:added'        // Domain event added
  | 'proposal:changed'   // Proposal added/updated/removed
  | 'replay:step'        // Replay stepped
  | 'labor:changed'      // Labor event (check-in/out, break)
  | 'prep:changed'       // Prep event (start/complete)
  | 'decision:changed'   // Decision event (approve/reject/complete)
  | 'sales:changed';     // Sales event

export interface EventBusEvent {
  type: EventBusEventType;
  timestamp: string;
  payload?: {
    eventType?: string;
    changedKeys?: string[];
    [key: string]: unknown;
  };
}

type Listener = (event: EventBusEvent) => void;

class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();
  private allListeners: Set<Listener> = new Set();
  private lastEvent: EventBusEvent | null = null;
  
  // Subscribe to specific event type
  subscribe(type: EventBusEventType, listener: Listener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }
  
  // Subscribe to all events
  subscribeAll(listener: Listener): () => void {
    this.allListeners.add(listener);
    return () => {
      this.allListeners.delete(listener);
    };
  }
  
  // Publish event
  publish(type: EventBusEventType, payload?: EventBusEvent['payload']): void {
    const event: EventBusEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    
    this.lastEvent = event;
    
    // Notify specific listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (e) {
          console.error('[EventBus] Listener error:', e);
        }
      });
    }
    
    // Notify all listeners
    this.allListeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('[EventBus] All listener error:', e);
      }
    });
  }
  
  // Get last event (for debugging)
  getLastEvent(): EventBusEvent | null {
    return this.lastEvent;
  }
  
  // Get last update timestamp
  getLastUpdateTime(): string {
    return this.lastEvent?.timestamp ?? new Date().toISOString();
  }
}

// Singleton instance
export const eventBus = new EventBus();

// React hook for subscribing to event bus
import { useEffect, useState, useCallback } from 'react';

export function useEventBus(types?: EventBusEventType[]): {
  lastEvent: EventBusEvent | null;
  lastUpdateTime: string;
} {
  const [lastEvent, setLastEvent] = useState<EventBusEvent | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>(new Date().toISOString());
  
  useEffect(() => {
    const handleEvent = (event: EventBusEvent) => {
      setLastEvent(event);
      setLastUpdateTime(event.timestamp);
    };
    
    if (types && types.length > 0) {
      // Subscribe to specific types
      const unsubscribes = types.map(type => eventBus.subscribe(type, handleEvent));
      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    } else {
      // Subscribe to all
      return eventBus.subscribeAll(handleEvent);
    }
  }, [types]);
  
  return { lastEvent, lastUpdateTime };
}

// Hook that triggers re-render on state updates
export function useStateSubscription(changedKeys?: string[]): {
  updateCount: number;
  lastUpdateTime: string;
} {
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>(new Date().toISOString());
  
  useEffect(() => {
    const handleEvent = (event: EventBusEvent) => {
      // If changedKeys filter is provided, only update if relevant
      if (changedKeys && changedKeys.length > 0) {
        const eventKeys = event.payload?.changedKeys ?? [];
        const hasRelevantKey = changedKeys.some(key => eventKeys.includes(key));
        if (!hasRelevantKey && event.type !== 'state:updated') {
          return;
        }
      }
      
      setUpdateCount(c => c + 1);
      setLastUpdateTime(event.timestamp);
    };
    
    return eventBus.subscribeAll(handleEvent);
  }, [changedKeys]);
  
  return { updateCount, lastUpdateTime };
}
