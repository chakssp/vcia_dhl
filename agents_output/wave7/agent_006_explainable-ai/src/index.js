/**
 * Agent 006: Explainable AI Enhanced ML Core
 * 
 * Main entry point for the explainable AI agent.
 * Exports all core components with enhanced interpretability features.
 */

// Core Components with Explainability
export { ExplainableConfidenceCalculator } from './core/ExplainableConfidenceCalculator.js';
export { ExplainableConfidenceTracker } from './core/ExplainableConfidenceTracker.js';
export { ExplainableShadowController } from './core/ExplainableShadowController.js';
export { ExplainableMLOrchestrator } from './core/ExplainableMLOrchestrator.js';

// Explainability Modules
export { SHAPExplainer } from './explainability/SHAPExplainer.js';
export { LIMEExplainer } from './explainability/LIMEExplainer.js';
export { CounterfactualGenerator } from './explainability/CounterfactualGenerator.js';
export { AttentionAnalyzer } from './explainability/AttentionAnalyzer.js';
export { NaturalLanguageExplainer } from './explainability/NaturalLanguageExplainer.js';

// Visualization Components
export { DecisionTreeVisualizer } from './visualization/DecisionTreeVisualizer.js';
export { default as DecisionTreeVisualizerDefault } from './visualization/DecisionTreeVisualizer.js';

// Default configuration for explainable AI
export const defaultConfig = {
  explainabilityLevel: 'full',
  enableSHAP: true,
  enableLIME: true,
  generateNaturalLanguage: true,
  counterfactualsEnabled: true,
  visualizationEnabled: true,
  transparencyMode: true,
  interactiveExplanations: true
};

/**
 * Initialize Explainable AI Agent
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Initialized explainable AI components
 */
export async function initializeExplainableAgent(options = {}) {
  const config = { ...defaultConfig, ...options };
  
  // Create orchestrator with explainable components
  const orchestrator = new ExplainableMLOrchestrator(config);
  
  // Initialize components
  await orchestrator.initialize();
  
  // Return public API
  return {
    orchestrator,
    
    // Direct access to components
    calculator: orchestrator.components.calculator,
    tracker: orchestrator.components.tracker,
    shadowController: orchestrator.components.shadowMode,
    
    // Utility functions
    explain: async (fileId, options) => {
      return orchestrator.handleExplanationRequest({
        fileId,
        type: 'comprehensive',
        options
      });
    },
    
    compare: async (fileIds, options) => {
      return orchestrator.handleExplanationRequest({
        fileIds,
        type: 'comparison',
        options
      });
    },
    
    whatIf: async (fileId, changes) => {
      const sessionId = await orchestrator.startInteractiveSession({ fileId });
      return orchestrator.handleInteractiveQuery({
        sessionId,
        type: 'whatif',
        changes
      });
    },
    
    audit: async (timeRange, filters) => {
      return orchestrator.handleAuditRequest({
        timeRange,
        filters
      });
    },
    
    // Configuration
    config,
    
    // Version info
    version: '1.0.0',
    agent: 'agent_006_explainable-ai'
  };
}

/**
 * Quick start function for KC integration
 */
export function registerWithKC() {
  if (typeof window !== 'undefined' && window.KC) {
    // Register explainable components
    window.KC.ExplainableConfidenceCalculator = ExplainableConfidenceCalculator;
    window.KC.ExplainableConfidenceTracker = ExplainableConfidenceTracker;
    window.KC.ExplainableShadowController = ExplainableShadowController;
    window.KC.ExplainableMLOrchestrator = ExplainableMLOrchestrator;
    
    // Register explainability modules
    window.KC.SHAPExplainer = SHAPExplainer;
    window.KC.LIMEExplainer = LIMEExplainer;
    window.KC.CounterfactualGenerator = CounterfactualGenerator;
    window.KC.AttentionAnalyzer = AttentionAnalyzer;
    window.KC.NaturalLanguageExplainer = NaturalLanguageExplainer;
    
    // Register visualization components
    window.KC.DecisionTreeVisualizer = DecisionTreeVisualizer;
    
    // Add initialization helper
    window.KC.initializeExplainableML = initializeExplainableAgent;
    
    console.log('✅ Explainable AI Agent 006 registered with KC');
    
    return true;
  }
  
  return false;
}

// Auto-register if KC is available
if (typeof window !== 'undefined') {
  // Wait for KC to be available
  const checkKC = setInterval(() => {
    if (window.KC) {
      registerWithKC();
      clearInterval(checkKC);
    }
  }, 100);
  
  // Stop checking after 5 seconds
  setTimeout(() => clearInterval(checkKC), 5000);
}

// Export version and metadata
export const metadata = {
  name: 'Explainable AI Enhanced ML Core',
  version: '1.0.0',
  agent: 'agent_006',
  wave: 7,
  focus: 'Interpretability and Explainability',
  features: [
    'SHAP explanations',
    'LIME local interpretability',
    'Attention mechanism analysis',
    'Counterfactual generation',
    'Natural language explanations',
    'Decision tree visualization',
    'Interactive explanations',
    'Transparency monitoring',
    'Audit trail',
    'Comparative analysis'
  ],
  author: 'Wave 7 ML Core Team',
  created: '2025-01-27'
};