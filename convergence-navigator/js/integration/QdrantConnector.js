/**
 * 🔌 QdrantConnector - Conexão REAL com Qdrant Vector Database
 * 
 * Conecta com a instância real em http://qdr.vcia.com.br:6333
 * Collection: knowledge_consolidator
 * 
 * ESTRUTURA COMPLETA DOS CAMPOS MAPEADOS DO QDRANT:
 * 
 * payload: {
 *   // IDs e Identificadores
 *   id: number,
 *   chunkId: string,
 *   documentId: string,
 *   originalChunkId: string,
 *   
 *   // Conteúdo
 *   content: string,          // Conteúdo completo do chunk
 *   chunkText: string,        // Texto do chunk
 *   contentHash: string,      // Hash do conteúdo
 *   
 *   // Metadados do Arquivo
 *   fileName: string,
 *   filePath: string,
 *   lastModified: string (ISO date),
 *   insertedAt: string (ISO date),
 *   size: number,
 *   
 *   // Índices e Estrutura
 *   chunkIndex: number,
 *   version: number,
 *   
 *   // Análise e Inteligência
 *   analysisType: string,     // "Breakthrough Técnico", "Evolução Conceitual", etc
 *   intelligenceType: string, // "technical_innovation", "knowledge_piece", etc
 *   intelligenceScore: number,
 *   relevanceScore: number,
 *   impactScore: number,
 *   convergenceScore: number,
 *   
 *   // Categorias e Keywords
 *   metadata: {
 *     fileName: string,
 *     fileId: string,
 *     keywords: string[],
 *     categories: string[],
 *     relevanceScore: number,
 *     relevanceInheritance: number,
 *     semanticDensity: number,
 *     lastModified: string,
 *     processedAt: string,
 *     totalChunks: number,
 *     chunkIndex: number
 *   },
 *   
 *   // Enriquecimento
 *   enrichmentLevel: number,
 *   enrichmentMetadata: {
 *     processedAt: string,
 *     pipelineVersion: string,
 *     insightCount: number,
 *     hasBreakthrough: boolean,
 *     chainParticipation: number
 *   },
 *   
 *   // Cadeias de Convergência
 *   convergenceChains: [{
 *     chainId: string,
 *     theme: string,           // "vcia - Breakthrough Técnico"
 *     strength: number,        // 0.0 - 1.0
 *     participants: string[]   // Lista de arquivos participantes
 *   }],
 *   
 *   // Vetor de Embeddings (768 dimensões)
 *   vector: number[]
 * }
 */

class QdrantConnector {
    constructor() {
        // Configuração REAL do Qdrant
        this.baseURL = 'http://qdr.vcia.com.br:6333';
        this.collection = 'knowledge_consolidator';
        this.connected = false;
        this.lastError = null;
        
        // Cache de pontos
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
        
        this.init();
    }
    
    async init() {
        console.log('🔌 QdrantConnector: Conectando ao Qdrant...');
        await this.checkConnection();
    }
    
    /**
     * Verifica conexão com Qdrant
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseURL}/collections/${this.collection}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.connected = true;
                console.log('✅ QdrantConnector: Conectado!', data.result);
                return true;
            } else {
                throw new Error(`Status ${response.status}`);
            }
        } catch (error) {
            this.connected = false;
            this.lastError = error;
            console.warn('⚠️ QdrantConnector: Não foi possível conectar ao Qdrant', error);
            return false;
        }
    }
    
    /**
     * Busca por dimensões no Qdrant REAL
     */
    async searchByDimensions(dimensions) {
        console.log('🔍 Buscando no Qdrant por dimensões:', dimensions);
        
        if (!this.connected) {
            await this.checkConnection();
            if (!this.connected) {
                console.warn('⚠️ Qdrant offline, usando cache local');
                return this.getCachedData(dimensions);
            }
        }
        
        try {
            // Construir filtro multi-dimensional
            const filter = this.buildFilter(dimensions);
            
            // Buscar pontos com scroll para pegar todos
            const points = await this.scrollPoints(filter, 1000);
            
            // Processar e retornar
            return {
                total: points.length,
                chunks: this.processPoints(points),
                dimensions: dimensions,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Erro na busca:', error);
            this.lastError = error;
            return this.getCachedData(dimensions);
        }
    }
    
    /**
     * Scroll através de todos os pontos com filtro
     */
    async scrollPoints(filter, limit = 1000) {
        const allPoints = [];
        let offset = null;
        let hasMore = true;
        
        while (hasMore && allPoints.length < limit) {
            const body = {
                filter: filter,
                limit: Math.min(100, limit - allPoints.length),
                with_payload: true,
                with_vector: false
            };
            
            if (offset) {
                body.offset = offset;
            }
            
            const response = await fetch(`${this.baseURL}/collections/${this.collection}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`Scroll failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.result && data.result.points) {
                allPoints.push(...data.result.points);
                offset = data.result.next_page_offset;
                hasMore = offset !== null && offset !== undefined;
            } else {
                hasMore = false;
            }
        }
        
        console.log(`📦 ${allPoints.length} pontos encontrados`);
        return allPoints;
    }
    
    /**
     * Constrói filtro baseado nas dimensões
     */
    buildFilter(dimensions) {
        const must = [];
        const should = [];
        
        // TEMPORAL - Filtro por data
        if (dimensions.temporal) {
            if (dimensions.temporal.startDate && dimensions.temporal.endDate) {
                must.push({
                    key: "payload.lastModified",
                    range: {
                        gte: dimensions.temporal.startDate,
                        lte: dimensions.temporal.endDate
                    }
                });
            }
        }
        
        // SEMÂNTICA - Keywords
        if (dimensions.semantic && dimensions.semantic.length > 0) {
            // Buscar em keywords dentro de metadata
            dimensions.semantic.forEach(keyword => {
                should.push({
                    key: "payload.metadata.keywords[]",
                    match: { value: keyword.toLowerCase() }
                });
            });
        }
        
        // CATEGORIAL - Categorias
        if (dimensions.categorical && dimensions.categorical.length > 0) {
            dimensions.categorical.forEach(category => {
                should.push({
                    key: "payload.metadata.categories[]",
                    match: { value: category }
                });
            });
        }
        
        // ANALÍTICA - Tipo de análise
        if (dimensions.analytical) {
            must.push({
                key: "payload.analysisType",
                match: { value: dimensions.analytical }
            });
        }
        
        // Construir filtro final
        const filter = {};
        
        if (must.length > 0) {
            filter.must = must;
        }
        
        if (should.length > 0) {
            filter.should = should;
            filter.min_should = { min_should: 1 }; // Pelo menos um should deve match
        }
        
        console.log('🔧 Filtro construído:', JSON.stringify(filter, null, 2));
        
        return filter;
    }
    
    /**
     * Processa pontos do Qdrant para formato interno
     */
    processPoints(points) {
        return points.map(point => {
            const p = point.payload;
            
            return {
                // IDs
                id: point.id,
                chunkId: p.chunkId || p.originalChunkId,
                documentId: p.documentId,
                
                // Conteúdo
                content: p.content || p.chunkText || '',
                
                // Arquivo
                fileName: p.fileName || (p.metadata && p.metadata.fileName) || '',
                filePath: p.filePath || '',
                lastModified: p.lastModified || (p.metadata && p.metadata.lastModified) || '',
                
                // Keywords e Categorias
                keywords: (p.metadata && p.metadata.keywords) || [],
                categories: (p.metadata && p.metadata.categories) || [],
                
                // Análise
                analysisType: p.analysisType || '',
                intelligenceType: p.intelligenceType || '',
                
                // Scores
                relevanceScore: p.relevanceScore || 0,
                intelligenceScore: p.intelligenceScore || 0,
                convergenceScore: p.convergenceScore || 0,
                impactScore: p.impactScore || 0,
                
                // Metadata adicional
                chunkIndex: p.chunkIndex || (p.metadata && p.metadata.chunkIndex) || 0,
                totalChunks: (p.metadata && p.metadata.totalChunks) || 1,
                semanticDensity: (p.metadata && p.metadata.semanticDensity) || 0,
                
                // Convergence Chains
                convergenceChains: p.convergenceChains || [],
                
                // Enriquecimento
                enrichmentLevel: p.enrichmentLevel || 0,
                hasBreakthrough: (p.enrichmentMetadata && p.enrichmentMetadata.hasBreakthrough) || false
            };
        });
    }
    
    /**
     * Busca por vetor de embedding
     */
    async searchByVector(vector, limit = 10) {
        if (!this.connected) {
            console.warn('⚠️ Qdrant offline');
            return [];
        }
        
        try {
            const response = await fetch(`${this.baseURL}/collections/${this.collection}/points/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vector: vector,
                    limit: limit,
                    with_payload: true,
                    with_vector: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const data = await response.json();
            return this.processPoints(data.result || []);
            
        } catch (error) {
            console.error('❌ Erro na busca vetorial:', error);
            return [];
        }
    }
    
    /**
     * Busca por convergence chains
     */
    async searchByConvergenceChain(theme) {
        const filter = {
            must: [{
                key: "payload.convergenceChains[].theme",
                match: { value: theme }
            }]
        };
        
        const points = await this.scrollPoints(filter, 100);
        return this.processPoints(points);
    }
    
    /**
     * Obtém estatísticas da collection
     */
    async getCollectionStats() {
        if (!this.connected) {
            await this.checkConnection();
        }
        
        try {
            const response = await fetch(`${this.baseURL}/collections/${this.collection}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    pointsCount: data.result.points_count || 0,
                    vectorsCount: data.result.vectors_count || 0,
                    indexedVectorsCount: data.result.indexed_vectors_count || 0,
                    segmentsCount: data.result.segments_count || 0,
                    status: data.result.status || 'unknown'
                };
            }
        } catch (error) {
            console.error('❌ Erro ao obter stats:', error);
        }
        
        return null;
    }
    
    /**
     * Dados em cache (fallback quando Qdrant offline)
     */
    getCachedData(dimensions) {
        const cacheKey = JSON.stringify(dimensions);
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 Usando dados do cache');
                return cached.data;
            }
        }
        
        // Retornar estrutura vazia se não há cache
        return {
            total: 0,
            chunks: [],
            dimensions: dimensions,
            fromCache: true,
            error: 'Qdrant offline e sem cache disponível'
        };
    }
    
    /**
     * Salva resultado no cache
     */
    cacheResult(dimensions, result) {
        const cacheKey = JSON.stringify(dimensions);
        this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
    }
    
    /**
     * Limpa o cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache limpo');
    }
}

// Exportar para uso global
window.QdrantConnector = QdrantConnector;