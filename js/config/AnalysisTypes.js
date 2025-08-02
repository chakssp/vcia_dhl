/**
 * AnalysisTypes.js - Fonte Única de Tipos de Análise
 * 
 * Define os 5 tipos de análise do sistema e seus atributos
 * SINGLE SOURCE OF TRUTH - Lei 0 e Lei 11
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    /**
     * Definição centralizada dos tipos de análise
     * Usado por: FileRenderer, AnalysisManager, AIAPIManager, StatsPanel
     */
    const ANALYSIS_TYPES = {
        BREAKTHROUGH_TECNICO: {
            id: 'breakthrough_tecnico',
            name: 'Breakthrough Técnico',
            description: 'Soluções técnicas inovadoras, configurações e arquiteturas',
            keywords: ['solução', 'configuração', 'arquitetura', 'implementação', 'código'],
            relevanceBoost: 0.25, // +25%
            priority: 1,
            color: '#4f46e5',
            icon: '🔧',
            categoryId: 'tecnico', // Relaciona com CategoryManager
            intelligenceType: 'technical_innovation' // Mapeamento para Qdrant
        },
        
        EVOLUCAO_CONCEITUAL: {
            id: 'evolucao_conceitual',
            name: 'Evolução Conceitual',
            description: 'Novos entendimentos, perspectivas e visões conceituais',
            keywords: ['entendimento', 'perspectiva', 'visão', 'conceito', 'teoria'],
            relevanceBoost: 0.25, // +25%
            priority: 2,
            color: '#dc2626',
            icon: '💡',
            categoryId: 'conceitual',
            intelligenceType: 'conceptual_evolution' // Mapeamento para Qdrant
        },
        
        MOMENTO_DECISIVO: {
            id: 'momento_decisivo',
            name: 'Momento Decisivo',
            description: 'Decisões importantes, escolhas estratégicas e direcionamentos',
            keywords: ['decisão', 'escolha', 'direção', 'estratégia', 'definição'],
            relevanceBoost: 0.20, // +20%
            priority: 3,
            color: '#d97706',
            icon: '🎯',
            categoryId: 'decisivo',
            intelligenceType: 'decision_point' // Mapeamento para Qdrant
        },
        
        INSIGHT_ESTRATEGICO: {
            id: 'insight_estrategico',
            name: 'Insight Estratégico',
            description: 'Insights transformadores e descobertas estratégicas',
            keywords: ['insight', 'transformação', 'breakthrough', 'descoberta', 'revelação'],
            relevanceBoost: 0.15, // +15%
            priority: 4,
            color: '#7c3aed',
            icon: '✨',
            categoryId: 'insight',
            intelligenceType: 'strategic_insight' // Mapeamento para Qdrant
        },
        
        APRENDIZADO_GERAL: {
            id: 'aprendizado_geral',
            name: 'Aprendizado Geral',
            description: 'Aprendizados e conhecimentos gerais',
            keywords: ['aprendizado', 'conhecimento', 'estudo', 'análise', 'observação'],
            relevanceBoost: 0.05, // +5%
            priority: 5,
            color: '#be185d',
            icon: '📚',
            categoryId: 'aprendizado',
            intelligenceType: 'knowledge_piece' // Mapeamento para Qdrant
        }
    };

    /**
     * Classe para gerenciar tipos de análise
     */
    class AnalysisTypesManager {
        /**
         * Obtém todos os tipos de análise
         */
        getAll() {
            return ANALYSIS_TYPES;
        }

        /**
         * Obtém array de tipos ordenados por prioridade
         */
        getAllAsArray() {
            return Object.values(ANALYSIS_TYPES)
                .sort((a, b) => a.priority - b.priority);
        }

        /**
         * Obtém tipo por ID
         */
        getById(typeId) {
            return Object.values(ANALYSIS_TYPES)
                .find(type => type.id === typeId);
        }

        /**
         * Obtém tipo por nome
         */
        getByName(typeName) {
            return Object.values(ANALYSIS_TYPES)
                .find(type => type.name === typeName);
        }

        /**
         * Detecta tipo de análise baseado no conteúdo
         * @param {Object} file - Arquivo a ser analisado
         * @returns {string} Nome do tipo de análise
         */
        detectType(file) {
            const fileName = (file.name || '').toLowerCase();
            const content = (file.content || '').toLowerCase();
            const combined = fileName + ' ' + content;

            // Percorre tipos em ordem de prioridade
            for (const type of this.getAllAsArray()) {
                // Verifica se alguma keyword do tipo está presente
                const hasKeyword = type.keywords.some(keyword => 
                    combined.includes(keyword.toLowerCase())
                );
                
                if (hasKeyword) {
                    return type.name;
                }
            }

            // Retorna tipo padrão
            return ANALYSIS_TYPES.APRENDIZADO_GERAL.name;
        }

        /**
         * Calcula boost de relevância baseado no tipo
         * @param {string} typeName - Nome do tipo de análise
         * @returns {number} Boost de relevância (0-0.25)
         */
        getRelevanceBoost(typeName) {
            const type = this.getByName(typeName);
            return type ? type.relevanceBoost : 0;
        }

        /**
         * Obtém categoria relacionada ao tipo
         * @param {string} typeName - Nome do tipo de análise
         * @returns {string} ID da categoria
         */
        getRelatedCategory(typeName) {
            const type = this.getByName(typeName);
            return type ? type.categoryId : null;
        }

        /**
         * Formata tipos para uso em prompts de IA
         * @returns {string} Descrição formatada dos tipos
         */
        getPromptDescription() {
            return this.getAllAsArray()
                .map(type => `- ${type.name}: ${type.description}`)
                .join('\n');
        }

        /**
         * Obtém lista de nomes dos tipos (para validação)
         * @returns {string[]} Array com nomes dos tipos
         */
        getTypeNames() {
            return this.getAllAsArray().map(type => type.name);
        }

        /**
         * Obtém o intelligenceType para mapeamento no Qdrant
         * @param {string} analysisTypeName - Nome do tipo de análise
         * @returns {string} Intelligence type correspondente para o Qdrant
         */
        getIntelligenceType(analysisTypeName) {
            const type = this.getByName(analysisTypeName);
            if (!type) {
                KC.Logger?.warning('AnalysisTypesManager', 
                    `Tipo de análise não reconhecido: ${analysisTypeName}, usando fallback 'knowledge_piece'`);
                return 'knowledge_piece';
            }
            return type.intelligenceType || 'knowledge_piece';
        }
    }

    // Registra no namespace global
    KC.AnalysisTypes = ANALYSIS_TYPES;
    KC.AnalysisTypesManager = new AnalysisTypesManager();

})(window);