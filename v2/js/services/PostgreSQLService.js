/**
 * PostgreSQL Service for KC V2
 * Direct connection to existing PostgreSQL instance
 */

class PostgreSQLService {
  constructor() {
    this.config = {
      host: 'localhost',
      port: 5432,
      database: 'kc_v2',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'd14172577127a87c06df94de6047d7b6'
    };
    
    this.db = null;
    this.initialized = false;
  }
  
  async initialize() {
    try {
      // For browser environment, we'll need to use an API
      // For now, this is the structure for backend API
      if (typeof window !== 'undefined') {
        console.log('PostgreSQL Service: Browser environment detected');
        console.log('Will use API endpoints instead of direct connection');
        this.initialized = true;
        return;
      }
      
      // Node.js environment - direct connection
      const pgp = require('pg-promise')();
      this.db = pgp(this.config);
      
      // Test connection
      await this.db.one('SELECT version()');
      console.log('PostgreSQL connected successfully');
      
      // Initialize schema
      await this.initializeSchema();
      
      this.initialized = true;
    } catch (error) {
      console.error('PostgreSQL initialization error:', error);
      throw error;
    }
  }
  
  async initializeSchema() {
    const schema = `
      -- Categories table (single source of truth)
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#4A90E2',
        boost INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- File categories junction table
      CREATE TABLE IF NOT EXISTS file_categories (
        file_id VARCHAR(255) NOT NULL,
        category_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (file_id, category_id),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
      
      -- App state storage
      CREATE TABLE IF NOT EXISTS app_state (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Analysis results
      CREATE TABLE IF NOT EXISTS analysis_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id VARCHAR(255) NOT NULL,
        analysis_type VARCHAR(100),
        result JSONB,
        confidence_score INTEGER,
        provider VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Settings storage
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_file_categories_file ON file_categories(file_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_file ON analysis_results(file_id);
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    `;
    
    try {
      await this.db.none(schema);
      console.log('Database schema initialized');
      
      // Insert default categories if none exist
      await this.insertDefaultCategories();
    } catch (error) {
      console.error('Schema initialization error:', error);
      throw error;
    }
  }
  
  async insertDefaultCategories() {
    const defaultCategories = [
      { name: 'Projetos', color: '#4A90E2' },
      { name: 'Ideias', color: '#7ED321' },
      { name: 'Referências', color: '#F5A623' },
      { name: 'Estudos', color: '#BD10E0' },
      { name: 'IA/ML', color: '#9013FE' },
      { name: 'Desenvolvimento', color: '#50E3C2' },
      { name: 'Negócios', color: '#B8E986' }
    ];
    
    for (const cat of defaultCategories) {
      await this.db.none(`
        INSERT INTO categories (name, color) 
        VALUES ($1, $2) 
        ON CONFLICT (name) DO NOTHING
      `, [cat.name, cat.color]);
    }
  }
  
  // CRUD Operations for Categories
  async getCategories() {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch('/api/categories');
      return response.json();
    }
    
    return this.db.any('SELECT * FROM categories ORDER BY name');
  }
  
  async createCategory(name, color = '#4A90E2', boost = 0) {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, boost })
      });
      return response.json();
    }
    
    return this.db.one(`
      INSERT INTO categories (name, color, boost) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [name, color, boost]);
  }
  
  async updateCategory(id, updates) {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return response.json();
    }
    
    const setClauses = [];
    const values = [id];
    let paramIndex = 2;
    
    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      setClauses.push(`color = $${paramIndex++}`);
      values.push(updates.color);
    }
    if (updates.boost !== undefined) {
      setClauses.push(`boost = $${paramIndex++}`);
      values.push(updates.boost);
    }
    
    setClauses.push('updated_at = NOW()');
    
    return this.db.one(`
      UPDATE categories 
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);
  }
  
  async deleteCategory(id) {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    }
    
    await this.db.none('DELETE FROM categories WHERE id = $1', [id]);
    return true;
  }
  
  // Settings operations
  async getSetting(key, defaultValue = null) {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch(`/api/settings/${key}`);
      if (!response.ok) return defaultValue;
      const data = await response.json();
      return data.value || defaultValue;
    }
    
    try {
      const result = await this.db.oneOrNone(
        'SELECT value FROM settings WHERE key = $1',
        [key]
      );
      return result ? result.value : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }
  
  async setSetting(key, value) {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      return response.ok;
    }
    
    await this.db.none(`
      INSERT INTO settings (key, value) 
      VALUES ($1, $2) 
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, updated_at = NOW()
    `, [key, value]);
    
    return true;
  }
  
  // App State operations
  async getAppState(key, defaultValue = null) {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch(`/api/state/${key}`);
      if (!response.ok) return defaultValue;
      const data = await response.json();
      return data.value || defaultValue;
    }
    
    try {
      const result = await this.db.oneOrNone(
        'SELECT value FROM app_state WHERE key = $1',
        [key]
      );
      return result ? result.value : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }
  
  async setAppState(key, value) {
    if (!this.initialized) await this.initialize();
    
    if (typeof window !== 'undefined') {
      // Browser: use API
      const response = await fetch(`/api/state/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      return response.ok;
    }
    
    await this.db.none(`
      INSERT INTO app_state (key, value) 
      VALUES ($1, $2) 
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, updated_at = NOW()
    `, [key, value]);
    
    return true;
  }
}

// Export for use in KC V2
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PostgreSQLService;
} else {
  window.PostgreSQLService = PostgreSQLService;
}