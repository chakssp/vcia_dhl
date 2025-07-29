/**
 * DataAggregator - Consolida chunks em arquivos únicos
 * 
 * Este módulo agrega os múltiplos chunks de cada arquivo,
 * reconstrói metadados e prepara os dados para análise.
 */

class DataAggregator {
    constructor() {
        this.aggregatedData = null;
        this.fileMap = new Map();
        this.entityMap = new Map();
        this.categoryMap = new Map();
    }

    /**
     * Agrega pontos do Qdrant em arquivos únicos
     * @param {Array} points - Array de pontos do Qdrant
     * @returns {Object} Dados agregados
     */
    aggregate(points) {
        console.log(`🔄 Agregando ${points.length} chunks...`);
        
        // Reset maps
        this.fileMap.clear();
        this.entityMap.clear();
        this.categoryMap.clear();

        // Processar cada ponto
        points.forEach(point => {
            this._processPoint(point);
        });

        // Construir resultado agregado
        this.aggregatedData = {
            files: Array.from(this.fileMap.values()),
            entities: Array.from(this.entityMap.values()),
            categories: Array.from(this.categoryMap.values()),
            stats: this._calculateStats(),
            timestamp: new Date().toISOString()
        };

        console.log(`✅ Agregação completa:`);
        console.log(`   - ${this.aggregatedData.files.length} arquivos únicos`);
        console.log(`   - ${this.aggregatedData.entities.length} entidades`);
        console.log(`   - ${this.aggregatedData.categories.length} categorias`);
        console.log(`   - ${points.length} chunks totais`);

        return this.aggregatedData;
    }

    /**
     * Processa um ponto individual
     * @private
     */
    _processPoint(point) {
        const payload = point.payload || {};
        
        // Extrair informações do chunk baseado na estrutura real do Qdrant
        const fileName = payload.fileName || payload.name || payload.file_name || 'Unknown';
        const filePath = payload.path || payload.filePath || payload.file_path || '';
        
        // Usar fileName como base para o fileId já que é o campo disponível
        const fileId = payload.documentId || this._extractFileId(payload);
        
        // Campos de chunk que não existem na estrutura atual
        const chunkIndex = payload.originalChunkId || payload.chunkId || 0;
        const totalChunks = payload.totalChunks || payload.total_chunks || 1;
        
        // Agregar por arquivo
        if (!this.fileMap.has(fileId)) {
            this.fileMap.set(fileId, {
                id: fileId,
                name: fileName,
                path: filePath,
                chunks: [],
                categories: new Set(),
                entities: new Set(),
                analysisType: payload.analysisType || payload.analysis_type || 'General',
                relevanceScore: payload.relevanceScore || payload.relevance_score || payload.metadata?.relevanceScore || 0,
                createdAt: payload.createdAt || payload.created_at || payload.metadata?.createdAt || payload.lastModified,
                metadata: {}
            });
        }

        const file = this.fileMap.get(fileId);
        
        // Adicionar chunk
        file.chunks.push({
            id: point.id,
            index: chunkIndex,
            content: payload.content || '',
            preview: payload.preview || '',
            embedding: point.vector // Caso precise depois
        });

        // Agregar categorias - podem estar em metadata
        let categories = [];
        if (payload.categories) {
            categories = Array.isArray(payload.categories) ? payload.categories : [payload.categories];
        } else if (payload.metadata && payload.metadata.categories) {
            categories = Array.isArray(payload.metadata.categories) ? payload.metadata.categories : [payload.metadata.categories];
        }
        
        // Se ainda não tiver categorias, extrair do analysisType
        if (categories.length === 0 && payload.analysisType) {
            categories = [payload.analysisType];
        }
        
        categories.forEach(cat => {
            if (cat) {
                file.categories.add(cat);
                this._processCategory(cat, fileId);
            }
        });

        // Extrair e agregar entidades
        const entities = this._extractEntities(payload);
        entities.forEach(entity => {
            file.entities.add(entity.name);
            this._processEntity(entity, fileId, Array.from(file.categories));
        });

        // Atualizar metadata agregado
        if (payload.metadata) {
            Object.assign(file.metadata, payload.metadata);
        }

        // Manter a relevância mais alta entre os chunks
        const chunkRelevance = payload.relevanceScore || payload.relevance_score || payload.metadata?.relevanceScore || 0;
        if (chunkRelevance > file.relevanceScore) {
            file.relevanceScore = chunkRelevance;
        }
    }

    /**
     * Extrai ID do arquivo do payload
     * @private
     */
    _extractFileId(payload) {
        // Prioridade 1: fileId explícito
        if (payload.fileId) return payload.fileId;
        if (payload.file_id) return payload.file_id;
        
        // Prioridade 2: Usar o nome do arquivo como ID
        // Isso garante que chunks do mesmo arquivo sejam agrupados
        const fileName = payload.fileName || payload.file_name || payload.name;
        if (fileName) {
            return this._hashString(fileName);
        }
        
        // Prioridade 3: Usar path
        const path = payload.path || payload.filePath || payload.file_path;
        if (path) {
            return this._hashString(path);
        }
        
        // Último recurso: gerar ID único
        // NOTA: Isso deve ser evitado pois impede agregação
        console.warn('Unable to extract consistent file ID from payload:', payload);
        return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Extrai entidades do payload
     * @private
     */
    _extractEntities(payload) {
        const entities = [];
        
        // Entidades explícitas
        if (payload.entities) {
            const explicitEntities = Array.isArray(payload.entities) ? payload.entities : [payload.entities];
            explicitEntities.forEach(e => {
                if (typeof e === 'string') {
                    entities.push({ name: e, type: 'general' });
                } else {
                    entities.push(e);
                }
            });
        }

        // Extrair do conteúdo se necessário
        if (payload.content && entities.length === 0) {
            // Regex simples para encontrar palavras em maiúsculas (possíveis entidades)
            const matches = payload.content.match(/[A-Z][a-z]+(\s[A-Z][a-z]+)*/g) || [];
            const uniqueMatches = [...new Set(matches)];
            uniqueMatches.slice(0, 5).forEach(match => {
                entities.push({
                    name: match,
                    type: 'extracted',
                    confidence: 0.5
                });
            });
        }

        // Extrair de triplas se existirem
        if (payload.triples || payload.relationships) {
            const triples = payload.triples || payload.relationships || [];
            triples.forEach(triple => {
                if (triple.subject) entities.push({ name: triple.subject, type: 'subject' });
                if (triple.object) entities.push({ name: triple.object, type: 'object' });
            });
        }

        return entities;
    }

    /**
     * Processa categoria
     * @private
     */
    _processCategory(categoryName, fileId) {
        if (!this.categoryMap.has(categoryName)) {
            this.categoryMap.set(categoryName, {
                name: categoryName,
                files: new Set(),
                entities: new Set(),
                count: 0
            });
        }
        
        const category = this.categoryMap.get(categoryName);
        category.files.add(fileId);
        category.count++;
    }

    /**
     * Processa entidade
     * @private
     */
    _processEntity(entity, fileId, categories) {
        const entityName = entity.name;
        
        if (!this.entityMap.has(entityName)) {
            this.entityMap.set(entityName, {
                name: entityName,
                type: entity.type || 'general',
                files: new Set(),
                categories: new Set(),
                occurrences: 0,
                contexts: [],
                confidence: entity.confidence || 1.0
            });
        }
        
        const entityData = this.entityMap.get(entityName);
        entityData.files.add(fileId);
        categories.forEach(cat => entityData.categories.add(cat));
        entityData.occurrences++;
        
        // Adicionar contexto se disponível
        if (entity.context) {
            entityData.contexts.push(entity.context);
        }
    }

    /**
     * Calcula estatísticas agregadas
     * @private
     */
    _calculateStats() {
        const files = Array.from(this.fileMap.values());
        const totalChunks = files.reduce((sum, file) => sum + file.chunks.length, 0);
        
        // Distribuição por tipo de análise
        const analysisDist = {};
        files.forEach(file => {
            const type = file.analysisType;
            analysisDist[type] = (analysisDist[type] || 0) + 1;
        });

        // Distribuição por categoria
        const categoryDist = {};
        this.categoryMap.forEach((data, name) => {
            categoryDist[name] = data.files.size;
        });

        // Top entidades por ocorrência
        const topEntities = Array.from(this.entityMap.values())
            .sort((a, b) => b.occurrences - a.occurrences)
            .slice(0, 10)
            .map(e => ({ name: e.name, count: e.occurrences }));

        return {
            totalFiles: files.length,
            totalChunks: totalChunks,
            avgChunksPerFile: (totalChunks / files.length).toFixed(2),
            totalEntities: this.entityMap.size,
            totalCategories: this.categoryMap.size,
            analysisDistribution: analysisDist,
            categoryDistribution: categoryDist,
            topEntities: topEntities,
            avgRelevance: (files.reduce((sum, f) => sum + f.relevanceScore, 0) / files.length).toFixed(2)
        };
    }

    /**
     * Obtém arquivos por categoria
     * @param {string} categoryName - Nome da categoria
     * @returns {Array} Arquivos da categoria
     */
    getFilesByCategory(categoryName) {
        const category = this.categoryMap.get(categoryName);
        if (!category) return [];
        
        return Array.from(category.files)
            .map(fileId => this.fileMap.get(fileId))
            .filter(Boolean);
    }

    /**
     * Obtém arquivos por entidade
     * @param {string} entityName - Nome da entidade
     * @returns {Array} Arquivos que contêm a entidade
     */
    getFilesByEntity(entityName) {
        const entity = this.entityMap.get(entityName);
        if (!entity) return [];
        
        return Array.from(entity.files)
            .map(fileId => this.fileMap.get(fileId))
            .filter(Boolean);
    }

    /**
     * Reconstrói conteúdo completo de um arquivo
     * @param {string} fileId - ID do arquivo
     * @returns {string} Conteúdo reconstruído
     */
    reconstructFileContent(fileId) {
        const file = this.fileMap.get(fileId);
        if (!file) return '';
        
        // Ordenar chunks por índice
        const sortedChunks = file.chunks.sort((a, b) => a.index - b.index);
        
        // Concatenar conteúdo
        return sortedChunks.map(chunk => chunk.content).join('\n\n');
    }

    /**
     * Hash simples para gerar IDs
     * @private
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `file_${Math.abs(hash)}`;
    }

    /**
     * Exporta dados agregados
     * @returns {Object} Dados agregados
     */
    getAggregatedData() {
        return this.aggregatedData;
    }

    /**
     * Limpa dados agregados
     */
    clear() {
        this.fileMap.clear();
        this.entityMap.clear();
        this.categoryMap.clear();
        this.aggregatedData = null;
    }
    
    /**
     * Debug: Mostra informações sobre agregação
     */
    debugAggregation() {
        console.log('=== DataAggregator Debug ===');
        console.log(`Total de arquivos únicos: ${this.fileMap.size}`);
        console.log(`Total de entidades: ${this.entityMap.size}`);
        console.log(`Total de categorias: ${this.categoryMap.size}`);
        
        // Mostrar distribuição de chunks por arquivo
        const chunkDistribution = {};
        this.fileMap.forEach((file, id) => {
            const chunkCount = file.chunks.length;
            chunkDistribution[chunkCount] = (chunkDistribution[chunkCount] || 0) + 1;
        });
        
        console.log('\nDistribuição de chunks por arquivo:');
        Object.entries(chunkDistribution)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([chunks, count]) => {
                console.log(`  ${chunks} chunk(s): ${count} arquivo(s)`);
            });
        
        // Mostrar primeiros 5 arquivos
        console.log('\nPrimeiros 5 arquivos:');
        let count = 0;
        this.fileMap.forEach((file, id) => {
            if (count++ < 5) {
                console.log(`  - ${file.name} (${file.chunks.length} chunks, relevância: ${file.relevanceScore}%)`);
            }
        });
    }
}

// Exportar como módulo ES6
export default DataAggregator;

// Também disponibilizar globalmente se necessário
if (typeof window !== 'undefined') {
    window.DataAggregator = DataAggregator;
}