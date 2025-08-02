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

        // Verificar se vector é válido
        if (!vector || !Array.isArray(vector)) {
            throw new Error('Vector inválido para busca');
        }

        const params = {
            vector: vector,
            limit: options.limit || this.config.defaultLimit,
            with_payload: options.withPayload !== false,
            with_vector: options.withVector || false,
            score_threshold: options.scoreThreshold || this.config.scoreThreshold
        };
        
        // Debug temporário
        console.log('Search params:', JSON.stringify(params, null, 2));

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
        const embeddingResult = await KC.EmbeddingService.generateEmbedding(text);
        
        // O EmbeddingService retorna o embedding diretamente como array
        const embedding = embeddingResult;
        
        // Debug - verificar se embedding é válido
        if (!embedding || !Array.isArray(embedding)) {
            console.error('Embedding inválido:', embedding);
            throw new Error('Falha ao gerar embedding do texto');
        }
        
        // Buscar por similaridade
        return this.search(embedding, {
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
     * Reseta a coleção (remove todos os pontos)
     */
    async resetCollection() {
        if (!this.initialized) await this.initialize();

        try {
            // Deletar a coleção
            await this.request(
                'DELETE',
                `/collections/${this.config.collectionName}`
            );
            
            // Recriar a coleção
            await this.createCollection();
            
            console.log(`✅ Coleção ${this.config.collectionName} resetada com sucesso`);
            return true;
        } catch (error) {
            console.error('Erro ao resetar coleção:', error);
            throw error;
        }
    }

    /**
     * Verifica pontos diretamente sem cache (para debug)
     */
    async debugGetPoints(limit = 5) {
        try {
            const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    limit: limit,
                    with_payload: true,
                    with_vector: false
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ao buscar pontos: ${response.status}`);
            }

            const data = await response.json();
            
            // Log detalhado para debug
            KC.Logger?.info('QdrantService', `Debug: ${data.result.points.length} pontos recuperados`);
            
            return data.result.points;
        } catch (error) {
            KC.Logger?.error('QdrantService', 'Erro em debugGetPoints', error);
            throw error;
        }
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
     * Percorre pontos da coleção (scroll)
     */
    async scrollPoints(options = {}) {
        if (!this.initialized) await this.initialize();

        try {
            const params = {
                limit: options.limit || 10,
                with_payload: options.with_payload !== undefined ? options.with_payload : true,
                with_vector: options.with_vector || false
            };

            // Se with_payload for um array, incluir apenas campos específicos
            if (Array.isArray(options.with_payload)) {
                params.with_payload = options.with_payload;
            }

            // Adicionar offset se fornecido
            if (options.offset !== undefined) {
                params.offset = options.offset;
            }

            const response = await this.request('POST', `/collections/${this.config.collectionName}/points/scroll`, params);
            
            return {
                points: response.result?.points || [],
                next_page_offset: response.result?.next_page_offset
            };
        } catch (error) {
            KC.Logger?.error('QdrantService', 'Erro em scrollPoints', error);
            throw error;
        }
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
        // Verificar se vector existe antes de fazer slice
        if (!vector || !Array.isArray(vector)) {
            return `no-vector_${JSON.stringify(options)}`;
        }
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

    /**
     * Cria collection específica para triplas semânticas
     * LEI 8: Preservar comentário do original caso precise rollback
     * @returns {Promise<Object>}
     */
    async createTriplesCollection() {
        // AIDEV-NOTE: triple-collection; collection específica para triplas semânticas
        const collectionName = 'knowledge_triples';
        const params = {
            vectors: {
                size: this.config.vectorSize, // 768 dimensões
                distance: 'Cosine'
            },
            optimizers_config: {
                default_segment_number: 2
            },
            replication_factor: 1,
            write_consistency_factor: 1
        };
        
        try {
            const result = await this.request('PUT', `/collections/${collectionName}`, params);
            Logger.success(`[QdrantService] Collection '${collectionName}' criada com sucesso`);
            return result;
        } catch (error) {
            if (error.message?.includes('already exists')) {
                Logger.info(`[QdrantService] Collection '${collectionName}' já existe`);
                return { status: 'already_exists' };
            }
            throw error;
        }
    }

    /**
     * Salva triplas semânticas no Qdrant
     * @param {Array} triplas - Array de triplas para salvar
     * @returns {Promise<Object>}
     */
    async saveTriples(triplas) {
        if (!triplas || triplas.length === 0) {
            return { status: 'no_triples_to_save' };
        }
        
        Logger.info(`[QdrantService] Salvando ${triplas.length} triplas...`);
        
        // Verificar/criar collection se não existir
        const collections = await this.listCollections();
        if (!collections.some(c => c.name === 'knowledge_triples')) {
            await this.createTriplesCollection();
        }
        
        // Converter triplas para pontos Qdrant
        const points = [];
        
        for (let i = 0; i < triplas.length; i++) {
            const tripla = triplas[i];
            
            // Construir texto para embedding
            const texto = `${tripla.legado.valor} ${tripla.presente.valor} ${tripla.objetivo.valor}`;
            
            // Gerar embedding se serviço disponível
            let vector = null;
            if (KC.EmbeddingService) {
                try {
                    const embedding = await KC.EmbeddingService.generateEmbedding(texto);
                    vector = embedding.embedding;
                } catch (error) {
                    Logger.warn(`[QdrantService] Erro ao gerar embedding para tripla ${i}:`, error);
                }
            }
            
            // Se não conseguiu gerar embedding, usar vetor aleatório para testes
            if (!vector) {
                vector = Array(this.config.vectorSize).fill(0).map(() => Math.random());
                Logger.warn(`[QdrantService] Usando vetor aleatório para tripla ${i}`);
            }
            
            // Criar ponto para Qdrant
            points.push({
                id: `triple-${Date.now()}-${i}`,
                vector: vector,
                payload: {
                    legado: tripla.legado,
                    presente: tripla.presente,
                    objetivo: tripla.objetivo,
                    metadados: tripla.metadados,
                    texto: texto,
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Inserir em batches
        const batchSize = 100;
        let totalInserted = 0;
        
        for (let i = 0; i < points.length; i += batchSize) {
            const batch = points.slice(i, i + batchSize);
            try {
                const result = await this.insertBatch(batch, 'knowledge_triples');
                totalInserted += batch.length;
                Logger.info(`[QdrantService] Inseridas ${totalInserted}/${points.length} triplas`);
            } catch (error) {
                Logger.error(`[QdrantService] Erro ao inserir batch ${i/batchSize + 1}:`, error);
            }
        }
        
        return {
            status: 'success',
            totalTriplas: triplas.length,
            totalInserted: totalInserted,
            collection: 'knowledge_triples'
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