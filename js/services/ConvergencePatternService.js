/**
 * ConvergencePatternService.js - Serviço de Detecção de Padrões Enriquecido
 * 
 * Framework EU-VOCÊ - Convergência Semântica Avançada
 * Baseado em análise real de 11 documentos sprint 1.1
 * Data: 11/08/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;

    class ConvergencePatternService {
        constructor() {
            this.patterns = this.loadEnrichedPatterns();
            this.cache = new Map();
            this.stats = {
                totalAnalyzed: 0,
                patternsFound: 0,
                avgConvergence: 0
            };
        }

        /**
         * Carrega padrões enriquecidos de convergência
         */
        loadEnrichedPatterns() {
            return [
                // PADRÕES CAUSAIS
                {
                    id: 'problema-solucao',
                    name: 'Problema → Solução',
                    regex: /(erro|problema|issue|bug|falha|defeito|incorreto).{0,150}(correção|solução|fix|resolver|mitigar|corrigir|ajustar)/gi,
                    weight: 2.0,
                    category: 'causal',
                    description: 'Identifica relação problema-solução'
                },
                {
                    id: 'causa-efeito',
                    name: 'Causa → Efeito',
                    regex: /(causa|razão|motivo|porque|devido|origem).{0,150}(efeito|resultado|consequência|impacto|levou|gerou)/gi,
                    weight: 1.9,
                    category: 'causal',
                    description: 'Detecta relações causais'
                },
                {
                    id: 'requisito-implementacao',
                    name: 'Requisito → Implementação',
                    regex: /(requisito|requirement|necessário|precisa|deve|obrigatório).{0,150}(implementado|feito|realizado|completo|desenvolvido|criado)/gi,
                    weight: 1.8,
                    category: 'causal',
                    description: 'Liga requisitos a implementações'
                },

                // PADRÕES TEMPORAIS
                {
                    id: 'antes-depois',
                    name: 'Antes → Depois',
                    regex: /(antes|previously|original|antigo|inicial).{0,150}(depois|agora|novo|atualizado|atual|mudou)/gi,
                    weight: 1.6,
                    category: 'temporal',
                    description: 'Identifica mudanças temporais'
                },
                {
                    id: 'evolucao-melhoria',
                    name: 'Evolução → Melhoria',
                    regex: /(versão|release|sprint|iteração).{0,150}(melhorado|otimizado|aprimorado|evoluído|refinado)/gi,
                    weight: 1.7,
                    category: 'temporal',
                    description: 'Detecta evolução de sistema'
                },

                // PADRÕES ANALÍTICOS
                {
                    id: 'analise-decisao',
                    name: 'Análise → Decisão',
                    regex: /(análise|analysis|estudo|investigação|pesquisa).{0,150}(decisão|decision|escolha|optamos|definimos|conclusão)/gi,
                    weight: 2.1,
                    category: 'analitico',
                    description: 'Liga análise a decisões'
                },
                {
                    id: 'hipotese-confirmacao',
                    name: 'Hipótese → Confirmação',
                    regex: /(hipótese|teoria|supor|assumir|acreditar).{0,150}(confirmado|validado|comprovado|verdade|correto|certo)/gi,
                    weight: 2.3,
                    category: 'analitico',
                    description: 'Valida hipóteses'
                },
                {
                    id: 'teste-validacao',
                    name: 'Teste → Validação',
                    regex: /(teste|test|validar|verificar|checar).{0,150}(validação|validation|sucesso|passou|funciona|aprovado|ok)/gi,
                    weight: 1.7,
                    category: 'analitico',
                    description: 'Confirma testes bem-sucedidos'
                },

                // PADRÕES DE CONHECIMENTO
                {
                    id: 'descoberta-insight',
                    name: 'Descoberta → Insight',
                    regex: /(descoberta|discovery|encontr|identificar|perceber).{0,150}(insight|aprendizado|conclusão|entendimento|compreensão)/gi,
                    weight: 2.2,
                    category: 'conhecimento',
                    description: 'Captura momentos de insight'
                },
                {
                    id: 'pergunta-resposta',
                    name: 'Pergunta → Resposta',
                    regex: /(pergunta|questão|dúvida|como|por que|\?).{0,150}(resposta|solução|esclarecido|resolvido|explicado|entendido)/gi,
                    weight: 1.7,
                    category: 'conhecimento',
                    description: 'Resolve questões'
                },
                {
                    id: 'objetivo-resultado',
                    name: 'Objetivo → Resultado',
                    regex: /(objetivo|goal|meta|alvo|propósito|intenção).{0,150}(resultado|alcançado|atingido|sucesso|conseguido|realizado)/gi,
                    weight: 2.0,
                    category: 'conhecimento',
                    description: 'Verifica objetivos alcançados'
                },

                // PADRÕES TÉCNICOS
                {
                    id: 'implementacao-teste',
                    name: 'Implementação → Teste',
                    regex: /(implementação|implementation|código|desenvolvido|criado).{0,150}(teste|test|validado|verificado|funcionando)/gi,
                    weight: 1.8,
                    category: 'tecnico',
                    description: 'Fluxo desenvolvimento-teste'
                },
                {
                    id: 'configuracao-ajuste',
                    name: 'Configuração → Ajuste',
                    regex: /(configuração|config|setup|parâmetro|setting).{0,150}(ajustado|calibrado|otimizado|modificado|alterado)/gi,
                    weight: 1.5,
                    category: 'tecnico',
                    description: 'Ajustes de configuração'
                },
                {
                    id: 'integracao-funcionamento',
                    name: 'Integração → Funcionamento',
                    regex: /(integração|integration|conectar|ligar|unir).{0,150}(funcionando|working|operacional|ativo|rodando)/gi,
                    weight: 1.9,
                    category: 'tecnico',
                    description: 'Integrações bem-sucedidas'
                }
            ];
        }

        /**
         * Analisa documento para padrões de convergência
         */
        analyzeDocument(doc) {
            const docId = doc.id || doc.path || doc.name;
            
            // Verificar cache
            if (this.cache.has(docId)) {
                return this.cache.get(docId);
            }

            const content = doc.content || '';
            const analysis = {
                id: docId,
                patterns: [],
                categories: {},
                convergenceScore: 0,
                relationships: [],
                timestamp: new Date().toISOString()
            };

            // Detectar padrões
            this.patterns.forEach(pattern => {
                const matches = content.match(pattern.regex);
                if (matches && matches.length > 0) {
                    analysis.patterns.push({
                        id: pattern.id,
                        name: pattern.name,
                        category: pattern.category,
                        occurrences: matches.length,
                        weight: pattern.weight,
                        score: matches.length * pattern.weight,
                        examples: matches.slice(0, 3) // Primeiros 3 exemplos
                    });

                    // Contar por categoria
                    if (!analysis.categories[pattern.category]) {
                        analysis.categories[pattern.category] = 0;
                    }
                    analysis.categories[pattern.category]++;
                }
            });

            // Calcular score de convergência
            const totalScore = analysis.patterns.reduce((sum, p) => sum + p.score, 0);
            const wordCount = content.split(/\s+/).length;
            analysis.convergenceScore = Math.min(100, Math.round((totalScore / wordCount) * 100));

            // Identificar relacionamentos entre padrões
            analysis.relationships = this.findRelationships(analysis.patterns);

            // Atualizar estatísticas
            this.stats.totalAnalyzed++;
            this.stats.patternsFound += analysis.patterns.length;
            this.stats.avgConvergence = 
                (this.stats.avgConvergence * (this.stats.totalAnalyzed - 1) + analysis.convergenceScore) 
                / this.stats.totalAnalyzed;

            // Cachear resultado
            this.cache.set(docId, analysis);

            // Emitir evento
            EventBus.emit('CONVERGENCE_ANALYZED', {
                document: docId,
                score: analysis.convergenceScore,
                patterns: analysis.patterns.length
            });

            return analysis;
        }

        /**
         * Encontra relacionamentos entre padrões
         */
        findRelationships(patterns) {
            const relationships = [];
            
            // Padrões que frequentemente aparecem juntos
            const commonPairs = [
                ['problema-solucao', 'teste-validacao'],
                ['analise-decisao', 'objetivo-resultado'],
                ['descoberta-insight', 'hipotese-confirmacao'],
                ['implementacao-teste', 'configuracao-ajuste'],
                ['causa-efeito', 'antes-depois']
            ];

            commonPairs.forEach(([p1, p2]) => {
                const pattern1 = patterns.find(p => p.id === p1);
                const pattern2 = patterns.find(p => p.id === p2);
                
                if (pattern1 && pattern2) {
                    relationships.push({
                        from: pattern1.name,
                        to: pattern2.name,
                        strength: Math.min(pattern1.occurrences, pattern2.occurrences),
                        type: 'correlation'
                    });
                }
            });

            // Sequências causais
            const causalPatterns = patterns.filter(p => p.category === 'causal');
            const temporalPatterns = patterns.filter(p => p.category === 'temporal');
            
            if (causalPatterns.length > 0 && temporalPatterns.length > 0) {
                relationships.push({
                    from: 'Padrões Causais',
                    to: 'Padrões Temporais',
                    strength: Math.min(causalPatterns.length, temporalPatterns.length),
                    type: 'sequence'
                });
            }

            return relationships;
        }

        /**
         * Analisa múltiplos documentos para convergência cruzada
         */
        analyzeBatch(documents) {
            const batchAnalysis = {
                documents: [],
                crossConvergence: {},
                strongestPatterns: [],
                recommendations: [],
                timestamp: new Date().toISOString()
            };

            // Analisar cada documento
            documents.forEach(doc => {
                const analysis = this.analyzeDocument(doc);
                batchAnalysis.documents.push(analysis);
            });

            // Identificar padrões mais fortes
            const patternCounts = {};
            batchAnalysis.documents.forEach(analysis => {
                analysis.patterns.forEach(pattern => {
                    if (!patternCounts[pattern.id]) {
                        patternCounts[pattern.id] = {
                            ...pattern,
                            documentCount: 0,
                            totalOccurrences: 0,
                            totalScore: 0
                        };
                    }
                    patternCounts[pattern.id].documentCount++;
                    patternCounts[pattern.id].totalOccurrences += pattern.occurrences;
                    patternCounts[pattern.id].totalScore += pattern.score;
                });
            });

            // Ordenar por força
            batchAnalysis.strongestPatterns = Object.values(patternCounts)
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, 5);

            // Calcular convergência cruzada
            const categories = ['causal', 'temporal', 'analitico', 'conhecimento', 'tecnico'];
            categories.forEach(category => {
                const docsWithCategory = batchAnalysis.documents.filter(
                    d => d.categories[category] > 0
                ).length;
                batchAnalysis.crossConvergence[category] = {
                    coverage: (docsWithCategory / documents.length) * 100,
                    avgPatterns: batchAnalysis.documents.reduce(
                        (sum, d) => sum + (d.categories[category] || 0), 0
                    ) / documents.length
                };
            });

            // Gerar recomendações
            batchAnalysis.recommendations = this.generateRecommendations(batchAnalysis);

            return batchAnalysis;
        }

        /**
         * Gera recomendações baseadas na análise
         */
        generateRecommendations(analysis) {
            const recommendations = [];

            // Verificar cobertura de categorias
            Object.entries(analysis.crossConvergence).forEach(([category, data]) => {
                if (data.coverage < 30) {
                    recommendations.push({
                        type: 'enrichment',
                        priority: 'high',
                        message: `Enriquecer padrões ${category} - apenas ${data.coverage.toFixed(1)}% de cobertura`,
                        action: `Adicionar mais conteúdo relacionado a ${category}`
                    });
                }
            });

            // Verificar convergência média
            const avgConvergence = analysis.documents.reduce(
                (sum, d) => sum + d.convergenceScore, 0
            ) / analysis.documents.length;

            if (avgConvergence < 20) {
                recommendations.push({
                    type: 'quality',
                    priority: 'critical',
                    message: `Convergência baixa: ${avgConvergence.toFixed(1)}%`,
                    action: 'Revisar conteúdo para adicionar mais relações semânticas'
                });
            }

            // Sugerir conexões
            if (analysis.strongestPatterns.length < 3) {
                recommendations.push({
                    type: 'connections',
                    priority: 'medium',
                    message: 'Poucos padrões dominantes',
                    action: 'Criar mais conexões entre conceitos'
                });
            }

            return recommendations;
        }

        /**
         * Exporta análise para visualização
         */
        exportForVisualization(analysis) {
            return {
                nodes: analysis.documents.map(doc => ({
                    id: doc.id,
                    label: doc.id.split('/').pop(),
                    value: doc.convergenceScore,
                    group: doc.patterns[0]?.category || 'none'
                })),
                edges: analysis.documents.flatMap(doc => 
                    doc.relationships.map(rel => ({
                        from: doc.id,
                        to: rel.to,
                        value: rel.strength,
                        title: rel.type
                    }))
                ),
                statistics: {
                    totalDocuments: analysis.documents.length,
                    avgConvergence: this.stats.avgConvergence,
                    strongestPattern: analysis.strongestPatterns[0]?.name || 'N/A'
                }
            };
        }

        /**
         * Obtém estatísticas do serviço
         */
        getStats() {
            return {
                ...this.stats,
                cacheSize: this.cache.size,
                patternsAvailable: this.patterns.length,
                categories: [...new Set(this.patterns.map(p => p.category))]
            };
        }

        /**
         * Limpa cache
         */
        clearCache() {
            this.cache.clear();
            console.log('Cache de convergência limpo');
        }
    }

    // Registrar serviço
    KC.ConvergencePatternService = new ConvergencePatternService();
    
    console.log('✅ ConvergencePatternService carregado');
    console.log(`📊 ${KC.ConvergencePatternService.patterns.length} padrões enriquecidos disponíveis`);

})(window);