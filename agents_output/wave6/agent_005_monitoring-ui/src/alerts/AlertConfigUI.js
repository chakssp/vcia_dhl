/**
 * AlertConfigUI - Configuration interface for ML alerts
 */

class AlertConfigUI {
    constructor() {
        this.modal = null;
        this.alertManager = null;
        this.currentThresholds = {};
        this.init();
    }

    init() {
        // Get alert manager reference
        if (window.mlDashboard?.components) {
            this.alertManager = window.mlDashboard.components.get('alertManager');
        }
    }

    show() {
        // Get current thresholds
        if (this.alertManager) {
            this.currentThresholds = this.alertManager.getThresholds();
        }

        // Create modal
        this.createModal();
        document.body.appendChild(this.modal);

        // Initialize values
        this.populateCurrentValues();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'alert-config-modal';
        this.modal.innerHTML = `
            <div class="modal-backdrop" onclick="mlDashboard.components.get('alertConfig').close()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Alert Configuration</h2>
                    <button class="btn btn-icon" onclick="mlDashboard.components.get('alertConfig').close()">
                        <span>✕</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="alert-config-grid">
                        <!-- ML Confidence Score -->
                        <div class="config-section">
                            <h3>ML Confidence Score</h3>
                            <div class="threshold-config">
                                <div class="threshold-row">
                                    <label>Warning Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_confidence_score_warning" 
                                               min="0" 
                                               max="1" 
                                               step="0.05"
                                               class="threshold-input">
                                        <span class="threshold-unit">score</span>
                                    </div>
                                    <span class="threshold-help">Alert when confidence falls below this value</span>
                                </div>
                                <div class="threshold-row">
                                    <label>Critical Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_confidence_score_critical" 
                                               min="0" 
                                               max="1" 
                                               step="0.05"
                                               class="threshold-input">
                                        <span class="threshold-unit">score</span>
                                    </div>
                                    <span class="threshold-help">Critical alert threshold</span>
                                </div>
                            </div>
                        </div>

                        <!-- Processing Error Rate -->
                        <div class="config-section">
                            <h3>Processing Error Rate</h3>
                            <div class="threshold-config">
                                <div class="threshold-row">
                                    <label>Warning Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_processing_errors_warning" 
                                               min="0" 
                                               max="100" 
                                               step="1"
                                               class="threshold-input">
                                        <span class="threshold-unit">%</span>
                                    </div>
                                    <span class="threshold-help">Alert when error rate exceeds this percentage</span>
                                </div>
                                <div class="threshold-row">
                                    <label>Critical Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_processing_errors_critical" 
                                               min="0" 
                                               max="100" 
                                               step="1"
                                               class="threshold-input">
                                        <span class="threshold-unit">%</span>
                                    </div>
                                    <span class="threshold-help">Critical error rate threshold</span>
                                </div>
                            </div>
                        </div>

                        <!-- Processing Rate -->
                        <div class="config-section">
                            <h3>Processing Rate</h3>
                            <div class="threshold-config">
                                <div class="threshold-row">
                                    <label>Warning Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_files_processed_warning" 
                                               min="0" 
                                               max="1000" 
                                               step="1"
                                               class="threshold-input">
                                        <span class="threshold-unit">files/min</span>
                                    </div>
                                    <span class="threshold-help">Alert when rate falls below this value</span>
                                </div>
                                <div class="threshold-row">
                                    <label>Critical Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_files_processed_critical" 
                                               min="0" 
                                               max="1000" 
                                               step="1"
                                               class="threshold-input">
                                        <span class="threshold-unit">files/min</span>
                                    </div>
                                    <span class="threshold-help">Critical processing rate threshold</span>
                                </div>
                            </div>
                        </div>

                        <!-- Memory Usage -->
                        <div class="config-section">
                            <h3>Memory Usage</h3>
                            <div class="threshold-config">
                                <div class="threshold-row">
                                    <label>Warning Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="system_memory_usage_warning" 
                                               min="0" 
                                               max="10000" 
                                               step="100"
                                               class="threshold-input">
                                        <span class="threshold-unit">MB</span>
                                    </div>
                                    <span class="threshold-help">Alert when memory usage exceeds this value</span>
                                </div>
                                <div class="threshold-row">
                                    <label>Critical Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="system_memory_usage_critical" 
                                               min="0" 
                                               max="10000" 
                                               step="100"
                                               class="threshold-input">
                                        <span class="threshold-unit">MB</span>
                                    </div>
                                    <span class="threshold-help">Critical memory usage threshold</span>
                                </div>
                            </div>
                        </div>

                        <!-- Convergence Rate -->
                        <div class="config-section">
                            <h3>Model Convergence Rate</h3>
                            <div class="threshold-config">
                                <div class="threshold-row">
                                    <label>Warning Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_convergence_rate_warning" 
                                               min="0" 
                                               max="1" 
                                               step="0.05"
                                               class="threshold-input">
                                        <span class="threshold-unit">rate</span>
                                    </div>
                                    <span class="threshold-help">Alert when convergence falls below this rate</span>
                                </div>
                                <div class="threshold-row">
                                    <label>Critical Threshold</label>
                                    <div class="threshold-input-group">
                                        <input type="number" 
                                               id="ml_convergence_rate_critical" 
                                               min="0" 
                                               max="1" 
                                               step="0.05"
                                               class="threshold-input">
                                        <span class="threshold-unit">rate</span>
                                    </div>
                                    <span class="threshold-help">Critical convergence rate threshold</span>
                                </div>
                            </div>
                        </div>

                        <!-- Alert Preferences -->
                        <div class="config-section full-width">
                            <h3>Alert Preferences</h3>
                            <div class="preference-config">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="enable_sound_alerts">
                                    <span>Enable sound notifications</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="enable_desktop_notifications">
                                    <span>Enable desktop notifications</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="auto_acknowledge_info">
                                    <span>Auto-acknowledge info alerts after 30s</span>
                                </label>
                                <div class="preference-row">
                                    <label>Alert retention period</label>
                                    <select id="alert_retention" class="preference-select">
                                        <option value="1h">1 hour</option>
                                        <option value="6h">6 hours</option>
                                        <option value="24h" selected>24 hours</option>
                                        <option value="7d">7 days</option>
                                        <option value="30d">30 days</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="mlDashboard.components.get('alertConfig').resetDefaults()">
                        Reset to Defaults
                    </button>
                    <div class="footer-actions">
                        <button class="btn" onclick="mlDashboard.components.get('alertConfig').close()">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="mlDashboard.components.get('alertConfig').save()">
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('alert-config-styles')) return;

        const style = document.createElement('style');
        style.id = 'alert-config-styles';
        style.textContent = `
            .alert-config-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
            }

            .modal-content {
                position: relative;
                background-color: var(--bg-primary);
                border-radius: var(--radius-lg);
                box-shadow: 0 8px 32px var(--shadow-color);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            }

            .modal-header {
                padding: var(--spacing-lg);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h2 {
                margin: 0;
                font-size: 24px;
            }

            .modal-body {
                padding: var(--spacing-lg);
                overflow-y: auto;
                flex: 1;
            }

            .alert-config-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: var(--spacing-xl);
            }

            .config-section {
                background-color: var(--bg-secondary);
                border-radius: var(--radius-md);
                padding: var(--spacing-md);
                border: 1px solid var(--border-color);
            }

            .config-section.full-width {
                grid-column: 1 / -1;
            }

            .config-section h3 {
                margin-top: 0;
                margin-bottom: var(--spacing-md);
                font-size: 18px;
                color: var(--text-primary);
            }

            .threshold-config {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-md);
            }

            .threshold-row {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-xs);
            }

            .threshold-row label {
                font-weight: 500;
                font-size: 14px;
                color: var(--text-secondary);
            }

            .threshold-input-group {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }

            .threshold-input {
                flex: 1;
                padding: var(--spacing-sm);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                background-color: var(--bg-primary);
                color: var(--text-primary);
                font-size: 14px;
            }

            .threshold-unit {
                font-size: 14px;
                color: var(--text-tertiary);
                min-width: 60px;
            }

            .threshold-help {
                font-size: 12px;
                color: var(--text-tertiary);
                font-style: italic;
            }

            .preference-config {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-md);
            }

            .checkbox-label {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                cursor: pointer;
                font-size: 14px;
            }

            .checkbox-label input[type="checkbox"] {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }

            .preference-row {
                display: flex;
                align-items: center;
                gap: var(--spacing-md);
            }

            .preference-row label {
                font-weight: 500;
                font-size: 14px;
                color: var(--text-secondary);
                min-width: 150px;
            }

            .preference-select {
                flex: 1;
                padding: var(--spacing-sm);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                background-color: var(--bg-primary);
                color: var(--text-primary);
                font-size: 14px;
                cursor: pointer;
            }

            .modal-footer {
                padding: var(--spacing-lg);
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .footer-actions {
                display: flex;
                gap: var(--spacing-sm);
            }
        `;
        document.head.appendChild(style);
    }

    populateCurrentValues() {
        // Populate threshold values
        Object.entries(this.currentThresholds).forEach(([metric, config]) => {
            const warningInput = document.getElementById(`${metric}_warning`);
            const criticalInput = document.getElementById(`${metric}_critical`);
            
            if (warningInput && config.warning !== undefined) {
                warningInput.value = config.warning;
            }
            if (criticalInput && config.critical !== undefined) {
                criticalInput.value = config.critical;
            }
        });

        // Populate preferences from localStorage
        const preferences = this.loadPreferences();
        document.getElementById('enable_sound_alerts').checked = preferences.enableSound;
        document.getElementById('enable_desktop_notifications').checked = preferences.enableDesktop;
        document.getElementById('auto_acknowledge_info').checked = preferences.autoAcknowledgeInfo;
        document.getElementById('alert_retention').value = preferences.retention;
    }

    loadPreferences() {
        const saved = localStorage.getItem('ml-alert-preferences');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Defaults
        return {
            enableSound: false,
            enableDesktop: false,
            autoAcknowledgeInfo: true,
            retention: '24h'
        };
    }

    save() {
        // Collect threshold values
        const metrics = [
            'ml_confidence_score',
            'ml_processing_errors',
            'ml_files_processed',
            'system_memory_usage',
            'ml_convergence_rate'
        ];

        metrics.forEach(metric => {
            const warningInput = document.getElementById(`${metric}_warning`);
            const criticalInput = document.getElementById(`${metric}_critical`);
            
            if (warningInput && this.alertManager) {
                this.alertManager.updateThreshold(metric, 'warning', parseFloat(warningInput.value));
            }
            if (criticalInput && this.alertManager) {
                this.alertManager.updateThreshold(metric, 'critical', parseFloat(criticalInput.value));
            }
        });

        // Save preferences
        const preferences = {
            enableSound: document.getElementById('enable_sound_alerts').checked,
            enableDesktop: document.getElementById('enable_desktop_notifications').checked,
            autoAcknowledgeInfo: document.getElementById('auto_acknowledge_info').checked,
            retention: document.getElementById('alert_retention').value
        };
        localStorage.setItem('ml-alert-preferences', JSON.stringify(preferences));

        // Request notification permission if needed
        if (preferences.enableDesktop && 'Notification' in window) {
            Notification.requestPermission();
        }

        // Show success notification
        if (window.mlDashboard?.components) {
            const notifications = window.mlDashboard.components.get('notifications');
            if (notifications) {
                notifications.showSuccess('Alert configuration saved successfully');
            }
        }

        this.close();
    }

    resetDefaults() {
        // Default thresholds
        const defaults = {
            ml_confidence_score: { warning: 0.7, critical: 0.6 },
            ml_processing_errors: { warning: 5, critical: 10 },
            ml_files_processed: { warning: 8, critical: 5 },
            system_memory_usage: { warning: 400, critical: 500 },
            ml_convergence_rate: { warning: 0.8, critical: 0.7 }
        };

        // Set values in inputs
        Object.entries(defaults).forEach(([metric, values]) => {
            const warningInput = document.getElementById(`${metric}_warning`);
            const criticalInput = document.getElementById(`${metric}_critical`);
            
            if (warningInput) warningInput.value = values.warning;
            if (criticalInput) criticalInput.value = values.critical;
        });

        // Reset preferences
        document.getElementById('enable_sound_alerts').checked = false;
        document.getElementById('enable_desktop_notifications').checked = false;
        document.getElementById('auto_acknowledge_info').checked = true;
        document.getElementById('alert_retention').value = '24h';
    }

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertConfigUI;
}