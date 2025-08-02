/**
 * DataTransformerV4 - Transformador de Dados Unificado
 * 
 * Converte dados agregados do DataAggregator para formatos específicos
 * otimizados para cada tipo de visualização (Sankey, TreeMap, Sunburst, Force).
 */

class DataTransformerV4 {
    constructor() {
        this.aggregatedData = null;
        this.hierarchicalData = null;
        this.sankeyData = null;
        this.indices = {
            byType: new Map(),
            byCategory: new Map(),
            byEntity: new Map(),
            byFile: new Map()
        };
    }
    
    /**
     * Transforma dados agregados em estrutura unificada
     * @param {Object} aggregatedData - Dados do DataAggregator
     * @returns {Object} Estrutura de dados unificada
     */
    transform(aggregatedData) {
        console.log('🔄 DataTransformerV4.transform() iniciado', {
            hasData: !!aggregatedData,
            hasFiles: !!(aggregatedData?.files),
            fileCount: aggregatedData?.files?.length || 0
        });
        
        if (!aggregatedData || !aggregatedData.files) {
            console.error('❌ Erro: Dados agregados inválidos', aggregatedData);
            throw new Error('Dados agregados inválidos');
        }
        
        // Garantir que temos as estruturas necessárias
        this.aggregatedData = {
            files: aggregatedData.files || [],
            categories: aggregatedData.categories || [],
            entities: aggregatedData.entities || [],
            selectedFields: aggregatedData.selectedFields || [],
            ...aggregatedData // Preservar quaisquer campos extras
        };
        
        // Garantir que cada arquivo tem as propriedades necessárias
        this.aggregatedData.files = this.aggregatedData.files.map(file => ({
            id: file.id || `file_${Date.now()}_${Math.random()}`,
            name: file.name || 'Unknown',
            analysisType: file.analysisType || 'General',
            relevanceScore: file.relevanceScore || 0,
            chunks: file.chunks || [],
            categories: file.categories || new Set(),
            entities: file.entities || new Set(),
            ...file // Preservar campos extras
        }));
        
        console.log('✅ Dados validados:', {
            files: this.aggregatedData.files.length,
            categories: this.aggregatedData.categories.length,
            entities: this.aggregatedData.entities.length,
            selectedFields: this.aggregatedData.selectedFields.length
        });
        
        const result = {
            hierarchy: null,
            sankey: null,
            treemap: null,
            sunburst: null,
            force: null,
            indices: null,
            metadata: null,
            insights: []
        };
        
        try {
            // 1. Construir hierarquia (base para outros formatos)
            console.log('📊 Construindo hierarquia...');
            this.hierarchicalData = this._buildHierarchy();
            result.hierarchy = this.hierarchicalData;
            console.log('✅ Hierarquia criada com sucesso');
        } catch (error) {
            console.error('❌ Erro ao construir hierarquia:', error);
            console.warn('⚠️ Continuando sem hierarquia');
        }
        
        try {
            // 2. Construir índices para busca rápida
            console.log('🔍 Construindo índices...');
            this._buildIndices();
            result.indices = this.indices;
            console.log('✅ Índices criados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao construir índices:', error);
        }
        
        try {
            // 3. Dados para Sankey
            console.log('📊 Construindo dados Sankey...');
            result.sankey = this._buildSankeyData();
            if (result.sankey) {
                console.log('✅ Sankey criado:', {
                    nodes: result.sankey.nodes?.length || 0,
                    links: result.sankey.links?.length || 0,
                    levels: result.sankey.nodes ? 
                        [...new Set(result.sankey.nodes.map(n => n.level))].length : 0
                });
                
                // Validar que temos pelo menos alguns nós e links
                if (!result.sankey.nodes || result.sankey.nodes.length === 0) {
                    console.warn('⚠️ Sankey sem nós - dados podem estar vazios');
                }
                if (!result.sankey.links || result.sankey.links.length === 0) {
                    console.warn('⚠️ Sankey sem links - estrutura pode estar incorreta');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao criar Sankey:', error);
            console.warn('⚠️ Continuando sem dados Sankey');
        }
        
        try {
            // 4. Dados para TreeMap
            console.log('🔲 Preparando dados TreeMap...');
            result.treemap = this._prepareTreeMapData();
            console.log('✅ TreeMap preparado');
        } catch (error) {
            console.error('❌ Erro ao preparar TreeMap:', error);
            // Se falhar, tentar usar hierarquia diretamente
            if (result.hierarchy) {
                console.log('🔄 Usando hierarquia como fallback para TreeMap');
                result.treemap = result.hierarchy;
            }
        }
        
        try {
            // 5. Dados para Sunburst
            console.log('☀️ Preparando dados Sunburst...');
            result.sunburst = this._prepareSunburstData();
            console.log('✅ Sunburst preparado');
        } catch (error) {
            console.error('❌ Erro ao preparar Sunburst:', error);
            // Sunburst pode usar mesma estrutura da hierarquia
            if (result.hierarchy) {
                console.log('🔄 Usando hierarquia como fallback para Sunburst');
                result.sunburst = result.hierarchy;
            }
        }
        
        try {
            // 6. Dados para Force
            console.log('🔗 Preparando dados Force...');
            result.force = this._prepareForceData();
            console.log('✅ Force preparado');
        } catch (error) {
            console.error('❌ Erro ao preparar Force:', error);
        }
        
        try {
            // 7. Metadata
            console.log('📊 Calculando metadata...');
            result.metadata = this._calculateMetadata();
            console.log('✅ Metadata calculada');
        } catch (error) {
            console.error('❌ Erro ao calcular metadata:', error);
        }
        
        try {
            // 8. Insights
            console.log('💡 Gerando insights...');
            result.insights = this._generateInsights();
            console.log('✅ Insights gerados:', result.insights.length);
        } catch (error) {
            console.error('❌ Erro ao gerar insights:', error);
        }
        
        console.log('✅ Transformação completa', {
            hierarchy: result.hierarchy ? 'OK' : 'Falhou',
            sankey: result.sankey ? 'OK' : 'Falhou',
            treemap: result.treemap ? 'OK' : 'Falhou',
            sunburst: result.sunburst ? 'OK' : 'Falhou',
            force: result.force ? 'OK' : 'Falhou',
            metadata: result.metadata ? 'OK' : 'Falhou',
            insights: result.insights.length
        });
        
        return result;
    }
    
    /**
     * Constrói estrutura hierárquica de 3 níveis
     * @private
     */
    _buildHierarchy() {
        const root = {
            name: "Knowledge Base",
            type: "root",
            children: []
        };
        
        // Agrupar por tipo de análise
        const typeGroups = new Map();
        
        this.aggregatedData.files.forEach(file => {
            const analysisType = file.analysisType || 'General';
            
            if (!typeGroups.has(analysisType)) {
                typeGroups.set(analysisType, {
                    id: `type_${this._sanitizeId(analysisType)}`,
                    name: analysisType,
                    type: "analysisType",
                    children: [],
                    metrics: {
                        fileCount: 0,
                        totalChunks: 0,
                        totalRelevance: 0,
                        entities: new Set(),
                        categories: new Set()
                    }
                });
            }
            
            const typeNode = typeGroups.get(analysisType);
            typeNode.metrics.fileCount++;
            typeNode.metrics.totalChunks += file.chunks.length;
            typeNode.metrics.totalRelevance += file.relevanceScore;
            
            // Adicionar categorias do arquivo
            Array.from(file.categories).forEach(cat => {
                typeNode.metrics.categories.add(cat);
            });
            
            // Adicionar entidades do arquivo
            Array.from(file.entities).forEach(entity => {
                typeNode.metrics.entities.add(entity);
            });
        });
        
        // Construir hierarquia tipo -> categoria -> arquivos
        typeGroups.forEach((typeNode, typeName) => {
            // Calcular média de relevância
            typeNode.metrics.avgRelevance = 
                typeNode.metrics.totalRelevance / typeNode.metrics.fileCount;
            
            // Agrupar arquivos por categoria dentro do tipo
            const categoryGroups = new Map();
            
            this.aggregatedData.files
                .filter(file => file.analysisType === typeName)
                .forEach(file => {
                    Array.from(file.categories).forEach(categoryName => {
                        if (!categoryGroups.has(categoryName)) {
                            categoryGroups.set(categoryName, {
                                id: `cat_${this._sanitizeId(categoryName)}_${typeName}`,
                                name: categoryName,
                                type: "category",
                                parent: typeName,
                                children: [],
                                metrics: {
                                    fileCount: 0,
                                    totalRelevance: 0,
                                    entities: new Set()
                                }
                            });
                        }
                        
                        const catNode = categoryGroups.get(categoryName);
                        catNode.children.push({
                            id: `file_${file.id}`,
                            name: file.name,
                            type: "file",
                            parent: categoryName,
                            metrics: {
                                relevance: file.relevanceScore,
                                chunks: file.chunks.length,
                                entities: Array.from(file.entities),
                                path: file.path,
                                createdAt: file.createdAt
                            }
                        });
                        
                        catNode.metrics.fileCount++;
                        catNode.metrics.totalRelevance += file.relevanceScore;
                        Array.from(file.entities).forEach(e => catNode.metrics.entities.add(e));
                    });
                });
            
            // Calcular métricas das categorias
            categoryGroups.forEach(catNode => {
                catNode.metrics.avgRelevance = 
                    catNode.metrics.totalRelevance / catNode.metrics.fileCount;
                catNode.metrics.entityCount = catNode.metrics.entities.size;
                typeNode.children.push(catNode);
            });
            
            // Converter Sets para counts
            typeNode.metrics.entityCount = typeNode.metrics.entities.size;
            typeNode.metrics.categoryCount = typeNode.metrics.categories.size;
            delete typeNode.metrics.entities;
            delete typeNode.metrics.categories;
            
            root.children.push(typeNode);
        });
        
        return root;
    }
    
    /**
     * Constrói dados para visualização Sankey
     * @private
     */
    _buildSankeyData() {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        
        // NOVA ESTRUTURA: Categoria → Tipo de Análise → Arquivos
        // Isso mostra o volume total por categoria e como se distribui entre tipos
        
        // 1. Criar nós de CATEGORIAS únicas (nível 0)
        const categoryStats = new Map();
        
        // Coletar estatísticas por categoria
        this.aggregatedData.files.forEach(file => {
            Array.from(file.categories).forEach(cat => {
                if (!categoryStats.has(cat)) {
                    categoryStats.set(cat, {
                        name: cat,
                        files: [],
                        types: new Map(),
                        totalRelevance: 0
                    });
                }
                
                const catStat = categoryStats.get(cat);
                catStat.files.push(file);
                catStat.totalRelevance += file.relevanceScore;
                
                // Contar por tipo
                const type = file.analysisType || 'General';
                catStat.types.set(type, (catStat.types.get(type) || 0) + 1);
            });
        });
        
        // Criar nós de categoria (ordenados por número de arquivos)
        const sortedCategories = Array.from(categoryStats.entries())
            .sort((a, b) => b[1].files.length - a[1].files.length)
            .slice(0, 15); // Top 15 categorias
        
        sortedCategories.forEach(([catName, catData], index) => {
            const catId = `cat_${index}`;
            nodes.push({
                id: catId,
                name: catName,
                level: 0,
                type: 'category',
                value: catData.files.length,
                avgRelevance: catData.totalRelevance / catData.files.length
            });
            nodeMap.set(catName, catId);
        });
        
        // 2. Criar nós de TIPOS e links categoria->tipo
        const typeNodes = new Map();
        
        sortedCategories.forEach(([catName, catData]) => {
            const catId = nodeMap.get(catName);
            
            // Para cada tipo que tem arquivos nesta categoria
            catData.types.forEach((count, typeName) => {
                // Criar nó do tipo se não existir
                let typeId = typeNodes.get(typeName);
                if (!typeId) {
                    typeId = `type_${nodes.length}`;
                    nodes.push({
                        id: typeId,
                        name: typeName,
                        level: 1,
                        type: 'analysisType',
                        color: this._getColorForType(typeName),
                        value: 0 // Será acumulado
                    });
                    typeNodes.set(typeName, typeId);
                }
                
                // Atualizar valor total do tipo
                const typeNode = nodes.find(n => n.id === typeId);
                typeNode.value += count;
                
                // Link categoria -> tipo
                links.push({
                    source: catId,
                    target: typeId,
                    value: count,
                    type: 'category-type'
                });
            });
        });
        
        // 3. Criar clusters de arquivos agrupados (nível 2)
        // Em vez de mostrar arquivos individuais, mostrar clusters por relevância
        const relevanceBuckets = [
            { name: 'Alta Relevância (>80%)', min: 80, max: 100 },
            { name: 'Média-Alta (60-80%)', min: 60, max: 80 },
            { name: 'Média (40-60%)', min: 40, max: 60 },
            { name: 'Baixa (<40%)', min: 0, max: 40 }
        ];
        
        // Para cada tipo, criar buckets de relevância
        typeNodes.forEach((typeId, typeName) => {
            // Filtrar arquivos deste tipo que estão nas categorias selecionadas
            const typeFiles = this.aggregatedData.files.filter(file => {
                if (file.analysisType !== typeName) return false;
                
                // Verificar se tem alguma categoria selecionada
                return Array.from(file.categories).some(cat => 
                    sortedCategories.some(([catName]) => catName === cat)
                );
            });
            
            // Agrupar por bucket de relevância
            relevanceBuckets.forEach(bucket => {
                const bucketFiles = typeFiles.filter(f => 
                    f.relevanceScore >= bucket.min && f.relevanceScore <= bucket.max
                );
                
                if (bucketFiles.length > 0) {
                    const bucketId = `bucket_${nodes.length}`;
                    nodes.push({
                        id: bucketId,
                        name: bucket.name,
                        level: 2,
                        type: 'relevanceBucket',
                        fileCount: bucketFiles.length,
                        value: bucketFiles.length,
                        files: bucketFiles.map(f => ({
                            name: f.name,
                            relevance: f.relevanceScore
                        }))
                    });
                    
                    // Link tipo -> bucket
                    links.push({
                        source: typeId,
                        target: bucketId,
                        value: bucketFiles.length,
                        type: 'type-bucket'
                    });
                }
            });
        });
        
        // Estrutura alternativa disponível nos dados
        const alternativeStructure = this._buildAlternativeSankeyData();
        
        return { 
            nodes, 
            links,
            // Incluir estrutura alternativa para fácil troca
            alternative: alternativeStructure
        };
    }
    
    /**
     * Constrói múltiplas estruturas alternativas para Sankey
     * @private
     */
    _buildAlternativeSankeyData() {
        return {
            // Visão 1: Tipo → Categoria → Relevância (estrutura original melhorada)
            typeFirst: this._buildSankeyTypeFirst(),
            
            // Visão 2: Entidades → Categorias → Tipos
            entityFocus: this._buildSankeyEntityFocus(),
            
            // Visão 3: Timeline → Categoria → Tipo
            timeBased: this._buildSankeyTimeBased(),
            
            // Visão 4: Relevância → Tipo → Top Files
            relevanceFirst: this._buildSankeyRelevanceFirst()
        };
    }
    
    /**
     * Visão 1: Tipo → Categoria → Relevância
     * @private
     */
    _buildSankeyTypeFirst() {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        
        // Agrupar por tipo primeiro
        const typeGroups = new Map();
        
        this.aggregatedData.files.forEach(file => {
            const type = file.analysisType || 'General';
            if (!typeGroups.has(type)) {
                typeGroups.set(type, {
                    categories: new Map(),
                    fileCount: 0,
                    totalRelevance: 0
                });
            }
            
            const typeData = typeGroups.get(type);
            typeData.fileCount++;
            typeData.totalRelevance += file.relevanceScore;
            
            // Agrupar categorias dentro do tipo
            Array.from(file.categories).forEach(cat => {
                if (!typeData.categories.has(cat)) {
                    typeData.categories.set(cat, { files: [], totalRelevance: 0 });
                }
                typeData.categories.get(cat).files.push(file);
                typeData.categories.get(cat).totalRelevance += file.relevanceScore;
            });
        });
        
        // Criar nós de tipo (nível 0)
        let nodeIndex = 0;
        typeGroups.forEach((data, typeName) => {
            const typeId = `type_${nodeIndex++}`;
            nodes.push({
                id: typeId,
                name: typeName,
                level: 0,
                type: 'analysisType',
                value: data.fileCount,
                avgRelevance: data.totalRelevance / data.fileCount,
                color: this._getColorForType(typeName)
            });
            nodeMap.set(typeName, typeId);
        });
        
        // Criar nós de categoria e clusters de relevância
        typeGroups.forEach((typeData, typeName) => {
            const typeId = nodeMap.get(typeName);
            
            // Top 10 categorias por tipo
            const sortedCategories = Array.from(typeData.categories.entries())
                .sort((a, b) => b[1].files.length - a[1].files.length)
                .slice(0, 10);
            
            sortedCategories.forEach(([catName, catData]) => {
                const catId = `cat_${nodeIndex++}`;
                nodes.push({
                    id: catId,
                    name: catName,
                    level: 1,
                    type: 'category',
                    value: catData.files.length,
                    avgRelevance: catData.totalRelevance / catData.files.length
                });
                
                links.push({
                    source: typeId,
                    target: catId,
                    value: catData.files.length,
                    type: 'type-category'
                });
                
                // Criar clusters de relevância
                const relevanceGroups = {
                    high: catData.files.filter(f => f.relevanceScore > 80),
                    medium: catData.files.filter(f => f.relevanceScore >= 50 && f.relevanceScore <= 80),
                    low: catData.files.filter(f => f.relevanceScore < 50)
                };
                
                Object.entries(relevanceGroups).forEach(([level, files]) => {
                    if (files.length > 0) {
                        const clusterId = `cluster_${nodeIndex++}`;
                        nodes.push({
                            id: clusterId,
                            name: `${level === 'high' ? 'Alta' : level === 'medium' ? 'Média' : 'Baixa'} (${files.length})`,
                            level: 2,
                            type: 'relevanceCluster',
                            value: files.length,
                            relevanceLevel: level
                        });
                        
                        links.push({
                            source: catId,
                            target: clusterId,
                            value: files.length,
                            type: 'category-cluster'
                        });
                    }
                });
            });
        });
        
        return { nodes, links };
    }
    
    /**
     * Visão 2: Entidades → Categorias → Tipos
     * @private
     */
    _buildSankeyEntityFocus() {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        let nodeIndex = 0;
        
        // Top 20 entidades mais frequentes
        const topEntities = Array.from(this.indices.byEntity.entries())
            .map(([entity, files]) => ({
                name: entity,
                files: files,
                categories: new Set(),
                types: new Set()
            }))
            .sort((a, b) => b.files.length - a.files.length)
            .slice(0, 20);
        
        // Coletar categorias e tipos para cada entidade
        topEntities.forEach(entity => {
            entity.files.forEach(file => {
                Array.from(file.categories).forEach(cat => entity.categories.add(cat));
                entity.types.add(file.analysisType || 'General');
            });
        });
        
        // Criar nós de entidades (nível 0)
        topEntities.forEach(entity => {
            const entityId = `entity_${nodeIndex++}`;
            nodes.push({
                id: entityId,
                name: entity.name,
                level: 0,
                type: 'entity',
                value: entity.files.length
            });
            nodeMap.set(entity.name, entityId);
        });
        
        // Criar nós de categorias conectadas
        const categoryNodes = new Map();
        topEntities.forEach(entity => {
            const entityId = nodeMap.get(entity.name);
            
            Array.from(entity.categories).forEach(catName => {
                let catId = categoryNodes.get(catName);
                if (!catId) {
                    catId = `cat_${nodeIndex++}`;
                    nodes.push({
                        id: catId,
                        name: catName,
                        level: 1,
                        type: 'category',
                        value: 0
                    });
                    categoryNodes.set(catName, catId);
                }
                
                // Contar quantos arquivos têm esta entidade + categoria
                const linkValue = entity.files.filter(f => f.categories.has(catName)).length;
                if (linkValue > 0) {
                    links.push({
                        source: entityId,
                        target: catId,
                        value: linkValue,
                        type: 'entity-category'
                    });
                    
                    // Atualizar valor total da categoria
                    const catNode = nodes.find(n => n.id === catId);
                    catNode.value += linkValue;
                }
            });
        });
        
        // Criar nós de tipos
        const typeNodes = new Map();
        categoryNodes.forEach((catId, catName) => {
            // Encontrar tipos para esta categoria
            const catFiles = this.indices.byCategory.get(catName) || [];
            const typeCounts = new Map();
            
            catFiles.forEach(file => {
                const type = file.analysisType || 'General';
                typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
            });
            
            typeCounts.forEach((count, typeName) => {
                let typeId = typeNodes.get(typeName);
                if (!typeId) {
                    typeId = `type_${nodeIndex++}`;
                    nodes.push({
                        id: typeId,
                        name: typeName,
                        level: 2,
                        type: 'analysisType',
                        value: 0,
                        color: this._getColorForType(typeName)
                    });
                    typeNodes.set(typeName, typeId);
                }
                
                // Verificar se há conexão real através das entidades
                const hasConnection = topEntities.some(entity => 
                    entity.types.has(typeName) && entity.categories.has(catName)
                );
                
                if (hasConnection) {
                    links.push({
                        source: catId,
                        target: typeId,
                        value: count,
                        type: 'category-type'
                    });
                    
                    const typeNode = nodes.find(n => n.id === typeId);
                    typeNode.value += count;
                }
            });
        });
        
        return { nodes, links };
    }
    
    /**
     * Visão 3: Timeline → Categoria → Tipo
     * @private
     */
    _buildSankeyTimeBased() {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        let nodeIndex = 0;
        
        // Agrupar arquivos por período
        const now = new Date();
        const periods = {
            'Última Semana': 7,
            'Último Mês': 30,
            'Últimos 3 Meses': 90,
            'Últimos 6 Meses': 180,
            'Mais Antigos': Infinity
        };
        
        const periodGroups = new Map();
        Object.keys(periods).forEach(period => {
            periodGroups.set(period, {
                files: [],
                categories: new Map()
            });
        });
        
        // Classificar arquivos por período
        this.aggregatedData.files.forEach(file => {
            const fileDate = new Date(file.createdAt);
            const daysDiff = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
            
            let assignedPeriod = null;
            for (const [period, days] of Object.entries(periods)) {
                if (daysDiff <= days) {
                    assignedPeriod = period;
                    break;
                }
            }
            
            if (assignedPeriod) {
                const periodData = periodGroups.get(assignedPeriod);
                periodData.files.push(file);
                
                // Agrupar categorias no período
                Array.from(file.categories).forEach(cat => {
                    if (!periodData.categories.has(cat)) {
                        periodData.categories.set(cat, { files: [], types: new Map() });
                    }
                    periodData.categories.get(cat).files.push(file);
                    
                    const type = file.analysisType || 'General';
                    const catData = periodData.categories.get(cat);
                    catData.types.set(type, (catData.types.get(type) || 0) + 1);
                });
            }
        });
        
        // Criar nós de período (nível 0)
        Object.keys(periods).forEach(period => {
            const periodData = periodGroups.get(period);
            if (periodData.files.length > 0) {
                const periodId = `period_${nodeIndex++}`;
                nodes.push({
                    id: periodId,
                    name: period,
                    level: 0,
                    type: 'timePeriod',
                    value: periodData.files.length
                });
                nodeMap.set(period, periodId);
            }
        });
        
        // Criar nós de categoria e tipo para cada período
        periodGroups.forEach((periodData, periodName) => {
            if (periodData.files.length === 0) return;
            
            const periodId = nodeMap.get(periodName);
            
            // Top categorias do período
            const topCategories = Array.from(periodData.categories.entries())
                .sort((a, b) => b[1].files.length - a[1].files.length)
                .slice(0, 8);
            
            topCategories.forEach(([catName, catData]) => {
                const catId = `cat_${nodeIndex++}`;
                nodes.push({
                    id: catId,
                    name: catName,
                    level: 1,
                    type: 'category',
                    value: catData.files.length,
                    period: periodName
                });
                
                links.push({
                    source: periodId,
                    target: catId,
                    value: catData.files.length,
                    type: 'period-category'
                });
                
                // Criar nós de tipo
                catData.types.forEach((count, typeName) => {
                    const typeId = `type_${nodeIndex++}`;
                    nodes.push({
                        id: typeId,
                        name: typeName,
                        level: 2,
                        type: 'analysisType',
                        value: count,
                        color: this._getColorForType(typeName)
                    });
                    
                    links.push({
                        source: catId,
                        target: typeId,
                        value: count,
                        type: 'category-type'
                    });
                });
            });
        });
        
        return { nodes, links };
    }
    
    /**
     * Visão 4: Relevância → Tipo → Top Files
     * @private
     */
    _buildSankeyRelevanceFirst() {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        let nodeIndex = 0;
        
        // Grupos de relevância
        const relevanceGroups = [
            { name: 'Crítica (90-100%)', min: 90, max: 100, color: '#2ECC71' },
            { name: 'Alta (70-90%)', min: 70, max: 90, color: '#3498DB' },
            { name: 'Média (50-70%)', min: 50, max: 70, color: '#F39C12' },
            { name: 'Baixa (<50%)', min: 0, max: 50, color: '#E74C3C' }
        ];
        
        // Classificar arquivos por relevância
        const relevanceData = new Map();
        relevanceGroups.forEach(group => {
            relevanceData.set(group.name, {
                files: [],
                types: new Map(),
                color: group.color
            });
        });
        
        this.aggregatedData.files.forEach(file => {
            const relevance = file.relevanceScore;
            for (const group of relevanceGroups) {
                if (relevance >= group.min && relevance <= group.max) {
                    const groupData = relevanceData.get(group.name);
                    groupData.files.push(file);
                    
                    const type = file.analysisType || 'General';
                    if (!groupData.types.has(type)) {
                        groupData.types.set(type, { files: [], categories: new Set() });
                    }
                    groupData.types.get(type).files.push(file);
                    Array.from(file.categories).forEach(cat => 
                        groupData.types.get(type).categories.add(cat)
                    );
                    break;
                }
            }
        });
        
        // Criar nós de relevância (nível 0)
        relevanceData.forEach((data, groupName) => {
            if (data.files.length > 0) {
                const relevanceId = `relevance_${nodeIndex++}`;
                nodes.push({
                    id: relevanceId,
                    name: groupName,
                    level: 0,
                    type: 'relevanceGroup',
                    value: data.files.length,
                    color: data.color
                });
                nodeMap.set(groupName, relevanceId);
            }
        });
        
        // Criar nós de tipo e arquivos top
        relevanceData.forEach((groupData, groupName) => {
            if (groupData.files.length === 0) return;
            
            const relevanceId = nodeMap.get(groupName);
            
            groupData.types.forEach((typeData, typeName) => {
                const typeId = `type_${nodeIndex++}`;
                nodes.push({
                    id: typeId,
                    name: typeName,
                    level: 1,
                    type: 'analysisType',
                    value: typeData.files.length,
                    color: this._getColorForType(typeName)
                });
                
                links.push({
                    source: relevanceId,
                    target: typeId,
                    value: typeData.files.length,
                    type: 'relevance-type'
                });
                
                // Top 5 arquivos por tipo nesta faixa de relevância
                const topFiles = typeData.files
                    .sort((a, b) => b.relevanceScore - a.relevanceScore)
                    .slice(0, 5);
                
                topFiles.forEach(file => {
                    const fileId = `file_${nodeIndex++}`;
                    nodes.push({
                        id: fileId,
                        name: this._truncateFileName(file.name),
                        fullName: file.name,
                        level: 2,
                        type: 'file',
                        value: file.relevanceScore,
                        categories: Array.from(file.categories),
                        chunks: file.chunks.length
                    });
                    
                    links.push({
                        source: typeId,
                        target: fileId,
                        value: file.relevanceScore / 20, // Escalar para visualização
                        type: 'type-file'
                    });
                });
            });
        });
        
        return { nodes, links };
    }
    
    /**
     * Prepara dados para TreeMap
     * @private
     */
    _prepareTreeMapData() {
        // TreeMap usa a mesma estrutura hierárquica
        // mas com 'value' calculado diferentemente
        const treemapData = JSON.parse(JSON.stringify(this.hierarchicalData));
        
        // Função recursiva para calcular valores
        const calculateValues = (node) => {
            if (node.type === 'file') {
                // Para arquivos, valor = relevância * chunks
                node.value = node.metrics.relevance * Math.log(node.metrics.chunks + 1);
            } else if (node.children && node.children.length > 0) {
                // Para nós pais, valor = soma dos filhos
                node.value = node.children.reduce((sum, child) => {
                    return sum + calculateValues(child);
                }, 0);
            } else {
                node.value = 1;
            }
            return node.value;
        };
        
        calculateValues(treemapData);
        return treemapData;
    }
    
    /**
     * Prepara dados para Sunburst
     * @private
     */
    _prepareSunburstData() {
        // Sunburst também usa hierarquia, mas com diferentes métricas
        const sunburstData = JSON.parse(JSON.stringify(this.hierarchicalData));
        
        // Adicionar cores e tamanhos específicos
        const addSunburstProperties = (node, depth = 0) => {
            node.depth = depth;
            
            if (node.type === 'analysisType') {
                node.color = this._getColorForType(node.name);
            } else if (node.type === 'category') {
                node.color = this._adjustBrightness(node.parent?.color || '#888', 0.8);
            }
            
            if (node.children) {
                node.children.forEach(child => {
                    child.parent = node.name;
                    addSunburstProperties(child, depth + 1);
                });
            }
        };
        
        addSunburstProperties(sunburstData);
        return sunburstData;
    }
    
    /**
     * Prepara dados para Force-Directed
     * @private
     */
    _prepareForceData() {
        const nodes = [];
        const links = [];
        let nodeId = 0;
        
        // Criar clusters por tipo de análise
        this.hierarchicalData.children.forEach((typeNode, typeIndex) => {
            // Nó central do cluster
            const clusterId = nodeId++;
            nodes.push({
                id: clusterId,
                name: typeNode.name,
                type: 'cluster',
                group: typeIndex,
                radius: Math.sqrt(typeNode.metrics.fileCount) * 10,
                fx: null, // Será calculado pelo layout
                fy: null
            });
            
            // Adicionar categorias como nós médios
            typeNode.children.forEach(catNode => {
                const catNodeId = nodeId++;
                nodes.push({
                    id: catNodeId,
                    name: catNode.name,
                    type: 'category',
                    group: typeIndex,
                    cluster: clusterId,
                    radius: Math.sqrt(catNode.metrics.fileCount) * 5
                });
                
                // Link cluster -> categoria
                links.push({
                    source: clusterId,
                    target: catNodeId,
                    strength: 0.1
                });
                
                // Adicionar apenas arquivos com alta relevância (>70%)
                catNode.children
                    .filter(file => file.metrics.relevance > 70)
                    .forEach(fileNode => {
                        const fileNodeId = nodeId++;
                        nodes.push({
                            id: fileNodeId,
                            name: fileNode.name,
                            type: 'file',
                            group: typeIndex,
                            cluster: clusterId,
                            radius: Math.log(fileNode.metrics.relevance) * 2,
                            relevance: fileNode.metrics.relevance
                        });
                        
                        // Link categoria -> arquivo
                        links.push({
                            source: catNodeId,
                            target: fileNodeId,
                            strength: 0.05
                        });
                    });
            });
        });
        
        return { nodes, links };
    }
    
    /**
     * Constrói índices para busca rápida
     * @private
     */
    _buildIndices() {
        // Limpar índices
        this.indices.byType.clear();
        this.indices.byCategory.clear();
        this.indices.byEntity.clear();
        this.indices.byFile.clear();
        
        // Popular índices
        this.aggregatedData.files.forEach(file => {
            // Índice por tipo
            const type = file.analysisType || 'General';
            if (!this.indices.byType.has(type)) {
                this.indices.byType.set(type, []);
            }
            this.indices.byType.get(type).push(file);
            
            // Índice por categoria
            Array.from(file.categories).forEach(cat => {
                if (!this.indices.byCategory.has(cat)) {
                    this.indices.byCategory.set(cat, []);
                }
                this.indices.byCategory.get(cat).push(file);
            });
            
            // Índice por entidade
            Array.from(file.entities).forEach(entity => {
                if (!this.indices.byEntity.has(entity)) {
                    this.indices.byEntity.set(entity, []);
                }
                this.indices.byEntity.get(entity).push(file);
            });
            
            // Índice por arquivo
            this.indices.byFile.set(file.id, file);
        });
    }
    
    /**
     * Calcula metadados globais
     * @private
     */
    _calculateMetadata() {
        const files = this.aggregatedData.files;
        const dates = files
            .map(f => new Date(f.createdAt))
            .filter(d => !isNaN(d.getTime()));
        
        return {
            totalFiles: files.length,
            totalChunks: files.reduce((sum, f) => sum + f.chunks.length, 0),
            totalCategories: this.indices.byCategory.size,
            totalEntities: this.indices.byEntity.size,
            avgRelevance: files.reduce((sum, f) => sum + f.relevanceScore, 0) / files.length,
            dateRange: {
                start: dates.length > 0 ? new Date(Math.min(...dates)) : null,
                end: dates.length > 0 ? new Date(Math.max(...dates)) : null
            },
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * Gera insights automáticos
     * @private
     */
    _generateInsights() {
        const insights = [];
        
        // Insight 1: Distribuição por tipo
        const typeDistribution = Array.from(this.indices.byType.entries())
            .map(([type, files]) => ({ type, count: files.length }))
            .sort((a, b) => b.count - a.count);
        
        if (typeDistribution.length > 0) {
            const topType = typeDistribution[0];
            const percentage = (topType.count / this.aggregatedData.files.length * 100).toFixed(1);
            insights.push({
                type: 'distribution',
                message: `${percentage}% dos arquivos são do tipo "${topType.type}"`,
                data: typeDistribution
            });
        }
        
        // Insight 2: Categorias mais populares
        const categoryPopularity = Array.from(this.indices.byCategory.entries())
            .map(([cat, files]) => ({
                category: cat,
                count: files.length,
                avgRelevance: files.reduce((sum, f) => sum + f.relevanceScore, 0) / files.length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        
        if (categoryPopularity.length > 0) {
            insights.push({
                type: 'topCategories',
                message: `Top 3 categorias: ${categoryPopularity.map(c => c.category).join(', ')}`,
                data: categoryPopularity
            });
        }
        
        // Insight 3: Entidades mais conectadas
        const entityConnections = Array.from(this.indices.byEntity.entries())
            .map(([entity, files]) => ({ entity, connections: files.length }))
            .sort((a, b) => b.connections - a.connections)
            .slice(0, 5);
        
        if (entityConnections.length > 0) {
            insights.push({
                type: 'topEntities',
                message: `Entidade mais conectada: "${entityConnections[0].entity}" em ${entityConnections[0].connections} arquivos`,
                data: entityConnections
            });
        }
        
        // Insight 4: Anomalias de relevância
        const avgRelevance = this._calculateMetadata().avgRelevance;
        const highRelevanceFiles = this.aggregatedData.files
            .filter(f => f.relevanceScore > avgRelevance * 1.5)
            .length;
        
        if (highRelevanceFiles > 0) {
            insights.push({
                type: 'anomaly',
                message: `${highRelevanceFiles} arquivos têm relevância 50% acima da média`,
                threshold: avgRelevance * 1.5
            });
        }
        
        return insights;
    }
    
    /**
     * Utilitários
     * @private
     */
    _sanitizeId(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    
    _truncateFileName(name, maxLength = 25) {
        if (name.length <= maxLength) return name;
        const ext = name.split('.').pop();
        const base = name.substring(0, maxLength - ext.length - 4);
        return `${base}...${ext}`;
    }
    
    _getColorForType(typeName) {
        const colors = {
            'Breakthrough Técnico': '#FF6B6B',
            'Evolução Conceitual': '#4ECDC4',
            'Momento Decisivo': '#45B7D1',
            'Insight Estratégico': '#FECA57',
            'Aprendizado Geral': '#A29BFE',
            'General': '#95A5A6'
        };
        return colors[typeName] || '#7F8C8D';
    }
    
    _adjustBrightness(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const adjust = (c) => Math.min(255, Math.floor(c * factor));
        
        return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`;
    }
}

// Exportar como módulo ES6
export default DataTransformerV4;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.DataTransformerV4 = DataTransformerV4;
}