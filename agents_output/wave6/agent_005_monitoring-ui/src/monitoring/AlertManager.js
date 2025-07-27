/**
 * AlertManager - Manages alerts and thresholds for ML metrics
 */

class AlertManager {
    constructor() {
        this.alerts = new Map();
        this.thresholds = this.loadThresholds();
        this.alertHistory = [];
        this.maxHistorySize = 100;
        this.alertContainer = document.getElementById('alertContainer');
    }

    loadThresholds() {
        // Load from localStorage or use defaults
        const saved = localStorage.getItem('ml-alert-thresholds');
        if (saved) {
            return JSON.parse(saved);
        }

        // Default thresholds
        return {
            ml_confidence_score: {
                warning: 0.7,
                critical: 0.6,
                comparison: 'less'
            },
            ml_processing_errors: {
                warning: 5,
                critical: 10,
                comparison: 'greater',
                unit: '%'
            },
            ml_files_processed: {
                warning: 8,
                critical: 5,
                comparison: 'less',
                unit: 'files/min'
            },
            system_memory_usage: {
                warning: 400,
                critical: 500,
                comparison: 'greater',
                unit: 'MB'
            },
            ml_convergence_rate: {
                warning: 0.8,
                critical: 0.7,
                comparison: 'less'
            }
        };
    }

    saveThresholds() {
        localStorage.setItem('ml-alert-thresholds', JSON.stringify(this.thresholds));
    }

    checkThresholds(metrics) {
        Object.entries(metrics).forEach(([metricName, metricData]) => {
            const threshold = this.thresholds[metricName];
            if (!threshold) return;

            const value = metricData.value;
            let alertLevel = null;

            // Check critical threshold first
            if (this.compareValue(value, threshold.critical, threshold.comparison)) {
                alertLevel = 'critical';
            } else if (this.compareValue(value, threshold.warning, threshold.comparison)) {
                alertLevel = 'warning';
            }

            if (alertLevel) {
                this.createAlert({
                    id: `${metricName}_${Date.now()}`,
                    type: alertLevel,
                    metric: metricName,
                    value: value,
                    threshold: threshold[alertLevel],
                    unit: threshold.unit || '',
                    timestamp: Date.now(),
                    message: this.generateAlertMessage(metricName, value, threshold, alertLevel)
                });
            }
        });
    }

    compareValue(value, threshold, comparison) {
        switch (comparison) {
            case 'greater':
                return value > threshold;
            case 'less':
                return value < threshold;
            case 'equal':
                return value === threshold;
            default:
                return false;
        }
    }

    generateAlertMessage(metric, value, threshold, level) {
        const metricNames = {
            ml_confidence_score: 'ML Confidence Score',
            ml_processing_errors: 'Processing Error Rate',
            ml_files_processed: 'Processing Rate',
            system_memory_usage: 'Memory Usage',
            ml_convergence_rate: 'Convergence Rate'
        };

        const name = metricNames[metric] || metric;
        const unit = threshold.unit || '';
        const thresholdValue = threshold[level];

        return `${name} is ${value}${unit} (threshold: ${thresholdValue}${unit})`;
    }

    createAlert(alertData) {
        // Check if similar alert already exists
        const existingAlert = this.findSimilarAlert(alertData);
        if (existingAlert) {
            // Update existing alert
            existingAlert.count = (existingAlert.count || 1) + 1;
            existingAlert.lastSeen = Date.now();
            this.updateAlertDisplay(existingAlert);
            return;
        }

        // Add new alert
        alertData.id = alertData.id || `alert_${Date.now()}`;
        alertData.count = 1;
        alertData.lastSeen = Date.now();
        
        this.alerts.set(alertData.id, alertData);
        this.addToHistory(alertData);
        this.displayAlert(alertData);

        // Emit event if KC.EventBus is available
        if (window.KC?.EventBus) {
            KC.EventBus.emit('ML_ALERT_CREATED', alertData);
        }
    }

    findSimilarAlert(alertData) {
        // Find alerts with same metric and level within last 5 minutes
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        
        for (const [id, alert] of this.alerts) {
            if (alert.metric === alertData.metric &&
                alert.type === alertData.type &&
                alert.lastSeen > fiveMinutesAgo) {
                return alert;
            }
        }
        
        return null;
    }

    addAlert(alertData) {
        this.createAlert(alertData);
    }

    removeAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (!alert) return;

        this.alerts.delete(alertId);
        
        // Remove from display
        const element = document.getElementById(`alert_${alertId}`);
        if (element) {
            element.remove();
        }

        // Update count
        this.updateAlertCount();
    }

    displayAlert(alert) {
        if (!this.alertContainer) return;

        const alertElement = document.createElement('div');
        alertElement.id = `alert_${alert.id}`;
        alertElement.className = `alert alert-${alert.type}`;
        alertElement.innerHTML = `
            <div class="alert-header">
                <span class="alert-icon">${this.getAlertIcon(alert.type)}</span>
                <span class="alert-title">${this.getAlertTitle(alert)}</span>
                <span class="alert-time">${this.formatTime(alert.timestamp)}</span>
            </div>
            <div class="alert-body">
                <p class="alert-message">${alert.message}</p>
                ${alert.count > 1 ? `<span class="alert-count">Occurred ${alert.count} times</span>` : ''}
            </div>
            <div class="alert-actions">
                <button class="btn btn-sm" onclick="mlDashboard.components.get('alertManager').acknowledgeAlert('${alert.id}')">
                    Acknowledge
                </button>
                <button class="btn btn-sm" onclick="mlDashboard.components.get('alertManager').removeAlert('${alert.id}')">
                    Dismiss
                </button>
            </div>
        `;

        // Add to container
        this.alertContainer.insertBefore(alertElement, this.alertContainer.firstChild);
        
        // Update count
        this.updateAlertCount();

        // Auto-dismiss info alerts after 30 seconds
        if (alert.type === 'info') {
            setTimeout(() => {
                this.removeAlert(alert.id);
            }, 30000);
        }
    }

    updateAlertDisplay(alert) {
        const element = document.getElementById(`alert_${alert.id}`);
        if (!element) return;

        // Update count if shown
        const countElement = element.querySelector('.alert-count');
        if (countElement) {
            countElement.textContent = `Occurred ${alert.count} times`;
        } else if (alert.count > 1) {
            const body = element.querySelector('.alert-body');
            const span = document.createElement('span');
            span.className = 'alert-count';
            span.textContent = `Occurred ${alert.count} times`;
            body.appendChild(span);
        }

        // Update time
        const timeElement = element.querySelector('.alert-time');
        if (timeElement) {
            timeElement.textContent = this.formatTime(alert.lastSeen);
        }
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (!alert) return;

        alert.acknowledged = true;
        alert.acknowledgedAt = Date.now();

        // Update display
        const element = document.getElementById(`alert_${alertId}`);
        if (element) {
            element.classList.add('acknowledged');
        }

        // Emit event
        if (window.KC?.EventBus) {
            KC.EventBus.emit('ML_ALERT_ACKNOWLEDGED', alert);
        }
    }

    getAlertIcon(type) {
        const icons = {
            critical: '🔴',
            warning: '🟡',
            info: 'ℹ️',
            success: '✅'
        };
        return icons[type] || '📌';
    }

    getAlertTitle(alert) {
        const titles = {
            ml_confidence_score: 'Low ML Confidence',
            ml_processing_errors: 'High Error Rate',
            ml_files_processed: 'Low Processing Rate',
            system_memory_usage: 'High Memory Usage',
            ml_convergence_rate: 'Poor Convergence'
        };
        return titles[alert.metric] || alert.title || 'System Alert';
    }

    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        } else if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        } else {
            const date = new Date(timestamp);
            return date.toLocaleString();
        }
    }

    updateAlertCount() {
        const activeAlerts = this.getActiveAlerts();
        const countElement = document.getElementById('alertCount');
        if (countElement) {
            countElement.textContent = activeAlerts.length;
            countElement.className = `badge ${activeAlerts.length > 0 ? 'badge-alert' : ''}`;
        }
    }

    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
    }

    addToHistory(alert) {
        this.alertHistory.unshift({
            ...alert,
            historicalTimestamp: Date.now()
        });

        // Limit history size
        if (this.alertHistory.length > this.maxHistorySize) {
            this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
        }
    }

    getAlertHistory(filter = {}) {
        let history = [...this.alertHistory];

        if (filter.type) {
            history = history.filter(alert => alert.type === filter.type);
        }

        if (filter.metric) {
            history = history.filter(alert => alert.metric === filter.metric);
        }

        if (filter.startTime) {
            history = history.filter(alert => alert.timestamp >= filter.startTime);
        }

        if (filter.endTime) {
            history = history.filter(alert => alert.timestamp <= filter.endTime);
        }

        return history;
    }

    updateThreshold(metric, level, value) {
        if (!this.thresholds[metric]) {
            this.thresholds[metric] = {
                comparison: 'greater'
            };
        }

        this.thresholds[metric][level] = value;
        this.saveThresholds();

        // Emit event
        if (window.KC?.EventBus) {
            KC.EventBus.emit('ML_THRESHOLD_UPDATED', {
                metric,
                level,
                value
            });
        }
    }

    getThresholds() {
        return { ...this.thresholds };
    }

    clearAlerts() {
        this.alerts.clear();
        if (this.alertContainer) {
            this.alertContainer.innerHTML = '';
        }
        this.updateAlertCount();
    }

    destroy() {
        this.clearAlerts();
        this.alertHistory = [];
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertManager;
}