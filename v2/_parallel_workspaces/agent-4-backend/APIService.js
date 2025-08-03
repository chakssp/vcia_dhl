/**
 * Complete API Service Implementation for KC V2
 * Handles all backend communication with caching and error handling
 */

export class APIService {
  constructor() {
    this.baseURL = this.getBaseURL();
    this.wsURL = this.getWebSocketURL();
    this.apiKey = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.requestQueue = [];
    this.rateLimits = new Map();
    this.ws = null;
    this.wsReconnectAttempts = 0;
    this.wsMaxReconnects = 5;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load API configuration
      await this.loadConfiguration();
      
      // Test API connection
      await this.testConnection();
      
      // Initialize WebSocket
      await this.initializeWebSocket();
      
      // Setup request interceptors
      this.setupInterceptors();
      
      this.initialized = true;
      console.log('[API] Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[API] Initialization failed:', error);
      throw error;
    }
  }

  getBaseURL() {
    // Check for environment variable or use default
    return process.env.KC_API_URL || window.KC_API_URL || 'http://localhost:3000/api';
  }

  getWebSocketURL() {
    const baseURL = this.getBaseURL();
    return baseURL.replace(/^http/, 'ws').replace('/api', '/ws');
  }

  async loadConfiguration() {
    try {
      // Load from localStorage first
      const savedConfig = localStorage.getItem('kc-api-config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.baseURL = config.baseURL || this.baseURL;
        this.apiKey = config.apiKey || null;
        this.headers = { ...this.headers, ...config.headers };
      }
      
      // Try to load from server
      const response = await fetch(`${this.baseURL}/config`);
      if (response.ok) {
        const serverConfig = await response.json();
        this.applyServerConfig(serverConfig);
      }
    } catch (error) {
      console.warn('[API] Could not load configuration:', error);
    }
  }

  applyServerConfig(config) {
    if (config.features) {
      this.features = config.features;
    }
    if (config.rateLimits) {
      Object.entries(config.rateLimits).forEach(([endpoint, limit]) => {
        this.rateLimits.set(endpoint, {
          requests: limit.requests,
          window: limit.window,
          current: 0,
          resetTime: Date.now() + limit.window
        });
      });
    }
  }

  async testConnection() {
    try {
      const response = await this.get('/health');
      if (!response.ok) {
        throw new Error('API health check failed');
      }
      return true;
    } catch (error) {
      console.error('[API] Connection test failed:', error);
      return false;
    }
  }

  setupInterceptors() {
    // Request interceptor
    this.beforeRequest = (config) => {
      // Add auth header if available
      if (this.apiKey) {
        config.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      // Add request ID for tracking
      config.headers['X-Request-ID'] = this.generateRequestId();
      
      return config;
    };
    
    // Response interceptor
    this.afterResponse = (response) => {
      // Log response time
      const requestTime = response.headers.get('X-Response-Time');
      if (requestTime) {
        console.debug(`[API] Request took ${requestTime}ms`);
      }
      
      return response;
    };
  }

  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // HTTP Methods

  async request(method, endpoint, options = {}) {
    // Check rate limits
    if (!this.checkRateLimit(endpoint)) {
      throw new Error('Rate limit exceeded');
    }
    
    // Check cache
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(options.params || {})}`;
    if (method === 'GET' && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.expires > Date.now()) {
        console.debug('[API] Returning cached response');
        return cached.data;
      }
    }
    
    // Prepare request
    const config = {
      method,
      headers: { ...this.headers },
      ...options
    };
    
    // Apply request interceptor
    const finalConfig = this.beforeRequest(config);
    
    // Build URL with params
    const url = new URL(this.baseURL + endpoint);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    // Add body if needed
    if (options.body && method !== 'GET') {
      finalConfig.body = JSON.stringify(options.body);
    }
    
    try {
      // Make request
      let response = await fetch(url.toString(), finalConfig);
      
      // Apply response interceptor
      response = this.afterResponse(response);
      
      // Handle errors
      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }
      
      // Parse response
      const data = await response.json();
      
      // Cache if GET request
      if (method === 'GET') {
        this.cache.set(cacheKey, {
          data,
          expires: Date.now() + this.cacheTimeout
        });
      }
      
      // Update rate limit
      this.updateRateLimit(endpoint);
      
      return data;
      
    } catch (error) {
      console.error(`[API] ${method} ${endpoint} failed:`, error);
      throw error;
    }
  }

  async get(endpoint, params) {
    return this.request('GET', endpoint, { params });
  }

  async post(endpoint, body) {
    return this.request('POST', endpoint, { body });
  }

  async put(endpoint, body) {
    return this.request('PUT', endpoint, { body });
  }

  async patch(endpoint, body) {
    return this.request('PATCH', endpoint, { body });
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  // Error Handling

  async handleErrorResponse(response) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    
    const error = new Error(errorData.message || 'API request failed');
    error.status = response.status;
    error.data = errorData;
    
    // Handle specific error codes
    switch (response.status) {
      case 401:
        this.handleUnauthorized();
        break;
      case 429:
        this.handleRateLimitExceeded(response);
        break;
      case 503:
        this.handleServiceUnavailable();
        break;
    }
    
    return error;
  }

  handleUnauthorized() {
    // Clear auth and redirect to login
    this.apiKey = null;
    localStorage.removeItem('kc-api-key');
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  handleRateLimitExceeded(response) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const waitTime = parseInt(retryAfter) * 1000;
      console.warn(`[API] Rate limit exceeded. Retry after ${retryAfter}s`);
      
      // Queue the request for retry
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('api:retry'));
      }, waitTime);
    }
  }

  handleServiceUnavailable() {
    console.error('[API] Service unavailable');
    window.dispatchEvent(new CustomEvent('api:unavailable'));
  }

  // Rate Limiting

  checkRateLimit(endpoint) {
    const limit = this.rateLimits.get(endpoint);
    if (!limit) return true;
    
    // Reset if window expired
    if (Date.now() > limit.resetTime) {
      limit.current = 0;
      limit.resetTime = Date.now() + limit.window;
    }
    
    return limit.current < limit.requests;
  }

  updateRateLimit(endpoint) {
    const limit = this.rateLimits.get(endpoint);
    if (limit) {
      limit.current++;
    }
  }

  // WebSocket Management

  async initializeWebSocket() {
    if (!this.wsURL) return;
    
    try {
      this.ws = new WebSocket(this.wsURL);
      
      this.ws.onopen = () => {
        console.log('[API] WebSocket connected');
        this.wsReconnectAttempts = 0;
        
        // Authenticate
        if (this.apiKey) {
          this.ws.send(JSON.stringify({
            type: 'auth',
            token: this.apiKey
          }));
        }
      };
      
      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
      
      this.ws.onerror = (error) => {
        console.error('[API] WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('[API] WebSocket disconnected');
        this.reconnectWebSocket();
      };
      
    } catch (error) {
      console.error('[API] WebSocket initialization failed:', error);
    }
  }

  handleWebSocketMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Dispatch event based on message type
      window.dispatchEvent(new CustomEvent(`ws:${message.type}`, {
        detail: message.data
      }));
      
    } catch (error) {
      console.error('[API] Failed to parse WebSocket message:', error);
    }
  }

  reconnectWebSocket() {
    if (this.wsReconnectAttempts >= this.wsMaxReconnects) {
      console.error('[API] Max WebSocket reconnection attempts reached');
      return;
    }
    
    this.wsReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000);
    
    console.log(`[API] Reconnecting WebSocket in ${delay}ms...`);
    setTimeout(() => {
      this.initializeWebSocket();
    }, delay);
  }

  sendWebSocketMessage(type, data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[API] WebSocket not connected');
      return false;
    }
    
    this.ws.send(JSON.stringify({ type, data }));
    return true;
  }

  // API Endpoints

  // Files
  async getFiles(params) {
    return this.get('/files', params);
  }

  async getFile(id) {
    return this.get(`/files/${id}`);
  }

  async createFile(file) {
    return this.post('/files', file);
  }

  async updateFile(id, updates) {
    return this.patch(`/files/${id}`, updates);
  }

  async deleteFile(id) {
    return this.delete(`/files/${id}`);
  }

  async discoverFiles(options) {
    return this.post('/files/discover', options);
  }

  async saveFile(file) {
    if (file.id) {
      return this.updateFile(file.id, file);
    }
    return this.createFile(file);
  }

  // Analysis
  async analyzeFile(file, options = {}) {
    return this.post('/analysis/analyze', { file, options });
  }

  async getAnalysis(fileId) {
    return this.get(`/analysis/${fileId}`);
  }

  async saveAnalysis(analysis) {
    return this.post('/analysis', analysis);
  }

  // Categories
  async getCategories() {
    return this.get('/categories');
  }

  async getCategory(id) {
    return this.get(`/categories/${id}`);
  }

  async createCategory(category) {
    return this.post('/categories', category);
  }

  async updateCategory(id, updates) {
    return this.patch(`/categories/${id}`, updates);
  }

  async deleteCategory(id) {
    return this.delete(`/categories/${id}`);
  }

  async saveCategory(category) {
    if (category.id) {
      return this.updateCategory(category.id, category);
    }
    return this.createCategory(category);
  }

  // Qdrant Integration
  async checkQdrantConnection() {
    return this.get('/qdrant/health');
  }

  async createQdrantCollection(name, config = {}) {
    return this.post('/qdrant/collections', { name, ...config });
  }

  async uploadToQdrant(collection, data, options = {}) {
    return this.post('/qdrant/upload', {
      collection,
      data,
      options
    });
  }

  async searchQdrant(collection, query, options = {}) {
    return this.post('/qdrant/search', {
      collection,
      query,
      ...options
    });
  }

  // Settings
  async getSettings(key) {
    return this.get(`/settings/${key}`);
  }

  async saveSettings(key, value) {
    return this.put(`/settings/${key}`, { value });
  }

  // State Management
  async getState(key) {
    return this.get(`/state/${key}`);
  }

  async saveState(key, value) {
    return this.put(`/state/${key}`, { value });
  }

  // Export
  async exportData(format, options = {}) {
    return this.post('/export', { format, options });
  }

  // Batch Operations
  async batchOperation(operations) {
    return this.post('/batch', { operations });
  }

  // Utility Methods

  clearCache() {
    this.cache.clear();
    console.log('[API] Cache cleared');
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('kc-api-key', key);
  }

  getApiKey() {
    return this.apiKey;
  }

  isAuthenticated() {
    return !!this.apiKey;
  }

  async checkHealth() {
    try {
      const health = await this.get('/health');
      return {
        api: health.status === 'ok',
        database: health.database === 'connected',
        qdrant: health.qdrant === 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        api: false,
        database: false,
        qdrant: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Progress Tracking
  trackProgress(operationId, callback) {
    // Subscribe to WebSocket updates for this operation
    const handler = (event) => {
      if (event.detail.operationId === operationId) {
        callback(event.detail.progress);
      }
    };
    
    window.addEventListener('ws:progress', handler);
    
    // Return unsubscribe function
    return () => {
      window.removeEventListener('ws:progress', handler);
    };
  }

  // File Upload with Progress
  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      xhr.open('POST', `${this.baseURL}/files/upload`);
      
      if (this.apiKey) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
      }
      
      xhr.send(formData);
    });
  }

  // Retry Logic
  async withRetry(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const delay = options.delay || 1000;
    const backoff = options.backoff || 2;
    
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          const waitTime = delay * Math.pow(backoff, i);
          console.log(`[API] Retrying after ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
  }

  // Cleanup
  destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.cache.clear();
    this.requestQueue = [];
    this.rateLimits.clear();
  }
}