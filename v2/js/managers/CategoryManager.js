/**
 * CategoryManager V2 - Sistema de Categorização com Supabase
 * 
 * SOLUÇÃO PARA O MAIOR PROBLEMA V1: Múltiplas Fontes de Verdade
 * 
 * Funcionalidades:
 * - Fonte única de verdade (Supabase PostgreSQL)
 * - Fallback para IndexedDB quando offline
 * - Sync em tempo real entre abas/dispositivos
 * - Migração automática de dados V1
 * - Event-driven architecture completa
 * 
 * @version 2.0.0
 * @author Claude Code + Knowledge Consolidator Team
 */

import AppState from '../core/AppState.js';
import EventBus, { Events } from '../core/EventBus.js';

class CategoryManager {
  constructor() {
    // Estado interno
    this.categories = new Map();
    this.fileCategories = new Map(); // fileId -> Set(categoryIds)
    this.initialized = false;
    this.isOnline = navigator.onLine;
    
    // Configuração Supabase (mock para desenvolvimento)
    this.supabase = null;
    this.supabaseConfig = {
      url: process.env.SUPABASE_URL || 'https://mock.supabase.co',
      key: process.env.SUPABASE_ANON_KEY || 'mock-key',
      enabled: false // Começar com mock
    };
    
    // IndexedDB para fallback offline
    this.indexedDB = null;
    this.dbName = 'KC_V2_Categories';
    this.dbVersion = 1;
    
    // Cache e performance
    this.cache = new Map();
    this.syncQueue = [];
    this.lastSync = null;
    
    // Configuração de eventos
    this.setupEventListeners();
    
    console.log('[CategoryManager] Inicializado - V2 com Supabase+IndexedDB');
  }

  /**
   * Inicializar CategoryManager
   * @returns {Promise<boolean>} Sucesso da inicialização
   */
  async initialize() {
    try {
      console.log('[CategoryManager] Inicializando...');
      
      // 1. Verificar conexão e configurar storages
      await this.setupStorages();
      
      // 2. Carregar categorias da fonte principal
      await this.loadCategories();
      
      // 3. Migrar dados V1 se necessário
      await this.migrateFromV1();
      
      // 4. Aplicar categorias padrão se necessário
      await this.ensureDefaultCategories();
      
      // 5. Carregar relações arquivo-categoria
      await this.loadFileCategoryRelations();
      
      // 6. Atualizar AppState
      this.updateAppState();
      
      // 7. Configurar sync em tempo real
      this.setupRealtimeSync();
      
      this.initialized = true;
      EventBus.emit('category:manager:ready');
      
      console.log('[CategoryManager] Inicializado com sucesso:', {
        categories: this.categories.size,
        online: this.isOnline,
        source: this.isOnline && this.supabaseConfig.enabled ? 'Supabase' : 'IndexedDB'
      });
      
      return true;
    } catch (error) {
      console.error('[CategoryManager] Falha na inicialização:', error);
      
      // Fallback para dados padrão
      this.applyDefaultCategories();
      this.updateAppState();
      
      return false;
    }
  }

  /**
   * Configurar storages (Supabase + IndexedDB)
   */
  async setupStorages() {
    // 1. Configurar Supabase (mock por enquanto)
    if (this.isOnline && this.supabaseConfig.enabled) {
      try {
        // Mock do Supabase para desenvolvimento
        this.supabase = {
          from: (table) => ({
            select: (fields = '*') => ({
              order: (field, options = {}) => ({
                then: async (resolve, reject) => {
                  // Simular resposta do Supabase
                  resolve({ 
                    data: await this.getMockSupabaseData(table), 
                    error: null 
                  });
                }
              })
            }),
            insert: (data) => ({
              select: () => ({
                single: () => ({
                  then: async (resolve, reject) => {
                    // Simular inserção
                    const newData = { ...data, id: this.generateId() };
                    resolve({ data: newData, error: null });
                  }
                })
              })
            }),
            update: (data) => ({
              eq: (field, value) => ({
                then: async (resolve, reject) => {
                  resolve({ data: { ...data, id: value }, error: null });
                }
              })
            }),
            delete: () => ({
              eq: (field, value) => ({
                then: async (resolve, reject) => {
                  resolve({ data: { id: value }, error: null });
                }
              })
            }),
            upsert: (data) => ({
              then: async (resolve, reject) => {
                resolve({ data, error: null });
              }
            })
          })
        };
        console.log('[CategoryManager] Supabase configurado (mock)');
      } catch (error) {
        console.warn('[CategoryManager] Supabase indisponível, usando IndexedDB:', error);
        this.supabaseConfig.enabled = false;
      }
    }
    
    // 2. Configurar IndexedDB
    await this.setupIndexedDB();
  }

  /**
   * Configurar IndexedDB para fallback offline
   */
  async setupIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store para categorias
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoryStore.createIndex('name', 'name', { unique: false });
          categoryStore.createIndex('isDefault', 'isDefault', { unique: false });
        }
        
        // Store para relações arquivo-categoria
        if (!db.objectStoreNames.contains('file_categories')) {
          const relationStore = db.createObjectStore('file_categories', { keyPath: ['fileId', 'categoryId'] });
          relationStore.createIndex('fileId', 'fileId', { unique: false });
          relationStore.createIndex('categoryId', 'categoryId', { unique: false });
        }
        
        // Store para sync queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  /**
   * Dados mock do Supabase para desenvolvimento
   */
  async getMockSupabaseData(table) {
    if (table === 'categories') {
      return [
        { id: 'cat_1', name: 'Insights', color: '#4CAF50', icon: '💡', isDefault: true, createdAt: new Date().toISOString() },
        { id: 'cat_2', name: 'Decisões', color: '#2196F3', icon: '🎯', isDefault: true, createdAt: new Date().toISOString() },
        { id: 'cat_3', name: 'Técnico', color: '#FF9800', icon: '⚙️', isDefault: true, createdAt: new Date().toISOString() },
        { id: 'cat_4', name: 'Estratégico', color: '#9C27B0', icon: '🚀', isDefault: true, createdAt: new Date().toISOString() }
      ];
    }
    return [];
  }

  /**
   * Carregar categorias da fonte principal
   */
  async loadCategories() {
    let categories = [];
    
    if (this.isOnline && this.supabaseConfig.enabled && this.supabase) {
      // Carregar do Supabase
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('isDefault', { ascending: false })
        .order('name');
      
      if (!error && data) {
        categories = data;
        console.log('[CategoryManager] Categorias carregadas do Supabase:', data.length);
      }
    }
    
    // Fallback para IndexedDB
    if (categories.length === 0 && this.indexedDB) {
      categories = await this.loadFromIndexedDB('categories');
      console.log('[CategoryManager] Categorias carregadas do IndexedDB:', categories.length);
    }
    
    // Atualizar Map interno
    this.categories.clear();
    categories.forEach(cat => {
      this.categories.set(cat.id, cat);
    });
    
    return categories;
  }

  /**
   * Carregar dados do IndexedDB
   */
  async loadFromIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        resolve([]);
        return;
      }
      
      const transaction = this.indexedDB.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Migrar dados do V1 (localStorage)
   */
  async migrateFromV1() {
    try {
      // Verificar se há dados V1 para migrar
      const v1Categories = localStorage.getItem('kc_categories');
      const v1CustomCategories = localStorage.getItem('kc_custom_categories');
      
      if (!v1Categories && !v1CustomCategories) {
        console.log('[CategoryManager] Nenhum dado V1 para migrar');
        return;
      }
      
      console.log('[CategoryManager] Iniciando migração de dados V1...');
      
      const migratedCategories = new Set();
      
      // Migrar categorias padrão V1
      if (v1Categories) {
        const parsed = JSON.parse(v1Categories);
        if (Array.isArray(parsed)) {
          for (const cat of parsed) {
            const migrated = this.normalizeV1Category(cat);
            if (migrated && !this.categories.has(migrated.id)) {
              await this.createCategory(migrated, { fromMigration: true });
              migratedCategories.add(migrated.name);
            }
          }
        }
      }
      
      // Migrar categorias customizadas V1
      if (v1CustomCategories) {
        const parsed = JSON.parse(v1CustomCategories);
        if (Array.isArray(parsed)) {
          for (const cat of parsed) {
            const migrated = this.normalizeV1Category(cat, false);
            if (migrated && !this.categories.has(migrated.id)) {
              await this.createCategory(migrated, { fromMigration: true });
              migratedCategories.add(migrated.name);
            }
          }
        }
      }
      
      if (migratedCategories.size > 0) {
        console.log('[CategoryManager] Migração V1 completa:', Array.from(migratedCategories));
        EventBus.emit('category:migration:complete', {
          migrated: Array.from(migratedCategories),
          total: migratedCategories.size
        });
      }
      
    } catch (error) {
      console.error('[CategoryManager] Erro na migração V1:', error);
    }
  }

  /**
   * Normalizar categoria do V1 para V2
   */
  normalizeV1Category(v1Cat, isDefault = true) {
    if (!v1Cat || typeof v1Cat !== 'object') return null;
    
    return {
      id: v1Cat.id || this.generateId(),
      name: v1Cat.name || v1Cat.label || 'Categoria',
      color: v1Cat.color || '#757575',
      icon: v1Cat.icon || '📁',
      isDefault: isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migratedFrom: 'v1'
    };
  }

  /**
   * Aplicar categorias padrão se necessário
   */
  async ensureDefaultCategories() {
    if (this.categories.size > 0) {
      return; // Já há categorias
    }
    
    console.log('[CategoryManager] Aplicando categorias padrão...');
    await this.applyDefaultCategories();
  }

  /**
   * Aplicar categorias padrão
   */
  async applyDefaultCategories() {
    const defaults = [
      { name: 'Insights', color: '#4CAF50', icon: '💡' },
      { name: 'Decisões', color: '#2196F3', icon: '🎯' },
      { name: 'Técnico', color: '#FF9800', icon: '⚙️' },
      { name: 'Estratégico', color: '#9C27B0', icon: '🚀' },
      { name: 'Projetos', color: '#607D8B', icon: '📋' },
      { name: 'Aprendizado', color: '#795548', icon: '📚' }
    ];
    
    for (const def of defaults) {
      const category = {
        id: this.generateId(),
        name: def.name,
        color: def.color,
        icon: def.icon,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.categories.set(category.id, category);
      
      // Salvar no storage
      await this.saveToStorage('categories', category);
    }
    
    console.log('[CategoryManager] Categorias padrão aplicadas');
  }

  /**
   * Carregar relações arquivo-categoria
   */
  async loadFileCategoryRelations() {
    let relations = [];
    
    if (this.isOnline && this.supabaseConfig.enabled && this.supabase) {
      // Carregar do Supabase
      const { data, error } = await this.supabase
        .from('file_categories')
        .select('*');
      
      if (!error && data) {
        relations = data;
      }
    }
    
    // Fallback para IndexedDB
    if (relations.length === 0 && this.indexedDB) {
      relations = await this.loadFromIndexedDB('file_categories');
    }
    
    // Construir Map interno
    this.fileCategories.clear();
    relations.forEach(rel => {
      if (!this.fileCategories.has(rel.fileId)) {
        this.fileCategories.set(rel.fileId, new Set());
      }
      this.fileCategories.get(rel.fileId).add(rel.categoryId);
    });
    
    console.log('[CategoryManager] Relações arquivo-categoria carregadas:', relations.length);
  }

  /**
   * Criar nova categoria
   * @param {Object} categoryData - Dados da categoria
   * @param {Object} options - Opções { fromMigration: boolean }
   * @returns {Promise<Object>} Categoria criada
   */
  async createCategory(categoryData, options = {}) {
    try {
      const category = {
        id: categoryData.id || this.generateId(),
        name: categoryData.name,
        color: categoryData.color || '#757575',
        icon: categoryData.icon || '📁',
        isDefault: categoryData.isDefault || false,
        createdAt: categoryData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...categoryData
      };
      
      // Validar dados
      if (!category.name || category.name.trim() === '') {
        throw new Error('Nome da categoria é obrigatório');
      }
      
      // Verificar duplicatas
      if (this.findByName(category.name) && !options.fromMigration) {
        throw new Error(`Categoria "${category.name}" já existe`);
      }
      
      // Salvar no storage
      await this.saveToStorage('categories', category);
      
      // Atualizar Map interno
      this.categories.set(category.id, category);
      
      // Atualizar AppState
      this.updateAppState();
      
      // Emitir eventos
      if (!options.fromMigration) {
        EventBus.emit('category:created', category);
        EventBus.emit(Events.STATE_CHANGE, {
          key: 'categories',
          action: 'create',
          data: category
        });
      }
      
      console.log('[CategoryManager] Categoria criada:', category.name);
      return category;
      
    } catch (error) {
      console.error('[CategoryManager] Erro ao criar categoria:', error);
      throw error;
    }
  }

  /**
   * Atualizar categoria existente
   * @param {string} categoryId - ID da categoria
   * @param {Object} updates - Dados para atualizar
   * @returns {Promise<Object>} Categoria atualizada
   */
  async updateCategory(categoryId, updates) {
    try {
      const existing = this.categories.get(categoryId);
      if (!existing) {
        throw new Error(`Categoria ${categoryId} não encontrada`);
      }
      
      const updated = {
        ...existing,
        ...updates,
        id: categoryId, // Não permitir mudança de ID
        updatedAt: new Date().toISOString()
      };
      
      // Validar
      if (updates.name && updates.name.trim() === '') {
        throw new Error('Nome da categoria não pode estar vazio');
      }
      
      // Verificar duplicata de nome
      if (updates.name && updates.name !== existing.name) {
        const duplicate = this.findByName(updates.name);
        if (duplicate && duplicate.id !== categoryId) {
          throw new Error(`Categoria "${updates.name}" já existe`);
        }
      }
      
      // Salvar no storage
      await this.saveToStorage('categories', updated);
      
      // Atualizar Map interno
      this.categories.set(categoryId, updated);
      
      // Atualizar AppState
      this.updateAppState();
      
      // Emitir eventos
      EventBus.emit('category:updated', { old: existing, new: updated });
      EventBus.emit(Events.STATE_CHANGE, {
        key: 'categories',
        action: 'update',
        data: updated
      });
      
      console.log('[CategoryManager] Categoria atualizada:', updated.name);
      return updated;
      
    } catch (error) {
      console.error('[CategoryManager] Erro ao atualizar categoria:', error);
      throw error;
    }
  }

  /**
   * Remover categoria
   * @param {string} categoryId - ID da categoria
   * @returns {Promise<boolean>} Sucesso da remoção
   */
  async deleteCategory(categoryId) {
    try {
      const category = this.categories.get(categoryId);
      if (!category) {
        throw new Error(`Categoria ${categoryId} não encontrada`);
      }
      
      // Não permitir remoção de categorias padrão
      if (category.isDefault) {
        throw new Error('Categorias padrão não podem ser removidas');
      }
      
      // Verificar se há arquivos usando esta categoria
      const filesUsingCategory = this.getFilesByCategory(categoryId);
      if (filesUsingCategory.length > 0) {
        // Opção: remover associações ou bloquear remoção
        // Por segurança, vamos bloquear por enquanto
        throw new Error(`Categoria "${category.name}" está sendo usada por ${filesUsingCategory.length} arquivo(s)`);
      }
      
      // Remover do storage
      await this.deleteFromStorage('categories', categoryId);
      
      // Remover do Map interno
      this.categories.delete(categoryId);
      
      // Atualizar AppState
      this.updateAppState();
      
      // Emitir eventos
      EventBus.emit('category:deleted', category);
      EventBus.emit(Events.STATE_CHANGE, {
        key: 'categories',
        action: 'delete',
        data: category
      });
      
      console.log('[CategoryManager] Categoria removida:', category.name);
      return true;
      
    } catch (error) {
      console.error('[CategoryManager] Erro ao remover categoria:', error);
      throw error;
    }
  }

  /**
   * Atribuir categoria(s) a um arquivo
   * @param {string} fileId - ID do arquivo
   * @param {string|string[]} categoryIds - ID(s) da(s) categoria(s)
   * @returns {Promise<boolean>} Sucesso da atribuição
   */
  async assignToFile(fileId, categoryIds) {
    try {
      const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      
      // Validar categorias
      for (const catId of ids) {
        if (!this.categories.has(catId)) {
          throw new Error(`Categoria ${catId} não encontrada`);
        }
      }
      
      // Atualizar Map interno
      if (!this.fileCategories.has(fileId)) {
        this.fileCategories.set(fileId, new Set());
      }
      
      const fileCategories = this.fileCategories.get(fileId);
      ids.forEach(catId => fileCategories.add(catId));
      
      // Salvar relações no storage
      const relations = ids.map(categoryId => ({
        fileId,
        categoryId,
        assignedAt: new Date().toISOString()
      }));
      
      await this.saveRelationsToStorage(relations);
      
      // Emitir eventos
      EventBus.emit('category:assigned', { fileId, categoryIds: ids });
      EventBus.emit(Events.FILE_CATEGORIZED, { fileId, categoryIds: ids });
      
      console.log('[CategoryManager] Categorias atribuídas:', { fileId, categories: ids.length });
      return true;
      
    } catch (error) {
      console.error('[CategoryManager] Erro ao atribuir categorias:', error);
      throw error;
    }
  }

  /**
   * Remover categoria de um arquivo
   * @param {string} fileId - ID do arquivo
   * @param {string} categoryId - ID da categoria
   * @returns {Promise<boolean>} Sucesso da remoção
   */
  async removeFromFile(fileId, categoryId) {
    try {
      if (!this.fileCategories.has(fileId)) {
        return true; // Arquivo não tem categorias
      }
      
      const fileCategories = this.fileCategories.get(fileId);
      fileCategories.delete(categoryId);
      
      // Se não há mais categorias, remover entrada
      if (fileCategories.size === 0) {
        this.fileCategories.delete(fileId);
      }
      
      // Remover relação do storage
      await this.deleteRelationFromStorage(fileId, categoryId);
      
      // Emitir eventos
      EventBus.emit('category:removed', { fileId, categoryId });
      
      console.log('[CategoryManager] Categoria removida do arquivo:', { fileId, categoryId });
      return true;
      
    } catch (error) {
      console.error('[CategoryManager] Erro ao remover categoria do arquivo:', error);
      throw error;
    }
  }

  /**
   * Obter todas as categorias
   * @returns {Array} Lista de categorias
   */
  getAll() {
    return Array.from(this.categories.values()).sort((a, b) => {
      // Categorias padrão primeiro
      if (a.isDefault !== b.isDefault) {
        return b.isDefault ? 1 : -1;
      }
      // Depois por nome
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Obter categoria por ID
   * @param {string} categoryId - ID da categoria
   * @returns {Object|null} Categoria ou null
   */
  getById(categoryId) {
    return this.categories.get(categoryId) || null;
  }

  /**
   * Encontrar categoria por nome
   * @param {string} name - Nome da categoria
   * @returns {Object|null} Categoria ou null
   */
  findByName(name) {
    for (const category of this.categories.values()) {
      if (category.name.toLowerCase() === name.toLowerCase()) {
        return category;
      }
    }
    return null;
  }

  /**
   * Obter categorias de um arquivo
   * @param {string} fileId - ID do arquivo
   * @returns {Array} Lista de categorias do arquivo
   */
  getFileCategories(fileId) {
    if (!this.fileCategories.has(fileId)) {
      return [];
    }
    
    const categoryIds = Array.from(this.fileCategories.get(fileId));
    return categoryIds.map(id => this.categories.get(id)).filter(Boolean);
  }

  /**
   * Obter arquivos de uma categoria
   * @param {string} categoryId - ID da categoria
   * @returns {Array} Lista de IDs de arquivos
   */
  getFilesByCategory(categoryId) {
    const files = [];
    
    for (const [fileId, categories] of this.fileCategories.entries()) {
      if (categories.has(categoryId)) {
        files.push(fileId);
      }
    }
    
    return files;
  }

  /**
   * Verificar se arquivo tem categoria específica
   * @param {string} fileId - ID do arquivo
   * @param {string} categoryId - ID da categoria
   * @returns {boolean} Arquivo tem a categoria
   */
  fileHasCategory(fileId, categoryId) {
    const fileCategories = this.fileCategories.get(fileId);
    return fileCategories ? fileCategories.has(categoryId) : false;
  }

  /**
   * Obter estatísticas das categorias
   * @returns {Object} Estatísticas
   */
  getStats() {
    const stats = {
      total: this.categories.size,
      default: 0,
      custom: 0,
      assignments: 0,
      categories: []
    };
    
    for (const category of this.categories.values()) {
      if (category.isDefault) {
        stats.default++;
      } else {
        stats.custom++;
      }
      
      const fileCount = this.getFilesByCategory(category.id).length;
      stats.assignments += fileCount;
      
      stats.categories.push({
        id: category.id,
        name: category.name,
        fileCount,
        isDefault: category.isDefault
      });
    }
    
    return stats;
  }

  /**
   * Salvar no storage apropriado
   */
  async saveToStorage(storeName, data) {
    const promises = [];
    
    // Tentar Supabase primeiro
    if (this.isOnline && this.supabaseConfig.enabled && this.supabase) {
      promises.push(this.saveToSupabase(storeName, data));
    }
    
    // Sempre salvar no IndexedDB para backup
    if (this.indexedDB) {
      promises.push(this.saveToIndexedDB(storeName, data));
    }
    
    // Se offline, adicionar à sync queue
    if (!this.isOnline) {
      this.addToSyncQueue('upsert', storeName, data);
    }
    
    await Promise.allSettled(promises);
  }

  /**
   * Salvar no Supabase (mock)
   */
  async saveToSupabase(storeName, data) {
    if (storeName === 'categories') {
      const { data: result, error } = await this.supabase
        .from('categories')
        .upsert(data);
      
      if (error) {
        throw error;
      }
      
      return result;
    }
  }

  /**
   * Salvar no IndexedDB
   */
  async saveToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Salvar relações arquivo-categoria
   */
  async saveRelationsToStorage(relations) {
    const promises = [];
    
    if (this.isOnline && this.supabaseConfig.enabled && this.supabase) {
      promises.push(
        this.supabase.from('file_categories').upsert(relations)
      );
    }
    
    if (this.indexedDB) {
      promises.push(
        Promise.all(
          relations.map(rel => this.saveToIndexedDB('file_categories', rel))
        )
      );
    }
    
    await Promise.allSettled(promises);
  }

  /**
   * Remover do storage
   */
  async deleteFromStorage(storeName, id) {
    const promises = [];
    
    if (this.isOnline && this.supabaseConfig.enabled && this.supabase) {
      promises.push(
        this.supabase.from(storeName).delete().eq('id', id)
      );
    }
    
    if (this.indexedDB) {
      promises.push(this.deleteFromIndexedDB(storeName, id));
    }
    
    await Promise.allSettled(promises);
  }

  /**
   * Remover do IndexedDB
   */
  async deleteFromIndexedDB(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remover relação específica
   */
  async deleteRelationFromStorage(fileId, categoryId) {
    const promises = [];
    
    if (this.isOnline && this.supabaseConfig.enabled && this.supabase) {
      promises.push(
        this.supabase
          .from('file_categories')
          .delete()
          .eq('fileId', fileId)
          .eq('categoryId', categoryId)
      );
    }
    
    if (this.indexedDB) {
      promises.push(
        this.deleteFromIndexedDB('file_categories', [fileId, categoryId])
      );
    }
    
    await Promise.allSettled(promises);
  }

  /**
   * Adicionar à fila de sync
   */
  addToSyncQueue(operation, storeName, data) {
    const syncItem = {
      id: Date.now() + Math.random(),
      operation,
      storeName,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.syncQueue.push(syncItem);
    
    // Salvar queue no IndexedDB
    if (this.indexedDB) {
      this.saveToIndexedDB('sync_queue', syncItem);
    }
  }

  /**
   * Processar fila de sync
   */
  async processSyncQueue() {
    if (!this.isOnline || !this.supabaseConfig.enabled || this.syncQueue.length === 0) {
      return;
    }
    
    console.log('[CategoryManager] Processando sync queue:', this.syncQueue.length, 'itens');
    
    const processed = [];
    
    for (const item of this.syncQueue) {
      try {
        if (item.operation === 'upsert') {
          await this.saveToSupabase(item.storeName, item.data);
        }
        processed.push(item.id);
      } catch (error) {
        console.error('[CategoryManager] Erro no sync:', error);
      }
    }
    
    // Remover itens processados
    this.syncQueue = this.syncQueue.filter(item => !processed.includes(item.id));
    
    console.log('[CategoryManager] Sync completo:', processed.length, 'itens sincronizados');
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Detectar mudanças de conectividade
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[CategoryManager] Conexão restaurada');
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[CategoryManager] Modo offline ativado');
    });
    
    // Listener para mudanças de storage
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('kc_v2_categories')) {
        console.log('[CategoryManager] Mudança detectada em outra aba');
        this.handleExternalChange(event);
      }
    });
  }

  /**
   * Configurar sync em tempo real (mock)
   */
  setupRealtimeSync() {
    if (!this.isOnline || !this.supabaseConfig.enabled) {
      return;
    }
    
    // Mock do real-time do Supabase
    console.log('[CategoryManager] Sync em tempo real configurado (mock)');
    
    // Simular sync periódico
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 30000); // A cada 30 segundos
  }

  /**
   * Lidar com mudanças externas
   */
  async handleExternalChange(event) {
    // Recarregar dados se mudança relevante
    if (event.key.includes('categories')) {
      await this.loadCategories();
      this.updateAppState();
      EventBus.emit('category:external:change');
    }
  }

  /**
   * Atualizar AppState
   */
  updateAppState() {
    const categoriesArray = this.getAll();
    const stats = this.getStats();
    
    AppState.set('categories', categoriesArray);
    AppState.set('categoryStats', stats);
    
    // Emitir evento de mudança
    EventBus.emit(Events.STATE_CHANGE, {
      key: 'categories',
      action: 'sync',
      data: categoriesArray
    });
  }

  /**
   * Gerar ID único
   */
  generateId() {
    return 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Exportar categorias
   * @returns {Object} Dados para exportação
   */
  export() {
    return {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      categories: this.getAll(),
      relations: Array.from(this.fileCategories.entries()).map(([fileId, categoryIds]) => ({
        fileId,
        categoryIds: Array.from(categoryIds)
      })),
      stats: this.getStats()
    };
  }

  /**
   * Importar categorias
   * @param {Object} data - Dados para importação
   * @returns {Promise<boolean>} Sucesso da importação
   */
  async import(data) {
    try {
      if (!data || !data.categories) {
        throw new Error('Dados de importação inválidos');
      }
      
      console.log('[CategoryManager] Iniciando importação...');
      
      // Backup atual
      const backup = this.export();
      localStorage.setItem('kc_v2_categories_backup', JSON.stringify(backup));
      
      // Limpar dados atuais
      this.categories.clear();
      this.fileCategories.clear();
      
      // Importar categorias
      for (const category of data.categories) {
        this.categories.set(category.id, category);
        await this.saveToStorage('categories', category);
      }
      
      // Importar relações
      if (data.relations) {
        for (const relation of data.relations) {
          this.fileCategories.set(relation.fileId, new Set(relation.categoryIds));
          
          const relations = relation.categoryIds.map(categoryId => ({
            fileId: relation.fileId,
            categoryId,
            assignedAt: new Date().toISOString()
          }));
          
          await this.saveRelationsToStorage(relations);
        }
      }
      
      // Atualizar AppState
      this.updateAppState();
      
      // Emitir evento
      EventBus.emit('category:imported', {
        categories: data.categories.length,
        relations: data.relations?.length || 0
      });
      
      console.log('[CategoryManager] Importação completa');
      return true;
      
    } catch (error) {
      console.error('[CategoryManager] Erro na importação:', error);
      
      // Restaurar backup se disponível
      const backup = localStorage.getItem('kc_v2_categories_backup');
      if (backup) {
        console.log('[CategoryManager] Restaurando backup...');
        await this.import(JSON.parse(backup));
      }
      
      throw error;
    }
  }

  /**
   * Reset completo
   */
  async reset() {
    console.log('[CategoryManager] Executando reset completo...');
    
    // Limpar dados
    this.categories.clear();
    this.fileCategories.clear();
    this.syncQueue = [];
    
    // Limpar storages
    if (this.indexedDB) {
      const stores = ['categories', 'file_categories', 'sync_queue'];
      for (const storeName of stores) {
        const transaction = this.indexedDB.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
      }
    }
    
    // Aplicar padrões
    await this.applyDefaultCategories();
    
    // Atualizar AppState
    this.updateAppState();
    
    // Emitir evento
    EventBus.emit('category:reset');
    
    console.log('[CategoryManager] Reset completo');
  }

  /**
   * Diagnóstico do sistema
   */
  diagnose() {
    return {
      initialized: this.initialized,
      online: this.isOnline,
      supabaseEnabled: this.supabaseConfig.enabled,
      indexedDBAvailable: !!this.indexedDB,
      categories: this.categories.size,
      fileCategories: this.fileCategories.size,
      syncQueueSize: this.syncQueue.length,
      lastSync: this.lastSync,
      stats: this.getStats()
    };
  }
}

// Criar instância singleton
const categoryManager = new CategoryManager();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.KC = window.KC || {};
  window.KC.CategoryManager = categoryManager;
}

export default categoryManager;