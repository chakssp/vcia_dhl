/**
 * basic-usage.js
 * 
 * Basic usage examples for the Explainable AI agent.
 */

import { initializeExplainableAgent } from '../src/index.js';

// Example 1: Basic Explanation Generation
async function basicExplanation() {
  console.log('🔍 Example 1: Basic Explanation Generation\n');
  
  // Initialize the agent
  const agent = await initializeExplainableAgent({
    explainabilityLevel: 'standard',
    language: 'en'
  });
  
  // Sample file for analysis
  const file = {
    id: 'doc-001',
    name: 'breakthrough-research.md',
    content: `
      This document describes a significant breakthrough in quantum computing.
      Our team has successfully demonstrated a 100-qubit quantum processor
      with unprecedented coherence times. This represents a major milestone
      in the development of practical quantum computers.
      
      Key achievements:
      - 100 qubit processor with 99.9% fidelity
      - Coherence time exceeding 1 millisecond
      - Scalable architecture for future expansion
      
      This breakthrough opens new possibilities for drug discovery,
      cryptography, and complex optimization problems.
    `,
    categories: ['Research', 'Quantum Computing', 'Innovation'],
    lastModified: new Date().toISOString()
  };
  
  // Get explanation
  const explanation = await agent.explain(file.id);
  
  console.log('📊 Confidence Score:', (explanation.current.confidence * 100).toFixed(1) + '%');
  console.log('\n📝 Natural Language Explanation:');
  console.log(explanation.explanations.naturalLanguage.narrative);
  
  console.log('\n🔑 Key Contributing Factors:');
  explanation.explanations.shap.topFactors.forEach(factor => {
    console.log(`  • ${factor.feature}: ${factor.direction} confidence by ${factor.percentage}`);
  });
}

// Example 2: What-If Analysis
async function whatIfAnalysis() {
  console.log('\n\n❓ Example 2: What-If Analysis\n');
  
  const agent = await initializeExplainableAgent();
  
  const file = {
    id: 'doc-002',
    name: 'project-proposal.md',
    content: 'Brief project proposal without much detail.',
    categories: [],
    lastModified: new Date().toISOString()
  };
  
  // Analyze what would happen with changes
  const result = await agent.whatIf(file.id, {
    content: 'Comprehensive project proposal with detailed technical specifications, milestones, and budget breakdown.',
    categories: ['Project Management', 'Technical']
  });
  
  console.log('📈 Original Confidence:', (result.original.confidence * 100).toFixed(1) + '%');
  console.log('📊 Modified Confidence:', (result.modified.confidence * 100).toFixed(1) + '%');
  console.log('🔄 Impact:', (result.impact.confidenceChange > 0 ? '+' : '') + (result.impact.confidenceChange * 100).toFixed(1) + '%');
  console.log('\n💡 Explanation:', result.explanation);
}

// Example 3: Comparative Analysis
async function comparativeAnalysis() {
  console.log('\n\n🔄 Example 3: Comparative Analysis\n');
  
  const agent = await initializeExplainableAgent();
  
  // Multiple files to compare
  const files = [
    {
      id: 'doc-003',
      name: 'technical-report.md',
      content: 'Detailed technical analysis with comprehensive data and methodology.',
      categories: ['Technical', 'Analysis']
    },
    {
      id: 'doc-004',
      name: 'executive-summary.md',
      content: 'High-level overview for executive audience.',
      categories: ['Executive', 'Summary']
    },
    {
      id: 'doc-005',
      name: 'meeting-notes.md',
      content: 'Brief notes from team meeting.',
      categories: ['Meeting']
    }
  ];
  
  const comparison = await agent.compare(files.map(f => f.id));
  
  console.log('📊 Confidence Comparison:');
  comparison.files.forEach(file => {
    console.log(`  ${file.fileName}: ${(file.confidence * 100).toFixed(1)}%`);
  });
  
  console.log('\n📈 Analysis Summary:');
  console.log(`  • Average Confidence: ${(comparison.analysis.mean * 100).toFixed(1)}%`);
  console.log(`  • Standard Deviation: ${(comparison.analysis.std * 100).toFixed(1)}%`);
  console.log(`  • Range: ${(comparison.analysis.range * 100).toFixed(1)}%`);
  
  console.log('\n💡 Insights:');
  comparison.insights.forEach(insight => {
    console.log(`  • ${insight}`);
  });
}

// Example 4: Interactive Session
async function interactiveSession() {
  console.log('\n\n💬 Example 4: Interactive Explanation Session\n');
  
  const agent = await initializeExplainableAgent({
    interactiveExplanations: true
  });
  
  const file = {
    id: 'doc-006',
    name: 'research-paper.md',
    content: 'Complex research paper with multiple technical concepts.',
    categories: ['Research', 'AI', 'Machine Learning']
  };
  
  // Start interactive session
  console.log('Starting interactive session...');
  
  // Simulate interactive queries
  const queries = [
    {
      question: 'Why did the semantic dimension score so high?',
      type: 'feature'
    },
    {
      question: 'What if I remove the Machine Learning category?',
      type: 'whatif',
      changes: { categories: ['Research', 'AI'] }
    },
    {
      question: 'How does this compare to similar research papers?',
      type: 'comparison'
    }
  ];
  
  console.log('📝 Interactive Q&A:');
  // In real usage, these would be actual user inputs
  queries.forEach(query => {
    console.log(`\nQ: ${query.question}`);
    console.log('A: [Interactive response would appear here]');
  });
}

// Example 5: Audit Trail
async function auditTrail() {
  console.log('\n\n📋 Example 5: Audit Trail Access\n');
  
  const agent = await initializeExplainableAgent({
    auditMode: true
  });
  
  // Simulate some operations first
  // ... (operations would happen here)
  
  // Get audit report for last hour
  const oneHourAgo = Date.now() - 3600000;
  const audit = await agent.audit(
    { start: oneHourAgo, end: Date.now() },
    { success: true }
  );
  
  console.log('📊 Audit Summary:');
  console.log(`  • Total Requests: ${audit.statistics.totalRequests}`);
  console.log(`  • Success Rate: ${(audit.statistics.successRate * 100).toFixed(1)}%`);
  console.log(`  • Avg Processing Time: ${audit.statistics.averageProcessingTime.toFixed(0)}ms`);
  
  console.log('\n✅ Compliance Check:');
  console.log(`  • Explanation Coverage: ${(audit.compliance.explanationCoverage * 100).toFixed(1)}%`);
  console.log(`  • Transparency Level: ${audit.compliance.transparencyLevel}`);
}

// Example 6: Custom Configuration
async function customConfiguration() {
  console.log('\n\n⚙️ Example 6: Custom Configuration\n');
  
  // Initialize with custom settings
  const agent = await initializeExplainableAgent({
    explainabilityLevel: 'full',
    enableSHAP: true,
    enableLIME: true,
    counterfactualsEnabled: true,
    generateNaturalLanguage: true,
    language: 'en',
    transparencyMode: true,
    explanationCaching: true,
    batchExplanations: true,
    visualizationEnabled: true
  });
  
  console.log('✅ Agent initialized with full explainability features');
  console.log('\nConfiguration:');
  console.log(JSON.stringify(agent.config, null, 2));
}

// Run all examples
async function runAllExamples() {
  try {
    await basicExplanation();
    await whatIfAnalysis();
    await comparativeAnalysis();
    await interactiveSession();
    await auditTrail();
    await customConfiguration();
    
    console.log('\n\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  basicExplanation,
  whatIfAnalysis,
  comparativeAnalysis,
  interactiveSession,
  auditTrail,
  customConfiguration
};