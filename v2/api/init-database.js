/**
 * Database initialization script for KC V2
 * Run this to create the database and tables
 */

const pgp = require('pg-promise')();
require('dotenv').config();

async function initDatabase() {
  // First connect to postgres database to create kc_v2
  const pgDb = pgp({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT || 5432,
    database: 'postgres',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD
  });
  
  try {
    console.log('Creating database kc_v2...');
    
    // Check if database exists
    const exists = await pgDb.oneOrNone(
      "SELECT 1 FROM pg_database WHERE datname = 'kc_v2'"
    );
    
    if (!exists) {
      await pgDb.none('CREATE DATABASE kc_v2');
      console.log('Database kc_v2 created successfully');
    } else {
      console.log('Database kc_v2 already exists');
    }
    
    pgDb.$pool.end();
    
    // Now connect to kc_v2 and create schema
    const db = pgp({
      host: process.env.PG_HOST,
      port: process.env.PG_PORT || 5432,
      database: 'kc_v2',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD
    });
    
    console.log('Initializing schema...');
    
    // Load and run PostgreSQLService initialization
    const PostgreSQLService = require('../js/services/PostgreSQLService');
    const pgService = new PostgreSQLService();
    pgService.db = db;
    await pgService.initializeSchema();
    
    console.log('✅ Database initialization complete!');
    console.log('');
    console.log('You can now start the API server with:');
    console.log('  npm start');
    console.log('');
    
    db.$pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();