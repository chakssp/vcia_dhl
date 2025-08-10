/**
 * QdrantConnector Atualizado - Baseado nos dados reais do Qdrant
 * Collection: knowledge_consolidator
 * Vectores: 768 dimensões (nomic-embed-text embeddings)
 * Campos reais extraídos dos payloads existentes
 */
class QdrantConnector {
    constructor(baseUrl = 'http://qdr.vcia.com.br:6333') {
        this.baseUrl = baseUrl;
        this.collectionName = 'knowledge_consolidator'; // Nome correto da collection
        this.cache = new Map();
        this.connected = false;
        this.lastSync = null;
        
        // Campos reais dos payloads mapeados
        this.realFieldMapping = {
            // Campos de identificação
            id: 'id',
            documentId: 'documentId',
            chunkId: 'chunkId',
            originalChunkId: 'originalChunkId',
            
            // Campos de arquivo
            fileName: 'fileName', 
            filePath: 'filePath',
            size: 'size',
            
            // Campos de chunk
            chunkIndex: 'chunkIndex',
            chunkText: 'chunkText',
            content: 'content',
            
            // Campos de análise
            categories: 'categories', // Array com múltiplas categorias
            relevanceScore: 'relevanceScore',
            intelligenceScore: 'intelligenceScore',
            convergenceScore: 'convergenceScore',
            impactScore: 'impactScore',
            
            // Campos de análise semântica
            analysisType: 'analysisType',
            intelligenceType: 'intelligenceType',
            
            // Campos de metadados
            metadata: 'metadata',
            enrichmentMetadata: 'enrichmentMetadata',
            enrichmentLevel: 'enrichmentLevel',
            
            // Campos de cadeia de convergência
            convergenceChains: 'convergenceChains',
            
            // Campos de versionamento
            version: 'version',
            mergeCount: 'mergeCount',
            
            // Timestamps
            insertedAt: 'insertedAt',
            lastModified: 'lastModified',
            lastMerged: 'lastMerged'
        };
    }
    
    /**
     * Testa conexão e verifica se a collection knowledge_consolidator existe
     */
    async testConnection() {
        try {
            // Verificar se servidor está rodando
            const response = await fetch(`${this.baseUrl}/collections`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const collections = data.result?.collections || [];
            
            // Verificar se knowledge_consolidator existe
            const targetCollection = collections.find(c => c.name === 'knowledge_consolidator');
            if (!targetCollection) {
                console.warn('Collection knowledge_consolidator não encontrada. Collections disponíveis:', 
                    collections.map(c => c.name).join(', '));
                return false;
            }
            
            // Verificar detalhes da collection
            const collectionResponse = await fetch(`${this.baseUrl}/collections/${this.collectionName}`);
            if (!collectionResponse.ok) throw new Error(`HTTP ${collectionResponse.status}`);
            
            const collectionData = await collectionResponse.json();
            const pointsCount = collectionData.result?.points_count || 0;
            const vectorSize = collectionData.result?.config?.params?.vectors?.size || 0;
            
            console.log(`✅ Qdrant conectado - Collection: ${this.collectionName}`);
            console.log(`📊 Points: ${pointsCount}, Vector Dimensions: ${vectorSize}`);
            
            this.connected = true;
            return true;
            
        } catch (error) {
            this.connected = false;
            console.warn('⚠️ Erro ao conectar com Qdrant:', error.message);
            return false;
        }
    }
    
    /**
     * Busca categorias reais usando o campo categories dos payloads
     */
    async getCategories() {
        const cacheKey = 'categories';
        if (this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }
        
        try {
            // Buscar todos os pontos para extrair categorias únicas
            const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 100, // Buscar em lotes
                    with_payload: true,
                    with_vector: false
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const points = data.result?.points || [];
            
            // Extrair categorias únicas de todos os pontos
            const categorySet = new Set();
            const categoryStats = new Map();
            
            points.forEach(point => {
                const categories = point.payload?.categories;
                if (Array.isArray(categories)) {
                    categories.forEach(cat => {
                        if (typeof cat === 'string' && cat.trim()) {
                            categorySet.add(cat.trim());
                            categoryStats.set(cat.trim(), (categoryStats.get(cat.trim()) || 0) + 1);
                        }
                    });
                }
            });
            
            // Converter para formato de nós
            const categories = Array.from(categorySet).map(catName => ({
                id: `cat_${catName.toLowerCase().replace(/\s+/g, '_')}`,
                name: catName,
                color: this.getCategoryColor(catName),
                count: categoryStats.get(catName) || 0,
                description: `Categoria com ${categoryStats.get(catName) || 0} ocorrências`,
                type: 'category'
            }));
            
            this.cache.set(cacheKey, {
                data: categories,
                timestamp: Date.now()
            });
            
            console.log(`📂 Categorias encontradas: ${categories.length}`);
            return categories;
            
        } catch (error) {
            console.warn('Erro ao buscar categorias:', error);
            return this.getFallbackCategories();
        }
    }
    
    /**
     * Busca arquivos reais agrupados por fileName
     */
    async getFiles() {
        const cacheKey = 'files';
        if (this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }
        
        try {
            // Buscar pontos com scroll para pegar todos os dados
            let allPoints = [];
            let nextOffset = null;
            
            do {
                const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        limit: 100,
                        with_payload: true,
                        with_vector: false,
                        ...(nextOffset && { offset: nextOffset })
                    })
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                const points = data.result?.points || [];
                allPoints = allPoints.concat(points);
                nextOffset = data.result?.next_page_offset;
                
            } while (nextOffset && allPoints.length < 200); // Limitar para evitar sobrecarga
            
            // Agrupar por fileName
            const filesMap = new Map();
            
            allPoints.forEach(point => {
                const payload = point.payload;
                const fileName = payload?.fileName;
                
                if (!fileName) return;
                
                if (!filesMap.has(fileName)) {
                    filesMap.set(fileName, {
                        id: `file_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                        name: fileName,
                        path: payload?.filePath || '',
                        size: this.formatFileSize(payload?.size || 0),
                        relevance: Math.round((payload?.relevanceScore || payload?.intelligenceScore || 50)),
                        categories: Array.from(new Set(payload?.categories || [])),
                        analyzed: payload?.analyzed !== false,
                        lastModified: payload?.lastModified || payload?.insertedAt,
                        chunks: 1,
                        type: 'file',
                        analysisType: payload?.analysisType || payload?.intelligenceType
                    });
                } else {
                    // Agregar dados de múltiplos chunks
                    const existing = filesMap.get(fileName);
                    existing.chunks = (existing.chunks || 0) + 1;
                    
                    // Mesclar categorias únicas
                    if (payload?.categories) {
                        const allCats = [...existing.categories, ...payload.categories];
                        existing.categories = Array.from(new Set(allCats));
                    }
                    
                    // Atualizar relevância (média ou máxima)
                    const newRelevance = payload?.relevanceScore || payload?.intelligenceScore || 50;
                    existing.relevance = Math.max(existing.relevance, newRelevance);
                }
            });
            
            const files = Array.from(filesMap.values());
            
            this.cache.set(cacheKey, {
                data: files,
                timestamp: Date.now()
            });
            
            console.log(`📄 Arquivos encontrados: ${files.length}`);
            return files;
            
        } catch (error) {
            console.warn('Erro ao buscar arquivos:', error);
            return this.getFallbackFiles();
        }
    }
    
    /**
     * Busca entidades baseadas em convergenceChains
     */
    async getEntities() {
        const cacheKey = 'entities';
        if (this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }
        
        try {
            // Buscar pontos que têm convergenceChains
            const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 50,
                    with_payload: true,
                    with_vector: false,
                    filter: {
                        must: [
                            {
                                key: "convergenceChains",
                                match: { any: [] } // Points que têm o campo convergenceChains
                            }
                        ]
                    }
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const points = data.result?.points || [];
            
            // Extrair entidades únicas dos convergenceChains
            const entitiesMap = new Map();
            
            points.forEach(point => {
                const chains = point.payload?.convergenceChains;
                if (Array.isArray(chains)) {
                    chains.forEach(chain => {
                        const theme = chain.theme || 'Tema Sem Nome';
                        const participants = chain.participants || [];
                        const strength = chain.strength || 0;
                        
                        const entityId = `entity_${theme.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
                        
                        if (!entitiesMap.has(entityId)) {
                            entitiesMap.set(entityId, {
                                id: entityId,
                                name: theme,
                                type: 'Convergence Theme',
                                status: strength > 0.7 ? 'Alto' : 'Médio',
                                relevance: Math.round(strength * 100),
                                participants: participants.length,
                                chainId: chain.chainId
                            });
                        }
                    });
                }
            });
            
            const entities = Array.from(entitiesMap.values());
            
            this.cache.set(cacheKey, {
                data: entities,
                timestamp: Date.now()
            });
            
            console.log(`🔗 Entidades encontradas: ${entities.length}`);
            return entities;
            
        } catch (error) {
            console.warn('Erro ao buscar entidades:', error);
            return this.getFallbackEntities();
        }
    }
    
    /**
     * Busca cadeias de convergência reais dos dados
     */
    async getConvergenceChains(limit = 20) {
        try {
            const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: limit,
                    with_payload: true,
                    with_vector: false,
                    filter: {
                        must: [
                            {
                                key: "convergenceScore",
                                range: { gte: 15 } // Points com convergenceScore >= 15
                            }
                        ]
                    }
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const points = data.result?.points || [];
            
            return points.map(point => {
                const payload = point.payload;
                return {
                    id: point.id,
                    name: payload?.analysisType || payload?.intelligenceType || 'Padrão Detectado',
                    strength: (payload?.convergenceScore || payload?.intelligenceScore || 50) / 100,
                    entities: payload?.convergenceChains?.map(c => c.participants || []).flat() || [],
                    files: [payload?.fileName].filter(Boolean),
                    type: payload?.intelligenceType || 'semantic',
                    score: payload?.convergenceScore || payload?.intelligenceScore || 50
                };
            });
            
        } catch (error) {
            console.warn('Erro ao buscar cadeias de convergência:', error);
            return [];
        }
    }
    
    /**
     * Busca dados completos com base nos dados reais do Qdrant
     */
    async getAllData() {
        console.log('🔍 Carregando dados reais do Qdrant knowledge_consolidator...');
        updateQdrantStatus('connecting', 'Conectando...');
        showToast('Conectando com Qdrant...', 'info');
        
        const isConnected = await this.testConnection();
        if (!isConnected) {
            updateQdrantStatus('error', 'Collection não encontrada');
            showToast('Collection knowledge_consolidator não encontrada', 'error');
            return this.getFallbackData();
        }
        
        try {
            // Carregar dados em paralelo
            const [categories, files, entities, convergenceChains] = await Promise.all([
                this.getCategories(),
                this.getFiles(),
                this.getEntities(),
                this.getConvergenceChains()
            ]);
            
            this.lastSync = new Date().toISOString();
            
            const data = {
                categories,
                files,
                entities,
                convergenceChains,
                metadata: {
                    totalNodes: categories.length + files.length + entities.length,
                    totalConnections: convergenceChains.length,
                    lastSync: this.lastSync,
                    source: 'Qdrant Real Data',
                    collection: this.collectionName,
                    fieldsMapping: this.realFieldMapping
                }
            };
            
            updateQdrantStatus('connected', `${data.metadata.totalNodes} nós carregados`);
            showToast(`Dados carregados: ${data.metadata.totalNodes} nós, ${data.metadata.totalConnections} conexões`, 'success');
            
            console.log('📊 Dados carregados do Qdrant:', {
                categories: categories.length,
                files: files.length,
                entities: entities.length,
                convergenceChains: convergenceChains.length
            });
            
            return data;
            
        } catch (error) {
            console.error('Erro ao carregar dados do Qdrant:', error);
            updateQdrantStatus('error', 'Erro no carregamento');
            showToast('Erro ao carregar dados. Usando fallback.', 'error');
            return this.getFallbackData();
        }
    }
    
    // Funções auxiliares
    getCategoryColor(categoryName) {
        const colors = {
            'técnico': '#3B82F6',
            'estratégico': '#10B981', 
            'insight': '#F59E0B',
            'aprendizado': '#8B5CF6',
            'ideia': '#EF4444',
            'momento decisivo': '#F97316'
        };
        
        const key = categoryName.toLowerCase();
        return colors[key] || this.getRandomColor();
    }
    
    getRandomColor() {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#F97316', '#06B6D4', '#84CC16'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    isCacheValid(key, maxAge = 300000) { // 5 minutos
        const cached = this.cache.get(key);
        return cached && (Date.now() - cached.timestamp) < maxAge;
    }
    
    // Fallbacks case Qdrant não esteja disponível
    getFallbackCategories() {
        return [
            { id: 'cat_tecnico', name: 'Técnico', color: '#3B82F6', count: 0, type: 'category' },
            { id: 'cat_estrategico', name: 'Estratégico', color: '#10B981', count: 0, type: 'category' }
        ];
    }
    
    getFallbackFiles() {
        return [
            { id: 'file_fallback', name: 'Dados não disponíveis', type: 'file', relevance: 0 }
        ];
    }
    
    getFallbackEntities() {
        return [
            { id: 'entity_fallback', name: 'Entidades não disponíveis', type: 'Entity' }
        ];
    }
    
    getFallbackData() {
        return {
            categories: this.getFallbackCategories(),
            files: this.getFallbackFiles(),
            entities: this.getFallbackEntities(),
            convergenceChains: [],
            metadata: {
                totalNodes: 3,
                totalConnections: 0,
                lastSync: new Date().toISOString(),
                source: 'Fallback Data'
            }
        };
    }
}