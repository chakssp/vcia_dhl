/**
 * PatternUtils.js - Utilitários para processamento de padrões e wildcards
 * 
 * Fornece funções para converter padrões com wildcards em regex
 * e testar strings contra esses padrões
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator || {};

    class PatternUtils {
        /**
         * Converte um padrão com wildcards em uma expressão regular
         * @param {string} pattern - Padrão com wildcards (* e ?)
         * @returns {RegExp} Expressão regular correspondente
         */
        static wildcardToRegex(pattern) {
            // Escapa caracteres especiais de regex, exceto * e ?
            const escaped = pattern
                .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escapa caracteres especiais
                .replace(/\*/g, '.*')                  // * = qualquer sequência de caracteres
                .replace(/\?/g, '.');                  // ? = qualquer caractere único
            
            return new RegExp(`^${escaped}$`, 'i'); // Case-insensitive, match completo
        }

        /**
         * Testa se uma string corresponde a um padrão com wildcards
         * @param {string} str - String a testar
         * @param {string} pattern - Padrão com wildcards
         * @returns {boolean} True se corresponde
         */
        static matchesWildcard(str, pattern) {
            const regex = this.wildcardToRegex(pattern);
            return regex.test(str);
        }

        /**
         * Testa se uma string corresponde a algum dos padrões fornecidos
         * @param {string} str - String a testar
         * @param {string[]} patterns - Array de padrões com wildcards
         * @returns {boolean} True se corresponde a algum padrão
         */
        static matchesAnyPattern(str, patterns) {
            return patterns.some(pattern => this.matchesWildcard(str, pattern));
        }

        /**
         * Filtra um array de strings baseado em padrões de inclusão e exclusão
         * @param {string[]} items - Array de strings para filtrar
         * @param {string[]} includePatterns - Padrões de inclusão (opcional)
         * @param {string[]} excludePatterns - Padrões de exclusão (opcional)
         * @returns {string[]} Array filtrado
         */
        static filterByPatterns(items, includePatterns = [], excludePatterns = []) {
            return items.filter(item => {
                // Se há padrões de inclusão, o item deve corresponder a pelo menos um
                if (includePatterns.length > 0) {
                    if (!this.matchesAnyPattern(item, includePatterns)) {
                        return false;
                    }
                }
                
                // Se há padrões de exclusão, o item não deve corresponder a nenhum
                if (excludePatterns.length > 0) {
                    if (this.matchesAnyPattern(item, excludePatterns)) {
                        return false;
                    }
                }
                
                return true;
            });
        }

        /**
         * Testa se um caminho de arquivo corresponde a padrões
         * Testa tanto o nome do arquivo quanto o caminho completo
         * @param {string} filePath - Caminho completo do arquivo
         * @param {string} fileName - Nome do arquivo
         * @param {string[]} patterns - Padrões para testar
         * @returns {boolean} True se corresponde
         */
        static matchesFilePattern(filePath, fileName, patterns) {
            return patterns.some(pattern => {
                return this.matchesWildcard(fileName, pattern) || 
                       this.matchesWildcard(filePath, pattern);
            });
        }

        /**
         * Valida se um padrão é válido
         * @param {string} pattern - Padrão a validar
         * @returns {Object} {valid: boolean, error?: string}
         */
        static validatePattern(pattern) {
            if (!pattern || typeof pattern !== 'string') {
                return { valid: false, error: 'Padrão deve ser uma string não vazia' };
            }

            // Verifica se tem caracteres inválidos para padrões
            // (permite apenas caracteres normais, wildcards e separadores de caminho)
            const invalidChars = /[\x00-\x1f\x7f]/; // Caracteres de controle
            if (invalidChars.test(pattern)) {
                return { valid: false, error: 'Padrão contém caracteres inválidos' };
            }

            return { valid: true };
        }

        /**
         * Extrai a extensão de um nome de arquivo
         * @param {string} fileName - Nome do arquivo
         * @returns {string} Extensão com ponto (ex: '.txt')
         */
        static getFileExtension(fileName) {
            const lastDot = fileName.lastIndexOf('.');
            return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase();
        }

        /**
         * Testa se um arquivo tem uma das extensões especificadas
         * @param {string} fileName - Nome do arquivo
         * @param {string[]} extensions - Array de extensões (com ou sem ponto)
         * @returns {boolean} True se tem uma das extensões
         */
        static hasExtension(fileName, extensions) {
            const fileExt = this.getFileExtension(fileName);
            return extensions.some(ext => {
                const normalizedExt = ext.startsWith('.') ? ext : '.' + ext;
                return fileExt === normalizedExt.toLowerCase();
            });
        }

        /**
         * Converte um array de padrões em uma string legível
         * @param {string[]} patterns - Array de padrões
         * @returns {string} String formatada
         */
        static patternsToString(patterns) {
            if (!patterns || patterns.length === 0) {
                return 'Nenhum padrão definido';
            }
            return patterns.join(', ');
        }

        /**
         * Parse de string de padrões separados por vírgula ou linha
         * @param {string} patternsString - String com padrões
         * @returns {string[]} Array de padrões limpos
         */
        static parsePatterns(patternsString) {
            if (!patternsString) return [];
            
            // Separa por vírgula ou quebra de linha
            return patternsString
                .split(/[,\n]/)
                .map(p => p.trim())
                .filter(p => p.length > 0);
        }
    }

    // Exporta para o namespace KC
    KC.PatternUtils = PatternUtils;
    window.KnowledgeConsolidator = KC;

    // Debug
    console.log('PatternUtils carregado');

})(window);