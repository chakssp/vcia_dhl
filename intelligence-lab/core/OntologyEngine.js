/**
 * OntologyEngine - Constrói hierarquia entidades → categorias → arquivos
 * 
 * Este módulo é o coração da inteligência do sistema, construindo
 * a ontologia emergente a partir dos dados agregados.
 */

class OntologyEngine {
    constructor() {
        this.ontology = null;
        this.entityGraph = new Map();
        this.categoryHierarchy = new Map();
        this.influenceScores = new Map();
    }

    /**
     * Constrói ontologia completa a partir dos dados agregados
     * @param {Object} aggregatedData - Dados do DataAggregator
     * @returns {Object} Ontologia estruturada
     */
    buildOntology(aggregatedData) {
        console.log('🧬 Construindo ontologia...');
        
        // Reset estruturas
        this.entityGraph.clear();
        this.categoryHierarchy.clear();
        this.influenceScores.clear();

        // Fase 1: Construir grafo de entidades
        this._buildEntityGraph(aggregatedData);
        
        // Fase 2: Estabelecer hierarquia de categorias
        this._buildCategoryHierarchy(aggregatedData);
        
        // Fase 3: Calcular influência e centralidade
        this._calculateInfluence();
        
        // Fase 4: Detectar relacionamentos implícitos
        this._detectImplicitRelationships(aggregatedData);
        
        // Fase 5: Construir estrutura final
        this.ontology = this._buildFinalStructure(aggregatedData);
        
        console.log('✅ Ontologia construída:');
        console.log(`   - ${this.ontology.entities.size} entidades`);
        console.log(`   - ${this.ontology.categories.length} categorias`);
        console.log(`   - ${this.ontology.relationships.length} relacionamentos`);
        
        return this.ontology;
    }

    /**
     * Constrói grafo de entidades
     * @private
     */
    _buildEntityGraph(aggregatedData) {
        // Processar cada entidade
        aggregatedData.entities.forEach(entity => {
            const node = {
                id: this._generateEntityId(entity.name),
                name: entity.name,
                type: entity.type,
                categories: new Set(entity.categories),
                files: new Set(entity.files),
                occurrences: entity.occurrences,
                contexts: entity.contexts || [],
                neighbors: new Set(),
                metrics: {
                    degree: 0,
                    betweenness: 0,
                    closeness: 0,
                    eigenvector: 0,
                    pagerank: 0
                },
                temporalData: this._extractTemporalData(entity, aggregatedData)
            };
            
            this.entityGraph.set(node.id, node);
        });

        // Conectar entidades que aparecem nos mesmos arquivos
        this._connectCoOccurringEntities(aggregatedData);
    }

    /**
     * Conecta entidades que co-ocorrem
     * @private
     */
    _connectCoOccurringEntities(aggregatedData) {
        // Para cada arquivo, conectar todas as entidades presentes
        aggregatedData.files.forEach(file => {
            const entities = Array.from(file.entities);
            
            for (let i = 0; i < entities.length; i++) {
                for (let j = i + 1; j < entities.length; j++) {
                    const entity1Id = this._generateEntityId(entities[i]);
                    const entity2Id = this._generateEntityId(entities[j]);
                    
                    const node1 = this.entityGraph.get(entity1Id);
                    const node2 = this.entityGraph.get(entity2Id);
                    
                    if (node1 && node2) {
                        node1.neighbors.add(entity2Id);
                        node2.neighbors.add(entity1Id);
                    }
                }
            }
        });
    }

    /**
     * Constrói hierarquia de categorias
     * @private
     */
    _buildCategoryHierarchy(aggregatedData) {
        aggregatedData.categories.forEach(category => {
            const categoryNode = {
                name: category.name,
                files: new Set(category.files),
                entities: new Set(category.entities),
                children: new Set(),
                parent: null,
                depth: 0,
                importance: 0
            };
            
            this.categoryHierarchy.set(category.name, categoryNode);
        });

        // Detectar hierarquia baseada em padrões de nome (ex: "IA/ML" é filho de "IA")
        this.categoryHierarchy.forEach((node, name) => {
            if (name.includes('/')) {
                const parentName = name.split('/')[0];
                const parent = this.categoryHierarchy.get(parentName);
                
                if (parent) {
                    parent.children.add(name);
                    node.parent = parentName;
                    node.depth = parent.depth + 1;
                }
            }
        });

        // Calcular importância baseada em entidades e arquivos
        this._calculateCategoryImportance();
    }

    /**
     * Calcula importância das categorias
     * @private
     */
    _calculateCategoryImportance() {
        this.categoryHierarchy.forEach(category => {
            // Importância = combinação de vários fatores
            const entityCount = category.entities.size;
            const fileCount = category.files.size;
            const childCount = category.children.size;
            
            // Fórmula ponderada
            category.importance = 
                (entityCount * 0.4) + 
                (fileCount * 0.3) + 
                (childCount * 0.3);
        });
    }

    /**
     * Calcula métricas de influência
     * @private
     */
    _calculateInfluence() {
        // Calcular degree centrality
        this.entityGraph.forEach(node => {
            node.metrics.degree = node.neighbors.size;
        });

        // Calcular PageRank simplificado
        this._calculatePageRank();
        
        // Calcular betweenness centrality (simplificado)
        this._calculateBetweenness();
        
        // Score de influência composto
        this.entityGraph.forEach(node => {
            const influence = 
                (node.metrics.degree * 0.2) +
                (node.metrics.pagerank * 0.4) +
                (node.metrics.betweenness * 0.2) +
                (node.occurrences * 0.2);
            
            this.influenceScores.set(node.id, influence);
        });
    }

    /**
     * Calcula PageRank
     * @private
     */
    _calculatePageRank() {
        const damping = 0.85;
        const iterations = 50;
        const nodes = Array.from(this.entityGraph.values());
        const n = nodes.length;
        
        // Inicializar scores
        nodes.forEach(node => {
            node.metrics.pagerank = 1 / n;
        });
        
        // Iterar
        for (let i = 0; i < iterations; i++) {
            const newScores = new Map();
            
            nodes.forEach(node => {
                let score = (1 - damping) / n;
                
                // Somar contribuições dos vizinhos
                node.neighbors.forEach(neighborId => {
                    const neighbor = this.entityGraph.get(neighborId);
                    if (neighbor) {
                        score += damping * neighbor.metrics.pagerank / neighbor.neighbors.size;
                    }
                });
                
                newScores.set(node.id, score);
            });
            
            // Atualizar scores
            newScores.forEach((score, nodeId) => {
                const node = this.entityGraph.get(nodeId);
                if (node) {
                    node.metrics.pagerank = score;
                }
            });
        }

        // Normalizar
        const maxPagerank = Math.max(...nodes.map(n => n.metrics.pagerank));
        nodes.forEach(node => {
            node.metrics.pagerank = node.metrics.pagerank / maxPagerank;
        });
    }

    /**
     * Calcula betweenness centrality (simplificado)
     * @private
     */
    _calculateBetweenness() {
        // Implementação simplificada: baseada em quantas categorias diferentes uma entidade conecta
        this.entityGraph.forEach(node => {
            const connectedCategories = new Set();
            
            node.neighbors.forEach(neighborId => {
                const neighbor = this.entityGraph.get(neighborId);
                if (neighbor) {
                    neighbor.categories.forEach(cat => connectedCategories.add(cat));
                }
            });
            
            node.metrics.betweenness = connectedCategories.size / this.categoryHierarchy.size;
        });
    }

    /**
     * Detecta relacionamentos implícitos
     * @private
     */
    _detectImplicitRelationships(aggregatedData) {
        const relationships = [];
        
        // Tipo 1: Entidades que sempre aparecem juntas
        this._detectCoOccurrencePatterns(relationships);
        
        // Tipo 2: Entidades com evolução temporal similar
        this._detectTemporalPatterns(relationships);
        
        // Tipo 3: Entidades que compartilham contextos semânticos
        this._detectSemanticPatterns(relationships, aggregatedData);
        
        return relationships;
    }

    /**
     * Detecta padrões de co-ocorrência
     * @private
     */
    _detectCoOccurrencePatterns(relationships) {
        this.entityGraph.forEach((node1, id1) => {
            node1.neighbors.forEach(id2 => {
                if (id1 < id2) { // Evitar duplicação
                    const node2 = this.entityGraph.get(id2);
                    
                    // Calcular força da relação
                    const sharedFiles = new Set(
                        [...node1.files].filter(f => node2.files.has(f))
                    );
                    
                    const strength = sharedFiles.size / Math.min(node1.files.size, node2.files.size);
                    
                    if (strength > 0.5) {
                        relationships.push({
                            from: id1,
                            to: id2,
                            type: 'co_occurs',
                            strength: strength,
                            evidence: Array.from(sharedFiles)
                        });
                    }
                }
            });
        });
    }

    /**
     * Detecta padrões temporais
     * @private
     */
    _detectTemporalPatterns(relationships) {
        // Implementação futura: analisar timestamps e evolução temporal
    }

    /**
     * Detecta padrões semânticos
     * @private
     */
    _detectSemanticPatterns(relationships, aggregatedData) {
        // Analisar contextos compartilhados
        this.entityGraph.forEach((node1, id1) => {
            this.entityGraph.forEach((node2, id2) => {
                if (id1 < id2 && !node1.neighbors.has(id2)) {
                    // Verificar similaridade de contextos
                    const similarity = this._calculateContextSimilarity(
                        node1.contexts,
                        node2.contexts
                    );
                    
                    if (similarity > 0.7) {
                        relationships.push({
                            from: id1,
                            to: id2,
                            type: 'semantic_similarity',
                            strength: similarity,
                            evidence: ['context_analysis']
                        });
                    }
                }
            });
        });
    }

    /**
     * Calcula similaridade entre contextos
     * @private
     */
    _calculateContextSimilarity(contexts1, contexts2) {
        if (!contexts1.length || !contexts2.length) return 0;
        
        // Implementação simplificada: overlap de palavras
        const words1 = new Set(contexts1.join(' ').toLowerCase().split(/\s+/));
        const words2 = new Set(contexts2.join(' ').toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * Constrói estrutura final da ontologia
     * @private
     */
    _buildFinalStructure(aggregatedData) {
        // Converter Map para formato compatível
        const entities = new Map();
        
        this.entityGraph.forEach((node, id) => {
            entities.set(id, {
                id: id,
                name: node.name,
                type: node.type,
                influence: this.influenceScores.get(id) || 0,
                categories: Array.from(node.categories),
                files: Array.from(node.files),
                occurrences: node.occurrences,
                metrics: node.metrics,
                firstSeen: node.temporalData?.firstSeen,
                lastUpdated: node.temporalData?.lastUpdated,
                context: node.contexts.slice(0, 5) // Top 5 contextos
            });
        });

        // Construir relacionamentos finais
        const relationships = [];
        const processedPairs = new Set();
        
        this.entityGraph.forEach((node, id1) => {
            node.neighbors.forEach(id2 => {
                const pairKey = [id1, id2].sort().join('-');
                if (!processedPairs.has(pairKey)) {
                    processedPairs.add(pairKey);
                    
                    const node2 = this.entityGraph.get(id2);
                    const sharedFiles = new Set(
                        [...node.files].filter(f => node2.files.has(f))
                    );
                    
                    relationships.push({
                        from: id1,
                        to: id2,
                        type: 'co_occurrence',
                        strength: sharedFiles.size / Math.min(node.files.size, node2.files.size),
                        evidence: Array.from(sharedFiles).slice(0, 5)
                    });
                }
            });
        });

        // Estrutura hierarquica de categorias
        const categories = Array.from(this.categoryHierarchy.values()).map(cat => ({
            id: this._generateCategoryId(cat.name),
            name: cat.name,
            entityCount: cat.entities.size,
            fileCount: cat.files.size,
            importance: cat.importance,
            parent: cat.parent,
            children: Array.from(cat.children),
            depth: cat.depth
        }));

        return {
            entities: entities,
            categories: categories,
            relationships: relationships,
            stats: {
                totalEntities: entities.size,
                totalCategories: categories.length,
                totalRelationships: relationships.length,
                avgConnections: this._calculateAvgConnections(),
                modularity: this._calculateModularity(),
                density: this._calculateGraphDensity()
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extrai dados temporais
     * @private
     */
    _extractTemporalData(entity, aggregatedData) {
        const fileDates = [];
        
        entity.files.forEach(fileId => {
            const file = aggregatedData.files.find(f => f.id === fileId);
            if (file && file.createdAt) {
                fileDates.push(new Date(file.createdAt));
            }
        });
        
        if (fileDates.length === 0) return null;
        
        fileDates.sort((a, b) => a - b);
        
        return {
            firstSeen: fileDates[0].toISOString(),
            lastUpdated: fileDates[fileDates.length - 1].toISOString(),
            timespan: fileDates[fileDates.length - 1] - fileDates[0],
            frequency: entity.occurrences / fileDates.length
        };
    }

    /**
     * Gera ID único para entidade
     * @private
     */
    _generateEntityId(name) {
        return `entity_${name.toLowerCase().replace(/\s+/g, '_')}`;
    }

    /**
     * Gera ID único para categoria
     * @private
     */
    _generateCategoryId(name) {
        return `category_${name.toLowerCase().replace(/\s+/g, '_')}`;
    }

    /**
     * Calcula média de conexões
     * @private
     */
    _calculateAvgConnections() {
        let totalConnections = 0;
        this.entityGraph.forEach(node => {
            totalConnections += node.neighbors.size;
        });
        return (totalConnections / this.entityGraph.size).toFixed(2);
    }

    /**
     * Calcula modularidade do grafo
     * @private
     */
    _calculateModularity() {
        // Implementação simplificada
        return 0.65; // Placeholder
    }

    /**
     * Calcula densidade do grafo
     * @private
     */
    _calculateGraphDensity() {
        const n = this.entityGraph.size;
        if (n <= 1) return 0;
        
        let edges = 0;
        this.entityGraph.forEach(node => {
            edges += node.neighbors.size;
        });
        edges = edges / 2; // Cada aresta contada duas vezes
        
        const maxEdges = (n * (n - 1)) / 2;
        return (edges / maxEdges).toFixed(3);
    }

    /**
     * Exporta ontologia como grafo vis.js
     * @returns {Object} Dados compatíveis com vis.js
     */
    exportToVisJS() {
        const nodes = [];
        const edges = [];
        
        // Converter entidades em nós
        this.ontology.entities.forEach((entity, id) => {
            nodes.push({
                id: id,
                label: entity.name,
                title: `${entity.name}\nInfluence: ${entity.influence.toFixed(2)}\nOccurrences: ${entity.occurrences}`,
                value: entity.influence,
                group: entity.type,
                level: this._calculateNodeLevel(entity)
            });
        });
        
        // Converter relacionamentos em arestas
        this.ontology.relationships.forEach((rel, idx) => {
            edges.push({
                id: `edge_${idx}`,
                from: rel.from,
                to: rel.to,
                value: rel.strength,
                title: `Type: ${rel.type}\nStrength: ${rel.strength.toFixed(2)}`,
                color: {
                    opacity: Math.max(0.3, rel.strength)
                }
            });
        });
        
        return { nodes, edges };
    }

    /**
     * Calcula nível do nó para layout hierárquico
     * @private
     */
    _calculateNodeLevel(entity) {
        // Baseado na importância e tipo
        if (entity.influence > 0.8) return 0;
        if (entity.influence > 0.6) return 1;
        if (entity.influence > 0.4) return 2;
        return 3;
    }

    /**
     * Obtém ontologia atual
     * @returns {Object} Ontologia
     */
    getOntology() {
        return this.ontology;
    }

    /**
     * Limpa dados
     */
    clear() {
        this.entityGraph.clear();
        this.categoryHierarchy.clear();
        this.influenceScores.clear();
        this.ontology = null;
    }
}

// Exportar como módulo ES6
export default OntologyEngine;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.OntologyEngine = OntologyEngine;
}