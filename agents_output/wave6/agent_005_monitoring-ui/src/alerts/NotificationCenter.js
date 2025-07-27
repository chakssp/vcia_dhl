/**
 * NotificationCenter - Manages dashboard notifications
 */

class NotificationCenter {
    constructor() {
        this.container = document.getElementById('notificationCenter');
        this.notifications = new Map();
        this.notificationId = 0;
        this.soundEnabled = false;
        this.desktopEnabled = false;
        
        this.init();
    }

    init() {
        this.loadPreferences();
        this.setupAudioContext();
        this.checkDesktopPermission();
    }

    loadPreferences() {
        const preferences = localStorage.getItem('ml-alert-preferences');
        if (preferences) {
            const parsed = JSON.parse(preferences);
            this.soundEnabled = parsed.enableSound || false;
            this.desktopEnabled = parsed.enableDesktop || false;
        }
    }

    setupAudioContext() {
        // Create audio context for sound notifications
        this.audioContext = null;
        this.audioBuffer = null;
        
        // We'll use Web Audio API to generate beep sounds
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        }
    }

    checkDesktopPermission() {
        if ('Notification' in window && this.desktopEnabled) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    show(message, type = 'info', duration = 5000) {
        const id = ++this.notificationId;
        const notification = {
            id,
            message,
            type,
            timestamp: Date.now(),
            duration
        };

        this.notifications.set(id, notification);
        this.renderNotification(notification);

        // Play sound if enabled
        if (this.soundEnabled && (type === 'error' || type === 'warning')) {
            this.playSound(type);
        }

        // Show desktop notification if enabled
        if (this.desktopEnabled && (type === 'error' || type === 'warning')) {
            this.showDesktopNotification(notification);
        }

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    renderNotification(notification) {
        if (!this.container) return;

        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `notification notification-${notification.type}`;
        element.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getIcon(notification.type)}</span>
                <span class="notification-message">${notification.message}</span>
            </div>
            <button class="notification-close" onclick="mlDashboard.components.get('notifications').remove(${notification.id})">
                <span>✕</span>
            </button>
        `;

        // Add to container
        this.container.appendChild(element);

        // Trigger animation
        setTimeout(() => {
            element.classList.add('show');
        }, 10);
    }

    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const element = document.getElementById(`notification-${id}`);
        if (element) {
            element.classList.add('fade-out');
            setTimeout(() => {
                element.remove();
            }, 300);
        }

        this.notifications.delete(id);
    }

    playSound(type) {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Different frequencies for different alert types
            const frequencies = {
                error: 440,    // A4
                warning: 523,  // C5
                info: 659,     // E5
                success: 784   // G5
            };

            oscillator.frequency.value = frequencies[type] || 440;
            oscillator.type = 'sine';

            // Envelope
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    showDesktopNotification(notification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        try {
            const desktopNotification = new Notification('ML Monitoring Dashboard', {
                body: notification.message,
                icon: this.getIcon(notification.type),
                tag: `ml-notification-${notification.id}`,
                requireInteraction: notification.type === 'error'
            });

            desktopNotification.onclick = () => {
                window.focus();
                desktopNotification.close();
            };

            // Auto-close after duration
            if (notification.duration > 0) {
                setTimeout(() => {
                    desktopNotification.close();
                }, notification.duration);
            }
        } catch (error) {
            console.error('Error showing desktop notification:', error);
        }
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    showSuccess(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    showWarning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    showError(message, duration = 0) {
        return this.show(message, 'error', duration);
    }

    showInfo(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    showAlert(alert) {
        // Show notification based on alert data
        const type = alert.type === 'critical' ? 'error' : alert.type;
        const message = alert.title || alert.message;
        return this.show(message, type, 0); // Don't auto-dismiss alerts
    }

    clear() {
        this.notifications.forEach((notification) => {
            this.remove(notification.id);
        });
    }

    updatePreferences(preferences) {
        this.soundEnabled = preferences.enableSound || false;
        this.desktopEnabled = preferences.enableDesktop || false;
        
        if (this.desktopEnabled) {
            this.checkDesktopPermission();
        }
    }

    destroy() {
        this.clear();
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Add notification styles if not already present
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: relative;
            opacity: 0;
            transform: translateX(100%);
            transition: all 300ms ease;
            margin-bottom: var(--spacing-sm);
        }

        .notification.show {
            opacity: 1;
            transform: translateX(0);
        }

        .notification.fade-out {
            opacity: 0;
            transform: translateX(100%);
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            padding-right: var(--spacing-xl);
        }

        .notification-icon {
            font-size: 20px;
            flex-shrink: 0;
        }

        .notification-message {
            font-size: 14px;
            line-height: 1.4;
        }

        .notification-close {
            position: absolute;
            top: var(--spacing-sm);
            right: var(--spacing-sm);
            background: transparent;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 16px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-sm);
            transition: all var(--transition-fast);
        }

        .notification-close:hover {
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
        }
    `;
    document.head.appendChild(style);
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationCenter;
}