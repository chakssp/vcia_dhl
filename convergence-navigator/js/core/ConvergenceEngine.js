/**
 * 🧭 ConvergenceEngine - Motor Principal de Navegação por Convergência
 * 
 * Transforma intenções em caminhos navegáveis através de convergências multi-dimensionais
 */
class ConvergenceEngine {
    constructor() {
        this.dimensions = new Map();
        this.intersections = [];
        this.convergences = [];
        this.threshold = 0.3; // Densidade mínima para convergência válida (reduzido para ser menos restritivo)
        this.maxConvergences = 10;
        this.cache = new Map();
        
        // Componentes auxiliares
        this.decomposer = null;
        this.calculator = null;
        this.pathGenerator = null;
        this.qdrantConnector = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 ConvergenceEngine: Inicializando...');
        
        // Inicializar componentes (serão carregados dinamicamente)
        if (typeof DimensionDecomposer !== 'undefined') {
            this.decomposer = new DimensionDecomposer();
        }
        if (typeof IntersectionCalculator !== 'undefined') {
            this.calculator = new IntersectionCalculator();
        }
        if (typeof NavigationPath !== 'undefined') {
            this.pathGenerator = new NavigationPath();
        }
        if (typeof QdrantConnector !== 'undefined') {
            this.qdrantConnector = new QdrantConnector();
        }
        
        console.log('✅ ConvergenceEngine: Pronto para navegação!');
    }
    
    /**
     * Método principal - Navega através de convergências baseado em intenção
     */
    async navigate(intention) {
        console.log('🧭 Navegando intenção:', intention);
        
        // Verificar cache
        const cacheKey = this.getCacheKey(intention);
        if (this.cache.has(cacheKey)) {
            console.log('📦 Usando resultado do cache');
            return this.cache.get(cacheKey);
        }
        
        try {
            // 1. Decompor intenção em dimensões
            const decomposed = await this.decompose(intention);
            
            // 2. Buscar dados relevantes
            const vectorData = await this.fetchVectorData(decomposed);
            
            // 3. Calcular interseções multi-dimensionais
            const intersections = await this.calculateIntersections(decomposed, vectorData);
            
            // 4. Identificar convergências (densidade > threshold)
            const convergences = this.identifyConvergences(intersections);
            
            // 5. Gerar caminhos navegáveis
            const paths = await this.generatePaths(convergences);
            
            // 6. Preparar resultado de navegação
            const result = {
                success: true,
                intention: intention,
                decomposition: decomposed,
                primaryPath: paths[0] || null,
                alternativePaths: paths.slice(1, 3),
                evidencePool: convergences[0]?.files || [],
                confidence: convergences[0]?.density || 0,
                convergenceCount: convergences.length,
                reductionRate: this.calculateReductionRate(vectorData.total, convergences[0]?.files.length || 0),
                timestamp: new Date().toISOString()
            };
            
            // Cachear resultado
            this.cache.set(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Erro na navegação:', error);
            return {
                success: false,
                error: error.message,
                intention: intention
            };
        }
    }
    
    /**
     * Decompõe intenção em múltiplas dimensões
     */
    async decompose(intention) {
        if (!this.decomposer) {
            // Fallback básico se o decomposer não estiver disponível
            return this.basicDecomposition(intention);
        }
        
        return await this.decomposer.decompose(intention);
    }
    
    /**
     * Decomposição básica (fallback)
     */
    basicDecomposition(intention) {
        const words = intention.toLowerCase().split(/\s+/);
        
        // Extrair temporal
        const temporalPatterns = {
            'últimos': /últimos?\s+(\d+)\s+(dias?|meses?|anos?)/i,
            'recente': /recente|recentemente/i,
            'hoje': /hoje/i,
            'ontem': /ontem/i,
            'semana': /semana/i,
            'mês': /mês|mes/i,
            'ano': /ano/i,
            '2024': /202[0-9]/i,
            '2023': /202[0-9]/i
        };
        
        let temporal = null;
        for (const [key, pattern] of Object.entries(temporalPatterns)) {
            if (pattern.test(intention)) {
                temporal = key;
                break;
            }
        }
        
        // Extrair keywords semânticas
        const stopWords = ['o', 'a', 'de', 'em', 'para', 'com', 'por', 'que', 'e', 'ou', 'do', 'da', 'no', 'na'];
        const semantic = words.filter(w => 
            w.length > 3 && 
            !stopWords.includes(w) &&
            !temporalPatterns[w]
        );
        
        // Inferir categorias
        const categoryMap = {
            'ia': ['técnico', 'inteligência artificial', 'machine learning'],
            'inteligência': ['técnico', 'inteligência artificial'],
            'artificial': ['técnico', 'inteligência artificial'],
            'código': ['técnico', 'desenvolvimento'],
            'arquitetura': ['técnico', 'arquitetura'],
            'design': ['design', 'ux'],
            'estratégia': ['estratégico', 'planejamento'],
            'decisão': ['estratégico', 'decisão'],
            'breakthrough': ['técnico', 'breakthrough'],
            'descoberta': ['pesquisa', 'descoberta'],
            'evolução': ['evolução', 'progresso'],
            'aprendizado': ['aprendizado', 'conhecimento']
        };
        
        const categorical = [];
        for (const word of words) {
            if (categoryMap[word]) {
                categorical.push(...categoryMap[word]);
            }
        }
        
        // Identificar tipo de análise
        let analytical = 'Análise Geral';
        if (intention.includes('breakthrough') || intention.includes('descoberta')) {
            analytical = 'Breakthrough Técnico';
        } else if (intention.includes('evolução') || intention.includes('progresso')) {
            analytical = 'Evolução Conceitual';
        } else if (intention.includes('decisão') || intention.includes('estratég')) {
            analytical = 'Decisão Estratégica';
        }
        
        return {
            temporal: temporal,
            semantic: [...new Set(semantic)],
            categorical: [...new Set(categorical)],
            analytical: analytical,
            original: intention
        };
    }
    
    /**
     * Busca dados vetoriais relevantes
     */
    async fetchVectorData(decomposed) {
        console.log('🔍 Buscando dados para decomposição:', decomposed);
        
        // Primeiro tentar carregar dados locais (para contornar CORS)
        try {
            const localResponse = await fetch('./sample-data.json');
            if (localResponse.ok) {
                const data = await localResponse.json();
                const points = data.result?.points || [];
                console.log(`📦 ${points.length} pontos carregados de sample-data.json`);
                
                // Processar pontos
                const chunks = points.map(p => ({
                    id: p.id,
                    fileName: p.payload?.fileName || p.payload?.metadata?.fileName || '',
                    content: p.payload?.content || p.payload?.chunkText || '',
                    keywords: p.payload?.metadata?.keywords || [],
                    categories: p.payload?.metadata?.categories || [],
                    analysisType: p.payload?.analysisType || p.payload?.intelligenceType || '',
                    lastModified: p.payload?.lastModified || p.payload?.metadata?.lastModified || '',
                    relevanceScore: p.payload?.relevanceScore || p.payload?.metadata?.relevanceScore || 0,
                    convergenceScore: p.payload?.convergenceScore || p.payload?.intelligenceScore || 0,
                    chunkIndex: p.payload?.chunkIndex || p.payload?.metadata?.chunkIndex || 0
                }));
                
                // Log de debug
                const uniqueAnalysisTypes = [...new Set(chunks.map(c => c.analysisType).filter(a => a))];
                console.log('📊 Tipos de análise únicos:', uniqueAnalysisTypes);
                
                const uniqueCategories = [...new Set(chunks.flatMap(c => c.categories))];
                console.log('📂 Categorias únicas:', uniqueCategories.slice(0, 10));
                
                return {
                    total: chunks.length,
                    chunks: chunks
                };
            }
        } catch (localError) {
            console.log('📄 Arquivo local não encontrado, tentando Qdrant...');
        }
        
        // Se não encontrar local, tentar Qdrant direto
        try {
            const response = await fetch('http://qdr.vcia.com.br:6333/collections/knowledge_consolidator/points/scroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 1000,
                    with_payload: true,
                    with_vector: false
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const points = data.result?.points || [];
                console.log(`📦 ${points.length} pontos carregados do Qdrant`);
                
                const chunks = points.map(p => ({
                    id: p.id,
                    fileName: p.payload?.fileName || p.payload?.metadata?.fileName || '',
                    content: p.payload?.content || p.payload?.chunkText || '',
                    keywords: p.payload?.metadata?.keywords || [],
                    categories: p.payload?.metadata?.categories || [],
                    analysisType: p.payload?.analysisType || p.payload?.intelligenceType || '',
                    lastModified: p.payload?.lastModified || p.payload?.metadata?.lastModified || '',
                    relevanceScore: p.payload?.relevanceScore || p.payload?.metadata?.relevanceScore || 0,
                    convergenceScore: p.payload?.convergenceScore || p.payload?.intelligenceScore || 0,
                    chunkIndex: p.payload?.chunkIndex || p.payload?.metadata?.chunkIndex || 0
                }));
                
                return {
                    total: chunks.length,
                    chunks: chunks
                };
            }
        } catch (error) {
            console.error('❌ Erro ao buscar dados do Qdrant:', error);
        }
        
        // Se falhar, tentar com o connector se disponível
        if (this.qdrantConnector && this.qdrantConnector.connected) {
            console.log('🔌 Tentando com QdrantConnector...');
            return await this.qdrantConnector.searchByDimensions(decomposed);
        }
        
        // Se tudo falhar, retornar dados mock
        console.warn('⚠️ Usando dados mock (Qdrant não disponível)');
        return this.getMockVectorData(decomposed);
    }
    
    /**
     * Dados mock para teste (quando Qdrant não está disponível)
     */
    getMockVectorData(decomposed) {
        console.warn('⚠️ Usando dados mock (Qdrant não disponível)');
        
        return {
            total: 1000,
            chunks: [
                {
                    id: 'chunk-1',
                    fileName: 'breakthrough-ai-2024.md',
                    content: 'Descoberta importante sobre embeddings...',
                    keywords: decomposed.semantic,
                    categories: decomposed.categorical,
                    analysisType: decomposed.analytical,
                    lastModified: '2024-08-01',
                    relevanceScore: 0.95
                },
                {
                    id: 'chunk-2',
                    fileName: 'evolucao-conhecimento.md',
                    content: 'Evolução do entendimento sobre IA...',
                    keywords: ['evolução', 'ia', 'conhecimento'],
                    categories: ['técnico', 'aprendizado'],
                    analysisType: 'Evolução Conceitual',
                    lastModified: '2024-07-15',
                    relevanceScore: 0.82
                }
            ]
        };
    }
    
    /**
     * Calcula interseções multi-dimensionais
     */
    async calculateIntersections(decomposed, vectorData) {
        if (!this.calculator) {
            // Cálculo básico se o calculator não estiver disponível
            return this.basicIntersectionCalculation(decomposed, vectorData);
        }
        
        return await this.calculator.calculate(decomposed, vectorData);
    }
    
    /**
     * Cálculo básico de interseções (fallback)
     */
    basicIntersectionCalculation(decomposed, vectorData) {
        const intersections = [];
        const chunks = vectorData.chunks || [];
        
        // Para cada chunk, calcular quantas dimensões ele intersecta
        for (const chunk of chunks) {
            let matchedDimensions = 0;
            let dimensionDetails = [];
            
            // Verificar temporal
            if (decomposed.temporal && this.matchesTemporal(chunk.lastModified, decomposed.temporal)) {
                matchedDimensions++;
                dimensionDetails.push('temporal');
            }
            
            // Verificar semântica
            const semanticMatch = this.calculateSemanticMatch(chunk.keywords, decomposed.semantic);
            if (semanticMatch > 0) {
                matchedDimensions += semanticMatch;
                dimensionDetails.push('semantic');
            }
            
            // Verificar categorial
            const categoricalMatch = this.calculateCategoricalMatch(chunk.categories, decomposed.categorical);
            if (categoricalMatch > 0) {
                matchedDimensions += categoricalMatch;
                dimensionDetails.push('categorical');
            }
            
            // Verificar analítica (mais flexível)
            if (decomposed.analytical && chunk.analysisType) {
                // Comparação mais flexível, ignorando case e acentos
                const normalizedChunk = chunk.analysisType.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const normalizedDecomposed = decomposed.analytical.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                if (normalizedChunk.includes(normalizedDecomposed) || 
                    normalizedDecomposed.includes(normalizedChunk) ||
                    (normalizedChunk.includes('breakthrough') && normalizedDecomposed.includes('breakthrough')) ||
                    (normalizedChunk.includes('tecnico') && normalizedDecomposed.includes('tecnico'))) {
                    matchedDimensions++;
                    dimensionDetails.push('analytical');
                }
            }
            
            if (matchedDimensions > 0) {
                intersections.push({
                    chunk: chunk,
                    dimensions: dimensionDetails,
                    matchScore: matchedDimensions / 4, // Normalizar para 0-1
                    density: 0 // Será calculado depois
                });
            }
        }
        
        // Calcular densidade para cada interseção
        for (const intersection of intersections) {
            intersection.density = this.calculateDensity(intersection, intersections.length, vectorData.total);
        }
        
        // Ordenar por densidade
        return intersections.sort((a, b) => b.density - a.density);
    }
    
    /**
     * Verifica match temporal
     */
    matchesTemporal(date, temporal) {
        if (!date || !temporal) return false;
        
        const chunkDate = new Date(date);
        const now = new Date();
        const daysDiff = (now - chunkDate) / (1000 * 60 * 60 * 24);
        
        switch(temporal) {
            case 'hoje': return daysDiff < 1;
            case 'ontem': return daysDiff < 2;
            case 'semana': return daysDiff < 7;
            case 'mês': return daysDiff < 30;
            case 'últimos': return daysDiff < 90; // Default 3 meses
            case 'recente': return daysDiff < 30;
            case 'ano': return daysDiff < 365;
            default: return false;
        }
    }
    
    /**
     * Calcula match semântico
     */
    calculateSemanticMatch(chunkKeywords, intentionKeywords) {
        if (!chunkKeywords || !intentionKeywords) return 0;
        
        const matches = chunkKeywords.filter(k => 
            intentionKeywords.some(ik => 
                k.toLowerCase().includes(ik.toLowerCase()) ||
                ik.toLowerCase().includes(k.toLowerCase())
            )
        );
        
        return matches.length / Math.max(intentionKeywords.length, 1);
    }
    
    /**
     * Calcula match categorial
     */
    calculateCategoricalMatch(chunkCategories, intentionCategories) {
        if (!chunkCategories || !intentionCategories) return 0;
        
        const matches = chunkCategories.filter(c => 
            intentionCategories.some(ic => 
                c.toLowerCase() === ic.toLowerCase()
            )
        );
        
        return matches.length / Math.max(intentionCategories.length, 1);
    }
    
    /**
     * Calcula densidade de convergência
     */
    calculateDensity(intersection, totalIntersections, totalChunks) {
        const dimensionWeight = intersection.dimensions.length / 4;
        const matchWeight = intersection.matchScore;
        const scarcityWeight = 1 - (totalIntersections / totalChunks);
        
        // Fórmula: média ponderada dos pesos
        return (dimensionWeight * 0.4) + (matchWeight * 0.4) + (scarcityWeight * 0.2);
    }
    
    /**
     * Identifica convergências válidas (densidade > threshold)
     */
    identifyConvergences(intersections) {
        const convergences = [];
        const fileGroups = new Map();
        
        // Agrupar por arquivo
        for (const intersection of intersections) {
            const fileName = intersection.chunk.fileName;
            if (!fileGroups.has(fileName)) {
                fileGroups.set(fileName, []);
            }
            fileGroups.get(fileName).push(intersection);
        }
        
        // Criar convergências por arquivo
        for (const [fileName, fileIntersections] of fileGroups.entries()) {
            const avgDensity = fileIntersections.reduce((sum, i) => sum + i.density, 0) / fileIntersections.length;
            
            if (avgDensity > this.threshold) {
                convergences.push({
                    fileName: fileName,
                    density: avgDensity,
                    intersections: fileIntersections,
                    dimensions: [...new Set(fileIntersections.flatMap(i => i.dimensions))],
                    files: [fileName], // Para compatibilidade
                    chunkCount: fileIntersections.length
                });
            }
        }
        
        // Ordenar por densidade e limitar
        return convergences
            .sort((a, b) => b.density - a.density)
            .slice(0, this.maxConvergences);
    }
    
    /**
     * Gera caminhos navegáveis a partir das convergências
     */
    async generatePaths(convergences) {
        if (!this.pathGenerator) {
            // Geração básica de caminhos
            return this.basicPathGeneration(convergences);
        }
        
        return await this.pathGenerator.generate(convergences);
    }
    
    /**
     * Geração básica de caminhos (fallback)
     */
    basicPathGeneration(convergences) {
        return convergences.map((conv, index) => ({
            id: `path-${index}`,
            description: this.generatePathDescription(conv),
            density: conv.density,
            confidence: conv.density,
            dimensions: conv.dimensions,
            evidenceCount: conv.files.length,
            files: conv.files,
            type: index === 0 ? 'primary' : 'alternative'
        }));
    }
    
    /**
     * Gera descrição textual do caminho
     */
    generatePathDescription(convergence) {
        const dims = convergence.dimensions;
        let desc = 'Convergência';
        
        if (dims.includes('temporal')) desc += ' temporal';
        if (dims.includes('semantic')) desc += ' semântica';
        if (dims.includes('categorical')) desc += ' categorial';
        if (dims.includes('analytical')) desc += ' analítica';
        
        desc += ` com densidade ${(convergence.density * 100).toFixed(0)}%`;
        desc += ` em ${convergence.files.length} arquivo(s)`;
        
        return desc;
    }
    
    /**
     * Calcula taxa de redução de complexidade
     */
    calculateReductionRate(total, convergenceSize) {
        if (total === 0) return 0;
        return ((total - convergenceSize) / total * 100).toFixed(1);
    }
    
    /**
     * Gera chave de cache para a intenção
     */
    getCacheKey(intention) {
        return `nav_${intention.toLowerCase().replace(/\s+/g, '_')}`;
    }
    
    /**
     * Limpa o cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache de navegação limpo');
    }
    
    /**
     * Atualiza threshold de convergência
     */
    setThreshold(value) {
        if (value >= 0 && value <= 1) {
            this.threshold = value;
            this.clearCache(); // Limpar cache ao mudar threshold
            console.log(`📊 Threshold atualizado para ${value}`);
        }
    }
}

// Exportar para uso global
window.ConvergenceEngine = ConvergenceEngine;