/**
 * QdrantService.js
 * 
 * Serviço de integração com Qdrant Vector Database
 * Conecta via Tailscale com a VPS para armazenamento vetorial
 * 
 * Arquitetura:
 * - Qdrant rodando na VPS (https://qdr.vcia.com.br:6333)
 * - Conexão segura via Tailscale
 * - Operações CRUD para pontos vetoriais
 * - Busca por similaridade
 * - Integração com EmbeddingService
 */

class QdrantService {
    constructor() {
        this.config = {
            // URL do Qdrant na VPS (HTTP, não HTTPS!)
            baseUrl: 'http://qdr.vcia.com.br:6333',
            // Alternativa via Tailscale IP direto
            // baseUrl: 'http://100.68.173.68:6333',
            
            // Nome da coleção principal
            collectionName: 'knowledge_consolidator',
            
            // Configurações da coleção
            vectorSize: 768, // nomic-embed-text usa 768 dimensões
            distance: 'Cosine', // Cosine, Euclid, ou Dot
            
            // Configurações de busca
            defaultLimit: 10,
            scoreThreshold: 0.7,
            
            // Timeout para requisições
            timeout: 30000,
            
            // API Key se configurada
            apiKey: null
        };

        this.initialized = false;
        this.collectionInfo = null;
        
        // Estatísticas
        this.stats = {
            pointsInserted: 0,
            searchesPerformed: 0,
            errors: 0
        };

        // Cache de buscas recentes
        this.searchCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Verifica conectividade com Qdrant
     */
    async checkConnection() {
        try {
            const response = await this.request('GET', '/');
            console.log('✅ Qdrant conectado:', response);
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar com Qdrant:', error.message);
            return false;
        }
    }

    /**
     * Inicializa o serviço e cria coleção se necessário
     */
    async initialize() {
        try {
            // Verificar conexão
            const connected = await this.checkConnection();
            if (!connected) {
                throw new Error('Não foi possível conectar ao Qdrant');
            }

            // Verificar se coleção existe
            const collections = await this.listCollections();
            const collectionExists = collections.some(c => 
                c.name === this.config.collectionName
            );

            if (!collectionExists) {
                console.log(`📦 Criando coleção ${this.config.collectionName}...`);
                await this.createCollection();
            } else {
                console.log(`✅ Coleção ${this.config.collectionName} já existe`);
                this.collectionInfo = await this.getCollectionInfo();
            }

            this.initialized = true;
            return true;

        } catch (error) {
            console.error('Erro ao inicializar QdrantService:', error);
            throw error;
        }
    }

    /**
     * Lista todas as coleções
     */
    async listCollections() {
        const response = await this.request('GET', '/collections');
        return response.result?.collections || [];
    }

    /**
     * Obtém informações da coleção
     */
    async getCollectionInfo() {
        const response = await this.request(
            'GET', 
            `/collections/${this.config.collectionName}`
        );
        return response.result;
    }

    /**
     * Cria uma nova coleção
     */
    async createCollection() {
        const params = {
            vectors: {
                size: this.config.vectorSize,
                distance: this.config.distance
            },
            optimizers_config: {
                default_segment_number: 2
            },
            replication_factor: 1
        };

        const response = await this.request(
            'PUT',
            `/collections/${this.config.collectionName}`,
            params
        );

        this.collectionInfo = await this.getCollectionInfo();
        return response;
    }

    /**
     * Insere um único ponto
     */
    async insertPoint(point) {
        if (!this.initialized) await this.initialize();

        const payload = {
            points: [this.formatPoint(point)]
        };

        const response = await this.request(
            'PUT',
            `/collections/${this.config.collectionName}/points`,
            payload
        );

        this.stats.pointsInserted++;
        return response;
    }

    /**
     * Insere múltiplos pontos em batch
     */
    async insertBatch(points) {
        if (!this.initialized) await this.initialize();

        // Dividir em batches menores se necessário
        const batchSize = 100;
        const results = [];

        for (let i = 0; i < points.length; i += batchSize) {
            const batch = points.slice(i, i + batchSize);
            const payload = {
                points: batch.map(p => this.formatPoint(p))
            };

            try {
                const response = await this.request(
                    'PUT',
                    `/collections/${this.config.collectionName}/points`,
                    payload
                );
                results.push(response);
                this.stats.pointsInserted += batch.length;
            } catch (error) {
                console.error(`Erro no batch ${i}-${i + batch.length}:`, error);
                this.stats.errors++;
            }
        }

        // Retorna objeto padronizado para compatibilidade
        return {
            success: results.length > 0 && !results.some(r => r.error),
            results: results,
            pointsInserted: this.stats.pointsInserted
        };
    }

    /**
     * Busca por similaridade vetorial
     */
    async search(vector, options = {}) {
        if (!this.initialized) await this.initialize();

        // Verificar cache
        const cacheKey = this.generateCacheKey(vector, options);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const params = {
            vector: vector,
            limit: options.limit || this.config.defaultLimit,
            with_payload: options.withPayload !== false,
            with_vector: options.withVector || false,
            score_threshold: options.scoreThreshold || this.config.scoreThreshold
        };

        // Adicionar filtros se especificados
        if (options.filter) {
            params.filter = options.filter;
        }

        const response = await this.request(
            'POST',
            `/collections/${this.config.collectionName}/points/search`,
            params
        );

        this.stats.searchesPerformed++;
        
        // Cachear resultado
        this.saveToCache(cacheKey, response.result);
        
        return response.result;
    }

    /**
     * Busca por similaridade usando texto (gera embedding primeiro)
     */
    async searchByText(text, options = {}) {
        if (!KC.EmbeddingService) {
            throw new Error('EmbeddingService não disponível');
        }

        // Gerar embedding do texto
        const embedding = await KC.EmbeddingService.generateEmbedding(text);
        
        // Buscar por similaridade
        return this.search(embedding.embedding, {
            ...options,
            searchText: text // Adicionar texto original para referência
        });
    }

    /**
     * Busca pontos por IDs
     */
    async getPoints(ids) {
        if (!this.initialized) await this.initialize();

        const response = await this.request(
            'POST',
            `/collections/${this.config.collectionName}/points`,
            { ids: ids }
        );

        return response.result;
    }

    /**
     * Lista todos os pontos usando scroll
     */
    async scrollPoints(options = {}) {
        if (!this.initialized) await this.initialize();

        const params = {
            limit: options.limit || 100,
            with_payload: options.withPayload !== false,
            with_vector: options.withVector || false,
            offset: options.offset
        };

        const response = await this.request(
            'POST',
            `/collections/${this.config.collectionName}/points/scroll`,
            params
        );

        return response.result;
    }

    /**
     * Atualiza payload de um ponto
     */
    async updatePayload(pointId, payload) {
        if (!this.initialized) await this.initialize();

        const response = await this.request(
            'POST',
            `/collections/${this.config.collectionName}/points/payload`,
            {
                points: [pointId],
                payload: payload
            }
        );

        return response;
    }

    /**
     * Deleta pontos por IDs
     */
    async deletePoints(ids) {
        if (!this.initialized) await this.initialize();

        const response = await this.request(
            'POST',
            `/collections/${this.config.collectionName}/points/delete`,
            { points: ids }
        );

        return response;
    }

    /**
     * Obtém estatísticas da coleção
     */
    async getCollectionStats() {
        if (!this.initialized) await this.initialize();

        const info = await this.getCollectionInfo();
        return {
            pointsCount: info.points_count,
            vectorsCount: info.vectors_count,
            indexedVectorsCount: info.indexed_vectors_count,
            segmentsCount: info.segments_count,
            status: info.status,
            config: info.config
        };
    }

    /**
     * Formata ponto para o formato do Qdrant
     */
    formatPoint(point) {
        // Garantir que o ponto tem os campos obrigatórios
        if (!point.id || !point.vector || !Array.isArray(point.vector)) {
            throw new Error('Ponto deve ter id e vector (array)');
        }

        // Validar dimensões
        if (point.vector.length !== this.config.vectorSize) {
            console.warn(`Vetor com ${point.vector.length} dimensões, esperado ${this.config.vectorSize}`);
        }

        return {
            id: point.id,
            vector: point.vector,
            payload: point.payload || {}
        };
    }

    /**
     * Faz requisição HTTP para o Qdrant
     */
    async request(method, path, body = null) {
        const url = `${this.config.baseUrl}${path}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        };

        // Adicionar API key se configurada
        if (this.config.apiKey) {
            options.headers['api-key'] = this.config.apiKey;
        }

        // Adicionar body se necessário
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            options.signal = controller.signal;

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Qdrant error ${response.status}: ${error}`);
            }

            return await response.json();

        } catch (error) {
            this.stats.errors++;
            if (error.name === 'AbortError') {
                throw new Error('Timeout na requisição ao Qdrant');
            }
            throw error;
        }
    }

    /**
     * Gera chave de cache para busca
     */
    generateCacheKey(vector, options) {
        // Usar primeiros valores do vetor + options como chave
        const vectorKey = vector.slice(0, 5).join(',');
        const optionsKey = JSON.stringify(options);
        return `${vectorKey}_${optionsKey}`;
    }

    /**
     * Busca no cache
     */
    getFromCache(key) {
        const cached = this.searchCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.searchCache.delete(key);
        return null;
    }

    /**
     * Salva no cache
     */
    saveToCache(key, data) {
        // Limitar tamanho do cache
        if (this.searchCache.size > 100) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }

        this.searchCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Limpa cache de buscas
     */
    clearCache() {
        this.searchCache.clear();
    }

    /**
     * Configura API key
     */
    setApiKey(apiKey) {
        this.config.apiKey = apiKey;
    }

    /**
     * Retorna estatísticas do serviço
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.searchCache.size,
            initialized: this.initialized,
            collectionName: this.config.collectionName,
            vectorSize: this.config.vectorSize
        };
    }
}

// Registrar no namespace KC
if (typeof window !== 'undefined') {
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KC = window.KnowledgeConsolidator;
    
    // Criar e registrar instância
    KC.QdrantService = new QdrantService();
    
    console.log('QdrantService registrado em KC.QdrantService');
}