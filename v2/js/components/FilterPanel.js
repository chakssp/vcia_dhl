/**
 * FilterPanel.js - Filter UI Component for V2
 * 
 * Provides visual interface for the FilterManager
 * Displays filters as chips with real-time counts
 */

import filterManager from '../managers/FilterManager.js';
import eventBus from '../core/EventBus.js';

export class FilterPanel {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        
        console.log('[FilterPanel] Initialized');
    }

    /**
     * Initialize the filter panel
     */
    initialize(container) {
        console.log('[FilterPanel] Initializing with container:', container);
        this.container = container;
        this.render();
        this.attachEventListeners();
        this.isInitialized = true;
        
        // Load initial counts
        filterManager.initialize();
        console.log('[FilterPanel] Initialization complete');
    }

    /**
     * Render the filter panel
     */
    render() {
        console.log('[FilterPanel] Rendering...');
        if (!this.container) {
            console.error('[FilterPanel] No container to render into');
            return;
        }

        console.log('[FilterPanel] Rendering HTML into container');
        this.container.innerHTML = `
            <div class="filter-panel">
                <!-- Relevance Filters -->
                <div class="filter-section">
                    <h4 class="filter-section-title">Relevance</h4>
                    <div class="filter-chips">
                        ${this.renderRelevanceFilters()}
                    </div>
                </div>

                <!-- Status Filters -->
                <div class="filter-section">
                    <h4 class="filter-section-title">Status</h4>
                    <div class="filter-chips">
                        ${this.renderStatusFilters()}
                    </div>
                </div>

                <!-- Time Range Filters -->
                <div class="filter-section">
                    <h4 class="filter-section-title">Time Range</h4>
                    <div class="filter-chips">
                        ${this.renderTimeFilters()}
                    </div>
                </div>

                <!-- Size Filters -->
                <div class="filter-section">
                    <h4 class="filter-section-title">File Size</h4>
                    <div class="filter-chips">
                        ${this.renderSizeFilters()}
                    </div>
                </div>

                <!-- Type Filters -->
                <div class="filter-section">
                    <h4 class="filter-section-title">File Type</h4>
                    <div class="filter-chips">
                        ${this.renderTypeFilters()}
                    </div>
                </div>

                <!-- Advanced Options -->
                <div class="filter-section">
                    <h4 class="filter-section-title">Advanced</h4>
                    <div class="filter-advanced">
                        <div class="filter-input-group">
                            <label>Semantic Keywords:</label>
                            <input type="text" id="semantic-keywords" class="filter-input" placeholder="Enter keywords separated by commas">
                        </div>
                        <div class="filter-input-group">
                            <label>Algorithm:</label>
                            <select id="relevance-algorithm" class="filter-select">
                                <option value="linear">Linear</option>
                                <option value="exponential">Exponential</option>
                                <option value="logarithmic">Logarithmic</option>
                            </select>
                        </div>
                        <button class="btn btn-small btn-primary" id="apply-semantic">Apply Semantic Config</button>
                        <button class="btn btn-small btn-secondary" id="reset-filters">Reset All Filters</button>
                    </div>
                </div>
            </div>
        `;
        console.log('[FilterPanel] Render complete');
    }

    /**
     * Render relevance filter chips
     */
    renderRelevanceFilters() {
        const filters = filterManager.filters.relevance;
        const labels = {
            all: 'All',
            high: 'High (≥70%)',
            medium: 'Medium (50-69%)',
            low: 'Low (30-49%)'
        };

        return Object.entries(filters).map(([key, filter]) => `
            <div class="filter-chip ${filter.active ? 'active' : ''}" 
                 data-filter-type="relevance" 
                 data-filter-value="${key}">
                <span class="chip-label">${labels[key]}</span>
                <span class="chip-count">${filter.count}</span>
            </div>
        `).join('');
    }

    /**
     * Render status filter chips
     */
    renderStatusFilters() {
        const filters = filterManager.filters.status;
        const labels = {
            all: 'All',
            pending: 'Pending',
            analyzed: 'Analyzed',
            archived: 'Archived'
        };

        return Object.entries(filters).map(([key, filter]) => `
            <div class="filter-chip ${filter.active ? 'active' : ''}" 
                 data-filter-type="status" 
                 data-filter-value="${key}">
                <span class="chip-label">${labels[key]}</span>
                <span class="chip-count">${filter.count}</span>
            </div>
        `).join('');
    }

    /**
     * Render time filter chips
     */
    renderTimeFilters() {
        const filters = filterManager.filters.timeRange;
        const labels = {
            all: 'All Time',
            '1m': '1 Month',
            '3m': '3 Months',
            '6m': '6 Months',
            '1y': '1 Year',
            '2y': '2 Years'
        };

        return Object.entries(filters).map(([key, filter]) => `
            <div class="filter-chip ${filter.active ? 'active' : ''}" 
                 data-filter-type="timeRange" 
                 data-filter-value="${key}">
                <span class="chip-label">${labels[key]}</span>
                <span class="chip-count">${filter.count}</span>
            </div>
        `).join('');
    }

    /**
     * Render size filter chips
     */
    renderSizeFilters() {
        const filters = filterManager.filters.size;
        const labels = {
            all: 'All Sizes',
            small: '<50KB',
            medium: '50-500KB',
            large: '>500KB'
        };

        return Object.entries(filters).map(([key, filter]) => `
            <div class="filter-chip ${filter.active ? 'active' : ''}" 
                 data-filter-type="size" 
                 data-filter-value="${key}">
                <span class="chip-label">${labels[key]}</span>
                <span class="chip-count">${filter.count}</span>
            </div>
        `).join('');
    }

    /**
     * Render type filter chips
     */
    renderTypeFilters() {
        const filters = filterManager.filters.fileType;
        const labels = {
            all: 'All Types',
            md: 'Markdown',
            txt: 'Text',
            docx: 'Word',
            pdf: 'PDF'
        };

        return Object.entries(filters).map(([key, filter]) => `
            <div class="filter-chip ${filter.active ? 'active' : ''}" 
                 data-filter-type="fileType" 
                 data-filter-value="${key}">
                <span class="chip-label">${labels[key]}</span>
                <span class="chip-count">${filter.count}</span>
            </div>
        `).join('');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Filter chip clicks
        this.container.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (chip) {
                const filterType = chip.dataset.filterType;
                const filterValue = chip.dataset.filterValue;
                this.handleFilterClick(filterType, filterValue);
            }
        });

        // Apply semantic config
        const applySemanticBtn = this.container.querySelector('#apply-semantic');
        if (applySemanticBtn) {
            applySemanticBtn.addEventListener('click', () => this.applySemanticConfig());
        }

        // Reset filters
        const resetBtn = this.container.querySelector('#reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }

        // Listen for filter updates
        eventBus.on('filters:countsUpdated', () => this.updateCounts());
        eventBus.on('filters:changed', () => this.updateActiveStates());
    }

    /**
     * Handle filter chip click
     */
    handleFilterClick(filterType, filterValue) {
        filterManager.setActiveFilter(filterType, filterValue);
        this.updateActiveStates();
        
        // Trigger file list update
        const parent = this.container.closest('.view');
        if (parent && parent.querySelector('#discovered-files')) {
            // Re-render file list with filters applied
            if (window._discoveryView) {
                window._discoveryView.updateFileList();
            }
        }
    }

    /**
     * Apply semantic configuration
     */
    applySemanticConfig() {
        const keywordsInput = this.container.querySelector('#semantic-keywords');
        const algorithmSelect = this.container.querySelector('#relevance-algorithm');
        
        if (!keywordsInput || !algorithmSelect) return;

        const keywords = keywordsInput.value
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        const config = {
            keywords,
            algorithm: algorithmSelect.value
        };

        filterManager.setSemanticConfig(config);
        
        // Show feedback
        this.showNotification('Semantic configuration applied', 'success');
    }

    /**
     * Reset all filters
     */
    resetFilters() {
        filterManager.resetFilters();
        this.updateActiveStates();
        
        // Clear semantic inputs
        const keywordsInput = this.container.querySelector('#semantic-keywords');
        const algorithmSelect = this.container.querySelector('#relevance-algorithm');
        
        if (keywordsInput) keywordsInput.value = '';
        if (algorithmSelect) algorithmSelect.value = 'linear';
        
        // Trigger file list update
        if (window._discoveryView) {
            window._discoveryView.updateFileList();
        }
        
        this.showNotification('All filters reset', 'info');
    }

    /**
     * Update filter counts in UI
     */
    updateCounts() {
        const filters = filterManager.filters;
        
        // Update all chip counts
        this.container.querySelectorAll('.filter-chip').forEach(chip => {
            const filterType = chip.dataset.filterType;
            const filterValue = chip.dataset.filterValue;
            
            if (filters[filterType] && filters[filterType][filterValue]) {
                const count = filters[filterType][filterValue].count;
                const countElement = chip.querySelector('.chip-count');
                if (countElement) {
                    countElement.textContent = count;
                }
            }
        });
    }

    /**
     * Update active states in UI
     */
    updateActiveStates() {
        const filters = filterManager.filters;
        
        // Update all chip active states
        this.container.querySelectorAll('.filter-chip').forEach(chip => {
            const filterType = chip.dataset.filterType;
            const filterValue = chip.dataset.filterValue;
            
            if (filters[filterType] && filters[filterType][filterValue]) {
                const isActive = filters[filterType][filterValue].active;
                chip.classList.toggle('active', isActive);
            }
        });
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`[FilterPanel] ${type}: ${message}`);
        eventBus.emit('status:message', { message, type });
    }

    /**
     * Get applied filters for file list
     */
    getAppliedFilters() {
        return filterManager.getActiveFilters();
    }

    /**
     * Apply filters to file list
     */
    applyFiltersToFiles(files) {
        return filterManager.filterFiles(files);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.container = null;
        this.isInitialized = false;
    }
}

export default FilterPanel;