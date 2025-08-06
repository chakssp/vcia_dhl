# 🔧 Configuração Avançada de APIs

## Visão Geral

O Knowledge Consolidator suporta múltiplos providers de IA com sistema de fallback automático e configuração unificada. Esta seção cobre todas as opções de configuração disponíveis.

## 🤖 Providers Suportados

### 1. Ollama (Recomendado - Local)
**Vantagens**: Privacidade, velocidade, sem custos de API, embeddings integrados
**Desvantagens**: Requer instalação local, modelos específicos

### 2. OpenAI (GPT-3.5/4)
**Vantagens**: Alta qualidade, modelos avançados, API robusta
**Desvantagens**: Custo por token, requer conectividade

### 3. Google Gemini
**Vantagens**: Multimodal, boa performance, preços competitivos
**Desvantagens**: Limitações regionais, menos controle

### 4. Anthropic Claude
**Vantagens**: Respostas detalhadas, boa compreensão contextual
**Desvantagens**: Custos altos, rate limits

## 🏠 Configuração Ollama (Recomendada)

### Instalação Completa

#### Windows
```powershell
# Download e instalação
Invoke-WebRequest -Uri "https://ollama.ai/download/windows" -OutFile "ollama-setup.exe"
.\ollama-setup.exe

# Verificar instalação
ollama --version
```

#### macOS
```bash
# Instalação via Homebrew
brew install ollama

# Ou download direto
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Linux
```bash
# Instalação automática
curl -fsSL https://ollama.ai/install.sh | sh

# Verificar serviço
systemctl status ollama
```

### Modelos Recomendados

#### Para Análise de Texto
```bash
# Modelo principal para análise
ollama pull llama2        # 7B - Rápido e eficiente
ollama pull llama2:13b    # 13B - Melhor qualidade
ollama pull codellama     # Especializado em código

# Verificar modelos instalados
ollama list
```

#### Para Embeddings
```bash
# Modelo de embeddings (OBRIGATÓRIO)
ollama pull nomic-embed-text    # 768 dimensões
ollama pull all-minilm         # Alternativa leve

# Testar embeddings
curl http://localhost:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "teste"}'
```

### Configuração no Knowledge Consolidator

#### Verificação Automática
```javascript
// O sistema verifica automaticamente ao iniciar
KC.AIAPIManager.checkOllamaAvailability()
// Resultado esperado: { available: true, models: [...] }
```

#### Configuração Manual
```javascript
// Configurar endpoint customizado
KC.AIAPIManager.setOllamaConfig({
  baseURL: 'http://localhost:11434',
  timeout: 30000,
  models: {
    text: 'llama2',
    embeddings: 'nomic-embed-text'
  }
})
```

## ☁️ Configuração APIs em Nuvem

### OpenAI Configuration

#### Obtenção da API Key
1. Acesse: https://platform.openai.com
2. Crie conta ou faça login
3. Navegue: API → API Keys
4. Clique "Create new secret key"
5. **IMPORTANTE**: Copie a key (não será mostrada novamente)

#### Configuração no Sistema
```javascript
// Via interface (recomendado)
// Clique em "🔧 Configurar APIs" → OpenAI → Cole a API Key

// Via console
KC.AIAPIManager.setApiKey('openai', 'sk-your-api-key-here')

// Verificar configuração
KC.AIAPIManager.checkProviderStatus('openai')
```

#### Modelos Disponíveis
```javascript
{
  "gpt-3.5-turbo": "Rápido e econômico",
  "gpt-4": "Máxima qualidade",
  "gpt-4-turbo": "Equilibrio qualidade/velocidade",
  "text-embedding-ada-002": "Embeddings (1536D)"
}
```

### Google Gemini Configuration

#### Obtenção da API Key
1. Acesse: https://makersuite.google.com
2. Clique "Get API Key"
3. Crie novo projeto ou use existente
4. Gere API Key
5. Configure billing (necessário)

#### Configuração
```javascript
// API Key configuration
KC.AIAPIManager.setApiKey('gemini', 'AIza-your-api-key-here')

// Modelos disponíveis
{
  "gemini-pro": "Texto avançado",
  "gemini-pro-vision": "Multimodal",
  "embedding-001": "Embeddings (768D)"
}
```

### Anthropic Claude Configuration

#### Obtenção da API Key
1. Acesse: https://console.anthropic.com
2. Crie conta ou faça login
3. Navegue: Settings → API Keys
4. Create Key
5. Configure limits e billing

#### Configuração
```javascript
KC.AIAPIManager.setApiKey('anthropic', 'sk-ant-your-api-key-here')

// Modelos disponíveis
{
  "claude-3-sonnet": "Equilibrado",
  "claude-3-opus": "Máxima qualidade",
  "claude-3-haiku": "Rápido e econômico"
}
```

## 🔄 Sistema de Fallback

### Configuração Automática
```javascript
// Ordem de prioridade padrão
KC.AIAPIManager.setProviderPriority([
  'ollama',      // 1º: Local sempre preferido
  'openai',      // 2º: Fallback confiável
  'gemini',      // 3º: Alternativa robusta
  'anthropic'    // 4º: Ultima opção
])
```

### Lógica de Fallback
```
1. Tenta Ollama (local) → Falhou?
2. Tenta OpenAI → Sem API key ou falhou?
3. Tenta Gemini → Sem API key ou falhou?
4. Tenta Claude → Sem API key ou falhou?
5. Modo degradado (análise local apenas)
```

### Monitoramento de Falhas
```javascript
// Verificar health de todos providers
KC.AIAPIManager.getProvidersHealth()

// Resultado esperado:
{
  ollama: { status: 'healthy', latency: 150 },
  openai: { status: 'healthy', latency: 800 },
  gemini: { status: 'error', error: 'No API key' },
  anthropic: { status: 'rate_limited', retry_after: 60 }
}
```

## ⚙️ Configurações Avançadas

### Rate Limiting
```javascript
KC.AIAPIManager.setRateLimits({
  ollama: { rpm: 1000, tpm: 50000 },      // Local sem limites práticos
  openai: { rpm: 100, tpm: 10000 },       // Tier 1 padrão
  gemini: { rpm: 60, tpm: 32000 },        // Free tier
  anthropic: { rpm: 50, tpm: 4000 }       // Tier 1 padrão
})
```

### Timeouts e Retries
```javascript
KC.AIAPIManager.setAdvancedConfig({
  timeout: 30000,           // 30s timeout
  maxRetries: 3,            // Máximo 3 tentativas
  backoffMultiplier: 2,     // Delay exponencial
  circuitBreakerThreshold: 5 // Após 5 falhas, desabilita provider
})
```

### Análise de Custos
```javascript
// Estimativa antes do processamento
KC.AIAPIManager.estimateCosts(files, provider, template)

// Resultado:
{
  provider: 'openai',
  estimated_tokens: 15000,
  estimated_cost_usd: 0.45,
  processing_time_estimate: '5-8 minutes'
}
```

## 🔐 Armazenamento Seguro

### Criptografia Local
```javascript
// As API keys são criptografadas com AES-256
KC.SecureStorageManager.storeApiKey('openai', 'sk-...')

// Verificar se key está armazenada (sem expor valor)
KC.SecureStorageManager.hasApiKey('openai')  // true/false
```

### Limpeza de Dados
```javascript
// Remover API key específica
KC.SecureStorageManager.removeApiKey('openai')

// Limpar todas as keys
KC.SecureStorageManager.clearAllKeys()

// Verificar integridade do storage
KC.SecureStorageManager.validateIntegrity()
```

## 🧪 Templates de Análise Personalizados

### Estrutura de Template
```javascript
{
  id: 'custom_template_1',
  name: 'Análise de Oportunidades',
  description: 'Identifica oportunidades de negócio e parcerias',
  prompt: `
    Analise o seguinte conteúdo buscando:
    1. Oportunidades de negócio
    2. Possíveis parcerias
    3. Gaps no mercado
    4. Potencial de ROI
    
    Conteúdo: {content}
    
    Responda em formato estruturado.
  `,
  outputFormat: 'structured',
  categories: ['Oportunidades', 'ROI', 'Parcerias'],
  estimatedTokens: 500
}
```

### Criação via Interface
```
🎯 Criar Novo Template

Nome: [Análise de Oportunidades]
Descrição: [Identifica oportunidades...]

📝 Prompt:
[Editor multi-linha com syntax highlighting]

⚙️ Configurações:
├── Formato de Saída: [Estruturado ▼]
├── Categorias: [Oportunidades] [+]
├── Provider Preferido: [Auto ▼]
└── Estimativa de Tokens: [500]

[💾 Salvar Template] [🧪 Testar] [❌ Cancelar]
```

### Compartilhamento de Templates
```javascript
// Exportar template
KC.PromptManager.exportTemplate('custom_template_1')

// Importar template
KC.PromptManager.importTemplate(templateJson)

// Listar templates da comunidade
KC.PromptManager.listCommunityTemplates()
```

## 🔗 Integração com Qdrant

### Configuração de Conexão
```javascript
// Servidor padrão do projeto
KC.QdrantService.configure({
  host: 'qdr.vcia.com.br',
  port: 6333,
  https: false,
  collection: 'knowledge_base'
})

// Servidor personalizado
KC.QdrantService.configure({
  host: 'localhost',
  port: 6333,
  https: false,
  apiKey: 'optional-api-key'
})
```

### Collections e Embeddings
```javascript
// Criar collection com configuração otimizada
KC.QdrantService.createCollection('my_knowledge', {
  vectors: {
    size: 768,              // nomic-embed-text
    distance: 'Cosine'      // Melhor para similaridade semântica
  }
})

// Configurar embeddings automáticos
KC.EmbeddingService.configure({
  provider: 'ollama',
  model: 'nomic-embed-text',
  dimensions: 768,
  batchSize: 100
})
```

## 📊 Monitoramento e Debug

### Dashboard de APIs
```javascript
// Status em tempo real
KC.AIAPIManager.getDashboard()

// Resultado:
{
  activeProvider: 'ollama',
  totalRequests: 1247,
  successRate: 0.987,
  averageLatency: 1200,
  costsToday: 2.34,
  providers: {
    ollama: { healthy: true, requests: 1100 },
    openai: { healthy: true, requests: 147 }
  }
}
```

### Logs Detalhados
```javascript
// Habilitar debug mode
KC.AIAPIManager.setDebugMode(true)

// Visualizar logs
KC.Logger.getRecentLogs('AI_API', 50)

// Exportar logs para análise
KC.Logger.exportLogs('api_debug.json')
```

### Métricas de Performance
```javascript
// Métricas por provider
KC.PerformanceMetrics.getProviderStats()

// Análise de custos
KC.CostAnalyzer.getDailyReport()

// Alertas automáticos
KC.AlertManager.configure({
  highLatency: 5000,        // > 5s
  errorRate: 0.1,           // > 10%
  dailyCostLimit: 10.00     // > $10/dia
})
```

## 🚨 Troubleshooting Comum

### Problema: Ollama não conecta
```bash
# Verificar se está rodando
ps aux | grep ollama

# Reiniciar serviço
systemctl restart ollama

# Verificar logs
journalctl -u ollama -f

# Testar endpoint
curl http://localhost:11434/api/tags
```

### Problema: API Key inválida
```javascript
// Verificar formato da key
KC.ValidationUtils.validateApiKey('openai', 'sk-...')

// Testar conectividade
KC.AIAPIManager.testProvider('openai')

// Reconfigurar
KC.AIAPIManager.reconfigureProvider('openai')
```

### Problema: Rate Limit atingido
```javascript
// Verificar limites atuais
KC.RateLimitManager.getCurrentLimits('openai')

// Aguardar reset
KC.RateLimitManager.getResetTime('openai')

// Alterar para outro provider
KC.AIAPIManager.setActiveProvider('gemini')
```

### Problema: Embeddings não funcionam
```javascript
// Verificar modelo Ollama
KC.EmbeddingService.testOllamaEmbedding('teste')

// Verificar dimensões
KC.QdrantService.getCollectionInfo()

// Recriar collection se necessário
KC.QdrantService.recreateCollection('knowledge_base')
```

---

**Anterior**: [← Tutorial Workflow](02-workflow-tutorial.md) | **Próximo**: [Recursos Avançados →](04-advanced-features.md)