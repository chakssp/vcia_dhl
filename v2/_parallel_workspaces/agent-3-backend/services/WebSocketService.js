/**
 * WebSocketService - Real-time Communication Management
 * 
 * Manages WebSocket connections for real-time updates between V1/V2 systems
 * Handles auto-reconnection, event streaming, and message queuing
 * 
 * @version 2.0.0
 * @author Knowledge Consolidator Team
 */

class WebSocketService {
    constructor(options = {}) {
        this.options = {
            url: options.url || this._getDefaultWebSocketUrl(),
            protocols: options.protocols || ['knowledge-consolidator-v2'],
            reconnectInterval: options.reconnectInterval || 5000,
            maxReconnectAttempts: options.maxReconnectAttempts || 10,
            heartbeatInterval: options.heartbeatInterval || 30000,
            messageQueueSize: options.messageQueueSize || 1000,
            enableCompression: options.enableCompression !== false,
            enableBinaryMessages: options.enableBinaryMessages || false,
            timeout: options.timeout || 10000,
            ...options
        };

        this.connection = null;
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;

        // Message management
        this.messageQueue = [];
        this.pendingMessages = new Map();
        this.messageIdCounter = 0;

        // Event handling
        this.eventHandlers = new Map();
        this.subscriptions = new Set();

        // Statistics
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnectCount: 0,
            connectionUptime: 0,
            lastConnectedAt: null,
            lastDisconnectedAt: null,
            avgLatency: 0,
            latencyHistory: []
        };

        this._setupMessageHandlers();
    }

    /**
     * Initialize WebSocket connection
     */
    async initialize() {
        try {
            await this.connect();
            this._emit('websocket:initialized', { 
                url: this.options.url,
                protocols: this.options.protocols
            });
            return { success: true, message: 'WebSocketService initialized' };
        } catch (error) {
            this._emit('websocket:initialization_failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Establish WebSocket connection
     */
    async connect() {
        if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
            return { success: false, message: 'Already connected or connecting' };
        }

        return new Promise((resolve, reject) => {
            try {
                this.connectionState = 'connecting';
                this._emit('websocket:connecting', { url: this.options.url });

                this.connection = new WebSocket(this.options.url, this.options.protocols);

                // Connection opened
                this.connection.onopen = (event) => {
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this.stats.lastConnectedAt = Date.now();
                    
                    this._startHeartbeat();
                    this._processQueuedMessages();
                    
                    this._emit('websocket:connected', { 
                        event,
                        reconnect: this.stats.reconnectCount > 0
                    });
                    
                    resolve({ success: true, message: 'Connected successfully' });
                };

                // Message received
                this.connection.onmessage = (event) => {
                    this._handleIncomingMessage(event);
                };

                // Connection closed
                this.connection.onclose = (event) => {
                    this._handleConnectionClose(event);
                };

                // Connection error
                this.connection.onerror = (event) => {
                    this._handleConnectionError(event);
                    if (this.connectionState === 'connecting') {
                        reject(new Error('Failed to establish WebSocket connection'));
                    }
                };

                // Timeout handling
                setTimeout(() => {
                    if (this.connectionState === 'connecting') {
                        this.connection.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, this.options.timeout);

            } catch (error) {
                this.connectionState = 'disconnected';
                reject(error);
            }
        });
    }

    /**
     * Send message through WebSocket
     */
    async send(type, data, options = {}) {
        const message = {
            id: this._generateMessageId(),
            type,
            data,
            timestamp: Date.now(),
            ...options
        };

        // Queue message if not connected
        if (this.connectionState !== 'connected') {
            if (this.messageQueue.length >= this.options.messageQueueSize) {
                this.messageQueue.shift(); // Remove oldest message
            }
            this.messageQueue.push(message);
            
            this._emit('websocket:message_queued', { 
                messageId: message.id,
                queueSize: this.messageQueue.length
            });
            
            return { success: true, queued: true, messageId: message.id };
        }

        try {
            const payload = JSON.stringify(message);
            
            // Track pending message for acknowledgment
            if (options.requireAck) {
                this.pendingMessages.set(message.id, {
                    message,
                    sentAt: Date.now(),
                    timeout: setTimeout(() => {
                        this.pendingMessages.delete(message.id);
                        this._emit('websocket:message_timeout', { messageId: message.id });
                    }, options.ackTimeout || 5000)
                });
            }

            this.connection.send(payload);
            this.stats.messagesSent++;
            
            this._emit('websocket:message_sent', { 
                messageId: message.id,
                type,
                size: payload.length
            });

            return { success: true, messageId: message.id };

        } catch (error) {
            this._emit('websocket:send_failed', { 
                messageId: message.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Subscribe to specific event types
     */
    subscribe(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        
        this.eventHandlers.get(eventType).push(handler);
        this.subscriptions.add(eventType);

        // Send subscription message if connected
        if (this.connectionState === 'connected') {
            this.send('subscribe', { eventType });
        }

        return () => this.unsubscribe(eventType, handler);
    }

    /**
     * Unsubscribe from event type
     */
    unsubscribe(eventType, handler) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
            
            if (handlers.length === 0) {
                this.eventHandlers.delete(eventType);
                this.subscriptions.delete(eventType);
                
                // Send unsubscription message if connected
                if (this.connectionState === 'connected') {
                    this.send('unsubscribe', { eventType });
                }
            }
        }
    }

    /**
     * Broadcast message to all connected clients (server-side)
     */
    async broadcast(type, data, options = {}) {
        const message = {
            type: 'broadcast',
            data: {
                broadcastType: type,
                broadcastData: data,
                ...options
            }
        };

        return this.send('broadcast', message, options);
    }

    /**
     * Send real-time update about file changes
     */
    async notifyFileUpdate(fileData) {
        return this.send('file_update', {
            action: 'update',
            file: fileData,
            timestamp: Date.now()
        });
    }

    /**
     * Send real-time update about analysis completion
     */
    async notifyAnalysisComplete(analysisData) {
        return this.send('analysis_complete', {
            analysis: analysisData,
            timestamp: Date.now()
        });
    }

    /**
     * Send real-time update about sync progress
     */
    async notifySyncProgress(progressData) {
        return this.send('sync_progress', {
            progress: progressData,
            timestamp: Date.now()
        });
    }

    /**
     * Handle incoming messages
     */
    _handleIncomingMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.stats.messagesReceived++;

            // Handle acknowledgments
            if (message.type === 'ack') {
                this._handleAcknowledgment(message);
                return;
            }

            // Handle heartbeat
            if (message.type === 'heartbeat') {
                this._handleHeartbeat(message);
                return;
            }

            // Calculate latency if timestamp is present
            if (message.timestamp) {
                const latency = Date.now() - message.timestamp;
                this._updateLatencyStats(latency);
            }

            // Emit specific event type
            this._emit(`websocket:${message.type}`, message);

            // Emit to subscribed handlers
            const handlers = this.eventHandlers.get(message.type) || [];
            handlers.forEach(handler => {
                try {
                    handler(message.data, message);
                } catch (error) {
                    this._emit('websocket:handler_error', {
                        eventType: message.type,
                        error: error.message
                    });
                }
            });

            // Send acknowledgment if required
            if (message.requireAck) {
                this.send('ack', { messageId: message.id });
            }

        } catch (error) {
            this._emit('websocket:parse_error', { 
                error: error.message,
                data: event.data
            });
        }
    }

    /**
     * Handle connection close
     */
    _handleConnectionClose(event) {
        this.connectionState = 'disconnected';
        this.stats.lastDisconnectedAt = Date.now();
        
        if (this.stats.lastConnectedAt) {
            this.stats.connectionUptime += this.stats.lastDisconnectedAt - this.stats.lastConnectedAt;
        }

        this._stopHeartbeat();
        
        this._emit('websocket:disconnected', { 
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });

        // Auto-reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this._scheduleReconnect();
        }
    }

    /**
     * Handle connection error
     */
    _handleConnectionError(event) {
        this._emit('websocket:error', { 
            error: event.error || 'WebSocket connection error',
            event
        });
    }

    /**
     * Schedule automatic reconnection
     */
    _scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.connectionState = 'reconnecting';
        this.reconnectAttempts++;
        
        const delay = this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
        
        this._emit('websocket:reconnecting', { 
            attempt: this.reconnectAttempts,
            delay,
            maxAttempts: this.options.maxReconnectAttempts
        });

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
                this.stats.reconnectCount++;
            } catch (error) {
                this._emit('websocket:reconnect_failed', { 
                    attempt: this.reconnectAttempts,
                    error: error.message
                });
                
                if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
                    this._scheduleReconnect();
                } else {
                    this._emit('websocket:max_reconnects_reached', {
                        attempts: this.reconnectAttempts
                    });
                }
            }
        }, delay);
    }

    /**
     * Process queued messages after connection
     */
    _processQueuedMessages() {
        const queuedMessages = [...this.messageQueue];
        this.messageQueue = [];

        queuedMessages.forEach(async (message) => {
            try {
                await this.send(message.type, message.data, message);
            } catch (error) {
                this._emit('websocket:queued_message_failed', {
                    messageId: message.id,
                    error: error.message
                });
            }
        });

        if (queuedMessages.length > 0) {
            this._emit('websocket:queue_processed', {
                count: queuedMessages.length
            });
        }
    }

    /**
     * Start heartbeat mechanism
     */
    _startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(() => {
            if (this.connectionState === 'connected') {
                this.send('heartbeat', { timestamp: Date.now() });
            }
        }, this.options.heartbeatInterval);
    }

    /**
     * Stop heartbeat mechanism
     */
    _stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Handle heartbeat response
     */
    _handleHeartbeat(message) {
        const latency = Date.now() - message.data.timestamp;
        this._updateLatencyStats(latency);
        
        this._emit('websocket:heartbeat', { latency });
    }

    /**
     * Handle message acknowledgment
     */
    _handleAcknowledgment(message) {
        const pending = this.pendingMessages.get(message.data.messageId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingMessages.delete(message.data.messageId);
            
            this._emit('websocket:message_acknowledged', {
                messageId: message.data.messageId,
                roundTripTime: Date.now() - pending.sentAt
            });
        }
    }

    /**
     * Update latency statistics
     */
    _updateLatencyStats(latency) {
        this.stats.latencyHistory.push(latency);
        
        // Keep only last 100 measurements
        if (this.stats.latencyHistory.length > 100) {
            this.stats.latencyHistory.shift();
        }
        
        // Calculate average
        this.stats.avgLatency = this.stats.latencyHistory.reduce((sum, lat) => sum + lat, 0) / 
                               this.stats.latencyHistory.length;
    }

    /**
     * Setup default message handlers
     */
    _setupMessageHandlers() {
        // File update notifications
        this.subscribe('file_update', (data) => {
            this._emit('data:file_updated', data);
        });

        // Analysis completion notifications
        this.subscribe('analysis_complete', (data) => {
            this._emit('data:analysis_complete', data);
        });

        // Sync progress notifications
        this.subscribe('sync_progress', (data) => {
            this._emit('data:sync_progress', data);
        });

        // System notifications
        this.subscribe('system_notification', (data) => {
            this._emit('system:notification', data);
        });
    }

    /**
     * Get connection statistics
     */
    getStats() {
        return {
            ...this.stats,
            connectionState: this.connectionState,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            pendingMessages: this.pendingMessages.size,
            subscriptions: Array.from(this.subscriptions)
        };
    }

    /**
     * Get default WebSocket URL
     */
    _getDefaultWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws/knowledge-consolidator`;
    }

    /**
     * Generate unique message ID
     */
    _generateMessageId() {
        return `msg_${Date.now()}_${++this.messageIdCounter}`;
    }

    /**
     * Event emission
     */
    _emit(event, data) {
        // Internal event handling for global listeners
        const globalHandlers = this.eventHandlers.get('*') || [];
        globalHandlers.forEach(handler => {
            try {
                handler(event, data);
            } catch (error) {
                console.error('WebSocketService global event handler error:', error);
            }
        });

        // Emit to window if available (for V2 integration)
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit(event, data);
        }
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this._stopHeartbeat();

        if (this.connection && this.connectionState === 'connected') {
            this.connection.close(1000, 'Client disconnect');
        }

        this.connectionState = 'disconnected';
        this._emit('websocket:manual_disconnect', { timestamp: Date.now() });
    }

    /**
     * Check if service is ready
     */
    isReady() {
        return this.connectionState === 'connected';
    }

    /**
     * Wait for connection to be established
     */
    async waitForConnection(timeout = 10000) {
        if (this.connectionState === 'connected') {
            return true;
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, timeout);

            const handler = () => {
                clearTimeout(timeoutId);
                resolve(true);
            };

            this.eventHandlers.set('websocket:connected', [handler]);
        });
    }
}

// Export for V2 integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketService;
} else if (typeof window !== 'undefined') {
    window.WebSocketService = WebSocketService;
}