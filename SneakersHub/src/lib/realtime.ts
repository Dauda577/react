// src/lib/realtime.ts
import { supabase } from './supabase';

class RealtimeManager {
  private subscriptions: Map<string, any> = new Map();

  // Listen to real-time changes on a table
  subscribeToTable(
    table: string, 
    callback: (payload: any) => void,
    filter?: { column: string; value: any }
  ) {
    let query = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined
        },
        (payload) => {
          console.log('Real-time update:', payload);
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set(table, query);
    return query;
  }

  // Listen to specific events
  subscribeToEvents(
    channel: string,
    events: { [key: string]: (data: any) => void }
  ) {
    const subscription = supabase
      .channel(channel)
      .on('broadcast', { event: '*' }, (payload) => {
        const handler = events[payload.event];
        if (handler) handler(payload.payload);
      })
      .subscribe();

    return subscription;
  }

  // Unsubscribe from a channel
  unsubscribe(table: string) {
    const sub = this.subscriptions.get(table);
    if (sub) {
      supabase.removeChannel(sub);
      this.subscriptions.delete(table);
    }
  }

  // Clean up all subscriptions
  cleanup() {
    this.subscriptions.forEach((sub) => {
      supabase.removeChannel(sub);
    });
    this.subscriptions.clear();
  }
}

export const realtime = new RealtimeManager();