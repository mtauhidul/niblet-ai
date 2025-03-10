// lib/events.ts
/**
 * A simple event emitter to handle real-time updates across components
 */
type EventCallback = () => void;
type EventType = "meal-updated" | "weight-updated" | "chart-refresh-needed";

class EventEmitter {
  private listeners: Record<string, EventCallback[]> = {};

  // Add an event listener
  on(event: EventType, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return an unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  // Remove an event listener
  off(event: EventType, callback: EventCallback) {
    if (!this.listeners[event]) return;

    this.listeners[event] = this.listeners[event].filter(
      (listener) => listener !== callback
    );
  }

  // Emit an event
  emit(event: EventType) {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

// Create and export a singleton instance
const eventEmitter = new EventEmitter();
export default eventEmitter;
