/**
 * StateValidator.js - Validation utility for ML state data
 * 
 * Provides comprehensive validation for ML state structures, ensuring
 * data integrity and type safety throughout the state management lifecycle.
 */

class StateValidator {
    constructor() {
        // Define validation schemas
        this._initializeSchemas();
        
        // Validation cache for performance
        this.validationCache = new Map();
        this.cacheMaxSize = 100;
    }
    
    /**
     * Initialize validation schemas
     * @private
     */
    _initializeSchemas() {
        this.schemas = {
            confidence: {
                score: { type: 'number', min: 0, max: 1, required: true },
                timestamp: { type: 'string', format: 'iso8601' },
                metadata: { type: 'object' },
                history: { 
                    type: 'array', 
                    items: {
                        score: { type: 'number', min: 0, max: 1 },
                        timestamp: { type: 'string', format: 'iso8601' }
                    }
                }
            },
            
            analysis: {
                fileId: { type: 'string', required: true },
                type: { type: 'string', required: true },
                model: { type: 'string' },
                result: { type: 'object' },
                confidence: { type: 'number', min: 0, max: 1 },
                processingTime: { type: 'number', min: 0 },
                timestamp: { type: 'string', format: 'iso8601' }
            },
            
            embedding: {
                fileId: { type: 'string', required: true },
                vector: { type: 'array', items: { type: 'number' } },
                model: { type: 'string' },
                dimension: { type: 'integer', min: 1 },
                timestamp: { type: 'string', format: 'iso8601' }
            },
            
            model: {
                id: { type: 'string', required: true },
                name: { type: 'string' },
                type: { type: 'string', enum: ['embedding', 'llm', 'classifier'] },
                version: { type: 'string' },
                capabilities: { type: 'array', items: { type: 'string' } }
            },
            
            feedback: {
                fileId: { type: 'string' },
                type: { type: 'string', enum: ['positive', 'negative', 'correction'] },
                content: { type: 'string' },
                preference: { type: 'object' },
                timestamp: { type: 'string', format: 'iso8601' }
            }
        };
        
        // Type validators
        this.typeValidators = {
            string: (value) => typeof value === 'string',
            number: (value) => typeof value === 'number' && !isNaN(value),
            integer: (value) => Number.isInteger(value),
            boolean: (value) => typeof value === 'boolean',
            object: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
            array: (value) => Array.isArray(value),
            null: (value) => value === null,
            undefined: (value) => value === undefined
        };
        
        // Format validators
        this.formatValidators = {
            iso8601: (value) => {
                if (typeof value !== 'string') return false;
                const date = new Date(value);
                return !isNaN(date.getTime()) && date.toISOString() === value;
            },
            
            email: (value) => {
                const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return regex.test(value);
            },
            
            url: (value) => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            
            uuid: (value) => {
                const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return regex.test(value);
            }
        };
    }
    
    /**
     * Validate ML data against schema
     * @param {string} schemaName - Schema to validate against
     * @param {*} data - Data to validate
     * @returns {Object} Validation result
     */
    validateMLData(schemaName, data) {
        // Check cache
        const cacheKey = `${schemaName}:${JSON.stringify(data)}`;
        if (this.validationCache.has(cacheKey)) {
            return this.validationCache.get(cacheKey);
        }
        
        const schema = this.schemas[schemaName];
        if (!schema) {
            return {
                valid: false,
                error: `Unknown schema: ${schemaName}`,
                path: 'root'
            };
        }
        
        const result = this._validateAgainstSchema(data, schema, schemaName);
        
        // Cache result
        this._cacheResult(cacheKey, result);
        
        return result;
    }
    
    /**
     * Validate state structure
     * @param {Object} state - State object to validate
     * @param {string} version - Expected version
     * @returns {Object} Validation result
     */
    validateStateStructure(state, version = '2.0.0') {
        const errors = [];
        
        // Check version
        if (state.version !== version) {
            errors.push({
                path: 'version',
                error: `Expected version ${version}, got ${state.version}`
            });
        }
        
        // Check required top-level properties
        const requiredProps = ['confidence', 'models', 'analysis', 'embeddings', 'config', 'metadata'];
        requiredProps.forEach(prop => {
            if (!state[prop]) {
                errors.push({
                    path: prop,
                    error: `Missing required property: ${prop}`
                });
            }
        });
        
        // Validate confidence structure
        if (state.confidence) {
            const confValidation = this._validateConfidenceStructure(state.confidence);
            errors.push(...confValidation);
        }
        
        // Validate analysis structure
        if (state.analysis) {
            const analysisValidation = this._validateAnalysisStructure(state.analysis);
            errors.push(...analysisValidation);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            summary: `${errors.length} validation errors found`
        };
    }
    
    /**
     * Validate ML import data
     * @param {Object} importData - Data to import
     * @returns {Object} Validation result
     */
    validateMLImport(importData) {
        const errors = [];
        
        // Check required properties
        if (!importData.version) {
            errors.push({
                path: 'version',
                error: 'Missing version in import data'
            });
        }
        
        if (!importData.state && !importData.ml) {
            errors.push({
                path: 'state',
                error: 'Missing state data in import'
            });
        }
        
        // Extract state
        const state = importData.state || importData.ml?.state;
        
        if (state) {
            // Validate state structure
            const structureValidation = this.validateStateStructure(state, importData.version);
            if (!structureValidation.valid) {
                errors.push(...structureValidation.errors);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings: this._checkImportWarnings(importData)
        };
    }
    
    /**
     * Validate confidence score
     * @param {number} score - Confidence score
     * @returns {Object} Validation result
     */
    validateConfidenceScore(score) {
        if (typeof score !== 'number') {
            return { valid: false, error: 'Confidence score must be a number' };
        }
        
        if (score < 0 || score > 1) {
            return { valid: false, error: 'Confidence score must be between 0 and 1' };
        }
        
        if (isNaN(score)) {
            return { valid: false, error: 'Confidence score cannot be NaN' };
        }
        
        return { valid: true };
    }
    
    /**
     * Validate embedding vector
     * @param {Array} vector - Embedding vector
     * @param {number} expectedDimension - Expected dimension
     * @returns {Object} Validation result
     */
    validateEmbedding(vector, expectedDimension = null) {
        if (!Array.isArray(vector)) {
            return { valid: false, error: 'Embedding must be an array' };
        }
        
        if (expectedDimension && vector.length !== expectedDimension) {
            return { 
                valid: false, 
                error: `Expected dimension ${expectedDimension}, got ${vector.length}` 
            };
        }
        
        // Check all elements are numbers
        for (let i = 0; i < vector.length; i++) {
            if (typeof vector[i] !== 'number' || isNaN(vector[i])) {
                return { 
                    valid: false, 
                    error: `Invalid element at index ${i}: must be a number` 
                };
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Sanitize ML data before storage
     * @param {*} data - Data to sanitize
     * @param {Object} options - Sanitization options
     * @returns {*} Sanitized data
     */
    sanitizeMLData(data, options = {}) {
        const {
            removeNull = false,
            removeUndefined = true,
            trimStrings = true,
            maxStringLength = 10000,
            maxArrayLength = 1000,
            maxObjectDepth = 10
        } = options;
        
        return this._sanitizeValue(data, {
            removeNull,
            removeUndefined,
            trimStrings,
            maxStringLength,
            maxArrayLength,
            maxObjectDepth,
            currentDepth: 0
        });
    }
    
    /**
     * Create validation schema from example data
     * @param {Object} exampleData - Example data to derive schema from
     * @returns {Object} Generated schema
     */
    generateSchema(exampleData) {
        return this._generateSchemaFromValue(exampleData);
    }
    
    // Private helper methods
    
    /**
     * Validate against schema
     * @private
     */
    _validateAgainstSchema(data, schema, path = '') {
        const errors = [];
        
        // Check each schema property
        Object.entries(schema).forEach(([key, rules]) => {
            const value = data?.[key];
            const currentPath = path ? `${path}.${key}` : key;
            
            // Check required
            if (rules.required && (value === undefined || value === null)) {
                errors.push({
                    path: currentPath,
                    error: 'Required field missing'
                });
                return;
            }
            
            // Skip if not required and not present
            if (value === undefined || value === null) return;
            
            // Check type
            if (rules.type && !this._validateType(value, rules.type)) {
                errors.push({
                    path: currentPath,
                    error: `Expected type ${rules.type}, got ${typeof value}`
                });
                return;
            }
            
            // Check constraints
            const constraintErrors = this._validateConstraints(value, rules, currentPath);
            errors.push(...constraintErrors);
            
            // Validate nested objects
            if (rules.type === 'object' && rules.properties) {
                const nestedValidation = this._validateAgainstSchema(
                    value, 
                    rules.properties, 
                    currentPath
                );
                if (!nestedValidation.valid) {
                    errors.push(...nestedValidation.errors);
                }
            }
            
            // Validate array items
            if (rules.type === 'array' && rules.items && Array.isArray(value)) {
                value.forEach((item, index) => {
                    const itemPath = `${currentPath}[${index}]`;
                    const itemValidation = this._validateAgainstSchema(
                        item,
                        rules.items,
                        itemPath
                    );
                    if (!itemValidation.valid) {
                        errors.push(...itemValidation.errors);
                    }
                });
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    
    /**
     * Validate type
     * @private
     */
    _validateType(value, type) {
        const validator = this.typeValidators[type];
        return validator ? validator(value) : true;
    }
    
    /**
     * Validate constraints
     * @private
     */
    _validateConstraints(value, rules, path) {
        const errors = [];
        
        // Min/Max for numbers
        if (typeof value === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                errors.push({
                    path,
                    error: `Value ${value} is less than minimum ${rules.min}`
                });
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push({
                    path,
                    error: `Value ${value} is greater than maximum ${rules.max}`
                });
            }
        }
        
        // Length constraints
        if (rules.minLength !== undefined || rules.maxLength !== undefined) {
            const length = value?.length || 0;
            if (rules.minLength !== undefined && length < rules.minLength) {
                errors.push({
                    path,
                    error: `Length ${length} is less than minimum ${rules.minLength}`
                });
            }
            if (rules.maxLength !== undefined && length > rules.maxLength) {
                errors.push({
                    path,
                    error: `Length ${length} is greater than maximum ${rules.maxLength}`
                });
            }
        }
        
        // Enum constraint
        if (rules.enum && !rules.enum.includes(value)) {
            errors.push({
                path,
                error: `Value must be one of: ${rules.enum.join(', ')}`
            });
        }
        
        // Format constraint
        if (rules.format) {
            const formatValidator = this.formatValidators[rules.format];
            if (formatValidator && !formatValidator(value)) {
                errors.push({
                    path,
                    error: `Invalid format for ${rules.format}`
                });
            }
        }
        
        // Pattern constraint
        if (rules.pattern) {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(value)) {
                errors.push({
                    path,
                    error: `Value does not match pattern ${rules.pattern}`
                });
            }
        }
        
        return errors;
    }
    
    /**
     * Validate confidence structure
     * @private
     */
    _validateConfidenceStructure(confidence) {
        const errors = [];
        
        // Check global confidence
        if (!confidence.global) {
            errors.push({
                path: 'confidence.global',
                error: 'Missing global confidence'
            });
        } else {
            if (typeof confidence.global.score !== 'number') {
                errors.push({
                    path: 'confidence.global.score',
                    error: 'Global confidence score must be a number'
                });
            }
        }
        
        // Check thresholds
        if (!confidence.thresholds) {
            errors.push({
                path: 'confidence.thresholds',
                error: 'Missing confidence thresholds'
            });
        }
        
        return errors;
    }
    
    /**
     * Validate analysis structure
     * @private
     */
    _validateAnalysisStructure(analysis) {
        const errors = [];
        
        // Check required properties
        const required = ['queue', 'processing', 'completed', 'failed', 'statistics'];
        required.forEach(prop => {
            if (analysis[prop] === undefined) {
                errors.push({
                    path: `analysis.${prop}`,
                    error: `Missing required property: ${prop}`
                });
            }
        });
        
        // Validate queue is array
        if (analysis.queue && !Array.isArray(analysis.queue)) {
            errors.push({
                path: 'analysis.queue',
                error: 'Queue must be an array'
            });
        }
        
        return errors;
    }
    
    /**
     * Check import warnings
     * @private
     */
    _checkImportWarnings(importData) {
        const warnings = [];
        
        // Check version compatibility
        if (importData.version) {
            const importVersion = this._parseVersion(importData.version);
            const currentVersion = this._parseVersion('2.0.0');
            
            if (importVersion.major < currentVersion.major) {
                warnings.push({
                    type: 'version',
                    message: 'Importing older major version - migration may be needed'
                });
            }
        }
        
        // Check data size
        const dataSize = JSON.stringify(importData).length;
        if (dataSize > 1024 * 1024) { // 1MB
            warnings.push({
                type: 'size',
                message: `Large import data: ${(dataSize / 1024 / 1024).toFixed(2)}MB`
            });
        }
        
        return warnings;
    }
    
    /**
     * Parse version string
     * @private
     */
    _parseVersion(version) {
        const parts = version.split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
        };
    }
    
    /**
     * Sanitize value recursively
     * @private
     */
    _sanitizeValue(value, options) {
        // Handle depth limit
        if (options.currentDepth > options.maxObjectDepth) {
            return '[Max depth exceeded]';
        }
        
        // Handle null/undefined
        if (value === null && options.removeNull) return undefined;
        if (value === undefined && options.removeUndefined) return undefined;
        if (value === null || value === undefined) return value;
        
        // Handle strings
        if (typeof value === 'string') {
            let sanitized = value;
            if (options.trimStrings) {
                sanitized = sanitized.trim();
            }
            if (sanitized.length > options.maxStringLength) {
                sanitized = sanitized.substring(0, options.maxStringLength) + '...';
            }
            return sanitized;
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
            let sanitized = value.map(item => 
                this._sanitizeValue(item, { ...options, currentDepth: options.currentDepth + 1 })
            );
            
            if (options.removeUndefined) {
                sanitized = sanitized.filter(item => item !== undefined);
            }
            
            if (sanitized.length > options.maxArrayLength) {
                sanitized = sanitized.slice(0, options.maxArrayLength);
                sanitized.push('[Truncated]');
            }
            
            return sanitized;
        }
        
        // Handle objects
        if (typeof value === 'object') {
            const sanitized = {};
            
            Object.entries(value).forEach(([key, val]) => {
                const sanitizedValue = this._sanitizeValue(val, {
                    ...options,
                    currentDepth: options.currentDepth + 1
                });
                
                if (!(sanitizedValue === undefined && options.removeUndefined)) {
                    sanitized[key] = sanitizedValue;
                }
            });
            
            return sanitized;
        }
        
        // Return primitives as-is
        return value;
    }
    
    /**
     * Generate schema from value
     * @private
     */
    _generateSchemaFromValue(value, path = '') {
        if (value === null || value === undefined) {
            return { type: 'null', required: false };
        }
        
        const type = Array.isArray(value) ? 'array' : typeof value;
        const schema = { type };
        
        switch (type) {
            case 'object':
                schema.properties = {};
                Object.entries(value).forEach(([key, val]) => {
                    schema.properties[key] = this._generateSchemaFromValue(val, `${path}.${key}`);
                });
                break;
                
            case 'array':
                if (value.length > 0) {
                    // Assume all array items have same schema (use first item)
                    schema.items = this._generateSchemaFromValue(value[0], `${path}[0]`);
                }
                schema.minLength = 0;
                schema.maxLength = value.length * 2; // Allow some growth
                break;
                
            case 'string':
                schema.minLength = 0;
                schema.maxLength = Math.max(value.length * 2, 100);
                // Try to detect format
                if (this.formatValidators.iso8601(value)) {
                    schema.format = 'iso8601';
                } else if (this.formatValidators.email(value)) {
                    schema.format = 'email';
                } else if (this.formatValidators.url(value)) {
                    schema.format = 'url';
                } else if (this.formatValidators.uuid(value)) {
                    schema.format = 'uuid';
                }
                break;
                
            case 'number':
                schema.min = value - Math.abs(value);
                schema.max = value + Math.abs(value);
                if (Number.isInteger(value)) {
                    schema.type = 'integer';
                }
                break;
        }
        
        return schema;
    }
    
    /**
     * Cache validation result
     * @private
     */
    _cacheResult(key, result) {
        this.validationCache.set(key, result);
        
        // Limit cache size
        if (this.validationCache.size > this.cacheMaxSize) {
            const firstKey = this.validationCache.keys().next().value;
            this.validationCache.delete(firstKey);
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateValidator;
} else if (typeof window !== 'undefined') {
    window.StateValidator = StateValidator;
}