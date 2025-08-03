/**
 * MigrationManager - Sistema de migração de dados para V2
 * 
 * Responsável por migrar dados de:
 * - localStorage V1 para V2
 * - IndexedDB antigo para novo schema
 * - Formatos legados para estrutura unificada
 * - Backup e restauração de dados
 * 
 * @version 2.0.0
 * @author Claude Code + Knowledge Consolidator Team
 */

import EventBus from '../core/EventBus.js';
import persistenceService from './PersistenceService.js';

class MigrationManager {
  constructor() {
    this.migrations = new Map();
    this.migrationHistory = [];
    this.currentVersion = '2.0.0';
    this.backupEnabled = true;
    
    // Configuração de migrações
    this.setupMigrations();
    
    console.log('[MigrationManager] Inicializado - V2');
  }

  /**
   * Configurar migrações disponíveis
   */
  setupMigrations() {
    // Migração do localStorage V1
    this.migrations.set('v1_localstorage', {
      version: '1.0.0',
      targetVersion: '2.0.0',
      description: 'Migrar dados do localStorage V1 para PersistenceService V2',
      migrate: this.migrateV1LocalStorage.bind(this),
      validate: this.validateV1Migration.bind(this),
      rollback: this.rollbackV1Migration.bind(this)
    });
    
    // Migração de categorias V1
    this.migrations.set('v1_categories', {
      version: '1.0.0',
      targetVersion: '2.0.0',
      description: 'Migrar sistema de categorias V1 para CategoryManager V2',
      migrate: this.migrateV1Categories.bind(this),
      validate: this.validateCategoriesMigration.bind(this),
      rollback: this.rollbackCategoriesMigration.bind(this)
    });
    
    // Migração de arquivos descobertos
    this.migrations.set('v1_files', {
      version: '1.0.0',
      targetVersion: '2.0.0',
      description: 'Migrar arquivos descobertos e análises V1',
      migrate: this.migrateV1Files.bind(this),
      validate: this.validateFilesMigration.bind(this),
      rollback: this.rollbackFilesMigration.bind(this)
    });
    
    // Migração de configurações
    this.migrations.set('v1_settings', {
      version: '1.0.0',
      targetVersion: '2.0.0',
      description: 'Migrar configurações e preferências V1',
      migrate: this.migrateV1Settings.bind(this),
      validate: this.validateSettingsMigration.bind(this),
      rollback: this.rollbackSettingsMigration.bind(this)
    });
    
    // Migração de cache e temporários
    this.migrations.set('v1_cache', {
      version: '1.0.0',
      targetVersion: '2.0.0',
      description: 'Migrar cache e dados temporários V1',
      migrate: this.migrateV1Cache.bind(this),
      validate: this.validateCacheMigration.bind(this),
      rollback: this.rollbackCacheMigration.bind(this)
    });
  }

  /**
   * Executar migração completa
   * @param {Object} options - Opções { force, skipBackup, onlyCheck }
   * @returns {Promise<Object>} Resultado da migração
   */
  async migrate(options = {}) {
    try {
      console.log('[MigrationManager] Iniciando migração completa...');
      
      // 1. Verificar se há dados para migrar
      const migrationPlan = await this.analyzeMigrationNeeds();
      
      if (migrationPlan.total === 0 && !options.force) {
        console.log('[MigrationManager] Nenhuma migração necessária');
        return {
          success: true,
          message: 'Nenhuma migração necessária',
          plan: migrationPlan
        };
      }
      
      // Se apenas verificação
      if (options.onlyCheck) {
        return {
          success: true,
          message: 'Análise completa',
          plan: migrationPlan,
          checkOnly: true
        };
      }
      
      // 2. Criar backup se habilitado
      let backupId = null;
      if (this.backupEnabled && !options.skipBackup) {
        backupId = await this.createFullBackup();
        console.log('[MigrationManager] Backup criado:', backupId);
      }
      
      // 3. Executar migrações na ordem correta
      const results = await this.executeMigrationPlan(migrationPlan);
      
      // 4. Validar resultado
      const validation = await this.validateMigration(results);
      
      // 5. Limpar dados antigos se tudo ok
      if (validation.success && !options.keepOldData) {
        await this.cleanupOldData(results);
      }
      
      // 6. Registrar na história
      this.recordMigration({
        timestamp: new Date().toISOString(),
        version: this.currentVersion,
        backupId,
        results,
        validation,
        options
      });
      
      const finalResult = {
        success: validation.success,
        message: validation.success ? 'Migração completa com sucesso' : 'Migração com problemas',
        backupId,
        results,
        validation,
        plan: migrationPlan
      };
      
      // Emitir evento
      EventBus.emit('migration:completed', finalResult);
      
      console.log('[MigrationManager] Migração concluída:', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('[MigrationManager] Erro na migração:', error);
      
      // Emitir evento de erro
      EventBus.emit('migration:error', { error: error.message });
      
      return {
        success: false,
        error: error.message,
        message: 'Falha na migração'
      };
    }
  }

  /**
   * Analisar necessidades de migração
   * @returns {Promise<Object>} Plano de migração
   */
  async analyzeMigrationNeeds() {
    const plan = {
      migrations: [],
      total: 0,
      estimatedTime: 0,
      dataSize: 0
    };
    
    for (const [name, migration] of this.migrations.entries()) {
      try {
        const analysis = await this.analyzeSingleMigration(name, migration);
        
        if (analysis.needed) {
          plan.migrations.push({
            name,
            ...analysis,
            migration
          });
          plan.total++;
          plan.estimatedTime += analysis.estimatedTime || 1000;
          plan.dataSize += analysis.dataSize || 0;
        }
        
      } catch (error) {
        console.warn(`[MigrationManager] Erro ao analisar ${name}:`, error);
      }
    }
    
    console.log('[MigrationManager] Plano de migração:', plan);
    return plan;
  }

  /**
   * Analisar migração específica
   * @param {string} name - Nome da migração
   * @param {Object} migration - Configuração da migração
   * @returns {Promise<Object>} Análise
   */
  async analyzeSingleMigration(name, migration) {
    switch (name) {
      case 'v1_localstorage':
        return this.analyzeV1LocalStorage();
      
      case 'v1_categories':
        return this.analyzeV1Categories();
      
      case 'v1_files':
        return this.analyzeV1Files();
      
      case 'v1_settings':
        return this.analyzeV1Settings();
      
      case 'v1_cache':
        return this.analyzeV1Cache();
      
      default:
        return { needed: false, reason: 'Análise não implementada' };
    }
  }

  /**
   * Analisar localStorage V1
   */
  async analyzeV1LocalStorage() {
    let itemCount = 0;
    let dataSize = 0;
    const v1Prefixes = ['kc_', 'KC_'];
    const items = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (v1Prefixes.some(prefix => key.startsWith(prefix))) {
        const value = localStorage.getItem(key);
        itemCount++;
        dataSize += key.length + value.length;
        items.push(key);
      }
    }
    
    return {
      needed: itemCount > 0,
      itemCount,
      dataSize,
      estimatedTime: itemCount * 100, // ~100ms por item
      items: items.slice(0, 10), // Primeiros 10 para debug
      reason: itemCount > 0 ? `${itemCount} itens V1 encontrados` : 'Nenhum dado V1 encontrado'
    };
  }

  /**
   * Analisar categorias V1
   */
  async analyzeV1Categories() {
    const categoryKeys = ['kc_categories', 'kc_custom_categories', 'KC_categories'];
    let found = 0;
    let dataSize = 0;
    
    for (const key of categoryKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        found++;
        dataSize += value.length;
      }
    }
    
    return {
      needed: found > 0,
      itemCount: found,
      dataSize,
      estimatedTime: 2000, // Categorias são mais complexas
      reason: found > 0 ? `${found} conjunto(s) de categorias V1` : 'Nenhuma categoria V1'
    };
  }

  /**
   * Analisar arquivos V1
   */
  async analyzeV1Files() {
    const fileKeys = ['kc_files', 'kc_discovered_files', 'KC_files'];
    let found = 0;
    let fileCount = 0;
    let dataSize = 0;
    
    for (const key of fileKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            found++;
            fileCount += parsed.length;
            dataSize += value.length;
          }
        } catch (error) {
          // Ignorar dados corrompidos
        }
      }
    }
    
    return {
      needed: found > 0,
      itemCount: found,
      fileCount,
      dataSize,
      estimatedTime: fileCount * 50, // ~50ms por arquivo
      reason: found > 0 ? `${fileCount} arquivos em ${found} conjunto(s)` : 'Nenhum arquivo V1'
    };
  }

  /**
   * Analisar configurações V1
   */
  async analyzeV1Settings() {
    const settingKeys = ['kc_config', 'kc_settings', 'KC_config', 'KC_settings'];
    let found = 0;
    let dataSize = 0;
    
    for (const key of settingKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        found++;
        dataSize += value.length;
      }
    }
    
    return {
      needed: found > 0,
      itemCount: found,
      dataSize,
      estimatedTime: 1000,
      reason: found > 0 ? `${found} configuração(ões) V1` : 'Nenhuma configuração V1'
    };
  }

  /**
   * Analisar cache V1
   */
  async analyzeV1Cache() {
    let cacheItems = 0;
    let dataSize = 0;
    const cacheKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key.includes('cache') || key.includes('temp') || key.includes('preview')) {
        cacheItems++;
        const value = localStorage.getItem(key);
        dataSize += key.length + value.length;
        cacheKeys.push(key);
      }
    }
    
    return {
      needed: cacheItems > 0,
      itemCount: cacheItems,
      dataSize,
      estimatedTime: cacheItems * 10, // Cache é mais rápido
      reason: cacheItems > 0 ? `${cacheItems} itens de cache` : 'Nenhum cache encontrado'
    };
  }

  /**
   * Executar plano de migração
   * @param {Object} plan - Plano de migração
   * @returns {Promise<Array>} Resultados das migrações
   */
  async executeMigrationPlan(plan) {
    const results = [];
    
    for (const migrationInfo of plan.migrations) {
      try {
        console.log(`[MigrationManager] Executando migração: ${migrationInfo.name}`);
        
        const startTime = Date.now();
        const result = await migrationInfo.migration.migrate();
        const endTime = Date.now();
        
        const migrationResult = {
          name: migrationInfo.name,
          success: true,
          result,
          executionTime: endTime - startTime,
          timestamp: new Date().toISOString()
        };
        
        results.push(migrationResult);
        
        // Emitir progresso
        EventBus.emit('migration:progress', {
          current: results.length,
          total: plan.migrations.length,
          migration: migrationResult
        });
        
        console.log(`[MigrationManager] Migração ${migrationInfo.name} concluída em ${migrationResult.executionTime}ms`);
        
      } catch (error) {
        console.error(`[MigrationManager] Falha na migração ${migrationInfo.name}:`, error);
        
        results.push({
          name: migrationInfo.name,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Migrar localStorage V1
   */
  async migrateV1LocalStorage() {
    const migrated = [];
    const errors = [];
    const v1Prefixes = ['kc_', 'KC_'];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (v1Prefixes.some(prefix => key.startsWith(prefix))) {
        try {
          const value = localStorage.getItem(key);
          let parsedValue;
          
          try {
            parsedValue = JSON.parse(value);
          } catch {
            parsedValue = value; // Manter como string se não for JSON
          }
          
          // Mapear para nova estrutura
          const newKey = key.replace(/^(kc_|KC_)/, '');
          await persistenceService.save('migrated_v1', newKey, parsedValue, {
            ttl: Infinity, // Dados migrados não expiram
            compression: true
          });
          
          migrated.push({
            oldKey: key,
            newKey,
            size: value.length
          });
          
        } catch (error) {
          errors.push({
            key,
            error: error.message
          });
        }
      }
    }
    
    return {
      migrated: migrated.length,
      errors: errors.length,
      details: { migrated, errors }
    };
  }

  /**
   * Migrar categorias V1
   */
  async migrateV1Categories() {
    const results = {
      defaultCategories: 0,
      customCategories: 0,
      errors: []
    };
    
    try {
      // Migrar categorias padrão
      const defaultCats = localStorage.getItem('kc_categories');
      if (defaultCats) {
        const parsed = JSON.parse(defaultCats);
        if (Array.isArray(parsed)) {
          await persistenceService.save('categories', 'v1_default', parsed, {
            compression: true
          });
          results.defaultCategories = parsed.length;
        }
      }
      
      // Migrar categorias customizadas
      const customCats = localStorage.getItem('kc_custom_categories');
      if (customCats) {
        const parsed = JSON.parse(customCats);
        if (Array.isArray(parsed)) {
          await persistenceService.save('categories', 'v1_custom', parsed, {
            compression: true
          });
          results.customCategories = parsed.length;
        }
      }
      
    } catch (error) {
      results.errors.push(error.message);
    }
    
    return results;
  }

  /**
   * Migrar arquivos V1
   */
  async migrateV1Files() {
    const results = {
      files: 0,
      analyses: 0,
      errors: []
    };
    
    try {
      // Migrar arquivos descobertos
      const files = localStorage.getItem('kc_files');
      if (files) {
        const parsed = JSON.parse(files);
        if (Array.isArray(parsed)) {
          // Dividir em chunks para não sobrecarregar
          const chunkSize = 100;
          for (let i = 0; i < parsed.length; i += chunkSize) {
            const chunk = parsed.slice(i, i + chunkSize);
            await persistenceService.save('files', `v1_chunk_${Math.floor(i / chunkSize)}`, chunk, {
              compression: true
            });
          }
          results.files = parsed.length;
        }
      }
      
      // Migrar análises se existirem
      const analyses = localStorage.getItem('kc_analyses');
      if (analyses) {
        const parsed = JSON.parse(analyses);
        await persistenceService.save('analyses', 'v1_all', parsed, {
          compression: true
        });
        results.analyses = Array.isArray(parsed) ? parsed.length : 1;
      }
      
    } catch (error) {
      results.errors.push(error.message);
    }
    
    return results;
  }

  /**
   * Migrar configurações V1
   */
  async migrateV1Settings() {
    const results = {
      configs: 0,
      errors: []
    };
    
    const configKeys = ['kc_config', 'kc_settings', 'KC_config'];
    
    for (const key of configKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          const newKey = key.replace(/^(kc_|KC_)/, '');
          
          await persistenceService.save('settings', newKey, parsed, {
            compression: false // Configurações são pequenas
          });
          
          results.configs++;
        }
      } catch (error) {
        results.errors.push(`${key}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Migrar cache V1
   */
  async migrateV1Cache() {
    const results = {
      cacheItems: 0,
      totalSize: 0,
      errors: []
    };
    
    // Cache não é crítico, então podemos ser mais agressivos na limpeza
    const cachePatterns = ['cache', 'temp', 'preview'];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (cachePatterns.some(pattern => key.includes(pattern))) {
        try {
          const value = localStorage.getItem(key);
          
          // Só migrar se for relativamente recente (menos de 30 dias)
          const age = this.estimateDataAge(key, value);
          if (age < 30 * 24 * 60 * 60 * 1000) { // 30 dias em ms
            
            let parsedValue;
            try {
              parsedValue = JSON.parse(value);
            } catch {
              parsedValue = value;
            }
            
            await persistenceService.save('cache', key, parsedValue, {
              ttl: 7 * 24 * 60 * 60 * 1000, // 7 dias TTL para cache
              compression: true
            });
            
            results.cacheItems++;
            results.totalSize += value.length;
          }
          
        } catch (error) {
          results.errors.push(`${key}: ${error.message}`);
        }
      }
    }
    
    return results;
  }

  /**
   * Estimar idade dos dados (heurística)
   */
  estimateDataAge(key, value) {
    try {
      // Tentar extrair timestamp do valor
      const parsed = JSON.parse(value);
      
      if (parsed.timestamp) {
        return Date.now() - parsed.timestamp;
      }
      
      if (parsed.createdAt) {
        return Date.now() - new Date(parsed.createdAt).getTime();
      }
      
      if (parsed.lastModified) {
        return Date.now() - parsed.lastModified;
      }
      
    } catch (error) {
      // Ignorar erros de parsing
    }
    
    // Fallback: assumir muito antigo
    return 365 * 24 * 60 * 60 * 1000; // 1 ano
  }

  /**
   * Validar migração completa
   * @param {Array} results - Resultados das migrações
   * @returns {Promise<Object>} Resultado da validação
   */
  async validateMigration(results) {
    const validation = {
      success: true,
      errors: [],
      warnings: [],
      summary: {}
    };
    
    let totalMigrated = 0;
    let totalErrors = 0;
    
    for (const result of results) {
      if (result.success) {
        if (result.result.migrated) {
          totalMigrated += result.result.migrated;
        }
        if (result.result.errors) {
          totalErrors += result.result.errors;
        }
      } else {
        validation.errors.push(`Migração ${result.name} falhou: ${result.error}`);
        validation.success = false;
      }
    }
    
    validation.summary = {
      totalMigrations: results.length,
      successfulMigrations: results.filter(r => r.success).length,
      totalMigrated,
      totalErrors
    };
    
    // Validações específicas
    try {
      // Verificar se dados essenciais foram migrados
      const categories = await persistenceService.load('categories', 'v1_default', null);
      if (categories) {
        validation.warnings.push('Categorias V1 migradas com sucesso');
      }
      
    } catch (error) {
      validation.errors.push(`Erro na validação: ${error.message}`);
    }
    
    return validation;
  }

  /**
   * Criar backup completo
   * @returns {Promise<string>} ID do backup
   */
  async createFullBackup() {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const backup = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: this.currentVersion,
        localStorage: {},
        indexedDB: null // TODO: implementar backup do IndexedDB
      };
      
      // Backup do localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        backup.localStorage[key] = localStorage.getItem(key);
      }
      
      // Salvar backup
      await persistenceService.save('backups', backupId, backup, {
        compression: true,
        ttl: 90 * 24 * 60 * 60 * 1000 // 90 dias
      });
      
      console.log('[MigrationManager] Backup criado:', backupId);
      return backupId;
      
    } catch (error) {
      console.error('[MigrationManager] Erro ao criar backup:', error);
      throw error;
    }
  }

  /**
   * Restaurar backup
   * @param {string} backupId - ID do backup
   * @returns {Promise<Object>} Resultado da restauração
   */
  async restoreBackup(backupId) {
    try {
      console.log('[MigrationManager] Restaurando backup:', backupId);
      
      const backup = await persistenceService.load('backups', backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} não encontrado`);
      }
      
      // Restaurar localStorage
      localStorage.clear();
      for (const [key, value] of Object.entries(backup.localStorage)) {
        localStorage.setItem(key, value);
      }
      
      // TODO: Restaurar IndexedDB se necessário
      
      const result = {
        success: true,
        backupId,
        restoredItems: Object.keys(backup.localStorage).length,
        timestamp: backup.timestamp
      };
      
      EventBus.emit('migration:backup_restored', result);
      
      console.log('[MigrationManager] Backup restaurado:', result);
      return result;
      
    } catch (error) {
      console.error('[MigrationManager] Erro ao restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Listar backups disponíveis
   * @returns {Promise<Array>} Lista de backups
   */
  async listBackups() {
    try {
      const backups = await persistenceService.query('backups');
      return backups.map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        version: backup.version,
        size: this.calculateBackupSize(backup)
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
    } catch (error) {
      console.error('[MigrationManager] Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Calcular tamanho do backup
   */
  calculateBackupSize(backup) {
    try {
      return JSON.stringify(backup).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Limpar dados antigos após migração bem-sucedida
   * @param {Array} results - Resultados das migrações
   */
  async cleanupOldData(results) {
    console.log('[MigrationManager] Iniciando limpeza de dados antigos...');
    
    const successfulMigrations = results.filter(r => r.success);
    let cleaned = 0;
    
    for (const migration of successfulMigrations) {
      try {
        switch (migration.name) {
          case 'v1_localstorage':
            cleaned += await this.cleanupV1LocalStorage();
            break;
          case 'v1_cache':
            cleaned += await this.cleanupV1Cache();
            break;
          // Outros tipos não são limpos automaticamente por segurança
        }
      } catch (error) {
        console.warn(`[MigrationManager] Erro ao limpar ${migration.name}:`, error);
      }
    }
    
    console.log(`[MigrationManager] Limpeza concluída: ${cleaned} itens removidos`);
  }

  /**
   * Limpar localStorage V1
   */
  async cleanupV1LocalStorage() {
    const v1Prefixes = ['kc_temp', 'kc_cache', 'KC_temp', 'KC_cache'];
    let cleaned = 0;
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (v1Prefixes.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleaned++;
    });
    
    return cleaned;
  }

  /**
   * Limpar cache V1
   */
  async cleanupV1Cache() {
    const cachePatterns = ['preview_cache', 'temp_analysis'];
    let cleaned = 0;
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (cachePatterns.some(pattern => key.includes(pattern))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleaned++;
    });
    
    return cleaned;
  }

  /**
   * Registrar migração na história
   */
  recordMigration(record) {
    this.migrationHistory.push(record);
    
    // Manter apenas os últimos 10 registros em memória
    if (this.migrationHistory.length > 10) {
      this.migrationHistory = this.migrationHistory.slice(-10);
    }
    
    // Salvar história no storage
    persistenceService.save('system', 'migration_history', this.migrationHistory, {
      compression: true
    }).catch(error => {
      console.warn('[MigrationManager] Erro ao salvar história:', error);
    });
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      currentVersion: this.currentVersion,
      availableMigrations: Array.from(this.migrations.keys()),
      migrationHistory: this.migrationHistory.length,
      backupEnabled: this.backupEnabled,
      lastMigration: this.migrationHistory[this.migrationHistory.length - 1]
    };
  }

  /**
   * Diagnóstico do sistema de migração
   */
  async diagnose() {
    const stats = this.getStats();
    
    // Verificar dados V1 restantes
    const v1Analysis = await this.analyzeV1LocalStorage();
    
    // Verificar backups disponíveis
    const backups = await this.listBackups();
    
    return {
      ...stats,
      v1DataRemaining: v1Analysis,
      availableBackups: backups.length,
      latestBackup: backups[0] || null,
      storageUsage: await this.calculateStorageUsage()
    };
  }

  /**
   * Calcular uso de storage
   */
  async calculateStorageUsage() {
    const usage = {
      localStorage: 0,
      indexedDB: 'unknown', // Difícil de calcular
      persistence: 'unknown'
    };
    
    // localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      usage.localStorage += key.length + value.length;
    }
    
    return usage;
  }

  // Métodos de validação (stubs - implementar conforme necessário)
  async validateV1Migration() { return true; }
  async validateCategoriesMigration() { return true; }
  async validateFilesMigration() { return true; }
  async validateSettingsMigration() { return true; }
  async validateCacheMigration() { return true; }

  // Métodos de rollback (stubs - implementar conforme necessário)
  async rollbackV1Migration() { throw new Error('Rollback não implementado'); }
  async rollbackCategoriesMigration() { throw new Error('Rollback não implementado'); }
  async rollbackFilesMigration() { throw new Error('Rollback não implementado'); }
  async rollbackSettingsMigration() { throw new Error('Rollback não implementado'); }
  async rollbackCacheMigration() { throw new Error('Rollback não implementado'); }
}

// Criar instância singleton
const migrationManager = new MigrationManager();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.KC = window.KC || {};
  window.KC.MigrationManager = migrationManager;
}

export default migrationManager;