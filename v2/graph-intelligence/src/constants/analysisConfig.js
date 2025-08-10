/**
 * Analysis Configuration Constants
 * 
 * Centralizes magic numbers and configuration values for better maintainability
 * and performance optimization.
 */

export const ANALYSIS_CONFIG = {
  // Performance Limits
  MAX_COMPARISONS: 1000,
  MAX_SUGGESTIONS: 20,
  MAX_KEYWORDS_DISPLAY: 5,
  MAX_CATEGORIES_DISPLAY: 5,
  MAX_CONVERGENCES_DISPLAY: 3,
  
  // Confidence Thresholds
  MIN_CONFIDENCE: 0.3,
  HIGH_CONFIDENCE: 0.7,
  VERY_HIGH_CONFIDENCE: 0.9,
  
  // Connection Strength Weights
  WEIGHTS: {
    KEYWORD_WEIGHT: 0.15,
    CATEGORY_WEIGHT: 0.25,
    CONVERGENCE_WEIGHT: 0.4,
    SCORE_SIMILARITY_WEIGHT: 0.1,
    MAX_SCORE_DIFFERENCE: 0.1
  },
  
  // Layout Configuration
  LAYOUT: {
    CENTER_X: 400,
    CENTER_Y: 300,
    RADIUS_BASE: 200,
    RADIUS_INCREMENT: 100,
    POINT_ANGLE_INCREMENT: 0.3,
    FIT_VIEW_PADDING: 0.1,
    FIT_VIEW_DELAY: 100
  },
  
  // Node Configuration
  NODE: {
    GROUP_DEFAULT_WIDTH: 400,
    GROUP_DEFAULT_HEIGHT: 300,
    MAX_PREVIEW_LENGTH: 50,
    MAX_TEXT_DISPLAY: 50
  },
  
  // Edge Configuration
  EDGE: {
    MIN_STROKE_WIDTH: 1,
    MAX_STROKE_WIDTH: 4,
    ANIMATED_CONFIDENCE_THRESHOLD: 0.7
  },
  
  // Text Processing
  TEXT: {
    MIN_KEYWORD_LENGTH: 4,
    MAX_EXTRACTED_KEYWORDS: 5,
    IMPORTANT_WORDS: [
      'decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough',
      'estratégia', 'análise', 'projeto', 'desenvolvimento', 'implementação',
      'solução', 'problema', 'desafio', 'oportunidade', 'resultado',
      'processo', 'método', 'framework', 'arquitetura', 'integração'
    ]
  },
  
  // Category Icons
  CATEGORY_ICONS: {
    'technical': '⚙️',
    'business': '💼',
    'research': '🔬',
    'documentation': '📄',
    'analysis': '📊',
    'development': '💻',
    'strategy': '🎯',
    'insights': '💡',
    'default': '📦'
  },
  
  // Edge Colors
  EDGE_COLORS: {
    'keywords': '#3498db',
    'categories': '#2ecc71',
    'convergence': '#e74c3c',
    'multiple': '#9b59b6',
    'default': '#95a5a6'
  },
  
  // Timeouts and Delays
  TIMEOUTS: {
    CONNECTION_TIMEOUT: 5000,
    DEBOUNCE_DELAY: 300,
    RETRY_DELAY: 1000,
    MAX_RETRIES: 3
  },
  
  // Validation Rules
  VALIDATION: {
    MIN_DATA_LENGTH: 0,
    MAX_STRING_LENGTH: 1000,
    REQUIRED_FIELDS: ['id', 'payload']
  }
};

// Frozen to prevent accidental mutations
Object.freeze(ANALYSIS_CONFIG);
Object.freeze(ANALYSIS_CONFIG.WEIGHTS);
Object.freeze(ANALYSIS_CONFIG.LAYOUT);
Object.freeze(ANALYSIS_CONFIG.NODE);
Object.freeze(ANALYSIS_CONFIG.EDGE);
Object.freeze(ANALYSIS_CONFIG.TEXT);
Object.freeze(ANALYSIS_CONFIG.CATEGORY_ICONS);
Object.freeze(ANALYSIS_CONFIG.EDGE_COLORS);
Object.freeze(ANALYSIS_CONFIG.TIMEOUTS);
Object.freeze(ANALYSIS_CONFIG.VALIDATION);

export default ANALYSIS_CONFIG;