/**
 * ConfidenceValidator - Validates ML confidence scores and thresholds
 * Basic implementation for ML confidence validation
 * 
 * Features:
 * - Score validation and normalization
 * - Threshold checking
 * - Convergence detection
 * - Validation rules enforcement
 */

class ConfidenceValidator {
    constructor(config = {}) {
        this.config = {
            minConfidence: config.minConfidence || 0,
            maxConfidence: config.maxConfidence || 1,
            convergenceThreshold: config.convergenceThreshold || 0.85,
            improvementThreshold: config.improvementThreshold || 0.02,
            stagnationThreshold: config.stagnationThreshold || 0.01,
            minHistoryLength: config.minHistoryLength || 3,
            ...config
        };
        
        // Validation rules
        this.rules = {
            scoreRange: this.validateScoreRange.bind(this),
            dimensionsPresent: this.validateDimensionsPresent.bind(this),
            historyConsistency: this.validateHistoryConsistency.bind(this),
            convergenceCriteria: this.validateConvergenceCriteria.bind(this)
        };
    }

    /**
     * Validate a confidence score
     * @param {Object} confidence - Confidence object to validate
     * @returns {Object} Validation result
     */
    validate(confidence) {
        const errors = [];
        const warnings = [];
        
        // Check if confidence object exists
        if (!confidence || typeof confidence !== 'object') {
            return {
                valid: false,
                errors: ['Invalid confidence object'],
                warnings: [],
                normalized: null
            };
        }

        // Run validation rules
        for (const [ruleName, ruleFunc] of Object.entries(this.rules)) {
            const result = ruleFunc(confidence);
            if (!result.valid) {
                errors.push(...(result.errors || []));
            }
            warnings.push(...(result.warnings || []));
        }

        // Normalize confidence if valid
        const normalized = errors.length === 0 ? this.normalize(confidence) : null;

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            normalized
        };
    }

    /**
     * Validate score range
     * @private
     */
    validateScoreRange(confidence) {
        const errors = [];
        const warnings = [];

        // Check overall score
        if (typeof confidence.overall !== 'number') {
            errors.push('Overall score must be a number');
        } else if (confidence.overall < this.config.minConfidence || 
                   confidence.overall > this.config.maxConfidence) {
            errors.push(`Overall score ${confidence.overall} out of range [${this.config.minConfidence}, ${this.config.maxConfidence}]`);
        }

        // Check dimension scores if present
        if (confidence.dimensions) {
            for (const [dimension, score] of Object.entries(confidence.dimensions)) {
                if (typeof score !== 'number') {
                    errors.push(`Dimension ${dimension} score must be a number`);
                } else if (score < this.config.minConfidence || 
                           score > this.config.maxConfidence) {
                    warnings.push(`Dimension ${dimension} score ${score} out of range`);
                }
            }
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Validate dimensions are present
     * @private
     */
    validateDimensionsPresent(confidence) {
        const errors = [];
        const warnings = [];
        const requiredDimensions = ['semantic', 'categorical', 'structural', 'temporal'];

        if (!confidence.dimensions) {
            warnings.push('No dimensions object present');
        } else {
            for (const dimension of requiredDimensions) {
                if (!(dimension in confidence.dimensions)) {
                    warnings.push(`Missing dimension: ${dimension}`);
                }
            }
        }

        return { valid: true, errors, warnings };
    }

    /**
     * Validate history consistency
     * @private
     */
    validateHistoryConsistency(confidence) {
        const errors = [];
        const warnings = [];

        if (confidence.history && Array.isArray(confidence.history)) {
            // Check for consistent structure
            for (let i = 0; i < confidence.history.length; i++) {
                const entry = confidence.history[i];
                if (!entry.overall || !entry.timestamp) {
                    warnings.push(`History entry ${i} missing required fields`);
                }
            }

            // Check for chronological order
            for (let i = 1; i < confidence.history.length; i++) {
                if (confidence.history[i].timestamp <= confidence.history[i-1].timestamp) {
                    warnings.push('History entries not in chronological order');
                    break;
                }
            }
        }

        return { valid: true, errors, warnings };
    }

    /**
     * Validate convergence criteria
     * @private
     */
    validateConvergenceCriteria(confidence) {
        const errors = [];
        const warnings = [];

        if (confidence.converged === true) {
            if (confidence.overall < this.config.convergenceThreshold) {
                warnings.push(`Marked as converged but score ${confidence.overall} below threshold ${this.config.convergenceThreshold}`);
            }
        }

        return { valid: true, errors, warnings };
    }

    /**
     * Normalize confidence values
     * @param {Object} confidence - Confidence to normalize
     * @returns {Object} Normalized confidence
     */
    normalize(confidence) {
        const normalized = {
            ...confidence,
            overall: this.clampScore(confidence.overall),
            normalized: true,
            validatedAt: new Date().toISOString()
        };

        // Normalize dimensions if present
        if (confidence.dimensions) {
            normalized.dimensions = {};
            for (const [dimension, score] of Object.entries(confidence.dimensions)) {
                normalized.dimensions[dimension] = this.clampScore(score);
            }
        }

        return normalized;
    }

    /**
     * Clamp score to valid range
     * @private
     */
    clampScore(score) {
        return Math.max(
            this.config.minConfidence,
            Math.min(this.config.maxConfidence, score)
        );
    }

    /**
     * Check if confidence has converged
     * @param {Object} confidence - Confidence to check
     * @returns {boolean} True if converged
     */
    hasConverged(confidence) {
        return confidence.overall >= this.config.convergenceThreshold;
    }

    /**
     * Check if confidence is improving
     * @param {Array} history - Confidence history
     * @returns {string} Status: improving, stagnant, declining, insufficient-data
     */
    getImprovementStatus(history) {
        if (!Array.isArray(history) || history.length < this.config.minHistoryLength) {
            return 'insufficient-data';
        }

        const recent = history.slice(-this.config.minHistoryLength);
        const deltas = [];

        for (let i = 1; i < recent.length; i++) {
            deltas.push(recent[i].overall - recent[i-1].overall);
        }

        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

        if (avgDelta > this.config.improvementThreshold) {
            return 'improving';
        } else if (avgDelta < -this.config.improvementThreshold) {
            return 'declining';
        } else if (Math.abs(avgDelta) < this.config.stagnationThreshold) {
            return 'stagnant';
        } else {
            return 'stable';
        }
    }

    /**
     * Validate batch of confidences
     * @param {Array} confidences - Array of confidence objects
     * @returns {Object} Batch validation result
     */
    validateBatch(confidences) {
        const results = [];
        let validCount = 0;
        let errorCount = 0;
        const allErrors = [];
        const allWarnings = [];

        for (const confidence of confidences) {
            const result = this.validate(confidence);
            results.push(result);
            
            if (result.valid) {
                validCount++;
            } else {
                errorCount++;
            }
            
            allErrors.push(...result.errors);
            allWarnings.push(...result.warnings);
        }

        return {
            totalCount: confidences.length,
            validCount,
            errorCount,
            validationRate: confidences.length > 0 ? validCount / confidences.length : 0,
            results,
            allErrors: [...new Set(allErrors)], // Unique errors
            allWarnings: [...new Set(allWarnings)] // Unique warnings
        };
    }

    /**
     * Get validation rules
     * @returns {Object} Current validation rules
     */
    getRules() {
        return Object.keys(this.rules);
    }

    /**
     * Add custom validation rule
     * @param {string} name - Rule name
     * @param {Function} ruleFunc - Rule function
     */
    addRule(name, ruleFunc) {
        if (typeof ruleFunc !== 'function') {
            throw new Error('Rule must be a function');
        }
        this.rules[name] = ruleFunc.bind(this);
    }

    /**
     * Remove validation rule
     * @param {string} name - Rule name
     */
    removeRule(name) {
        delete this.rules[name];
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }
}

// Register with KC
if (window.KC) {
    window.KC.ConfidenceValidator = ConfidenceValidator;
    console.log('[ConfidenceValidator] Registered with KC');
}