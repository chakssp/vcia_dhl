/**
 * Migration Scripts for V1 to V2 Data Transformation
 * Handles complex data migrations and transformations
 */

export class MigrationScripts {
  constructor() {
    this.migrations = new Map();
    this.executedMigrations = new Set();
    this.registerMigrations();
  }

  registerMigrations() {
    // Register all migration scripts
    this.register('001-initial-data-structure', this.migrateInitialDataStructure);
    this.register('002-file-metadata-enhancement', this.migrateFileMetadata);
    this.register('003-category-system-upgrade', this.migrateCategorySystem);
    this.register('004-analysis-results-transform', this.migrateAnalysisResults);
    this.register('005-settings-consolidation', this.migrateSettings);
    this.register('006-embeddings-preparation', this.prepareEmbeddings);
    this.register('007-qdrant-collection-setup', this.setupQdrantCollections);
    this.register('008-workflow-state-migration', this.migrateWorkflowState);
    this.register('009-filter-preferences', this.migrateFilterPreferences);
    this.register('010-export-history', this.migrateExportHistory);
  }

  register(id, migration) {
    this.migrations.set(id, {
      id,
      name: migration.name,
      execute: migration.bind(this),
      timestamp: new Date().toISOString()
    });
  }

  async runAll(options = {}) {
    console.log('[Migration] Starting migration process...');
    const results = {
      successful: [],
      failed: [],
      skipped: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const [id, migration] of this.migrations) {
      if (this.executedMigrations.has(id) && !options.force) {
        results.skipped.push(id);
        continue;
      }

      try {
        console.log(`[Migration] Running ${id}: ${migration.name}`);
        const migrationStart = Date.now();
        
        await migration.execute(options);
        
        const migrationTime = Date.now() - migrationStart;
        this.executedMigrations.add(id);
        
        results.successful.push({
          id,
          name: migration.name,
          time: migrationTime
        });
        
        // Save progress
        this.saveProgress();
        
      } catch (error) {
        console.error(`[Migration] Failed ${id}:`, error);
        results.failed.push({
          id,
          name: migration.name,
          error: error.message
        });
        
        if (!options.continueOnError) {
          break;
        }
      }
    }

    results.totalTime = Date.now() - startTime;
    console.log('[Migration] Migration complete:', results);
    
    return results;
  }

  async run(migrationId, options = {}) {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    console.log(`[Migration] Running single migration: ${migrationId}`);
    await migration.execute(options);
    this.executedMigrations.add(migrationId);
    this.saveProgress();
  }

  // Migration Scripts

  async migrateInitialDataStructure(options) {
    // Transform V1 data structure to V2 format
    const v1Data = this.loadV1Data();
    
    const v2Data = {
      version: '2.0.0',
      migrationDate: new Date().toISOString(),
      collections: {
        files: [],
        categories: [],
        analysis: [],
        settings: {}
      }
    };

    // Transform files
    if (v1Data.files) {
      v2Data.collections.files = v1Data.files.map(file => ({
        id: file.id || this.generateId(),
        name: file.name,
        path: file.path,
        type: this.detectFileType(file),
        size: file.size || 0,
        created: file.created || file.createdDate,
        modified: file.modified || file.modifiedDate,
        accessed: file.accessed || null,
        metadata: {
          v1Id: file.id,
          handle: file.handle,
          permissions: file.permissions || 'read'
        },
        content: {
          raw: file.content,
          preview: file.preview,
          extracted: null
        },
        analysis: {
          status: file.analyzed ? 'completed' : 'pending',
          results: file.analysis || null,
          timestamp: file.analyzedDate || null
        },
        categories: file.categories || [],
        tags: file.tags || [],
        relevance: {
          score: file.relevanceScore || 0,
          algorithm: 'v1-legacy',
          factors: {}
        }
      }));
    }

    // Save transformed data
    await this.saveV2Data('initial-structure', v2Data);
    
    return v2Data;
  }

  async migrateFileMetadata(options) {
    const files = await this.loadV2Collection('files');
    
    const enhanced = files.map(file => {
      // Enhance metadata
      file.metadata = {
        ...file.metadata,
        mimeType: this.getMimeType(file.name),
        extension: this.getExtension(file.name),
        encoding: this.detectEncoding(file.content?.raw),
        language: this.detectLanguage(file.content?.raw),
        checksums: {
          md5: this.calculateChecksum(file.content?.raw, 'md5'),
          sha256: this.calculateChecksum(file.content?.raw, 'sha256')
        }
      };

      // Add semantic metadata
      file.semantic = {
        topics: this.extractTopics(file.content?.raw),
        entities: this.extractEntities(file.content?.raw),
        keywords: this.extractKeywords(file.content?.raw),
        summary: this.generateSummary(file.content?.raw)
      };

      // Add workflow metadata
      file.workflow = {
        stage: this.determineWorkflowStage(file),
        priority: this.calculatePriority(file),
        assignee: null,
        dueDate: null,
        notes: []
      };

      return file;
    });

    await this.saveV2Collection('files', enhanced);
    
    return enhanced.length;
  }

  async migrateCategorySystem(options) {
    const v1Categories = this.loadV1Categories();
    const files = await this.loadV2Collection('files');
    
    // Create hierarchical category structure
    const categoryTree = {
      root: {
        id: 'root',
        name: 'All Categories',
        children: []
      }
    };

    // Build category hierarchy
    const categories = v1Categories.map(cat => {
      const category = typeof cat === 'string' ? { name: cat } : cat;
      
      return {
        id: this.generateId(),
        name: category.name,
        slug: this.slugify(category.name),
        color: category.color || this.generateColor(category.name),
        icon: category.icon || this.selectIcon(category.name),
        description: category.description || '',
        parent: category.parent || 'root',
        children: [],
        metadata: {
          v1Name: category.name,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          fileCount: 0,
          totalSize: 0
        },
        rules: {
          autoAssign: category.autoAssign || false,
          patterns: category.patterns || [],
          keywords: category.keywords || []
        }
      };
    });

    // Update file counts
    files.forEach(file => {
      file.categories.forEach(catName => {
        const category = categories.find(c => c.name === catName || c.slug === catName);
        if (category) {
          category.metadata.fileCount++;
          category.metadata.totalSize += file.size || 0;
        }
      });
    });

    // Build hierarchy
    categories.forEach(cat => {
      if (cat.parent === 'root') {
        categoryTree.root.children.push(cat);
      } else {
        const parent = categories.find(c => c.id === cat.parent);
        if (parent) {
          parent.children.push(cat);
        }
      }
    });

    await this.saveV2Collection('categories', categories);
    await this.saveV2Data('category-tree', categoryTree);
    
    return categories.length;
  }

  async migrateAnalysisResults(options) {
    const files = await this.loadV2Collection('files');
    const analysisResults = [];

    files.forEach(file => {
      if (file.analysis?.results) {
        const v1Analysis = file.analysis.results;
        
        const v2Analysis = {
          id: this.generateId(),
          fileId: file.id,
          fileName: file.name,
          timestamp: file.analysis.timestamp || new Date().toISOString(),
          provider: v1Analysis.provider || 'v1-legacy',
          model: v1Analysis.model || 'unknown',
          status: 'completed',
          
          results: {
            summary: v1Analysis.summary || v1Analysis.content || '',
            insights: this.extractInsights(v1Analysis),
            categories: v1Analysis.categories || v1Analysis.suggestedCategories || [],
            relevance: {
              score: v1Analysis.relevanceScore || v1Analysis.score || 0,
              confidence: v1Analysis.confidence || 0.5,
              factors: v1Analysis.factors || {}
            },
            entities: v1Analysis.entities || [],
            topics: v1Analysis.topics || [],
            sentiment: v1Analysis.sentiment || 'neutral',
            language: v1Analysis.language || 'en'
          },
          
          metadata: {
            tokensUsed: v1Analysis.tokensUsed || 0,
            processingTime: v1Analysis.processingTime || 0,
            cost: v1Analysis.cost || 0,
            version: '2.0.0'
          },
          
          actions: {
            suggested: this.generateSuggestedActions(v1Analysis),
            taken: [],
            pending: []
          }
        };

        analysisResults.push(v2Analysis);
      }
    });

    await this.saveV2Collection('analysis', analysisResults);
    
    return analysisResults.length;
  }

  async migrateSettings(options) {
    const v1Config = this.loadV1Config();
    const v1Settings = this.loadV1Settings();
    
    const v2Settings = {
      version: '2.0.0',
      migrated: new Date().toISOString(),
      
      general: {
        theme: v1Settings.theme || 'dark',
        language: v1Settings.language || 'en',
        timezone: v1Settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: v1Settings.dateFormat || 'YYYY-MM-DD',
        firstDayOfWeek: v1Settings.firstDayOfWeek || 1
      },
      
      discovery: {
        patterns: v1Config.discovery?.patterns || [],
        excludePatterns: v1Config.discovery?.excludePatterns || [],
        maxFileSize: v1Config.discovery?.maxFileSize || 10485760, // 10MB
        followSymlinks: v1Config.discovery?.followSymlinks || false,
        scanHidden: v1Config.discovery?.scanHidden || false
      },
      
      analysis: {
        defaultProvider: v1Config.aiAnalysis?.defaultProvider || 'ollama',
        providers: this.migrateProviders(v1Config.aiAnalysis?.providers),
        batchSize: v1Config.aiAnalysis?.batchSize || 5,
        timeout: v1Config.aiAnalysis?.timeout || 30000,
        retryAttempts: v1Config.aiAnalysis?.retryAttempts || 3,
        cacheResults: v1Config.aiAnalysis?.cacheResults !== false
      },
      
      organization: {
        defaultCategories: v1Config.organization?.defaultCategories || [],
        autoCategorizaiton: v1Config.organization?.autoCategorization || false,
        categoryRules: v1Config.organization?.categoryRules || []
      },
      
      export: {
        defaultFormat: v1Config.export?.defaultFormat || 'json',
        includeMetadata: v1Config.export?.includeMetadata !== false,
        compression: v1Config.export?.compression || false,
        qdrant: {
          url: v1Config.export?.qdrant?.url || 'http://localhost:6333',
          collection: v1Config.export?.qdrant?.collection || 'knowledge_consolidator',
          batchSize: v1Config.export?.qdrant?.batchSize || 100
        }
      },
      
      ui: {
        sidebarCollapsed: v1Settings.ui?.sidebarCollapsed || false,
        terminalHeight: v1Settings.ui?.terminalHeight || 200,
        showWelcome: v1Settings.ui?.showWelcome !== false,
        shortcuts: v1Settings.ui?.shortcuts || {}
      },
      
      performance: {
        enableWorkers: true,
        workerPoolSize: 4,
        cacheStrategy: 'aggressive',
        maxMemoryUsage: 512 // MB
      }
    };

    await this.saveV2Data('settings', v2Settings);
    
    return v2Settings;
  }

  async prepareEmbeddings(options) {
    const files = await this.loadV2Collection('files');
    const embeddingQueue = [];

    files.forEach(file => {
      if (file.content?.raw || file.content?.preview) {
        embeddingQueue.push({
          id: file.id,
          type: 'file',
          content: file.content.raw || file.content.preview,
          metadata: {
            fileName: file.name,
            fileType: file.type,
            categories: file.categories,
            relevanceScore: file.relevance.score
          }
        });
      }

      // Also prepare embeddings for analysis results
      if (file.analysis?.results?.summary) {
        embeddingQueue.push({
          id: `${file.id}-analysis`,
          type: 'analysis',
          content: file.analysis.results.summary,
          metadata: {
            fileId: file.id,
            fileName: file.name,
            analysisType: 'summary'
          }
        });
      }
    });

    await this.saveV2Data('embedding-queue', embeddingQueue);
    
    return embeddingQueue.length;
  }

  async setupQdrantCollections(options) {
    const collections = [
      {
        name: 'kc_files',
        vector_size: 768, // For all-MiniLM-L6-v2
        distance: 'Cosine',
        schema: {
          file_id: 'keyword',
          file_name: 'text',
          file_type: 'keyword',
          categories: 'keyword[]',
          relevance_score: 'float',
          created_date: 'datetime',
          modified_date: 'datetime'
        }
      },
      {
        name: 'kc_analysis',
        vector_size: 768,
        distance: 'Cosine',
        schema: {
          analysis_id: 'keyword',
          file_id: 'keyword',
          provider: 'keyword',
          summary: 'text',
          insights: 'text[]',
          topics: 'keyword[]',
          sentiment: 'keyword'
        }
      },
      {
        name: 'kc_categories',
        vector_size: 768,
        distance: 'Cosine',
        schema: {
          category_id: 'keyword',
          name: 'keyword',
          description: 'text',
          parent: 'keyword',
          file_count: 'integer'
        }
      }
    ];

    await this.saveV2Data('qdrant-collections', collections);
    
    // Note: Actual creation would happen via QdrantService
    console.log('[Migration] Qdrant collection schemas prepared');
    
    return collections.length;
  }

  async migrateWorkflowState(options) {
    const v1State = this.loadV1State();
    
    const workflowState = {
      currentStep: v1State.currentStep || 1,
      completedSteps: v1State.completedSteps || [],
      stepData: {
        discovery: {
          completed: v1State.discoveryCompleted || false,
          filesCount: v1State.discoveredFiles?.length || 0,
          lastRun: v1State.lastDiscovery || null,
          settings: v1State.discoverySettings || {}
        },
        analysis: {
          completed: v1State.analysisCompleted || false,
          analyzedCount: v1State.analyzedFiles?.length || 0,
          pendingCount: v1State.pendingAnalysis?.length || 0,
          lastRun: v1State.lastAnalysis || null,
          settings: v1State.analysisSettings || {}
        },
        organization: {
          completed: v1State.organizationCompleted || false,
          categorizedCount: v1State.categorizedFiles?.length || 0,
          lastRun: v1State.lastOrganization || null,
          settings: v1State.organizationSettings || {}
        },
        export: {
          completed: v1State.exportCompleted || false,
          exportCount: v1State.exports?.length || 0,
          lastRun: v1State.lastExport || null,
          settings: v1State.exportSettings || {}
        }
      },
      history: v1State.history || [],
      preferences: {
        autoAdvance: v1State.autoAdvance !== false,
        confirmActions: v1State.confirmActions !== false,
        showTips: v1State.showTips !== false
      }
    };

    await this.saveV2Data('workflow-state', workflowState);
    
    return workflowState;
  }

  async migrateFilterPreferences(options) {
    const v1Filters = this.loadV1Filters();
    
    const filterPresets = [
      {
        id: 'default',
        name: 'Default View',
        filters: {
          relevance: v1Filters.relevanceThreshold || 0,
          dateRange: v1Filters.dateRange || 'all',
          fileTypes: v1Filters.fileTypes || [],
          categories: v1Filters.categories || [],
          analyzed: v1Filters.showAnalyzed !== false,
          sortBy: v1Filters.sortBy || 'relevance',
          sortOrder: v1Filters.sortOrder || 'desc'
        }
      }
    ];

    // Migrate custom filter presets
    if (v1Filters.presets) {
      v1Filters.presets.forEach(preset => {
        filterPresets.push({
          id: this.generateId(),
          name: preset.name,
          filters: preset.filters,
          created: preset.created || new Date().toISOString()
        });
      });
    }

    await this.saveV2Collection('filter-presets', filterPresets);
    
    return filterPresets.length;
  }

  async migrateExportHistory(options) {
    const v1Exports = this.loadV1ExportHistory();
    
    const exportHistory = v1Exports.map(exp => ({
      id: this.generateId(),
      timestamp: exp.timestamp || exp.date,
      format: exp.format,
      fileCount: exp.fileCount || exp.files?.length || 0,
      settings: exp.settings || {},
      status: exp.status || 'completed',
      size: exp.size || 0,
      duration: exp.duration || 0,
      output: {
        filename: exp.filename,
        path: exp.path,
        url: exp.url
      },
      metadata: {
        v1Id: exp.id,
        migrated: new Date().toISOString()
      }
    }));

    await this.saveV2Collection('export-history', exportHistory);
    
    return exportHistory.length;
  }

  // Helper methods

  loadV1Data() {
    const stored = localStorage.getItem('kc-state');
    return stored ? JSON.parse(stored) : {};
  }

  loadV1Categories() {
    const stored = localStorage.getItem('kc-categories');
    return stored ? JSON.parse(stored) : [];
  }

  loadV1Config() {
    const stored = localStorage.getItem('kc-config');
    return stored ? JSON.parse(stored) : {};
  }

  loadV1Settings() {
    const stored = localStorage.getItem('kc-settings');
    return stored ? JSON.parse(stored) : {};
  }

  loadV1State() {
    const stored = localStorage.getItem('kc-workflow-state');
    return stored ? JSON.parse(stored) : {};
  }

  loadV1Filters() {
    const stored = localStorage.getItem('kc-filter-preferences');
    return stored ? JSON.parse(stored) : {};
  }

  loadV1ExportHistory() {
    const stored = localStorage.getItem('kc-export-history');
    return stored ? JSON.parse(stored) : [];
  }

  async loadV2Collection(name) {
    const stored = localStorage.getItem(`kc-v2-${name}`);
    return stored ? JSON.parse(stored) : [];
  }

  async saveV2Collection(name, data) {
    localStorage.setItem(`kc-v2-${name}`, JSON.stringify(data));
  }

  async saveV2Data(key, data) {
    localStorage.setItem(`kc-v2-${key}`, JSON.stringify(data));
  }

  saveProgress() {
    const progress = {
      executed: Array.from(this.executedMigrations),
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('kc-migration-progress', JSON.stringify(progress));
  }

  loadProgress() {
    const stored = localStorage.getItem('kc-migration-progress');
    if (stored) {
      const progress = JSON.parse(stored);
      this.executedMigrations = new Set(progress.executed);
    }
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  detectFileType(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const typeMap = {
      'md': 'markdown',
      'txt': 'text',
      'doc': 'document',
      'docx': 'document',
      'pdf': 'pdf',
      'json': 'data',
      'xml': 'data',
      'csv': 'data'
    };
    return typeMap[ext] || 'other';
  }

  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  detectEncoding(content) {
    // Simple encoding detection
    if (!content) return 'unknown';
    
    // Check for BOM
    if (content.startsWith('\ufeff')) return 'utf-8-bom';
    if (content.startsWith('\ufffe')) return 'utf-16-le';
    if (content.startsWith('\ufeff')) return 'utf-16-be';
    
    // Default to UTF-8
    return 'utf-8';
  }

  detectLanguage(content) {
    if (!content) return 'unknown';
    
    // Simple language detection based on common words
    const patterns = {
      'en': /\b(the|and|or|is|are|was|were|have|has|had)\b/gi,
      'pt': /\b(o|a|os|as|um|uma|de|da|do|para|com)\b/gi,
      'es': /\b(el|la|los|las|un|una|de|del|para|con)\b/gi
    };
    
    let maxMatches = 0;
    let detectedLang = 'unknown';
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = content.match(pattern);
      if (matches && matches.length > maxMatches) {
        maxMatches = matches.length;
        detectedLang = lang;
      }
    }
    
    return detectedLang;
  }

  calculateChecksum(content, algorithm) {
    if (!content) return null;
    
    // Simple checksum calculation (in real implementation, use crypto)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  }

  extractTopics(content) {
    if (!content) return [];
    
    // Simple topic extraction (in real implementation, use NLP)
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    const wordFreq = {};
    words.forEach(word => {
      if (word.length > 4 && !stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  extractEntities(content) {
    if (!content) return [];
    
    // Simple entity extraction (in real implementation, use NER)
    const patterns = {
      emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      urls: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
      dates: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g
    };
    
    const entities = [];
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({ type, value: match });
        });
      }
    }
    
    return entities;
  }

  extractKeywords(content) {
    if (!content) return [];
    
    // Extract potential keywords (proper nouns, technical terms)
    const words = content.split(/\s+/);
    const keywords = new Set();
    
    words.forEach((word, i) => {
      // Capitalized words (potential proper nouns)
      if (word.length > 3 && /^[A-Z]/.test(word)) {
        keywords.add(word);
      }
      
      // Technical terms (camelCase, snake_case)
      if (/[a-z][A-Z]/.test(word) || /_/.test(word)) {
        keywords.add(word);
      }
    });
    
    return Array.from(keywords).slice(0, 20);
  }

  generateSummary(content) {
    if (!content) return '';
    
    // Simple summary: first 200 characters
    return content.substring(0, 200).trim() + (content.length > 200 ? '...' : '');
  }

  determineWorkflowStage(file) {
    if (!file.analysis?.status || file.analysis.status === 'pending') {
      return 'discovery';
    }
    if (file.analysis.status === 'completed' && !file.categories.length) {
      return 'analysis';
    }
    if (file.categories.length > 0) {
      return 'organization';
    }
    return 'ready';
  }

  calculatePriority(file) {
    let priority = 0;
    
    // Higher relevance = higher priority
    priority += file.relevance?.score || 0;
    
    // Recent files = higher priority
    const age = Date.now() - new Date(file.modified).getTime();
    const daysSinceModified = age / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) priority += 20;
    else if (daysSinceModified < 30) priority += 10;
    
    // Larger files might be more important
    if (file.size > 1048576) priority += 10; // > 1MB
    
    return Math.min(100, priority);
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }

  generateColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  selectIcon(name) {
    const iconMap = {
      'project': '📁',
      'personal': '👤',
      'work': '💼',
      'research': '🔬',
      'ideas': '💡',
      'notes': '📝',
      'todo': '✅',
      'reference': '📚'
    };
    
    const nameLower = name.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (nameLower.includes(key)) return icon;
    }
    
    return '📂';
  }

  extractInsights(analysis) {
    const insights = [];
    
    if (analysis.insights) {
      insights.push(...analysis.insights);
    }
    
    if (analysis.keyPoints) {
      insights.push(...analysis.keyPoints);
    }
    
    if (analysis.recommendations) {
      insights.push(...analysis.recommendations);
    }
    
    return insights;
  }

  generateSuggestedActions(analysis) {
    const actions = [];
    
    if (analysis.relevanceScore > 80) {
      actions.push({
        type: 'review',
        priority: 'high',
        description: 'High relevance file - review immediately'
      });
    }
    
    if (analysis.suggestedCategories?.length > 0) {
      actions.push({
        type: 'categorize',
        priority: 'medium',
        description: `Assign to categories: ${analysis.suggestedCategories.join(', ')}`
      });
    }
    
    if (analysis.entities?.length > 5) {
      actions.push({
        type: 'extract',
        priority: 'low',
        description: 'Extract entities for knowledge graph'
      });
    }
    
    return actions;
  }

  migrateProviders(v1Providers) {
    if (!v1Providers) return {};
    
    const v2Providers = {};
    
    for (const [key, config] of Object.entries(v1Providers)) {
      v2Providers[key] = {
        enabled: config.enabled !== false,
        apiKey: config.apiKey || config.api_key || '',
        endpoint: config.endpoint || config.url || '',
        model: config.model || config.defaultModel || '',
        maxTokens: config.maxTokens || config.max_tokens || 1000,
        temperature: config.temperature || 0.7,
        timeout: config.timeout || 30000,
        retryAttempts: config.retryAttempts || 3,
        rateLimit: config.rateLimit || {
          requests: 60,
          window: 60000 // 1 minute
        }
      };
    }
    
    return v2Providers;
  }
}