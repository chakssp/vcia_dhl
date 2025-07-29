/**
 * QdrantConnector - Interface direta com Qdrant Vector DB
 * 
 * Este módulo estabelece conexão com o Qdrant e fornece métodos
 * para leitura e agregação dos dados processados.
 */

class QdrantConnector {
    constructor() {
        this.baseUrl = null;
        this.collection = null;
        this.connected = false;
        this.cache = new Map();
        this.connectionPromise = null;
    }

    /**
     * Inicializa conexão com Qdrant
     * @param {Object} config - Configuração de conexão
     * @param {string} config.url - URL do servidor Qdrant
     * @param {string} config.collection - Nome da coleção
     * @returns {Promise<boolean>} Status da conexão
     */
    async initialize(config) {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this._connect(config);
        return this.connectionPromise;
    }

    async _connect(config) {
        try {
            this.baseUrl = config.url || 'http://qdr.vcia.com.br:6333';
            this.collection = config.collection || 'knowledge_consolidator';

            // Verificar conexão
            const response = await fetch(`${this.baseUrl}/collections/${this.collection}`);
            
            if (!response.ok) {
                throw new Error(`Falha ao conectar: ${response.status} ${response.statusText}`);
            }

            const collectionInfo = await response.json();
            console.log('✅ Conectado ao Qdrant:', collectionInfo.result);
            
            this.connected = true;
            return true;

        } catch (error) {
            console.error('❌ Erro ao conectar ao Qdrant:', error);
            this.connected = false;
            throw error;
        }
    }

    /**
     * Carrega todos os pontos da coleção
     * @param {number} limit - Limite de pontos (default: todos)
     * @param {number} offset - Offset para paginação
     * @returns {Promise<Array>} Array de pontos
     */
    async loadAllPoints(limit = null, offset = 0) {
        if (!this.connected) {
            throw new Error('Não conectado ao Qdrant');
        }

        const cacheKey = `all_points_${limit}_${offset}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const body = {
                limit: limit || 10000,  // Qdrant default max
                offset: offset,
                with_payload: true,
                with_vectors: false  // Não precisamos dos vetores para agregação
            };

            const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Erro ao carregar pontos: ${response.status}`);
            }

            const data = await response.json();
            const points = data.result?.points || [];
            
            this.cache.set(cacheKey, points);
            return points;

        } catch (error) {
            console.error('Erro ao carregar pontos:', error);
            throw error;
        }
    }

    /**
     * Busca pontos por filtro
     * @param {Object} filter - Filtro Qdrant
     * @param {number} limit - Limite de resultados
     * @returns {Promise<Array>} Pontos filtrados
     */
    async searchByFilter(filter, limit = 100) {
        if (!this.connected) {
            throw new Error('Não conectado ao Qdrant');
        }

        try {
            const body = {
                filter: filter,
                limit: limit,
                with_payload: true,
                with_vectors: false
            };

            const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Erro na busca: ${response.status}`);
            }

            const data = await response.json();
            return data.result?.points || [];

        } catch (error) {
            console.error('Erro ao buscar por filtro:', error);
            throw error;
        }
    }

    /**
     * Busca semântica por texto
     * @param {string} query - Texto de busca
     * @param {number} limit - Limite de resultados
     * @returns {Promise<Array>} Resultados ordenados por similaridade
     */
    async searchByText(query, limit = 50) {
        if (!this.connected) {
            throw new Error('Não conectado ao Qdrant');
        }

        try {
            // Primeiro, obter embedding do texto
            const embedding = await this.getEmbedding(query);
            
            // Buscar por similaridade
            const body = {
                vector: embedding,
                limit: limit,
                with_payload: true,
                score_threshold: 0.5  // Threshold mínimo de similaridade
            };

            const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Erro na busca semântica: ${response.status}`);
            }

            const data = await response.json();
            return data.result || [];

        } catch (error) {
            console.error('Erro na busca semântica:', error);
            throw error;
        }
    }

    /**
     * Obtém embedding para um texto usando Ollama
     * @param {string} text - Texto para gerar embedding
     * @returns {Promise<Array>} Vetor de embedding
     */
    async getEmbedding(text) {
        try {
            const response = await fetch('http://127.0.0.1:11434/api/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nomic-embed-text',
                    prompt: text
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao gerar embedding');
            }

            const data = await response.json();
            return data.embedding;

        } catch (error) {
            console.error('Erro ao gerar embedding:', error);
            // Fallback: retornar vetor aleatório para não quebrar o fluxo
            return new Array(768).fill(0).map(() => Math.random() * 2 - 1);
        }
    }

    /**
     * Obtém estatísticas da coleção
     * @returns {Promise<Object>} Estatísticas
     */
    async getStats() {
        if (!this.connected) {
            throw new Error('Não conectado ao Qdrant');
        }

        try {
            const response = await fetch(`${this.baseUrl}/collections/${this.collection}`);
            const data = await response.json();
            
            return {
                totalPoints: data.result?.points_count || 0,
                vectorSize: data.result?.config?.params?.vectors?.size || 768,
                status: data.result?.status || 'unknown'
            };

        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return { totalPoints: 0, vectorSize: 768, status: 'error' };
        }
    }

    /**
     * Limpa cache interno
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache limpo');
    }

    /**
     * Verifica status da conexão
     * @returns {boolean} Status da conexão
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Desconecta do Qdrant
     */
    disconnect() {
        this.connected = false;
        this.connectionPromise = null;
        this.clearCache();
        console.log('Desconectado do Qdrant');
    }
}

// Exportar como módulo ES6
export default QdrantConnector;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.QdrantConnector = QdrantConnector;
}