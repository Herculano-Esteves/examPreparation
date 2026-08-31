/**
 * events.js
 * ---------
 * Centralised, lightweight Event Bus (Publish/Subscribe pattern).
 * Decouples navigation, language switches, exams orchestration, and screen rendering
 * to eliminate circular dependencies and tight couplings between modules.
 */

export const APP_EVENTS = Object.freeze({
    SCREEN_CHANGED:    'screen:changed',
    LANGUAGE_CHANGED:  'language:changed',
    CADEIRA_SELECTED:  'cadeira:selected',
    EXAM_STARTED:      'exam:started',
    EXAM_FINISHED:     'exam:finished',
    FILTERS_RESET:     'filters:reset',
    NOTIFICATION:      'app:notification'
});

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an application event.
     * @param {string} event - Event name from APP_EVENTS or custom string
     * @param {Function} handler - Callback function receiving payload
     * @returns {Function} Unsubscribe function
     */
    on(event, handler) {
        if (typeof handler !== 'function') {
            console.warn(`[EventBus] Handler for event "${event}" is not a function.`);
            return () => {};
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        const eventSet = this.listeners.get(event);
        eventSet.add(handler);

        return () => this.off(event, handler);
    }

    /**
     * Unsubscribe a handler from an event.
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
        if (!this.listeners.has(event)) return;
        const eventSet = this.listeners.get(event);
        eventSet.delete(handler);
        if (eventSet.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Subscribe to an event for a single invocation only.
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} Unsubscribe function
     */
    once(event, handler) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            handler(data);
        });
        return unsubscribe;
    }

    /**
     * Publish / Emit an event with an optional payload to all active subscribers.
     * @param {string} event
     * @param {*} [data]
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        const eventSet = this.listeners.get(event);

        eventSet.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                console.error(`[EventBus] Error executing subscriber for "${event}":`, err);
            }
        });
    }

    /**
     * Clears all listeners or all listeners for a specific event.
     * @param {string} [event]
     */
    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

export const Events = new EventBus();
