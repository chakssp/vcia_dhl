# Plano Detalhado de Integração com IA - SPRINT 1.3

## 🤖 Visão Geral da Integração

### Objetivo Estratégico:
Transformar o preview inteligente de arquivos em análises profundas que identifiquem momentos decisivos, insights acionáveis e oportunidades de projetos internos.

### Modelos Suportados:
1. **Claude 3** (Anthropic) - Análise contextual profunda
2. **GPT-4** (OpenAI) - Processamento estruturado
3. **Gemini Pro** (Google) - Análise multimodal

## 🏗️ Arquitetura de Integração

### Estrutura de Componentes:
```
js/managers/
├── AnalysisManager.js      # Orquestrador principal
├── APIManager.js           # Gestão de APIs
└── TemplateManager.js      # Gestão de prompts

js/utils/
├── RateLimiter.js         # Controle de rate limits
├── ResponseParser.js      # Parse de respostas IA
└── CostCalculator.js      # Cálculo de custos

js/components/
├── AIConfigPanel.js       # Interface de configuração
├── AnalysisQueue.js       # Gestão de fila
└── ResultsViewer.js       # Visualização de resultados
```

## 📋 Especificação Técnica Detalhada

### 1. AnalysisManager.js
```javascript
class AnalysisManager {
    constructor() {
        this.eventBus = window.KnowledgeConsolidator.EventBus;
        this.apiManager = new APIManager();
        this.templateManager = new TemplateManager();
        this.rateLimiter = new RateLimiter();
        
        this.state = {
            queue: [],
            processing: false,
            results: new Map(),
            stats: {
                processed: 0,
                errors: 0,
                totalCost: 0,
                avgProcessingTime: 0
            }
        };
        
        this.config = {
            model: 'claude-3-sonnet',
            template: 'decisiveMoments',
            batchSize: 5,
            temperature: 0.7,
            maxTokens: 2000,
            retryAttempts: 3,
            timeoutMs: 30000
        };
    }
    
    // Métodos principais
    async initialize() {
        await this.loadSavedResults();
        this.bindEvents();
        this.setupAutoSave();
    }
    
    async addToQueue(files, options = {}) {
        const queueItems = files.map(file => ({
            id: this.generateId(),
            file,
            config: { ...this.config, ...options },
            status: 'pending',
            createdAt: Date.now(),
            attempts: 0
        }));
        
        this.state.queue.push(...queueItems);
        this.eventBus.emit('analysis:queue:updated', this.getQueueStats());
        
        if (!this.state.processing) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        if (this.state.processing || this.state.queue.length === 0) return;
        
        this.state.processing = true;
        this.eventBus.emit('analysis:started', { queueSize: this.state.queue.length });
        
        try {
            while (this.state.queue.length > 0) {
                const batch = this.state.queue.splice(0, this.config.batchSize);
                await this.processBatch(batch);
            }
        } catch (error) {
            console.error('Erro no processamento da queue:', error);
        } finally {
            this.state.processing = false;
            this.eventBus.emit('analysis:completed', this.state.stats);
        }
    }
    
    async processBatch(batch) {
        const promises = batch.map(item => this.processItem(item));
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
            const item = batch[index];
            
            if (result.status === 'fulfilled') {
                this.handleSuccess(item, result.value);
            } else {
                this.handleError(item, result.reason);
            }
        });
        
        // Rate limiting
        await this.rateLimiter.wait();
    }
    
    async processItem(item) {
        const startTime = Date.now();
        
        try {
            item.status = 'processing';
            this.eventBus.emit('analysis:item:started', item);
            
            const prompt = this.templateManager.buildPrompt(
                item.config.template,
                item.file
            );
            
            const response = await this.apiManager.analyze({
                model: item.config.model,
                prompt,
                config: item.config
            });
            
            const analysis = this.parseResponse(response, item.config.template);
            const processingTime = Date.now() - startTime;
            
            return {
                analysis,
                metadata: {
                    processingTime,
                    model: item.config.model,
                    template: item.config.template,
                    tokensUsed: response.usage?.total_tokens || 0,
                    cost: this.calculateCost(response, item.config.model)
                }
            };
            
        } catch (error) {
            item.attempts++;
            
            if (item.attempts < this.config.retryAttempts) {
                // Retry com backoff exponencial
                await this.delay(Math.pow(2, item.attempts) * 1000);
                return this.processItem(item);
            }
            
            throw error;
        }
    }
}
```

### 2. APIManager.js
```javascript
class APIManager {
    constructor() {
        this.apis = {
            claude: new ClaudeAPI(),
            openai: new OpenAIAPI(),
            gemini: new GeminiAPI()
        };
        
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'KnowledgeConsolidator/1.3'
        };
    }
    
    async analyze({ model, prompt, config }) {
        const [provider, modelName] = model.split('-', 2);
        const api = this.apis[provider];
        
        if (!api || !api.isConfigured()) {
            throw new Error(`API ${provider} não configurada`);
        }
        
        return await api.analyze({
            model: modelName,
            prompt,
            config
        });
    }
}

// Implementações específicas
class ClaudeAPI {
    constructor() {
        this.baseURL = 'https://api.anthropic.com/v1';
        this.apiKey = localStorage.getItem('claude_api_key');
    }
    
    isConfigured() {
        return this.apiKey && this.apiKey.length > 20;
    }
    
    async analyze({ model, prompt, config }) {
        const response = await fetch(`${this.baseURL}/messages`, {
            method: 'POST',
            headers: {
                ...this.defaultHeaders,
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: `claude-3-${model}`,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`Claude API Error: ${response.status}`);
        }
        
        return await response.json();
    }
}

class OpenAIAPI {
    constructor() {
        this.baseURL = 'https://api.openai.com/v1';
        this.apiKey = localStorage.getItem('openai_api_key');
    }
    
    async analyze({ model, prompt, config }) {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                ...this.defaultHeaders,
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: model === 'turbo' ? 'gpt-4-turbo' : 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: config.maxTokens,
                temperature: config.temperature
            })
        });
        
        return await response.json();
    }
}
```

### 3. TemplateManager.js
```javascript
class TemplateManager {
    constructor() {
        this.templates = {
            decisiveMoments: {
                name: 'Momentos Decisivos',
                description: 'Identifica decisões importantes e pontos de inflexão',
                prompt: `
                Analise o seguinte conteúdo e identifique momentos decisivos e insights transformadores.
                
                Retorne um JSON com a seguinte estrutura:
                {
                    "momentos_decisivos": [
                        {
                            "tipo": "decisao|insight|aprendizado|ponto_inflexao",
                            "titulo": "Título conciso",
                            "descricao": "Descrição detalhada",
                            "contexto": "Contexto do momento",
                            "impacto": "Alto|Médio|Baixo",
                            "categoria": "Categoria do insight"
                        }
                    ],
                    "temas_principais": ["tema1", "tema2"],
                    "palavras_chave": ["palavra1", "palavra2"],
                    "nivel_relevancia": 1-10,
                    "potencial_projeto": {
                        "tem_potencial": true|false,
                        "area": "Nome da área",
                        "descricao": "Descrição do potencial projeto"
                    }
                }
                
                Conteúdo para análise:
                {content}
                `,
                outputSchema: {
                    momentos_decisivos: 'array',
                    temas_principais: 'array',
                    palavras_chave: 'array',
                    nivel_relevancia: 'number',
                    potencial_projeto: 'object'
                }
            },
            
            projectInsights: {
                name: 'Insights de Projeto',
                description: 'Extrai oportunidades de projetos internos',
                prompt: `
                Analise o conteúdo focando em oportunidades de projetos internos e proposições estratégicas.
                
                Retorne JSON com:
                {
                    "oportunidades": [
                        {
                            "titulo": "Nome da oportunidade",
                            "descricao": "Descrição detalhada",
                            "problema_resolvido": "Problema que resolve",
                            "recursos_necessarios": ["recurso1", "recurso2"],
                            "prazo_estimado": "3 meses|6 meses|1 ano",
                            "impacto_esperado": "Alto|Médio|Baixo",
                            "stakeholders": ["stakeholder1", "stakeholder2"]
                        }
                    ],
                    "gaps_identificados": ["gap1", "gap2"],
                    "recursos_disponiveis": ["recurso1", "recurso2"],
                    "prioridade_estrategica": 1-10
                }
                
                Conteúdo: {content}
                `
            },
            
            knowledgeMapping: {
                name: 'Mapeamento de Conhecimento',
                description: 'Categoriza e mapeia conhecimento para estruturação',
                prompt: `
                Faça um mapeamento completo do conhecimento presente no conteúdo.
                
                JSON esperado:
                {
                    "categorias": [
                        {
                            "nome": "Nome da categoria",
                            "conceitos": ["conceito1", "conceito2"],
                            "relacoes": ["categoria_relacionada1"],
                            "nivel_profundidade": "Básico|Intermediário|Avançado"
                        }
                    ],
                    "conexoes_cruzadas": [
                        {
                            "origem": "conceito_origem",
                            "destino": "conceito_destino",
                            "tipo_relacao": "dependencia|similitude|oposicao"
                        }
                    ],
                    "gaps_conhecimento": ["gap1", "gap2"],
                    "areas_para_aprofundar": ["area1", "area2"]
                }
                
                Conteúdo: {content}
                `
            }
        };
    }
    
    buildPrompt(templateName, file) {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' não encontrado`);
        }
        
        return template.prompt.replace('{content}', file.preview || file.content);
    }
    
    getTemplate(name) {
        return this.templates[name];
    }
    
    addCustomTemplate(name, template) {
        this.templates[name] = template;
        this.saveTemplates();
    }
}
```

## 💰 Gestão de Custos e Performance

### Calculadora de Custos:
```javascript
class CostCalculator {
    constructor() {
        this.pricing = {
            'claude-3-opus': { input: 15, output: 75 }, // por 1M tokens
            'claude-3-sonnet': { input: 3, output: 15 },
            'gpt-4': { input: 30, output: 60 },
            'gpt-4-turbo': { input: 10, output: 30 },
            'gemini-pro': { input: 0.5, output: 1.5 }
        };
    }
    
    calculateCost(usage, model) {
        const rates = this.pricing[model];
        if (!rates || !usage) return 0;
        
        const inputCost = (usage.prompt_tokens / 1000000) * rates.input;
        const outputCost = (usage.completion_tokens / 1000000) * rates.output;
        
        return inputCost + outputCost;
    }
    
    estimateBatchCost(files, model, avgTokensPerFile = 1500) {
        const rates = this.pricing[model];
        const totalTokens = files.length * avgTokensPerFile;
        
        return (totalTokens / 1000000) * (rates.input + rates.output);
    }
}
```

### Rate Limiting:
```javascript
class RateLimiter {
    constructor() {
        this.limits = {
            'claude': { rpm: 60, tpm: 40000 },
            'openai': { rpm: 3500, tpm: 40000 },
            'gemini': { rpm: 60, tpm: 30000 }
        };
        
        this.counters = new Map();
    }
    
    async wait(provider = 'claude') {
        const limit = this.limits[provider];
        const now = Date.now();
        const minute = Math.floor(now / 60000);
        
        let counter = this.counters.get(`${provider}-${minute}`) || 0;
        
        if (counter >= limit.rpm) {
            const waitTime = 60000 - (now % 60000);
            await this.delay(waitTime);
        }
        
        this.counters.set(`${provider}-${minute}`, counter + 1);
    }
}
```

## 🎨 Interface de Usuário

### Painel de Configuração:
```javascript
class AIConfigPanel {
    render() {
        return `
        <div class="ai-config-panel">
            <h3>🤖 Configuração de Análise IA</h3>
            
            <div class="config-section">
                <h4>Modelo de IA</h4>
                <div class="model-selector">
                    <label>
                        <input type="radio" name="model" value="claude-3-sonnet">
                        <span class="model-card">
                            <strong>Claude 3 Sonnet</strong>
                            <small>Melhor custo-benefício • $3/1M tokens</small>
                        </span>
                    </label>
                    <label>
                        <input type="radio" name="model" value="claude-3-opus">
                        <span class="model-card">
                            <strong>Claude 3 Opus</strong>
                            <small>Máxima qualidade • $15/1M tokens</small>
                        </span>
                    </label>
                    <label>
                        <input type="radio" name="model" value="gpt-4-turbo">
                        <span class="model-card">
                            <strong>GPT-4 Turbo</strong>
                            <small>Rápido e eficiente • $10/1M tokens</small>
                        </span>
                    </label>
                </div>
            </div>
            
            <div class="config-section">
                <h4>Template de Análise</h4>
                <select id="analysis-template">
                    <option value="decisiveMoments">🎯 Momentos Decisivos</option>
                    <option value="projectInsights">🚀 Insights de Projeto</option>
                    <option value="knowledgeMapping">🗺️ Mapeamento de Conhecimento</option>
                    <option value="custom">✨ Personalizado</option>
                </select>
            </div>
            
            <div class="config-section advanced">
                <h4>Configurações Avançadas</h4>
                <div class="slider-group">
                    <label>Temperature: <span id="temp-value">0.7</span></label>
                    <input type="range" id="temperature" min="0" max="1" step="0.1" value="0.7">
                </div>
                <div class="input-group">
                    <label>Max Tokens:</label>
                    <input type="number" id="max-tokens" value="2000" min="100" max="4000">
                </div>
                <div class="input-group">
                    <label>Batch Size:</label>
                    <input type="number" id="batch-size" value="5" min="1" max="20">
                </div>
            </div>
            
            <div class="cost-estimator">
                <h4>💰 Estimativa de Custo</h4>
                <div class="cost-breakdown">
                    <span>Arquivos selecionados: <strong id="file-count">0</strong></span>
                    <span>Custo estimado: <strong id="estimated-cost">$0.00</strong></span>
                    <span>Tempo estimado: <strong id="estimated-time">0 min</strong></span>
                </div>
            </div>
        </div>
        `;
    }
}
```

## 📊 Cronograma de Implementação

### Semana 1 - Fundação (3 dias):
**Dia 1**: Setup base
- [ ] Criar estrutura de arquivos
- [ ] Implementar AnalysisManager básico
- [ ] Setup APIManager com Claude
- [ ] Interface de configuração

**Dia 2**: APIs e Templates
- [ ] Integrar OpenAI e Gemini
- [ ] Implementar TemplateManager
- [ ] Sistema de rate limiting
- [ ] Gestão de custos

**Dia 3**: UI e Testes
- [ ] Interface de queue e progresso
- [ ] Visualização de resultados
- [ ] Testes com dados reais
- [ ] Refinamentos finais

### Critérios de Sucesso:
1. ✅ Análise bem-sucedida de 100+ arquivos
2. ✅ Custos dentro do orçamento ($10 para testes)
3. ✅ Interface intuitiva e responsiva
4. ✅ Zero perda de dados durante processamento
5. ✅ Resultados estruturados e exportáveis

## 🔐 Segurança e Boas Práticas

### Gestão de API Keys:
- Armazenamento apenas no localStorage
- Validação de formato antes do uso
- Nunca logar keys em console/erros
- Interface para gerenciar keys

### Tratamento de Erros:
- Retry automático com backoff
- Logs detalhados para debugging
- Fallback para modelos alternativos
- Recovery de estado em falhas

### Privacy:
- Conteúdo nunca logado
- Metadata mínima nas requisições
- Opção de processamento local
- Limpeza automática de caches

---
*Plano de Integração IA - SPRINT 1.3*
*Versão: 1.0*
*Data: 11/07/2025*