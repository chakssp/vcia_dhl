/**
 * ChunkingUtils.js - Utilitário Avançado para Divisão Semântica de Conteúdo
 *
 * Responsável por dividir o conteúdo de texto em chunks semânticos inteligentes,
 * otimizados para sistemas RAG (Retrieval-Augmented Generation)
 * 
 * Estratégias de chunking:
 * - Por estrutura (headers, seções)
 * - Por densidade semântica
 * - Por contexto temporal
 * - Por limite de tokens
 */
(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ChunkingUtils {
        constructor() {
            // Configurações de chunking
            this.config = {
                minChunkSize: 100,      // Mínimo de caracteres por chunk
                maxChunkSize: 1500,     // Máximo de caracteres por chunk
                targetChunkSize: 512,   // Tamanho ideal para embeddings
                overlapSize: 50,        // Sobreposição entre chunks
                semanticThreshold: 0.7  // Threshold para quebra semântica
            };

            // Marcadores de estrutura para Markdown
            this.structureMarkers = {
                headers: /^#{1,6}\s+/m,
                lists: /^[\*\-\+]\s+/m,
                numberedLists: /^\d+\.\s+/m,
                codeBlocks: /^```[\s\S]*?```/m,
                blockquotes: /^>\s+/m,
                horizontalRules: /^---+$/m
            };

            // Palavras que indicam transição/mudança de contexto
            this.transitionWords = [
                'portanto', 'entretanto', 'contudo', 'porém', 'todavia',
                'além disso', 'por outro lado', 'em seguida', 'posteriormente',
                'anteriormente', 'finalmente', 'consequentemente', 'assim'
            ];
        }

        /**
         * Divide o texto em chunks básicos por parágrafos
         * @param {string} content - O conteúdo completo do arquivo
         * @returns {Array<Object>} - Array de chunks
         */
        getChunks(content) {
            if (!content || typeof content !== 'string') {
                return [];
            }

            const paragraphs = content.split(/\n{2,}/);
            return this._processBasicChunks(paragraphs);
        }

        /**
         * Divisão semântica avançada do conteúdo
         * @param {string} content - O conteúdo em markdown ou texto
         * @returns {Array<Object>} - Array de chunks semânticos
         */
        getSemanticChunks(content) {
            if (!content || typeof content !== 'string') {
                return [];
            }

            // KC.Logger?.flow('ChunkingUtils', 'Iniciando chunking semântico'); // Desabilitado para evitar poluição do console

            // 1. Identificar estrutura do documento
            const structure = this._analyzeDocumentStructure(content);
            
            // 2. Aplicar estratégia de chunking baseada na estrutura
            let chunks = [];
            
            if (structure.isMarkdown) {
                chunks = this._chunkMarkdownContent(content, structure);
            } else if (structure.hasLists) {
                chunks = this._chunkListContent(content);
            } else {
                chunks = this._chunkPlainText(content);
            }

            // 3. Otimizar tamanho dos chunks
            chunks = this._optimizeChunkSizes(chunks);

            // 4. Adicionar metadados semânticos
            chunks = this._enrichChunksWithMetadata(chunks, content);

            // KC.Logger?.info('ChunkingUtils', 'Chunking concluído', {
            //     totalChunks: chunks.length,
            //     avgSize: Math.round(chunks.reduce((acc, c) => acc + c.content.length, 0) / chunks.length)
            // }); // Desabilitado para evitar poluição do console

            return chunks;
        }

        /**
         * Analisa a estrutura do documento
         * @private
         */
        _analyzeDocumentStructure(content) {
            return {
                isMarkdown: this.structureMarkers.headers.test(content),
                hasLists: this.structureMarkers.lists.test(content) || 
                         this.structureMarkers.numberedLists.test(content),
                hasCode: this.structureMarkers.codeBlocks.test(content),
                hasQuotes: this.structureMarkers.blockquotes.test(content),
                sections: this._identifySections(content),
                totalLength: content.length
            };
        }

        /**
         * Identifica seções do documento
         * @private
         */
        _identifySections(content) {
            const sections = [];
            const lines = content.split('\n');
            let currentSection = null;
            let sectionStart = 0;

            lines.forEach((line, index) => {
                if (this.structureMarkers.headers.test(line)) {
                    if (currentSection) {
                        currentSection.end = index - 1;
                        sections.push(currentSection);
                    }
                    
                    const level = (line.match(/^#+/) || [''])[0].length;
                    currentSection = {
                        title: line.replace(/^#+\s*/, ''),
                        level: level,
                        start: index,
                        end: null
                    };
                }
            });

            if (currentSection) {
                currentSection.end = lines.length - 1;
                sections.push(currentSection);
            }

            return sections;
        }

        /**
         * Chunking específico para Markdown
         * @private
         */
        _chunkMarkdownContent(content, structure) {
            const chunks = [];
            const lines = content.split('\n');

            if (structure.sections.length > 0) {
                // Chunking por seções
                structure.sections.forEach((section, sectionIndex) => {
                    const sectionContent = lines.slice(section.start, section.end + 1).join('\n');
                    
                    // Se a seção for muito grande, subdividir
                    if (sectionContent.length > this.config.maxChunkSize) {
                        const subChunks = this._splitLargeSection(sectionContent, section);
                        chunks.push(...subChunks);
                    } else if (sectionContent.length >= this.config.minChunkSize) {
                        chunks.push({
                            id: `section-${sectionIndex}`,
                            content: sectionContent,
                            type: 'section',
                            metadata: {
                                title: section.title,
                                level: section.level,
                                position: sectionIndex
                            }
                        });
                    }
                });
            } else {
                // Fallback para chunking por parágrafos
                return this._chunkPlainText(content);
            }

            return chunks;
        }

        /**
         * Divide seções grandes em chunks menores
         * @private
         */
        _splitLargeSection(sectionContent, sectionInfo) {
            const chunks = [];
            const paragraphs = sectionContent.split(/\n{2,}/);
            let currentChunk = {
                content: '',
                paragraphs: []
            };

            paragraphs.forEach((para, index) => {
                const trimmedPara = para.trim();
                
                if (currentChunk.content.length + trimmedPara.length > this.config.maxChunkSize) {
                    // Salvar chunk atual
                    if (currentChunk.content.length >= this.config.minChunkSize) {
                        chunks.push({
                            id: `section-${sectionInfo.title}-chunk-${chunks.length}`,
                            content: currentChunk.content,
                            type: 'section-part',
                            metadata: {
                                sectionTitle: sectionInfo.title,
                                sectionLevel: sectionInfo.level,
                                partNumber: chunks.length + 1,
                                paragraphCount: currentChunk.paragraphs.length
                            }
                        });
                    }
                    
                    // Iniciar novo chunk com sobreposição
                    const overlap = this._getOverlapText(currentChunk.content);
                    currentChunk = {
                        content: overlap + '\n\n' + trimmedPara,
                        paragraphs: [index]
                    };
                } else {
                    // Adicionar ao chunk atual
                    if (currentChunk.content) {
                        currentChunk.content += '\n\n';
                    }
                    currentChunk.content += trimmedPara;
                    currentChunk.paragraphs.push(index);
                }
            });

            // Adicionar último chunk
            if (currentChunk.content.length >= this.config.minChunkSize) {
                chunks.push({
                    id: `section-${sectionInfo.title}-chunk-${chunks.length}`,
                    content: currentChunk.content,
                    type: 'section-part',
                    metadata: {
                        sectionTitle: sectionInfo.title,
                        sectionLevel: sectionInfo.level,
                        partNumber: chunks.length + 1,
                        paragraphCount: currentChunk.paragraphs.length
                    }
                });
            }

            return chunks;
        }

        /**
         * Chunking para conteúdo com listas
         * @private
         */
        _chunkListContent(content) {
            const chunks = [];
            const segments = content.split(/\n(?=[\*\-\+\d]\.\s)/);

            segments.forEach((segment, index) => {
                const trimmedSegment = segment.trim();
                
                if (trimmedSegment.length >= this.config.minChunkSize) {
                    chunks.push({
                        id: `list-chunk-${index}`,
                        content: trimmedSegment,
                        type: 'list',
                        metadata: {
                            position: index,
                            isNumbered: /^\d+\.\s/.test(trimmedSegment)
                        }
                    });
                }
            });

            return chunks;
        }

        /**
         * Chunking para texto simples
         * @private
         */
        _chunkPlainText(content) {
            const chunks = [];
            const sentences = this._splitIntoSentences(content);
            let currentChunk = {
                content: '',
                sentences: []
            };

            sentences.forEach((sentence, index) => {
                const wouldExceedMax = currentChunk.content.length + sentence.length > this.config.maxChunkSize;
                const hasTransition = this._hasTransitionWord(sentence);
                
                // Decidir se deve quebrar o chunk
                if (wouldExceedMax || (hasTransition && currentChunk.content.length > this.config.targetChunkSize)) {
                    // Salvar chunk atual
                    if (currentChunk.content.length >= this.config.minChunkSize) {
                        chunks.push({
                            id: `text-chunk-${chunks.length}`,
                            content: currentChunk.content,
                            type: 'text',
                            metadata: {
                                sentenceCount: currentChunk.sentences.length,
                                position: chunks.length
                            }
                        });
                    }
                    
                    // Novo chunk com sobreposição
                    const overlap = this._getOverlapText(currentChunk.content);
                    currentChunk = {
                        content: overlap + ' ' + sentence,
                        sentences: [index]
                    };
                } else {
                    // Adicionar ao chunk atual
                    currentChunk.content += (currentChunk.content ? ' ' : '') + sentence;
                    currentChunk.sentences.push(index);
                }
            });

            // Adicionar último chunk
            if (currentChunk.content.length >= this.config.minChunkSize) {
                chunks.push({
                    id: `text-chunk-${chunks.length}`,
                    content: currentChunk.content,
                    type: 'text',
                    metadata: {
                        sentenceCount: currentChunk.sentences.length,
                        position: chunks.length
                    }
                });
            }

            return chunks;
        }

        /**
         * Divide texto em sentenças
         * @private
         */
        _splitIntoSentences(text) {
            // Regex melhorado para português
            const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;
            const matches = text.match(sentenceRegex) || [];
            
            return matches.map(s => s.trim()).filter(s => s.length > 0);
        }

        /**
         * Verifica se sentença contém palavra de transição
         * @private
         */
        _hasTransitionWord(sentence) {
            const lowerSentence = sentence.toLowerCase();
            return this.transitionWords.some(word => lowerSentence.includes(word));
        }

        /**
         * Obtém texto de sobreposição
         * @private
         */
        _getOverlapText(content) {
            if (content.length <= this.config.overlapSize) {
                return content;
            }

            // Pegar últimas palavras até o limite de sobreposição
            const words = content.split(/\s+/);
            const overlapWords = [];
            let overlapLength = 0;

            for (let i = words.length - 1; i >= 0 && overlapLength < this.config.overlapSize; i--) {
                overlapWords.unshift(words[i]);
                overlapLength += words[i].length + 1;
            }

            return overlapWords.join(' ');
        }

        /**
         * Otimiza tamanhos dos chunks
         * @private
         */
        _optimizeChunkSizes(chunks) {
            const optimized = [];

            chunks.forEach((chunk, index) => {
                // Se chunk muito pequeno, tentar combinar com anterior
                if (chunk.content.length < this.config.minChunkSize && optimized.length > 0) {
                    const lastChunk = optimized[optimized.length - 1];
                    
                    if (lastChunk.content.length + chunk.content.length <= this.config.maxChunkSize) {
                        // Combinar chunks
                        lastChunk.content += '\n\n' + chunk.content;
                        lastChunk.metadata.combined = true;
                        lastChunk.metadata.combinedWith = chunk.id;
                        return;
                    }
                }

                // Se chunk muito grande, dividir
                if (chunk.content.length > this.config.maxChunkSize) {
                    const subChunks = this._splitOversizedChunk(chunk);
                    optimized.push(...subChunks);
                } else {
                    optimized.push(chunk);
                }
            });

            return optimized;
        }

        /**
         * Divide chunk muito grande
         * @private
         */
        _splitOversizedChunk(chunk) {
            const subChunks = [];
            const words = chunk.content.split(/\s+/);
            let currentContent = '';
            let wordCount = 0;

            words.forEach(word => {
                if (currentContent.length + word.length > this.config.targetChunkSize) {
                    subChunks.push({
                        id: `${chunk.id}-sub-${subChunks.length}`,
                        content: currentContent.trim(),
                        type: chunk.type,
                        metadata: {
                            ...chunk.metadata,
                            isSubChunk: true,
                            parentChunk: chunk.id,
                            subChunkIndex: subChunks.length
                        }
                    });
                    
                    currentContent = word;
                } else {
                    currentContent += (currentContent ? ' ' : '') + word;
                }
            });

            // Adicionar último sub-chunk
            if (currentContent.trim()) {
                subChunks.push({
                    id: `${chunk.id}-sub-${subChunks.length}`,
                    content: currentContent.trim(),
                    type: chunk.type,
                    metadata: {
                        ...chunk.metadata,
                        isSubChunk: true,
                        parentChunk: chunk.id,
                        subChunkIndex: subChunks.length
                    }
                });
            }

            return subChunks;
        }

        /**
         * Enriquece chunks com metadados semânticos
         * @private
         */
        _enrichChunksWithMetadata(chunks, fullContent) {
            const totalChunks = chunks.length;
            const keywords = this._extractKeywords(fullContent);

            return chunks.map((chunk, index) => {
                const enrichedChunk = { ...chunk };
                
                // Adicionar metadados contextuais
                enrichedChunk.metadata = {
                    ...enrichedChunk.metadata,
                    position: index,
                    totalChunks: totalChunks,
                    relativePosition: index / totalChunks,
                    length: chunk.content.length,
                    wordCount: chunk.content.split(/\s+/).length,
                    
                    // Densidade semântica
                    semanticDensity: this._calculateSemanticDensity(chunk.content, keywords),
                    
                    // Indicadores de contexto
                    isBeginning: index === 0,
                    isEnd: index === totalChunks - 1,
                    isMiddle: index > 0 && index < totalChunks - 1,
                    
                    // Keywords presentes
                    presentKeywords: this._findPresentKeywords(chunk.content, keywords),
                    
                    // Tipo de conteúdo detectado
                    contentFeatures: this._detectContentFeatures(chunk.content)
                };

                return enrichedChunk;
            });
        }

        /**
         * Processa chunks básicos
         * @private
         */
        _processBasicChunks(paragraphs) {
            return paragraphs.map((p, index) => {
                const trimmedParagraph = p.trim();
                if (trimmedParagraph.length === 0) {
                    return null;
                }

                return {
                    id: `chunk-${index}`,
                    content: trimmedParagraph,
                    type: 'paragraph',
                    position: index,
                    length: trimmedParagraph.length,
                    metadata: {
                        wordCount: trimmedParagraph.split(/\s+/).length
                    }
                };
            }).filter(Boolean);
        }

        /**
         * Extrai keywords do conteúdo usando KeywordExtractor inteligente
         * @private
         */
        _extractKeywords(content) {
            // Usar o novo KeywordExtractor se disponível
            if (KC.KeywordExtractor) {
                const extractor = new KC.KeywordExtractor();
                const result = extractor.extract(content);
                return result.keywords || [];
            }
            
            // Fallback para o método antigo (melhorado)
            const words = content.toLowerCase()
                .normalize("NFD") // Preservar estrutura dos acentos
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')  // Preserva TODOS os caracteres UTF-8 com acentos
                .split(/\s+/)
                .filter(word => word.length > 4);

            const frequency = {};
            words.forEach(word => {
                frequency[word] = (frequency[word] || 0) + 1;
            });

            return Object.entries(frequency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20)
                .map(([word]) => word);
        }

        /**
         * Calcula densidade semântica
         * @private
         */
        _calculateSemanticDensity(content, keywords) {
            const contentLower = content.toLowerCase();
            let keywordCount = 0;

            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'g');
                const matches = contentLower.match(regex);
                if (matches) {
                    keywordCount += matches.length;
                }
            });

            const wordCount = content.split(/\s+/).length;
            return wordCount > 0 ? keywordCount / wordCount : 0;
        }

        /**
         * Encontra keywords presentes no chunk
         * @private
         */
        _findPresentKeywords(content, keywords) {
            const contentLower = content.toLowerCase();
            return keywords.filter(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`);
                return regex.test(contentLower);
            });
        }

        /**
         * Detecta características do conteúdo
         * @private
         */
        _detectContentFeatures(content) {
            return {
                hasCode: /```[\s\S]*?```|`[^`]+`/.test(content),
                hasLinks: /\[([^\]]+)\]\(([^)]+)\)/.test(content),
                hasEmphasis: /\*\*[^*]+\*\*|__[^_]+__/.test(content),
                hasList: /^[\*\-\+]\s+/m.test(content),
                hasNumbers: /\b\d+\b/.test(content),
                hasQuotes: /["']([^"']+)["']/.test(content),
                sentiment: this._detectSentiment(content)
            };
        }

        /**
         * Detecção simples de sentimento
         * @private
         */
        _detectSentiment(content) {
            const positive = ['sucesso', 'excelente', 'ótimo', 'positivo', 'ganho', 'vitória', 'conquista'];
            const negative = ['problema', 'erro', 'falha', 'negativo', 'perda', 'dificuldade', 'desafio'];
            
            const contentLower = content.toLowerCase();
            let score = 0;

            positive.forEach(word => {
                if (contentLower.includes(word)) score++;
            });

            negative.forEach(word => {
                if (contentLower.includes(word)) score--;
            });

            if (score > 0) return 'positive';
            if (score < 0) return 'negative';
            return 'neutral';
        }
    }

    KC.ChunkingUtils = new ChunkingUtils();
    KC.Logger?.info('ChunkingUtils', 'Utilitário de chunking semântico inicializado');

})(window);