/**
 * Test Service for Parallel Write Operations
 * This file validates parallel write operations in isolated workspaces
 * Created by Agent-2 Write Test
 */

class DataService {
  constructor() {
    this.data = new Map();
    this.lastId = 0;
  }

  // Create operation
  async create(item) {
    try {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid item data');
      }
      
      const id = ++this.lastId;
      const timestamp = new Date().toISOString();
      const newItem = {
        id,
        ...item,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      this.data.set(id, newItem);
      return { success: true, data: newItem };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Read operation
  async read(id) {
    try {
      const item = this.data.get(Number(id));
      if (!item) {
        throw new Error(`Item with id ${id} not found`);
      }
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update operation
  async update(id, updates) {
    try {
      const item = this.data.get(Number(id));
      if (!item) {
        throw new Error(`Item with id ${id} not found`);
      }
      
      const updatedItem = {
        ...item,
        ...updates,
        id: item.id, // Prevent ID modification
        createdAt: item.createdAt, // Preserve creation time
        updatedAt: new Date().toISOString()
      };
      
      this.data.set(Number(id), updatedItem);
      return { success: true, data: updatedItem };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete operation
  async delete(id) {
    try {
      if (!this.data.has(Number(id))) {
        throw new Error(`Item with id ${id} not found`);
      }
      
      const deleted = this.data.get(Number(id));
      this.data.delete(Number(id));
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // List all items
  async list() {
    try {
      const items = Array.from(this.data.values());
      return { success: true, data: items, count: items.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Clear all data
  async clear() {
    try {
      this.data.clear();
      this.lastId = 0;
      return { success: true, message: 'All data cleared' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export the service class and a singleton instance
const serviceInstance = new DataService();

module.exports = {
  DataService,
  serviceInstance,
  // Helper function for async operation simulation
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};