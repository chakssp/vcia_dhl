/**
 * V1 Service Adapters for V2 Integration
 * Provides compatibility layer for V1 services in V2
 */

export class V1ServiceAdapters {
  constructor() {
    this.adapters = new Map();
    this.initialized = false;
  }

  async initialize() {
    console.log('[V1Adapters] Initializing service adapters...');
    
    // Initialize all adapters
    this.adapters.set('discovery', new DiscoveryServiceAdapter());
    this.adapters.set('analysis', new AnalysisServiceAdapter());
    this.adapters.set('category', new CategoryServiceAdapter());
    this.adapters.set('export', new ExportServiceAdapter());
    this.adapters.set('filter', new FilterServiceAdapter());
    this.adapters.set('preview', new PreviewServiceAdapter());
    this.adapters.set('stats', new StatsServiceAdapter());
    this.adapters.set('workflow', new WorkflowServiceAdapter());
    
    // Initialize each adapter
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.initialize();
        console.log(`[V1Adapters] ${name} adapter initialized`);
      } catch (error) {
        console.error(`[V1Adapters] Failed to initialize ${name} adapter:`, error);
      }
    }
    
    this.initialized = true;
    return true;
  }

  get(serviceName) {
    return this.adapters.get(serviceName);
  }

  getAll() {
    return Array.from(this.adapters.entries());
  }
}

// Base adapter class
class BaseV1Adapter {
  constructor() {
    this.v1Component = null;
    this.v2API = null;
  }

  async initialize() {
    // Get V2 API reference
    if (window.KC) {
      this.v2API = window.KC.getAPI();
    }
    
    // Override in subclasses to load V1 component
    return true;
  }

  // Convert V1 data format to V2
  convertToV2(v1Data) {
    // Override in subclasses
    return v1Data;
  }

  // Convert V2 data format to V1
  convertToV1(v2Data) {
    // Override in subclasses
    return v2Data;
  }
}

// Discovery Service Adapter
class DiscoveryServiceAdapter extends BaseV1Adapter {
  async initialize() {
    await super.initialize();
    
    // Try to get V1 DiscoveryManager
    if (window.KC?.DiscoveryManager) {
      this.v1Component = window.KC.DiscoveryManager;
    }
    
    return true;
  }

  async discoverFiles(options = {}) {
    // Convert V2 options to V1 format
    const v1Options = {
      patterns: options.patterns || ['*.md', '*.txt', '*.doc', '*.docx'],
      excludePatterns: options.exclude || [],
      recursive: options.recursive !== false,
      maxDepth: options.maxDepth || 10,
      followSymlinks: options.followSymlinks || false
    };

    // Use V1 discovery if available
    if (this.v1Component?.discoverFiles) {
      const v1Files = await this.v1Component.discoverFiles(v1Options);
      return v1Files.map(file => this.convertToV2(file));
    }

    // Fallback to V2 native discovery
    if (this.v2API?.discoverFiles) {
      return await this.v2API.discoverFiles(options);
    }

    throw new Error('No discovery service available');
  }

  async selectDirectory() {
    // Use File System Access API
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'read'
      });
      
      return {
        handle,
        name: handle.name,
        kind: 'directory'
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  convertToV2(v1File) {
    return {
      id: v1File.id || this.generateId(),
      name: v1File.name,
      path: v1File.path,
      size: v1File.size || 0,
      type: v1File.type || this.getFileType(v1File.name),
      created: v1File.created || v1File.createdDate,
      modified: v1File.modified || v1File.modifiedDate,
      handle: v1File.handle,
      content: v1File.content,
      preview: v1File.preview,
      metadata: {
        v1Id: v1File.id,
        discovered: new Date().toISOString()
      }
    };
  }

  getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ext;
  }

  generateId() {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Analysis Service Adapter
class AnalysisServiceAdapter extends BaseV1Adapter {
  async initialize() {
    await super.initialize();
    
    // Try to get V1 AnalysisManager
    if (window.KC?.AnalysisManager) {
      this.v1Component = window.KC.AnalysisManager;
    }
    
    return true;
  }

  async analyzeFile(file, options = {}) {
    // Try V1 analysis first
    if (this.v1Component?.analyzeFile) {
      const v1Result = await this.v1Component.analyzeFile(file, options);
      return this.convertToV2(v1Result);
    }

    // Fallback to V2 API
    if (this.v2API?.analyzeFile) {
      return await this.v2API.analyzeFile(file, options);
    }

    // Manual analysis fallback
    return this.performBasicAnalysis(file);
  }

  async analyzeFiles(files, options = {}) {
    const results = [];
    
    // Process in batches
    const batchSize = options.batchSize || 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(file => this.analyzeFile(file, options))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  performBasicAnalysis(file) {
    const content = file.content || '';
    
    return {
      fileId: file.id,
      fileName: file.name,
      timestamp: new Date().toISOString(),
      provider: 'basic-analyzer',
      status: 'completed',
      results: {
        summary: content.substring(0, 200) + '...',
        wordCount: content.split(/\s+/).length,
        charCount: content.length,
        relevanceScore: this.calculateRelevance(content),
        topics: this.extractTopics(content),
        categories: this.suggestCategories(file)
      }
    };
  }

  calculateRelevance(content) {
    // Basic relevance calculation
    const keywords = ['important', 'critical', 'key', 'essential', 'significant'];
    let score = 0;
    
    keywords.forEach(keyword => {
      const matches = content.toLowerCase().match(new RegExp(keyword, 'g'));
      if (matches) {
        score += matches.length * 10;
      }
    });
    
    return Math.min(100, score);
  }

  extractTopics(content) {
    // Simple topic extraction
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = {};
    
    words.forEach(word => {
      if (word.length > 5) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  suggestCategories(file) {
    const categories = [];
    const nameLower = file.name.toLowerCase();
    
    if (nameLower.includes('project')) categories.push('Projects');
    if (nameLower.includes('note')) categories.push('Notes');
    if (nameLower.includes('todo')) categories.push('Tasks');
    if (nameLower.includes('doc')) categories.push('Documentation');
    
    return categories;
  }

  convertToV2(v1Analysis) {
    return {
      id: this.generateId(),
      fileId: v1Analysis.fileId,
      fileName: v1Analysis.fileName,
      timestamp: v1Analysis.timestamp || new Date().toISOString(),
      provider: v1Analysis.provider || 'v1-adapter',
      model: v1Analysis.model || 'unknown',
      status: v1Analysis.status || 'completed',
      results: {
        summary: v1Analysis.summary || v1Analysis.analysis || '',
        insights: v1Analysis.insights || [],
        categories: v1Analysis.categories || [],
        relevanceScore: v1Analysis.relevanceScore || 0,
        topics: v1Analysis.topics || [],
        entities: v1Analysis.entities || []
      },
      metadata: {
        v1Analysis: true,
        migrated: new Date().toISOString()
      }
    };
  }

  generateId() {
    return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Category Service Adapter
class CategoryServiceAdapter extends BaseV1Adapter {
  async initialize() {
    await super.initialize();
    
    // Try to get V1 CategoryManager
    if (window.KC?.CategoryManager) {
      this.v1Component = window.KC.CategoryManager;
    }
    
    // Load categories from storage if no V1 component
    if (!this.v1Component) {
      this.categories = this.loadCategoriesFromStorage();
    }
    
    return true;
  }

  loadCategoriesFromStorage() {
    const stored = localStorage.getItem('kc-categories');
    return stored ? JSON.parse(stored) : this.getDefaultCategories();
  }

  getDefaultCategories() {
    return [
      { name: 'Projects', color: '#4CAF50', icon: '📁' },
      { name: 'Personal', color: '#2196F3', icon: '👤' },
      { name: 'Work', color: '#FF9800', icon: '💼' },
      { name: 'Research', color: '#9C27B0', icon: '🔬' },
      { name: 'Ideas', color: '#FFEB3B', icon: '💡' },
      { name: 'Archive', color: '#607D8B', icon: '📦' }
    ];
  }

  getCategories() {
    if (this.v1Component?.getCategories) {
      return this.v1Component.getCategories();
    }
    
    return this.categories || this.loadCategoriesFromStorage();
  }

  addCategory(category) {
    if (this.v1Component?.addCategory) {
      return this.v1Component.addCategory(category);
    }
    
    // Manual implementation
    const categories = this.getCategories();
    const newCategory = {
      id: this.generateId(),
      name: category.name || category,
      color: category.color || this.generateColor(category.name || category),
      icon: category.icon || '📂',
      created: new Date().toISOString()
    };
    
    categories.push(newCategory);
    this.saveCategories(categories);
    
    return newCategory;
  }

  removeCategory(categoryId) {
    if (this.v1Component?.removeCategory) {
      return this.v1Component.removeCategory(categoryId);
    }
    
    // Manual implementation
    const categories = this.getCategories();
    const filtered = categories.filter(cat => 
      cat.id !== categoryId && cat.name !== categoryId
    );
    
    this.saveCategories(filtered);
    return true;
  }

  updateCategory(categoryId, updates) {
    const categories = this.getCategories();
    const index = categories.findIndex(cat => 
      cat.id === categoryId || cat.name === categoryId
    );
    
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      this.saveCategories(categories);
      return categories[index];
    }
    
    return null;
  }

  assignToFile(fileId, categoryIds) {
    // This would update the file's categories
    if (this.v2API?.updateFile) {
      return this.v2API.updateFile(fileId, {
        categories: categoryIds
      });
    }
    
    return true;
  }

  saveCategories(categories) {
    this.categories = categories;
    localStorage.setItem('kc-categories', JSON.stringify(categories));
    
    // Emit event for UI updates
    if (window.KC?.getEventBus) {
      window.KC.getEventBus().emit('categories:updated', { categories });
    }
  }

  generateId() {
    return `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
}

// Export Service Adapter
class ExportServiceAdapter extends BaseV1Adapter {
  async exportFiles(files, format, options = {}) {
    switch (format) {
      case 'json':
        return this.exportJSON(files, options);
      case 'markdown':
        return this.exportMarkdown(files, options);
      case 'csv':
        return this.exportCSV(files, options);
      case 'qdrant':
        return this.exportToQdrant(files, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  exportJSON(files, options) {
    const data = {
      version: '2.0.0',
      exported: new Date().toISOString(),
      files: files.map(file => this.prepareFileForExport(file, options))
    };
    
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, 'kc-export.json', 'application/json');
    
    return { success: true, format: 'json', count: files.length };
  }

  exportMarkdown(files, options) {
    let markdown = '# Knowledge Consolidator Export\n\n';
    markdown += `> Exported on ${new Date().toLocaleString()}\n\n`;
    
    files.forEach(file => {
      markdown += `## ${file.name}\n\n`;
      
      if (options.includeMetadata) {
        markdown += `- **Path**: ${file.path}\n`;
        markdown += `- **Size**: ${this.formatFileSize(file.size)}\n`;
        markdown += `- **Modified**: ${new Date(file.modified).toLocaleString()}\n`;
      }
      
      if (file.categories?.length > 0) {
        markdown += `- **Categories**: ${file.categories.join(', ')}\n`;
      }
      
      if (file.analysis?.results?.summary) {
        markdown += `\n### Summary\n${file.analysis.results.summary}\n`;
      }
      
      markdown += '\n---\n\n';
    });
    
    this.downloadFile(markdown, 'kc-export.md', 'text/markdown');
    
    return { success: true, format: 'markdown', count: files.length };
  }

  exportCSV(files, options) {
    const headers = ['Name', 'Path', 'Size', 'Modified', 'Categories', 'Relevance'];
    const rows = files.map(file => [
      file.name,
      file.path,
      file.size || 0,
      file.modified || '',
      (file.categories || []).join('; '),
      file.relevanceScore || 0
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    this.downloadFile(csv, 'kc-export.csv', 'text/csv');
    
    return { success: true, format: 'csv', count: files.length };
  }

  async exportToQdrant(files, options) {
    if (!this.v2API?.uploadToQdrant) {
      throw new Error('Qdrant export not available');
    }
    
    const results = await this.v2API.uploadToQdrant(
      options.collection || 'knowledge_consolidator',
      files,
      options
    );
    
    return { 
      success: true, 
      format: 'qdrant', 
      count: files.length,
      collection: options.collection,
      results
    };
  }

  prepareFileForExport(file, options) {
    const exportFile = {
      id: file.id,
      name: file.name,
      path: file.path
    };
    
    if (options.includeMetadata) {
      exportFile.metadata = {
        size: file.size,
        created: file.created,
        modified: file.modified,
        type: file.type
      };
    }
    
    if (options.includeContent && file.content) {
      exportFile.content = file.content;
    }
    
    if (options.includeAnalysis && file.analysis) {
      exportFile.analysis = file.analysis;
    }
    
    if (file.categories?.length > 0) {
      exportFile.categories = file.categories;
    }
    
    return exportFile;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}

// Filter Service Adapter
class FilterServiceAdapter extends BaseV1Adapter {
  async initialize() {
    await super.initialize();
    
    // Try to get V1 FilterManager
    if (window.KC?.FilterManager) {
      this.v1Component = window.KC.FilterManager;
    }
    
    return true;
  }

  applyFilters(files, filters) {
    let filtered = [...files];
    
    // Apply relevance filter
    if (filters.relevance > 0) {
      filtered = filtered.filter(file => 
        (file.relevanceScore || 0) >= filters.relevance
      );
    }
    
    // Apply date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const cutoff = this.getDateCutoff(filters.dateRange);
      filtered = filtered.filter(file => {
        const fileDate = new Date(file.modified || file.created);
        return fileDate >= cutoff;
      });
    }
    
    // Apply file type filter
    if (filters.fileTypes?.length > 0) {
      filtered = filtered.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return filters.fileTypes.includes(ext);
      });
    }
    
    // Apply category filter
    if (filters.categories?.length > 0) {
      filtered = filtered.filter(file => {
        return file.categories?.some(cat => 
          filters.categories.includes(cat)
        );
      });
    }
    
    // Apply analyzed filter
    if (filters.analyzed !== undefined) {
      filtered = filtered.filter(file => 
        file.analyzed === filters.analyzed
      );
    }
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(file => {
        return file.name.toLowerCase().includes(searchLower) ||
               file.content?.toLowerCase().includes(searchLower) ||
               file.preview?.toLowerCase().includes(searchLower);
      });
    }
    
    // Apply sorting
    filtered = this.sortFiles(filtered, filters.sortBy, filters.sortOrder);
    
    return filtered;
  }

  getDateCutoff(range) {
    const now = new Date();
    const cutoff = new Date();
    
    switch (range) {
      case '1d':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoff.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return cutoff;
  }

  sortFiles(files, sortBy = 'relevance', order = 'desc') {
    const sorted = [...files];
    
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.modified || a.created);
          bVal = new Date(b.modified || b.created);
          break;
        case 'size':
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case 'relevance':
        default:
          aVal = a.relevanceScore || 0;
          bVal = b.relevanceScore || 0;
      }
      
      if (order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  }

  getFilterPresets() {
    const stored = localStorage.getItem('kc-filter-presets');
    return stored ? JSON.parse(stored) : this.getDefaultPresets();
  }

  getDefaultPresets() {
    return [
      {
        id: 'high-relevance',
        name: 'High Relevance',
        filters: { relevance: 70, sortBy: 'relevance' }
      },
      {
        id: 'recent',
        name: 'Recent Files',
        filters: { dateRange: '7d', sortBy: 'date' }
      },
      {
        id: 'unanalyzed',
        name: 'Pending Analysis',
        filters: { analyzed: false, sortBy: 'date' }
      }
    ];
  }

  savePreset(name, filters) {
    const presets = this.getFilterPresets();
    const preset = {
      id: this.generateId(),
      name,
      filters,
      created: new Date().toISOString()
    };
    
    presets.push(preset);
    localStorage.setItem('kc-filter-presets', JSON.stringify(presets));
    
    return preset;
  }

  generateId() {
    return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Preview Service Adapter
class PreviewServiceAdapter extends BaseV1Adapter {
  async initialize() {
    await super.initialize();
    
    // Try to get V1 PreviewUtils
    if (window.KC?.PreviewUtils) {
      this.v1Component = window.KC.PreviewUtils;
    }
    
    return true;
  }

  generatePreview(content, options = {}) {
    if (this.v1Component?.generatePreview) {
      return this.v1Component.generatePreview(content, options);
    }
    
    // Fallback implementation
    return this.extractSmartPreview(content);
  }

  extractSmartPreview(content) {
    if (!content) return '';
    
    const segments = [];
    const lines = content.split('\n');
    
    // Segment 1: First 30 words
    const words = content.split(/\s+/).slice(0, 30);
    segments.push(words.join(' '));
    
    // Segment 2: Second paragraph
    let paragraphCount = 0;
    for (const line of lines) {
      if (line.trim() === '') {
        paragraphCount++;
      } else if (paragraphCount === 1) {
        segments.push(line);
        break;
      }
    }
    
    // Segment 3: First heading
    const headingMatch = content.match(/^#+\s+(.+)$/m);
    if (headingMatch) {
      segments.push(headingMatch[1]);
    }
    
    // Segment 4: Line with colon
    const colonMatch = content.match(/^(.+):(.+)$/m);
    if (colonMatch) {
      segments.push(colonMatch[0]);
    }
    
    // Segment 5: Last meaningful line
    const meaningfulLines = lines.filter(line => 
      line.trim().length > 20
    );
    if (meaningfulLines.length > 0) {
      segments.push(meaningfulLines[meaningfulLines.length - 1]);
    }
    
    return segments.filter(Boolean).join('\n...\n');
  }

  calculateRelevance(content, keywords = []) {
    if (!content) return 0;
    
    const defaultKeywords = [
      'important', 'critical', 'key', 'essential',
      'decision', 'insight', 'learning', 'breakthrough'
    ];
    
    const allKeywords = [...defaultKeywords, ...keywords];
    const contentLower = content.toLowerCase();
    
    let score = 0;
    allKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        score += matches.length * 10;
      }
    });
    
    // Bonus for structured content
    if (content.includes('#')) score += 10; // Has headings
    if (content.includes('- ')) score += 5; // Has lists
    if (content.includes('```')) score += 5; // Has code blocks
    
    return Math.min(100, score);
  }
}

// Stats Service Adapter
class StatsServiceAdapter extends BaseV1Adapter {
  calculateStats(files) {
    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      analyzedFiles: 0,
      categorizedFiles: 0,
      fileTypes: {},
      categories: {},
      relevanceDistribution: {
        high: 0,    // > 70
        medium: 0,  // 40-70
        low: 0      // < 40
      },
      dateDistribution: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        older: 0
      }
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);
    
    files.forEach(file => {
      // Basic stats
      stats.totalSize += file.size || 0;
      if (file.analyzed) stats.analyzedFiles++;
      if (file.categories?.length > 0) stats.categorizedFiles++;
      
      // File type distribution
      const ext = file.name.split('.').pop().toLowerCase();
      stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
      
      // Category distribution
      (file.categories || []).forEach(cat => {
        stats.categories[cat] = (stats.categories[cat] || 0) + 1;
      });
      
      // Relevance distribution
      const relevance = file.relevanceScore || 0;
      if (relevance > 70) stats.relevanceDistribution.high++;
      else if (relevance > 40) stats.relevanceDistribution.medium++;
      else stats.relevanceDistribution.low++;
      
      // Date distribution
      const fileDate = new Date(file.modified || file.created);
      if (fileDate >= today) stats.dateDistribution.today++;
      else if (fileDate >= weekAgo) stats.dateDistribution.thisWeek++;
      else if (fileDate >= monthAgo) stats.dateDistribution.thisMonth++;
      else stats.dateDistribution.older++;
    });
    
    // Calculate percentages
    stats.analyzedPercentage = files.length > 0 ? 
      Math.round((stats.analyzedFiles / files.length) * 100) : 0;
    
    stats.categorizedPercentage = files.length > 0 ?
      Math.round((stats.categorizedFiles / files.length) * 100) : 0;
    
    return stats;
  }

  generateReport(stats) {
    const report = [];
    
    report.push('# Knowledge Consolidator Statistics Report');
    report.push(`Generated on: ${new Date().toLocaleString()}\n`);
    
    report.push('## Overview');
    report.push(`- Total Files: ${stats.totalFiles}`);
    report.push(`- Total Size: ${this.formatFileSize(stats.totalSize)}`);
    report.push(`- Analyzed: ${stats.analyzedFiles} (${stats.analyzedPercentage}%)`);
    report.push(`- Categorized: ${stats.categorizedFiles} (${stats.categorizedPercentage}%)\n`);
    
    report.push('## File Type Distribution');
    Object.entries(stats.fileTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        report.push(`- .${type}: ${count} files`);
      });
    
    report.push('\n## Category Distribution');
    Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        report.push(`- ${cat}: ${count} files`);
      });
    
    report.push('\n## Relevance Distribution');
    report.push(`- High (>70): ${stats.relevanceDistribution.high} files`);
    report.push(`- Medium (40-70): ${stats.relevanceDistribution.medium} files`);
    report.push(`- Low (<40): ${stats.relevanceDistribution.low} files`);
    
    report.push('\n## Time Distribution');
    report.push(`- Today: ${stats.dateDistribution.today} files`);
    report.push(`- This Week: ${stats.dateDistribution.thisWeek} files`);
    report.push(`- This Month: ${stats.dateDistribution.thisMonth} files`);
    report.push(`- Older: ${stats.dateDistribution.older} files`);
    
    return report.join('\n');
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  }
}

// Workflow Service Adapter
class WorkflowServiceAdapter extends BaseV1Adapter {
  getCurrentStep() {
    // Try V1 WorkflowPanel
    if (window.KC?.WorkflowPanel?.getCurrentStep) {
      return window.KC.WorkflowPanel.getCurrentStep();
    }
    
    // Get from AppState
    if (window.KC?.AppState?.get) {
      return window.KC.AppState.get('currentStep') || 1;
    }
    
    // Get from localStorage
    const stored = localStorage.getItem('kc-current-step');
    return stored ? parseInt(stored) : 1;
  }

  setCurrentStep(step) {
    // Update V1 if available
    if (window.KC?.WorkflowPanel?.setCurrentStep) {
      window.KC.WorkflowPanel.setCurrentStep(step);
    }
    
    // Update AppState
    if (window.KC?.AppState?.set) {
      window.KC.AppState.set('currentStep', step);
    }
    
    // Update localStorage
    localStorage.setItem('kc-current-step', step.toString());
    
    // Emit event
    if (window.KC?.EventBus?.emit) {
      window.KC.EventBus.emit('workflow-step-changed', { step });
    }
  }

  getStepStatus() {
    const status = {
      discovery: {
        completed: false,
        filesCount: 0,
        inProgress: false
      },
      analysis: {
        completed: false,
        analyzedCount: 0,
        pendingCount: 0,
        inProgress: false
      },
      organization: {
        completed: false,
        categorizedCount: 0,
        inProgress: false
      },
      export: {
        completed: false,
        exportCount: 0,
        lastExport: null
      }
    };
    
    // Get files
    const files = window.KC?.AppState?.get('files') || [];
    
    // Discovery status
    status.discovery.filesCount = files.length;
    status.discovery.completed = files.length > 0;
    
    // Analysis status
    const analyzedFiles = files.filter(f => f.analyzed);
    status.analysis.analyzedCount = analyzedFiles.length;
    status.analysis.pendingCount = files.length - analyzedFiles.length;
    status.analysis.completed = analyzedFiles.length === files.length && files.length > 0;
    
    // Organization status
    const categorizedFiles = files.filter(f => f.categories?.length > 0);
    status.organization.categorizedCount = categorizedFiles.length;
    status.organization.completed = categorizedFiles.length > 0;
    
    // Export status
    const exportHistory = localStorage.getItem('kc-export-history');
    if (exportHistory) {
      const exports = JSON.parse(exportHistory);
      status.export.exportCount = exports.length;
      status.export.lastExport = exports[0]?.timestamp;
      status.export.completed = exports.length > 0;
    }
    
    return status;
  }

  canAdvanceToStep(targetStep) {
    const currentStep = this.getCurrentStep();
    const status = this.getStepStatus();
    
    // Can always go back
    if (targetStep <= currentStep) return true;
    
    // Check prerequisites
    switch (targetStep) {
      case 2: // Analysis
        return status.discovery.completed;
      case 3: // Organization
        return status.discovery.completed;
      case 4: // Export
        return status.discovery.completed;
      default:
        return false;
    }
  }

  getStepName(step) {
    const names = {
      1: 'Discovery',
      2: 'Analysis',
      3: 'Organization',
      4: 'Export'
    };
    return names[step] || 'Unknown';
  }

  getStepDescription(step) {
    const descriptions = {
      1: 'Discover and select files from your knowledge base',
      2: 'Analyze files with AI to extract insights',
      3: 'Organize files into categories',
      4: 'Export your consolidated knowledge'
    };
    return descriptions[step] || '';
  }
}