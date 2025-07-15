
/**
 * InsightExtractor.js - Motor de Extração de Insights
 *
 * Responsável por analisar o conteúdo dos arquivos em dois passos:
 * 1. Shallow Dive: Uma análise rápida para criar um índice de conhecimento e relevância.
 * 2. Deep Dive: Uma extração focada baseada na intenção do usuário.
 */
(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class InsightExtractor {
        constructor() {
            this.knowledgeIndex = null;
            this.stopWords = new Set([
                'a', 'o', 'e', 'ou', 'de', 'do', 'da', 'em', 'no', 'na', 'com', 'por', 'para', 'se', 'mas', 'como', 'que', 'eu', 'você', 'ele', 'nós',
                'um', 'uma', 'são', 'foi', 'será', 'tem', 'tinha', 'não', 'este', 'esse', 'isto', 'isso', 'muito', 'pouco', 'quando', 'onde'
            ]);
        }

        initialize() {
            KC.logger.info('InsightExtractor inicializado.');
            this.buildKnowledgeIndex(); // Constrói o índice na inicialização
        }

        /**
         * PASSO 1: Shallow Dive - Constrói um índice de conhecimento de todos os arquivos.
         * Esta função é chamada uma vez para pré-processar os dados.
         */
        buildKnowledgeIndex() {
            const files = KC.AppState.get('files') || [];
            if (files.length === 0) {
                KC.logger.warn('InsightExtractor: Nenhum arquivo para indexar.');
                return;
            }

            KC.logger.flow('InsightExtractor', 'Iniciando construção do Índice de Conhecimento...');

            const termFrequency = {};
            const fileScores = {};

            files.forEach(file => {
                const content = file.content || '';
                const words = content.toLowerCase().match(/\b\w+\b/g) || [];
                const uniqueWords = new Set();

                words.forEach(word => {
                    if (word.length > 2 && !this.stopWords.has(word)) {
                        termFrequency[word] = (termFrequency[word] || 0) + 1;
                        uniqueWords.add(word);
                    }
                });

                // Calcula uma pontuação de relevância intrínseca
                const score = uniqueWords.size * Math.log(words.length + 1);
                fileScores[file.id] = {
                    id: file.id,
                    name: file.name,
                    score: score,
                    uniqueTerms: uniqueWords.size,
                    totalTerms: words.length
                };
            });

            // Ordena os termos mais frequentes
            const sortedTerms = Object.entries(termFrequency)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 50); // Pega os 50 termos mais relevantes

            // Ordena os arquivos por pontuação
            const sortedFiles = Object.values(fileScores).sort((a, b) => b.score - a.score);

            this.knowledgeIndex = {
                topTerms: sortedTerms,
                fileRelevance: sortedFiles,
                createdAt: new Date().toISOString()
            };

            KC.AppState.set('knowledgeIndex', this.knowledgeIndex);
            KC.logger.success('Índice de Conhecimento construído com sucesso.', { topTerms: sortedTerms.length, indexedFiles: sortedFiles.length });
        }

        /**
         * PASSO 2: Deep Dive - Extrai insights com base na intenção do usuário.
         * @param {string} intentId - O ID da intenção selecionada.
         */
        startExtraction(intentId) {
            KC.logger.flow('InsightExtractor', `Iniciando Deep Dive com a intenção: ${intentId}`);
            const intent = KC.IntentManager.getIntent(intentId);
            if (!intent) {
                KC.logger.error('InsightExtractor', `Intenção desconhecida: ${intentId}`);
                KC.EventBus.emit(KC.Events.PROGRESS_END, { type: 'insight' });
                return;
            }

            if (!this.knowledgeIndex || this.knowledgeIndex.fileRelevance.length === 0) {
                this.buildKnowledgeIndex(); // Garante que o índice exista
            }

            const topFiles = this.knowledgeIndex.fileRelevance.slice(0, 50); // Analisa os 50 arquivos mais relevantes
            const allInsights = [];

            topFiles.forEach(fileMeta => {
                const file = (KC.AppState.get('files') || []).find(f => f.id === fileMeta.id);
                if (!file || !file.content) return;

                const chunks = KC.ChunkingUtils.getChunks(file.content);
                chunks.forEach(chunk => {
                    const score = this.scoreChunk(chunk, intent.keywords);
                    if (score > 0) { // Um threshold simples por enquanto
                        allInsights.push({
                            fileId: file.id,
                            fileName: file.name,
                            chunk: chunk,
                            score: score,
                            intent: intentId
                        });
                    }
                });
            });

            // Ordena os insights pelo score
            allInsights.sort((a, b) => b.score - a.score);

            const dashboardData = this.groupInsightsByTheme(allInsights.slice(0, 20)); // Pega os 20 melhores insights

            KC.AppState.set('dashboardData', dashboardData);
            KC.logger.success('Extração de Insights concluída.', { count: allInsights.length });
            KC.EventBus.emit(KC.Events.PROGRESS_END, { type: 'insight' });
            KC.AppController.navigateToStep(3); // Navega para a etapa do dashboard
        }

        /**
         * Pontua um chunk de texto com base nas keywords de uma intenção.
         * @param {Object} chunk - O chunk de texto.
         * @param {Object} keywords - O objeto de keywords da intenção.
         * @returns {number} - A pontuação do chunk.
         */
        scoreChunk(chunk, keywords) {
            let score = 0;
            const content = chunk.content.toLowerCase();

            for (const [key, weight] of Object.entries(keywords)) {
                if (content.includes(key)) {
                    score += weight;
                }
            }
            return score;
        }

        /**
         * Agrupa os insights por temas (usando os termos mais frequentes).
         * @param {Array<Object>} insights - A lista de insights pontuados.
         * @returns {Object} - Os dados prontos para o dashboard.
         */
        groupInsightsByTheme(insights) {
            const themes = {};
            const topTerms = this.knowledgeIndex.topTerms.map(t => t[0]);

            insights.forEach(insight => {
                let bestTheme = 'Outros';
                let maxCount = 0;

                topTerms.forEach(term => {
                    const count = (insight.chunk.content.match(new RegExp(term, 'gi')) || []).length;
                    if (count > maxCount) {
                        maxCount = count;
                        bestTheme = term.charAt(0).toUpperCase() + term.slice(1);
                    }
                });

                if (!themes[bestTheme]) {
                    themes[bestTheme] = [];
                }
                themes[bestTheme].push(insight);
            });

            return {
                themes: themes,
                generatedAt: new Date().toISOString()
            };
        }
    }

    KC.InsightExtractor = new InsightExtractor();

})(window);
