/**
 * FlagList.js - List component for displaying feature flags
 * 
 * Features:
 * - Virtual scrolling for performance
 * - Bulk actions support
 * - Responsive grid/list view toggle
 * - Real-time updates
 * 
 * @module FlagList
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class FlagList {
        constructor(options = {}) {
            this.container = null;
            this.flags = new Map();
            this.selectedFlags = new Set();
            this.viewMode = options.viewMode || 'grid'; // 'grid' or 'list'
            this.itemsPerPage = options.itemsPerPage || 20;
            this.currentPage = 1;
            this.onFlagClick = options.onFlagClick || null;
            this.onFlagToggle = options.onFlagToggle || null;
            this.onFlagEdit = options.onFlagEdit || null;
            this.onFlagDelete = options.onFlagDelete || null;
            
            // Virtual scrolling
            this.virtualScroll = {
                enabled: options.virtualScroll !== false,
                itemHeight: 120, // Height of each flag card
                visibleItems: 10,
                scrollTop: 0
            };
        }

        /**
         * Mount component to container
         * @param {HTMLElement} container - Container element
         */
        mount(container) {
            this.container = container;
            this.render();
        }

        /**
         * Update flags data
         * @param {Map|Array} flags - Flags data
         */
        updateFlags(flags) {
            if (Array.isArray(flags)) {
                this.flags = new Map(flags);
            } else if (flags instanceof Map) {
                this.flags = new Map(flags);
            } else {
                this.flags = new Map(Object.entries(flags));
            }
            
            this.render();
        }

        /**
         * Render the flag list
         */
        render() {
            if (!this.container) return;

            const flagsArray = Array.from(this.flags.entries());
            const totalPages = Math.ceil(flagsArray.length / this.itemsPerPage);

            this.container.innerHTML = `
                <div class="flag-list-wrapper">
                    <div class="list-controls">
                        <div class="bulk-actions ${this.selectedFlags.size === 0 ? 'hidden' : ''}">
                            <span class="selected-count">${this.selectedFlags.size} selected</span>
                            <button class="btn btn-sm" id="bulk-enable">Enable</button>
                            <button class="btn btn-sm" id="bulk-disable">Disable</button>
                            <button class="btn btn-sm btn-danger" id="bulk-delete">Delete</button>
                            <button class="btn btn-sm btn-secondary" id="clear-selection">Clear</button>
                        </div>

                        <div class="view-controls">
                            <button class="btn-icon ${this.viewMode === 'grid' ? 'active' : ''}" 
                                    id="view-grid" title="Grid view">
                                <i class="icon-grid"></i>
                            </button>
                            <button class="btn-icon ${this.viewMode === 'list' ? 'active' : ''}" 
                                    id="view-list" title="List view">
                                <i class="icon-list"></i>
                            </button>
                        </div>
                    </div>

                    <div class="flag-list ${this.viewMode}" id="flag-list-container">
                        ${this._renderFlags(flagsArray)}
                    </div>

                    ${totalPages > 1 ? this._renderPagination(totalPages) : ''}
                </div>
            `;

            this._attachEventHandlers();
        }

        /**
         * Render flags based on current page and view mode
         * @param {Array} flagsArray - Array of [key, flag] entries
         * @returns {string} HTML
         */
        _renderFlags(flagsArray) {
            if (flagsArray.length === 0) {
                return `
                    <div class="empty-state">
                        <i class="icon-flag-empty"></i>
                        <h3>No flags to display</h3>
                        <p>Create your first feature flag to get started.</p>
                    </div>
                `;
            }

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageFlags = flagsArray.slice(startIndex, endIndex);

            if (this.viewMode === 'grid') {
                return pageFlags.map(([key, flag]) => this._renderGridItem(key, flag)).join('');
            } else {
                return `
                    <table class="flag-list-table">
                        <thead>
                            <tr>
                                <th class="checkbox-col">
                                    <input type="checkbox" id="select-all" />
                                </th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Environment</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageFlags.map(([key, flag]) => this._renderListItem(key, flag)).join('')}
                        </tbody>
                    </table>
                `;
            }
        }

        /**
         * Render grid view item
         * @param {string} key - Flag key
         * @param {Object} flag - Flag data
         * @returns {string} HTML
         */
        _renderGridItem(key, flag) {
            const isSelected = this.selectedFlags.has(key);
            const statusClass = flag.enabled ? 'enabled' : 'disabled';

            return `
                <div class="flag-grid-item ${statusClass} ${isSelected ? 'selected' : ''}" 
                     data-flag-key="${key}">
                    <div class="flag-selection">
                        <input type="checkbox" class="flag-checkbox" 
                               ${isSelected ? 'checked' : ''} />
                    </div>

                    <div class="flag-content">
                        <div class="flag-header">
                            <h4 class="flag-name">${key}</h4>
                            <span class="flag-type-badge">${flag.type}</span>
                        </div>

                        <p class="flag-description">
                            ${flag.description || 'No description'}
                        </p>

                        <div class="flag-meta">
                            <span class="flag-status ${statusClass}">
                                <i class="icon-circle"></i>
                                ${flag.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            ${flag.environments ? `
                                <span class="flag-env">
                                    <i class="icon-environment"></i>
                                    ${flag.environments.join(', ')}
                                </span>
                            ` : ''}
                        </div>

                        ${this._renderFlagTypeInfo(flag)}
                    </div>

                    <div class="flag-actions">
                        <button class="btn-icon flag-toggle" title="Toggle">
                            <i class="icon-toggle-${flag.enabled ? 'on' : 'off'}"></i>
                        </button>
                        <button class="btn-icon flag-edit" title="Edit">
                            <i class="icon-edit"></i>
                        </button>
                        <button class="btn-icon flag-delete" title="Delete">
                            <i class="icon-delete"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        /**
         * Render list view item
         * @param {string} key - Flag key
         * @param {Object} flag - Flag data
         * @returns {string} HTML
         */
        _renderListItem(key, flag) {
            const isSelected = this.selectedFlags.has(key);
            const statusClass = flag.enabled ? 'enabled' : 'disabled';

            return `
                <tr class="flag-list-item ${isSelected ? 'selected' : ''}" 
                    data-flag-key="${key}">
                    <td class="checkbox-col">
                        <input type="checkbox" class="flag-checkbox" 
                               ${isSelected ? 'checked' : ''} />
                    </td>
                    <td class="flag-name-col">
                        <div class="flag-name-wrapper">
                            <strong>${key}</strong>
                            ${flag.description ? `
                                <small>${flag.description}</small>
                            ` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="flag-type-badge">${flag.type}</span>
                    </td>
                    <td>
                        <span class="flag-status ${statusClass}">
                            <i class="icon-circle"></i>
                            ${flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </td>
                    <td>
                        ${flag.environments ? flag.environments.join(', ') : 'All'}
                    </td>
                    <td>
                        ${flag.updated ? this._formatDate(flag.updated) : 'N/A'}
                    </td>
                    <td class="action-col">
                        <button class="btn-icon flag-toggle" title="Toggle">
                            <i class="icon-toggle-${flag.enabled ? 'on' : 'off'}"></i>
                        </button>
                        <button class="btn-icon flag-edit" title="Edit">
                            <i class="icon-edit"></i>
                        </button>
                        <button class="btn-icon flag-delete" title="Delete">
                            <i class="icon-delete"></i>
                        </button>
                    </td>
                </tr>
            `;
        }

        /**
         * Render flag type-specific information
         * @param {Object} flag - Flag data
         * @returns {string} HTML
         */
        _renderFlagTypeInfo(flag) {
            switch (flag.type) {
                case 'percentage':
                    return `
                        <div class="flag-type-info">
                            <div class="rollout-mini">
                                <div class="rollout-bar">
                                    <div class="rollout-progress" style="width: ${flag.percentage}%"></div>
                                </div>
                                <span class="rollout-text">${flag.percentage}%</span>
                            </div>
                        </div>
                    `;

                case 'targeting':
                    const ruleCount = flag.rules ? flag.rules.length : 0;
                    return `
                        <div class="flag-type-info">
                            <span class="info-text">
                                <i class="icon-target"></i>
                                ${ruleCount} rule${ruleCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    `;

                case 'variant':
                    const variantCount = flag.variants ? flag.variants.length : 0;
                    return `
                        <div class="flag-type-info">
                            <span class="info-text">
                                <i class="icon-ab-test"></i>
                                ${variantCount} variant${variantCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    `;

                default:
                    return '';
            }
        }

        /**
         * Render pagination controls
         * @param {number} totalPages - Total number of pages
         * @returns {string} HTML
         */
        _renderPagination(totalPages) {
            const pages = [];
            const maxVisible = 5;
            const halfVisible = Math.floor(maxVisible / 2);

            let startPage = Math.max(1, this.currentPage - halfVisible);
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);

            if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }

            // First page
            if (startPage > 1) {
                pages.push(`
                    <button class="page-btn" data-page="1">1</button>
                    ${startPage > 2 ? '<span class="page-ellipsis">...</span>' : ''}
                `);
            }

            // Page numbers
            for (let i = startPage; i <= endPage; i++) {
                pages.push(`
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">${i}</button>
                `);
            }

            // Last page
            if (endPage < totalPages) {
                pages.push(`
                    ${endPage < totalPages - 1 ? '<span class="page-ellipsis">...</span>' : ''}
                    <button class="page-btn" data-page="${totalPages}">${totalPages}</button>
                `);
            }

            return `
                <div class="pagination">
                    <button class="page-btn page-prev" 
                            ${this.currentPage === 1 ? 'disabled' : ''}
                            data-page="${this.currentPage - 1}">
                        <i class="icon-chevron-left"></i>
                    </button>
                    ${pages.join('')}
                    <button class="page-btn page-next" 
                            ${this.currentPage === totalPages ? 'disabled' : ''}
                            data-page="${this.currentPage + 1}">
                        <i class="icon-chevron-right"></i>
                    </button>
                </div>
            `;
        }

        /**
         * Attach event handlers
         */
        _attachEventHandlers() {
            // View mode toggles
            const gridBtn = this.container.querySelector('#view-grid');
            if (gridBtn) {
                gridBtn.addEventListener('click', () => this.setViewMode('grid'));
            }

            const listBtn = this.container.querySelector('#view-list');
            if (listBtn) {
                listBtn.addEventListener('click', () => this.setViewMode('list'));
            }

            // Select all checkbox (list view)
            const selectAll = this.container.querySelector('#select-all');
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    this._handleSelectAll(e.target.checked);
                });
            }

            // Individual checkboxes
            this.container.querySelectorAll('.flag-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const flagKey = e.target.closest('[data-flag-key]').dataset.flagKey;
                    this._handleSelection(flagKey, e.target.checked);
                });
            });

            // Flag actions
            this._attachFlagActionHandlers();

            // Bulk actions
            this._attachBulkActionHandlers();

            // Pagination
            this._attachPaginationHandlers();

            // Click on flag item (not on action buttons)
            this.container.querySelectorAll('[data-flag-key]').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Don't trigger if clicking on action buttons or checkboxes
                    if (e.target.closest('.flag-actions') || 
                        e.target.closest('.action-col') ||
                        e.target.closest('.flag-checkbox')) {
                        return;
                    }

                    const flagKey = item.dataset.flagKey;
                    if (this.onFlagClick) {
                        this.onFlagClick(flagKey, this.flags.get(flagKey));
                    }
                });
            });
        }

        /**
         * Attach flag action handlers
         */
        _attachFlagActionHandlers() {
            // Toggle buttons
            this.container.querySelectorAll('.flag-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const flagKey = btn.closest('[data-flag-key]').dataset.flagKey;
                    if (this.onFlagToggle) {
                        this.onFlagToggle(flagKey, this.flags.get(flagKey));
                    }
                });
            });

            // Edit buttons
            this.container.querySelectorAll('.flag-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const flagKey = btn.closest('[data-flag-key]').dataset.flagKey;
                    if (this.onFlagEdit) {
                        this.onFlagEdit(flagKey, this.flags.get(flagKey));
                    }
                });
            });

            // Delete buttons
            this.container.querySelectorAll('.flag-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const flagKey = btn.closest('[data-flag-key]').dataset.flagKey;
                    if (this.onFlagDelete) {
                        this.onFlagDelete(flagKey, this.flags.get(flagKey));
                    }
                });
            });
        }

        /**
         * Attach bulk action handlers
         */
        _attachBulkActionHandlers() {
            const bulkEnable = this.container.querySelector('#bulk-enable');
            if (bulkEnable) {
                bulkEnable.addEventListener('click', () => this._bulkAction('enable'));
            }

            const bulkDisable = this.container.querySelector('#bulk-disable');
            if (bulkDisable) {
                bulkDisable.addEventListener('click', () => this._bulkAction('disable'));
            }

            const bulkDelete = this.container.querySelector('#bulk-delete');
            if (bulkDelete) {
                bulkDelete.addEventListener('click', () => this._bulkAction('delete'));
            }

            const clearSelection = this.container.querySelector('#clear-selection');
            if (clearSelection) {
                clearSelection.addEventListener('click', () => this._clearSelection());
            }
        }

        /**
         * Attach pagination handlers
         */
        _attachPaginationHandlers() {
            this.container.querySelectorAll('.page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.dataset.page);
                    if (!isNaN(page) && page !== this.currentPage) {
                        this.setPage(page);
                    }
                });
            });
        }

        /**
         * Handle select all
         * @param {boolean} checked - Checked state
         */
        _handleSelectAll(checked) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageFlags = Array.from(this.flags.keys()).slice(startIndex, endIndex);

            pageFlags.forEach(key => {
                if (checked) {
                    this.selectedFlags.add(key);
                } else {
                    this.selectedFlags.delete(key);
                }
            });

            this._updateSelectionUI();
        }

        /**
         * Handle individual flag selection
         * @param {string} flagKey - Flag key
         * @param {boolean} checked - Checked state
         */
        _handleSelection(flagKey, checked) {
            if (checked) {
                this.selectedFlags.add(flagKey);
            } else {
                this.selectedFlags.delete(flagKey);
            }

            this._updateSelectionUI();
        }

        /**
         * Update selection UI
         */
        _updateSelectionUI() {
            // Update bulk actions visibility
            const bulkActions = this.container.querySelector('.bulk-actions');
            if (bulkActions) {
                if (this.selectedFlags.size > 0) {
                    bulkActions.classList.remove('hidden');
                    bulkActions.querySelector('.selected-count').textContent = 
                        `${this.selectedFlags.size} selected`;
                } else {
                    bulkActions.classList.add('hidden');
                }
            }

            // Update individual checkboxes
            this.container.querySelectorAll('[data-flag-key]').forEach(item => {
                const key = item.dataset.flagKey;
                const checkbox = item.querySelector('.flag-checkbox');
                
                if (this.selectedFlags.has(key)) {
                    item.classList.add('selected');
                    if (checkbox) checkbox.checked = true;
                } else {
                    item.classList.remove('selected');
                    if (checkbox) checkbox.checked = false;
                }
            });

            // Update select all checkbox
            const selectAll = this.container.querySelector('#select-all');
            if (selectAll) {
                const startIndex = (this.currentPage - 1) * this.itemsPerPage;
                const endIndex = startIndex + this.itemsPerPage;
                const pageFlags = Array.from(this.flags.keys()).slice(startIndex, endIndex);
                const allSelected = pageFlags.every(key => this.selectedFlags.has(key));
                const someSelected = pageFlags.some(key => this.selectedFlags.has(key));

                selectAll.checked = allSelected;
                selectAll.indeterminate = someSelected && !allSelected;
            }
        }

        /**
         * Perform bulk action
         * @param {string} action - Action type
         */
        _bulkAction(action) {
            if (this.selectedFlags.size === 0) return;

            const selectedArray = Array.from(this.selectedFlags);

            switch (action) {
                case 'enable':
                case 'disable':
                    if (this.onFlagToggle) {
                        selectedArray.forEach(key => {
                            const flag = this.flags.get(key);
                            if (flag && flag.enabled !== (action === 'enable')) {
                                this.onFlagToggle(key, flag);
                            }
                        });
                    }
                    break;

                case 'delete':
                    if (confirm(`Delete ${this.selectedFlags.size} flags?`)) {
                        if (this.onFlagDelete) {
                            selectedArray.forEach(key => {
                                this.onFlagDelete(key, this.flags.get(key));
                            });
                        }
                    }
                    break;
            }

            this._clearSelection();
        }

        /**
         * Clear selection
         */
        _clearSelection() {
            this.selectedFlags.clear();
            this._updateSelectionUI();
        }

        /**
         * Set view mode
         * @param {string} mode - 'grid' or 'list'
         */
        setViewMode(mode) {
            if (mode === this.viewMode) return;

            this.viewMode = mode;
            this.render();

            // Emit event
            if (KC.EventBus) {
                KC.EventBus.emit('FLAG_LIST_VIEW_CHANGED', { mode });
            }
        }

        /**
         * Set current page
         * @param {number} page - Page number
         */
        setPage(page) {
            this.currentPage = page;
            this.render();
        }

        /**
         * Format date for display
         * @param {Date|string} date - Date value
         * @returns {string} Formatted date
         */
        _formatDate(date) {
            const d = new Date(date);
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        }

        /**
         * Get selected flags
         * @returns {Set} Selected flag keys
         */
        getSelected() {
            return new Set(this.selectedFlags);
        }

        /**
         * Destroy component
         */
        destroy() {
            if (this.container) {
                this.container.innerHTML = '';
            }
            this.selectedFlags.clear();
            this.flags.clear();
        }
    }

    // Export to KC namespace
    window.KC = window.KC || {};
    window.KC.FlagList = FlagList;

})(window);