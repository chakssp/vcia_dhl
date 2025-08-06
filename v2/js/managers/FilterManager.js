/**
 * FilterManager.js - Advanced Filtering System for V2
 * 
 * Manages dynamic filters with real-time counters
 * Migrated from V1 to work with V2 architecture
 */

import appState from '../core/AppState.js';
import eventBus, { Events } from '../core/EventBus.js';
import { fileUtils } from '../utils/FileUtils.js';

export class FilterManager {
    constructor() {
        this.filters = {
            // Relevance filters
            relevance: {
                all: { active: true, threshold: 0, count: 0 },
                high: { active: false, threshold: 70, count: 0 },
                medium: { active: false, threshold: 50, count: 0 },
                low: { active: false, threshold: 30, count: 0 }
            },
            
            // Status filters
            status: {
                all: { active: true, count: 0 },
                pending: { active: false, count: 0 },
                analyzed: { active: false, count: 0 },
                archived: { active: false, count: 0 }
            },
            
            // Time range filters
            timeRange: {
                all: { active: true, months: null, count: 0 },
                '1m': { active: false, months: 1, count: 0 },
                '3m': { active: false, months: 3, count: 0 },
                '6m': { active: false, months: 6, count: 0 },
                '1y': { active: false, months: 12, count: 0 },
                '2y': { active: false, months: 24, count: 0 }
            },
            
            // Size filters
            size: {
                all: { active: true, min: 0, max: Infinity, count: 0 },
                small: { active: false, min: 0, max: 51200, count: 0 }, // <50KB
                medium: { active: false, min: 51200, max: 512000, count: 0 }, // 50-500KB
                large: { active: false, min: 512000, max: Infinity, count: 0 } // >500KB
            },
            
            // File type filters
            fileType: {
                all: { active: true, extensions: [], count: 0 },
                md: { active: false, extensions: ['.md'], count: 0 },
                txt: { active: false, extensions: ['.txt'], count: 0 },
                docx: { active: false, extensions: ['.docx'], count: 0 },
                pdf: { active: false, extensions: ['.pdf'], count: 0 }
            }
        };
        
        // Algorithm configuration
        this.algorithm = 'linear'; // linear, exponential, logarithmic
        this.semanticKeywords = [];
        this.semanticConfig = null;
        
        // Cache for performance
        this.cache = new Map();
        this.lastCalculation = null;
        
        console.log('[FilterManager] Initialized');
    }

    /**
     * Initialize the FilterManager
     */
    initialize() {
        console.log('[FilterManager] Setting up event listeners');
        this.setupEventListeners();
        this.loadSavedFilters();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for file changes
        eventBus.on('discovery:completed', (data) => {
            if (data.files) {
                this.updateAllCounts(data.files);
            }
        });

        eventBus.on('state:changed', ({ key, newValue }) => {
            if (key === 'files' || key === 'discoveredFiles') {
                this.updateAllCounts(newValue || []);
            }
        });

        eventBus.on('files:analyzed', (data) => {
            const files = appState.get('files') || appState.get('discoveredFiles') || [];
            this.updateAllCounts(files);
        });
    }

    /**
     * Apply filters to a file list
     */
    filterFiles(files) {
        if (!files || files.length === 0) {
            return [];
        }

        let filteredFiles = [...files];

        // Apply relevance filter
        filteredFiles = this.applyRelevanceFilter(filteredFiles);
        
        // Apply status filter
        filteredFiles = this.applyStatusFilter(filteredFiles);
        
        // Apply time filter
        filteredFiles = this.applyTimeFilter(filteredFiles);
        
        // Apply size filter
        filteredFiles = this.applySizeFilter(filteredFiles);
        
        // Apply type filter
        filteredFiles = this.applyTypeFilter(filteredFiles);

        console.log(`[FilterManager] Filtered ${files.length} → ${filteredFiles.length} files`);
        return filteredFiles;
    }

    /**
     * Apply relevance filter
     */
    applyRelevanceFilter(files) {
        const activeFilter = Object.entries(this.filters.relevance)
            .find(([key, filter]) => filter.active);

        if (!activeFilter || activeFilter[0] === 'all') {
            return files;
        }

        return files.filter(file => {
            const relevance = this.calculateRelevance(file);
            
            switch (activeFilter[0]) {
                case 'high':
                    return relevance >= 70;
                case 'medium':
                    return relevance >= 50 && relevance < 70;
                case 'low':
                    return relevance >= 30 && relevance < 50;
                default:
                    return true;
            }
        });
    }

    /**
     * Apply status filter
     */
    applyStatusFilter(files) {
        const activeFilter = Object.entries(this.filters.status)
            .find(([key, filter]) => filter.active);

        if (!activeFilter || activeFilter[0] === 'all') {
            return files;
        }

        return files.filter(file => {
            switch (activeFilter[0]) {
                case 'pending':
                    return !file.analyzed && !file.archived;
                case 'analyzed':
                    return file.analyzed && !file.archived;
                case 'archived':
                    return file.archived;
                default:
                    return true;
            }
        });
    }

    /**
     * Apply time filter
     */
    applyTimeFilter(files) {
        const activeFilter = Object.entries(this.filters.timeRange)
            .find(([key, filter]) => filter.active);

        if (!activeFilter || activeFilter[0] === 'all') {
            return files;
        }

        const months = activeFilter[1].months;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);

        return files.filter(file => {
            const fileDate = new Date(file.lastModified || file.dateCreated || 0);
            return fileDate >= cutoffDate;
        });
    }

    /**
     * Apply size filter
     */
    applySizeFilter(files) {
        const activeFilter = Object.entries(this.filters.size)
            .find(([key, filter]) => filter.active);

        if (!activeFilter || activeFilter[0] === 'all') {
            return files;
        }

        const { min, max } = activeFilter[1];
        return files.filter(file => {
            const size = file.size || 0;
            return size >= min && size < max;
        });
    }

    /**
     * Apply type filter
     */
    applyTypeFilter(files) {
        const activeFilter = Object.entries(this.filters.fileType)
            .find(([key, filter]) => filter.active);

        if (!activeFilter || activeFilter[0] === 'all') {
            return files;
        }

        const extensions = activeFilter[1].extensions;
        return files.filter(file => {
            const fileName = file.name || '';
            return extensions.some(ext => fileName.toLowerCase().endsWith(ext));
        });
    }

    /**
     * Calculate relevance score for a file
     */
    calculateRelevance(file) {
        // Use cached score if available
        if (file.relevanceScore !== undefined) {
            return Math.round(file.relevanceScore * 100);
        }

        // Calculate based on keywords
        let score = 30; // Base score
        
        const fileName = (file.name || '').toLowerCase();
        const content = (file.content || file.preview || '').toLowerCase();
        
        // Default keywords from PRD
        const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
        const userKeywords = this.semanticKeywords || [];
        const allKeywords = [...keywords, ...userKeywords];
        
        // Score for keywords in filename
        allKeywords.forEach(keyword => {
            if (fileName.includes(keyword.toLowerCase())) {
                score += 15;
            }
        });
        
        // Score for keywords in content
        allKeywords.forEach(keyword => {
            if (content.includes(keyword.toLowerCase())) {
                score += 10;
            }
        });
        
        // Score for file size (larger files may have more content)
        if (file.size > 5120) score += 5; // >5KB
        if (file.size > 51200) score += 10; // >50KB
        
        // Apply algorithm
        switch (this.algorithm) {
            case 'exponential':
                score = Math.pow(score / 100, 0.7) * 100;
                break;
            case 'logarithmic':
                score = Math.log(score + 1) / Math.log(101) * 100;
                break;
            // linear is default
        }
        
        return Math.min(Math.max(Math.round(score), 0), 100);
    }

    /**
     * Update all filter counts
     */
    updateAllCounts(files) {
        if (!files || files.length === 0) {
            this.clearAllCounts();
            return;
        }

        // Update relevance counts
        this.filters.relevance.all.count = files.length;
        this.filters.relevance.high.count = files.filter(f => this.calculateRelevance(f) >= 70).length;
        this.filters.relevance.medium.count = files.filter(f => {
            const rel = this.calculateRelevance(f);
            return rel >= 50 && rel < 70;
        }).length;
        this.filters.relevance.low.count = files.filter(f => {
            const rel = this.calculateRelevance(f);
            return rel >= 30 && rel < 50;
        }).length;

        // Update status counts
        this.filters.status.all.count = files.length;
        this.filters.status.pending.count = files.filter(f => !f.analyzed && !f.archived).length;
        this.filters.status.analyzed.count = files.filter(f => f.analyzed && !f.archived).length;
        this.filters.status.archived.count = files.filter(f => f.archived).length;

        // Update time counts
        this.updateTimeCounts(files);
        
        // Update size counts
        this.updateSizeCounts(files);
        
        // Update type counts
        this.updateTypeCounts(files);

        // Emit event for UI update
        eventBus.emit('filters:countsUpdated', this.filters);
    }

    /**
     * Update time-based counts
     */
    updateTimeCounts(files) {
        const now = new Date();
        Object.entries(this.filters.timeRange).forEach(([key, filter]) => {
            if (key === 'all') {
                filter.count = files.length;
            } else if (filter.months) {
                const cutoff = new Date(now.getTime() - (filter.months * 30 * 24 * 60 * 60 * 1000));
                filter.count = files.filter(f => {
                    const fileDate = new Date(f.lastModified || f.dateCreated || 0);
                    return fileDate > cutoff;
                }).length;
            }
        });
    }

    /**
     * Update size-based counts
     */
    updateSizeCounts(files) {
        Object.entries(this.filters.size).forEach(([key, filter]) => {
            if (key === 'all') {
                filter.count = files.length;
            } else {
                filter.count = files.filter(f => {
                    const size = f.size || 0;
                    return size >= filter.min && size < filter.max;
                }).length;
            }
        });
    }

    /**
     * Update type-based counts
     */
    updateTypeCounts(files) {
        Object.entries(this.filters.fileType).forEach(([key, filter]) => {
            if (key === 'all') {
                filter.count = files.length;
            } else {
                filter.count = files.filter(f => {
                    const fileName = f.name || '';
                    return filter.extensions.some(ext => fileName.toLowerCase().endsWith(ext));
                }).length;
            }
        });
    }

    /**
     * Clear all counts
     */
    clearAllCounts() {
        Object.values(this.filters).forEach(filterGroup => {
            Object.values(filterGroup).forEach(filter => {
                filter.count = 0;
            });
        });
        eventBus.emit('filters:countsUpdated', this.filters);
    }

    /**
     * Set active filter
     */
    setActiveFilter(filterType, filterValue) {
        if (!this.filters[filterType] || !this.filters[filterType][filterValue]) {
            console.warn(`[FilterManager] Invalid filter: ${filterType}.${filterValue}`);
            return;
        }

        // Deactivate all filters in the group
        Object.keys(this.filters[filterType]).forEach(key => {
            this.filters[filterType][key].active = false;
        });

        // Activate selected filter
        this.filters[filterType][filterValue].active = true;

        // Save state
        this.saveFiltersState();

        // Emit event
        eventBus.emit('filters:changed', {
            filterType,
            filterValue,
            filters: this.getActiveFilters()
        });

        console.log(`[FilterManager] Set filter ${filterType}.${filterValue}`);
    }

    /**
     * Get active filters
     */
    getActiveFilters() {
        const active = {};
        
        Object.entries(this.filters).forEach(([groupName, group]) => {
            const activeFilter = Object.entries(group).find(([key, filter]) => filter.active);
            if (activeFilter) {
                active[groupName] = activeFilter[0];
            }
        });
        
        return active;
    }

    /**
     * Reset all filters to defaults
     */
    resetFilters() {
        Object.values(this.filters).forEach(filterGroup => {
            Object.entries(filterGroup).forEach(([key, filter]) => {
                filter.active = (key === 'all');
            });
        });

        this.saveFiltersState();
        eventBus.emit('filters:reset', {});
    }

    /**
     * Set semantic configuration
     */
    setSemanticConfig(config) {
        this.semanticConfig = config;
        this.semanticKeywords = config.keywords || [];
        this.algorithm = config.algorithm || 'linear';
        
        // Clear cache as relevance calculations will change
        this.cache.clear();
        
        // Recalculate counts
        const files = appState.get('files') || appState.get('discoveredFiles') || [];
        if (files.length > 0) {
            this.updateAllCounts(files);
        }
        
        console.log('[FilterManager] Semantic config updated:', config);
    }

    /**
     * Save filter state
     */
    saveFiltersState() {
        appState.set('filters', {
            active: this.getActiveFilters(),
            semantic: {
                keywords: this.semanticKeywords,
                algorithm: this.algorithm,
                config: this.semanticConfig
            }
        });
    }

    /**
     * Load saved filters
     */
    loadSavedFilters() {
        const saved = appState.get('filters');
        if (!saved || !saved.active) return;

        // Restore active filters
        Object.entries(saved.active).forEach(([filterType, filterValue]) => {
            if (this.filters[filterType] && this.filters[filterType][filterValue]) {
                Object.keys(this.filters[filterType]).forEach(key => {
                    this.filters[filterType][key].active = (key === filterValue);
                });
            }
        });

        // Restore semantic config
        if (saved.semantic) {
            this.setSemanticConfig(saved.semantic);
        }

        console.log('[FilterManager] Loaded saved filters');
    }

    /**
     * Get filter statistics
     */
    getStats() {
        return {
            filters: this.filters,
            active: this.getActiveFilters(),
            semantic: {
                keywords: this.semanticKeywords,
                algorithm: this.algorithm,
                config: this.semanticConfig
            },
            performance: {
                lastCalculation: this.lastCalculation,
                cacheSize: this.cache.size
            }
        };
    }

    /**
     * Export configuration
     */
    exportConfig() {
        return {
            version: '2.0',
            filters: this.getActiveFilters(),
            semantic: this.semanticConfig,
            algorithm: this.algorithm,
            keywords: this.semanticKeywords
        };
    }

    /**
     * Import configuration
     */
    importConfig(config) {
        if (!config || config.version !== '2.0') {
            console.error('[FilterManager] Invalid config format');
            return false;
        }

        // Apply filters
        if (config.filters) {
            Object.entries(config.filters).forEach(([filterType, filterValue]) => {
                this.setActiveFilter(filterType, filterValue);
            });
        }

        // Apply semantic config
        if (config.semantic || config.keywords) {
            this.setSemanticConfig({
                keywords: config.keywords || [],
                algorithm: config.algorithm || 'linear',
                ...config.semantic
            });
        }

        return true;
    }
}

// Create singleton instance
const filterManager = new FilterManager();

export default filterManager;