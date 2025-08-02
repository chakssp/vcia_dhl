/**
 * KC V2 API Server - PostgreSQL Version for Production
 */

const express = require('express');
const cors = require('cors');
const pgp = require('pg-promise')();

const app = express();
const PORT = process.env.API_PORT || 3333;

// Database connection
const db = pgp({
  host: process.env.PG_HOST || 'postgres', // container name in docker network
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'kc_v2',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'KC V2 API',
    environment: process.env.NODE_ENV || 'production',
    database: 'PostgreSQL'
  });
});

// Categories endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.any('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, color = '#4A90E2', boost = 0 } = req.body;
    const category = await db.one(
      'INSERT INTO categories (name, color, boost) VALUES ($1, $2, $3) RETURNING *',
      [name, color, boost]
    );
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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
    
    const category = await db.one(
      `UPDATE categories SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.none('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings endpoints
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await db.oneOrNone(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    res.json(result || { value: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    await db.none(
      `INSERT INTO settings (key, value) 
       VALUES ($1, $2) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// App State endpoints
app.get('/api/state/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await db.oneOrNone(
      'SELECT value FROM app_state WHERE key = $1',
      [key]
    );
    res.json(result || { value: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/state/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    await db.none(
      `INSERT INTO app_state (key, value) 
       VALUES ($1, $2) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File categories endpoints
app.get('/api/files/:fileId/categories', async (req, res) => {
  try {
    const { fileId } = req.params;
    const categories = await db.any(
      `SELECT c.* FROM categories c
       JOIN file_categories fc ON c.id = fc.category_id
       WHERE fc.file_id = $1`,
      [fileId]
    );
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/:fileId/categories/:categoryId', async (req, res) => {
  try {
    const { fileId, categoryId } = req.params;
    await db.none(
      'INSERT INTO file_categories (file_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [fileId, categoryId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/files/:fileId/categories/:categoryId', async (req, res) => {
  try {
    const { fileId, categoryId } = req.params;
    await db.none(
      'DELETE FROM file_categories WHERE file_id = $1 AND category_id = $2',
      [fileId, categoryId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize database schema
async function initializeDatabase() {
  try {
    // Test connection
    await db.one('SELECT version()');
    console.log('PostgreSQL connected successfully');
    
    // Run schema initialization
    const PostgreSQLService = require('../js/services/PostgreSQLService');
    const pgService = new PostgreSQLService();
    pgService.db = db; // Use same connection
    await pgService.initializeSchema();
    
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`KC V2 API (PostgreSQL) running on http://localhost:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'production');
    console.log('');
    console.log('Endpoints:');
    console.log('  GET    /api/categories');
    console.log('  POST   /api/categories');
    console.log('  PUT    /api/categories/:id');
    console.log('  DELETE /api/categories/:id');
    console.log('  GET    /api/settings/:key');
    console.log('  PUT    /api/settings/:key');
    console.log('  GET    /api/state/:key');
    console.log('  PUT    /api/state/:key');
  });
});