/**
 * KC V2 API Server
 * Detects environment and uses appropriate database
 */

require('dotenv').config();

// Use SQLite for development, PostgreSQL for production
if (process.env.NODE_ENV === 'development') {
  console.log('Starting in DEVELOPMENT mode with SQLite...');
  require('./server-sqlite.js');
} else {
  console.log('Starting in PRODUCTION mode with PostgreSQL...');
  require('./server-postgres.js');
}