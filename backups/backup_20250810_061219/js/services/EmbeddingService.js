/**
 * EmbeddingService.js
 * 
 * Serviço de geração de embeddings usando Ollama (local) ou APIs remotas
 * Parte da fundação semântica do Knowledge Consolidator
 * 
 * Arquitetura:
 * - Prioriza Ollama local para performance
 * - Fallback para APIs remotas se necessário
 * - Cache inteligente em IndexedDB
 * - Integração com infraestrutura VPS via Tailscale
 */

class EmbeddingService {
    constructor() {
        this.config = {
            // Ollama local para embeddings rápidos
            ollama: {
                url: 'http://localhost:11434',
                model: 'nomic-embed-text', // modelo otimizado para embeddings
                enabled: true
            },
            // Fallback para OpenAI se necessário
            openai: {
                url: 'https://api.openai.com/v1/embeddings',
                model: 'text-embedding-ada-002',
                enabled: false,
                apiKey: null
            },
            // Cache settings
            cache: {
                enabled: true,
                maxSize: 1000, // máximo de embeddings em cache
                ttl: 7 * 24 * 60 * 60 * 1000 // 7 dias em ms
            },
            // Dimensões esperadas (nomic-embed-text usa 768)
            dimensions: 768
        };

        this.cache = new Map();
        this.initIndexedDB();
        this.stats = {
            generated: 0,
            cached: 0,
            errors: 0
        };
    }

    /**
     * Inicializa IndexedDB para cache persistente
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EmbeddingCache', 1);

            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB:', request.error);
                this.config.cache.enabled = false;
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('embeddings')) {
                    const store = db.createObjectStore('embeddings', { keyPath: 'id' });
                    store.createIndex('text', 'text', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('model', 'model', { unique: false });
                }
            };
        });
    }

    /**
     * Gera embedding para um texto
     * @param {string} text - Texto para gerar embedding
     * @param {Object} context - Contexto adicional (categoria, relevância, etc)
     * @returns {Promise<Object>} Embedding com metadados
     */
    async generateEmbedding(text, context = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('Texto inválido para gerar embedding');
        }

        // Gerar chave de cache baseada no texto e contexto
        const cacheKey = this.generateCacheKey(text, context);

        // Verificar cache primeiro
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
            this.stats.cached++;
            // Retorna apenas o embedding para compatibilidade
            return cached.embedding || cached;
        }

        try {
            // Enriquecer texto com contexto se disponível
            const enrichedText = this.enrichTextWithContext(text, context);

            // Tentar Ollama primeiro (local, mais rápido)
            let embedding = null;
            let model = null;

            if (this.config.ollama.enabled) {
                try {
                    embedding = await this.generateWithOllama(enrichedText);
                    model = this.config.ollama.model;
                } catch (error) {
                    // FASE 1.1: Ollama é obrigatório - não tentar fallback automático
                    // AIDEV-NOTE: ollama-required; sem fallback automático para outros serviços
                    console.error('Erro ao gerar embedding com Ollama:', error.message);
                    throw new Error(`Ollama é obrigatório mas não está disponível: ${error.message}`);
                }
            }

            // Fallback para OpenAI desabilitado por padrão - só com aprovação explícita
            if (!embedding && this.config.openai.enabled && this.config.openai.apiKey && this.config.openai.explicitlyApproved) {
                console.warn('Usando OpenAI como fallback (aprovado pelo usuário)');
                embedding = await this.generateWithOpenAI(enrichedText);
                model = this.config.openai.model;
            }

            if (!embedding) {
                throw new Error('Nenhum serviço de embedding disponível');
            }

            // Validar dimensões
            if (embedding.length !== this.config.dimensions) {
                console.warn(`Dimensões inesperadas: ${embedding.length} (esperado: ${this.config.dimensions})`);
            }

            // Preparar resultado com metadados
            const result = {
                id: cacheKey,
                text: text,
                enrichedText: enrichedText,
                embedding: embedding,
                model: model,
                dimensions: embedding.length,
                context: context,
                timestamp: Date.now()
            };

            // Salvar no cache
            await this.saveToCache(result);
            this.stats.generated++;

            // Retorna apenas o array de embedding para compatibilidade
            return result.embedding;

        } catch (error) {
            this.stats.errors++;
            console.error('Erro ao gerar embedding:', error);
            throw error;
        }
    }

    /**
     * Gera embeddings em batch para múltiplos textos
     * @param {Array} texts - Array de textos ou objetos {text, context}
     * @param {Object} globalContext - Contexto aplicado a todos
     * @returns {Promise<Array>} Array de embeddings
     */
    async generateBatch(texts, globalContext = {}) {
        if (!Array.isArray(texts) || texts.length === 0) {
            return [];
        }

        // Normalizar entrada
        const normalizedTexts = texts.map(item => {
            if (typeof item === 'string') {
                return { text: item, context: globalContext };
            }
            return { 
                text: item.text, 
                context: { ...globalContext, ...item.context } 
            };
        });

        // Processar em paralelo com limite de concorrência
        const batchSize = 10;
        const results = [];

        for (let i = 0; i < normalizedTexts.length; i += batchSize) {
            const batch = normalizedTexts.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => 
                    this.generateEmbedding(item.text, item.context)
                        .catch(error => {
                            console.error('Erro em batch:', error);
                            return null;
                        })
                )
            );
            results.push(...batchResults);
        }

        return results.filter(r => r !== null);
    }

    /**
     * Gera embedding usando Ollama
     * @private
     */
    async generateWithOllama(text) {
        const response = await fetch(`${this.config.ollama.url}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.config.ollama.model,
                prompt: text
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        return data.embedding;
    }

    /**
     * Gera embedding usando OpenAI
     * @private
     */
    async generateWithOpenAI(text) {
        const response = await fetch(this.config.openai.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.openai.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.openai.model,
                input: text
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    }

    /**
     * Enriquece texto com contexto para melhor embedding
     * @private
     */
    enrichTextWithContext(text, context) {
        const parts = [text];

        if (context.category) {
            parts.unshift(`[Categoria: ${context.category}]`);
        }

        if (context.relevance) {
            parts.push(`[Relevância: ${context.relevance}%]`);
        }

        if (context.tags && context.tags.length > 0) {
            parts.push(`[Tags: ${context.tags.join(', ')}]`);
        }

        return parts.join(' ');
    }

    /**
     * Gera chave de cache única
     * @private
     */
    generateCacheKey(text, context) {
        const contextStr = JSON.stringify(context, Object.keys(context).sort());
        const hash = this.simpleHash(text + contextStr);
        return `emb_${hash}`;
    }

    /**
     * Hash simples para chaves de cache
     * @private
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Busca embedding no cache
     * @private
     */
    async getFromCache(key) {
        // Verificar cache em memória primeiro
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < this.config.cache.ttl) {
                return cached;
            }
            this.cache.delete(key);
        }

        // Verificar IndexedDB
        if (!this.db || !this.config.cache.enabled) return null;

        try {
            const transaction = this.db.transaction(['embeddings'], 'readonly');
            const store = transaction.objectStore('embeddings');
            const request = store.get(key);

            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && Date.now() - result.timestamp < this.config.cache.ttl) {
                        // Adicionar ao cache em memória
                        this.cache.set(key, result);
                        resolve(result);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            console.error('Erro ao buscar no cache:', error);
            return null;
        }
    }

    /**
     * Salva embedding no cache
     * @private
     */
    async saveToCache(embedding) {
        // Salvar em memória
        this.cache.set(embedding.id, embedding);

        // Limitar tamanho do cache em memória
        if (this.cache.size > this.config.cache.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        // Salvar em IndexedDB
        if (!this.db || !this.config.cache.enabled) return;

        try {
            const transaction = this.db.transaction(['embeddings'], 'readwrite');
            const store = transaction.objectStore('embeddings');
            store.put(embedding);
        } catch (error) {
            console.error('Erro ao salvar no cache:', error);
        }
    }

    /**
     * Limpa cache antigo
     */
    async cleanCache() {
        if (!this.db) return;

        const transaction = this.db.transaction(['embeddings'], 'readwrite');
        const store = transaction.objectStore('embeddings');
        const index = store.index('timestamp');
        const cutoff = Date.now() - this.config.cache.ttl;

        const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };

        // Limpar cache em memória também
        for (const [key, value] of this.cache.entries()) {
            if (Date.now() - value.timestamp > this.config.cache.ttl) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Calcula similaridade coseno entre dois embeddings
     */
    cosineSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length) {
            throw new Error('Embeddings devem ter o mesmo tamanho');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        if (norm1 === 0 || norm2 === 0) return 0;

        return dotProduct / (norm1 * norm2);
    }

    /**
     * Testa disponibilidade do Ollama
     */
    async checkOllamaAvailability() {
        try {
            const response = await fetch(`${this.config.ollama.url}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                const hasEmbeddingModel = data.models?.some(m => 
                    m.name.includes('embed') || 
                    m.name === this.config.ollama.model ||
                    m.name === `${this.config.ollama.model}:latest`
                );
                
                if (!hasEmbeddingModel) {
                    console.warn(`Modelo ${this.config.ollama.model} não encontrado no Ollama`);
                    console.log('Modelos disponíveis:', data.models?.map(m => m.name));
                    return false;
                }
                
                console.log(`✅ Ollama disponível com modelo ${this.config.ollama.model}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao verificar Ollama:', error);
            return false;
        }
    }

    /**
     * Configurar API keys
     */
    setApiKey(provider, apiKey) {
        if (this.config[provider]) {
            this.config[provider].apiKey = apiKey;
            this.config[provider].enabled = !!apiKey;
        }
    }

    /**
     * Retorna estatísticas do serviço
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            ollamaEnabled: this.config.ollama.enabled,
            openaiEnabled: this.config.openai.enabled
        };
    }
}

// Registrar no namespace KC
if (typeof window !== 'undefined') {
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KC = window.KnowledgeConsolidator;
    
    // Criar e registrar instância
    KC.EmbeddingService = new EmbeddingService();
    
    console.log('EmbeddingService registrado em KC.EmbeddingService');
}