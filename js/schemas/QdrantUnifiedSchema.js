/**
 * QdrantUnifiedSchema.js - ESTRUTURA DEFINITIVA PARA QDRANT
 * 
 * Unifica:
 * - Schema.org (Thing, CreativeWork, DigitalDocument)
 * - Relevância Semântica (cluster, entidade, analysisType, categorias)
 * - Triple Schema Semântica (sujeito-predicado-objeto)
 * - Sistema de Convergência e Insights
 * - Integração com PrefixCache
 * 
 * @version 2.0.0 - DEFINITIVA
 * @date 29/01/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class QdrantUnifiedSchema {
        constructor() {
            this.version = '2.0.0';
            this.collectionName = 'knowledge_consolidator';
            this.vectorDimensions = 768; // Ollama nomic-embed-text
            
            // Schema definitivo para cada ponto no Qdrant
            this.pointSchema = {
                // ========================================
                // CAMPOS PRIMÁRIOS (não em metadata!)
                // ========================================
                
                // 1. IDENTIFICAÇÃO ÚNICA
                id: 'number', // ID numérico único (timestamp + index)
                originalFileId: 'string', // ID original do arquivo
                originalChunkId: 'string', // ID original do chunk
                
                // 2. SCHEMA.ORG - Estrutura Semântica Web
                '@context': 'https://schema.org',
                '@type': ['Thing', 'CreativeWork', 'DigitalDocument'],
                
                // Schema.org - Propriedades básicas
                name: 'string', // Nome do arquivo
                description: 'string', // Preview inteligente ou resumo
                dateCreated: 'datetime', // Data de criação
                dateModified: 'datetime', // Data de modificação
                datePublished: 'datetime', // Data de descoberta/processamento
                
                // Schema.org - Autoria e fonte
                author: {
                    '@type': 'Person',
                    name: 'string', // Extraído ou inferido
                    identifier: 'string'
                },
                
                // Schema.org - Conteúdo
                text: 'string', // Conteúdo do chunk (limitado a 5KB)
                headline: 'string', // Primeira linha significativa
                keywords: ['string'], // Palavras-chave extraídas
                
                // 3. RELEVÂNCIA SEMÂNTICA - CAMPOS CRÍTICOS
                analysisType: 'string', // CRÍTICO! Campo principal para clustering
                // Valores: 'Breakthrough Técnico', 'Evolução Conceitual', 
                //          'Momento Decisivo', 'Insight Estratégico', 'Aprendizado Geral'
                
                relevanceScore: 'number', // Score de relevância (0-100)
                convergenceScore: 'number', // Score de convergência semântica
                
                // 4. CLUSTERING E ENTIDADES
                cluster: {
                    id: 'string', // ID do cluster semântico
                    name: 'string', // Nome do cluster
                    confidence: 'number' // Confiança da atribuição
                },
                
                entities: [{
                    type: 'string', // Tipo da entidade (Person, Organization, Technology, etc)
                    value: 'string', // Valor da entidade
                    confidence: 'number' // Confiança da extração
                }],
                
                // 5. CATEGORIZAÇÃO HUMANA (Ground Truth)
                categories: ['string'], // Categorias atribuídas pelo usuário
                categoriesCount: 'number', // Número de categorias
                humanValidated: 'boolean', // Se foi validado por humano
                
                // 6. SISTEMA DE TRIPLAS SEMÂNTICAS
                triples: [{
                    subject: 'string', // Sujeito (geralmente o arquivo/chunk)
                    predicate: 'string', // Predicado (relação)
                    object: 'string', // Objeto (valor ou outra entidade)
                    confidence: 'number', // Confiança da tripla
                    source: 'string' // Origem (user, ai, system)
                }],
                
                // 7. PREDICADOS E RELAÇÕES
                predicates: {
                    // Predicados de conteúdo
                    contains: ['string'], // O que o documento contém
                    mentions: ['string'], // O que é mencionado
                    discusses: ['string'], // O que é discutido
                    
                    // Predicados de relação
                    relatesTo: ['string'], // Com o que se relaciona
                    contradicts: ['string'], // O que contradiz
                    supports: ['string'], // O que suporta
                    
                    // Predicados temporais
                    precedes: ['string'], // O que precede
                    follows: ['string'], // O que segue
                    contemporaryWith: ['string'] // Contemporâneo com
                },
                
                // 8. INSIGHTS E CONVERGÊNCIA
                insights: [{
                    type: 'string', // Tipo do insight
                    content: 'string', // Conteúdo do insight
                    confidence: 'number', // Confiança
                    relatedFiles: ['string'] // Arquivos relacionados
                }],
                
                convergenceChains: [{
                    chainId: 'string', // ID da cadeia de convergência
                    theme: 'string', // Tema da convergência
                    strength: 'number', // Força da convergência
                    participants: ['string'] // Participantes da cadeia
                }],
                
                // 9. SISTEMA E PROCESSAMENTO
                system: {
                    processedAt: 'datetime', // Quando foi processado
                    processedBy: 'string', // Quem/o que processou
                    processingVersion: 'string', // Versão do processamento
                    
                    // Flags de estado
                    approved: 'boolean', // Aprovado pelo usuário
                    analyzed: 'boolean', // Analisado por IA
                    archived: 'boolean', // Arquivado
                    inQdrant: 'boolean', // Está no Qdrant
                    
                    // Metadados técnicos
                    chunkIndex: 'number', // Índice do chunk
                    totalChunks: 'number', // Total de chunks do arquivo
                    contentLength: 'number', // Tamanho original do conteúdo
                    
                    // Origem
                    sourcePath: 'string', // Caminho original
                    sourceExtension: 'string', // Extensão do arquivo
                    sourceSize: 'number' // Tamanho do arquivo
                },
                
                // 10. INTEGRAÇÃO COM PREFIXCACHE
                prefixIntegration: {
                    hasPrefix: 'boolean', // Se tem prefix no cache
                    prefixId: 'string', // ID do prefix se existir
                    prefixScore: 'number', // Score do prefix match
                    prefixVector: 'array' // Vetor 384d do prefix se aplicável
                },
                
                // 11. VETOR DE EMBEDDING
                vector: 'array[768]', // Vetor de embedding (Ollama)
                
                // 12. METADATA ADICIONAL (para extensibilidade)
                metadata: {
                    // Campos adicionais que podem ser adicionados
                    // sem quebrar a estrutura principal
                }
            };
            
            // Configuração de índices para busca eficiente
            this.indexes = [
                'analysisType', // CRÍTICO para clustering
                'categories', // Para busca por categoria
                'relevanceScore', // Para filtros de relevância
                'convergenceScore', // Para cadeias de convergência
                'cluster.id', // Para agrupamento
                'system.processedAt', // Para ordenação temporal
                'system.approved', // Para filtros de estado
                'entities.type', // Para busca por entidade
                'predicates.contains' // Para busca por conteúdo
            ];
        }
        
        /**
         * Gera payload completo para inserção no Qdrant
         */
        generatePayload(file, chunk, chunkIndex, embedding) {
            const now = new Date().toISOString();
            
            return {
                // Identificação
                originalFileId: file.id,
                originalChunkId: `${file.id}_chunk_${chunkIndex}`,
                
                // Schema.org
                '@context': 'https://schema.org',
                '@type': ['Thing', 'CreativeWork', 'DigitalDocument'],
                name: file.name,
                description: file.smartPreview || chunk.content.substring(0, 200),
                dateCreated: file.createdAt || file.lastModified,
                dateModified: file.lastModified,
                datePublished: now,
                
                // Autor (extrair se possível)
                author: this.extractAuthor(chunk.content, file),
                
                // Conteúdo
                text: chunk.content.substring(0, 5000), // Limitar a 5KB
                headline: this.extractHeadline(chunk.content),
                keywords: this.extractKeywords(chunk.content),
                
                // RELEVÂNCIA SEMÂNTICA - CRÍTICO!
                analysisType: file.analysisType || 'Aprendizado Geral',
                relevanceScore: file.relevanceScore || 0,
                convergenceScore: this.calculateConvergenceScore(file),
                
                // Clustering
                cluster: this.assignCluster(file, chunk),
                entities: this.extractEntities(chunk.content),
                
                // Categorização
                categories: file.categories || [],
                categoriesCount: (file.categories || []).length,
                humanValidated: file.approved || false,
                
                // Triplas semânticas
                triples: this.extractTriples(file, chunk),
                
                // Predicados
                predicates: this.extractPredicates(chunk.content),
                
                // Insights (será preenchido após processamento)
                insights: [],
                convergenceChains: [],
                
                // Sistema
                system: {
                    processedAt: now,
                    processedBy: 'QdrantUnifiedSchema v2.0',
                    processingVersion: this.version,
                    
                    approved: file.approved || false,
                    analyzed: file.analyzed || false,
                    archived: file.archived || false,
                    inQdrant: true,
                    
                    chunkIndex: chunkIndex,
                    totalChunks: chunk.totalChunks || 1,
                    contentLength: chunk.content.length,
                    
                    sourcePath: file.path,
                    sourceExtension: file.extension,
                    sourceSize: file.size
                },
                
                // PrefixCache (verificar se existe)
                prefixIntegration: this.checkPrefixIntegration(chunk.content),
                
                // Metadata extensível
                metadata: {
                    fileFingerprint: file.fingerprint,
                    discoveredAt: file.discoveredAt,
                    ...chunk.metadata
                }
            };
        }
        
        /**
         * Calcula score de convergência baseado em categorias e analysisType
         */
        calculateConvergenceScore(file) {
            let score = file.relevanceScore || 0;
            
            // +5% por categoria (ground truth humano)
            score += (file.categories?.length || 0) * 5;
            
            // +10% se tem analysisType significativo
            if (file.analysisType && file.analysisType !== 'Aprendizado Geral') {
                score += 10;
            }
            
            return Math.min(score, 100);
        }
        
        /**
         * Extrai autor do conteúdo se possível
         */
        extractAuthor(content, file) {
            // Lógica para extrair autor (pode ser expandida)
            const authorMatch = content.match(/(?:autor|author|por|by):\s*([^\n]+)/i);
            
            return {
                '@type': 'Person',
                name: authorMatch ? authorMatch[1].trim() : 'Unknown',
                identifier: file.path
            };
        }
        
        /**
         * Extrai headline (primeira linha significativa)
         */
        extractHeadline(content) {
            const lines = content.split('\n').filter(l => l.trim().length > 10);
            return lines[0] || content.substring(0, 100);
        }
        
        /**
         * Extrai palavras-chave do conteúdo
         */
        extractKeywords(content) {
            // Palavras importantes para o domínio
            const domainKeywords = [
                'decisão', 'insight', 'breakthrough', 'transformação',
                'aprendizado', 'estratégia', 'projeto', 'implementação',
                'análise', 'solução', 'problema', 'oportunidade'
            ];
            
            const found = [];
            const lowerContent = content.toLowerCase();
            
            domainKeywords.forEach(keyword => {
                if (lowerContent.includes(keyword)) {
                    found.push(keyword);
                }
            });
            
            return found;
        }
        
        /**
         * Atribui cluster baseado em analysisType e conteúdo
         */
        assignCluster(file, chunk) {
            const clusters = {
                'Breakthrough Técnico': { id: 'tech-breakthrough', name: 'Avanços Técnicos' },
                'Evolução Conceitual': { id: 'concept-evolution', name: 'Evolução de Conceitos' },
                'Momento Decisivo': { id: 'decisive-moment', name: 'Momentos Decisivos' },
                'Insight Estratégico': { id: 'strategic-insight', name: 'Insights Estratégicos' },
                'Aprendizado Geral': { id: 'general-learning', name: 'Aprendizados Gerais' }
            };
            
            const cluster = clusters[file.analysisType] || clusters['Aprendizado Geral'];
            
            return {
                id: cluster.id,
                name: cluster.name,
                confidence: file.analysisType ? 0.9 : 0.5
            };
        }
        
        /**
         * Extrai entidades do conteúdo
         */
        extractEntities(content) {
            const entities = [];
            
            // Tecnologias
            const techPatterns = /\b(React|Vue|Angular|Node|Python|Docker|Kubernetes|AI|ML|LLM|RAG|Qdrant)\b/gi;
            const techMatches = content.match(techPatterns) || [];
            techMatches.forEach(tech => {
                if (!entities.find(e => e.value === tech)) {
                    entities.push({
                        type: 'Technology',
                        value: tech,
                        confidence: 0.8
                    });
                }
            });
            
            // Adicionar mais extratores conforme necessário
            
            return entities;
        }
        
        /**
         * Extrai triplas semânticas
         */
        extractTriples(file, chunk) {
            const triples = [];
            
            // Tripla básica: arquivo contém conteúdo
            triples.push({
                subject: file.name,
                predicate: 'contains',
                object: chunk.content.substring(0, 100) + '...',
                confidence: 1.0,
                source: 'system'
            });
            
            // Tripla de categorização
            file.categories?.forEach(category => {
                triples.push({
                    subject: file.name,
                    predicate: 'belongsToCategory',
                    object: category,
                    confidence: 1.0,
                    source: 'user'
                });
            });
            
            // Tripla de análise
            if (file.analysisType) {
                triples.push({
                    subject: file.name,
                    predicate: 'hasAnalysisType',
                    object: file.analysisType,
                    confidence: 0.9,
                    source: 'ai'
                });
            }
            
            return triples;
        }
        
        /**
         * Extrai predicados do conteúdo
         */
        extractPredicates(content) {
            const predicates = {
                contains: [],
                mentions: [],
                discusses: [],
                relatesTo: [],
                contradicts: [],
                supports: [],
                precedes: [],
                follows: [],
                contemporaryWith: []
            };
            
            // Lógica básica - pode ser expandida com NLP
            const keywords = this.extractKeywords(content);
            predicates.contains = keywords;
            
            // Detectar menções
            const mentionPatterns = /menciona|cita|referencia|aponta/gi;
            if (mentionPatterns.test(content)) {
                predicates.mentions.push('referências externas');
            }
            
            return predicates;
        }
        
        /**
         * Verifica integração com PrefixCache
         */
        checkPrefixIntegration(content) {
            // Por enquanto retorna estrutura vazia
            // Será implementado quando integrarmos com PrefixCache
            return {
                hasPrefix: false,
                prefixId: null,
                prefixScore: 0,
                prefixVector: null
            };
        }
        
        /**
         * Valida se um payload está completo
         */
        validatePayload(payload) {
            const requiredFields = [
                'originalFileId',
                'analysisType', // CRÍTICO!
                'name',
                'text',
                'relevanceScore',
                'categories',
                'system'
            ];
            
            const missing = requiredFields.filter(field => !payload[field]);
            
            if (missing.length > 0) {
                console.warn('Payload incompleto, campos faltando:', missing);
                return false;
            }
            
            return true;
        }
    }

    // Registrar no KC
    KC.QdrantUnifiedSchema = new QdrantUnifiedSchema();
    
    // Expor globalmente para debug
    window.QdrantUnifiedSchema = QdrantUnifiedSchema;

})(window);