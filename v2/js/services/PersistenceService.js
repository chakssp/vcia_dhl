/**
 * PersistenceService V2 - Unified Persistence Layer
 * 
 * SOLUÇÃO PARA PROBLEMA CRÍTICO: LocalStorage não confiável
 * 
 * Funcionalidades:
 * - Múltiplos backends: Supabase (principal), IndexedDB (fallback), localStorage (configurações)
 * - Estratégia de fallback automática
 * - Queue de sincronização para modo offline
 * - Compressão automática de dados grandes
 * - Interface unificada para todos os managers
 * - Migração automática de dados antigos
 * 
 * @version 2.0.0
 * @author Claude Code + Knowledge Consolidator Team
 */

import EventBus, { Events } from '../core/EventBus.js';
import compressionUtils from '../utils/CompressionUtils.js';

class PersistenceService {
  constructor() {
    // Estado interno
    this.initialized = false;
    this.isOnline = navigator.onLine;
    this.backends = new Map();
    this.activeBackend = null;
    this.fallbackChain = ['supabase', 'indexeddb', 'localstorage'];
    
    // Cache em memória
    this.cache = new Map();
    this.cacheEnabled = true;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos
    
    // Queue de sincronização
    this.syncQueue = [];
    this.syncInProgress = false;
    this.syncInterval = 30000; // 30 segundos
    this.syncIntervalId = null;
    
    // Configurações
    this.config = {
      compression: {
        enabled: true,
        threshold: 1024, // 1KB
        level: 'fast' // 'fast' | 'best'
      },
      supabase: {
        url: (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || 'https://mock.supabase.co',
        key: (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 'mock-key',
        enabled: false // Começar com mock
      },
      indexeddb: {
        dbName: 'KC_V2_Persistence',
        version: 1,
        enabled: true
      },
      localstorage: {
        prefix: 'kc_v2_',
        enabled: true
      }
    };
    
    // Configuração de eventos
    this.setupEventListeners();
    
    console.log('[PersistenceService] Inicializado - V2 com múltiplos backends');
  }

  /**
   * Inicializar PersistenceService
   * @returns {Promise<boolean>} Sucesso da inicialização
   */
  async initialize() {
    try {
      console.log('[PersistenceService] Inicializando backends...');
      
      // 1. Configurar backends na ordem de prioridade
      await this.setupBackends();
      
      // 2. Determinar backend ativo
      this.determineActiveBackend();
      
      // 3. Carregar dados do cache persistente
      await this.loadPersistentCache();
      
      // 4. Migrar dados antigos se necessário
      await this.migrateOldData();
      
      // 5. Configurar sincronização automática
      this.setupAutoSync();
      
      // 6. Processar queue pendente
      await this.processSyncQueue();
      
      this.initialized = true;
      EventBus.emit('persistence:ready', {
        activeBackend: this.activeBackend,
        cacheSize: this.cache.size,
        queueSize: this.syncQueue.length
      });
      
      console.log('[PersistenceService] Inicializado com sucesso:', {
        activeBackend: this.activeBackend,
        backends: Array.from(this.backends.keys()),
        online: this.isOnline
      });
      
      return true;
    } catch (error) {
      console.error('[PersistenceService] Falha na inicialização:', error);
      
      // Fallback para localStorage apenas
      this.activeBackend = 'localstorage';
      this.initialized = true;
      
      return false;
    }
  }

  /**
   * Configurar backends
   */
  async setupBackends() {
    // 1. Configurar Supabase (mock por enquanto)
    if (this.config.supabase.enabled) {
      this.backends.set('supabase', await this.createSupabaseAdapter());
    }
    
    // 2. Configurar IndexedDB
    if (this.config.indexeddb.enabled) {
      this.backends.set('indexeddb', await this.createIndexedDBAdapter());
    }
    
    // 3. Configurar localStorage
    if (this.config.localstorage.enabled) {
      this.backends.set('localstorage', this.createLocalStorageAdapter());
    }
    
    console.log('[PersistenceService] Backends configurados:', Array.from(this.backends.keys()));
  }

  /**
   * Criar adapter do Supabase (mock)
   */
  async createSupabaseAdapter() {
    return new SupabaseAdapter(this.config.supabase);
  }

  /**
   * Criar adapter do IndexedDB
   */
  async createIndexedDBAdapter() {
    const adapter = new IndexedDBAdapter(this.config.indexeddb);
    await adapter.initialize();
    return adapter;
  }

  /**
   * Criar adapter do localStorage
   */
  createLocalStorageAdapter() {
    return new LocalStorageAdapter(this.config.localstorage);
  }

  /**
   * Determinar backend ativo baseado na disponibilidade
   */
  determineActiveBackend() {
    for (const backend of this.fallbackChain) {
      if (this.backends.has(backend)) {
        const adapter = this.backends.get(backend);
        if (adapter.isAvailable()) {
          this.activeBackend = backend;
          console.log('[PersistenceService] Backend ativo:', backend);
          return;
        }
      }
    }
    
    throw new Error('Nenhum backend disponível');
  }

  /**
   * Operação genérica: Salvar dados
   * @param {string} collection - Nome da coleção/tabela
   * @param {string} key - Chave dos dados
   * @param {*} value - Valor a ser salvo
   * @param {Object} options - Opções { ttl, compression, syncRequired }
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async save(collection, key, value, options = {}) {
    try {
      const fullKey = `${collection}:${key}`;
      const metadata = {
        key: fullKey,
        collection,
        originalKey: key,
        timestamp: Date.now(),
        ttl: options.ttl || this.cacheTTL,
        compressed: false,
        size: this.calculateSize(value)
      };
      
      // Comprimir se necessário
      let processedValue = value;
      if (this.shouldCompress(value, options)) {
        const compressed = await compressionUtils.compress(value, options);
        processedValue = compressed;
        metadata.compressed = true;
        metadata.compressedSize = this.calculateSize(processedValue);
        metadata.compressionAlgorithm = compressed.algorithm;
      }
      
      const data = {
        metadata,
        value: processedValue
      };
      
      // Atualizar cache imediatamente
      if (this.cacheEnabled) {
        this.cache.set(fullKey, {
          data,
          timestamp: Date.now(),
          fromBackend: this.activeBackend
        });
      }
      
      // Tentar salvar no backend ativo
      let saved = false;
      const adapter = this.backends.get(this.activeBackend);
      
      if (adapter && adapter.isAvailable()) {
        try {
          await adapter.save(collection, key, data);
          saved = true;
          console.log(`[PersistenceService] Salvo em ${this.activeBackend}:`, fullKey);
        } catch (error) {
          console.warn(`[PersistenceService] Falha em ${this.activeBackend}:`, error);
          await this.handleBackendFailure(this.activeBackend);
        }
      }
      
      // Se falhou, tentar fallback
      if (!saved) {
        saved = await this.saveFallback(collection, key, data);
      }
      
      // Se offline ou falhou, adicionar à queue
      if (!saved || !this.isOnline) {
        this.addToSyncQueue('save', collection, key, data);
      }
      
      // Emitir evento
      EventBus.emit('persistence:saved', {
        collection,
        key: fullKey,
        backend: this.activeBackend,
        cached: this.cacheEnabled,
        compressed: metadata.compressed
      });
      
      return true;
      
    } catch (error) {
      console.error('[PersistenceService] Erro ao salvar:', error);
      
      // Em caso de erro crítico, pelo menos tentar localStorage
      try {
        const localStorage = this.backends.get('localstorage');
        if (localStorage) {
          await localStorage.save(collection, key, { value, error: error.message });
          return true;
        }
      } catch (fallbackError) {
        console.error('[PersistenceService] Fallback falhou:', fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Operação genérica: Carregar dados
   * @param {string} collection - Nome da coleção/tabela
   * @param {string} key - Chave dos dados
   * @param {*} defaultValue - Valor padrão se não encontrado
   * @param {Object} options - Opções { useCache, forceRefresh }
   * @returns {Promise<*>} Dados carregados
   */
  async load(collection, key, defaultValue = null, options = {}) {
    try {
      const fullKey = `${collection}:${key}`;
      
      // Verificar cache primeiro (se habilitado e não forçando refresh)
      if (this.cacheEnabled && !options.forceRefresh) {
        const cached = this.cache.get(fullKey);
        if (cached && !this.isCacheExpired(cached)) {
          console.log(`[PersistenceService] Cache hit:`, fullKey);
          return await this.processLoadedValue(cached.data);
        }
      }
      
      // Tentar carregar do backend ativo
      let data = null;
      const adapter = this.backends.get(this.activeBackend);
      
      if (adapter && adapter.isAvailable()) {
        try {
          data = await adapter.load(collection, key);
          if (data !== null) {
            console.log(`[PersistenceService] Carregado de ${this.activeBackend}:`, fullKey);
          }
        } catch (error) {
          console.warn(`[PersistenceService] Falha ao carregar de ${this.activeBackend}:`, error);
          await this.handleBackendFailure(this.activeBackend);
        }
      }
      
      // Se não encontrou, tentar fallbacks
      if (data === null) {
        data = await this.loadFallback(collection, key);
      }
      
      // Se ainda não encontrou, retornar valor padrão
      if (data === null) {
        console.log(`[PersistenceService] Dados não encontrados:`, fullKey);
        return defaultValue;
      }
      
      // Processar valor carregado
      const processedValue = await this.processLoadedValue(data);
      
      // Atualizar cache
      if (this.cacheEnabled) {
        this.cache.set(fullKey, {
          data,
          timestamp: Date.now(),
          fromBackend: this.activeBackend
        });
      }
      
      // Emitir evento
      EventBus.emit('persistence:loaded', {
        collection,
        key: fullKey,
        backend: this.activeBackend,
        cached: false
      });
      
      return processedValue;
      
    } catch (error) {
      console.error('[PersistenceService] Erro ao carregar:', error);
      return defaultValue;
    }
  }

  /**
   * Operação genérica: Deletar dados
   * @param {string} collection - Nome da coleção/tabela
   * @param {string} key - Chave dos dados
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async delete(collection, key) {
    try {
      const fullKey = `${collection}:${key}`;
      
      // Remover do cache
      this.cache.delete(fullKey);
      
      // Tentar deletar do backend ativo
      let deleted = false;
      const adapter = this.backends.get(this.activeBackend);
      
      if (adapter && adapter.isAvailable()) {
        try {
          await adapter.delete(collection, key);
          deleted = true;
          console.log(`[PersistenceService] Deletado de ${this.activeBackend}:`, fullKey);
        } catch (error) {
          console.warn(`[PersistenceService] Falha ao deletar de ${this.activeBackend}:`, error);
        }
      }
      
      // Tentar fallbacks
      if (!deleted) {
        deleted = await this.deleteFallback(collection, key);
      }
      
      // Adicionar à queue para garantir sincronização
      this.addToSyncQueue('delete', collection, key, null);
      
      // Emitir evento
      EventBus.emit('persistence:deleted', {
        collection,
        key: fullKey,
        backend: this.activeBackend
      });
      
      return true;
      
    } catch (error) {
      console.error('[PersistenceService] Erro ao deletar:', error);
      return false;
    }
  }

  /**
   * Operação genérica: Query/busca
   * @param {string} collection - Nome da coleção/tabela
   * @param {Object} query - Objeto de consulta
   * @param {Object} options - Opções { limit, offset, orderBy }
   * @returns {Promise<Array>} Resultados da busca
   */
  async query(collection, query = {}, options = {}) {
    try {
      // Verificar cache de queries se habilitado
      const queryKey = this.generateQueryKey(collection, query, options);
      const fullKey = `query:${queryKey}`;
      
      if (this.cacheEnabled && !options.forceRefresh) {
        const cached = this.cache.get(fullKey);
        if (cached && !this.isCacheExpired(cached)) {
          console.log(`[PersistenceService] Query cache hit:`, fullKey);
          return cached.data.value;
        }
      }
      
      // Executar query no backend ativo
      let results = [];
      const adapter = this.backends.get(this.activeBackend);
      
      if (adapter && adapter.isAvailable() && adapter.query) {
        try {
          results = await adapter.query(collection, query, options);
          console.log(`[PersistenceService] Query executada em ${this.activeBackend}:`, results.length, 'resultados');
        } catch (error) {
          console.warn(`[PersistenceService] Falha na query em ${this.activeBackend}:`, error);
          await this.handleBackendFailure(this.activeBackend);
        }
      }
      
      // Se falhou, tentar fallbacks
      if (results.length === 0) {
        results = await this.queryFallback(collection, query, options);
      }
      
      // Processar resultados
      const processedResults = await Promise.all(
        results.map(item => this.processLoadedValue(item))
      );
      
      // Atualizar cache de query
      if (this.cacheEnabled) {
        this.cache.set(fullKey, {
          data: { value: processedResults },
          timestamp: Date.now(),
          fromBackend: this.activeBackend
        });
      }
      
      // Emitir evento
      EventBus.emit('persistence:queried', {
        collection,
        query,
        results: processedResults.length,
        backend: this.activeBackend
      });
      
      return processedResults;
      
    } catch (error) {
      console.error('[PersistenceService] Erro na query:', error);
      return [];
    }
  }

  /**
   * Salvar com fallback
   */
  async saveFallback(collection, key, data) {
    for (const backendName of this.fallbackChain) {
      if (backendName === this.activeBackend) continue;
      
      const adapter = this.backends.get(backendName);
      if (adapter && adapter.isAvailable()) {
        try {
          await adapter.save(collection, key, data);
          console.log(`[PersistenceService] Salvo em fallback ${backendName}:`, key);
          return true;
        } catch (error) {
          console.warn(`[PersistenceService] Fallback ${backendName} falhou:`, error);
        }
      }
    }
    return false;
  }

  /**
   * Carregar com fallback
   */
  async loadFallback(collection, key) {
    for (const backendName of this.fallbackChain) {
      if (backendName === this.activeBackend) continue;
      
      const adapter = this.backends.get(backendName);
      if (adapter && adapter.isAvailable()) {
        try {
          const data = await adapter.load(collection, key);
          if (data !== null) {
            console.log(`[PersistenceService] Carregado de fallback ${backendName}:`, key);
            return data;
          }
        } catch (error) {
          console.warn(`[PersistenceService] Fallback ${backendName} falhou:`, error);
        }
      }
    }
    return null;
  }

  /**
   * Deletar com fallback
   */
  async deleteFallback(collection, key) {
    let deleted = false;
    for (const backendName of this.fallbackChain) {
      if (backendName === this.activeBackend) continue;
      
      const adapter = this.backends.get(backendName);
      if (adapter && adapter.isAvailable()) {
        try {
          await adapter.delete(collection, key);
          console.log(`[PersistenceService] Deletado de fallback ${backendName}:`, key);
          deleted = true;
        } catch (error) {
          console.warn(`[PersistenceService] Fallback delete ${backendName} falhou:`, error);
        }
      }
    }
    return deleted;
  }

  /**
   * Query com fallback
   */
  async queryFallback(collection, query, options) {
    for (const backendName of this.fallbackChain) {
      if (backendName === this.activeBackend) continue;
      
      const adapter = this.backends.get(backendName);
      if (adapter && adapter.isAvailable() && adapter.query) {
        try {
          const results = await adapter.query(collection, query, options);
          if (results.length > 0) {
            console.log(`[PersistenceService] Query fallback ${backendName}:`, results.length);
            return results;
          }
        } catch (error) {
          console.warn(`[PersistenceService] Fallback query ${backendName} falhou:`, error);
        }
      }
    }
    return [];
  }

  /**
   * Processar valor carregado (descompressão, etc.)
   */
  async processLoadedValue(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    // Se tem metadata e valor
    if (data.metadata && data.hasOwnProperty('value')) {
      let value = data.value;
      
      // Descomprimir se necessário
      if (data.metadata.compressed) {
        value = await compressionUtils.decompress(value);
      }
      
      return value;
    }
    
    // Retornar como está se não tem estrutura esperada
    return data;
  }

  /**
   * Verificar se deve comprimir
   */
  shouldCompress(value, options) {
    if (!this.config.compression.enabled || options.compression === false) {
      return false;
    }
    
    if (options.compression === true) {
      return true;
    }
    
    // Usar CompressionUtils para determinar se vale a pena comprimir
    return compressionUtils.shouldCompress(value, this.config.compression.threshold);
  }


  /**
   * Calcular tamanho dos dados
   */
  calculateSize(value) {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch (error) {
      return JSON.stringify(value).length;
    }
  }

  /**
   * Verificar se cache expirou
   */
  isCacheExpired(cached) {
    const now = Date.now();
    const age = now - cached.timestamp;
    return age > this.cacheTTL;
  }

  /**
   * Gerar chave de query
   */
  generateQueryKey(collection, query, options) {
    const queryStr = JSON.stringify({ collection, query, options });
    return btoa(queryStr).replace(/[/+=]/g, '').substring(0, 32);
  }

  /**
   * Adicionar à fila de sincronização
   */
  addToSyncQueue(operation, collection, key, data) {
    const item = {
      id: Date.now() + Math.random(),
      operation,
      collection,
      key,
      data,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };
    
    this.syncQueue.push(item);
    console.log(`[PersistenceService] Adicionado à sync queue:`, operation, collection, key);
    
    // Salvar queue no storage local para persistir
    this.saveSyncQueue();
  }

  /**
   * Processar fila de sincronização
   */
  async processSyncQueue() {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }
    
    if (!this.isOnline) {
      console.log('[PersistenceService] Offline - pulando sync queue');
      return;
    }
    
    this.syncInProgress = true;
    console.log('[PersistenceService] Processando sync queue:', this.syncQueue.length, 'itens');
    
    const processed = [];
    const failed = [];
    
    for (const item of this.syncQueue) {
      try {
        item.attempts++;
        
        const adapter = this.backends.get(this.activeBackend);
        if (!adapter || !adapter.isAvailable()) {
          throw new Error(`Backend ${this.activeBackend} não disponível`);
        }
        
        switch (item.operation) {
          case 'save':
            await adapter.save(item.collection, item.key, item.data);
            break;
          case 'delete':
            await adapter.delete(item.collection, item.key);
            break;
          default:
            console.warn('[PersistenceService] Operação desconhecida na sync queue:', item.operation);
        }
        
        processed.push(item.id);
        console.log(`[PersistenceService] Sync bem-sucedido:`, item.operation, item.key);
        
      } catch (error) {
        console.error(`[PersistenceService] Falha no sync:`, error);
        
        if (item.attempts >= item.maxAttempts) {
          failed.push(item);
          console.error(`[PersistenceService] Item removido da queue após ${item.maxAttempts} tentativas:`, item.key);
        }
      }
    }
    
    // Remover itens processados
    this.syncQueue = this.syncQueue.filter(item => 
      !processed.includes(item.id) && !failed.some(f => f.id === item.id)
    );
    
    // Salvar queue atualizada
    this.saveSyncQueue();
    
    this.syncInProgress = false;
    
    if (processed.length > 0 || failed.length > 0) {
      EventBus.emit('persistence:sync_completed', {
        processed: processed.length,
        failed: failed.length,
        remaining: this.syncQueue.length
      });
    }
    
    console.log('[PersistenceService] Sync queue processada:', {
      processed: processed.length,
      failed: failed.length,
      remaining: this.syncQueue.length
    });
  }

  /**
   * Salvar sync queue no localStorage
   */
  saveSyncQueue() {
    try {
      const key = `${this.config.localstorage.prefix}sync_queue`;
      localStorage.setItem(key, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('[PersistenceService] Falha ao salvar sync queue:', error);
    }
  }

  /**
   * Carregar sync queue do localStorage
   */
  loadSyncQueue() {
    try {
      const key = `${this.config.localstorage.prefix}sync_queue`;
      const stored = localStorage.getItem(key);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log('[PersistenceService] Sync queue carregada:', this.syncQueue.length, 'itens');
      }
    } catch (error) {
      console.warn('[PersistenceService] Falha ao carregar sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Carregar cache persistente
   */
  async loadPersistentCache() {
    try {
      // Carregar do backend mais confiável disponível
      const cacheData = await this.load('system', 'persistent_cache', {});
      
      if (cacheData && typeof cacheData === 'object') {
        for (const [key, value] of Object.entries(cacheData)) {
          this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
            fromBackend: 'persistent'
          });
        }
        
        console.log('[PersistenceService] Cache persistente carregado:', this.cache.size, 'itens');
      }
    } catch (error) {
      console.warn('[PersistenceService] Falha ao carregar cache persistente:', error);
    }
  }

  /**
   * Salvar cache persistente
   */
  async savePersistentCache() {
    try {
      const cacheData = {};
      
      // Selecionar apenas itens importantes para persistir
      for (const [key, value] of this.cache.entries()) {
        if (key.startsWith('system:') || key.startsWith('config:')) {
          cacheData[key] = value.data;
        }
      }
      
      await this.save('system', 'persistent_cache', cacheData, { compression: true });
      console.log('[PersistenceService] Cache persistente salvo:', Object.keys(cacheData).length, 'itens');
      
    } catch (error) {
      console.warn('[PersistenceService] Falha ao salvar cache persistente:', error);
    }
  }

  /**
   * Migrar dados antigos
   */
  async migrateOldData() {
    try {
      console.log('[PersistenceService] Verificando dados para migração...');
      
      // Migrar do localStorage V1
      const migrated = await this.migrateFromLocalStorage();
      
      if (migrated > 0) {
        console.log('[PersistenceService] Migração completa:', migrated, 'itens');
        EventBus.emit('persistence:migration_completed', { migrated });
      }
      
    } catch (error) {
      console.error('[PersistenceService] Erro na migração:', error);
    }
  }

  /**
   * Migrar do localStorage V1
   */
  async migrateFromLocalStorage() {
    let migrated = 0;
    
    try {
      // Prefixos conhecidos do V1
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
              parsedValue = value;
            }
            
            // Mapear para nova estrutura
            const newKey = key.replace(/^(kc_|KC_)/, '');
            await this.save('migrated_v1', newKey, parsedValue, { ttl: Infinity });
            
            migrated++;
            console.log(`[PersistenceService] Migrado:`, key, '->', newKey);
            
          } catch (error) {
            console.warn(`[PersistenceService] Falha ao migrar ${key}:`, error);
          }
        }
      }
      
    } catch (error) {
      console.error('[PersistenceService] Erro na migração do localStorage:', error);
    }
    
    return migrated;
  }

  /**
   * Lidar com falha de backend
   */
  async handleBackendFailure(backendName) {
    console.warn(`[PersistenceService] Backend ${backendName} falhou, mudando para fallback`);
    
    // Encontrar próximo backend disponível
    const currentIndex = this.fallbackChain.indexOf(backendName);
    for (let i = currentIndex + 1; i < this.fallbackChain.length; i++) {
      const fallbackName = this.fallbackChain[i];
      const adapter = this.backends.get(fallbackName);
      
      if (adapter && adapter.isAvailable()) {
        this.activeBackend = fallbackName;
        console.log(`[PersistenceService] Mudou para backend:`, fallbackName);
        
        EventBus.emit('persistence:backend_changed', {
          from: backendName,
          to: fallbackName,
          reason: 'failure'
        });
        
        return;
      }
    }
    
    console.error('[PersistenceService] Nenhum backend de fallback disponível!');
  }

  /**
   * Configurar sincronização automática
   */
  setupAutoSync() {
    // Carregar sync queue existente
    this.loadSyncQueue();
    
    // Configurar interval de sincronização
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, this.syncInterval);
    
    console.log('[PersistenceService] Auto-sync configurado:', this.syncInterval / 1000, 'segundos');
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Detectar mudanças de conectividade
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[PersistenceService] Conexão restaurada');
      
      // Reativar backend principal se possível
      this.determineActiveBackend();
      
      // Processar queue pendente
      this.processSyncQueue();
      
      EventBus.emit('persistence:online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[PersistenceService] Modo offline ativado');
      EventBus.emit('persistence:offline');
    });
    
    // Limpar cache periodicamente
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // A cada 5 minutos
    
    // Salvar cache persistente periodicamente
    setInterval(() => {
      this.savePersistentCache();
    }, 10 * 60 * 1000); // A cada 10 minutos
    
    // Antes de sair da página
    window.addEventListener('beforeunload', () => {
      this.savePersistentCache();
      this.saveSyncQueue();
    });
  }

  /**
   * Limpeza do cache
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (this.isCacheExpired(value)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[PersistenceService] Cache limpo: ${cleaned} itens expirados removidos`);
    }
  }

  /**
   * Obter estatísticas do serviço
   */
  getStats() {
    return {
      initialized: this.initialized,
      online: this.isOnline,
      activeBackend: this.activeBackend,
      availableBackends: Array.from(this.backends.keys()).filter(name => 
        this.backends.get(name).isAvailable()
      ),
      cache: {
        size: this.cache.size,
        enabled: this.cacheEnabled,
        ttl: this.cacheTTL
      },
      sync: {
        queueSize: this.syncQueue.length,
        inProgress: this.syncInProgress,
        interval: this.syncInterval
      },
      config: this.config
    };
  }

  /**
   * Limpar todos os dados
   */
  async clear(collection = null) {
    console.log('[PersistenceService] Limpando dados:', collection || 'todos');
    
    // Limpar cache
    if (collection) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${collection}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    
    // Limpar de todos os backends
    for (const [name, adapter] of this.backends.entries()) {
      if (adapter.isAvailable() && adapter.clear) {
        try {
          await adapter.clear(collection);
          console.log(`[PersistenceService] Dados limpos de ${name}`);
        } catch (error) {
          console.warn(`[PersistenceService] Falha ao limpar ${name}:`, error);
        }
      }
    }
    
    // Limpar sync queue se for tudo
    if (!collection) {
      this.syncQueue = [];
      this.saveSyncQueue();
    }
    
    EventBus.emit('persistence:cleared', { collection });
  }

  /**
   * Exportar dados
   */
  async export(collection = null) {
    const data = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      backend: this.activeBackend,
      collections: {}
    };
    
    // Se coleção específica
    if (collection) {
      data.collections[collection] = await this.exportCollection(collection);
    } else {
      // Exportar todas as coleções conhecidas
      const collections = this.getKnownCollections();
      for (const col of collections) {
        data.collections[col] = await this.exportCollection(col);
      }
    }
    
    return data;
  }

  /**
   * Exportar coleção específica
   */
  async exportCollection(collection) {
    const items = await this.query(collection);
    return {
      count: items.length,
      items
    };
  }

  /**
   * Obter coleções conhecidas
   */
  getKnownCollections() {
    const collections = new Set();
    
    // Do cache
    for (const key of this.cache.keys()) {
      if (key.includes(':')) {
        const collection = key.split(':')[0];
        if (collection !== 'query' && collection !== 'system') {
          collections.add(collection);
        }
      }
    }
    
    return Array.from(collections);
  }

  /**
   * Diagnóstico completo
   */
  diagnose() {
    const backends = {};
    for (const [name, adapter] of this.backends.entries()) {
      backends[name] = {
        available: adapter.isAvailable(),
        stats: adapter.getStats ? adapter.getStats() : null
      };
    }
    
    return {
      service: this.getStats(),
      backends,
      cache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys()).slice(0, 10) // Primeiras 10 para debug
      },
      syncQueue: this.syncQueue.map(item => ({
        operation: item.operation,
        collection: item.collection,
        key: item.key,
        attempts: item.attempts
      }))
    };
  }
}

/**
 * Adapter do Supabase (Mock para desenvolvimento)
 */
class SupabaseAdapter {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.available = false;
    
    this.setupMockClient();
  }
  
  setupMockClient() {
    // Mock do cliente Supabase
    this.client = {
      from: (table) => ({
        select: (fields = '*') => ({
          eq: (field, value) => ({
            single: () => Promise.resolve({ 
              data: this.getMockData(table, field, value), 
              error: null 
            })
          }),
          then: (resolve) => resolve({ 
            data: this.getMockCollection(table), 
            error: null 
          })
        }),
        insert: (data) => Promise.resolve({ data, error: null }),
        upsert: (data) => Promise.resolve({ data, error: null }),
        update: (data) => ({
          eq: (field, value) => Promise.resolve({ data, error: null })
        }),
        delete: () => ({
          eq: (field, value) => Promise.resolve({ data: null, error: null })
        })
      })
    };
    
    this.available = this.config.enabled;
    console.log('[SupabaseAdapter] Configurado (mock)');
  }
  
  getMockData(table, field, value) {
    // Retornar dados mock baseados na tabela
    return null; // Simular não encontrado
  }
  
  getMockCollection(table) {
    return []; // Coleção vazia por padrão
  }
  
  isAvailable() {
    return this.available && this.client !== null;
  }
  
  async save(collection, key, data) {
    if (!this.isAvailable()) {
      throw new Error('Supabase não disponível');
    }
    
    const { error } = await this.client
      .from(collection)
      .upsert({ key, data, updated_at: new Date().toISOString() });
    
    if (error) {
      throw error;
    }
  }
  
  async load(collection, key) {
    if (!this.isAvailable()) {
      throw new Error('Supabase não disponível');
    }
    
    const { data, error } = await this.client
      .from(collection)
      .select('data')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.data;
  }
  
  async delete(collection, key) {
    if (!this.isAvailable()) {
      throw new Error('Supabase não disponível');
    }
    
    const { error } = await this.client
      .from(collection)
      .delete()
      .eq('key', key);
    
    if (error) {
      throw error;
    }
  }
  
  async query(collection, query = {}, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Supabase não disponível');
    }
    
    // Implementação simplificada de query
    const { data, error } = await this.client
      .from(collection)
      .select('*');
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }
  
  async clear(collection) {
    if (!this.isAvailable()) {
      throw new Error('Supabase não disponível');
    }
    
    const { error } = await this.client
      .from(collection)
      .delete()
      .neq('key', '__never_match__'); // Deletar tudo
    
    if (error) {
      throw error;
    }
  }
  
  getStats() {
    return {
      available: this.available,
      mock: true,
      config: this.config
    };
  }
}

/**
 * Adapter do IndexedDB
 */
class IndexedDBAdapter {
  constructor(config) {
    this.config = config;
    this.db = null;
    this.available = false;
  }
  
  async initialize() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB não suportado'));
        return;
      }
      
      const request = indexedDB.open(this.config.dbName, this.config.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.available = true;
        console.log('[IndexedDBAdapter] Inicializado');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store genérica para dados
        if (!db.objectStoreNames.contains('data')) {
          const store = db.createObjectStore('data', { keyPath: ['collection', 'key'] });
          store.createIndex('collection', 'collection', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
  
  isAvailable() {
    return this.available && this.db !== null;
  }
  
  async save(collection, key, data) {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB não disponível');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.put({
        collection,
        key,
        data,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async load(collection, key) {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB não disponível');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get([collection, key]);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async delete(collection, key) {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB não disponível');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.delete([collection, key]);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async query(collection, query = {}, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB não disponível');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const index = store.index('collection');
      const request = index.getAll(collection);
      
      request.onsuccess = () => {
        let results = request.result || [];
        
        // Aplicar filtros simples
        if (Object.keys(query).length > 0) {
          results = results.filter(item => {
            return Object.entries(query).every(([key, value]) => {
              return item.data && item.data[key] === value;
            });
          });
        }
        
        // Aplicar limite
        if (options.limit) {
          results = results.slice(0, options.limit);
        }
        
        resolve(results.map(item => item.data));
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async clear(collection) {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB não disponível');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const index = store.index('collection');
      const request = index.openCursor(IDBKeyRange.only(collection));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  getStats() {
    return {
      available: this.available,
      dbName: this.config.dbName,
      version: this.config.version
    };
  }
}

/**
 * Adapter do localStorage
 */
class LocalStorageAdapter {
  constructor(config) {
    this.config = config;
    this.available = this.checkAvailability();
  }
  
  checkAvailability() {
    try {
      const test = '__persistence_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  isAvailable() {
    return this.available;
  }
  
  getKey(collection, key) {
    return `${this.config.prefix}${collection}:${key}`;
  }
  
  async save(collection, key, data) {
    if (!this.isAvailable()) {
      throw new Error('localStorage não disponível');
    }
    
    try {
      const fullKey = this.getKey(collection, key);
      const value = JSON.stringify({
        data,
        timestamp: Date.now()
      });
      localStorage.setItem(fullKey, value);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // Tentar limpar dados antigos
        this.cleanup();
        // Tentar novamente
        const fullKey = this.getKey(collection, key);
        const value = JSON.stringify({ data, timestamp: Date.now() });
        localStorage.setItem(fullKey, value);
      } else {
        throw error;
      }
    }
  }
  
  async load(collection, key) {
    if (!this.isAvailable()) {
      throw new Error('localStorage não disponível');
    }
    
    try {
      const fullKey = this.getKey(collection, key);
      const value = localStorage.getItem(fullKey);
      
      if (!value) {
        return null;
      }
      
      const parsed = JSON.parse(value);
      return parsed.data;
    } catch (error) {
      console.warn('[LocalStorageAdapter] Erro ao carregar:', error);
      return null;
    }
  }
  
  async delete(collection, key) {
    if (!this.isAvailable()) {
      throw new Error('localStorage não disponível');
    }
    
    const fullKey = this.getKey(collection, key);
    localStorage.removeItem(fullKey);
  }
  
  async query(collection, query = {}, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('localStorage não disponível');
    }
    
    const results = [];
    const prefix = `${this.config.prefix}${collection}:`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const value = localStorage.getItem(key);
          const parsed = JSON.parse(value);
          
          // Aplicar filtros
          let matches = true;
          if (Object.keys(query).length > 0) {
            matches = Object.entries(query).every(([queryKey, queryValue]) => {
              return parsed.data && parsed.data[queryKey] === queryValue;
            });
          }
          
          if (matches) {
            results.push(parsed.data);
          }
        } catch (error) {
          console.warn('[LocalStorageAdapter] Erro ao processar item:', key, error);
        }
      }
    }
    
    // Aplicar limite
    if (options.limit) {
      return results.slice(0, options.limit);
    }
    
    return results;
  }
  
  async clear(collection) {
    if (!this.isAvailable()) {
      throw new Error('localStorage não disponível');
    }
    
    const prefix = collection ? `${this.config.prefix}${collection}:` : this.config.prefix;
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  cleanup() {
    // Limpar itens antigos para liberar espaço
    const items = [];
    const prefix = this.config.prefix;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const value = localStorage.getItem(key);
          const parsed = JSON.parse(value);
          items.push({ key, timestamp: parsed.timestamp || 0 });
        } catch (error) {
          // Item inválido, remover
          localStorage.removeItem(key);
        }
      }
    }
    
    // Remover os 25% mais antigos
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = items.slice(0, Math.floor(items.length * 0.25));
    
    toRemove.forEach(item => {
      localStorage.removeItem(item.key);
    });
    
    console.log('[LocalStorageAdapter] Limpeza concluída:', toRemove.length, 'itens removidos');
  }
  
  getStats() {
    let usage = 0;
    let count = 0;
    const prefix = this.config.prefix;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        usage += key.length + (value ? value.length : 0);
        count++;
      }
    }
    
    return {
      available: this.available,
      items: count,
      usage: usage,
      usageKB: Math.round(usage / 1024),
      prefix: prefix
    };
  }
}

// Criar instância singleton
const persistenceService = new PersistenceService();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.KC = window.KC || {};
  window.KC.PersistenceService = persistenceService;
}

// Exportar para ES6 modules
export { persistenceService as PersistenceService };
export default persistenceService;