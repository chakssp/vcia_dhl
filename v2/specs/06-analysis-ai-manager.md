# 06 - AnalysisManager + AIAPIManager Integration Spec

## Status: 🔍 AGUARDANDO VALIDAÇÃO DE COMPONENTES

### Ordem de Implementação: 6/8

### Componentes Envolvidos
```
AnalysisManager
├── Queue System (Fila de processamento)
├── Batch Processing (Lotes de 5-10 arquivos)
├── Progress Tracking
└── Result Storage

AIAPIManager
├── Provider Management
│   ├── Ollama (Local) - PRIORIDADE
│   ├── OpenAI
│   ├── Gemini
│   └── Anthropic
├── Fallback System
├── Rate Limiting
└── API Key Management

PromptManager
├── Templates
│   ├── decisiveMoments
│   ├── technicalInsights
│   └── projectAnalysis
└── Custom Templates

AnalysisAdapter
├── Response Normalization
├── Error Handling
└── Format Conversion
```

### Fluxo de Análise V2
```javascript
// 1. Usuário seleciona arquivos e clica "Analyze"
PowerApp.handleBulkAnalysis(selectedFiles)

// 2. Cria job de análise
const job = {
  id: generateId(),
  files: selectedFiles,
  template: 'decisiveMoments',
  provider: 'ollama', // ou auto-select
  status: 'queued'
};

// 3. Processa em batches
for (const batch of chunks(job.files, 5)) {
  const results = await analyzeWithRetry(batch);
  updateProgress(job.id, progress);
}

// 4. Atualiza UI em tempo real
EventBus.emit('ANALYSIS_PROGRESS', { job, progress });
```

### Integração Command Palette
```javascript
commands.push({
  id: 'analyze-selected',
  title: 'Analyze Selected Files',
  shortcut: ['Ctrl', 'A'],
  action: () => this.analyzeSelected()
});

commands.push({
  id: 'analyze-all-pending',
  title: 'Analyze All Pending',
  shortcut: ['Ctrl', 'Alt', 'A'],
  action: () => this.analyzeAllPending()
});
```

### Configuração de Providers V2
```javascript
// Settings panel integrado
const AISettings = {
  defaultProvider: 'ollama',
  providers: {
    ollama: {
      endpoint: 'http://127.0.0.1:11434',
      models: ['llama2', 'mistral', 'codellama'],
      enabled: true
    },
    openai: {
      apiKey: '***',
      model: 'gpt-3.5-turbo',
      enabled: false
    }
  },
  autoFallback: true,
  maxRetries: 3
};
```

### Questões para Validar
1. **Manter sistema de filas atual?**
2. **Implementar Web Workers para não bloquear UI?**
3. **Salvar resultados no Supabase ou local?**
4. **Adicionar análise em streaming?**
5. **Criar dashboard de jobs de análise?**

### Melhorias Propostas
- [ ] Análise incremental (não re-analisar arquivos)
- [ ] Cache de resultados por hash do arquivo
- [ ] Exportação de resultados em batch
- [ ] Métricas de qualidade da análise
- [ ] Modo offline com modelo local

### Próximo: [07-qdrant-embedding-services.md](./07-qdrant-embedding-services.md)