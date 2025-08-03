/**
 * Test Component for Parallel Write Validation
 * Created by Agent-1 (Frontend)
 * Purpose: Validate parallel write operations in isolated workspaces
 */

import { EventEmitter } from 'events';

// Simple state management class
class StateManager {
    constructor() {
        this.state = {
            count: 0,
            messages: [],
            isLoading: false,
            lastUpdate: null
        };
        this.listeners = [];
    }

    getState() {
        return { ...this.state };
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.state.lastUpdate = new Date().toISOString();
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

// Main component class
export class TestComponent extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            name: 'TestComponent',
            version: '1.0.0',
            ...config
        };
        this.stateManager = new StateManager();
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        this.stateManager.subscribe(state => {
            this.emit('stateChange', state);
        });
        
        this.initialized = true;
        this.emit('initialized', { timestamp: Date.now() });
    }

    increment() {
        const currentState = this.stateManager.getState();
        this.stateManager.setState({ count: currentState.count + 1 });
    }

    addMessage(text) {
        const currentState = this.stateManager.getState();
        const message = {
            id: Date.now(),
            text,
            timestamp: new Date().toISOString()
        };
        this.stateManager.setState({
            messages: [...currentState.messages, message]
        });
    }

    render() {
        const state = this.stateManager.getState();
        return {
            type: 'div',
            props: {
                className: 'test-component',
                'data-count': state.count
            },
            children: [
                {
                    type: 'h2',
                    text: `${this.config.name} (Count: ${state.count})`
                },
                {
                    type: 'ul',
                    children: state.messages.map(msg => ({
                        type: 'li',
                        key: msg.id,
                        text: `${msg.text} - ${msg.timestamp}`
                    }))
                }
            ]
        };
    }
}

// Export default instance factory
export default function createTestComponent(config) {
    return new TestComponent(config);
}