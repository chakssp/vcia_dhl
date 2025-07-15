# SPRINT 1.3 - Preparação para Análise com IA

## 🎯 Objetivo da Sprint

Implementar a camada de análise inteligente que processará os arquivos filtrados, extraindo insights e momentos decisivos através de modelos de IA (Claude, GPT-4, Gemini).

## 📋 Escopo Definido

### Funcionalidades Core:
1. **AnalysisManager.js** - Gerenciador central de análises
2. **Interface de Configuração de IA** - Seleção de modelo e parâmetros
3. **Sistema de Templates** - Prompts customizáveis para análise
4. **Processamento em Lote** - Queue com feedback de progresso
5. **Resultados Estruturados** - Armazenamento e visualização

## 🏗️ Arquitetura Proposta

### Novo Componente Principal:
```javascript
window.KnowledgeConsolidator.AnalysisManager = {
    // Configuração
    config: {
        model: 'claude-3-sonnet', // claude-3-opus, gpt-4, gemini-pro
        temperature: 0.7,
        maxTokens: 2000,
        batchSize: 10,
        rateLimit: 60 // requests per minute
    },
    
    // Estado
    queue: [],           // Fila de arquivos para análise
    processing: false,   // Status de processamento
    results: new Map(), // Resultados por arquivo
    
    // Métodos principais
    initialize() {},
    addToQueue(files) {},
    processQueue() {},
    analyzeFile(file) {},
    saveResults(fileId, analysis) {},
    exportResults(format) {}
};
```

### Templates de Análise:
```javascript
const analysisTemplates = {
    decisiveMoments: {
        name: "Momentos Decisivos",
        prompt: `Analise o seguinte conteúdo e identifique:
        1. Decisões importantes tomadas
        2. Insights transformadores
        3. Aprendizados chave
        4. Pontos de inflexão
        
        Conteúdo: {content}
        
        Retorne em formato JSON estruturado.`
    },
    
    projectInsights: {
        name: "Insights de Projeto",
        prompt: `Extraia informações para proposição de projetos:
        1. Oportunidades identificadas
        2. Problemas a resolver
        3. Recursos necessários
        4. Potencial de impacto
        
        Conteúdo: {content}`
    },
    
    knowledgeMapping: {
        name: "Mapeamento de Conhecimento",
        prompt: `Categorize e estruture o conhecimento:
        1. Temas principais
        2. Conceitos chave
        3. Conexões e relações
        4. Gaps identificados
        
        Conteúdo: {content}`
    }
};
```

## 🔧 Requisitos Técnicos

### APIs de IA:
1. **Claude API (Anthropic)**
   - Endpoint: https://api.anthropic.com/v1/messages
   - Auth: API Key no header
   - Modelos: claude-3-opus, claude-3-sonnet

2. **OpenAI API**
   - Endpoint: https://api.openai.com/v1/chat/completions
   - Auth: Bearer token
   - Modelos: gpt-4, gpt-4-turbo

3. **Google Gemini**
   - Endpoint: https://generativelanguage.googleapis.com/v1
   - Auth: API Key
   - Modelos: gemini-pro

### Configuração de Segurança:
```javascript
// Armazenamento seguro de API Keys
const APIKeyManager = {
    // Keys nunca no código
    keys: {
        claude: localStorage.getItem('claude_api_key'),
        openai: localStorage.getItem('openai_api_key'),
        gemini: localStorage.getItem('gemini_api_key')
    },
    
    // Interface para configurar
    setKey(service, key) {
        localStorage.setItem(`${service}_api_key`, key);
    },
    
    // Validação
    validateKey(service) {
        const key = this.keys[service];
        return key && key.length > 20;
    }
};
```

## 🎨 Interface de Usuário

### Painel de Configuração de IA:
```html
<div class="ai-config-panel">
    <h3>Configuração de Análise IA</h3>
    
    <!-- Seleção de Modelo -->
    <div class="config-group">
        <label>Modelo de IA:</label>
        <select id="ai-model">
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gemini-pro">Gemini Pro</option>
        </select>
    </div>
    
    <!-- Template de Análise -->
    <div class="config-group">
        <label>Template de Análise:</label>
        <select id="analysis-template">
            <option value="decisiveMoments">Momentos Decisivos</option>
            <option value="projectInsights">Insights de Projeto</option>
            <option value="knowledgeMapping">Mapeamento de Conhecimento</option>
            <option value="custom">Personalizado</option>
        </select>
    </div>
    
    <!-- Configurações Avançadas -->
    <div class="advanced-config">
        <label>Temperature: <span id="temp-value">0.7</span></label>
        <input type="range" min="0" max="1" step="0.1" value="0.7">
        
        <label>Max Tokens:</label>
        <input type="number" value="2000" min="100" max="4000">
        
        <label>Batch Size:</label>
        <input type="number" value="10" min="1" max="50">
    </div>
</div>
```

### Visualização de Resultados:
```html
<div class="analysis-results">
    <div class="result-card">
        <h4>arquivo.md</h4>
        <div class="analysis-content">
            <div class="insights">
                <h5>Momentos Decisivos Identificados:</h5>
                <ul>
                    <li>Decisão de migrar para cloud</li>
                    <li>Pivô de modelo de negócio</li>
                </ul>
            </div>
            <div class="metadata">
                <span>Modelo: Claude 3</span>
                <span>Tokens: 1,234</span>
                <span>Confiança: 92%</span>
            </div>
        </div>
    </div>
</div>
```

## 📊 Fluxo de Processamento

### 1. Seleção de Arquivos
- Usuário seleciona arquivos da lista filtrada
- Ou processamento automático dos top N por relevância

### 2. Configuração de Análise
- Escolha do modelo de IA
- Seleção do template ou criação customizada
- Ajuste de parâmetros (temperature, tokens)

### 3. Processamento em Queue
```javascript
async processQueue() {
    this.processing = true;
    const batchSize = this.config.batchSize;
    
    while (this.queue.length > 0) {
        const batch = this.queue.splice(0, batchSize);
        
        // Processar em paralelo respeitando rate limits
        const promises = batch.map(file => 
            this.analyzeWithRateLimit(file)
        );
        
        const results = await Promise.allSettled(promises);
        
        // Atualizar UI com progresso
        this.updateProgress(results);
        
        // Delay para respeitar rate limits
        await this.delay(60000 / this.config.rateLimit);
    }
    
    this.processing = false;
}
```

### 4. Análise Individual
```javascript
async analyzeFile(file) {
    const template = this.getTemplate();
    const prompt = template.prompt.replace('{content}', file.preview);
    
    try {
        const response = await this.callAPI({
            model: this.config.model,
            messages: [{
                role: 'user',
                content: prompt
            }],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens
        });
        
        const analysis = this.parseResponse(response);
        this.saveResults(file.id, analysis);
        
        return { success: true, analysis };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

### 5. Armazenamento de Resultados
- Salvar no AppState com compressão
- Indexar por arquivo ID
- Manter histórico de análises
- Preparar para exportação

## 🚀 Implementação por Fases

### Fase 1: Estrutura Base (Dia 1)
- [ ] Criar AnalysisManager.js
- [ ] Implementar APIKeyManager
- [ ] Criar interface de configuração
- [ ] Setup inicial de templates

### Fase 2: Integração de APIs (Dia 2)
- [ ] Implementar chamadas para Claude API
- [ ] Adicionar suporte OpenAI
- [ ] Integrar Google Gemini
- [ ] Sistema de rate limiting

### Fase 3: UI e Feedback (Dia 3)
- [ ] Interface de queue e progresso
- [ ] Visualização de resultados
- [ ] Exportação de análises
- [ ] Tratamento de erros

## ⚠️ Considerações Importantes

### Performance:
- Rate limits: 60 req/min (Claude), 3500 req/min (GPT-4)
- Custo estimado: $0.01-0.03 por arquivo
- Processamento assíncrono obrigatório
- Cache de resultados para evitar re-análise

### Segurança:
- API keys apenas no client (nunca commitadas)
- Validação de inputs antes de enviar
- Sanitização de respostas da API
- Logs sem informações sensíveis

### UX:
- Feedback claro de progresso
- Estimativa de tempo e custo
- Possibilidade de pausar/retomar
- Preview de resultados em tempo real

## 📝 Checklist Pré-Desenvolvimento

### Preparação:
- [ ] Obter API keys dos serviços
- [ ] Estudar documentação das APIs
- [ ] Definir orçamento para testes
- [ ] Preparar conjunto de teste

### Validação:
- [ ] Confirmar estrutura com usuário
- [ ] Validar templates de análise
- [ ] Aprovar interface proposta
- [ ] Definir métricas de sucesso

## 🔗 Recursos e Referências

### Documentação APIs:
- [Claude API Docs](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google Gemini API](https://ai.google.dev/tutorials/rest_quickstart)

### Exemplos de Implementação:
- Rate limiting com p-queue
- Retry logic com exponential backoff
- Streaming de respostas longas
- Batch processing patterns

---
*Documento de preparação para SPRINT 1.3*
*Criado: 11/07/2025*
*Status: AGUARDANDO APROVAÇÃO*