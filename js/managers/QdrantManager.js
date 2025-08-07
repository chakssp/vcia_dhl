/**
 * QdrantManager.js
 * 
 * Gerenciador centralizado para todas as operações com Qdrant
 * Implementa arquitetura Qdrant-First com prevenção de duplicação
 * 
 * Responsabilidades:
 * - Verificação de duplicatas antes de inserção
 * - Gestão de IDs únicos baseados em conteúdo + caminho
 * - Operações de enriquecimento incremental
 * - Sincronização interface ↔ Qdrant
 * - Estatísticas de completude de dados
 * 
 * @requires QdrantService
 * @requires EmbeddingService
 */

class QdrantManager {
    constructor() {
        this.qdrantService = null;
        this.embeddingService = null;
        this.initialized = false;
        
        // Configurações
        this.config = {
            batchSize: 10,
            duplicateCheckFields: ['filePath', 'contentHash', 'id'],
            enrichmentFields: [
                'keywords', 'sentiment', 'decisiveMoment', 
                'breakthrough', 'confidenceScore', 'expertiseLevel',
                'questionTypes', 'relatedChunks', 'período',
                'isHistorical', 'futureReference', 'hasPreview',
                'hasAIAnalysis', 'hasCategorization', 'isValidated'
            ]
        };
        
        // Cache local para performance
        this.fileHashCache = new Map();
        this.enrichmentQueue = [];
        
        // Estatísticas
        this.stats = {
            totalPoints: 0,
            duplicatesFound: 0,
            duplicatesSkipped: 0,
            duplicatesUpdated: 0,
            pointsEnriched: 0,
            enrichmentErrors: 0
        };
        
        // Auto-inicializar de forma lazy quando necessário
        this._autoInitPromise = null;
    }
    
    /**
     * Garante que o manager está inicializado (lazy initialization)
     * @private
     */
    async _ensureInitialized() {
        if (this.initialized) {
            return true;
        }
        
        // Se já está inicializando, aguardar
        if (this._autoInitPromise) {
            return this._autoInitPromise;
        }
        
        // Inicializar
        this._autoInitPromise = this.initialize();
        return this._autoInitPromise;
    }
    
    /**
     * Inicializa o gerenciador
     */
    async initialize() {
        try {
            console.log('🚀 Inicializando QdrantManager...');
            
            // Obter instâncias dos serviços
            this.qdrantService = window.KC?.QdrantService;
            this.embeddingService = window.KC?.EmbeddingService;
            
            if (!this.qdrantService) {
                console.error('❌ QdrantService não encontrado no window.KC');
                console.log('Disponível em window.KC:', Object.keys(window.KC || {}));
                throw new Error('QdrantService não encontrado');
            }
            
            // Verificar conexão
            const connected = await this.qdrantService.checkConnection();
            if (!connected) {
                throw new Error('Não foi possível conectar ao Qdrant');
            }
            
            // Carregar estatísticas iniciais
            await this.updateStats();
            
            this.initialized = true;
            console.log('✅ QdrantManager inicializado com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar QdrantManager:', error);
            return false;
        }
    }
    
    /**
     * Gera ID único baseado em conteúdo + caminho + tamanho
     * IMPORTANTE: Qdrant aceita apenas números inteiros ou UUIDs como IDs
     */
    generateUniqueId(file) {
        // Usar múltiplos campos para garantir unicidade
        const content = file.content || file.chunkText || file.preview || '';
        const path = file.filePath || file.path || file.fileName || '';
        const size = file.size || content.length || 0;
        
        // NÃO usar Date.now() - usar timestamp fixo do arquivo ou 0
        // Isso garante que o mesmo arquivo sempre gera o mesmo ID
        const timestamp = file.lastModified || file.timestamp || 0;
        
        // Adicionar índice do chunk se existir para diferenciar chunks do mesmo arquivo
        const chunkIndex = file.chunkIndex !== undefined ? file.chunkIndex : '';
        
        // Combinar informações para ID único e ESTÁVEL
        const uniqueString = `${path}|${size}|${timestamp}|${chunkIndex}|${content.substring(0, 100)}`;
        
        // Log removido para evitar poluição no console durante processamento em lote
        
        // Gerar um hash numérico positivo para usar como ID
        let hash = 0;
        for (let i = 0; i < uniqueString.length; i++) {
            const char = uniqueString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Garantir que seja positivo e único
        const numericId = Math.abs(hash);
        
        // Se o ID já foi usado (muito improvável), adicionar timestamp
        if (this.usedIds && this.usedIds.has(numericId)) {
            return timestamp; // Usar timestamp como fallback
        }
        
        // Registrar ID usado
        if (!this.usedIds) this.usedIds = new Set();
        this.usedIds.add(numericId);
        
        return numericId;
    }
    
    /**
     * Gera hash mais robusto para evitar colisões
     */
    generateHash(str) {
        if (!str || str.length === 0) return '0';
        
        // Implementação de hash DJB2 mais robusta
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) + hash) + char; // hash * 33 + c
        }
        
        // Converter para hexadecimal positivo
        const result = Math.abs(hash).toString(16);
        
        // Adicionar alguns caracteres do conteúdo para mais unicidade
        const prefix = str.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '').substring(0, 4);
        
        return `${prefix}-${result}`;
    }
    
    /**
     * Verifica se arquivo já existe no Qdrant
     */
    async checkDuplicate(file) {
        try {
            // LÓGICA CORRIGIDA: Verificar duplicatas considerando chunks
            // 1. Se tem chunkIndex, verificar se ESSE CHUNK específico já existe
            // 2. Se não tem chunkIndex, verificar se o arquivo completo já existe
            
            const hasChunkIndex = file.chunkIndex !== undefined && file.chunkIndex !== null && file.chunkIndex !== -1;
            
            if (hasChunkIndex) {
                // Para chunks, verificar se esse chunk específico já existe
                const fileName = file.fileName || file.name || '';
                const chunkIndex = file.chunkIndex;
                
                console.log(`🔍 Verificando se chunk ${chunkIndex} de ${fileName} já existe...`);
                
                // Buscar por arquivo E chunk específico
                const filter = {
                    must: [
                        {
                            key: "fileName",
                            match: { value: fileName }
                        },
                        {
                            key: "chunkIndex", 
                            match: { value: chunkIndex }
                        }
                    ]
                };
                
                try {
                    const results = await this.qdrantService.scrollPoints({
                        filter: filter,
                        limit: 1,
                        withPayload: true
                    });
                    
                    if (results && results.points && results.points.length > 0) {
                        console.log(`⚠️ Chunk ${chunkIndex} de ${fileName} JÁ EXISTE no Qdrant`);
                        this.stats.duplicatesFound++;
                        return {
                            isDuplicate: true,
                            existingPoint: results.points[0],
                            existingId: results.points[0].id,
                            reason: 'chunk_already_exists'
                        };
                    } else {
                        console.log(`✅ Chunk ${chunkIndex} de ${fileName} é NOVO - permitindo inserção`);
                        return { isDuplicate: false };
                    }
                } catch (error) {
                    console.error('Erro ao verificar chunk duplicado:', error);
                    // Em caso de erro, permitir inserção para não bloquear
                    return { isDuplicate: false };
                }
            }
            
            const content = file.content || file.chunkText || file.preview || '';
            const contentHash = this.generateHash(content);
            const filePath = file.filePath || file.path || file.fileName || file.name || '';
            
            // Se não tem caminho válido, não pode ser duplicata
            if (!filePath || filePath.trim() === '') {
                return { isDuplicate: false };
            }
            
            // Para arquivos sem chunks, verificar por filePath
            let filter = {
                must: [
                    {
                        key: "filePath",
                        match: { value: filePath }
                    }
                ]
            };
            
            // Buscar no Qdrant usando scroll com filtro
            let results = await this.qdrantService.scrollPoints({
                filter: filter,
                limit: 100,
                withPayload: true
            });
            
            // Se encontrou resultados, verificar se é realmente duplicata
            if (results && results.points && results.points.length > 0) {
                for (const point of results.points) {
                    const existingPath = point.payload?.filePath || '';
                    const existingHash = point.payload?.contentHash || '';
                    
                    // Verificar match exato de caminho E hash de conteúdo
                    if (existingPath === filePath && existingHash === contentHash) {
                        this.stats.duplicatesFound++;
                        return {
                            isDuplicate: true,
                            existingPoint: point,  // RETORNA PONTO COMPLETO
                            existingId: point.id,
                            similarity: 1.0,
                            // Adicionar resumo para facilitar debug
                            summary: {
                                version: point.payload?.version || 1,
                                enrichmentLevel: point.payload?.enrichmentLevel || 0,
                                categories: point.payload?.categories || [],
                                analysisType: point.payload?.analysisType
                            }
                        };
                    }
                }
            }
            
            // NOVO: Se não encontrou por caminho completo, buscar pelo campo fileName que é onde está salvo
            const fileName = file.name || file.fileName || filePath.split('/').pop() || filePath.split('\\').pop() || '';
            if (fileName) {
                // Buscar diretamente no campo fileName onde sabemos que está o nome
                filter = {
                    must: [
                        {
                            key: "fileName",
                            match: { value: fileName }
                        }
                    ]
                };
                
                results = await this.qdrantService.scrollPoints({
                    filter: filter,
                    limit: 100,
                    withPayload: true
                });
                
                if (results && results.points && results.points.length > 0) {
                    // Para arquivos encontrados por nome, assumir que é o mesmo arquivo
                    // O hash pode ser diferente entre chunks e arquivo completo
                    const point = results.points[0]; // Pegar o primeiro match
                    this.stats.duplicatesFound++;
                    return {
                        isDuplicate: true,
                        existingPoint: point,
                        existingId: point.id,
                        similarity: 0.95,
                        summary: {
                            version: point.payload?.version || 1,
                            enrichmentLevel: point.payload?.enrichmentLevel || 0,
                            categories: point.payload?.categories || [],
                            analysisType: point.payload?.analysisType
                        }
                    };
                }
            }
            
            // Se não encontrou por caminho ou nome, tentar por hash de conteúdo
            filter = {
                must: [
                    {
                        key: "contentHash",
                        match: { value: contentHash }
                    }
                ]
            };
            
            results = await this.qdrantService.scrollPoints({
                filter: filter,
                limit: 100,
                withPayload: true
            });
            
            if (results && results.points && results.points.length > 0) {
                // Se encontrou arquivo com mesmo conteúdo mas caminho diferente
                const firstMatch = results.points[0];
                this.stats.duplicatesFound++;
                console.log(`Duplicata de conteúdo encontrada: ${filePath} é duplicata de ${firstMatch.payload?.filePath}`);
                return {
                    isDuplicate: true,
                    existingPoint: firstMatch,  // RETORNA PONTO COMPLETO
                    existingId: firstMatch.id,
                    similarity: 0.9, // Menor similaridade pois é só o conteúdo
                    // Adicionar resumo para facilitar debug
                    summary: {
                        version: firstMatch.payload?.version || 1,
                        enrichmentLevel: firstMatch.payload?.enrichmentLevel || 0,
                        categories: firstMatch.payload?.categories || [],
                        analysisType: firstMatch.payload?.analysisType,
                        note: 'Mesmo conteúdo, caminho diferente'
                    }
                };
            }
            
            return { isDuplicate: false };
            
        } catch (error) {
            console.error('Erro ao verificar duplicata:', error);
            return { isDuplicate: false, error: error.message };
        }
    }
    
    /**
     * Insere ou atualiza arquivo no Qdrant
     */
    async insertOrUpdate(file, options = {}) {
        try {
            // Garantir inicialização
            await this._ensureInitialized();
            
            // Verificar duplicata
            const duplicate = await this.checkDuplicate(file);
            
            if (duplicate.isDuplicate) {
                // Determinar ação baseada em opções ou configuração
                const action = options.duplicateAction || 'skip';
                
                switch (action) {
                    case 'skip':
                        console.log(`⏭️ Arquivo duplicado ignorado: ${file.fileName}`);
                        this.stats.duplicatesSkipped++;
                        return { 
                            success: false, 
                            reason: 'duplicate', 
                            action: 'skipped',
                            existingId: duplicate.existingId 
                        };
                        
                    case 'update':
                        console.log(`Atualizando arquivo existente: ${file.fileName}`);
                        // Propagar preserveFields se existir
                        return await this.updateExistingPoint(
                            duplicate.existingId, 
                            file, 
                            { preserveFields: options.preserveFields }
                        );
                        
                    case 'merge':
                        console.log(`🔀 Mesclando com arquivo existente: ${file.fileName}`);
                        return await this.mergeWithExisting(
                            duplicate.existingPoint, 
                            file, 
                            options
                        );
                        
                    default:
                        // Perguntar ao usuário (implementar UI depois)
                        console.warn(`Duplicata encontrada para ${file.fileName}`);
                        return { 
                            success: false, 
                            reason: 'duplicate', 
                            requiresUserAction: true 
                        };
                }
            }
            
            // Não é duplicata - inserir novo
            return await this.insertNewPoint(file, options);
            
        } catch (error) {
            console.error('Erro em insertOrUpdate:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Insere novo ponto no Qdrant
     */
    async insertNewPoint(file, options = {}) {
        try {
            const uniqueId = this.generateUniqueId(file);
            
            // Pegar o conteúdo para hash - usar contentHash se já vier pronto
            const textForHash = file.contentHash || file.content || file.chunkText || file.preview || '';
            
            // Se já tem um hash válido, usar ele
            const contentHash = file.contentHash && !textForHash.includes('demo-') 
                ? file.contentHash 
                : this.generateHash(textForHash);
            
            // Preparar payload completo
            const payload = {
                ...file,
                id: uniqueId,
                contentHash: contentHash,
                filePath: file.filePath || file.path || file.fileName || file.name || '',
                fileName: file.fileName || file.name || '',
                content: file.content || file.chunkText || file.preview || '',
                size: file.size || (file.content ? file.content.length : 0) || (file.chunkText ? file.chunkText.length : 0) || 0,
                insertedAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                enrichmentLevel: 0, // Começa sem enriquecimento
                version: 1
            };
            
            
            // Gerar embedding se necessário
            let vector = file.vector;
            if (!vector && this.embeddingService && this.embeddingService.initialized) {
                const text = file.content || file.chunkText || file.preview || '';
                try {
                    vector = await this.embeddingService.generateEmbedding(text);
                } catch (error) {
                    console.warn('Não foi possível gerar embedding, usando vetor aleatório para teste');
                    // Vetor aleatório para teste quando Ollama não está disponível
                    vector = Array(768).fill(0).map(() => Math.random());
                }
            } else if (!vector) {
                // Se não há embedding service, criar vetor de teste
                console.warn('EmbeddingService não disponível, usando vetor aleatório para teste');
                vector = Array(768).fill(0).map(() => Math.random());
            }
            
            // Inserir no Qdrant
            const result = await this.qdrantService.insertPoint({
                id: uniqueId,
                vector: vector,
                payload: payload
            });
            
            if (result) {
                this.stats.totalPoints++;
                console.log(`✅ Novo ponto inserido: ${uniqueId}`);
                return { success: true, id: uniqueId, action: 'inserted' };
            }
            
            return { success: false, reason: 'insert_failed' };
            
        } catch (error) {
            console.error('Erro ao inserir novo ponto:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Atualiza ponto existente
     */
    async updateExistingPoint(pointId, newData, options = {}) {
        try {
            // Buscar ponto atual
            const existingPoint = await this.qdrantService.getPoint(pointId);
            if (!existingPoint) {
                throw new Error(`Ponto ${pointId} não encontrado`);
            }
            
            // Verificar se o ponto tem payload
            const currentPayload = existingPoint.payload || {};
            
            // Se temos campos para preservar, aplicar lógica especial
            let updatedPayload;
            if (options.preserveFields && Array.isArray(options.preserveFields)) {
                console.log(`Preservando campos: ${options.preserveFields.join(', ')}`);
                
                // Começar com os novos dados
                updatedPayload = { ...newData };
                
                // Preservar campos específicos do payload existente
                for (const field of options.preserveFields) {
                    if (currentPayload[field] !== undefined) {
                        updatedPayload[field] = currentPayload[field];
                        console.log(`Campo preservado: ${field} = ${JSON.stringify(currentPayload[field])}`);
                    }
                }
                
                // Adicionar metadados de atualização
                updatedPayload.lastModified = new Date().toISOString();
                updatedPayload.version = (currentPayload.version || 0) + 1;
                updatedPayload.preservedFields = options.preserveFields;
            } else {
                // Comportamento padrão: sobrescrever com novos dados
                updatedPayload = {
                    ...currentPayload,
                    ...newData,
                    lastModified: new Date().toISOString(),
                    version: (currentPayload.version || 0) + 1
                };
            }
            
            // Atualizar no Qdrant
            const result = await this.qdrantService.updatePayload(
                pointId,
                updatedPayload
            );
            
            if (result) {
                this.stats.duplicatesUpdated++;
                console.log(`Ponto atualizado: ${pointId}`);
                return { success: true, id: pointId, action: 'updated' };
            }
            
            return { success: false, reason: 'update_failed' };
            
        } catch (error) {
            console.error('Erro ao atualizar ponto:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Mescla dados com ponto existente
     */
    async mergeWithExisting(existingPoint, newData, options = {}) {
        try {
            // CAMPOS QUE NUNCA DEVEM VIR DO DISCOVERY - São gerenciados apenas pelo Qdrant
            const qdrantOnlyFields = [
                'id', 'version', 'contentHash', 'insertedAt',
                'enrichmentLevel', 'lastEnriched', 'mergeCount',
                'lastMerged', 'keywords', 'sentiment',
                'decisiveMoment', 'breakthrough', 'confidenceScore',
                'expertiseLevel', 'questionTypes'
            ];
            
            const mergedPayload = {};
            
            // 1. COMEÇAR COM TODOS OS DADOS DO QDRANT
            Object.assign(mergedPayload, existingPoint.payload);
            
            // 2. ATUALIZAR APENAS CAMPOS PERMITIDOS DO DISCOVERY
            for (const [key, value] of Object.entries(newData)) {
                // Skip campos que são gerenciados apenas pelo Qdrant
                if (qdrantOnlyFields.includes(key)) {
                    console.log(`Campo '${key}' é gerenciado pelo Qdrant, preservando valor original`);
                    continue;
                }
                
                // Aplicar lógica de merge para campos permitidos
                const existingValue = existingPoint.payload[key];
                
                if (existingValue === null || existingValue === undefined || existingValue === '') {
                    // Campo vazio no Qdrant - usar novo valor
                    mergedPayload[key] = value;
                } else if (Array.isArray(existingValue) && Array.isArray(value)) {
                    // Mesclar arrays removendo duplicatas (ex: categories)
                    mergedPayload[key] = [...new Set([...existingValue, ...value])];
                    console.log(`Array '${key}' mesclado: ${mergedPayload[key].length} itens únicos`);
                } else if (value !== undefined && value !== null && value !== '') {
                    // Atualizar com novo valor se não vazio
                    mergedPayload[key] = value;
                }
            }
            
            // 3. ATUALIZAR METADADOS DE CONTROLE (sempre do Qdrant)
            mergedPayload.version = (mergedPayload.version || 0) + 1;
            mergedPayload.lastModified = new Date().toISOString();
            mergedPayload.lastMerged = new Date().toISOString();
            mergedPayload.mergeCount = (mergedPayload.mergeCount || 0) + 1;
            
            console.log(`Merge concluído - Versão ${mergedPayload.version}, ${Object.keys(newData).length} campos processados`);
            
            // 4. EXECUTAR UPDATE
            return await this.updateExistingPoint(
                existingPoint.id,
                mergedPayload,
                options
            );
            
        } catch (error) {
            console.error('Erro ao mesclar dados:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Enriquece ponto existente com campos vazios
     */
    async enrichExistingPoint(pointId, enrichmentData = null) {
        try {
            // Buscar ponto atual
            const point = await this.qdrantService.getPoint(pointId);
            if (!point) {
                throw new Error(`Ponto ${pointId} não encontrado`);
            }
            
            // Garantir que payload existe
            if (!point.payload) {
                console.log(`Ponto ${pointId} não tem payload, criando estrutura básica`);
                point.payload = {};
            }
            
            // Identificar campos vazios
            const emptyFields = this.identifyEmptyFields(point.payload);
            console.log(`Campos vazios em ${pointId}:`, emptyFields);
            
            // Se não foi fornecido enrichmentData, gerar automaticamente
            if (!enrichmentData) {
                enrichmentData = await this.generateEnrichment(point, emptyFields);
            }
            
            // Aplicar enriquecimento apenas em campos vazios
            const enrichedPayload = { ...point.payload };
            for (const field of emptyFields) {
                if (enrichmentData[field] !== undefined) {
                    enrichedPayload[field] = enrichmentData[field];
                }
            }
            
            // Atualizar metadados de enriquecimento
            enrichedPayload.enrichmentLevel = this.calculateEnrichmentLevel(enrichedPayload);
            enrichedPayload.lastEnriched = new Date().toISOString();
            
            // Atualizar no Qdrant
            const result = await this.qdrantService.updatePayload(
                pointId,
                enrichedPayload
            );
            
            if (result) {
                this.stats.pointsEnriched++;
                console.log(`✅ Ponto enriquecido: ${pointId} (nível: ${enrichedPayload.enrichmentLevel}%)`);
                return { 
                    success: true, 
                    id: pointId, 
                    enrichmentLevel: enrichedPayload.enrichmentLevel 
                };
            }
            
            return { success: false, reason: 'enrichment_failed' };
            
        } catch (error) {
            console.error('Erro ao enriquecer ponto:', error);
            this.stats.enrichmentErrors++;
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Identifica campos vazios em um payload
     */
    identifyEmptyFields(payload) {
        const emptyFields = [];
        
        for (const field of this.config.enrichmentFields) {
            const value = payload[field];
            
            if (value === null || value === undefined || value === '' ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'object' && Object.keys(value).length === 0)) {
                emptyFields.push(field);
            }
        }
        
        return emptyFields;
    }
    
    /**
     * Gera dados de enriquecimento automaticamente
     */
    async generateEnrichment(point, emptyFields) {
        const enrichment = {};
        const text = point.payload.chunkText || point.payload.content || point.payload.preview || '';
        
        // Enriquecimento básico (sem IA por enquanto)
        if (emptyFields.includes('keywords')) {
            enrichment.keywords = this.extractKeywords(text);
        }
        
        if (emptyFields.includes('sentiment')) {
            enrichment.sentiment = this.detectSentiment(text);
        }
        
        if (emptyFields.includes('decisiveMoment')) {
            enrichment.decisiveMoment = this.detectDecisiveMoment(text);
        }
        
        if (emptyFields.includes('breakthrough')) {
            enrichment.breakthrough = this.detectBreakthrough(text);
        }
        
        if (emptyFields.includes('confidenceScore')) {
            enrichment.confidenceScore = this.calculateConfidence(point.payload);
        }
        
        if (emptyFields.includes('expertiseLevel')) {
            enrichment.expertiseLevel = this.detectExpertiseLevel(text);
        }
        
        if (emptyFields.includes('questionTypes')) {
            enrichment.questionTypes = this.extractQuestionTypes(text);
        }
        
        // Metadados de qualidade
        if (emptyFields.includes('hasPreview')) {
            enrichment.hasPreview = !!point.payload.preview;
        }
        
        if (emptyFields.includes('hasAIAnalysis')) {
            enrichment.hasAIAnalysis = !!point.payload.analysisType;
        }
        
        if (emptyFields.includes('hasCategorization')) {
            enrichment.hasCategorization = !!(point.payload.categories && point.payload.categories.length > 0);
        }
        
        if (emptyFields.includes('isValidated')) {
            enrichment.isValidated = point.payload.approved || false;
        }
        
        return enrichment;
    }
    
    /**
     * Extrai palavras-chave do texto
     */
    extractKeywords(text) {
        // Implementação básica - pode ser melhorada com NLP
        const words = text.toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 4);
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
    
    /**
     * Detecta sentimento do texto
     */
    detectSentiment(text) {
        // Implementação básica
        const positiveWords = ['sucesso', 'excelente', 'ótimo', 'bom', 'melhor', 'positivo'];
        const negativeWords = ['problema', 'erro', 'falha', 'ruim', 'pior', 'negativo'];
        
        const textLower = text.toLowerCase();
        let score = 0;
        
        positiveWords.forEach(word => {
            if (textLower.includes(word)) score++;
        });
        
        negativeWords.forEach(word => {
            if (textLower.includes(word)) score--;
        });
        
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }
    
    /**
     * Detecta momento decisivo
     */
    detectDecisiveMoment(text) {
        const decisiveTerms = [
            'decisão', 'decidir', 'escolha', 'crucial', 'crítico',
            'turning point', 'mudança', 'transformação', 'pivô'
        ];
        
        const textLower = text.toLowerCase();
        return decisiveTerms.some(term => textLower.includes(term));
    }
    
    /**
     * Detecta breakthrough
     */
    detectBreakthrough(text) {
        const breakthroughTerms = [
            'descoberta', 'inovação', 'breakthrough', 'solução',
            'eureka', 'insight', 'revelação', 'avanço'
        ];
        
        const textLower = text.toLowerCase();
        return breakthroughTerms.some(term => textLower.includes(term));
    }
    
    /**
     * Calcula score de confiança
     */
    calculateConfidence(payload) {
        let score = 0;
        let factors = 0;
        
        // Fatores que aumentam confiança
        if (payload.analyzed) { score += 20; factors++; }
        if (payload.approved) { score += 20; factors++; }
        if (payload.categories && payload.categories.length > 0) { score += 15; factors++; }
        if (payload.relevanceScore > 70) { score += 15; factors++; }
        if (payload.preview) { score += 10; factors++; }
        if (payload.analysisType) { score += 20; factors++; }
        
        return factors > 0 ? Math.round(score) : 0;
    }
    
    /**
     * Detecta nível de expertise
     */
    detectExpertiseLevel(text) {
        const expertTerms = ['avançado', 'expert', 'especialista', 'profundo', 'complexo'];
        const intermediateTerms = ['intermediário', 'moderado', 'regular'];
        const beginnerTerms = ['básico', 'iniciante', 'introdução', 'simples'];
        
        const textLower = text.toLowerCase();
        
        if (expertTerms.some(term => textLower.includes(term))) return 'expert';
        if (beginnerTerms.some(term => textLower.includes(term))) return 'beginner';
        if (intermediateTerms.some(term => textLower.includes(term))) return 'intermediate';
        
        return 'general';
    }
    
    /**
     * Extrai tipos de perguntas
     */
    extractQuestionTypes(text) {
        const types = [];
        
        if (text.includes('?')) types.push('interrogative');
        if (/como|how/i.test(text)) types.push('how-to');
        if (/por que|why/i.test(text)) types.push('why');
        if (/o que|what/i.test(text)) types.push('what');
        if (/quando|when/i.test(text)) types.push('when');
        if (/onde|where/i.test(text)) types.push('where');
        
        return types;
    }
    
    /**
     * Calcula nível de enriquecimento
     */
    calculateEnrichmentLevel(payload) {
        const totalFields = this.config.enrichmentFields.length;
        let filledFields = 0;
        
        for (const field of this.config.enrichmentFields) {
            const value = payload[field];
            if (value !== null && value !== undefined && value !== '' &&
                !(Array.isArray(value) && value.length === 0)) {
                filledFields++;
            }
        }
        
        return Math.round((filledFields / totalFields) * 100);
    }
    
    /**
     * Lista todos os pontos do Qdrant
     */
    async listAll(options = {}) {
        try {
            const limit = options.limit || 100;
            const offset = options.offset || 0;
            
            const result = await this.qdrantService.scrollPoints({
                limit: limit,
                offset: offset,
                withPayload: true,
                withVector: false
            });
            
            // Processar e adicionar metadados
            const points = result.points || [];
            return points.map(point => ({
                id: point.id,
                fileName: point.payload.fileName,
                filePath: point.payload.filePath,
                categories: point.payload.categories || [],
                enrichmentLevel: this.calculateEnrichmentLevel(point.payload),
                analyzed: point.payload.analyzed || false,
                approved: point.payload.approved || false,
                lastModified: point.payload.lastModified || point.payload.timestamp
            }));
            
        } catch (error) {
            console.error('Erro ao listar pontos:', error);
            return [];
        }
    }
    
    /**
     * Sincroniza interface com dados do Qdrant
     */
    async syncInterface() {
        try {
            console.log('🔄 Sincronizando interface com Qdrant...');
            
            // Buscar todos os pontos
            const points = await this.listAll({ limit: 1000 });
            
            // Emitir evento para atualizar interface
            if (window.KC?.EventBus) {
                window.KC.EventBus.emit('QDRANT_SYNC', {
                    points: points,
                    stats: await this.getEnrichmentStats()
                });
            }
            
            console.log(`✅ ${points.length} pontos sincronizados`);
            return points;
            
        } catch (error) {
            console.error('Erro ao sincronizar interface:', error);
            return [];
        }
    }
    
    /**
     * Obtém estatísticas de enriquecimento
     */
    async getEnrichmentStats() {
        try {
            const points = await this.listAll({ limit: 10000 });
            
            const stats = {
                total: points.length,
                fullyEnriched: 0,
                partiallyEnriched: 0,
                notEnriched: 0,
                analyzed: 0,
                approved: 0,
                categorized: 0,
                averageEnrichmentLevel: 0
            };
            
            let totalEnrichmentLevel = 0;
            
            points.forEach(point => {
                const level = point.enrichmentLevel || 0;
                totalEnrichmentLevel += level;
                
                if (level >= 90) stats.fullyEnriched++;
                else if (level > 0) stats.partiallyEnriched++;
                else stats.notEnriched++;
                
                if (point.analyzed) stats.analyzed++;
                if (point.approved) stats.approved++;
                if (point.categories && point.categories.length > 0) stats.categorized++;
            });
            
            stats.averageEnrichmentLevel = points.length > 0 
                ? Math.round(totalEnrichmentLevel / points.length) 
                : 0;
            
            // Adicionar estatísticas do manager
            stats.duplicatesFound = this.stats.duplicatesFound;
            stats.duplicatesSkipped = this.stats.duplicatesSkipped;
            stats.duplicatesUpdated = this.stats.duplicatesUpdated;
            stats.pointsEnriched = this.stats.pointsEnriched;
            
            return stats;
            
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return null;
        }
    }
    
    /**
     * Enriquece todos os pontos em batch
     */
    async enrichAllPoints(options = {}) {
        try {
            console.log('🚀 Iniciando enriquecimento em massa...');
            
            const points = await this.listAll({ limit: 10000 });
            const needsEnrichment = points.filter(p => p.enrichmentLevel < 90);
            
            console.log(`📊 ${needsEnrichment.length} pontos precisam de enriquecimento`);
            
            let enriched = 0;
            let errors = 0;
            
            // Processar em batches
            const batchSize = options.batchSize || this.config.batchSize;
            for (let i = 0; i < needsEnrichment.length; i += batchSize) {
                const batch = needsEnrichment.slice(i, i + batchSize);
                
                console.log(`📦 Processando batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(needsEnrichment.length/batchSize)}`);
                
                // Processar batch em paralelo
                const promises = batch.map(point => 
                    this.enrichExistingPoint(point.id)
                        .then(result => {
                            if (result.success) enriched++;
                            else errors++;
                            return result;
                        })
                        .catch(err => {
                            errors++;
                            return { success: false, error: err.message };
                        })
                );
                
                await Promise.all(promises);
                
                // Emitir progresso
                if (window.KC?.EventBus) {
                    window.KC.EventBus.emit('ENRICHMENT_PROGRESS', {
                        total: needsEnrichment.length,
                        processed: i + batch.length,
                        enriched: enriched,
                        errors: errors
                    });
                }
                
                // Delay entre batches para não sobrecarregar
                if (i + batchSize < needsEnrichment.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            console.log(`✅ Enriquecimento concluído: ${enriched} sucesso, ${errors} erros`);
            
            return {
                total: needsEnrichment.length,
                enriched: enriched,
                errors: errors,
                stats: await this.getEnrichmentStats()
            };
            
        } catch (error) {
            console.error('Erro no enriquecimento em massa:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Atualiza estatísticas internas
     */
    async updateStats() {
        try {
            const collectionInfo = await this.qdrantService.getCollectionInfo();
            if (collectionInfo) {
                this.stats.totalPoints = collectionInfo.vectors_count || 0;
            }
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    }
    
    /**
     * Limpa cache local
     */
    clearCache() {
        this.fileHashCache.clear();
        this.enrichmentQueue = [];
        console.log('✅ Cache limpo');
    }
}

// Registrar no namespace global
if (typeof window.KC === 'undefined') {
    window.KC = {};
}

window.KC.QdrantManager = new QdrantManager();

console.log('✅ QdrantManager.js carregado');