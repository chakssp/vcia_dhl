# 10 - Unified Settings Panel Spec

## Status: 🆕 NOVA ARQUITETURA DE CONFIGURAÇÃO CENTRALIZADA

### Objetivo: Settings como Centro de Controle Global

## 🎛️ ESTRUTURA DO SETTINGS PANEL V2

```
Settings (Ctrl+,)
├── 📁 Discovery & Patterns
│   ├── Include Patterns (+)
│   ├── Exclude Patterns (-)
│   ├── File Type Support
│   └── Parser Configuration
│   └── Achivement Files (Deduplication/Base Histórica/Diretórios/Asset_History/Exclusion_Files/Enrichment_Files/Temporal_Data)
│
├── 🏷️ Categories & Boosts
│   ├── Category Management (CRUD)
│   ├── Relevance Boost Settings
│   ├── Auto-categorization Rules
│   └── Import/Export Categories/Colors/Personalization
│
├── 🧠 AI & Embeddings
│   ├── LLM Providers
│   │   ├── Ollama (endpoint, models)
│   │   ├── OpenAI (key, model)
│   │   ├── Anthropic (key, model)
│   │   └── Custom Provider
│   ├── Prompt Templates
│   ├── Embedding Settings
│   │   ├── Model Selection
│   │   ├── Dimension Config
│   │   └── Similarity Threshold
│   └── Analysis Parameters
│
├── 🎯 Clusters & Verticals
│   ├── Cluster Definitions / ***tipoAnalise***
│   ├── Vertical Analysis Config
│   ├── Custom Embeddings per Vertical
│   └── Cluster Auto-Assignment
│
├── 🧮 Schema.org
│   ├── Enable Auto-Detection
│   ├── Default Schemas
│   ├── Custom Mappings
│   └── Export Format (JSON-LD)
│
├── 🔌 API Connections
│   ├── Qdrant
│   │   ├── Endpoint
│   │   ├── API Key
│   │   └── Collection Settings
│   ├── Supabase
│   │   ├── URL
│   │   ├── Anon Key
│   │   └── Schema Config
│   └── External Services
│       ├── N8N Workflows
│       ├── Flowise Chatflows
│       ├── MCP Servers (vNext)
│       ├── Gmail OAuth
│       └── Notion API
│
├── 📄 Data Management
│   ├── Export Templates
│   │   ├── Markdown (Obsidian/Notion)
│   │   ├── JSON (Qdrant/ElasticSearch)
│   │   └── PDF (Report/Cards)
│   ├── Backup & Restore
│   │   ├── Auto Backup Schedule
│   │   ├── Retention Policy
│   │   └── Encryption Settings
│   └── Migration Tools
│
├── 🎨 Appearance
│   ├── Theme Selection
│   ├── Custom Themes
│   ├── CSS Overrides
│   └── Animation Settings
│
└── 🔧 Advanced
    ├── Log Levels
    ├── Performance Tuning
    ├── Cache Management
    └── Developer Options
```

## 💾 IMPLEMENTAÇÃO TÉCNICA

### Settings Service
```javascript
class SettingsService {
  constructor() {
    this.settings = new Map();
    this.listeners = new Map();
    this.persistence = new PersistenceService();
  }
  
  // Carrega todas as configurações
  async loadSettings() {
    const stored = await this.persistence.get('settings', {});
    
    // Merge com defaults
    this.settings = new Map([
      ...this.getDefaults(),
      ...Object.entries(stored)
    ]);
  }
  
  // Get/Set com notificação
  get(path) {
    return this.settings.get(path);
  }
  
  async set(path, value) {
    const oldValue = this.settings.get(path);
    this.settings.set(path, value);
    
    // Persiste
    await this.persistence.set('settings', Object.fromEntries(this.settings));
    
    // Notifica listeners
    this.notify(path, value, oldValue);
  }
  
  // Subscribe to changes
  onChange(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);
  }
}
```

### Settings UI Components

#### 1. Discovery & Patterns
```javascript
// Component: PatternEditor
<div class="settings-section">
  <h3>Discovery Patterns</h3>
  
  <div class="pattern-editor">
    <label>Include Patterns</label>
    <textarea 
      value={settings.get('discovery.includePatterns').join('\n')}
      onChange={(e) => updatePatterns('include', e.target.value)}
      placeholder="/.claude/\n*.eml\n*.md"
    />
    
    <label>Exclude Patterns</label>
    <textarea 
      value={settings.get('discovery.excludePatterns').join('\n')}
      onChange={(e) => updatePatterns('exclude', e.target.value)}
      placeholder="*/node_modules/*\ntemp/"
    />
  </div>
  
  <div class="parser-config">
    <h4>Content Parsers</h4>
    <label>
      <input type="checkbox" checked={settings.get('parsers.pdf.enabled')} />
      Enable PDF Parser (pdf.js)
    </label>
    <label>
      <input type="checkbox" checked={settings.get('parsers.docx.enabled')} />
      Enable DOCX Parser (mammoth.js)
    </label>
  </div>
</div>
```

#### 2. Categories & Boosts
```javascript
// Component: CategoryManager
<div class="settings-section">
  <h3>Category Management</h3>
  
  <div class="category-list">
    {categories.map(cat => (
      <div class="category-item">
        <input 
          type="color" 
          value={cat.color}
          onChange={(e) => updateCategory(cat.id, 'color', e.target.value)}
        />
        <input 
          type="text" 
          value={cat.name}
          onChange={(e) => updateCategory(cat.id, 'name', e.target.value)}
        />
        <input 
          type="number" 
          value={cat.boost}
          min="0" 
          max="50"
          onChange={(e) => updateCategory(cat.id, 'boost', e.target.value)}
        />
        <span>% boost</span>
        <button onClick={() => deleteCategory(cat.id)}>🗑️</button>
      </div>
    ))}
  </div>
  
  <button onClick={addCategory}>+ Add Category</button>
  <button onClick={exportCategories}>Export</button>
  <button onClick={importCategories}>Import</button>
</div>
```

#### 3. AI & LLM Configuration
```javascript
// Component: AIConfig
<div class="settings-section">
  <h3>AI Providers</h3>
  
  <div class="provider-tabs">
    <button class="tab active">Ollama</button>
    <button class="tab">OpenAI</button>
    <button class="tab">Anthropic</button>
  </div>
  
  <div class="provider-config">
    <!-- Ollama -->
    <label>Endpoint</label>
    <input 
      type="url" 
      value={settings.get('ai.ollama.endpoint')}
      placeholder="http://127.0.0.1:11434"
    />
    
    <label>Model</label>
    <select value={settings.get('ai.ollama.model')}>
      <option>llama2</option>
      <option>mistral</option>
      <option>codellama</option>
    </select>
    
    <button onClick={testOllamaConnection}>Test Connection</button>
  </div>
  
  <div class="prompt-templates">
    <h4>Prompt Templates</h4>
    <select onChange={loadTemplate}>
      <option>decisiveMoments</option>
      <option>technicalInsights</option>
      <option>custom</option>
    </select>
    
    <textarea 
      value={currentTemplate}
      onChange={updateTemplate}
      rows="10"
    />
  </div>
</div>
```

#### 4. Clusters & Verticals
```javascript
// Component: ClusterConfig
<div class="settings-section">
  <h3>Cluster Configuration</h3>
  
  <div class="cluster-list">
    {clusters.map(cluster => (
      <div class="cluster-item">
        <input 
          type="text" 
          value={cluster.name}
          placeholder="Technical Documentation"
        />
        
        <label>Embedding Model</label>
        <select value={cluster.embeddingModel}>
          <option>nomic-embed-text</option>
          <option>all-MiniLM-L6-v2</option>
          <option>custom</option>
        </select>
        
        <label>Analysis Focus</label>
        <textarea 
          value={cluster.analysisFocus}
          placeholder="Focus on technical details, code examples..."
        />
        
        <label>Auto-assign Keywords</label>
        <input 
          type="text" 
          value={cluster.keywords.join(', ')}
          placeholder="api, code, technical"
        />
      </div>
    ))}
  </div>
  
  <button onClick={addCluster}>+ Add Cluster</button>
</div>
```

#### 5. API Connections
```javascript
// Component: APIConfig
<div class="settings-section">
  <h3>External Services</h3>
  
  <!-- Qdrant -->
  <div class="service-config">
    <h4>Qdrant Vector Database</h4>
    <input 
      type="url" 
      value={settings.get('qdrant.endpoint')}
      placeholder="http://qdr.vcia.com.br:6333"
    />
    <input 
      type="password" 
      value={settings.get('qdrant.apiKey')}
      placeholder="API Key (optional)"
    />
    <button onClick={testQdrantConnection}>Test</button>
  </div>
  
  <!-- Supabase -->
  <div class="service-config">
    <h4>Supabase (Persistence)</h4>
    <input 
      type="url" 
      value={settings.get('supabase.url')}
      placeholder="https://xxx.supabase.co"
    />
    <input 
      type="password" 
      value={settings.get('supabase.anonKey')}
      placeholder="Anon Key"
    />
    <button onClick={testSupabaseConnection}>Test</button>
  </div>
</div>
```

### Settings Import/Export
```javascript
// Exportar todas as configurações
async function exportSettings() {
  const settings = await settingsService.getAllSettings();
  const blob = new Blob([JSON.stringify(settings, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kc-settings-${new Date().toISOString()}.json`;
  a.click();
}

// Importar configurações
async function importSettings(file) {
  const text = await file.text();
  const settings = JSON.parse(text);
  
  // Validar estrutura
  if (!validateSettingsStructure(settings)) {
    throw new Error('Invalid settings file');
  }
  
  // Aplicar com confirmação
  if (confirm('This will override all current settings. Continue?')) {
    await settingsService.importSettings(settings);
    location.reload(); // Recarregar para aplicar
  }
}
```

### Command Palette Integration
```javascript
// Adicionar comandos de settings
commands.push(
  {
    id: 'settings-open',
    title: 'Open Settings',
    shortcut: ['Ctrl', ','],
    action: () => openSettings()
  },
  {
    id: 'settings-export',
    title: 'Export Settings',
    action: () => exportSettings()
  },
  {
    id: 'settings-import',
    title: 'Import Settings',
    action: () => document.getElementById('import-settings').click()
  },
  {
    id: 'settings-reset',
    title: 'Reset Settings to Default',
    action: () => resetSettings()
  }
);
```

### 🆕 QUICK WINS INTEGRADOS

#### Export Templates (Movido para Settings)
```javascript
// Settings > Data Management > Export Templates
<div class="settings-section">
  <h3>Export Templates</h3>
  
  <div class="template-editor">
    <label>Format</label>
    <select onChange={selectFormat}>
      <option value="markdown">Markdown</option>
      <option value="json">JSON</option>
      <option value="pdf">PDF</option>
    </select>
    
    {format === 'markdown' && (
      <div>
        <label>Style</label>
        <select>
          <option>Obsidian</option>
          <option>Notion</option>
          <option>Custom</option>
        </select>
        <label>
          <input type="checkbox" /> Include Frontmatter
        </label>
      </div>
    )}
    
    <button onClick={createTemplate}>+ Create Custom Template</button>
  </div>
</div>
```

#### Backup & Restore (Movido para Settings)
```javascript
// Settings > Data Management > Backup & Restore
<div class="settings-section">
  <h3>Automatic Backup</h3>
  
  <label>
    <input type="checkbox" checked={settings.get('backup.auto')} />
    Enable Auto Backup
  </label>
  
  <div class="backup-schedule">
    <label>Frequency</label>
    <select value={settings.get('backup.frequency')}>
      <option>Hourly</option>
      <option>Daily</option>
      <option>Weekly</option>
    </select>
    
    <label>Time</label>
    <input type="time" value={settings.get('backup.time')} />
    
    <label>Retention (days)</label>
    <input type="number" value={settings.get('backup.retention')} />
  </div>
  
  <div class="backup-actions">
    <button onClick={backupNow}>🔄 Backup Now</button>
    <button onClick={showBackups}>📋 View Backups</button>
    <button onClick={restoreBackup}>♻️ Restore...</button>
  </div>
</div>
```

#### Theme Manager (Movido para Settings)
```javascript
// Settings > Appearance > Themes
<div class="settings-section">
  <h3>Theme Selection</h3>
  
  <div class="theme-grid">
    {themes.map(theme => (
      <div 
        class={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}
        onClick={() => applyTheme(theme.id)}
      >
        <div class="theme-preview" style={{background: theme.colors.background}}>
          <span style={{color: theme.colors.primary}}>Aa</span>
        </div>
        <h4>{theme.name}</h4>
      </div>
    ))}
  </div>
  
  <div class="custom-css">
    <label>Custom CSS</label>
    <textarea 
      value={settings.get('appearance.customCSS')}
      placeholder="/* Your custom styles */"
      rows="10"
    />
  </div>
  
  <label>
    <input type="checkbox" checked={settings.get('appearance.animations')} />
    Enable Animations
  </label>
</div>
```

### Schema.org Integration
```javascript
// Settings > Schema.org
<div class="settings-section">
  <h3>Schema.org Configuration</h3>
  
  <label>
    <input type="checkbox" checked={settings.get('schemaOrg.autoDetect')} />
    Auto-detect Schema Types
  </label>
  
  <div class="schema-mappings">
    <h4>Custom Mappings</h4>
    {Object.entries(settings.get('schemaOrg.mappings')).map(([key, value]) => (
      <div class="mapping-row">
        <input value={key} placeholder="File Pattern" />
        <span>→</span>
        <select value={value}>
          <option>Article</option>
          <option>Report</option>
          <option>Dataset</option>
          <option>Offer</option>
        </select>
      </div>
    ))}
    <button onClick={addMapping}>+ Add Mapping</button>
  </div>
</div>
```

### N8N & Flowise Configuration
```javascript
// Settings > External Services
<div class="settings-section">
  <h3>N8N Integration</h3>
  
  <input 
    type="url" 
    value={settings.get('n8n.endpoint')}
    placeholder="https://n8n.empresa.com.br"
  />
  
  <input 
    type="password" 
    value={settings.get('n8n.apiKey')}
    placeholder="API Key"
  />
  
  <div class="workflow-triggers">
    <h4>Workflow Triggers</h4>
    <label>On Analysis Complete</label>
    <input placeholder="workflow_id" />
    
    <label>On Export Ready</label>
    <input placeholder="workflow_id" />
    
    <label>On Category Change</label>
    <input placeholder="workflow_id" />
  </div>
  
  <button onClick={testN8NConnection}>Test Connection</button>
</div>

<!-- Similar para Flowise -->
<div class="settings-section">
  <h3>Flowise Integration</h3>
  <!-- Config similar... -->
</div>
```

### MCP Server Configuration (vNext)
```javascript
// Settings > External Services > MCP
<div class="settings-section">
  <h3>MCP Server Configuration</h3>
  
  <label>
    <input type="checkbox" checked={settings.get('mcp.enabled')} />
    Enable MCP Integration
  </label>
  
  <div class="mcp-servers">
    <h4>Available Servers</h4>
    
    {settings.get('mcp.servers').map(server => (
      <div class="server-config">
        <h5>{server.name}</h5>
        
        <input 
          type="url" 
          value={server.endpoint}
          placeholder="http://localhost:3000"
        />
        
        <label>
          <input 
            type="checkbox" 
            checked={server.autoConnect}
          />
          Auto-connect on startup
        </label>
        
        <div class="capabilities">
          {server.capabilities.map(cap => (
            <span class="capability-tag">{cap}</span>
          ))}
        </div>
        
        <button onClick={() => testMCPServer(server)}>Test</button>
      </div>
    ))}
    
    <button onClick={addMCPServer}>+ Add MCP Server</button>
  </div>
  
  <div class="mcp-integrations">
    <h4>KC Integrations</h4>
    
    <label>Knowledge Graph Sync</label>
    <select value={settings.get('mcp.knowledgeGraph.server')}>
      <option value="">Disabled</option>
      <option value="memory-serve">Memory Serve</option>
    </select>
    
    <label>Visual Capture</label>
    <select value={settings.get('mcp.visualCapture.server')}>
      <option value="">Disabled</option>
      <option value="puppeteer">Puppeteer</option>
    </select>
    
    <label>Deep Analysis</label>
    <select value={settings.get('mcp.deepAnalysis.server')}>
      <option value="">Disabled</option>
      <option value="sequential-think">Sequential Think</option>
    </select>
  </div>
</div>
```

## 🎯 BENEFÍCIOS

1. **Centralização Total**: Todas as configurações em um único lugar
2. **Sem Código**: Usuário configura tudo pela UI
3. **Portabilidade**: Export/Import de configurações
4. **Validação**: Testa conexões antes de salvar
5. **Documentação Inline**: Tooltips explicativos
6. **Atalhos Rápidos**: Acesso via Ctrl+,
7. **Quick Wins Integrados**: Export, Backup e Themes agora no Settings
8. **MCP Ready**: Suporte completo para servidores MCP (vNext)

## 📝 NOTAS DE IMPLEMENTAÇÃO

- Settings salvos no Supabase/IndexedDB
- Mudanças aplicadas em tempo real
- Validação antes de salvar
- Backup automático de configurações
- Reset para defaults disponível
- Quick Wins agora são seções nativas do Settings
- Tudo acessível via Command Palette

### Próximo: [11-scenario-generator-br.md](./11-scenario-generator-br.md)