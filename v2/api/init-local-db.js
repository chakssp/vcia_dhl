/**
 * Initialize Local SQLite Database for Development
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data');
const dbFile = path.join(dbPath, 'kc_v2.sqlite');

// Create data directory if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const db = new sqlite3.Database(dbFile);

console.log('🚀 Initializing local SQLite database...');

const schema = `
-- Categories table (single source of truth)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#4A90E2',
  boost INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File categories junction table
CREATE TABLE IF NOT EXISTS file_categories (
  file_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id, category_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- App state storage
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis results
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  file_id TEXT NOT NULL,
  analysis_type TEXT,
  result TEXT,
  confidence_score INTEGER,
  provider TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings storage
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_categories_file ON file_categories(file_id);
CREATE INDEX IF NOT EXISTS idx_analysis_file ON analysis_results(file_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
`;

db.serialize(() => {
  // Create tables
  schema.split(';').forEach(statement => {
    if (statement.trim()) {
      db.run(statement, err => {
        if (err) {
          console.error('❌ Error creating table:', err);
        }
      });
    }
  });
  
  // Insert default categories
  const defaultCategories = [
    { name: 'Projetos', color: '#4A90E2' },
    { name: 'Ideias', color: '#7ED321' },
    { name: 'Referências', color: '#F5A623' },
    { name: 'Estudos', color: '#BD10E0' },
    { name: 'IA/ML', color: '#9013FE' },
    { name: 'Desenvolvimento', color: '#50E3C2' },
    { name: 'Negócios', color: '#B8E986' }
  ];
  
  const stmt = db.prepare('INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)');
  
  defaultCategories.forEach(cat => {
    stmt.run(cat.name, cat.color);
  });
  
  stmt.finalize();
  
  console.log('✅ Local database initialized successfully!');
  console.log('📁 Database location:', dbFile);
  console.log('');
  console.log('You can now start the API with:');
  console.log('  npm run dev');
});

db.close();