/**
 * DuplicateDetector.js - Sistema de Detecção de Arquivos Duplicados
 * 
 * Detecta e gerencia arquivos duplicados usando múltiplas estratégias:
 * - Duplicatas exatas (mesmo nome + tamanho)
 * - Padrões de nomenclatura (file (1).ext, file - copy.ext)
 * - Versões de arquivos (diferentes tamanhos, nomes similares)
 * - Cross-vault (mesmo conteúdo em locais diferentes)
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class DuplicateDetector {
        constructor() {
            this.duplicateGroups = new Map();
            this.stats = {
                total: 0,
                unique: 0,
                duplicates: 0,
                removable: 0,
                confident: 0
            };
            
            // Padrões de nomenclatura conhecidos
            this.copyPatterns = [
                { regex: /^(.+?)\s*\(\d+\)\s*(\.[^.]+)$/, type: 'numbered' },  // file (1).ext
                { regex: /^(.+?)\s*-\s*copy\s*(\.[^.]+)$/i, type: 'copy' },   // file - copy.ext
                { regex: /^(.+?)\s*-\s*cópia\s*(\.[^.]+)$/i, type: 'copy' },  // file - cópia.ext
                { regex: /^Copy of\s+(.+)$/i, type: 'copy' },                  // Copy of file.ext
                { regex: /^(.+?)_v\d+(\.[^.]+)$/, type: 'version' },          // file_v2.ext
                { regex: /^(.+?)_\d{8}(\.[^.]+)$/, type: 'dated' },           // file_20250113.ext
                { regex: /^(.+?)\s*-\s*backup\s*(\.[^.]+)$/i, type: 'backup' } // file - backup.ext
            ];
            
            KC.Logger?.info('DuplicateDetector inicializado');
        }

        /**
         * Analisa arquivos para detectar duplicatas
         * @param {Array} files - Lista de arquivos para analisar
         * @returns {Object} Resultados da análise
         */
        analyzeDuplicates(files) {
            this.reset();
            this.stats.total = files.length;

            const results = {
                exact: [],      // Mesmo nome + tamanho
                similar: [],    // Padrões de nome similar
                version: [],    // Possíveis versões
                suggested: [],  // Ações sugeridas
                groups: []      // Grupos de duplicatas
            };

            // Estratégia 1: Nome + Tamanho exatos
            const exactDuplicates = this.detectExactDuplicates(files);
            results.exact = exactDuplicates;

            // Estratégia 2: Padrões de nomenclatura
            const patternDuplicates = this.detectPatternDuplicates(files);
            results.similar = patternDuplicates;

            // Estratégia 3: Versões (base similar, tamanhos diferentes)
            const versionDuplicates = this.detectVersionDuplicates(files);
            results.version = versionDuplicates;

            // Agrupa todos os resultados
            results.groups = this.consolidateGroups([
                ...exactDuplicates,
                ...patternDuplicates,
                ...versionDuplicates
            ]);

            // Gera sugestões para cada grupo
            results.groups.forEach(group => {
                const suggestion = this.suggestAction(group);
                group.suggestion = suggestion;
                results.suggested.push(suggestion);
                
                // Atualiza estatísticas
                if (suggestion.confidence >= 0.9) {
                    this.stats.confident += suggestion.remove.length;
                }
                this.stats.removable += suggestion.remove.length;
            });

            this.stats.unique = this.stats.total - this.stats.duplicates;
            
            KC.Logger?.info('Análise de duplicatas concluída', this.stats);
            
            return results;
        }

        /**
         * Detecta duplicatas exatas (mesmo nome + tamanho)
         */
        detectExactDuplicates(files) {
            const groups = new Map();
            
            files.forEach(file => {
                const key = `${file.name}|${file.size}`;
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key).push(file);
            });

            // Filtra apenas grupos com duplicatas
            const duplicateGroups = [];
            groups.forEach((group, key) => {
                if (group.length > 1) {
                    duplicateGroups.push({
                        type: 'exact',
                        key: key,
                        files: group,
                        confidence: 1.0
                    });
                    this.stats.duplicates += group.length - 1;
                }
            });

            return duplicateGroups;
        }

        /**
         * Detecta duplicatas por padrões de nomenclatura
         */
        detectPatternDuplicates(files) {
            const baseNames = new Map();
            const duplicateGroups = [];

            files.forEach(file => {
                let baseName = null;
                let matchedPattern = null;

                // Tenta cada padrão
                for (const pattern of this.copyPatterns) {
                    const match = file.name.match(pattern.regex);
                    if (match) {
                        if (pattern.type === 'copy' && match[1]) {
                            baseName = match[1];
                        } else if (match[1] && match[2]) {
                            baseName = match[1] + match[2];
                        }
                        matchedPattern = pattern.type;
                        break;
                    }
                }

                // Se não encontrou padrão, usa o nome como está
                if (!baseName) {
                    baseName = file.name;
                }

                // Agrupa por nome base
                if (!baseNames.has(baseName)) {
                    baseNames.set(baseName, []);
                }
                
                baseNames.get(baseName).push({
                    file: file,
                    pattern: matchedPattern,
                    baseName: baseName
                });
            });

            // Identifica grupos com potenciais duplicatas
            baseNames.forEach((group, baseName) => {
                if (group.length > 1) {
                    // Verifica se há arquivo original + cópias
                    const original = group.find(item => !item.pattern);
                    const copies = group.filter(item => item.pattern);

                    if (original && copies.length > 0) {
                        duplicateGroups.push({
                            type: 'pattern',
                            baseName: baseName,
                            files: group.map(item => item.file),
                            original: original.file,
                            copies: copies.map(item => item.file),
                            patterns: copies.map(item => item.pattern),
                            confidence: 0.8
                        });
                        this.stats.duplicates += copies.length;
                    }
                }
            });

            return duplicateGroups;
        }

        /**
         * Detecta possíveis versões de arquivos
         */
        detectVersionDuplicates(files) {
            const duplicateGroups = [];
            const processed = new Set();

            files.forEach((file1, index) => {
                if (processed.has(index)) return;

                const similarFiles = [];
                const base1 = this.extractBaseName(file1.name);

                files.forEach((file2, index2) => {
                    if (index === index2 || processed.has(index2)) return;

                    const base2 = this.extractBaseName(file2.name);
                    
                    // Compara similaridade dos nomes base
                    const similarity = this.calculateSimilarity(base1, base2);
                    
                    // Se muito similares mas tamanhos diferentes, pode ser versão
                    if (similarity > 0.8 && file1.size !== file2.size) {
                        similarFiles.push({
                            file: file2,
                            similarity: similarity
                        });
                    }
                });

                if (similarFiles.length > 0) {
                    const allFiles = [file1, ...similarFiles.map(sf => sf.file)];
                    const group = {
                        type: 'version',
                        baseName: base1,
                        files: allFiles,
                        confidence: 0.6
                    };
                    
                    duplicateGroups.push(group);
                    
                    // Marca todos como processados
                    allFiles.forEach(f => {
                        const idx = files.indexOf(f);
                        if (idx !== -1) processed.add(idx);
                    });
                }
            });

            return duplicateGroups;
        }

        /**
         * Sugere ação para um grupo de duplicatas
         */
        suggestAction(duplicateGroup) {
            const files = duplicateGroup.files;
            
            // Ordena por data de modificação (mais recente primeiro)
            const sorted = [...files].sort((a, b) => {
                const dateA = new Date(a.lastModified || 0);
                const dateB = new Date(b.lastModified || 0);
                return dateB - dateA;
            });

            let primary = sorted[0];
            let reason = 'Arquivo mais recente';
            let confidence = duplicateGroup.confidence || 0.5;

            // Para duplicatas exatas, prefere o caminho mais curto (menos aninhado)
            if (duplicateGroup.type === 'exact') {
                const shortestPath = sorted.reduce((shortest, file) => {
                    const depth = (file.path || '').split('/').length;
                    const shortestDepth = (shortest.path || '').split('/').length;
                    return depth < shortestDepth ? file : shortest;
                });
                
                if (shortestPath !== primary) {
                    primary = shortestPath;
                    reason = 'Caminho mais direto e arquivo mais recente';
                }
                confidence = 1.0;
            }

            // Para padrões, sempre prefere o original
            if (duplicateGroup.type === 'pattern' && duplicateGroup.original) {
                primary = duplicateGroup.original;
                reason = 'Arquivo original (sem sufixo de cópia)';
                confidence = 0.9;
            }

            // Para versões, prefere o maior e mais recente
            if (duplicateGroup.type === 'version') {
                const largestNewest = sorted.sort((a, b) => {
                    // Primeiro por tamanho (maior primeiro)
                    if (b.size !== a.size) return b.size - a.size;
                    // Depois por data
                    return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
                })[0];
                
                primary = largestNewest;
                reason = 'Versão mais completa (maior tamanho) e recente';
                confidence = 0.7;
            }

            const duplicates = files.filter(f => f !== primary);

            return {
                keep: primary,
                remove: duplicates,
                reason: reason,
                confidence: confidence,
                savingsKB: duplicates.reduce((sum, f) => sum + (f.size || 0), 0) / 1024
            };
        }

        /**
         * Extrai nome base removendo extensão e números
         */
        extractBaseName(filename) {
            // Remove extensão
            let base = filename.replace(/\.[^.]+$/, '');
            
            // Remove números finais, datas, etc
            base = base.replace(/[\s_-]*\d+$/, '');
            base = base.replace(/[\s_-]*v\d+$/i, '');
            base = base.replace(/[\s_-]*\(\d+\)$/, '');
            base = base.replace(/[\s_-]*copy$/i, '');
            base = base.replace(/[\s_-]*backup$/i, '');
            
            return base.trim();
        }

        /**
         * Calcula similaridade entre dois strings (0-1)
         */
        calculateSimilarity(str1, str2) {
            if (str1 === str2) return 1;
            
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length > str2.length ? str2 : str1;
            
            if (longer.length === 0) return 1.0;
            
            const editDistance = this.levenshteinDistance(longer, shorter);
            return (longer.length - editDistance) / longer.length;
        }

        /**
         * Calcula distância de Levenshtein entre duas strings
         */
        levenshteinDistance(str1, str2) {
            const matrix = [];

            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }

            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }

            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }

            return matrix[str2.length][str1.length];
        }

        /**
         * Consolida grupos removendo sobreposições
         */
        consolidateGroups(allGroups) {
            const consolidated = [];
            const processedFiles = new Set();

            // Ordena por confiança (maior primeiro)
            allGroups.sort((a, b) => b.confidence - a.confidence);

            allGroups.forEach(group => {
                // Verifica se algum arquivo do grupo já foi processado
                const hasProcessed = group.files.some(file => 
                    processedFiles.has(file.path || file.name)
                );

                if (!hasProcessed) {
                    consolidated.push(group);
                    // Marca todos os arquivos como processados
                    group.files.forEach(file => {
                        processedFiles.add(file.path || file.name);
                    });
                }
            });

            return consolidated;
        }

        /**
         * Reseta estatísticas
         */
        reset() {
            this.duplicateGroups.clear();
            this.stats = {
                total: 0,
                unique: 0,
                duplicates: 0,
                removable: 0,
                confident: 0
            };
        }

        /**
         * Obtém estatísticas atuais
         */
        getStats() {
            return { ...this.stats };
        }

        /**
         * Remove duplicatas confirmadas
         */
        removeDuplicates(filesToRemove) {
            const allFiles = KC.AppState.get('files') || [];
            const pathsToRemove = new Set(filesToRemove.map(f => f.path || f.name));
            
            const filteredFiles = allFiles.filter(file => 
                !pathsToRemove.has(file.path || file.name)
            );

            KC.AppState.set('files', filteredFiles);
            
            KC.Logger?.success(`${filesToRemove.length} duplicatas removidas`);
            
            return {
                removed: filesToRemove.length,
                remaining: filteredFiles.length
            };
        }
    }

    // Exporta para o namespace KC
    KC.DuplicateDetector = DuplicateDetector;

    // Cria instância global
    KC.duplicateDetector = new DuplicateDetector();

    console.log('✅ DuplicateDetector carregado');

})(window);