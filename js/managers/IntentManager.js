
/**
 * IntentManager.js - Gerenciador de Intenções de Análise
 *
 * Define e gerencia os "objetivos" que o usuário pode ter ao analisar
 * sua base de conhecimento. Cada intenção possui um conjunto de termos,
 * pesos e padrões que guiam o InsightExtractor.
 */
(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class IntentManager {
        constructor() {
            this.intents = {
                'decisoes': {
                    id: 'decisoes',
                    title: '🎯 Identificar Decisões Estratégicas',
                    description: 'Encontra momentos de decisão, planejamento e definição de rumos.',
                    keywords: {
                        'decisão': 5, 'decidimos': 5, 'escolha': 4, 'plano': 4, 'estratégia': 5,
                        'objetivo': 3, 'meta': 3, 'roadmap': 4, 'diretriz': 3, 'risco': 2,
                        'aprovado': 3, 'rejeitado': 3, 'pivô': 5, 'pivotar': 5
                    }
                },
                'insights': {
                    id: 'insights',
                    title: '💡 Encontrar Insights e "Momentos Eureka"',
                    description: 'Busca por aprendizados, conclusões e momentos de clareza.',
                    keywords: {
                        'insight': 5, 'eureka': 5, 'aprendizado': 4, 'conclusão': 4, 'descobri': 5,
                        'entendi': 4, 'percebi': 4, 'revelação': 4, 'transformador': 3,
                        'chave': 3, 'principal': 2, 'sacada': 5
                    }
                },
                'oportunidades': {
                    id: 'oportunidades',
                    title: '🚀 Descobrir Oportunidades de Projeto',
                    description: 'Identifica problemas, ideias e sugestões que podem virar projetos.',
                    keywords: {
                        'oportunidade': 5, 'ideia': 4, 'sugestão': 4, 'problema': 3, 'solução': 4,
                        'poderíamos': 4, 'e se': 4, 'proposta': 4, 'melhoria': 3, 'otimizar': 3,
                        'novo projeto': 5, 'iniciativa': 4
                    }
                },
                'conhecimento_tecnico': {
                    id: 'conhecimento_tecnico',
                    title: '🔧 Avaliar Conhecimento Técnico',
                    description: 'Mapeia tecnologias, arquiteturas e soluções técnicas documentadas.',
                    keywords: {
                        'arquitetura': 5, 'tecnologia': 4, 'implementação': 4, 'API': 3, 'banco de dados': 3,
                        'framework': 4, 'linguagem': 3, 'servidor': 2, 'componente': 3, 'serviço': 3,
                        'solução técnica': 5, 'plataforma': 4
                    }
                }
            };
        }

        initialize() {
            KC.logger.info('IntentManager inicializado.');
        }

        getIntents() {
            return Object.values(this.intents);
        }

        getIntent(id) {
            return this.intents[id];
        }
    }

    KC.IntentManager = new IntentManager();

})(window);
