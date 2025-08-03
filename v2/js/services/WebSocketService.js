/**
 * WebSocket Service for Real-Time Updates in KC V2
 * Handles bidirectional communication and real-time events
 */

export class WebSocketService {
  constructor(url) {
    this.url = url || this.getDefaultURL();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.reconnectBackoff = 2;
    this.pingInterval = 30000; // 30 seconds
    this.pingTimer = null;
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.state = 'disconnected';
    this.authenticated = false;
    this.subscriptions = new Set();
  }

  getDefaultURL() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  async connect(options = {}) {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    this.state = 'connecting';
    
    try {
      // Create WebSocket connection
      this.ws = new WebSocket(this.url);
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Wait for connection
      await this.waitForConnection();
      
      // Authenticate if token provided
      if (options.token) {
        await this.authenticate(options.token);
      }
      
      // Process queued messages
      this.processMessageQueue();
      
      // Start ping/pong
      this.startPing();
      
      console.log('[WebSocket] Connected successfully');
      
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.state = 'disconnected';
      throw error;
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('[WebSocket] Connection opened');
      this.state = 'connected';
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocket] Connection closed:', event.code, event.reason);
      this.state = 'disconnected';
      this.authenticated = false;
      this.stopPing();
      this.emit('disconnected', { code: event.code, reason: event.reason });
      
      // Attempt reconnection if not a normal closure
      if (event.code !== 1000) {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const checkConnection = () => {
        if (this.state === 'connected') {
          clearTimeout(timeout);
          resolve();
        } else if (this.state === 'disconnected') {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  async authenticate(token) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      const authHandler = (event) => {
        const message = this.parseMessage(event.data);
        if (message.type === 'auth_response') {
          clearTimeout(timeout);
          this.off('message', authHandler);
          
          if (message.success) {
            this.authenticated = true;
            console.log('[WebSocket] Authenticated successfully');
            resolve();
          } else {
            reject(new Error(message.error || 'Authentication failed'));
          }
        }
      };

      this.on('message', authHandler);
      this.send('auth', { token });
    });
  }

  handleMessage(event) {
    try {
      const message = this.parseMessage(event.data);
      
      // Handle system messages
      switch (message.type) {
        case 'pong':
          // Pong received, connection is alive
          break;
        
        case 'error':
          console.error('[WebSocket] Server error:', message.error);
          this.emit('server_error', message);
          break;
        
        case 'subscription_update':
          this.handleSubscriptionUpdate(message);
          break;
        
        default:
          // Emit message to handlers
          this.emit('message', message);
          this.emit(message.type, message.data);
      }
      
    } catch (error) {
      console.error('[WebSocket] Failed to handle message:', error);
    }
  }

  parseMessage(data) {
    try {
      return JSON.parse(data);
    } catch {
      return { type: 'raw', data };
    }
  }

  send(type, data = {}, options = {}) {
    const message = {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: new Date().toISOString()
    };

    if (this.state === 'connected' && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      
      if (options.acknowledge) {
        return this.waitForAcknowledgment(message.id, options.timeout);
      }
    } else {
      // Queue message if not connected
      if (options.queue !== false) {
        this.messageQueue.push(message);
        console.log('[WebSocket] Message queued:', type);
      } else {
        throw new Error('WebSocket not connected');
      }
    }
  }

  waitForAcknowledgment(messageId, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('ack', handler);
        reject(new Error('Acknowledgment timeout'));
      }, timeout);

      const handler = (data) => {
        if (data.messageId === messageId) {
          clearTimeout(timer);
          this.off('ack', handler);
          resolve(data);
        }
      };

      this.on('ack', handler);
    });
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] Failed to send queued message:', error);
        this.messageQueue.unshift(message); // Put it back
        break;
      }
    }
  }

  // Reconnection Logic
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(this.reconnectBackoff, this.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  // Ping/Pong for keep-alive
  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.state === 'connected') {
        this.send('ping');
      }
    }, this.pingInterval);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Subscription Management
  subscribe(channel, options = {}) {
    if (!this.authenticated && options.requireAuth !== false) {
      throw new Error('Authentication required for subscriptions');
    }

    this.subscriptions.add(channel);
    this.send('subscribe', { channel, options });
    
    return () => this.unsubscribe(channel);
  }

  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    this.send('unsubscribe', { channel });
  }

  handleSubscriptionUpdate(message) {
    const { channel, event, data } = message.data;
    this.emit(`channel:${channel}`, { event, data });
  }

  // Event Handling
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
    
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  once(event, handler) {
    const wrappedHandler = (...args) => {
      this.off(event, wrappedHandler);
      handler(...args);
    };
    return this.on(event, wrappedHandler);
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Request/Response Pattern
  async request(type, data, options = {}) {
    const requestId = this.generateMessageId();
    const timeout = options.timeout || 10000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(`response:${requestId}`, responseHandler);
        reject(new Error('Request timeout'));
      }, timeout);

      const responseHandler = (response) => {
        clearTimeout(timer);
        
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      };

      this.once(`response:${requestId}`, responseHandler);
      
      this.send(type, {
        ...data,
        _requestId: requestId
      });
    });
  }

  // Utility Methods
  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getState() {
    return {
      connection: this.state,
      authenticated: this.authenticated,
      subscriptions: Array.from(this.subscriptions),
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  disconnect() {
    this.state = 'disconnecting';
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.state = 'disconnected';
    this.authenticated = false;
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  // File Operations
  async uploadFileChunked(file, onProgress) {
    const chunkSize = 64 * 1024; // 64KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = this.generateMessageId();
    
    // Start upload
    await this.request('upload_start', {
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks
    });

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const reader = new FileReader();
      const chunkData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(chunk);
      });

      await this.request('upload_chunk', {
        uploadId,
        chunkIndex: i,
        chunkData: Array.from(new Uint8Array(chunkData))
      });

      if (onProgress) {
        const progress = ((i + 1) / totalChunks) * 100;
        onProgress(progress);
      }
    }

    // Complete upload
    const result = await this.request('upload_complete', { uploadId });
    return result;
  }

  // Real-time Collaboration
  joinRoom(roomId) {
    return this.subscribe(`room:${roomId}`, { requireAuth: true });
  }

  leaveRoom(roomId) {
    this.unsubscribe(`room:${roomId}`);
  }

  broadcastToRoom(roomId, event, data) {
    this.send('room_broadcast', {
      roomId,
      event,
      data
    });
  }

  // Presence
  updatePresence(data) {
    this.send('presence_update', data);
  }

  // Metrics
  getMetrics() {
    return {
      messagesReceived: this.messagesReceived || 0,
      messagesSent: this.messagesSent || 0,
      bytesReceived: this.bytesReceived || 0,
      bytesSent: this.bytesSent || 0,
      connectionUptime: this.connectionStartTime ? 
        Date.now() - this.connectionStartTime : 0,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Cleanup
  destroy() {
    this.disconnect();
    this.eventHandlers.clear();
    this.subscriptions.clear();
    this.messageQueue = [];
  }
}

// Singleton instance
let wsInstance = null;

export function getWebSocketService(url) {
  if (!wsInstance) {
    wsInstance = new WebSocketService(url);
  }
  return wsInstance;
}