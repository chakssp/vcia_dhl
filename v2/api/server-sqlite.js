/**
 * KC V2 API Server - SQLite Version for Development
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3333;

// Database connection
const dbFile = path.join(__dirname, 'data', 'kc_v2.sqlite');
const db = new sqlite3.Database(dbFile);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'KC V2 API',
    environment: process.env.NODE_ENV || 'development',
    database: 'SQLite'
  });
});

// API Health check (for frontend compatibility)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'KC V2 API',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected',
    qdrant: 'unavailable', // SQLite version doesn't have Qdrant
    timestamp: new Date().toISOString()
  });
});

// API Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    features: {
      categories: true,
      files: true,
      analysis: false, // Not implemented yet
      qdrant: false // SQLite version
    },
    rateLimits: {},
    version: '2.0.0'
  });
});

// Categories endpoints
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name, color = '#4A90E2', boost = 0 } = req.body;
  const id = require('crypto').randomBytes(16).toString('hex');
  
  db.run(
    'INSERT INTO categories (id, name, color, boost) VALUES (?, ?, ?, ?)',
    [id, name, color, boost],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(row);
      });
    }
  );
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.boost !== undefined) {
    fields.push('boost = ?');
    values.push(updates.boost);
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  db.run(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(row);
      });
    }
  );
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Settings endpoints
app.get('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  
  db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row ? { value: JSON.parse(row.value) } : { value: null });
  });
});

app.put('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  db.run(
    `INSERT INTO settings (key, value) 
     VALUES (?, ?) 
     ON CONFLICT(key) 
     DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), JSON.stringify(value)],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

// App State endpoints
app.get('/api/state/:key', (req, res) => {
  const { key } = req.params;
  
  db.get('SELECT value FROM app_state WHERE key = ?', [key], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row ? { value: JSON.parse(row.value) } : { value: null });
  });
});

app.put('/api/state/:key', (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  db.run(
    `INSERT INTO app_state (key, value) 
     VALUES (?, ?) 
     ON CONFLICT(key) 
     DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), JSON.stringify(value)],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

// File categories endpoints
app.get('/api/files/:fileId/categories', (req, res) => {
  const { fileId } = req.params;
  
  db.all(
    `SELECT c.* FROM categories c
     JOIN file_categories fc ON c.id = fc.category_id
     WHERE fc.file_id = ?`,
    [fileId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/files/:fileId/categories/:categoryId', (req, res) => {
  const { fileId, categoryId } = req.params;
  
  db.run(
    'INSERT OR IGNORE INTO file_categories (file_id, category_id) VALUES (?, ?)',
    [fileId, categoryId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.delete('/api/files/:fileId/categories/:categoryId', (req, res) => {
  const { fileId, categoryId } = req.params;
  
  db.run(
    'DELETE FROM file_categories WHERE file_id = ? AND category_id = ?',
    [fileId, categoryId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`KC V2 API (SQLite) running on http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database:', dbFile);
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