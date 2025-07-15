/**
 * ChunkingUtils.js - Utilitário para Divisão de Conteúdo
 *
 * Responsável por dividir o conteúdo de texto em pedaços (chunks) lógicos e semânticos,
 * preparando os dados para a extração de insights pelo InsightExtractor.
 */
(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ChunkingUtils {
        constructor() {}

        /**
         * Divide o texto em chunks baseados em parágrafos.
         * Cada chunk é um objeto com o conteúdo e metadados de sua posição.
         * @param {string} content - O conteúdo completo do arquivo.
         * @returns {Array<Object>} - Um array de chunks.
         */
        getChunks(content) {
            if (!content || typeof content !== 'string') {
                return [];
            }

            // Divide por duas ou mais quebras de linha (parágrafos)
            const paragraphs = content.split(/\n{2,}/);

            return paragraphs.map((p, index) => {
                const trimmedParagraph = p.trim();
                if (trimmedParagraph.length === 0) {
                    return null;
                }

                return {
                    id: `chunk-${index}`,
                    content: trimmedParagraph,
                    position: index,
                    length: trimmedParagraph.length,
                    // Metadados futuros podem incluir tipo de chunk (título, lista, etc.)
                };
            }).filter(Boolean); // Remove chunks nulos (parágrafos vazios)
        }

        /**
         * Um método de exemplo para uma futura divisão mais inteligente,
         * que poderia considerar títulos, listas, etc.
         * @param {string} markdownContent - O conteúdo em markdown.
         * @returns {Array<Object>}
         */
        getSemanticChunks(markdownContent) {
            // Lógica futura: poderia usar regex para identificar #, ##, *, -, etc.
            // e criar chunks mais estruturados.
            // Por enquanto, delega para a função mais simples.
            return this.getChunks(markdownContent);
        }
    }

    KC.ChunkingUtils = new ChunkingUtils();

})(window);