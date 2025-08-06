# 🔧 Guia de Solução de Problemas

## Diagnóstico Rápido

### Comando de Diagnóstico Principal
```javascript
// Execute no console do navegador (F12)
kcdiag()
```

**Saída Esperada**:
```
✅ Knowledge Consolidator Diagnostic
✅ EventBus: OK
✅ AppState: OK (1,247 files loaded)
✅ Components: 23/23 registered
✅ Ollama: Connected (localhost:11434)
✅ Qdrant: Connected (qdr.vcia.com.br:6333)
✅ UnifiedConfidenceSystem: Active
✅ Memory Usage: 45.2MB / 2GB
```

### Verificação de Componentes
```javascript
// Verificar componentes específicos
KC.AppController.getComponentStatus()
KC.UnifiedConfidenceController.healthCheck()
KC.QdrantService.checkConnection()
KC.AIAPIManager.getProvidersHealth()
```

## 🚨 Problemas Comuns e Soluções

### 1. Sistema Não Carrega

#### Sintomas
- Página em branco
- Erro "KC is not defined"
- Scripts não carregam

#### Diagnóstico
```javascript
// Verificar se o namespace existe
typeof window.KnowledgeConsolidator

// Verificar carregamento de scripts
document.querySelectorAll('script[src*="js/"]').length

// Verificar erros no console
console.log('Errors:', window.errors || [])
```

#### Soluções
1. **Limpar Cache**:
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Verificar Servidor**:
   ```bash
   # Verificar se Five Server está rodando
   netstat -an | grep 5500
   ```

3. **Recarregar Componentes**:
   ```javascript
   // Recarregar forçado
   window.location.reload(true)
   ```

### 2. Arquivos Não Aparecem

#### Sintomas
- Lista de arquivos vazia
- Contador zerado
- Erro "No files discovered"

#### Diagnóstico
```javascript
// Verificar handles de arquivo
KC.HandleManager.list()

// Verificar estado dos arquivos
KC.AppState.get('files')

// Verificar filtros ativos
KC.FilterManager.getCurrentFilters()
```

#### Soluções
1. **Verificar Permissões**:
   ```javascript
   // Testar File System Access API
   if ('showDirectoryPicker' in window) {
     console.log('✅ File System Access API disponível')
   } else {
     console.log('❌ Navegador não suporta File System Access API')
   }
   ```

2. **Reselecionar Pasta**:
   - Etapa 1 → Descoberta
   - Clique "📁 Selecionar Pasta"
   - Escolha a pasta novamente

3. **Verificar Filtros**:
   ```javascript
   // Remover todos os filtros
   KC.FilterManager.clearAllFilters()
   
   // Verificar arquivos originais
   KC.FileRenderer.getOriginalFiles()
   ```

### 3. Ollama Não Conecta

#### Sintomas
- "Ollama unavailable"
- Timeouts na análise IA
- Embeddings falham

#### Diagnóstico
```bash
# Verificar se Ollama está rodando
curl http://localhost:11434/api/tags

# Verificar logs do Ollama
journalctl -u ollama -f  # Linux
brew services log ollama  # macOS
```

#### Soluções
1. **Reinstalar/Reiniciar Ollama**:
   ```bash
   # Linux/macOS
   systemctl restart ollama
   
   # Windows
   # Reiniciar pelo Gerenciador de Tarefas
   ```

2. **Verificar Modelos**:
   ```bash
   # Listar modelos instalados
   ollama list
   
   # Instalar modelos necessários
   ollama pull llama2
   ollama pull nomic-embed-text
   ```

3. **Configurar Endpoint**:
   ```javascript
   // Configurar endpoint customizado
   KC.AIAPIManager.setOllamaConfig({
     baseURL: 'http://localhost:11434',
     timeout: 60000
   })
   ```

### 4. Qdrant Não Conecta

#### Sintomas
- Busca semântica falha
- Erro "Qdrant connection failed"
- Pipeline RAG não funciona

#### Diagnóstico
```javascript
// Testar conexão
KC.QdrantService.checkConnection()

// Verificar configuração
KC.QdrantService.getConfig()

// Testar endpoint direto
fetch('http://qdr.vcia.com.br:6333/collections')
```

#### Soluções
1. **Verificar VPS**:
   ```bash
   # Ping para o servidor
   ping qdr.vcia.com.br
   
   # Verificar porta
   telnet qdr.vcia.com.br 6333
   ```

2. **Configurar Qdrant Local**:
   ```bash
   # Docker local
   docker run -p 6333:6333 qdrant/qdrant
   ```

3. **Reconfigurar Endpoint**:
   ```javascript
   KC.QdrantService.configure({
     host: 'localhost',  // ou seu servidor
     port: 6333,
     https: false
   })
   ```

### 5. API Keys Não Funcionam

#### Sintomas
- "Invalid API key"
- Análise IA falha
- Rate limit errors

#### Diagnóstico
```javascript
// Verificar keys armazenadas
KC.SecureStorageManager.listStoredKeys()

// Testar provider específico
KC.AIAPIManager.testProvider('openai')

// Verificar rate limits
KC.RateLimitManager.getStatus('openai')
```

#### Soluções
1. **Reconfigurar Keys**:
   ```javascript
   // Remover key antiga
   KC.SecureStorageManager.removeApiKey('openai')
   
   // Configurar nova key
   KC.AIAPIManager.setApiKey('openai', 'sk-new-key')
   ```

2. **Verificar Billing**:
   - OpenAI: https://platform.openai.com/account/billing
   - Gemini: https://makersuite.google.com/billing
   - Claude: https://console.anthropic.com/billing

3. **Usar Fallback**:
   ```javascript
   // Trocar para outro provider
   KC.AIAPIManager.setActiveProvider('gemini')
   ```

### 6. Performance Lenta

#### Sintomas
- Interface lagada
- Processamento muito lento
- Alto uso de memória

#### Diagnóstico
```javascript
// Verificar performance
KC.PerformanceMetrics.getStats()

// Verificar uso de memória
KC.MemoryOptimizer.getMemoryUsage()

// Verificar cache
KC.CacheService.getStats()
```

#### Soluções
1. **Otimizar Memória**:
   ```javascript
   // Limpeza automática
   KC.MemoryOptimizer.cleanup()
   
   // Limpar cache
   KC.CacheService.clearAll()
   
   // Reduzir batch size
   KC.UnifiedConfidenceController.configure({
     batchSize: 25  // Reduzir de 50 para 25
   })
   ```

2. **Reduzir Workers**:
   ```javascript
   KC.WorkerPoolManager.configure({
     poolSize: 2,  // Reduzir workers
     maxConcurrent: 1
   })
   ```

3. **Configurar Streaming**:
   ```javascript
   KC.MemoryOptimizer.configure({
     streaming: {
       enabled: true,
       chunkSize: 32 * 1024  // Reduzir chunk size
     }
   })
   ```

### 7. Categorias Não Persistem

#### Sintomas
- Categorias desaparecem após reload
- Sincronização falha
- Duplicação de categorias

#### Diagnóstico
```javascript
// Verificar CategoryManager
KC.CategoryManager.getCategories()

// Verificar AppState
KC.AppState.get('categories')

// Verificar eventos
KC.EventBus.listActiveListeners()
```

#### Soluções
1. **Migração Automática**:
   ```javascript
   // Executar migração
   KC.CategoryManager.migrateFromLegacy()
   
   // Verificar integridade
   KC.CategoryManager.validateIntegrity()
   ```

2. **Recriar Categorias**:
   ```javascript
   // Backup categorias atuais
   const backup = KC.CategoryManager.exportCategories()
   
   // Limpar e reimportar
   KC.CategoryManager.clearAll()
   KC.CategoryManager.importCategories(backup)
   ```

### 8. Exportação Falha

#### Sintomas
- Download não inicia
- Arquivo corrompido
- Erro "Export failed"

#### Diagnóstico
```javascript
// Verificar dados para export
KC.RAGExportManager.validateData()

// Verificar integridade
KC.DataIntegrityManager.runChecks()

// Verificar quota do browser
navigator.storage.estimate()
```

#### Soluções
1. **Limpar Dados Antigos**:
   ```javascript
   // Limpar localStorage
   KC.AppState.cleanup()
   
   // Limpar cache
   KC.CacheService.clearAll()
   ```

2. **Exportar por Partes**:
   ```javascript
   // Exportar categorias específicas
   KC.RAGExportManager.exportByCategory('IA/ML')
   
   // Exportar com limit
   KC.RAGExportManager.exportWithLimit(100)
   ```

## 🔍 Ferramentas de Debug Avançado

### 1. Debug Console Commands
```javascript
// Estado completo do sistema
KC.debug.getFullState()

// Logs detalhados
KC.Logger.setLevel('debug')
KC.Logger.getRecentLogs()

// Performance profiling
KC.PerformanceMetrics.startProfiling()
KC.PerformanceMetrics.getProfile()
```

### 2. Network Debug
```javascript
// Monitorar requests
KC.NetworkMonitor.startCapture()
KC.NetworkMonitor.getRequests()

// Testar conectividade
KC.ConnectivityTester.testAll()
```

### 3. Data Integrity Checks
```javascript
// Verificar consistência de dados
KC.DataIntegrityManager.runFullCheck()

// Reparar inconsistências
KC.DataIntegrityManager.repair()

// Backup antes de operações críticas
KC.DataIntegrityManager.createBackup()
```

## 🚨 Códigos de Erro Comuns

### ERR_001: Component Not Registered
```
Causa: Componente não foi registrado no AppController
Solução: Verificar app.js e recarregar página
```

### ERR_002: Invalid File Handle
```
Causa: Handle de arquivo inválido ou expirado
Solução: Reselecionar pasta na Etapa 1
```

### ERR_003: API Rate Limit
```
Causa: Muitas requisições para API externa
Solução: Aguardar reset ou trocar provider
```

### ERR_004: Qdrant Collection Not Found
```
Causa: Collection não existe no Qdrant
Solução: Recriar collection ou verificar conexão
```

### ERR_005: Embedding Model Not Available
```
Causa: Modelo de embedding não encontrado
Solução: ollama pull nomic-embed-text
```

### ERR_006: Memory Quota Exceeded
```
Causa: Muito dados no localStorage
Solução: Limpar cache ou reduzir dados
```

### ERR_007: WebWorker Failed
```
Causa: Worker pool falhou
Solução: Reduzir workers ou recarregar página
```

## 📞 Obter Suporte

### 1. Logs para Suporte
```javascript
// Gerar relatório completo
KC.SupportHelper.generateReport()

// Exportar logs
KC.Logger.exportLogs('support-logs.json')

// Capturar estado do sistema
KC.SupportHelper.captureSystemState()
```

### 2. Informações Úteis
- **Versão do navegador**: `navigator.userAgent`
- **Versão do sistema**: Disponível no diagnóstico
- **Configuração ativa**: `KC.ConfigManager.export()`
- **Último erro**: `KC.Logger.getLastError()`

### 3. Reset Completo (Último Recurso)
```javascript
// ⚠️ ATENÇÃO: Remove todos os dados
KC.SystemReset.performFullReset()

// Reset parcial (preserva configurações)
KC.SystemReset.performSoftReset()
```

### 4. Fallback para Modo Seguro
```javascript
// Ativar modo seguro (funcionalidades mínimas)
KC.SafeMode.activate()

// Verificar se modo seguro está ativo
KC.SafeMode.isActive()
```

## 📚 Recursos Adicionais

- **FAQ**: Veja problemas mais comuns em `/docs/faq.md`
- **Logs Detalhados**: Ative debug mode para mais informações
- **Comunidade**: GitHub Issues para problemas específicos
- **Documentação**: Consulte outros guias desta seção

---

**Anterior**: [← Recursos Avançados](04-advanced-features.md) | **Próximo**: [API Documentation →](../api/rest-api-spec.md)