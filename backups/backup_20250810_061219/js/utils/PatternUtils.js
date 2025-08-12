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
         * Testa se um diretório corresponde a padrões
         * Otimizado para verificação de diretórios antes de entrar neles
         * @param {string} dirPath - Caminho completo do diretório
         * @param {string} dirName - Nome do diretório
         * @param {string[]} patterns - Padrões para testar
         * @returns {boolean} True se o diretório deve ser excluído
         */
        static matchesDirectoryPattern(dirPath, dirName, patterns) {
            if (!patterns || patterns.length === 0) {
                return false;
            }

            return patterns.some(pattern => {
                // Remove barras finais para comparação consistente
                const cleanPattern = pattern.replace(/\/$/, '').trim();
                const cleanDirName = dirName.replace(/\/$/, '').trim();
                const cleanDirPath = dirPath.replace(/\/$/, '').trim();

                // Match exato do nome do diretório (para padrões simples como "node_modules")
                if (!cleanPattern.includes('/') && cleanPattern === cleanDirName) {
                    return true;
                }

                // Match exato do caminho completo (para padrões como "tests/mdesk/reports")
                if (cleanDirPath === cleanPattern) {
                    return true;
                }

                // Verifica se o caminho termina com o padrão (para caminhos relativos)
                if (cleanPattern.includes('/') && cleanDirPath.endsWith(cleanPattern)) {
                    return true;
                }

                // Verifica se o caminho contém o padrão como substring
                // Útil para padrões como "intelligence-lab/storage" que podem estar em qualquer nível
                if (cleanPattern.includes('/') && cleanDirPath.includes(cleanPattern)) {
                    return true;
                }

                // Padrões com ** devem funcionar em qualquer nível
                if (pattern.includes('**')) {
                    // Converte ** para regex apropriado
                    const regexPattern = pattern
                        .replace(/\*\*/g, '.*')
                        .replace(/\*/g, '[^/]*')
                        .replace(/\?/g, '.');
                    
                    const regex = new RegExp(`^${regexPattern}$`, 'i');
                    return regex.test(cleanDirPath) || regex.test(cleanDirName);
                }

                // Padrão com /* no final (excluir tudo dentro)
                if (pattern.endsWith('/*')) {
                    const basePattern = pattern.slice(0, -2); // Remove /*
                    // Verifica se o caminho começa com o padrão base
                    if (cleanDirPath.startsWith(basePattern + '/') || 
                        cleanDirPath === basePattern) {
                        return true;
                    }
                    // Para padrões como */node_modules/*
                    if (basePattern.startsWith('*/')) {
                        const dirToMatch = basePattern.slice(2);
                        const pathSegments = cleanDirPath.split('/');
                        for (let i = 0; i < pathSegments.length - 1; i++) {
                            if (pathSegments[i] === dirToMatch) {
                                return true;
                            }
                        }
                    }
                }

                // Wildcard simples
                if (pattern.includes('*') || pattern.includes('?')) {
                    return this.matchesWildcard(cleanDirName, cleanPattern) || 
                           this.matchesWildcard(cleanDirPath, cleanPattern);
                }

                return false;
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