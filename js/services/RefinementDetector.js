/**
 * RefinementDetector.js - Detector de Contexto para Refinamento
 * 
 * Detecta e extrai contexto relevante para refinamento de análises.
 * Identifica padrões, relações e informações que podem melhorar a precisão.
 * 
 * AIDEV-NOTE: context-detector; detecta sinais para refinamento
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class RefinementDetector {
        constructor() {
            // Padrões de detecção
            this.patterns = {
                // Padrões técnicos
                technical: {
                    keywords: ['arquitetura', 'framework', 'algoritmo', 'implementação', 'otimização', 
                              'performance', 'scalability', 'design pattern', 'api', 'microservice'],
                    indicators: ['código', 'função', 'classe', 'método', 'biblioteca'],
                    weight: 0.8
                },
                
                // Padrões de decisão
                decision: {
                    keywords: ['decisão', 'escolha', 'opção', 'alternativa', 'critério', 
                              'avaliação', 'comparação', 'trade-off', 'priorização'],
                    indicators: ['porque', 'portanto', 'considerando', 'baseado em'],
                    weight: 0.9
                },
                
                // Padrões de insight
                insight: {
                    keywords: ['descoberta', 'realização', 'compreensão', 'revelação', 
                              'percepção', 'entendimento', 'clareza', 'epifania'],
                    indicators: ['percebi que', 'entendi que', 'descobri que', 'aprendi que'],
                    weight: 0.85
                },
                
                // Padrões de evolução
                evolution: {
                    keywords: ['evolução', 'mudança', 'transformação', 'progresso', 
                              'desenvolvimento', 'crescimento', 'melhoria', 'avanço'],
                    indicators: ['antes', 'depois', 'agora', 'antigamente', 'atualmente'],
                    weight: 0.75
                },
                
                // Padrões de aprendizado
                learning: {
                    keywords: ['aprendizado', 'lição', 'conhecimento', 'experiência', 
                              'prática', 'estudo', 'compreensão', 'domínio'],
                    indicators: ['aprendi', 'entendi', 'pratiquei', 'estudei'],
                    weight: 0.7
                }
            };

            // Contextos relacionais
            this.relationalContexts = {
                temporal: ['antes', 'depois', 'durante', 'quando', 'enquanto'],
                causal: ['porque', 'devido', 'causa', 'consequência', 'resultado'],
                comparative: ['melhor', 'pior', 'mais', 'menos', 'comparado'],
                conditional: ['se', 'caso', 'quando', 'sempre que', 'desde que']
            };

            // Cache de detecções
            this.detectionCache = new Map();
            this.cacheTimeout = 300000; // 5 minutos
        }

        /**
         * Detecta contexto em um arquivo
         * @param {Object} file - Arquivo para análise
         * @returns {Object} Contexto detectado
         * AIDEV-NOTE: robust-validation; validação robusta com estrutura mínima garantida
         */
        async detectContext(file) {
            try {
                // Validação robusta do arquivo
                if (!file) {
                    Logger?.debug('RefinementDetector', 'Arquivo nulo, retornando contexto vazio');
                    return this.createEmptyContext();
                }
                
                // Garante estrutura mínima do arquivo
                const validFile = {
                    id: file.id || file.name || `temp_${Date.now()}`,
                    name: file.name || 'unknown',
                    content: file.content || '',
                    preview: file.preview || '',
                    categories: file.categories || [],
                    relevanceScore: file.relevanceScore || 0,
                    lastModified: file.lastModified || Date.now(),
                    analysisType: file.analysisType || null,
                    size: file.size || 0,
                    ...file // preserva outros campos
                };
                
                // Verifica cache
                const cacheKey = validFile.id;
                const cached = this.getFromCache(cacheKey);
                if (cached) return cached;

                // Prepara conteúdo para análise
                const content = await this.prepareContent(file);
                if (!content) {
                    return this.createEmptyContext();
                }

                // Detecta diferentes tipos de contexto
                const context = {
                    semantic: [],
                    patterns: {},
                    relations: {},
                    metadata: {},
                    confidence: 0,
                    signals: []
                };

                // 1. Detecta padrões semânticos
                this.detectSemanticPatterns(content, context);
                
                // 2. Detecta relações
                this.detectRelations(content, context);
                
                // 3. Detecta metadados estruturais
                this.detectStructuralMetadata(file, content, context);
                
                // 4. Detecta sinais de qualidade
                this.detectQualitySignals(file, content, context);
                
                // 5. Correlaciona com categorias existentes
                await this.correlateWithCategories(file, context);
                
                // Calcula confiança geral
                context.confidence = this.calculateContextConfidence(context);
                
                // Cacheia resultado
                this.saveToCache(cacheKey, context);
                
                Logger?.debug('RefinementDetector', 'Contexto detectado', {
                    file: file.name,
                    confidence: context.confidence,
                    patterns: Object.keys(context.patterns).length,
                    signals: context.signals.length
                });

                return context;

            } catch (error) {
                Logger?.error('RefinementDetector', 'Erro ao detectar contexto', {
                    file: file?.name,
                    error: error.message
                });
                return this.createEmptyContext();
            }
        }

        /**
         * Prepara conteúdo para análise
         */
        async prepareContent(file) {
            try {
                // Validação básica
                if (!file) return null;
                
                // AIDEV-NOTE: content-access-integration; usa KC.getFileContent se disponível
                // Se KC.getFileContent existe (do fix-content-access), usa ele primeiro
                if (KC.getFileContent && typeof KC.getFileContent === 'function') {
                    const content = await KC.getFileContent(file);
                    if (content && content.length > 10) {
                        return content;
                    }
                }
                
                // Prioridade: content > preview > re-leitura
                if (file.content && typeof file.content === 'string') {
                    return file.content;
                }
                
                if (file.preview && typeof file.preview === 'string') {
                    return file.preview;
                }
                
                // Se tem smartPreview (do PreviewUtils)
                if (file.smartPreview && file.smartPreview.combinedText) {
                    return file.smartPreview.combinedText;
                }
                
                // Tenta re-ler se tem handle
                if (file.handle && typeof file.handle.getFile === 'function') {
                    try {
                        const fileData = await file.handle.getFile();
                        const text = await fileData.text();
                        return text || null;
                    } catch (error) {
                        Logger?.warning('RefinementDetector', 'Erro ao ler arquivo via handle', {
                            file: file.name,
                            error: error.message
                        });
                    }
                }
                
                // Última tentativa: usar o nome do arquivo como conteúdo mínimo
                if (file.name) {
                    return file.name;
                }
                
                return null;
            } catch (error) {
                Logger?.error('RefinementDetector', 'Erro em prepareContent', {
                    file: file?.name,
                    error: error.message
                });
                return null;
            }
        }

        /**
         * Detecta padrões semânticos
         */
        detectSemanticPatterns(content, context) {
            const lowerContent = content.toLowerCase();
            
            Object.entries(this.patterns).forEach(([patternType, pattern]) => {
                const matches = {
                    keywords: 0,
                    indicators: 0,
                    positions: [],
                    excerpts: []
                };
                
                // Conta keywords
                pattern.keywords.forEach(keyword => {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                    const keywordMatches = content.match(regex);
                    if (keywordMatches) {
                        matches.keywords += keywordMatches.length;
                        
                        // Salva posições para contexto
                        let match;
                        while ((match = regex.exec(content)) !== null) {
                            matches.positions.push(match.index);
                            
                            // Extrai trecho ao redor
                            const start = Math.max(0, match.index - 50);
                            const end = Math.min(content.length, match.index + keyword.length + 50);
                            const excerpt = content.substring(start, end).trim();
                            
                            if (excerpt.length > 20) {
                                matches.excerpts.push({
                                    text: excerpt,
                                    keyword,
                                    position: match.index
                                });
                            }
                        }
                    }
                });
                
                // Conta indicators
                pattern.indicators.forEach(indicator => {
                    if (lowerContent.includes(indicator)) {
                        matches.indicators++;
                    }
                });
                
                // Se encontrou matches significativos
                if (matches.keywords > 0 || matches.indicators > 0) {
                    const score = (matches.keywords * 0.7 + matches.indicators * 0.3) * pattern.weight;
                    
                    context.patterns[patternType] = {
                        score,
                        matches: matches.keywords + matches.indicators,
                        weight: pattern.weight,
                        excerpts: matches.excerpts.slice(0, 3) // Top 3 excerpts
                    };
                    
                    // Adiciona ao contexto semântico
                    context.semantic.push({
                        type: 'pattern',
                        pattern: patternType,
                        score,
                        evidence: matches.excerpts.length
                    });
                }
            });
        }

        /**
         * Detecta relações no conteúdo
         */
        detectRelations(content, context) {
            const sentences = this.extractSentences(content);
            
            Object.entries(this.relationalContexts).forEach(([relationType, markers]) => {
                const relations = [];
                
                sentences.forEach(sentence => {
                    const lowerSentence = sentence.toLowerCase();
                    
                    markers.forEach(marker => {
                        if (lowerSentence.includes(marker)) {
                            // Extrai contexto da relação
                            const markerIndex = lowerSentence.indexOf(marker);
                            const before = sentence.substring(0, markerIndex).trim();
                            const after = sentence.substring(markerIndex + marker.length).trim();
                            
                            if (before.length > 10 && after.length > 10) {
                                relations.push({
                                    type: relationType,
                                    marker,
                                    before: before.slice(-50), // Últimos 50 chars
                                    after: after.slice(0, 50),  // Primeiros 50 chars
                                    sentence: sentence.length > 100 ? 
                                             sentence.substring(0, 97) + '...' : sentence
                                });
                            }
                        }
                    });
                });
                
                if (relations.length > 0) {
                    context.relations[relationType] = {
                        count: relations.length,
                        examples: relations.slice(0, 3) // Top 3 exemplos
                    };
                    
                    // Adiciona ao contexto semântico
                    context.semantic.push({
                        type: 'relation',
                        relation: relationType,
                        strength: Math.min(relations.length / 10, 1)
                    });
                }
            });
        }

        /**
         * Detecta metadados estruturais
         */
        detectStructuralMetadata(file, content, context) {
            const metadata = {};
            
            // 1. Estrutura de seções (markdown)
            const headers = content.match(/^#{1,6}\s+.+$/gm);
            if (headers) {
                metadata.sections = headers.length;
                metadata.structure = 'hierarchical';
                context.signals.push({
                    type: 'structure',
                    signal: 'well-organized',
                    confidence: 0.8
                });
            }
            
            // 2. Listas e enumerações
            const lists = content.match(/^[\*\-\+]\s+.+$/gm);
            const numberedLists = content.match(/^\d+\.\s+.+$/gm);
            if (lists || numberedLists) {
                metadata.lists = (lists?.length || 0) + (numberedLists?.length || 0);
                metadata.hasEnumeration = true;
                context.signals.push({
                    type: 'structure',
                    signal: 'enumerated-content',
                    confidence: 0.7
                });
            }
            
            // 3. Código ou comandos
            const codeBlocks = content.match(/```[\s\S]*?```/g);
            const inlineCode = content.match(/`[^`]+`/g);
            if (codeBlocks || inlineCode) {
                metadata.hasCode = true;
                metadata.codeBlocks = codeBlocks?.length || 0;
                metadata.inlineCode = inlineCode?.length || 0;
                context.signals.push({
                    type: 'content',
                    signal: 'technical-content',
                    confidence: 0.9
                });
            }
            
            // 4. Links e referências
            const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
            const urls = content.match(/https?:\/\/[^\s]+/g);
            if (links || urls) {
                metadata.hasReferences = true;
                metadata.referenceCount = (links?.length || 0) + (urls?.length || 0);
                context.signals.push({
                    type: 'content',
                    signal: 'referenced-content',
                    confidence: 0.6
                });
            }
            
            // 5. Densidade de informação
            const words = content.split(/\s+/).length;
            const sentences = this.extractSentences(content).length;
            const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
            
            metadata.density = {
                words,
                sentences,
                avgWordsPerSentence,
                complexity: this.calculateComplexity(avgWordsPerSentence)
            };
            
            context.metadata = metadata;
        }

        /**
         * Detecta sinais de qualidade
         */
        detectQualitySignals(file, content, context) {
            // 1. Tamanho e completude
            if (content.length > 1000) {
                context.signals.push({
                    type: 'quality',
                    signal: 'substantial-content',
                    confidence: 0.7
                });
            }
            
            // 2. Atualização recente
            const daysSinceModified = file.lastModified ? 
                (Date.now() - file.lastModified) / (1000 * 60 * 60 * 24) : Infinity;
            
            if (daysSinceModified < 30) {
                context.signals.push({
                    type: 'quality',
                    signal: 'recently-updated',
                    confidence: 0.8
                });
            }
            
            // 3. Relevância prévia
            if (file.relevanceScore > 0.7) {
                context.signals.push({
                    type: 'quality',
                    signal: 'high-relevance',
                    confidence: file.relevanceScore
                });
            }
            
            // 4. Análise prévia positiva
            if (file.analysisType && file.analysisType !== 'Aprendizado Geral') {
                context.signals.push({
                    type: 'quality',
                    signal: 'significant-type',
                    confidence: 0.85
                });
            }
        }

        /**
         * Correlaciona com categorias existentes
         */
        async correlateWithCategories(file, context) {
            if (!file.categories || file.categories.length === 0) return;
            
            // Mapeia categorias para sinais de contexto
            const categorySignals = {
                'IA/ML': ['machine learning', 'inteligência artificial', 'modelo', 'algoritmo'],
                'Desenvolvimento': ['código', 'programação', 'desenvolvimento', 'software'],
                'Arquitetura': ['design', 'estrutura', 'padrão', 'sistema'],
                'Decisão': ['escolha', 'decisão', 'análise', 'critério'],
                'Estratégia': ['plano', 'objetivo', 'meta', 'visão']
            };
            
            file.categories.forEach(category => {
                // Busca sinais da categoria no conteúdo
                const signals = categorySignals[category] || [category.toLowerCase()];
                let matchCount = 0;
                
                signals.forEach(signal => {
                    if (context.semantic.some(s => s.evidence?.includes(signal))) {
                        matchCount++;
                    }
                });
                
                if (matchCount > 0) {
                    context.semantic.push({
                        type: 'category-alignment',
                        category,
                        alignment: matchCount / signals.length,
                        confidence: 0.9
                    });
                    
                    context.signals.push({
                        type: 'correlation',
                        signal: `aligned-with-${category}`,
                        confidence: 0.85
                    });
                }
            });
        }

        /**
         * Calcula confiança do contexto
         */
        calculateContextConfidence(context) {
            let confidence = 0;
            let factors = 0;
            
            // 1. Padrões detectados
            const patternScores = Object.values(context.patterns)
                .map(p => p.score)
                .reduce((sum, score) => sum + score, 0);
            
            if (patternScores > 0) {
                confidence += Math.min(patternScores / 10, 0.3);
                factors++;
            }
            
            // 2. Relações encontradas
            const relationCount = Object.values(context.relations)
                .map(r => r.count)
                .reduce((sum, count) => sum + count, 0);
            
            if (relationCount > 0) {
                confidence += Math.min(relationCount / 20, 0.2);
                factors++;
            }
            
            // 3. Sinais de qualidade
            const qualitySignals = context.signals
                .filter(s => s.type === 'quality')
                .map(s => s.confidence)
                .reduce((sum, conf) => sum + conf, 0);
            
            if (qualitySignals > 0) {
                confidence += Math.min(qualitySignals / 3, 0.25);
                factors++;
            }
            
            // 4. Alinhamento com categorias
            const categoryAlignment = context.semantic
                .filter(s => s.type === 'category-alignment')
                .map(s => s.alignment)
                .reduce((sum, align) => sum + align, 0);
            
            if (categoryAlignment > 0) {
                confidence += Math.min(categoryAlignment / 2, 0.25);
                factors++;
            }
            
            // Normaliza pela quantidade de fatores
            if (factors > 0) {
                confidence = confidence * (1 + factors * 0.1);
            }
            
            return Math.min(confidence, 1);
        }

        /**
         * Extrai sentenças do conteúdo
         */
        extractSentences(content) {
            // AIDEV-NOTE: sentence-extraction; extração básica de sentenças
            return content
                .split(/[.!?]+/)
                .map(s => s.trim())
                .filter(s => s.length > 10);
        }

        /**
         * Calcula complexidade do texto
         */
        calculateComplexity(avgWordsPerSentence) {
            if (avgWordsPerSentence < 10) return 'simple';
            if (avgWordsPerSentence < 20) return 'moderate';
            if (avgWordsPerSentence < 30) return 'complex';
            return 'very-complex';
        }

        /**
         * Cria contexto vazio
         */
        createEmptyContext() {
            return {
                semantic: [],
                patterns: {},
                relations: {},
                metadata: {},
                confidence: 0,
                signals: []
            };
        }

        /**
         * Busca identificadores de contexto
         * Método auxiliar para detectar contextos específicos
         */
        async findContextualIdentifiers(file) {
            const identifiers = [];
            
            // 1. Identificadores de projeto
            const projectPatterns = [
                /projeto[:\s]+([^,\n]+)/i,
                /mvp[:\s]+([^,\n]+)/i,
                /produto[:\s]+([^,\n]+)/i
            ];
            
            // 2. Identificadores técnicos
            const techPatterns = [
                /tecnologia[:\s]+([^,\n]+)/i,
                /framework[:\s]+([^,\n]+)/i,
                /linguagem[:\s]+([^,\n]+)/i
            ];
            
            // 3. Identificadores temporais
            const timePatterns = [
                /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,
                /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?\d{4}/gi
            ];
            
            const content = await this.prepareContent(file);
            if (!content) return identifiers;
            
            // Busca padrões
            [...projectPatterns, ...techPatterns].forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    identifiers.push({
                        type: 'named-entity',
                        value: matches[1]?.trim(),
                        category: pattern.source.includes('projeto') ? 'project' : 'technical'
                    });
                }
            });
            
            // Busca datas
            timePatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        identifiers.push({
                            type: 'temporal',
                            value: match,
                            category: 'time'
                        });
                    });
                }
            });
            
            return identifiers;
        }

        /**
         * Detecta mudanças significativas entre análises
         * Útil para identificar quando re-análise é necessária
         */
        detectSignificantChanges(previousAnalysis, currentFile) {
            try {
                // AIDEV-NOTE: robust-validation; validação adicional para evitar erros
                const changes = {
                    hasChanges: false,
                    factors: []
                };
                
                // Validações básicas
                if (!currentFile) {
                    return changes;
                }
                
                // 1. Mudança nas categorias
                const prevCategories = previousAnalysis?.analysis?.categories || [];
                const currCategories = currentFile.categories || [];
            
            if (prevCategories.length !== currCategories.length ||
                !prevCategories.every(cat => currCategories.includes(cat))) {
                changes.hasChanges = true;
                changes.factors.push({
                    type: 'categories',
                    change: 'modified',
                    impact: 0.8
                });
            }
            
            // 2. Mudança no conteúdo (se disponível)
            if (currentFile.lastModified && previousAnalysis?.timestamp) {
                if (currentFile.lastModified > previousAnalysis.timestamp) {
                    changes.hasChanges = true;
                    changes.factors.push({
                        type: 'content',
                        change: 'updated',
                        impact: 0.9
                    });
                }
            }
            
            // 3. Mudança na relevância
            const prevRelevance = previousAnalysis?.analysis?.relevanceScore || 0;
            const currRelevance = currentFile.relevanceScore || 0;
            
            if (Math.abs(prevRelevance - currRelevance) > 0.2) {
                changes.hasChanges = true;
                changes.factors.push({
                    type: 'relevance',
                    change: currRelevance > prevRelevance ? 'increased' : 'decreased',
                    impact: 0.6
                });
            }
            
            return changes;
            
            } catch (error) {
                Logger?.debug('RefinementDetector.detectSignificantChanges: Erro tratado', error.message);
                return { hasChanges: false, factors: [] };
            }
        }

        // === Métodos de Cache ===

        getFromCache(key) {
            const cached = this.detectionCache.get(key);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
            this.detectionCache.delete(key);
            return null;
        }

        saveToCache(key, data) {
            this.detectionCache.set(key, {
                data,
                timestamp: Date.now()
            });
            
            // Limita tamanho do cache
            if (this.detectionCache.size > 100) {
                const oldest = Array.from(this.detectionCache.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
                this.detectionCache.delete(oldest[0]);
            }
        }

        clearCache() {
            this.detectionCache.clear();
            Logger?.debug('RefinementDetector', 'Cache limpo');
        }

        /**
         * Obtém estatísticas do detector
         */
        getStats() {
            return {
                cacheSize: this.detectionCache.size,
                patterns: Object.keys(this.patterns).length,
                relationalTypes: Object.keys(this.relationalContexts).length
            };
        }
    }

    // Registra no namespace
    KC.RefinementDetector = new RefinementDetector();

})(window);