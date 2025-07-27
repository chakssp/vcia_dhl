/**
 * TargetingRules.js - Targeting rules builder and visualizer
 * 
 * Features:
 * - Visual rule builder interface
 * - Rule condition editor
 * - Rule testing and simulation
 * - Rule conflict detection
 * - Import/export rules
 * 
 * @module TargetingRules
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class TargetingRules {
        constructor(options = {}) {
            this.rules = options.rules || [];
            this.container = null;
            this.editable = options.editable !== false;
            this.showTesting = options.showTesting !== false;
            this.onChange = options.onChange || null;
            
            // Available attributes and operators
            this.availableAttributes = options.attributes || this._getDefaultAttributes();
            this.operators = this._getOperators();
            
            // Test context
            this.testContext = {};
            
            // AIDEV-NOTE: targeting-rules-init; rule builder with conflict detection
            this._initializeRuleEngine();
        }

        /**
         * Initialize rule engine
         */
        _initializeRuleEngine() {
            this.ruleEngine = {
                evaluateRule: this._evaluateRule.bind(this),
                detectConflicts: this._detectConflicts.bind(this),
                optimizeRules: this._optimizeRules.bind(this)
            };
        }

        /**
         * Get default attributes
         * @returns {Array} Default attributes
         */
        _getDefaultAttributes() {
            return [
                { name: 'userId', type: 'string', description: 'User ID' },
                { name: 'email', type: 'string', description: 'User email' },
                { name: 'country', type: 'string', description: 'User country' },
                { name: 'userType', type: 'string', description: 'User type (free, premium, enterprise)' },
                { name: 'accountAge', type: 'number', description: 'Account age in days' },
                { name: 'lastActivity', type: 'date', description: 'Last activity date' },
                { name: 'platform', type: 'string', description: 'Platform (web, ios, android)' },
                { name: 'version', type: 'string', description: 'App version' },
                { name: 'customAttributes', type: 'object', description: 'Custom user attributes' }
            ];
        }

        /**
         * Get operators by type
         * @returns {Object} Operators by type
         */
        _getOperators() {
            return {
                string: [
                    { value: 'equals', label: 'Equals', symbol: '=' },
                    { value: 'notEquals', label: 'Not Equals', symbol: '≠' },
                    { value: 'contains', label: 'Contains', symbol: '∋' },
                    { value: 'notContains', label: 'Not Contains', symbol: '∌' },
                    { value: 'startsWith', label: 'Starts With', symbol: '^' },
                    { value: 'endsWith', label: 'Ends With', symbol: '$' },
                    { value: 'in', label: 'In List', symbol: '∈' },
                    { value: 'notIn', label: 'Not In List', symbol: '∉' },
                    { value: 'matches', label: 'Matches Regex', symbol: '~' }
                ],
                number: [
                    { value: 'equals', label: 'Equals', symbol: '=' },
                    { value: 'notEquals', label: 'Not Equals', symbol: '≠' },
                    { value: 'greaterThan', label: 'Greater Than', symbol: '>' },
                    { value: 'greaterThanOrEqual', label: 'Greater Than or Equal', symbol: '≥' },
                    { value: 'lessThan', label: 'Less Than', symbol: '<' },
                    { value: 'lessThanOrEqual', label: 'Less Than or Equal', symbol: '≤' },
                    { value: 'between', label: 'Between', symbol: '↔' }
                ],
                date: [
                    { value: 'before', label: 'Before', symbol: '<' },
                    { value: 'after', label: 'After', symbol: '>' },
                    { value: 'between', label: 'Between', symbol: '↔' },
                    { value: 'inLast', label: 'In Last', symbol: '↶' },
                    { value: 'notInLast', label: 'Not In Last', symbol: '↷' }
                ],
                object: [
                    { value: 'hasProperty', label: 'Has Property', symbol: '∃' },
                    { value: 'notHasProperty', label: 'Not Has Property', symbol: '∄' }
                ]
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
         * Update rules
         * @param {Array} rules - New rules
         */
        updateRules(rules) {
            this.rules = rules || [];
            this.render();
        }

        /**
         * Render the targeting rules interface
         */
        render() {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="targeting-rules-component">
                    <div class="rules-header">
                        <h3>Targeting Rules</h3>
                        ${this.editable ? `
                            <div class="rules-actions">
                                <button class="btn btn-sm" id="add-rule-group">
                                    <i class="icon-plus"></i> Add Rule Group
                                </button>
                                <button class="btn btn-sm" id="import-rules">
                                    <i class="icon-upload"></i> Import
                                </button>
                                <button class="btn btn-sm" id="export-rules">
                                    <i class="icon-download"></i> Export
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    <div class="rules-list">
                        ${this._renderRules()}
                    </div>

                    ${this.showTesting ? `
                        <div class="rules-testing">
                            <h4>Test Rules</h4>
                            ${this._renderTestInterface()}
                        </div>
                    ` : ''}

                    <div class="rules-summary">
                        ${this._renderSummary()}
                    </div>
                </div>
            `;

            this._attachEventHandlers();
        }

        /**
         * Render rules
         * @returns {string} HTML
         */
        _renderRules() {
            if (this.rules.length === 0) {
                return `
                    <div class="empty-rules">
                        <i class="icon-target"></i>
                        <p>No targeting rules defined</p>
                        ${this.editable ? `
                            <button class="btn btn-primary" id="add-first-rule">
                                Add First Rule
                            </button>
                        ` : ''}
                    </div>
                `;
            }

            return this.rules.map((ruleGroup, groupIndex) => `
                <div class="rule-group" data-group-index="${groupIndex}">
                    <div class="rule-group-header">
                        <span class="group-label">Rule Group ${groupIndex + 1}</span>
                        <span class="group-logic">${ruleGroup.logic || 'AND'}</span>
                        ${this.editable ? `
                            <div class="group-actions">
                                <button class="btn-icon" onclick="KC.TargetingRules.toggleLogic(${groupIndex})">
                                    <i class="icon-logic"></i>
                                </button>
                                <button class="btn-icon" onclick="KC.TargetingRules.removeGroup(${groupIndex})">
                                    <i class="icon-delete"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="rule-conditions">
                        ${(ruleGroup.conditions || []).map((condition, condIndex) => 
                            this._renderCondition(condition, groupIndex, condIndex)
                        ).join('')}
                        
                        ${this.editable ? `
                            <button class="btn btn-sm add-condition" data-group="${groupIndex}">
                                <i class="icon-plus"></i> Add Condition
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="rule-return">
                        <label>Return Value:</label>
                        <div class="return-value">
                            ${this.editable ? `
                                <select class="rule-return-select" data-group="${groupIndex}">
                                    <option value="true" ${ruleGroup.returnValue === true ? 'selected' : ''}>True</option>
                                    <option value="false" ${ruleGroup.returnValue === false ? 'selected' : ''}>False</option>
                                </select>
                            ` : `
                                <span class="return-badge ${ruleGroup.returnValue ? 'true' : 'false'}">
                                    ${ruleGroup.returnValue}
                                </span>
                            `}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        /**
         * Render single condition
         * @param {Object} condition - Condition data
         * @param {number} groupIndex - Group index
         * @param {number} condIndex - Condition index
         * @returns {string} HTML
         */
        _renderCondition(condition, groupIndex, condIndex) {
            const attribute = this.availableAttributes.find(a => a.name === condition.attribute);
            const operators = attribute ? this.operators[attribute.type] : [];

            if (this.editable) {
                return `
                    <div class="rule-condition" data-group="${groupIndex}" data-condition="${condIndex}">
                        <select class="condition-attribute" data-group="${groupIndex}" data-condition="${condIndex}">
                            <option value="">Select attribute...</option>
                            ${this.availableAttributes.map(attr => `
                                <option value="${attr.name}" 
                                        data-type="${attr.type}"
                                        ${condition.attribute === attr.name ? 'selected' : ''}>
                                    ${attr.name}
                                </option>
                            `).join('')}
                        </select>
                        
                        <select class="condition-operator" data-group="${groupIndex}" data-condition="${condIndex}">
                            ${operators.map(op => `
                                <option value="${op.value}" ${condition.operator === op.value ? 'selected' : ''}>
                                    ${op.label}
                                </option>
                            `).join('')}
                        </select>
                        
                        ${this._renderValueInput(condition, attribute, groupIndex, condIndex)}
                        
                        <button class="btn-icon remove-condition" 
                                data-group="${groupIndex}" 
                                data-condition="${condIndex}">
                            <i class="icon-delete"></i>
                        </button>
                    </div>
                `;
            } else {
                const operator = operators.find(op => op.value === condition.operator);
                return `
                    <div class="rule-condition-display">
                        <span class="condition-attribute">${condition.attribute}</span>
                        <span class="condition-operator">${operator ? operator.symbol : condition.operator}</span>
                        <span class="condition-value">${this._formatValue(condition.value, attribute)}</span>
                    </div>
                `;
            }
        }

        /**
         * Render value input based on type
         * @param {Object} condition - Condition data
         * @param {Object} attribute - Attribute config
         * @param {number} groupIndex - Group index
         * @param {number} condIndex - Condition index
         * @returns {string} HTML
         */
        _renderValueInput(condition, attribute, groupIndex, condIndex) {
            if (!attribute) {
                return `<input type="text" class="condition-value" value="${condition.value || ''}" disabled>`;
            }

            const commonAttrs = `class="condition-value" data-group="${groupIndex}" data-condition="${condIndex}"`;

            switch (attribute.type) {
                case 'number':
                    if (condition.operator === 'between') {
                        return `
                            <div class="value-range">
                                <input type="number" ${commonAttrs} data-part="min" 
                                       value="${condition.value?.min || ''}" placeholder="Min">
                                <span>to</span>
                                <input type="number" ${commonAttrs} data-part="max" 
                                       value="${condition.value?.max || ''}" placeholder="Max">
                            </div>
                        `;
                    }
                    return `<input type="number" ${commonAttrs} value="${condition.value || ''}">`;

                case 'date':
                    if (condition.operator === 'between') {
                        return `
                            <div class="value-range">
                                <input type="date" ${commonAttrs} data-part="start" 
                                       value="${condition.value?.start || ''}">
                                <span>to</span>
                                <input type="date" ${commonAttrs} data-part="end" 
                                       value="${condition.value?.end || ''}">
                            </div>
                        `;
                    } else if (condition.operator === 'inLast' || condition.operator === 'notInLast') {
                        return `
                            <div class="value-duration">
                                <input type="number" ${commonAttrs} data-part="value" 
                                       value="${condition.value?.value || ''}" min="1">
                                <select ${commonAttrs} data-part="unit">
                                    <option value="days" ${condition.value?.unit === 'days' ? 'selected' : ''}>Days</option>
                                    <option value="weeks" ${condition.value?.unit === 'weeks' ? 'selected' : ''}>Weeks</option>
                                    <option value="months" ${condition.value?.unit === 'months' ? 'selected' : ''}>Months</option>
                                </select>
                            </div>
                        `;
                    }
                    return `<input type="date" ${commonAttrs} value="${condition.value || ''}">`;

                case 'string':
                    if (condition.operator === 'in' || condition.operator === 'notIn') {
                        return `
                            <textarea ${commonAttrs} 
                                      placeholder="Enter values separated by commas"
                                      rows="2">${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value || ''}</textarea>
                        `;
                    }
                    return `<input type="text" ${commonAttrs} value="${condition.value || ''}">`;

                default:
                    return `<input type="text" ${commonAttrs} value="${condition.value || ''}">`;
            }
        }

        /**
         * Render test interface
         * @returns {string} HTML
         */
        _renderTestInterface() {
            return `
                <div class="test-context">
                    <h5>Test Context</h5>
                    <div class="test-attributes">
                        ${this.availableAttributes.map(attr => `
                            <div class="test-attribute">
                                <label>${attr.name}:</label>
                                ${this._renderTestInput(attr)}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="test-actions">
                        <button class="btn btn-primary" id="run-test">
                            <i class="icon-play"></i> Run Test
                        </button>
                        <button class="btn btn-secondary" id="clear-test">
                            <i class="icon-refresh"></i> Clear
                        </button>
                    </div>
                    
                    <div class="test-results" id="test-results" style="display: none;">
                        <h5>Test Results</h5>
                        <div class="results-content"></div>
                    </div>
                </div>
            `;
        }

        /**
         * Render test input for attribute
         * @param {Object} attr - Attribute config
         * @returns {string} HTML
         */
        _renderTestInput(attr) {
            const inputId = `test-${attr.name}`;
            
            switch (attr.type) {
                case 'number':
                    return `<input type="number" id="${inputId}" class="test-input">`;
                case 'date':
                    return `<input type="date" id="${inputId}" class="test-input">`;
                case 'object':
                    return `<textarea id="${inputId}" class="test-input" rows="2" placeholder='{"key": "value"}'></textarea>`;
                default:
                    return `<input type="text" id="${inputId}" class="test-input">`;
            }
        }

        /**
         * Render summary
         * @returns {string} HTML
         */
        _renderSummary() {
            const conflicts = this._detectConflicts();
            const coverage = this._calculateCoverage();

            return `
                <div class="summary-grid">
                    <div class="summary-item">
                        <i class="icon-rules"></i>
                        <div>
                            <strong>${this.rules.length}</strong>
                            <span>Rule Groups</span>
                        </div>
                    </div>
                    
                    <div class="summary-item">
                        <i class="icon-conditions"></i>
                        <div>
                            <strong>${this._countConditions()}</strong>
                            <span>Total Conditions</span>
                        </div>
                    </div>
                    
                    <div class="summary-item ${conflicts.length > 0 ? 'has-warning' : ''}">
                        <i class="icon-warning"></i>
                        <div>
                            <strong>${conflicts.length}</strong>
                            <span>Conflicts</span>
                        </div>
                    </div>
                    
                    <div class="summary-item">
                        <i class="icon-coverage"></i>
                        <div>
                            <strong>${coverage}%</strong>
                            <span>Est. Coverage</span>
                        </div>
                    </div>
                </div>
                
                ${conflicts.length > 0 ? `
                    <div class="conflicts-warning">
                        <h5>Detected Conflicts:</h5>
                        <ul>
                            ${conflicts.map(conflict => `
                                <li>${conflict.description}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
        }

        /**
         * Attach event handlers
         */
        _attachEventHandlers() {
            if (!this.editable) return;

            // Add rule group
            const addGroupBtn = this.container.querySelector('#add-rule-group');
            const addFirstBtn = this.container.querySelector('#add-first-rule');
            
            if (addGroupBtn) {
                addGroupBtn.addEventListener('click', () => this._addRuleGroup());
            }
            if (addFirstBtn) {
                addFirstBtn.addEventListener('click', () => this._addRuleGroup());
            }

            // Add conditions
            this.container.querySelectorAll('.add-condition').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const groupIndex = parseInt(e.target.dataset.group);
                    this._addCondition(groupIndex);
                });
            });

            // Remove conditions
            this.container.querySelectorAll('.remove-condition').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const groupIndex = parseInt(e.target.dataset.group);
                    const condIndex = parseInt(e.target.dataset.condition);
                    this._removeCondition(groupIndex, condIndex);
                });
            });

            // Attribute changes
            this.container.querySelectorAll('.condition-attribute').forEach(select => {
                select.addEventListener('change', (e) => {
                    const groupIndex = parseInt(e.target.dataset.group);
                    const condIndex = parseInt(e.target.dataset.condition);
                    this._handleAttributeChange(groupIndex, condIndex, e.target.value);
                });
            });

            // Value changes
            this.container.querySelectorAll('.condition-value').forEach(input => {
                input.addEventListener('input', (e) => {
                    this._handleValueChange(e.target);
                });
            });

            // Return value changes
            this.container.querySelectorAll('.rule-return-select').forEach(select => {
                select.addEventListener('change', (e) => {
                    const groupIndex = parseInt(e.target.dataset.group);
                    this.rules[groupIndex].returnValue = e.target.value === 'true';
                    this._triggerChange();
                });
            });

            // Import/Export
            const importBtn = this.container.querySelector('#import-rules');
            const exportBtn = this.container.querySelector('#export-rules');
            
            if (importBtn) {
                importBtn.addEventListener('click', () => this._importRules());
            }
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this._exportRules());
            }

            // Testing
            if (this.showTesting) {
                const runTestBtn = this.container.querySelector('#run-test');
                const clearTestBtn = this.container.querySelector('#clear-test');
                
                if (runTestBtn) {
                    runTestBtn.addEventListener('click', () => this._runTest());
                }
                if (clearTestBtn) {
                    clearTestBtn.addEventListener('click', () => this._clearTest());
                }
            }
        }

        /**
         * Add new rule group
         */
        _addRuleGroup() {
            const newGroup = {
                logic: 'AND',
                conditions: [
                    {
                        attribute: '',
                        operator: 'equals',
                        value: ''
                    }
                ],
                returnValue: true
            };

            this.rules.push(newGroup);
            this.render();
            this._triggerChange();
        }

        /**
         * Remove rule group
         * @param {number} groupIndex - Group index
         */
        removeGroup(groupIndex) {
            if (confirm('Remove this rule group?')) {
                this.rules.splice(groupIndex, 1);
                this.render();
                this._triggerChange();
            }
        }

        /**
         * Toggle rule group logic
         * @param {number} groupIndex - Group index
         */
        toggleLogic(groupIndex) {
            const group = this.rules[groupIndex];
            group.logic = group.logic === 'AND' ? 'OR' : 'AND';
            this.render();
            this._triggerChange();
        }

        /**
         * Add condition to group
         * @param {number} groupIndex - Group index
         */
        _addCondition(groupIndex) {
            const group = this.rules[groupIndex];
            if (!group.conditions) {
                group.conditions = [];
            }

            group.conditions.push({
                attribute: '',
                operator: 'equals',
                value: ''
            });

            this.render();
            this._triggerChange();
        }

        /**
         * Remove condition
         * @param {number} groupIndex - Group index
         * @param {number} condIndex - Condition index
         */
        _removeCondition(groupIndex, condIndex) {
            const group = this.rules[groupIndex];
            group.conditions.splice(condIndex, 1);
            
            // Remove group if no conditions left
            if (group.conditions.length === 0) {
                this.rules.splice(groupIndex, 1);
            }

            this.render();
            this._triggerChange();
        }

        /**
         * Handle attribute change
         * @param {number} groupIndex - Group index
         * @param {number} condIndex - Condition index
         * @param {string} attribute - New attribute
         */
        _handleAttributeChange(groupIndex, condIndex, attribute) {
            const condition = this.rules[groupIndex].conditions[condIndex];
            condition.attribute = attribute;

            // Reset operator and value when attribute changes
            const attr = this.availableAttributes.find(a => a.name === attribute);
            if (attr) {
                const operators = this.operators[attr.type];
                condition.operator = operators[0].value;
                condition.value = '';
            }

            this.render();
            this._triggerChange();
        }

        /**
         * Handle value change
         * @param {HTMLElement} input - Input element
         */
        _handleValueChange(input) {
            const groupIndex = parseInt(input.dataset.group);
            const condIndex = parseInt(input.dataset.condition);
            const condition = this.rules[groupIndex].conditions[condIndex];

            if (input.dataset.part) {
                // Complex value (range, duration)
                if (!condition.value || typeof condition.value !== 'object') {
                    condition.value = {};
                }
                condition.value[input.dataset.part] = input.value;
            } else {
                // Simple value
                condition.value = input.value;
                
                // Handle list values
                if (condition.operator === 'in' || condition.operator === 'notIn') {
                    condition.value = input.value.split(',').map(v => v.trim()).filter(v => v);
                }
            }

            this._triggerChange();
        }

        /**
         * Run test
         */
        _runTest() {
            // Collect test context
            this.testContext = {};
            this.availableAttributes.forEach(attr => {
                const input = this.container.querySelector(`#test-${attr.name}`);
                if (input && input.value) {
                    try {
                        if (attr.type === 'number') {
                            this.testContext[attr.name] = parseFloat(input.value);
                        } else if (attr.type === 'object') {
                            this.testContext[attr.name] = JSON.parse(input.value);
                        } else {
                            this.testContext[attr.name] = input.value;
                        }
                    } catch (e) {
                        // Invalid value
                    }
                }
            });

            // Evaluate rules
            const results = this._evaluateAllRules(this.testContext);

            // Display results
            this._displayTestResults(results);
        }

        /**
         * Clear test
         */
        _clearTest() {
            this.testContext = {};
            this.container.querySelectorAll('.test-input').forEach(input => {
                input.value = '';
            });
            
            const resultsDiv = this.container.querySelector('#test-results');
            if (resultsDiv) {
                resultsDiv.style.display = 'none';
            }
        }

        /**
         * Display test results
         * @param {Object} results - Test results
         */
        _displayTestResults(results) {
            const resultsDiv = this.container.querySelector('#test-results');
            const resultsContent = resultsDiv.querySelector('.results-content');
            
            resultsContent.innerHTML = `
                <div class="overall-result ${results.finalResult ? 'match' : 'no-match'}">
                    <i class="icon-${results.finalResult ? 'check' : 'x'}"></i>
                    <span>Final Result: <strong>${results.finalResult}</strong></span>
                </div>
                
                <div class="rule-evaluations">
                    ${results.groupResults.map((result, index) => `
                        <div class="group-result ${result.matched ? 'matched' : 'not-matched'}">
                            <h6>Rule Group ${index + 1}</h6>
                            <div class="conditions-results">
                                ${result.conditions.map((cond, condIndex) => `
                                    <div class="condition-result">
                                        <span class="condition-text">
                                            ${cond.attribute} ${cond.operator} ${this._formatValue(cond.value)}
                                        </span>
                                        <span class="condition-status ${cond.result ? 'true' : 'false'}">
                                            ${cond.result}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="group-summary">
                                Logic: ${this.rules[index].logic}, 
                                Result: ${result.matched}, 
                                Return: ${result.returnValue}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            resultsDiv.style.display = 'block';
        }

        /**
         * Evaluate all rules
         * @param {Object} context - Evaluation context
         * @returns {Object} Results
         */
        _evaluateAllRules(context) {
            const groupResults = this.rules.map(group => {
                const conditionResults = group.conditions.map(condition => ({
                    ...condition,
                    result: this._evaluateCondition(condition, context)
                }));

                const matched = group.logic === 'AND' 
                    ? conditionResults.every(c => c.result)
                    : conditionResults.some(c => c.result);

                return {
                    conditions: conditionResults,
                    matched,
                    returnValue: matched ? group.returnValue : null
                };
            });

            // Find first matching group
            const matchingGroup = groupResults.find(g => g.matched);
            const finalResult = matchingGroup ? matchingGroup.returnValue : false;

            return {
                groupResults,
                finalResult
            };
        }

        /**
         * Evaluate single condition
         * @param {Object} condition - Condition to evaluate
         * @param {Object} context - Evaluation context
         * @returns {boolean} Result
         */
        _evaluateCondition(condition, context) {
            const value = context[condition.attribute];
            const targetValue = condition.value;

            switch (condition.operator) {
                case 'equals':
                    return value === targetValue;
                case 'notEquals':
                    return value !== targetValue;
                case 'contains':
                    return String(value).includes(targetValue);
                case 'notContains':
                    return !String(value).includes(targetValue);
                case 'startsWith':
                    return String(value).startsWith(targetValue);
                case 'endsWith':
                    return String(value).endsWith(targetValue);
                case 'in':
                    return Array.isArray(targetValue) && targetValue.includes(value);
                case 'notIn':
                    return Array.isArray(targetValue) && !targetValue.includes(value);
                case 'greaterThan':
                    return parseFloat(value) > parseFloat(targetValue);
                case 'greaterThanOrEqual':
                    return parseFloat(value) >= parseFloat(targetValue);
                case 'lessThan':
                    return parseFloat(value) < parseFloat(targetValue);
                case 'lessThanOrEqual':
                    return parseFloat(value) <= parseFloat(targetValue);
                case 'between':
                    const num = parseFloat(value);
                    return num >= parseFloat(targetValue.min) && num <= parseFloat(targetValue.max);
                case 'matches':
                    try {
                        return new RegExp(targetValue).test(value);
                    } catch (e) {
                        return false;
                    }
                default:
                    return false;
            }
        }

        /**
         * Detect rule conflicts
         * @returns {Array} Conflicts
         */
        _detectConflicts() {
            const conflicts = [];

            // Check for overlapping conditions
            for (let i = 0; i < this.rules.length; i++) {
                for (let j = i + 1; j < this.rules.length; j++) {
                    const group1 = this.rules[i];
                    const group2 = this.rules[j];

                    // Same conditions but different return values
                    if (this._areGroupsSimilar(group1, group2) && 
                        group1.returnValue !== group2.returnValue) {
                        conflicts.push({
                            type: 'contradiction',
                            groups: [i, j],
                            description: `Groups ${i + 1} and ${j + 1} have similar conditions but opposite return values`
                        });
                    }
                }
            }

            return conflicts;
        }

        /**
         * Check if two groups are similar
         * @param {Object} group1 - First group
         * @param {Object} group2 - Second group
         * @returns {boolean} Are similar
         */
        _areGroupsSimilar(group1, group2) {
            if (group1.conditions.length !== group2.conditions.length) {
                return false;
            }

            // Check if conditions are similar
            return group1.conditions.every(cond1 => 
                group2.conditions.some(cond2 => 
                    cond1.attribute === cond2.attribute &&
                    cond1.operator === cond2.operator &&
                    JSON.stringify(cond1.value) === JSON.stringify(cond2.value)
                )
            );
        }

        /**
         * Calculate estimated coverage
         * @returns {number} Coverage percentage
         */
        _calculateCoverage() {
            // This is a simplified estimation
            const hasDefaultRule = this.rules.some(group => 
                group.conditions.length === 0 || 
                group.conditions.every(c => !c.attribute)
            );

            if (hasDefaultRule) return 100;

            // Estimate based on number of conditions
            const conditionCount = this._countConditions();
            return Math.min(95, conditionCount * 15);
        }

        /**
         * Count total conditions
         * @returns {number} Total conditions
         */
        _countConditions() {
            return this.rules.reduce((total, group) => 
                total + (group.conditions ? group.conditions.length : 0), 0
            );
        }

        /**
         * Import rules from JSON
         */
        _importRules() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const rules = JSON.parse(e.target.result);
                        this.rules = rules;
                        this.render();
                        this._triggerChange();
                        KC.Logger.info('Rules imported successfully');
                    } catch (error) {
                        alert('Invalid JSON file');
                    }
                };
                reader.readAsText(file);
            });

            input.click();
        }

        /**
         * Export rules to JSON
         */
        _exportRules() {
            const blob = new Blob([JSON.stringify(this.rules, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'targeting-rules.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * Format value for display
         * @param {*} value - Value to format
         * @param {Object} attribute - Attribute config
         * @returns {string} Formatted value
         */
        _formatValue(value, attribute) {
            if (value === null || value === undefined) return 'null';
            
            if (Array.isArray(value)) {
                return `[${value.join(', ')}]`;
            }
            
            if (typeof value === 'object') {
                if (value.min !== undefined && value.max !== undefined) {
                    return `${value.min} - ${value.max}`;
                }
                if (value.start !== undefined && value.end !== undefined) {
                    return `${value.start} - ${value.end}`;
                }
                if (value.value !== undefined && value.unit !== undefined) {
                    return `${value.value} ${value.unit}`;
                }
                return JSON.stringify(value);
            }
            
            return String(value);
        }

        /**
         * Trigger change event
         */
        _triggerChange() {
            if (this.onChange) {
                this.onChange(this.rules);
            }

            // Update summary
            const summaryContainer = this.container.querySelector('.rules-summary');
            if (summaryContainer) {
                summaryContainer.innerHTML = this._renderSummary();
            }
        }

        /**
         * Optimize rules
         * @returns {Array} Optimized rules
         */
        _optimizeRules() {
            // Remove empty groups
            const optimized = this.rules.filter(group => 
                group.conditions && group.conditions.length > 0
            );

            // Merge similar groups
            // TODO: Implement rule merging logic

            return optimized;
        }

        /**
         * Get rules
         * @returns {Array} Current rules
         */
        getRules() {
            return this.rules;
        }

        /**
         * Destroy component
         */
        destroy() {
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    // Export to KC namespace and make some methods globally accessible
    window.KC = window.KC || {};
    window.KC.TargetingRules = TargetingRules;

    // Static methods for inline handlers
    window.KC.TargetingRules.toggleLogic = function(groupIndex) {
        // This will be handled by the instance
        const event = new CustomEvent('targeting-rules-action', {
            detail: { action: 'toggleLogic', groupIndex }
        });
        document.dispatchEvent(event);
    };

    window.KC.TargetingRules.removeGroup = function(groupIndex) {
        // This will be handled by the instance
        const event = new CustomEvent('targeting-rules-action', {
            detail: { action: 'removeGroup', groupIndex }
        });
        document.dispatchEvent(event);
    };

})(window);