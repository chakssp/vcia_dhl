// Configuration for all services
export const config = {
  // Qdrant Vector Database
  qdrant: {
    url: 'http://qdr.vcia.com.br:6333',
    collection: 'knowledge_consolidator'
  },
  
  // Ollama Embeddings (local first, VPS as backup)
  ollama: {
    local: 'http://localhost:11434',
    vps: 'http://olgapi.mciar.com',
    model: 'nomic-embed-text'
  },
  
  // N8N Workflow Automation
  n8n: {
    editor: 'http://n8n.vcia.com.br',
    webhook: 'http://n8h.vcia.com.br',
    // Specific webhook endpoints
    endpoints: {
      captureDecision: '/webhook/decision-capture',
      analyzePattern: '/webhook/pattern-analysis',
      triggerAlert: '/webhook/decision-alert'
    }
  },
  
  // Flowise AI Flows
  flowise: {
    url: 'http://flo.vcia.com.br',
    // Different flows for different purposes
    flows: {
      analyzeFailure: '/api/v1/prediction/failure-analysis',
      predictOutcome: '/api/v1/prediction/outcome-prediction',
      generateInsights: '/api/v1/prediction/insight-generation'
    }
  },
  
  // PostgreSQL (via PgAdmin at pga.vcia.com.br)
  postgres: {
    host: 'pga.vcia.com.br',
    port: 5432,
    database: 'decision_evolution',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres'
  },
  
  // Neo4j Graph Database (to be provisioned)
  neo4j: {
    uri: 'bolt://n4o.mciar.com:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password'
  },
  
  // Supabase (alternative to direct PostgreSQL)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  }
};