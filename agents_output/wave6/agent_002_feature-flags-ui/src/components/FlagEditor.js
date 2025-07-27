/**
 * FlagEditor.js - Editor component for creating and editing feature flags
 * 
 * Features:
 * - Form validation
 * - Dynamic form fields based on flag type
 * - Targeting rule builder
 * - Variant configuration
 * - JSON import/export
 * 
 * @module FlagEditor
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class FlagEditor {
        constructor(options = {}) {
            this.mode = 'create'; // 'create' or 'edit'
            this.flag = null;
            this.mlFeatureFlags = null;
            this.onSave = options.onSave || null;
            this.onCancel = options.onCancel || null;
            this.container = null;
            this.formData = this._getDefaultFormData();
            
            // AIDEV-NOTE: flag-editor-init; editor initialization with validation
            this._initializeValidation();
        }

        /**
         * Initialize with MLFeatureFlags instance
         * @param {MLFeatureFlags} mlFeatureFlags - MLFeatureFlags instance
         */
        initialize(mlFeatureFlags) {
            this.mlFeatureFlags = mlFeatureFlags;
        }

        /**
         * Get default form data
         * @returns {Object} Default form data
         */
        _getDefaultFormData() {
            return {
                key: '',
                type: 'boolean',
                description: '',
                enabled: true,
                value: true,
                percentage: 50,
                defaultValue: false,
                rules: [],
                variants: [
                    { name: 'control', value: 'control', weight: 50 },
                    { name: 'treatment', value: 'treatment', weight: 50 }
                ],
                dependencies: [],
                environments: [],
                tags: [],
                metadata: {}
            };
        }

        /**
         * Initialize validation rules
         */
        _initializeValidation() {
            this.validationRules = {
                key: {
                    required: true,
                    pattern: /^[a-zA-Z0-9_.-]+$/,
                    minLength: 3,
                    maxLength: 100,
                    message: 'Key must be 3-100 characters, alphanumeric with _ . -'
                },
                description: {
                    maxLength: 500,
                    message: 'Description must be less than 500 characters'
                },
                percentage: {
                    min: 0,
                    max: 100,
                    message: 'Percentage must be between 0 and 100'
                }
            };
        }

        /**
         * Open editor modal
         * @param {Object} config - Editor configuration
         */
        open(config = {}) {
            this.mode = config.mode || 'create';
            this.flag = config.flag || null;
            this.onSave = config.onSave || this.onSave;
            this.onCancel = config.onCancel || this.onCancel;

            if (this.mode === 'edit' && this.flag) {
                this.formData = { ...this._getDefaultFormData(), ...this.flag };
            } else {
                this.formData = this._getDefaultFormData();
            }

            this._showModal();
        }

        /**
         * Show modal with editor
         */
        _showModal() {
            if (!KC.ModalManager) {
                KC.Logger.error('ModalManager not available');
                return;
            }

            const modalContent = this._renderEditor();

            KC.ModalManager.show({
                title: this.mode === 'create' ? 'Create Feature Flag' : 'Edit Feature Flag',
                content: modalContent,
                size: 'large',
                onOpen: () => {
                    this._attachFormHandlers();
                    this._updateFormVisibility();
                },
                buttons: [
                    {
                        text: 'Save',
                        class: 'btn-primary',
                        action: () => this._handleSave()
                    },
                    {
                        text: 'Cancel',
                        class: 'btn-secondary',
                        action: () => this._handleCancel()
                    }
                ]
            });
        }

        /**
         * Render editor form
         * @returns {string} HTML
         */
        _renderEditor() {
            return `
                <div class="flag-editor">
                    <form id="flag-editor-form" class="editor-form">
                        <!-- Basic Information -->
                        <div class="form-section">
                            <h4>Basic Information</h4>
                            
                            <div class="form-group">
                                <label for="flag-key">Flag Key *</label>
                                <input type="text" 
                                       id="flag-key" 
                                       name="key" 
                                       value="${this.formData.key}"
                                       ${this.mode === 'edit' ? 'readonly' : ''}
                                       required>
                                <span class="form-hint">Unique identifier for this flag</span>
                                <span class="form-error" id="key-error"></span>
                            </div>

                            <div class="form-group">
                                <label for="flag-description">Description</label>
                                <textarea id="flag-description" 
                                          name="description" 
                                          rows="3">${this.formData.description || ''}</textarea>
                                <span class="form-hint">Describe the purpose of this flag</span>
                                <span class="form-error" id="description-error"></span>
                            </div>

                            <div class="form-group">
                                <label for="flag-type">Flag Type *</label>
                                <select id="flag-type" name="type" required>
                                    <option value="boolean" ${this.formData.type === 'boolean' ? 'selected' : ''}>
                                        Boolean (On/Off)
                                    </option>
                                    <option value="percentage" ${this.formData.type === 'percentage' ? 'selected' : ''}>
                                        Percentage Rollout
                                    </option>
                                    <option value="targeting" ${this.formData.type === 'targeting' ? 'selected' : ''}>
                                        Targeting Rules
                                    </option>
                                    <option value="variant" ${this.formData.type === 'variant' ? 'selected' : ''}>
                                        A/B Test (Variants)
                                    </option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" 
                                           id="flag-enabled" 
                                           name="enabled"
                                           ${this.formData.enabled ? 'checked' : ''}>
                                    Enable flag immediately
                                </label>
                            </div>
                        </div>

                        <!-- Type-specific Configuration -->
                        <div class="form-section" id="type-config">
                            ${this._renderTypeConfig()}
                        </div>

                        <!-- Advanced Settings -->
                        <div class="form-section collapsible">
                            <h4 class="section-header" id="advanced-toggle">
                                <i class="icon-chevron-right"></i>
                                Advanced Settings
                            </h4>
                            
                            <div class="section-content" id="advanced-content" style="display: none;">
                                <!-- Dependencies -->
                                <div class="form-group">
                                    <label>Dependencies</label>
                                    <div id="dependencies-list" class="dynamic-list">
                                        ${this._renderDependencies()}
                                    </div>
                                    <button type="button" class="btn btn-sm" id="add-dependency">
                                        <i class="icon-plus"></i> Add Dependency
                                    </button>
                                </div>

                                <!-- Environments -->
                                <div class="form-group">
                                    <label>Environments</label>
                                    <div class="checkbox-group">
                                        <label>
                                            <input type="checkbox" 
                                                   name="environments" 
                                                   value="development"
                                                   ${this.formData.environments?.includes('development') ? 'checked' : ''}>
                                            Development
                                        </label>
                                        <label>
                                            <input type="checkbox" 
                                                   name="environments" 
                                                   value="staging"
                                                   ${this.formData.environments?.includes('staging') ? 'checked' : ''}>
                                            Staging
                                        </label>
                                        <label>
                                            <input type="checkbox" 
                                                   name="environments" 
                                                   value="production"
                                                   ${this.formData.environments?.includes('production') ? 'checked' : ''}>
                                            Production
                                        </label>
                                    </div>
                                    <span class="form-hint">Leave empty for all environments</span>
                                </div>

                                <!-- Tags -->
                                <div class="form-group">
                                    <label for="flag-tags">Tags</label>
                                    <input type="text" 
                                           id="flag-tags" 
                                           name="tags"
                                           value="${this.formData.tags?.join(', ') || ''}"
                                           placeholder="feature, experiment, backend">
                                    <span class="form-hint">Comma-separated tags for organization</span>
                                </div>

                                <!-- Metadata -->
                                <div class="form-group">
                                    <label for="flag-metadata">Custom Metadata (JSON)</label>
                                    <textarea id="flag-metadata" 
                                              name="metadata" 
                                              rows="4"
                                              placeholder='{"team": "backend", "jira": "FEAT-123"}'>${JSON.stringify(this.formData.metadata || {}, null, 2)}</textarea>
                                    <span class="form-error" id="metadata-error"></span>
                                </div>
                            </div>
                        </div>

                        <!-- Import/Export -->
                        <div class="form-section">
                            <div class="import-export">
                                <button type="button" class="btn btn-sm" id="import-json">
                                    <i class="icon-upload"></i> Import JSON
                                </button>
                                <button type="button" class="btn btn-sm" id="export-json">
                                    <i class="icon-download"></i> Export JSON
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            `;
        }

        /**
         * Render type-specific configuration
         * @returns {string} HTML
         */
        _renderTypeConfig() {
            switch (this.formData.type) {
                case 'boolean':
                    return this._renderBooleanConfig();
                case 'percentage':
                    return this._renderPercentageConfig();
                case 'targeting':
                    return this._renderTargetingConfig();
                case 'variant':
                    return this._renderVariantConfig();
                default:
                    return '';
            }
        }

        /**
         * Render boolean configuration
         * @returns {string} HTML
         */
        _renderBooleanConfig() {
            return `
                <div class="form-group">
                    <label>Default Value</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" 
                                   name="value" 
                                   value="true"
                                   ${this.formData.value === true ? 'checked' : ''}>
                            True (On)
                        </label>
                        <label>
                            <input type="radio" 
                                   name="value" 
                                   value="false"
                                   ${this.formData.value === false ? 'checked' : ''}>
                            False (Off)
                        </label>
                    </div>
                </div>
            `;
        }

        /**
         * Render percentage configuration
         * @returns {string} HTML
         */
        _renderPercentageConfig() {
            return `
                <div class="form-group">
                    <label for="flag-percentage">Rollout Percentage</label>
                    <div class="percentage-input">
                        <input type="range" 
                               id="flag-percentage-slider" 
                               name="percentage" 
                               min="0" 
                               max="100" 
                               value="${this.formData.percentage || 50}">
                        <input type="number" 
                               id="flag-percentage" 
                               name="percentage-value" 
                               min="0" 
                               max="100" 
                               value="${this.formData.percentage || 50}">
                        <span>%</span>
                    </div>
                    <div class="rollout-preview">
                        <div class="rollout-bar">
                            <div class="rollout-progress" style="width: ${this.formData.percentage || 50}%"></div>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Default Value (when not in rollout)</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" 
                                   name="defaultValue" 
                                   value="true"
                                   ${this.formData.defaultValue === true ? 'checked' : ''}>
                            True
                        </label>
                        <label>
                            <input type="radio" 
                                   name="defaultValue" 
                                   value="false"
                                   ${this.formData.defaultValue === false ? 'checked' : ''}>
                            False
                        </label>
                    </div>
                </div>
            `;
        }

        /**
         * Render targeting configuration
         * @returns {string} HTML
         */
        _renderTargetingConfig() {
            return `
                <div class="targeting-rules">
                    <h5>Targeting Rules</h5>
                    <div id="rules-list" class="rules-list">
                        ${this.formData.rules?.map((rule, index) => 
                            this._renderRule(rule, index)
                        ).join('') || ''}
                    </div>
                    <button type="button" class="btn btn-sm" id="add-rule">
                        <i class="icon-plus"></i> Add Rule
                    </button>
                </div>

                <div class="form-group">
                    <label>Default Value (when no rules match)</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" 
                                   name="defaultValue" 
                                   value="true"
                                   ${this.formData.defaultValue === true ? 'checked' : ''}>
                            True
                        </label>
                        <label>
                            <input type="radio" 
                                   name="defaultValue" 
                                   value="false"
                                   ${this.formData.defaultValue === false ? 'checked' : ''}>
                            False
                        </label>
                    </div>
                </div>
            `;
        }

        /**
         * Render variant configuration
         * @returns {string} HTML
         */
        _renderVariantConfig() {
            return `
                <div class="variants-config">
                    <h5>Variants</h5>
                    <div id="variants-list" class="variants-list">
                        ${this.formData.variants?.map((variant, index) => 
                            this._renderVariant(variant, index)
                        ).join('') || ''}
                    </div>
                    <button type="button" class="btn btn-sm" id="add-variant">
                        <i class="icon-plus"></i> Add Variant
                    </button>
                    
                    <div class="weight-summary">
                        Total Weight: <span id="total-weight">${this._calculateTotalWeight()}</span>%
                        <span class="form-error" id="weight-error"></span>
                    </div>
                </div>
            `;
        }

        /**
         * Render single rule
         * @param {Object} rule - Rule data
         * @param {number} index - Rule index
         * @returns {string} HTML
         */
        _renderRule(rule, index) {
            return `
                <div class="rule-item" data-index="${index}">
                    <div class="rule-header">
                        <h6>Rule ${index + 1}</h6>
                        <button type="button" class="btn-icon remove-rule" data-index="${index}">
                            <i class="icon-delete"></i>
                        </button>
                    </div>
                    
                    <div class="rule-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Attribute</label>
                                <input type="text" 
                                       name="rule-attribute-${index}" 
                                       value="${rule.attribute || ''}"
                                       placeholder="userId, email, country">
                            </div>
                            
                            <div class="form-group">
                                <label>Operator</label>
                                <select name="rule-operator-${index}">
                                    <option value="equals" ${rule.operator === 'equals' ? 'selected' : ''}>Equals</option>
                                    <option value="notEquals" ${rule.operator === 'notEquals' ? 'selected' : ''}>Not Equals</option>
                                    <option value="contains" ${rule.operator === 'contains' ? 'selected' : ''}>Contains</option>
                                    <option value="startsWith" ${rule.operator === 'startsWith' ? 'selected' : ''}>Starts With</option>
                                    <option value="endsWith" ${rule.operator === 'endsWith' ? 'selected' : ''}>Ends With</option>
                                    <option value="in" ${rule.operator === 'in' ? 'selected' : ''}>In List</option>
                                    <option value="greaterThan" ${rule.operator === 'greaterThan' ? 'selected' : ''}>Greater Than</option>
                                    <option value="lessThan" ${rule.operator === 'lessThan' ? 'selected' : ''}>Less Than</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Value</label>
                                <input type="text" 
                                       name="rule-value-${index}" 
                                       value="${rule.value || ''}"
                                       placeholder="Value to compare">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Return Value</label>
                            <div class="radio-group">
                                <label>
                                    <input type="radio" 
                                           name="rule-return-${index}" 
                                           value="true"
                                           ${rule.returnValue === true ? 'checked' : ''}>
                                    True
                                </label>
                                <label>
                                    <input type="radio" 
                                           name="rule-return-${index}" 
                                           value="false"
                                           ${rule.returnValue === false ? 'checked' : ''}>
                                    False
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Render single variant
         * @param {Object} variant - Variant data
         * @param {number} index - Variant index
         * @returns {string} HTML
         */
        _renderVariant(variant, index) {
            return `
                <div class="variant-item" data-index="${index}">
                    <div class="variant-header">
                        <input type="text" 
                               name="variant-name-${index}" 
                               value="${variant.name || ''}"
                               placeholder="Variant name"
                               class="variant-name">
                        <button type="button" class="btn-icon remove-variant" data-index="${index}">
                            <i class="icon-delete"></i>
                        </button>
                    </div>
                    
                    <div class="variant-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Value</label>
                                <input type="text" 
                                       name="variant-value-${index}" 
                                       value="${variant.value || ''}"
                                       placeholder="Variant value">
                            </div>
                            
                            <div class="form-group">
                                <label>Weight (%)</label>
                                <input type="number" 
                                       name="variant-weight-${index}" 
                                       value="${variant.weight || 0}"
                                       min="0"
                                       max="100"
                                       class="variant-weight">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Render dependencies
         * @returns {string} HTML
         */
        _renderDependencies() {
            return (this.formData.dependencies || []).map((dep, index) => `
                <div class="dependency-item" data-index="${index}">
                    <input type="text" 
                           name="dep-flag-${index}" 
                           value="${dep.flag || ''}"
                           placeholder="Flag key">
                    <select name="dep-state-${index}">
                        <option value="true" ${dep.enabled === true ? 'selected' : ''}>Enabled</option>
                        <option value="false" ${dep.enabled === false ? 'selected' : ''}>Disabled</option>
                    </select>
                    <button type="button" class="btn-icon remove-dependency" data-index="${index}">
                        <i class="icon-delete"></i>
                    </button>
                </div>
            `).join('') || '<p class="empty-message">No dependencies</p>';
        }

        /**
         * Attach form event handlers
         */
        _attachFormHandlers() {
            const form = document.getElementById('flag-editor-form');
            if (!form) return;

            // Type change
            const typeSelect = form.querySelector('#flag-type');
            if (typeSelect) {
                typeSelect.addEventListener('change', () => {
                    this.formData.type = typeSelect.value;
                    this._updateTypeConfig();
                });
            }

            // Percentage slider
            const percentageSlider = form.querySelector('#flag-percentage-slider');
            const percentageInput = form.querySelector('#flag-percentage');
            if (percentageSlider && percentageInput) {
                percentageSlider.addEventListener('input', (e) => {
                    percentageInput.value = e.target.value;
                    this._updatePercentagePreview(e.target.value);
                });

                percentageInput.addEventListener('input', (e) => {
                    percentageSlider.value = e.target.value;
                    this._updatePercentagePreview(e.target.value);
                });
            }

            // Advanced settings toggle
            const advancedToggle = form.querySelector('#advanced-toggle');
            const advancedContent = form.querySelector('#advanced-content');
            if (advancedToggle && advancedContent) {
                advancedToggle.addEventListener('click', () => {
                    const isVisible = advancedContent.style.display !== 'none';
                    advancedContent.style.display = isVisible ? 'none' : 'block';
                    advancedToggle.querySelector('i').className = 
                        isVisible ? 'icon-chevron-right' : 'icon-chevron-down';
                });
            }

            // Dynamic lists
            this._attachDynamicListHandlers();

            // Import/Export
            this._attachImportExportHandlers();

            // Form validation
            this._attachValidationHandlers();
        }

        /**
         * Attach dynamic list handlers
         */
        _attachDynamicListHandlers() {
            // Add rule
            const addRuleBtn = document.getElementById('add-rule');
            if (addRuleBtn) {
                addRuleBtn.addEventListener('click', () => this._addRule());
            }

            // Remove rule
            document.querySelectorAll('.remove-rule').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.closest('[data-index]').dataset.index);
                    this._removeRule(index);
                });
            });

            // Add variant
            const addVariantBtn = document.getElementById('add-variant');
            if (addVariantBtn) {
                addVariantBtn.addEventListener('click', () => this._addVariant());
            }

            // Remove variant
            document.querySelectorAll('.remove-variant').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.closest('[data-index]').dataset.index);
                    this._removeVariant(index);
                });
            });

            // Variant weight changes
            document.querySelectorAll('.variant-weight').forEach(input => {
                input.addEventListener('input', () => this._updateWeightTotal());
            });

            // Add dependency
            const addDepBtn = document.getElementById('add-dependency');
            if (addDepBtn) {
                addDepBtn.addEventListener('click', () => this._addDependency());
            }

            // Remove dependency
            document.querySelectorAll('.remove-dependency').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.closest('[data-index]').dataset.index);
                    this._removeDependency(index);
                });
            });
        }

        /**
         * Attach import/export handlers
         */
        _attachImportExportHandlers() {
            const importBtn = document.getElementById('import-json');
            if (importBtn) {
                importBtn.addEventListener('click', () => this._importJSON());
            }

            const exportBtn = document.getElementById('export-json');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this._exportJSON());
            }
        }

        /**
         * Attach validation handlers
         */
        _attachValidationHandlers() {
            // Key validation
            const keyInput = document.getElementById('flag-key');
            if (keyInput) {
                keyInput.addEventListener('input', () => this._validateField('key', keyInput.value));
            }

            // Description validation
            const descInput = document.getElementById('flag-description');
            if (descInput) {
                descInput.addEventListener('input', () => this._validateField('description', descInput.value));
            }

            // Metadata validation
            const metadataInput = document.getElementById('flag-metadata');
            if (metadataInput) {
                metadataInput.addEventListener('input', () => this._validateMetadata(metadataInput.value));
            }
        }

        /**
         * Update type-specific configuration
         */
        _updateTypeConfig() {
            const typeConfig = document.getElementById('type-config');
            if (typeConfig) {
                typeConfig.innerHTML = this._renderTypeConfig();
                this._attachTypeConfigHandlers();
            }
        }

        /**
         * Attach type-specific config handlers
         */
        _attachTypeConfigHandlers() {
            // Re-attach handlers for dynamically added elements
            if (this.formData.type === 'percentage') {
                const slider = document.getElementById('flag-percentage-slider');
                const input = document.getElementById('flag-percentage');
                
                if (slider && input) {
                    slider.addEventListener('input', (e) => {
                        input.value = e.target.value;
                        this._updatePercentagePreview(e.target.value);
                    });

                    input.addEventListener('input', (e) => {
                        slider.value = e.target.value;
                        this._updatePercentagePreview(e.target.value);
                    });
                }
            } else if (this.formData.type === 'targeting') {
                const addRuleBtn = document.getElementById('add-rule');
                if (addRuleBtn) {
                    addRuleBtn.addEventListener('click', () => this._addRule());
                }
            } else if (this.formData.type === 'variant') {
                const addVariantBtn = document.getElementById('add-variant');
                if (addVariantBtn) {
                    addVariantBtn.addEventListener('click', () => this._addVariant());
                }
            }
        }

        /**
         * Update percentage preview
         * @param {number} value - Percentage value
         */
        _updatePercentagePreview(value) {
            const preview = document.querySelector('.rollout-progress');
            if (preview) {
                preview.style.width = `${value}%`;
            }
        }

        /**
         * Update form visibility based on selections
         */
        _updateFormVisibility() {
            // Additional visibility updates can be added here
        }

        /**
         * Add new rule
         */
        _addRule() {
            if (!this.formData.rules) {
                this.formData.rules = [];
            }

            const newRule = {
                attribute: '',
                operator: 'equals',
                value: '',
                returnValue: true
            };

            this.formData.rules.push(newRule);
            
            const rulesList = document.getElementById('rules-list');
            if (rulesList) {
                const index = this.formData.rules.length - 1;
                const ruleHtml = this._renderRule(newRule, index);
                rulesList.insertAdjacentHTML('beforeend', ruleHtml);
                
                // Attach remove handler
                const removeBtn = rulesList.querySelector(`.remove-rule[data-index="${index}"]`);
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => this._removeRule(index));
                }
            }
        }

        /**
         * Remove rule
         * @param {number} index - Rule index
         */
        _removeRule(index) {
            this.formData.rules.splice(index, 1);
            this._refreshRules();
        }

        /**
         * Refresh rules list
         */
        _refreshRules() {
            const rulesList = document.getElementById('rules-list');
            if (rulesList) {
                rulesList.innerHTML = this.formData.rules.map((rule, index) => 
                    this._renderRule(rule, index)
                ).join('');

                // Re-attach handlers
                rulesList.querySelectorAll('.remove-rule').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.target.closest('[data-index]').dataset.index);
                        this._removeRule(idx);
                    });
                });
            }
        }

        /**
         * Add new variant
         */
        _addVariant() {
            if (!this.formData.variants) {
                this.formData.variants = [];
            }

            const newVariant = {
                name: `variant${this.formData.variants.length + 1}`,
                value: '',
                weight: 0
            };

            this.formData.variants.push(newVariant);
            
            const variantsList = document.getElementById('variants-list');
            if (variantsList) {
                const index = this.formData.variants.length - 1;
                const variantHtml = this._renderVariant(newVariant, index);
                variantsList.insertAdjacentHTML('beforeend', variantHtml);
                
                // Attach handlers
                const removeBtn = variantsList.querySelector(`.remove-variant[data-index="${index}"]`);
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => this._removeVariant(index));
                }

                const weightInput = variantsList.querySelector(`[name="variant-weight-${index}"]`);
                if (weightInput) {
                    weightInput.addEventListener('input', () => this._updateWeightTotal());
                }
            }
        }

        /**
         * Remove variant
         * @param {number} index - Variant index
         */
        _removeVariant(index) {
            this.formData.variants.splice(index, 1);
            this._refreshVariants();
        }

        /**
         * Refresh variants list
         */
        _refreshVariants() {
            const variantsList = document.getElementById('variants-list');
            if (variantsList) {
                variantsList.innerHTML = this.formData.variants.map((variant, index) => 
                    this._renderVariant(variant, index)
                ).join('');

                // Re-attach handlers
                variantsList.querySelectorAll('.remove-variant').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.target.closest('[data-index]').dataset.index);
                        this._removeVariant(idx);
                    });
                });

                variantsList.querySelectorAll('.variant-weight').forEach(input => {
                    input.addEventListener('input', () => this._updateWeightTotal());
                });

                this._updateWeightTotal();
            }
        }

        /**
         * Calculate total weight
         * @returns {number} Total weight
         */
        _calculateTotalWeight() {
            if (!this.formData.variants) return 0;
            
            return this.formData.variants.reduce((total, variant) => {
                return total + (parseInt(variant.weight) || 0);
            }, 0);
        }

        /**
         * Update weight total display
         */
        _updateWeightTotal() {
            const totalWeight = document.getElementById('total-weight');
            const weightError = document.getElementById('weight-error');
            
            if (totalWeight) {
                const total = this._calculateTotalWeight();
                totalWeight.textContent = total;
                
                if (weightError) {
                    if (total !== 100) {
                        weightError.textContent = 'Weights must total 100%';
                        weightError.style.display = 'block';
                    } else {
                        weightError.style.display = 'none';
                    }
                }
            }
        }

        /**
         * Add new dependency
         */
        _addDependency() {
            if (!this.formData.dependencies) {
                this.formData.dependencies = [];
            }

            const newDep = {
                flag: '',
                enabled: true
            };

            this.formData.dependencies.push(newDep);
            
            const depList = document.getElementById('dependencies-list');
            if (depList) {
                depList.innerHTML = this._renderDependencies();
                
                // Re-attach handlers
                depList.querySelectorAll('.remove-dependency').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = parseInt(e.target.closest('[data-index]').dataset.index);
                        this._removeDependency(index);
                    });
                });
            }
        }

        /**
         * Remove dependency
         * @param {number} index - Dependency index
         */
        _removeDependency(index) {
            this.formData.dependencies.splice(index, 1);
            
            const depList = document.getElementById('dependencies-list');
            if (depList) {
                depList.innerHTML = this._renderDependencies();
                
                // Re-attach handlers
                depList.querySelectorAll('.remove-dependency').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.target.closest('[data-index]').dataset.index);
                        this._removeDependency(idx);
                    });
                });
            }
        }

        /**
         * Validate field
         * @param {string} field - Field name
         * @param {string} value - Field value
         * @returns {boolean} Is valid
         */
        _validateField(field, value) {
            const rules = this.validationRules[field];
            if (!rules) return true;

            const errorElement = document.getElementById(`${field}-error`);
            if (!errorElement) return true;

            // Required check
            if (rules.required && !value) {
                errorElement.textContent = `${field} is required`;
                errorElement.style.display = 'block';
                return false;
            }

            // Pattern check
            if (rules.pattern && value && !rules.pattern.test(value)) {
                errorElement.textContent = rules.message;
                errorElement.style.display = 'block';
                return false;
            }

            // Length checks
            if (rules.minLength && value && value.length < rules.minLength) {
                errorElement.textContent = rules.message;
                errorElement.style.display = 'block';
                return false;
            }

            if (rules.maxLength && value && value.length > rules.maxLength) {
                errorElement.textContent = rules.message;
                errorElement.style.display = 'block';
                return false;
            }

            // Min/Max checks
            if (rules.min !== undefined && parseFloat(value) < rules.min) {
                errorElement.textContent = rules.message;
                errorElement.style.display = 'block';
                return false;
            }

            if (rules.max !== undefined && parseFloat(value) > rules.max) {
                errorElement.textContent = rules.message;
                errorElement.style.display = 'block';
                return false;
            }

            // Clear error
            errorElement.style.display = 'none';
            return true;
        }

        /**
         * Validate metadata JSON
         * @param {string} value - JSON string
         * @returns {boolean} Is valid
         */
        _validateMetadata(value) {
            const errorElement = document.getElementById('metadata-error');
            if (!errorElement) return true;

            if (!value) {
                errorElement.style.display = 'none';
                return true;
            }

            try {
                JSON.parse(value);
                errorElement.style.display = 'none';
                return true;
            } catch (e) {
                errorElement.textContent = 'Invalid JSON format';
                errorElement.style.display = 'block';
                return false;
            }
        }

        /**
         * Collect form data
         * @returns {Object} Form data
         */
        _collectFormData() {
            const form = document.getElementById('flag-editor-form');
            if (!form) return null;

            const data = {
                key: form.querySelector('#flag-key').value,
                type: form.querySelector('#flag-type').value,
                description: form.querySelector('#flag-description').value,
                enabled: form.querySelector('#flag-enabled').checked
            };

            // Type-specific data
            switch (data.type) {
                case 'boolean':
                    data.value = form.querySelector('input[name="value"]:checked')?.value === 'true';
                    break;

                case 'percentage':
                    data.percentage = parseInt(form.querySelector('#flag-percentage').value);
                    data.defaultValue = form.querySelector('input[name="defaultValue"]:checked')?.value === 'true';
                    break;

                case 'targeting':
                    data.rules = this._collectRules();
                    data.defaultValue = form.querySelector('input[name="defaultValue"]:checked')?.value === 'true';
                    break;

                case 'variant':
                    data.variants = this._collectVariants();
                    break;
            }

            // Dependencies
            data.dependencies = this._collectDependencies();

            // Environments
            const envCheckboxes = form.querySelectorAll('input[name="environments"]:checked');
            data.environments = Array.from(envCheckboxes).map(cb => cb.value);

            // Tags
            const tagsValue = form.querySelector('#flag-tags').value;
            data.tags = tagsValue ? tagsValue.split(',').map(t => t.trim()).filter(t => t) : [];

            // Metadata
            const metadataValue = form.querySelector('#flag-metadata').value;
            if (metadataValue) {
                try {
                    data.metadata = JSON.parse(metadataValue);
                } catch (e) {
                    data.metadata = {};
                }
            }

            return data;
        }

        /**
         * Collect rules data
         * @returns {Array} Rules
         */
        _collectRules() {
            const rules = [];
            const ruleItems = document.querySelectorAll('.rule-item');

            ruleItems.forEach((item, index) => {
                const rule = {
                    attribute: item.querySelector(`[name="rule-attribute-${index}"]`).value,
                    operator: item.querySelector(`[name="rule-operator-${index}"]`).value,
                    value: item.querySelector(`[name="rule-value-${index}"]`).value,
                    returnValue: item.querySelector(`input[name="rule-return-${index}"]:checked`)?.value === 'true'
                };

                if (rule.attribute && rule.value) {
                    rules.push(rule);
                }
            });

            return rules;
        }

        /**
         * Collect variants data
         * @returns {Array} Variants
         */
        _collectVariants() {
            const variants = [];
            const variantItems = document.querySelectorAll('.variant-item');

            variantItems.forEach((item, index) => {
                const variant = {
                    name: item.querySelector(`[name="variant-name-${index}"]`).value,
                    value: item.querySelector(`[name="variant-value-${index}"]`).value,
                    weight: parseInt(item.querySelector(`[name="variant-weight-${index}"]`).value) || 0
                };

                if (variant.name && variant.value) {
                    variants.push(variant);
                }
            });

            return variants;
        }

        /**
         * Collect dependencies data
         * @returns {Array} Dependencies
         */
        _collectDependencies() {
            const dependencies = [];
            const depItems = document.querySelectorAll('.dependency-item');

            depItems.forEach((item, index) => {
                const dep = {
                    flag: item.querySelector(`[name="dep-flag-${index}"]`).value,
                    enabled: item.querySelector(`[name="dep-state-${index}"]`).value === 'true'
                };

                if (dep.flag) {
                    dependencies.push(dep);
                }
            });

            return dependencies;
        }

        /**
         * Validate form
         * @returns {boolean} Is valid
         */
        _validateForm() {
            const data = this._collectFormData();
            if (!data) return false;

            // Validate key
            if (!this._validateField('key', data.key)) {
                return false;
            }

            // Validate description
            if (!this._validateField('description', data.description)) {
                return false;
            }

            // Type-specific validation
            switch (data.type) {
                case 'percentage':
                    if (!this._validateField('percentage', data.percentage)) {
                        return false;
                    }
                    break;

                case 'variant':
                    const totalWeight = this._calculateTotalWeight();
                    if (totalWeight !== 100) {
                        alert('Variant weights must total 100%');
                        return false;
                    }
                    break;
            }

            return true;
        }

        /**
         * Handle save
         */
        _handleSave() {
            if (!this._validateForm()) {
                return;
            }

            const data = this._collectFormData();
            
            if (this.onSave) {
                this.onSave(data);
            }

            KC.ModalManager.closeModal();
        }

        /**
         * Handle cancel
         */
        _handleCancel() {
            if (this.onCancel) {
                this.onCancel();
            }

            KC.ModalManager.closeModal();
        }

        /**
         * Import JSON
         */
        _importJSON() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.formData = { ...this._getDefaultFormData(), ...data };
                        
                        // Re-render form
                        const modalBody = document.querySelector('.modal-body');
                        if (modalBody) {
                            modalBody.innerHTML = this._renderEditor();
                            this._attachFormHandlers();
                        }

                        KC.Logger.info('Flag configuration imported');
                    } catch (error) {
                        alert('Invalid JSON file');
                    }
                };
                reader.readAsText(file);
            });

            input.click();
        }

        /**
         * Export JSON
         */
        _exportJSON() {
            const data = this._collectFormData();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flag-${data.key || 'config'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    // Export to KC namespace
    window.KC = window.KC || {};
    window.KC.FlagEditor = FlagEditor;

})(window);