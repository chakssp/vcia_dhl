/**
 * PreviewUtils.js - Sistema de Preview Inteligente
 * 
 * Extrai 5 segmentos estratégicos do conteúdo para economia de 70% em tokens
 * Baseado na especificação do CLAUDE.md
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class PreviewUtils {
        /**
         * Extrai preview inteligente com 5 segmentos
         * @param {string} content - Conteúdo REAL do arquivo
         * @returns {object} Preview estruturado
         */
        static extractSmartPreview(content) {
            if (!content || typeof content !== 'string') {
                return {
                    segment1: '',
                    segment2: '',
                    segment3: '',
                    segment4: '',
                    segment5: '',
                    structure: this.analyzeStructure('')
                };
            }

            return {
                segment1: this.getFirst30Words(content),
                segment2: this.getSecondParagraph(content),
                segment3: this.getLastBeforeColon(content),
                segment4: this.getColonPhrase(content),
                segment5: this.getFirstAfterColon(content),
                structure: this.analyzeStructure(content)
            };
        }

        /**
         * Segmento 1: Primeiras 30 palavras
         */
        static getFirst30Words(content) {
            const words = content.trim().split(/\s+/);
            return words.slice(0, 30).join(' ');
        }

        /**
         * Segmento 2: Segundo parágrafo completo
         */
        static getSecondParagraph(content) {
            const paragraphs = content.split(/\n\n+/);
            return paragraphs[1] || paragraphs[0] || '';
        }

        /**
         * Segmento 3: Último parágrafo antes de ':'
         */
        static getLastBeforeColon(content) {
            const colonIndex = content.indexOf(':');
            if (colonIndex === -1) return '';
            
            const beforeColon = content.substring(0, colonIndex);
            const paragraphs = beforeColon.split(/\n\n+/);
            return paragraphs[paragraphs.length - 1] || '';
        }

        /**
         * Segmento 4: Frase contendo ':'
         */
        static getColonPhrase(content) {
            const lines = content.split('\n');
            const colonLine = lines.find(line => line.includes(':'));
            return colonLine || '';
        }

        /**
         * Segmento 5: Primeiras 30 palavras após ':'
         */
        static getFirstAfterColon(content) {
            const colonIndex = content.indexOf(':');
            if (colonIndex === -1) return '';
            
            const afterColon = content.substring(colonIndex + 1);
            const words = afterColon.trim().split(/\s+/);
            return words.slice(0, 30).join(' ');
        }

        /**
         * Analisa estrutura do conteúdo
         */
        static analyzeStructure(content) {
            return {
                hasHeaders: /^#{1,6}\s/m.test(content),
                hasLists: /^[\*\-\+]\s/m.test(content),
                hasCode: /```[\s\S]*?```/.test(content),
                hasLinks: /\[([^\]]+)\]\(([^)]+)\)/.test(content),
                hasImages: /!\[([^\]]*)\]\(([^)]+)\)/.test(content),
                // Extrai apenas domínios dos links
                linkDomains: this.extractLinkDomains(content)
            };
        }

        /**
         * Extrai domínios dos links Markdown
         */
        static extractLinkDomains(content) {
            const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\/\)]+)/g;
            const domains = new Set();
            let match;
            
            while ((match = linkRegex.exec(content)) !== null) {
                let domain = match[2];
                // Remove www. e protocolo
                domain = domain.replace(/https?:\/\/(www\.)?/, '');
                domains.add(domain);
            }
            
            return Array.from(domains);
        }

        /**
         * Combina todos os segmentos em um preview de texto
         */
        static getTextPreview(smartPreview) {
            const segments = [
                smartPreview.segment1,
                smartPreview.segment2,
                smartPreview.segment3,
                smartPreview.segment4,
                smartPreview.segment5
            ].filter(s => s && s.trim());
            
            return segments.join(' ... ');
        }

        /**
         * Calcula relevância baseada no preview
         * Integra com o sistema existente do FilterManager
         */
        static calculatePreviewRelevance(preview, keywords = []) {
            if (!preview || !keywords.length) return 0;
            
            const textPreview = this.getTextPreview(preview).toLowerCase();
            let score = 0;
            
            // Conta ocorrências de keywords no preview
            keywords.forEach(keyword => {
                const regex = new RegExp(keyword.toLowerCase(), 'g');
                const matches = textPreview.match(regex);
                if (matches) {
                    score += matches.length;
                }
            });
            
            // Bonus por estrutura
            if (preview.structure.hasHeaders) score += 2;
            if (preview.structure.hasLists) score += 1;
            if (preview.structure.hasCode) score += 1;
            
            // Converte score para percentual (0-100)
            // Assume que score máximo realista seria ~20 (muitas keywords + bônus)
            // Score 1 = 5%, Score 5 = 25%, Score 10 = 50%, Score 20+ = 100%
            const percentage = Math.min(100, score * 5);
            
            return percentage;
        }
    }

    // Registra no namespace
    KC.PreviewUtils = PreviewUtils;

    // Adiciona ao window para debug
    window.kcpreview = {
        test: function(content) {
            const preview = PreviewUtils.extractSmartPreview(content);
            console.log('Preview extraído:', preview);
            console.log('Preview texto:', PreviewUtils.getTextPreview(preview));
            return preview;
        }
    };

})(window);