/**
 * NotificationService - Modern toast notification system
 * 
 * Replaces blocking alert() calls with non-blocking toast notifications
 * that maintain user workflow while providing clear feedback.
 * 
 * Features:
 * - Non-blocking UI
 * - Multiple notification types
 * - Auto-dismiss with configurable timeouts
 * - Stack management
 * - Accessibility support
 */

class NotificationService {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.nextId = 1;
    this.maxNotifications = 5;
    this.defaultTimeout = 5000;
    
    this.initContainer();
  }

  /**
   * Initialize notification container
   */
  initContainer() {
    if (typeof window === 'undefined') return;
    
    // Create container if it doesn't exist
    this.container = document.getElementById('notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-label', 'Notificações');
      
      // Add CSS styles
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
      `;
      
      document.body.appendChild(this.container);
    }
    
    // Add CSS if not already present
    if (!document.getElementById('notification-styles')) {
      this.addStyles();
    }
  }

  /**
   * Add notification styles to document
   */
  addStyles() {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .notification-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .notification-toast {
        pointer-events: auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        padding: 16px;
        max-width: 400px;
        border-left: 4px solid;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        position: relative;
      }
      
      .notification-toast.error {
        border-left-color: #e74c3c;
        background: #fdf2f2;
      }
      
      .notification-toast.success {
        border-left-color: #2ecc71;
        background: #f0f9f4;
      }
      
      .notification-toast.warning {
        border-left-color: #f39c12;
        background: #fef9e7;
      }
      
      .notification-toast.info {
        border-left-color: #3498db;
        background: #f0f8ff;
      }
      
      .notification-icon {
        font-size: 18px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      .notification-content {
        flex: 1;
      }
      
      .notification-title {
        font-weight: 600;
        font-size: 14px;
        margin: 0 0 4px 0;
        color: #2c3e50;
      }
      
      .notification-message {
        font-size: 13px;
        color: #555;
        line-height: 1.4;
        margin: 0;
      }
      
      .notification-close {
        background: none;
        border: none;
        font-size: 16px;
        color: #999;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        flex-shrink: 0;
      }
      
      .notification-close:hover {
        color: #666;
      }
      
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: rgba(0, 0, 0, 0.1);
        transition: width linear;
      }
      
      .notification-toast.error .notification-progress {
        background: #e74c3c;
      }
      
      .notification-toast.success .notification-progress {
        background: #2ecc71;
      }
      
      .notification-toast.warning .notification-progress {
        background: #f39c12;
      }
      
      .notification-toast.info .notification-progress {
        background: #3498db;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .notification-toast.removing {
        animation: slideOut 0.3s ease-in forwards;
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {Object} options - Notification options
   */
  show(message, options = {}) {
    const {
      type = 'info',
      title = '',
      timeout = this.defaultTimeout,
      persistent = false,
      details = ''
    } = options;

    const id = `notification-${this.nextId++}`;
    
    // Limit number of notifications
    if (this.notifications.size >= this.maxNotifications) {
      const oldestId = this.notifications.keys().next().value;
      this.remove(oldestId);
    }

    const notification = this.createNotificationElement({
      id,
      type,
      title,
      message,
      details,
      persistent,
      timeout
    });

    this.notifications.set(id, {
      element: notification,
      timeout: persistent ? null : setTimeout(() => this.remove(id), timeout)
    });

    this.container.appendChild(notification);
    
    // Trigger reflow for animation
    notification.offsetHeight;
    
    return id;
  }

  /**
   * Create notification DOM element
   */
  createNotificationElement({ id, type, title, message, details, persistent, timeout }) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `notification-toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    const icons = {
      error: '❌',
      success: '✅',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const icon = document.createElement('div');
    icon.className = 'notification-icon';
    icon.textContent = icons[type] || icons.info;

    const content = document.createElement('div');
    content.className = 'notification-content';

    if (title) {
      const titleElement = document.createElement('div');
      titleElement.className = 'notification-title';
      titleElement.textContent = title;
      content.appendChild(titleElement);
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'notification-message';
    messageElement.textContent = message;
    content.appendChild(messageElement);

    if (details) {
      const detailsElement = document.createElement('div');
      detailsElement.className = 'notification-message';
      detailsElement.style.marginTop = '4px';
      detailsElement.style.fontSize = '12px';
      detailsElement.style.opacity = '0.8';
      detailsElement.textContent = details;
      content.appendChild(detailsElement);
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Fechar notificação');
    closeButton.onclick = () => this.remove(id);

    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(closeButton);

    // Add progress bar for timed notifications
    if (!persistent && timeout > 1000) {
      const progress = document.createElement('div');
      progress.className = 'notification-progress';
      progress.style.width = '100%';
      toast.appendChild(progress);

      // Animate progress bar
      setTimeout(() => {
        progress.style.width = '0%';
        progress.style.transition = `width ${timeout}ms linear`;
      }, 100);
    }

    return toast;
  }

  /**
   * Remove notification
   * @param {string} id - Notification ID
   */
  remove(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Clear timeout
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }

    // Add removal animation
    notification.element.classList.add('removing');
    
    // Remove after animation
    setTimeout(() => {
      if (notification.element && notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.forEach((_, id) => this.remove(id));
  }

  /**
   * Show error notification
   * @param {string|Error} error - Error message or Error object
   * @param {Object} options - Additional options
   */
  error(error, options = {}) {
    const message = error instanceof Error ? error.message : String(error);
    const title = options.title || 'Erro';
    
    return this.show(message, {
      ...options,
      type: 'error',
      title,
      timeout: options.timeout || 7000
    });
  }

  /**
   * Show success notification
   * @param {string} message - Success message
   * @param {Object} options - Additional options
   */
  success(message, options = {}) {
    return this.show(message, {
      ...options,
      type: 'success',
      title: options.title || 'Sucesso',
      timeout: options.timeout || 3000
    });
  }

  /**
   * Show warning notification
   * @param {string} message - Warning message
   * @param {Object} options - Additional options
   */
  warning(message, options = {}) {
    return this.show(message, {
      ...options,
      type: 'warning',
      title: options.title || 'Atenção',
      timeout: options.timeout || 5000
    });
  }

  /**
   * Show info notification
   * @param {string} message - Info message
   * @param {Object} options - Additional options
   */
  info(message, options = {}) {
    return this.show(message, {
      ...options,
      type: 'info',
      title: options.title || 'Informação',
      timeout: options.timeout || 4000
    });
  }

  /**
   * Show connection error with specific guidance
   */
  connectionError(service, url, error) {
    return this.error(`Não foi possível conectar ao ${service}`, {
      title: 'Erro de Conexão',
      details: `URL: ${url}\nDetalhes: ${error.message}`,
      timeout: 8000
    });
  }

  /**
   * Show validation error
   */
  validationError(field, message) {
    return this.error(`Erro de validação no campo "${field}": ${message}`, {
      title: 'Dados Inválidos',
      timeout: 6000
    });
  }

  /**
   * Show analysis complete notification
   */
  analysisComplete(stats) {
    return this.success(`Análise concluída: ${stats.totalPoints} pontos processados`, {
      details: `${stats.analyzed} analisados, ${stats.withCategories} categorizados`,
      timeout: 4000
    });
  }

  /**
   * Check if notification service is available
   */
  isAvailable() {
    return typeof window !== 'undefined' && document && document.body;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Export both class and singleton
export { NotificationService };
export default notificationService;