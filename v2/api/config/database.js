/**
 * Database Configuration
 * Handles both development (SQLite) and production (PostgreSQL)
 */

const path = require('path');

const config = {
  development: {
    // SQLite local para desenvolvimento
    type: 'sqlite',
    filename: path.join(__dirname, '../data/kc_v2.sqlite'),
    options: {
      verbose: console.log
    }
  },
  
  production: {
    // PostgreSQL na VPS (rede interna Docker)
    type: 'postgresql',
    host: 'postgres',      // Nome do container na rede inetd
    port: 5432,
    database: 'kc_v2',
    user: 'postgres',
    password: process.env.PG_PASSWORD || 'd14172577127a87c06df94de6047d7b6'
  },
  
  staging: {
    // Para testes na VPS antes de produção
    type: 'postgresql',
    host: 'postgres',
    port: 5432,
    database: 'kc_v2_staging',
    user: 'postgres',
    password: process.env.PG_PASSWORD || 'd14172577127a87c06df94de6047d7b6'
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];