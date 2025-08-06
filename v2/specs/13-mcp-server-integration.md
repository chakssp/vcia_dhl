# 13 - MCP Server Integration Spec (vNext)

## Status: 🔮 FUTURE - PREPARADO PARA PRÓXIMA VERSÃO

### Objetivo: Integrar Knowledge Consolidator com ecossistema MCP

## 🔌 O QUE É MCP?

**Model Context Protocol** - Protocolo padronizado para comunicação entre aplicações e serviços de IA, permitindo:
- Compartilhamento de contexto entre ferramentas
- Orquestração de múltiplos agentes
- Persistência de memória entre sessões
- Automação de workflows complexos

## 🎯 CASOS DE USO NO KC

### 1. Memory Serve - Grafo de Conhecimento Persistente
```javascript
// Sincroniza descobertas do KC com grafo de conhecimento
const MemoryIntegration = {
  // Ao analisar arquivo
  onFileAnalyzed: async (file) => {
    await mcp.memory.createEntity({
      name: file.name,
      type: 'Document',
      observations: [
        file.preview,
        `Análise: ${file.analysisType}`,
        `Relevância: ${file.relevanceScore}%`
      ]
    });
    
    // Criar relações baseadas em categorias
    for (const category of file.categories) {
      await mcp.memory.createRelation({
        from: file.name,
        to: category,
        type: 'belongs_to'
      });
    }
  },
  
  // Busca semântica enriquecida
  searchWithMemory: async (query) => {
    const memories = await mcp.memory.searchNodes(query);
    const kcResults = await KC.searchFiles(query);
    
    // Combina resultados do KC com memórias
    return mergeResults(kcResults, memories);
  }
};
```

### 2. Puppeteer - Captura Visual Automatizada
```javascript
// Gera screenshots de análises e dashboards
const VisualCapture = {
  // Screenshot do grafo de conhecimento
  captureKnowledgeGraph: async () => {
    await mcp.puppeteer.navigate('http://localhost:5500#graph');
    await mcp.puppeteer.waitForSelector('.graph-container');
    
    const screenshot = await mcp.puppeteer.screenshot({
      name: `graph-${Date.now()}`,
      fullPage: true,
      savePng: true
    });
    
    return screenshot;
  },
  
  // Documentação visual automática
  generateVisualReport: async (analysisId) => {
    const pages = [
      '#discovery',
      '#analysis-results',
      '#categories',
      '#export'
    ];
    
    const screenshots = [];
    for (const page of pages) {
      await mcp.puppeteer.navigate(`http://localhost:5500${page}`);
      screenshots.push(await mcp.puppeteer.screenshot({
        name: `report-${page.slice(1)}`
      }));
    }
    
    return screenshots;
  }
};
```

### 3. Sequential Think - Análise Profunda
```javascript
// Análise multi-etapas para arquivos complexos
const DeepAnalysis = {
  analyzeComplexDocument: async (file) => {
    const analysis = await mcp.sequentialThink({
      thought: `Analisar profundamente: ${file.name}`,
      totalThoughts: 10,
      context: {
        content: file.content,
        preview: file.preview,
        categories: file.categories
      }
    });
    
    // Cada thought adiciona camadas de compreensão
    const insights = [];
    for (let i = 0; i < analysis.thoughts.length; i++) {
      if (analysis.thoughts[i].nextThoughtNeeded) {
        insights.push(analysis.thoughts[i].insight);
      }
    }
    
    return {
      deepInsights: insights,
      confidence: analysis.finalConfidence,
      recommendations: analysis.recommendations
    };
  }
};
```

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### MCP Service Layer
```javascript
class MCPService {
  constructor() {
    this.servers = new Map();
    this.connections = new Map();
  }
  
  async initialize(config) {
    for (const serverConfig of config.servers) {
      if (serverConfig.autoConnect) {
        await this.connect(serverConfig);
      }
    }
  }
  
  async connect(serverConfig) {
    try {
      const connection = await this.createConnection(serverConfig);
      this.connections.set(serverConfig.name, connection);
      
      // Registra capacidades
      this.registerCapabilities(serverConfig.name, serverConfig.capabilities);
      
      EventBus.emit('MCP_SERVER_CONNECTED', {
        server: serverConfig.name,
        capabilities: serverConfig.capabilities
      });
      
    } catch (error) {
      console.error(`Failed to connect to ${serverConfig.name}:`, error);
    }
  }
  
  async call(server, method, params) {
    const connection = this.connections.get(server);
    if (!connection) {
      throw new Error(`Server ${server} not connected`);
    }
    
    return await connection.call(method, params);
  }
}
```

### Integração com KC Events
```javascript
// Auto-sync com Memory Serve
EventBus.on(Events.FILE_ANALYZED, async (data) => {
  if (settings.get('mcp.knowledgeGraph.autoSync')) {
    await MCPService.call('memory-serve', 'create_entity', {
      entity: {
        name: data.file.name,
        type: 'AnalyzedDocument',
        observations: [data.analysis.result]
      }
    });
  }
});

// Visual capture automático
EventBus.on(Events.ANALYSIS_COMPLETED, async (data) => {
  if (settings.get('mcp.visualCapture.captureOn').includes('analysis-complete')) {
    await MCPService.call('puppeteer', 'screenshot', {
      name: `analysis-${data.jobId}`,
      selector: '.analysis-results'
    });
  }
});
```

### Command Palette Integration
```javascript
commands.push(
  {
    id: 'mcp-connect-all',
    title: 'MCP: Connect All Servers',
    action: () => MCPService.connectAll()
  },
  {
    id: 'mcp-sync-memory',
    title: 'MCP: Sync to Knowledge Graph',
    action: () => syncToMemoryServe()
  },
  {
    id: 'mcp-deep-analysis',
    title: 'MCP: Deep Analysis (Sequential Think)',
    action: () => runDeepAnalysis(selectedFiles)
  },
  {
    id: 'mcp-capture-state',
    title: 'MCP: Capture Visual State',
    action: () => captureCurrentState()
  }
);
```

## 📊 CONFIGURAÇÃO NO SETTINGS

```javascript
// Settings > External Services > MCP
{
  mcp: {
    enabled: true,
    servers: [
      {
        name: 'memory-serve',
        endpoint: 'http://localhost:3000',
        capabilities: ['knowledge-graph', 'entities', 'relations'],
        autoConnect: true,
        authentication: {
          type: 'api-key',
          key: '***'
        }
      },
      {
        name: 'puppeteer',
        endpoint: 'http://localhost:3001',
        capabilities: ['browser-automation', 'screenshots', 'pdf'],
        autoConnect: false,
        options: {
          headless: true,
          defaultViewport: {
            width: 1920,
            height: 1080
          }
        }
      },
      {
        name: 'sequential-think',
        endpoint: 'http://localhost:3002',
        capabilities: ['chain-of-thought', 'reasoning', 'hypothesis'],
        autoConnect: true,
        config: {
          defaultThoughts: 5,
          maxThoughts: 20
        }
      }
    ],
    
    integrations: {
      knowledgeGraph: {
        server: 'memory-serve',
        autoSync: true,
        syncEvents: [
          'file-analyzed',
          'category-changed',
          'export-ready'
        ]
      },
      
      visualCapture: {
        server: 'puppeteer',
        captureOn: ['analysis-complete', 'graph-rendered'],
        format: 'png',
        storage: 'local' // ou 'supabase'
      },
      
      deepAnalysis: {
        server: 'sequential-think',
        triggerMode: 'manual', // ou 'auto'
        autoTriggerRules: {
          minFileSize: 50000, // 50KB
          fileTypes: ['.pdf', '.docx'],
          complexityScore: 80
        }
      }
    }
  }
}
```

## 🎯 BENEFÍCIOS

1. **Memória Persistente**: Conhecimento preservado entre sessões
2. **Análise Profunda**: Chain-of-thought para documentos complexos
3. **Documentação Visual**: Screenshots automáticos de estados
4. **Integração Seamless**: Funciona em background
5. **Extensibilidade**: Fácil adicionar novos servidores MCP

## 🚀 ROADMAP MCP

### Fase 1: Infraestrutura Base
- [ ] MCPService implementation
- [ ] Settings UI para configuração
- [ ] Teste com servers locais

### Fase 2: Integrações Core
- [ ] Memory Serve sync bidirecional
- [ ] Puppeteer para reports visuais
- [ ] Sequential Think para análises

### Fase 3: Automações Avançadas
- [ ] Workflows automáticos
- [ ] Triggers customizáveis
- [ ] Dashboard de status MCP

## 📝 NOTAS

- MCP é opcional - KC funciona 100% sem ele
- Preparado para quando MCP estiver maduro
- Arquitetura permite adicionar novos servers facilmente
- Foco em valor agregado, não complexidade

### Status: ESPECIFICADO ✅ | Implementação: FUTURA 🔮