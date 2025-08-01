/**
 * FeatureFlagManager - Controls feature rollout and A/B testing
 * Implements UnifiedConfidenceSystem feature flag specification
 * 
 * Strategic Context: Enable safe rollout of confidence system integration
 * with ability to rollback if issues arise
 */

class FeatureFlagManager {
    constructor() {
        this.flags = new Map();
        this.listeners = new Map();
        this.storageKey = 'kc_feature_flags';
        this.logger = window.KC?.Logger || console;
        
        // Initialize with default flags for UnifiedConfidenceSystem
        this.defaultFlags = {
            // Core confidence system flags
            'unified_confidence_system': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'Enable UnifiedConfidenceSystem integration'
            },
            'qdrant_score_bridge': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'Connect Qdrant scores to UI confidence'
            },
            'advanced_score_normalization': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'Use advanced score normalization algorithms'
            },
            'confidence_performance_monitoring': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'Enable confidence system performance monitoring'
            },
            'batch_confidence_processing': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'Enable batch processing for confidence scores'
            },
            
            // UI Enhancement flags
            'enhanced_file_cards': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'Show enhanced file cards with confidence scores'
            },
            'confidence_color_coding': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'Color-code files by confidence level'
            },
            'confidence_tooltips': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'Show confidence score tooltips'
            },
            
            // Debug and Development flags
            'confidence_debug_panel': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'Show confidence system debug information'
            },
            'score_validation_logging': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'Enable detailed score validation logging'
            }
        };

        this.init();
    }

    /**
     * Initialize feature flag system
     */
    init() {
        this.loadFlags();
        this.registerConsoleCommands();
        this.logger.info('FeatureFlagManager: Initialized with', this.flags.size, 'flags');
    }

    /**
     * Check if a feature is enabled
     * @param {string} flagName - Name of the feature flag
     * @param {string} userId - Optional user ID for percentage rollout
     * @returns {boolean} True if feature is enabled
     */
    isEnabled(flagName, userId = null) {
        const flag = this.flags.get(flagName);
        
        if (!flag) {
            this.logger.warn(`FeatureFlagManager: Unknown flag '${flagName}'`);
            return false;
        }

        // Check basic enabled state
        if (!flag.enabled) {
            return false;
        }

        // Check rollout percentage
        if (flag.rolloutPercentage < 100) {
            return this._isInRollout(flagName, userId, flag.rolloutPercentage);
        }

        return true;
    }

    /**
     * Enable a feature flag
     * @param {string} flagName - Name of the feature flag
     * @param {number} rolloutPercentage - Percentage of users to enable for (0-100)
     */
    enable(flagName, rolloutPercentage = 100) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            this.logger.error(`FeatureFlagManager: Cannot enable unknown flag '${flagName}'`);
            return false;
        }

        flag.enabled = true;
        flag.rolloutPercentage = rolloutPercentage;
        flag.lastModified = new Date().toISOString();

        this.saveFlags();
        this.notifyListeners(flagName, true);
        
        this.logger.info(`FeatureFlagManager: Enabled '${flagName}' at ${rolloutPercentage}%`);
        return true;
    }

    /**
     * Disable a feature flag
     * @param {string} flagName - Name of the feature flag
     */
    disable(flagName) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            this.logger.error(`FeatureFlagManager: Cannot disable unknown flag '${flagName}'`);
            return false;
        }

        flag.enabled = false;
        flag.rolloutPercentage = 0;
        flag.lastModified = new Date().toISOString();

        this.saveFlags();
        this.notifyListeners(flagName, false);
        
        this.logger.info(`FeatureFlagManager: Disabled '${flagName}'`);
        return true;
    }

    /**
     * Set rollout percentage for a flag
     * @param {string} flagName - Name of the feature flag
     * @param {number} percentage - Rollout percentage (0-100)
     */
    setRolloutPercentage(flagName, percentage) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            this.logger.error(`FeatureFlagManager: Cannot set rollout for unknown flag '${flagName}'`);
            return false;
        }

        if (percentage < 0 || percentage > 100) {
            this.logger.error(`FeatureFlagManager: Invalid rollout percentage ${percentage}`);
            return false;
        }

        flag.rolloutPercentage = percentage;
        flag.lastModified = new Date().toISOString();

        this.saveFlags();
        this.notifyListeners(flagName, flag.enabled);
        
        this.logger.info(`FeatureFlagManager: Set '${flagName}' rollout to ${percentage}%`);
        return true;
    }

    /**
     * Register listener for flag changes
     * @param {string} flagName - Name of the feature flag
     * @param {Function} callback - Callback function (enabled) => void
     */
    onFlagChange(flagName, callback) {
        if (!this.listeners.has(flagName)) {
            this.listeners.set(flagName, []);
        }
        this.listeners.get(flagName).push(callback);
    }

    /**
     * Get all flags status
     * @returns {Object} Object with all flags and their status
     */
    getAllFlags() {
        const result = {};
        for (const [name, flag] of this.flags.entries()) {
            result[name] = {
                enabled: flag.enabled,
                rolloutPercentage: flag.rolloutPercentage,
                description: flag.description,
                lastModified: flag.lastModified || null
            };
        }
        return result;
    }

    /**
     * Get confidence system specific flags
     */
    getConfidenceFlags() {
        const confidenceFlags = {};
        for (const [name, flag] of this.flags.entries()) {
            if (name.includes('confidence') || name.includes('qdrant') || name.includes('unified')) {
                confidenceFlags[name] = this.isEnabled(name);
            }
        }
        return confidenceFlags;
    }

    /**
     * Batch enable confidence system features for testing
     */
    enableConfidenceSystemBeta() {
        const confidenceFeatures = [
            'unified_confidence_system',
            'qdrant_score_bridge',
            'enhanced_file_cards',
            'confidence_color_coding'
        ];

        const results = {};
        confidenceFeatures.forEach(flag => {
            results[flag] = this.enable(flag, 100);
        });

        return results;
    }

    /**
     * Emergency disable all confidence features
     */
    emergencyDisableConfidence() {
        const confidenceFeatures = Array.from(this.flags.keys())
            .filter(name => name.includes('confidence') || name.includes('qdrant') || name.includes('unified'));

        const results = {};
        confidenceFeatures.forEach(flag => {
            results[flag] = this.disable(flag);
        });

        return results;
    }

    // Private Methods

    loadFlags() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const storedFlags = stored ? JSON.parse(stored) : {};

            // Merge with defaults
            for (const [name, defaultFlag] of Object.entries(this.defaultFlags)) {
                const storedFlag = storedFlags[name];
                this.flags.set(name, {
                    ...defaultFlag,
                    ...storedFlag,
                    // Preserve critical defaults
                    description: defaultFlag.description
                });
            }

        } catch (error) {
            this.logger.error('FeatureFlagManager: Failed to load flags', error);
            // Use defaults
            for (const [name, flag] of Object.entries(this.defaultFlags)) {
                this.flags.set(name, { ...flag });
            }
        }
    }

    saveFlags() {
        try {
            const flagsObject = {};
            for (const [name, flag] of this.flags.entries()) {
                flagsObject[name] = flag;
            }
            localStorage.setItem(this.storageKey, JSON.stringify(flagsObject));
        } catch (error) {
            this.logger.error('FeatureFlagManager: Failed to save flags', error);
        }
    }

    _isInRollout(flagName, userId, percentage) {
        // Use consistent hash for user ID or fallback to session ID
        const id = userId || this._getSessionId();
        const hash = this._simpleHash(flagName + id);
        return (hash % 100) < percentage;
    }

    _getSessionId() {
        let sessionId = sessionStorage.getItem('kc_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('kc_session_id', sessionId);
        }
        return sessionId;
    }

    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    notifyListeners(flagName, enabled) {
        const listeners = this.listeners.get(flagName) || [];
        listeners.forEach(callback => {
            try {
                callback(enabled);
            } catch (error) {
                this.logger.error(`FeatureFlagManager: Listener error for '${flagName}'`, error);
            }
        });
    }

    registerConsoleCommands() {
        // Register global commands for debugging
        if (typeof window !== 'undefined') {
            window.kcflags = {
                list: () => this.getAllFlags(),
                enable: (flag, percentage = 100) => this.enable(flag, percentage),
                disable: (flag) => this.disable(flag),
                check: (flag) => this.isEnabled(flag),
                confidence: () => this.getConfidenceFlags(),
                enableConfidenceBeta: () => this.enableConfidenceSystemBeta(),
                emergencyDisable: () => this.emergencyDisableConfidence()
            };
        }
    }
}

// Export for use
window.KC = window.KC || {};
window.KC.FeatureFlagManager = FeatureFlagManager;

// Auto-initialize
window.KC.FeatureFlagManagerInstance = new FeatureFlagManager();

export default FeatureFlagManager;