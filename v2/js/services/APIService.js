/**
 * APIService - Handles all API communications
 */

import eventBus, { Events } from '../core/EventBus.js';

export class APIService {
  constructor() {
    this.baseURL = 'http://localhost:3333/api';
    this.headers = {
      'Content-Type': 'application/json'
    };
    this.connected = false;
  }

  /**
   * Initialize API service
   */
  async initialize() {
    try {
      // Check API health
      const health = await this.checkHealth();
      this.connected = health.status === 'ok';
      
      if (this.connected) {
        console.log('[APIService] Connected to backend:', health);
      }
      
      return this.connected;
    } catch (error) {
      console.error('[APIService] Failed to connect:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Make API request
   * @private
   */
  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: this.headers
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    // Emit request event
    eventBus.emit(Events.API_REQUEST, { method, endpoint, data });

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      // Emit response event
      eventBus.emit(Events.API_RESPONSE, { method, endpoint, result });

      return result;
    } catch (error) {
      // Emit error event
      eventBus.emit(Events.API_ERROR, { method, endpoint, error });
      throw error;
    }
  }

  /**
   * Health check
   */
  async checkHealth() {
    const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
    return response.json();
  }

  // Categories endpoints

  async getCategories() {
    return this.request('GET', '/categories');
  }

  async createCategory(category) {
    return this.request('POST', '/categories', category);
  }

  async updateCategory(id, updates) {
    return this.request('PUT', `/categories/${id}`, updates);
  }

  async deleteCategory(id) {
    return this.request('DELETE', `/categories/${id}`);
  }

  // Settings endpoints

  async getSettings(key) {
    return this.request('GET', `/settings/${key}`);
  }

  async updateSettings(key, value) {
    return this.request('PUT', `/settings/${key}`, { value });
  }

  // State endpoints

  async getState(key) {
    return this.request('GET', `/state/${key}`);
  }

  async updateState(key, value) {
    return this.request('PUT', `/state/${key}`, { value });
  }

  // File categories endpoints

  async getFileCategories(fileId) {
    return this.request('GET', `/files/${fileId}/categories`);
  }

  async addFileCategory(fileId, categoryId) {
    return this.request('POST', `/files/${fileId}/categories/${categoryId}`);
  }

  async removeFileCategory(fileId, categoryId) {
    return this.request('DELETE', `/files/${fileId}/categories/${categoryId}`);
  }

  // Batch operations

  async batchCreateCategories(categories) {
    const results = [];
    for (const category of categories) {
      try {
        const result = await this.createCategory(category);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  }

  async batchUpdateFileCategories(fileId, categoryIds) {
    // Remove all existing categories
    const existing = await this.getFileCategories(fileId);
    for (const cat of existing) {
      await this.removeFileCategory(fileId, cat.id);
    }
    
    // Add new categories
    for (const categoryId of categoryIds) {
      await this.addFileCategory(fileId, categoryId);
    }
    
    return this.getFileCategories(fileId);
  }

  // V1 Integration via LegacyBridge

  async searchQdrant(query) {
    // Try V2 endpoint first
    try {
      return await this.request('POST', '/search', { query });
    } catch (error) {
      // Fallback to V1 via bridge
      if (window.KC?.legacyBridge?.qdrantService) {
        return window.KC.legacyBridge.qdrantService.search(query);
      }
      throw error;
    }
  }

  async analyzeFile(file) {
    // Try V2 endpoint first
    try {
      return await this.request('POST', '/analyze', { file });
    } catch (error) {
      // Fallback to V1 via bridge
      if (window.KC?.legacyBridge?.analysisManager) {
        return window.KC.legacyBridge.analysisManager.analyzeFile(file);
      }
      throw error;
    }
  }

  // Utility methods

  isConnected() {
    return this.connected;
  }

  setAuthToken(token) {
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
  }

  setBaseURL(url) {
    this.baseURL = url.endsWith('/api') ? url : `${url}/api`;
  }
}

// Create singleton instance
export const apiService = new APIService();