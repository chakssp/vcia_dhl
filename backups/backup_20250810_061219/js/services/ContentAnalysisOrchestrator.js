/**
 * ContentAnalysisOrchestrator.js
 * 
 * Orquestrador inteligente para análise multi-dimensional de conteúdo
 * Trata arquivos não-processáveis como "território inexplorado" com valor potencial
 * 
 * @author Brito & Claude
 * @date 10/08/2025
 * @paradigm CONVERGÊNCIA SEMÂNTICA NAVEGÁVEL
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ContentAnalysisOrchestrator {
        constructor() {
            this.extractors = new Map();
            this.scoringStrategies = new Map();
            this.metadataEnrichers = [];
            
            // Registro de capacidades de extração
            this.capabilities = {
                '.md': { supported: true, extractor: 'markdown', confidence: 0.95 },
                '.txt': { supported: true, extractor: 'plaintext', confidence: 0.98 },
                '.pdf': { supported: false, extractor: 'pending_ocr', confidence: 0 },
                '.docx': { supported: false, extractor: 'pending_parser', confidence: 0 },
                '.xlsx': { supported: false, extractor: 'pending_tabular', confidence: 0 },
                '.pst': { supported: false, extractor: 'pending_email', confidence: 0 },
                '.doc': { supported: false, extractor: 'pending_legacy', confidence: 0 },
                '.pptx': { supported: false, extractor: 'pending_presentation', confidence: 0 },
                '.html': { supported: true, extractor: 'html', confidence: 0.85 },
                '.json': { supported: true, extractor: 'structured', confidence: 0.90 }
            };

            // Pesos para scoring multi-dimensional
            this.scoringWeights = {
                content: 0.4,      // 40% - conteúdo extraído
                metadata: 0.2,     // 20% - metadados do arquivo
                context: 0.15,     // 15% - contexto (pasta, vizinhança)
                temporal: 0.15,    // 15% - relevância temporal
                potential: 0.1     // 10% - potencial não explorado
            };

            this.initializeExtractors();
            this.initializeScoringStrategies();
        }

        /**
         * Análise completa multi-dimensional
         * NUNCA descarta arquivo com 0% - analisa POTENCIAL
         */
        async analyzeFile(file) {
            const analysis = {
                // Identificação
                id: file.id || this.generateId(file),
                fileName: file.name,
                filePath: file.path,
                fileType: this.getFileExtension(file.name),
                
                // Timestamps
                analyzedAt: new Date().toISOString(),
                modifiedAt: file.lastModified,
                
                // Capacidade de extração
                extraction: await this.assessExtractionCapability(file),
                
                // Scores multi-dimensionais
                scores: await this.calculateMultiDimensionalScores(file),
                
                // Metadados enriquecidos
                metadata: await this.enrichMetadata(file),
                
                // Status de processamento
                processingStatus: this.determineProcessingStatus(file),
                
                // Convergência potencial
                convergencePotential: await this.assessConvergencePotential(file),
                
                // Ações recomendadas
                recommendations: this.generateRecommendations(file)
            };

            // CRÍTICO: Preservar informação sobre arquivos não-processáveis
            if (analysis.extraction.supported === false) {
                analysis.placeholderContent = this.generatePlaceholderContent(file);
                analysis.futureProcessingPriority = this.calculateProcessingPriority(file);
            }

            return analysis;
        }

        /**
         * Avalia capacidade de extração para o arquivo
         */
        async assessExtractionCapability(file) {
            const extension = this.getFileExtension(file.name);
            const capability = this.capabilities[extension] || {
                supported: false,
                extractor: 'unknown',
                confidence: 0
            };

            // Tentar extração se suportado
            let extractedContent = null;
            let extractionError = null;

            if (capability.supported) {
                try {
                    const extractor = this.extractors.get(capability.extractor);
                    if (extractor) {
                        extractedContent = await extractor(file);
                    }
                } catch (error) {
                    extractionError = error.message;
                    capability.confidence = 0;
                }
            }

            return {
                ...capability,
                extractedContent,
                extractionError,
                contentLength: extractedContent ? extractedContent.length : 0,
                requiresFutureImplementation: !capability.supported,
                extractionTimestamp: new Date().toISOString()
            };
        }

        /**
         * Calcula scores multi-dimensionais
         * INOVAÇÃO: Score mesmo sem conteúdo extraído
         */
        async calculateMultiDimensionalScores(file) {
            const scores = {
                // Score de conteúdo (0 se não extraído, mas NÃO é score final!)
                content: 0,
                
                // Score de metadados (SEMPRE calculável)
                metadata: this.calculateMetadataScore(file),
                
                // Score de contexto (baseado em localização e vizinhança)
                context: await this.calculateContextScore(file),
                
                // Score temporal (relevância baseada em data)
                temporal: this.calculateTemporalScore(file),
                
                // Score de potencial (baseado no tipo de arquivo)
                potential: this.calculatePotentialScore(file),
                
                // Score composto final
                composite: 0
            };

            // Se temos conteúdo extraído, calcular score de conteúdo
            const extraction = await this.assessExtractionCapability(file);
            if (extraction.extractedContent) {
                scores.content = await this.calculateContentScore(extraction.extractedContent);
            }

            // Calcular score composto com pesos
            scores.composite = this.calculateCompositeScore(scores);
            
            // NUNCA retornar 0 se houver QUALQUER sinal de valor
            if (scores.composite === 0 && (scores.metadata > 0 || scores.potential > 0)) {
                scores.composite = 1; // Mínimo 1% para indicar "existe mas não processado"
            }

            return scores;
        }

        /**
         * Score baseado em metadados do arquivo
         */
        calculateMetadataScore(file) {
            let score = 0;
            
            // Nome do arquivo
            const nameSignals = ['important', 'critical', 'projeto', 'proposal', 'contract', 'presentation'];
            const nameLower = file.name.toLowerCase();
            nameSignals.forEach(signal => {
                if (nameLower.includes(signal)) score += 10;
            });

            // Tamanho (arquivos maiores podem ter mais conteúdo)
            if (file.size > 1024 * 1024) score += 10; // > 1MB
            if (file.size > 10 * 1024 * 1024) score += 20; // > 10MB

            // Estrutura de pastas
            const pathSignals = ['projetos', 'work', 'important', 'backup', 'documents'];
            const pathLower = (file.path || '').toLowerCase();
            pathSignals.forEach(signal => {
                if (pathLower.includes(signal)) score += 15;
            });

            return Math.min(score, 100);
        }

        /**
         * Score baseado em contexto e vizinhança
         */
        async calculateContextScore(file) {
            let score = 0;
            
            // Verificar se está em pasta com outros arquivos relevantes
            const folderPath = this.getFolderPath(file.path);
            const siblingFiles = KC.AppState?.get('files')?.filter(f => 
                this.getFolderPath(f.path) === folderPath
            ) || [];

            // Se tem vizinhos com alta relevância, aumentar score
            const relevantSiblings = siblingFiles.filter(f => 
                f.relevanceScore > 50 || f.analyzed
            );
            
            if (relevantSiblings.length > 0) {
                score += Math.min(relevantSiblings.length * 10, 50);
            }

            // Profundidade de pasta (mais profundo = potencialmente mais organizado)
            const depth = (file.path || '').split(/[\/\\]/).length;
            if (depth > 3) score += 10;
            if (depth > 5) score += 10;

            return Math.min(score, 100);
        }

        /**
         * Score baseado em relevância temporal
         */
        calculateTemporalScore(file) {
            if (!file.lastModified) return 0;
            
            const now = Date.now();
            const fileTime = new Date(file.lastModified).getTime();
            const ageInDays = (now - fileTime) / (1000 * 60 * 60 * 24);
            
            // Arquivos mais recentes têm maior score temporal
            if (ageInDays < 7) return 100;
            if (ageInDays < 30) return 80;
            if (ageInDays < 90) return 60;
            if (ageInDays < 180) return 40;
            if (ageInDays < 365) return 20;
            return 10; // Arquivo antigo ainda tem algum valor
        }

        /**
         * Score de potencial baseado no tipo de arquivo
         */
        calculatePotentialScore(file) {
            const extension = this.getFileExtension(file.name);
            
            // Potencial por tipo
            const potentialMap = {
                '.pst': 95,  // Emails = alta densidade de informação
                '.docx': 85, // Documentos = conhecimento estruturado
                '.pdf': 80,  // PDFs = informação consolidada
                '.xlsx': 75, // Planilhas = dados estruturados
                '.pptx': 70, // Apresentações = conhecimento sintetizado
                '.doc': 65,  // Docs antigos = conhecimento histórico
                '.html': 40, // HTML = pode ser cache ou importante
                '.txt': 30,  // Texto = já processável
                '.md': 25    // Markdown = já processável
            };
            
            return potentialMap[extension] || 10;
        }

        /**
         * Score de conteúdo quando extraível
         */
        async calculateContentScore(content) {
            if (!content) return 0;
            
            // Usar PreviewUtils existente se disponível
            if (KC.PreviewUtils?.calculatePreviewRelevance) {
                const preview = KC.PreviewUtils.extractSmartPreview(content);
                return KC.PreviewUtils.calculatePreviewRelevance(preview);
            }
            
            // Fallback simples
            const keywords = ['decisão', 'estratégia', 'projeto', 'importante', 'crítico'];
            let score = 0;
            const contentLower = content.toLowerCase();
            
            keywords.forEach(keyword => {
                if (contentLower.includes(keyword)) score += 20;
            });
            
            return Math.min(score, 100);
        }

        /**
         * Calcula score composto final
         */
        calculateCompositeScore(scores) {
            let composite = 0;
            
            // Aplicar pesos
            Object.keys(this.scoringWeights).forEach(dimension => {
                composite += (scores[dimension] || 0) * this.scoringWeights[dimension];
            });
            
            // Arredondar para inteiro
            return Math.round(composite);
        }

        /**
         * Enriquece metadados do arquivo
         */
        async enrichMetadata(file) {
            return {
                // Metadados básicos
                originalName: file.name,
                extension: this.getFileExtension(file.name),
                mimeType: file.type || 'unknown',
                size: file.size,
                sizeReadable: this.formatFileSize(file.size),
                
                // Metadados derivados
                nameWithoutExtension: this.getNameWithoutExtension(file.name),
                folderPath: this.getFolderPath(file.path),
                folderDepth: (file.path || '').split(/[\/\\]/).length,
                
                // Metadados temporais
                lastModified: file.lastModified,
                ageInDays: this.calculateAgeInDays(file.lastModified),
                temporalCategory: this.categorizeByAge(file.lastModified),
                
                // Metadados de processamento
                extractionSupported: this.capabilities[this.getFileExtension(file.name)]?.supported || false,
                extractionMethod: this.capabilities[this.getFileExtension(file.name)]?.extractor || 'none',
                processingPriority: this.calculateProcessingPriority(file),
                
                // Tags automáticas
                autoTags: this.generateAutoTags(file)
            };
        }

        /**
         * Determina status de processamento
         */
        determineProcessingStatus(file) {
            const extension = this.getFileExtension(file.name);
            const capability = this.capabilities[extension];
            
            if (!capability) {
                return {
                    status: 'unsupported',
                    message: 'Tipo de arquivo não reconhecido',
                    canProcess: false,
                    futureSupport: 'unknown'
                };
            }
            
            if (capability.supported) {
                return {
                    status: 'ready',
                    message: 'Pronto para processamento',
                    canProcess: true,
                    confidence: capability.confidence
                };
            }
            
            return {
                status: 'pending_capability',
                message: `Aguardando implementação de ${capability.extractor}`,
                canProcess: false,
                futureSupport: capability.extractor,
                estimatedValue: this.calculatePotentialScore(file)
            };
        }

        /**
         * Avalia potencial de convergência
         */
        async assessConvergencePotential(file) {
            const scores = await this.calculateMultiDimensionalScores(file);
            const metadata = await this.enrichMetadata(file);
            
            return {
                // Potencial geral
                overall: scores.composite,
                
                // Potencial por dimensão
                dimensions: {
                    semantic: scores.content > 0 ? scores.content : scores.potential,
                    temporal: scores.temporal,
                    categorical: metadata.autoTags.length * 20,
                    contextual: scores.context
                },
                
                // Convergências prováveis
                likelyConvergences: this.predictConvergences(file, scores, metadata),
                
                // Recomendação
                recommendation: this.generateConvergenceRecommendation(scores)
            };
        }

        /**
         * Gera conteúdo placeholder para arquivos não-processáveis
         */
        generatePlaceholderContent(file) {
            const metadata = {
                fileName: file.name,
                filePath: file.path,
                fileType: this.getFileExtension(file.name),
                size: this.formatFileSize(file.size),
                modified: file.lastModified,
                placeholder: true,
                reason: 'Extração não implementada ainda'
            };
            
            // Criar conteúdo textual para permitir busca por nome/caminho
            return `
                [ARQUIVO NÃO PROCESSADO]
                Nome: ${metadata.fileName}
                Tipo: ${metadata.fileType}
                Tamanho: ${metadata.size}
                Caminho: ${metadata.filePath}
                Modificado: ${metadata.modified}
                Status: Aguardando implementação de extrator
                Potencial: ${this.calculatePotentialScore(file)}%
                
                Este arquivo foi identificado mas seu conteúdo ainda não pode ser extraído.
                Quando o extrator for implementado, este arquivo será reprocessado automaticamente.
            `;
        }

        /**
         * Calcula prioridade de processamento futuro
         */
        calculateProcessingPriority(file) {
            let priority = 0;
            
            // Tipo de arquivo
            const extension = this.getFileExtension(file.name);
            const typePriority = {
                '.pst': 100,
                '.docx': 90,
                '.pdf': 85,
                '.xlsx': 80,
                '.pptx': 75
            };
            priority += typePriority[extension] || 10;
            
            // Tamanho (arquivos maiores = mais conteúdo potencial)
            if (file.size > 10 * 1024 * 1024) priority += 30;
            else if (file.size > 1024 * 1024) priority += 20;
            else if (file.size > 100 * 1024) priority += 10;
            
            // Idade (arquivos recentes = mais relevantes)
            const ageScore = this.calculateTemporalScore(file);
            priority += ageScore / 2;
            
            return Math.min(priority, 100);
        }

        /**
         * Gera recomendações de ação
         */
        generateRecommendations(file) {
            const recommendations = [];
            const extension = this.getFileExtension(file.name);
            const capability = this.capabilities[extension];
            
            if (!capability?.supported) {
                recommendations.push({
                    type: 'implementation',
                    priority: 'high',
                    action: `Implementar extrator para ${extension}`,
                    impact: `Desbloqueará ${this.calculatePotentialScore(file)}% de potencial`
                });
            }
            
            const scores = this.calculateMultiDimensionalScores(file);
            if (scores.composite > 70) {
                recommendations.push({
                    type: 'analysis',
                    priority: 'high',
                    action: 'Analisar com IA para extrair insights',
                    reason: 'Alta relevância detectada'
                });
            }
            
            if (scores.context > 60) {
                recommendations.push({
                    type: 'grouping',
                    priority: 'medium',
                    action: 'Agrupar com arquivos relacionados',
                    reason: 'Alta relevância contextual'
                });
            }
            
            return recommendations;
        }

        /**
         * Prediz convergências possíveis
         */
        predictConvergences(file, scores, metadata) {
            const convergences = [];
            
            // Convergência por tipo
            if (scores.potential > 70) {
                convergences.push({
                    type: 'type-based',
                    strength: scores.potential,
                    description: `Alta densidade de informação esperada em ${this.getFileExtension(file.name)}`
                });
            }
            
            // Convergência temporal
            if (scores.temporal > 60) {
                convergences.push({
                    type: 'temporal',
                    strength: scores.temporal,
                    description: 'Arquivo recente com possível relevância atual'
                });
            }
            
            // Convergência contextual
            if (scores.context > 50) {
                convergences.push({
                    type: 'contextual',
                    strength: scores.context,
                    description: 'Localizado em área de alta atividade'
                });
            }
            
            return convergences;
        }

        /**
         * Gera recomendação de convergência
         */
        generateConvergenceRecommendation(scores) {
            if (scores.composite > 70) {
                return 'Alta convergência - processar imediatamente';
            } else if (scores.composite > 40) {
                return 'Média convergência - incluir em análise bulk';
            } else if (scores.potential > 60) {
                return 'Alto potencial não explorado - priorizar extração';
            } else {
                return 'Baixa convergência atual - manter para contexto';
            }
        }

        /**
         * Gera tags automáticas
         */
        generateAutoTags(file) {
            const tags = [];
            const nameLower = file.name.toLowerCase();
            const pathLower = (file.path || '').toLowerCase();
            
            // Tags por tipo
            const extension = this.getFileExtension(file.name);
            if (extension) tags.push(`type:${extension.substring(1)}`);
            
            // Tags por conteúdo do nome
            if (nameLower.includes('projeto')) tags.push('projeto');
            if (nameLower.includes('proposal')) tags.push('proposta');
            if (nameLower.includes('contract')) tags.push('contrato');
            if (nameLower.includes('backup')) tags.push('backup');
            
            // Tags por localização
            if (pathLower.includes('work')) tags.push('trabalho');
            if (pathLower.includes('personal')) tags.push('pessoal');
            if (pathLower.includes('archive')) tags.push('arquivo');
            
            // Tags temporais
            const age = this.calculateAgeInDays(file.lastModified);
            if (age < 7) tags.push('recente');
            else if (age < 30) tags.push('último-mês');
            else if (age > 365) tags.push('histórico');
            
            return [...new Set(tags)]; // Remover duplicatas
        }

        // Utilities
        getFileExtension(fileName) {
            const lastDot = fileName.lastIndexOf('.');
            return lastDot > 0 ? fileName.substring(lastDot).toLowerCase() : '';
        }

        getNameWithoutExtension(fileName) {
            const lastDot = fileName.lastIndexOf('.');
            return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
        }

        getFolderPath(fullPath) {
            if (!fullPath) return '';
            const lastSlash = Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\'));
            return lastSlash > 0 ? fullPath.substring(0, lastSlash) : '';
        }

        formatFileSize(bytes) {
            if (!bytes) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }

        calculateAgeInDays(lastModified) {
            if (!lastModified) return Infinity;
            const now = Date.now();
            const fileTime = new Date(lastModified).getTime();
            return (now - fileTime) / (1000 * 60 * 60 * 24);
        }

        categorizeByAge(lastModified) {
            const age = this.calculateAgeInDays(lastModified);
            if (age < 7) return 'this-week';
            if (age < 30) return 'this-month';
            if (age < 90) return 'this-quarter';
            if (age < 365) return 'this-year';
            return 'historical';
        }

        generateId(file) {
            const hash = str => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return Math.abs(hash).toString(36);
            };
            
            return `file-${hash(file.path || file.name)}-${Date.now()}`;
        }

        /**
         * Inicializa extractors básicos
         */
        initializeExtractors() {
            // Markdown extractor
            this.extractors.set('markdown', async (file) => {
                if (file.content) return file.content;
                if (file.handle && file.handle.getFile) {
                    const fileObj = await file.handle.getFile();
                    return await fileObj.text();
                }
                return '';
            });

            // Plain text extractor
            this.extractors.set('plaintext', async (file) => {
                if (file.content) return file.content;
                if (file.handle && file.handle.getFile) {
                    const fileObj = await file.handle.getFile();
                    return await fileObj.text();
                }
                return '';
            });

            // HTML extractor (básico)
            this.extractors.set('html', async (file) => {
                const content = await this.extractors.get('plaintext')(file);
                // Remover tags HTML básicas
                return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            });

            // JSON extractor
            this.extractors.set('structured', async (file) => {
                const content = await this.extractors.get('plaintext')(file);
                try {
                    const json = JSON.parse(content);
                    return JSON.stringify(json, null, 2);
                } catch {
                    return content;
                }
            });

            // Placeholder extractors para formatos futuros
            ['pending_ocr', 'pending_parser', 'pending_tabular', 'pending_email', 'pending_legacy', 'pending_presentation'].forEach(type => {
                this.extractors.set(type, async (file) => {
                    return null; // Retorna null para indicar extração pendente
                });
            });
        }

        /**
         * Inicializa estratégias de scoring
         */
        initializeScoringStrategies() {
            // Estratégias podem ser expandidas no futuro
            this.scoringStrategies.set('default', this.calculateMultiDimensionalScores.bind(this));
            this.scoringStrategies.set('content-first', (file) => {
                // Prioriza conteúdo sobre metadados
                const weights = { ...this.scoringWeights };
                weights.content = 0.6;
                weights.metadata = 0.1;
                return this.calculateMultiDimensionalScores(file);
            });
            this.scoringStrategies.set('potential-first', (file) => {
                // Prioriza potencial para arquivos não-processáveis
                const weights = { ...this.scoringWeights };
                weights.potential = 0.4;
                weights.content = 0.2;
                return this.calculateMultiDimensionalScores(file);
            });
        }
    }

    // Registrar no KC
    KC.ContentAnalysisOrchestrator = new ContentAnalysisOrchestrator();
    KC.Logger?.info('ContentAnalysisOrchestrator', 'Orquestrador de análise multi-dimensional inicializado');

})(window);