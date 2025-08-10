/**
 * Sanitization Utilities
 * 
 * Provides secure text sanitization to prevent XSS attacks
 * while maintaining functionality and readability.
 */

/**
 * HTML entities for escaping
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escape HTML entities to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text || '');
  }
  
  return text.replace(/[&<>"'\/`=]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Sanitize text for safe display in React components
 * @param {string} text - Text to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized text
 */
export function sanitizeText(text, options = {}) {
  const {
    maxLength = 1000,
    allowBasicFormatting = false,
    truncate = true
  } = options;
  
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let sanitized = text;
  
  // Remove null bytes and control characters (except whitespace)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Escape HTML unless basic formatting is allowed
  if (!allowBasicFormatting) {
    sanitized = escapeHtml(sanitized);
  } else {
    // Only allow specific safe tags
    sanitized = sanitizeBasicFormatting(sanitized);
  }
  
  // Truncate if needed
  if (truncate && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}

/**
 * Sanitize text allowing only basic safe formatting
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text with safe formatting
 */
function sanitizeBasicFormatting(text) {
  // List of allowed tags (very restrictive)
  const allowedTags = ['b', 'i', 'em', 'strong', 'u'];
  const allowedPattern = new RegExp(`<(/?)(?:${allowedTags.join('|')})(\\s[^>]*)?>`, 'gi');
  
  // First, escape all HTML
  let sanitized = escapeHtml(text);
  
  // Then, restore only allowed tags
  sanitized = sanitized.replace(/&lt;(\/?(?:b|i|em|strong|u))&gt;/gi, '<$1>');
  
  return sanitized;
}

/**
 * Sanitize node label for safe display
 * @param {string} label - Node label to sanitize
 * @returns {string} Sanitized label
 */
export function sanitizeNodeLabel(label) {
  return sanitizeText(label, {
    maxLength: 100,
    allowBasicFormatting: false,
    truncate: true
  });
}

/**
 * Sanitize file path for safe display
 * @param {string} path - File path to sanitize
 * @returns {string} Sanitized path
 */
export function sanitizeFilePath(path) {
  if (!path || typeof path !== 'string') {
    return 'Unknown Path';
  }
  
  // Remove any potentially dangerous characters
  let sanitized = path.replace(/[<>"'&]/g, '');
  
  // Limit length for display
  if (sanitized.length > 150) {
    // Show beginning and end of path
    const start = sanitized.substring(0, 50);
    const end = sanitized.substring(sanitized.length - 50);
    sanitized = `${start}...${end}`;
  }
  
  return sanitized;
}

/**
 * Sanitize user input for search queries
 * @param {string} query - Search query to sanitize
 * @returns {string} Sanitized query
 */
export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // Remove HTML tags and normalize whitespace
  let sanitized = query.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  // Limit query length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  
  return sanitized;
}

/**
 * Sanitize object properties recursively
 * @param {Object} obj - Object to sanitize
 * @param {Array} textFields - Fields that contain text to sanitize
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj, textFields = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = { ...obj };
  
  textFields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeText(sanitized[field]);
    }
  });
  
  return sanitized;
}

/**
 * Validate and sanitize node data
 * @param {Object} nodeData - Node data to validate and sanitize
 * @returns {Object} Sanitized node data
 */
export function sanitizeNodeData(nodeData) {
  if (!nodeData || typeof nodeData !== 'object') {
    return { label: 'Invalid Node' };
  }
  
  const sanitized = {
    ...nodeData,
    label: sanitizeNodeLabel(nodeData.label || ''),
  };
  
  // Sanitize additional text fields
  if (sanitized.fileName) {
    sanitized.fileName = sanitizeFilePath(sanitized.fileName);
  }
  
  if (sanitized.path) {
    sanitized.path = sanitizeFilePath(sanitized.path);
  }
  
  if (sanitized.text) {
    sanitized.text = sanitizeText(sanitized.text, { maxLength: 200 });
  }
  
  if (sanitized.preview) {
    sanitized.preview = sanitizeText(sanitized.preview, { maxLength: 100 });
  }
  
  return sanitized;
}

/**
 * Create a safe display name from any input
 * @param {any} input - Input to create display name from
 * @param {string} fallback - Fallback name if input is invalid
 * @returns {string} Safe display name
 */
export function createSafeDisplayName(input, fallback = 'Unknown') {
  if (input === null || input === undefined) {
    return fallback;
  }
  
  if (typeof input === 'string') {
    const sanitized = sanitizeText(input, { maxLength: 50 });
    return sanitized || fallback;
  }
  
  if (typeof input === 'object' && input.toString) {
    const sanitized = sanitizeText(input.toString(), { maxLength: 50 });
    return sanitized || fallback;
  }
  
  const sanitized = sanitizeText(String(input), { maxLength: 50 });
  return sanitized || fallback;
}

/**
 * Validation utilities
 */
export const validate = {
  /**
   * Check if a string is safe for display
   */
  isSafeString(str) {
    if (typeof str !== 'string') return false;
    
    // Check for common XSS patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:\s*text\/html/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(str));
  },
  
  /**
   * Check if an object has safe properties
   */
  isSafeObject(obj, requiredFields = []) {
    if (!obj || typeof obj !== 'object') return false;
    
    // Check required fields exist and are safe
    return requiredFields.every(field => {
      const value = obj[field];
      return value !== undefined && (
        typeof value !== 'string' || this.isSafeString(value)
      );
    });
  }
};

export default {
  escapeHtml,
  sanitizeText,
  sanitizeNodeLabel,
  sanitizeFilePath,
  sanitizeSearchQuery,
  sanitizeObject,
  sanitizeNodeData,
  createSafeDisplayName,
  validate
};