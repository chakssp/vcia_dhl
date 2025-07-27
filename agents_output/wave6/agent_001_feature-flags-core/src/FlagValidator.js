/**
 * FlagValidator.js - Validation logic for ML feature flags
 * 
 * Provides comprehensive validation for flag configurations including:
 * - Schema validation
 * - Type checking
 * - Dependency validation
 * - Cycle detection
 * - Value range validation
 * 
 * @module FlagValidator
 */

export class FlagValidator {
    constructor() {
        this.validationRules = this._initializeValidationRules();
        this.logger = this._createLogger();
    }

    /**
     * Initialize validation rules for different flag types
     */
    _initializeValidationRules() {
        return {
            boolean: {
                validate: (value) => typeof value === 'boolean',
                normalize: (value) => Boolean(value),
                errorMessage: 'Value must be a boolean'
            },
            percentage: {
                validate: (value) => typeof value === 'number' && value >= 0 && value <= 100,
                normalize: (value) => Math.max(0, Math.min(100, Number(value))),
                errorMessage: 'Value must be a number between 0 and 100'
            },
            targeting: {
                validate: (value) => {
                    if (!value || typeof value !== 'object') return false;
                    return value.rules && Array.isArray(value.rules);
                },
                normalize: (value) => value,
                errorMessage: 'Value must be an object with rules array'
            },
            variant: {
                validate: (value) => {
                    if (!value || typeof value !== 'object') return false;
                    return value.variants && Array.isArray(value.variants) && 
                           value.weights && Array.isArray(value.weights);
                },
                normalize: (value) => value,
                errorMessage: 'Value must have variants and weights arrays'
            }
        };
    }

    /**
     * Create logger instance
     */
    _createLogger() {
        return {
            info: (msg, data) => console.log(`[FlagValidator] ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`[FlagValidator] ${msg}`, data || ''),
            error: (msg, data) => console.error(`[FlagValidator] ${msg}`, data || '')
        };
    }

    /**
     * Validate a single flag configuration
     * @param {string} flagKey - Flag identifier
     * @param {Object} flagConfig - Flag configuration object
     * @returns {Object} Validation result with isValid and errors
     */
    validateFlag(flagKey, flagConfig) {
        const errors = [];
        
        // Validate required fields
        if (!flagKey || typeof flagKey !== 'string') {
            errors.push('Flag key must be a non-empty string');
        }
        
        if (!flagConfig || typeof flagConfig !== 'object') {
            errors.push('Flag configuration must be an object');
            return { isValid: false, errors };
        }

        // Validate flag type
        if (!flagConfig.type || !this.validationRules[flagConfig.type]) {
            errors.push(`Invalid flag type: ${flagConfig.type}. Must be one of: ${Object.keys(this.validationRules).join(', ')}`);
        }

        // Validate description
        if (!flagConfig.description || typeof flagConfig.description !== 'string') {
            errors.push('Flag must have a description string');
        }

        // Validate value based on type
        if (flagConfig.type && this.validationRules[flagConfig.type]) {
            const rule = this.validationRules[flagConfig.type];
            if (flagConfig.value !== undefined && !rule.validate(flagConfig.value)) {
                errors.push(rule.errorMessage);
            }
        }

        // Validate dependencies
        if (flagConfig.dependencies) {
            const depErrors = this._validateDependencies(flagConfig.dependencies);
            errors.push(...depErrors);
        }

        // Validate metadata
        if (flagConfig.metadata && typeof flagConfig.metadata !== 'object') {
            errors.push('Metadata must be an object');
        }

        const isValid = errors.length === 0;
        
        if (!isValid) {
            this.logger.warn(`Validation failed for flag ${flagKey}:`, errors);
        }

        return { isValid, errors };
    }

    /**
     * Validate dependencies array
     */
    _validateDependencies(dependencies) {
        const errors = [];
        
        if (!Array.isArray(dependencies)) {
            errors.push('Dependencies must be an array');
            return errors;
        }

        dependencies.forEach((dep, index) => {
            if (!dep.flag || typeof dep.flag !== 'string') {
                errors.push(`Dependency ${index}: must have a flag property`);
            }
            if (dep.value === undefined) {
                errors.push(`Dependency ${index}: must have a value property`);
            }
            if (dep.operator && !['equals', 'not_equals', 'greater_than', 'less_than'].includes(dep.operator)) {
                errors.push(`Dependency ${index}: invalid operator ${dep.operator}`);
            }
        });

        return errors;
    }

    /**
     * Validate entire flag collection
     * @param {Object} flags - Collection of flags
     * @returns {Object} Validation result
     */
    validateCollection(flags) {
        const results = {
            isValid: true,
            errors: {},
            warnings: []
        };

        if (!flags || typeof flags !== 'object') {
            results.isValid = false;
            results.errors.general = ['Flags must be an object'];
            return results;
        }

        // Validate each flag
        Object.entries(flags).forEach(([key, config]) => {
            const validation = this.validateFlag(key, config);
            if (!validation.isValid) {
                results.isValid = false;
                results.errors[key] = validation.errors;
            }
        });

        // Check for dependency cycles
        const cycles = this._detectDependencyCycles(flags);
        if (cycles.length > 0) {
            results.isValid = false;
            results.errors.cycles = cycles.map(cycle => 
                `Circular dependency detected: ${cycle.join(' -> ')}`
            );
        }

        // Check for missing dependencies
        const missing = this._findMissingDependencies(flags);
        if (missing.length > 0) {
            results.warnings.push(...missing.map(m => 
                `Flag ${m.flag} depends on non-existent flag ${m.dependency}`
            ));
        }

        return results;
    }

    /**
     * Detect circular dependencies using DFS
     */
    _detectDependencyCycles(flags) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycle = (flag, path = []) => {
            if (recursionStack.has(flag)) {
                const cycleStart = path.indexOf(flag);
                cycles.push([...path.slice(cycleStart), flag]);
                return true;
            }

            if (visited.has(flag)) {
                return false;
            }

            visited.add(flag);
            recursionStack.add(flag);
            path.push(flag);

            const config = flags[flag];
            if (config && config.dependencies) {
                for (const dep of config.dependencies) {
                    if (hasCycle(dep.flag, [...path])) {
                        return true;
                    }
                }
            }

            recursionStack.delete(flag);
            return false;
        };

        Object.keys(flags).forEach(flag => {
            if (!visited.has(flag)) {
                hasCycle(flag);
            }
        });

        return cycles;
    }

    /**
     * Find missing dependencies
     */
    _findMissingDependencies(flags) {
        const missing = [];
        const flagKeys = new Set(Object.keys(flags));

        Object.entries(flags).forEach(([flag, config]) => {
            if (config.dependencies) {
                config.dependencies.forEach(dep => {
                    if (!flagKeys.has(dep.flag)) {
                        missing.push({ flag, dependency: dep.flag });
                    }
                });
            }
        });

        return missing;
    }

    /**
     * Validate targeting rules
     */
    validateTargetingRules(rules) {
        const errors = [];

        if (!Array.isArray(rules)) {
            errors.push('Targeting rules must be an array');
            return { isValid: false, errors };
        }

        rules.forEach((rule, index) => {
            if (!rule.attribute || typeof rule.attribute !== 'string') {
                errors.push(`Rule ${index}: must have an attribute property`);
            }
            if (!rule.operator || !['equals', 'contains', 'regex', 'in', 'not_in'].includes(rule.operator)) {
                errors.push(`Rule ${index}: invalid operator ${rule.operator}`);
            }
            if (rule.value === undefined) {
                errors.push(`Rule ${index}: must have a value property`);
            }
        });

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Normalize flag value based on type
     */
    normalizeValue(type, value) {
        const rule = this.validationRules[type];
        if (!rule) {
            throw new Error(`Unknown flag type: ${type}`);
        }
        return rule.normalize(value);
    }

    /**
     * Validate flag update
     */
    validateUpdate(currentConfig, updates) {
        const errors = [];

        // Check if type change is allowed
        if (updates.type && updates.type !== currentConfig.type) {
            errors.push('Flag type cannot be changed after creation');
        }

        // Validate new value if provided
        if (updates.value !== undefined) {
            const type = updates.type || currentConfig.type;
            const rule = this.validationRules[type];
            if (rule && !rule.validate(updates.value)) {
                errors.push(rule.errorMessage);
            }
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Export validation schema for documentation
     */
    getSchema() {
        return {
            flagConfig: {
                type: 'object',
                required: ['type', 'description', 'value'],
                properties: {
                    type: {
                        type: 'string',
                        enum: Object.keys(this.validationRules)
                    },
                    description: { type: 'string' },
                    value: { type: 'any' },
                    dependencies: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['flag', 'value'],
                            properties: {
                                flag: { type: 'string' },
                                value: { type: 'any' },
                                operator: {
                                    type: 'string',
                                    enum: ['equals', 'not_equals', 'greater_than', 'less_than']
                                }
                            }
                        }
                    },
                    metadata: { type: 'object' }
                }
            }
        };
    }
}

// Export singleton instance
export default new FlagValidator();