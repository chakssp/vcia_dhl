/**
 * SchemaOrgMapper.js - Mapeador de tipos de análise para Schema.org
 * 
 * FASE 2.3 - POC Schema.org
 * 
 * Transforma os analysisTypes (curadoria humana) em estruturas semânticas Schema.org
 * seguindo as melhores práticas de Linked Data e JSON-LD
 * 
 * @see https://schema.org/
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class SchemaOrgMapper {
        constructor() {
            this.version = '1.0.0';
            this.context = 'https://schema.org';
            
            // Mapeamento dos 5 analysisTypes para tipos Schema.org
            this.typeMapping = {
                'Breakthrough Técnico': {
                    '@type': 'TechArticle',
                    description: 'Documento técnico com soluções, configurações ou arquiteturas inovadoras',
                    additionalType: ['HowTo', 'APIReference'],
                    properties: {
                        technicalAudience: true,
                        proficiencyLevel: 'Expert',
                        dependencies: [],
                        programmingLanguage: []
                    }
                },
                
                'Evolução Conceitual': {
                    '@type': 'ScholarlyArticle',
                    description: 'Artigo acadêmico sobre evolução de entendimento, perspectivas ou visões',
                    additionalType: ['Review', 'Opinion'],
                    properties: {
                        academicDiscipline: [],
                        educationalLevel: 'ResearchLevel',
                        learningResourceType: 'Concept',
                        isBasedOn: []
                    }
                },
                
                'Momento Decisivo': {
                    '@type': 'Event',
                    description: 'Registro de decisão importante, escolha estratégica ou mudança de direção',
                    additionalType: ['Decision', 'MeetingMinutes'],
                    properties: {
                        eventStatus: 'EventCompleted',
                        eventAttendanceMode: 'Mixed',
                        organizer: null,
                        outcomes: []
                    }
                },
                
                'Insight Estratégico': {
                    '@type': 'Report',
                    description: 'Relatório com insights transformadores ou descobertas estratégicas',
                    additionalType: ['StrategicReport', 'MarketAnalysis'],
                    properties: {
                        reportNumber: null,
                        category: 'Strategic',
                        conclusion: null,
                        recommendation: []
                    }
                },
                
                'Aprendizado Geral': {
                    '@type': 'Article',
                    description: 'Artigo geral com aprendizados e conhecimento diverso',
                    additionalType: ['BlogPosting', 'NewsArticle'],
                    properties: {
                        articleSection: 'Learning',
                        wordCount: 0,
                        timeRequired: null,
                        educationalUse: 'Knowledge Base'
                    }
                }
            };

            // Propriedades comuns a todos os tipos
            this.commonProperties = {
                '@context': this.context,
                '@id': null, // Será gerado baseado no ID do arquivo
                name: null,
                description: null,
                dateCreated: null,
                dateModified: null,
                author: {
                    '@type': 'Person',
                    name: 'Knowledge Consolidator User'
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'Personal Knowledge Base'
                },
                keywords: [],
                inLanguage: 'pt-BR',
                encoding: {
                    '@type': 'MediaObject',
                    encodingFormat: null
                }
            };

            // Enriquecimentos semânticos adicionais
            this.semanticEnrichments = {
                // Categorias para disciplinas acadêmicas
                academicDisciplines: {
                    'IA/ML': 'Computer Science - Artificial Intelligence',
                    'DevOps': 'Computer Science - Systems',
                    'Arquitetura': 'Computer Science - Software Engineering',
                    'Estratégia': 'Business Administration',
                    'Dados': 'Data Science'
                },
                
                // Níveis de proficiência
                proficiencyLevels: {
                    high: 'Expert',
                    medium: 'Intermediate',
                    low: 'Beginner'
                },
                
                // Tipos de recursos educacionais
                learningTypes: {
                    'tutorial': 'Tutorial',
                    'reference': 'Reference',
                    'guide': 'Guide',
                    'example': 'Example',
                    'theory': 'Concept'
                }
            };

            Logger?.info('SchemaOrgMapper', 'Inicializado', { version: this.version });
        }

        /**
         * Mapeia um arquivo com analysisType para estrutura Schema.org
         * @param {Object} file - Arquivo com analysisType definido
         * @returns {Object} Estrutura Schema.org completa
         */
        mapToSchema(file) {
            try {
                if (!file || !file.analysisType) {
                    throw new Error('Arquivo deve ter analysisType definido');
                }

                const typeConfig = this.typeMapping[file.analysisType];
                if (!typeConfig) {
                    Logger?.warn('SchemaOrgMapper', 'AnalysisType não mapeado', { 
                        type: file.analysisType 
                    });
                    // Fallback para Article genérico
                    return this.mapToGenericArticle(file);
                }

                // Constrói estrutura base
                const schema = {
                    ...this.commonProperties,
                    '@type': typeConfig['@type'],
                    '@id': this.generateId(file),
                    name: file.name || 'Untitled',
                    description: this.generateDescription(file),
                    dateCreated: file.createdDate || file.discoveryDate,
                    dateModified: file.modifiedDate || new Date().toISOString(),
                    keywords: this.extractKeywords(file),
                    encoding: {
                        '@type': 'MediaObject',
                        encodingFormat: this.getMediaType(file)
                    }
                };

                // Adiciona propriedades específicas do tipo
                const enrichedSchema = this.enrichByType(schema, file, typeConfig);

                // Adiciona metadados de curadoria
                enrichedSchema.curatorNote = {
                    '@type': 'Comment',
                    text: `Classificado como "${file.analysisType}" através de curadoria humana`,
                    dateCreated: file.analysisDate || new Date().toISOString(),
                    relevanceScore: file.relevanceScore || 0
                };

                // Adiciona categorias como tags estruturadas
                if (file.categories && file.categories.length > 0) {
                    enrichedSchema.about = file.categories.map(cat => ({
                        '@type': 'Thing',
                        name: cat,
                        alternateName: this.semanticEnrichments.academicDisciplines[cat] || cat
                    }));
                }

                // Adiciona preview semântico se disponível
                if (file.preview) {
                    enrichedSchema.abstract = this.generateAbstract(file.preview);
                }

                Logger?.debug('SchemaOrgMapper', 'Arquivo mapeado', {
                    file: file.name,
                    type: enrichedSchema['@type']
                });

                return enrichedSchema;

            } catch (error) {
                Logger?.error('SchemaOrgMapper', 'Erro ao mapear arquivo', { 
                    error: error.message,
                    file: file?.name 
                });
                return null;
            }
        }

        /**
         * Enriquece schema com propriedades específicas do tipo
         */
        enrichByType(schema, file, typeConfig) {
            const enriched = { ...schema };

            switch (typeConfig['@type']) {
                case 'TechArticle':
                    enriched.technicalAudience = true;
                    enriched.proficiencyLevel = this.detectProficiencyLevel(file);
                    enriched.dependencies = this.extractDependencies(file);
                    enriched.programmingLanguage = this.detectLanguages(file);
                    if (file.content && file.content.includes('```')) {
                        enriched.hasPart = {
                            '@type': 'SoftwareSourceCode',
                            programmingLanguage: enriched.programmingLanguage[0] || 'Unknown'
                        };
                    }
                    break;

                case 'ScholarlyArticle':
                    enriched.academicDiscipline = this.mapCategoriesToDisciplines(file.categories);
                    enriched.educationalLevel = 'ResearchLevel';
                    enriched.learningResourceType = 'Concept';
                    if (file.references) {
                        enriched.citation = file.references.map(ref => ({
                            '@type': 'CreativeWork',
                            name: ref
                        }));
                    }
                    break;

                case 'Event':
                    enriched.eventStatus = 'https://schema.org/EventCompleted';
                    enriched.startDate = file.createdDate || file.discoveryDate;
                    enriched.endDate = enriched.startDate; // Evento pontual
                    enriched.location = {
                        '@type': 'VirtualLocation',
                        name: 'Knowledge Base'
                    };
                    // Extrai decisões do conteúdo
                    const decisions = this.extractDecisions(file);
                    if (decisions.length > 0) {
                        enriched.recordedIn = {
                            '@type': 'CreativeWork',
                            name: 'Decision Record',
                            text: decisions.join('; ')
                        };
                    }
                    break;

                case 'Report':
                    enriched.reportNumber = `INSIGHT-${file.id || Date.now()}`;
                    enriched.category = 'Strategic Insight';
                    // Extrai conclusões e recomendações
                    const insights = this.extractInsights(file);
                    enriched.conclusion = insights.conclusion;
                    enriched.recommendation = insights.recommendations;
                    break;

                case 'Article':
                    enriched.articleSection = 'General Learning';
                    enriched.wordCount = this.countWords(file.content);
                    enriched.timeRequired = `PT${Math.ceil(enriched.wordCount / 200)}M`; // 200 palavras/min
                    enriched.educationalUse = 'Knowledge Acquisition';
                    break;
            }

            // Adiciona additionalType se definido
            if (typeConfig.additionalType && typeConfig.additionalType.length > 0) {
                enriched.additionalType = typeConfig.additionalType;
            }

            return enriched;
        }

        /**
         * Gera ID único para o recurso
         */
        generateId(file) {
            const baseId = file.id || file.name.replace(/\s+/g, '-').toLowerCase();
            return `urn:knowledge-base:${file.analysisType.replace(/\s+/g, '-').toLowerCase()}:${baseId}`;
        }

        /**
         * Gera descrição semântica
         */
        generateDescription(file) {
            const typeDesc = this.typeMapping[file.analysisType]?.description || '';
            const preview = file.preview ? file.preview.slice(0, 150) + '...' : '';
            return `${typeDesc}. ${preview}`.trim();
        }

        /**
         * Extrai palavras-chave semanticamente relevantes
         */
        extractKeywords(file) {
            const keywords = new Set();
            
            // Adiciona categorias
            if (file.categories) {
                file.categories.forEach(cat => keywords.add(cat));
            }

            // Adiciona tipo de análise
            keywords.add(file.analysisType);

            // Extrai do conteúdo (simplificado para POC)
            const content = (file.content || '').toLowerCase();
            const technicalTerms = ['api', 'framework', 'algoritmo', 'arquitetura', 'sistema', 'dados'];
            technicalTerms.forEach(term => {
                if (content.includes(term)) {
                    keywords.add(term);
                }
            });

            return Array.from(keywords);
        }

        /**
         * Detecta nível de proficiência baseado no conteúdo
         */
        detectProficiencyLevel(file) {
            const content = (file.content || '').toLowerCase();
            const expertTerms = ['otimização', 'performance', 'escalabilidade', 'microserviços'];
            const expertCount = expertTerms.filter(term => content.includes(term)).length;
            
            if (expertCount >= 3) return 'Expert';
            if (expertCount >= 1) return 'Intermediate';
            return 'Beginner';
        }

        /**
         * Extrai dependências técnicas
         */
        extractDependencies(file) {
            const deps = [];
            const content = file.content || '';
            
            // Busca por imports, requires, dependencies
            const patterns = [
                /import\s+.*?from\s+['"](.+?)['"]/g,
                /require\(['"](.+?)['"]\)/g,
                /dependencies:\s*{([^}]+)}/g
            ];

            patterns.forEach(pattern => {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    deps.push(match[1]);
                }
            });

            return [...new Set(deps)]; // Remove duplicatas
        }

        /**
         * Detecta linguagens de programação
         */
        detectLanguages(file) {
            const languages = [];
            const ext = file.name.split('.').pop()?.toLowerCase();
            const langMap = {
                'js': 'JavaScript',
                'py': 'Python',
                'java': 'Java',
                'ts': 'TypeScript',
                'go': 'Go',
                'rs': 'Rust'
            };

            if (langMap[ext]) {
                languages.push(langMap[ext]);
            }

            return languages;
        }

        /**
         * Mapeia categorias para disciplinas acadêmicas
         */
        mapCategoriesToDisciplines(categories) {
            if (!categories) return [];
            
            return categories
                .map(cat => this.semanticEnrichments.academicDisciplines[cat])
                .filter(Boolean);
        }

        /**
         * Extrai decisões de um arquivo tipo Evento
         */
        extractDecisions(file) {
            const decisions = [];
            const content = file.content || '';
            
            // Padrões para identificar decisões
            const patterns = [
                /decisão:\s*(.+)/gi,
                /decidido:\s*(.+)/gi,
                /resolvido:\s*(.+)/gi,
                /acordado:\s*(.+)/gi
            ];

            patterns.forEach(pattern => {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    decisions.push(match[1].trim());
                }
            });

            return decisions;
        }

        /**
         * Extrai insights de um arquivo tipo Report
         */
        extractInsights(file) {
            const content = file.content || '';
            const insights = {
                conclusion: '',
                recommendations: []
            };

            // Busca conclusão
            const conclusionMatch = content.match(/conclusão:?\s*(.+?)(?:\n|$)/i);
            if (conclusionMatch) {
                insights.conclusion = conclusionMatch[1].trim();
            }

            // Busca recomendações
            const recPatterns = [
                /recomenda(?:ção|ções)?:?\s*(.+?)(?:\n|$)/gi,
                /sugest(?:ão|ões)?:?\s*(.+?)(?:\n|$)/gi,
                /próximos?\s+passos?:?\s*(.+?)(?:\n|$)/gi
            ];

            recPatterns.forEach(pattern => {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    insights.recommendations.push(match[1].trim());
                }
            });

            return insights;
        }

        /**
         * Conta palavras no conteúdo
         */
        countWords(content) {
            if (!content) return 0;
            return content.trim().split(/\s+/).length;
        }

        /**
         * Detecta tipo de mídia
         */
        getMediaType(file) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const mimeTypes = {
                'txt': 'text/plain',
                'md': 'text/markdown',
                'json': 'application/json',
                'js': 'application/javascript',
                'html': 'text/html',
                'pdf': 'application/pdf',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            return mimeTypes[ext] || 'text/plain';
        }

        /**
         * Gera abstract a partir do preview
         */
        generateAbstract(preview) {
            if (!preview) return '';
            
            // Remove quebras de linha extras e normaliza espaços
            return preview
                .replace(/\n+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 300);
        }

        /**
         * Mapeia para Article genérico (fallback)
         */
        mapToGenericArticle(file) {
            return {
                ...this.commonProperties,
                '@type': 'Article',
                '@id': this.generateId(file),
                name: file.name || 'Untitled',
                description: 'Documento sem classificação específica',
                dateCreated: file.createdDate || file.discoveryDate,
                dateModified: file.modifiedDate || new Date().toISOString(),
                keywords: this.extractKeywords(file),
                articleSection: 'Unclassified'
            };
        }

        /**
         * Valida estrutura Schema.org gerada
         */
        validateSchema(schema) {
            const required = ['@context', '@type', '@id', 'name'];
            const missing = required.filter(field => !schema[field]);
            
            if (missing.length > 0) {
                Logger?.warn('SchemaOrgMapper', 'Schema incompleto', { missing });
                return false;
            }

            return true;
        }

        /**
         * Exporta múltiplos arquivos como JSON-LD
         */
        exportAsJsonLD(files) {
            const graph = {
                '@context': this.context,
                '@graph': []
            };

            files.forEach(file => {
                if (file.analysisType) {
                    const schema = this.mapToSchema(file);
                    if (schema && this.validateSchema(schema)) {
                        graph['@graph'].push(schema);
                    }
                }
            });

            Logger?.info('SchemaOrgMapper', 'JSON-LD exportado', { 
                total: graph['@graph'].length 
            });

            return graph;
        }

        /**
         * Gera exemplo de uso para documentação
         */
        generateExample() {
            const exampleFile = {
                id: 'example-001',
                name: 'implementacao-cache-redis.md',
                content: 'Este documento descreve a implementação de cache distribuído usando Redis...',
                preview: 'Implementação de cache distribuído com Redis para otimização de performance...',
                analysisType: 'Breakthrough Técnico',
                categories: ['DevOps', 'Arquitetura'],
                relevanceScore: 0.85,
                createdDate: '2025-01-20T10:00:00Z',
                analysisDate: '2025-01-21T14:30:00Z'
            };

            return {
                input: exampleFile,
                output: this.mapToSchema(exampleFile)
            };
        }
    }

    // Registra no namespace do Knowledge Consolidator
    KC.SchemaOrgMapper = new SchemaOrgMapper();
    
    Logger?.info('SchemaOrgMapper', 'Componente registrado em KC.SchemaOrgMapper');

})(window);