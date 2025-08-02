/**
 * ObsidianPluginUtils.js - Utilitários para integração com plugins do Obsidian
 * 
 * Fornece funções para ler e sincronizar configurações de plugins do Obsidian,
 * especialmente o file-explorer-plus para exclusão de diretórios
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator || {};

    class ObsidianPluginUtils {
        /**
         * Caminho padrão para o arquivo de configuração do file-explorer-plus
         */
        static PLUGIN_DATA_PATH = '.obsidian/plugins/file-explorer-plus/data.json';

        /**
         * Lê as configurações do plugin file-explorer-plus
         * @param {FileSystemDirectoryHandle} rootHandle - Handle do diretório raiz
         * @returns {Promise<Object|null>} Configurações do plugin ou null se não encontrado
         */
        static async readFileExplorerPlusConfig(rootHandle) {
            try {
                // Navegar até o arquivo de configuração
                const pathParts = this.PLUGIN_DATA_PATH.split('/');
                let currentHandle = rootHandle;

                // Navegar pelos diretórios
                for (let i = 0; i < pathParts.length - 1; i++) {
                    try {
                        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
                    } catch (e) {
                        KC.Logger.warn('ObsidianPluginUtils', `Diretório não encontrado: ${pathParts[i]}`);
                        return null;
                    }
                }

                // Obter o arquivo
                const fileName = pathParts[pathParts.length - 1];
                const fileHandle = await currentHandle.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                const content = await file.text();

                return JSON.parse(content);
            } catch (error) {
                KC.Logger.error('ObsidianPluginUtils', 'Erro ao ler configuração do plugin', error);
                return null;
            }
        }

        /**
         * Extrai padrões de exclusão de diretórios da configuração do plugin
         * @param {Object} config - Configuração do plugin
         * @returns {string[]} Array de padrões de exclusão de diretórios
         */
        static extractDirectoryExclusions(config) {
            const exclusions = [];

            if (!config || !config.hideFilters || !config.hideFilters.paths) {
                return exclusions;
            }

            // Filtrar apenas entradas ativas do tipo DIRECTORIES
            const directoryFilters = config.hideFilters.paths.filter(path => 
                path.active && 
                (path.type === 'DIRECTORIES' || path.type === 'FILES_AND_DIRECTORIES') &&
                path.pattern && 
                path.pattern.trim() !== ''
            );

            // Extrair os padrões
            directoryFilters.forEach(filter => {
                let pattern = filter.pattern;

                // Adicionar wildcards se necessário
                if (filter.patternType === 'WILDCARD') {
                    // Já é wildcard, usar como está
                    exclusions.push(pattern);
                } else if (filter.patternType === 'STRICT') {
                    // Para diretórios, queremos excluir o diretório E tudo dentro dele
                    
                    // Adiciona o padrão original
                    exclusions.push(pattern);
                    
                    // Adiciona padrão para excluir tudo dentro
                    exclusions.push(`${pattern}/*`);
                    
                    // Se não tem barra, também adiciona para qualquer nível
                    if (!pattern.includes('/')) {
                        exclusions.push(`*/${pattern}`);
                        exclusions.push(`*/${pattern}/*`);
                    }
                }
            });

            return [...new Set(exclusions)]; // Remover duplicatas
        }

        /**
         * Importa exclusões do Obsidian para o formato do DiscoveryManager
         * @param {FileSystemDirectoryHandle} rootHandle - Handle do diretório raiz
         * @returns {Promise<Object>} Objeto com exclusões e estatísticas
         */
        static async importObsidianExclusions(rootHandle) {
            const result = {
                success: false,
                exclusions: [],
                stats: {
                    totalFound: 0,
                    imported: 0,
                    alreadyExisting: 0
                },
                message: ''
            };

            try {
                // Ler configuração do plugin
                const config = await this.readFileExplorerPlusConfig(rootHandle);
                
                if (!config) {
                    result.message = 'Arquivo de configuração do Obsidian não encontrado';
                    return result;
                }

                // Extrair exclusões
                const obsidianExclusions = this.extractDirectoryExclusions(config);
                result.stats.totalFound = obsidianExclusions.length;

                if (obsidianExclusions.length === 0) {
                    result.message = 'Nenhuma exclusão de diretório encontrada no Obsidian';
                    return result;
                }

                // Obter exclusões atuais do DiscoveryManager
                const currentConfig = KC.AppState.get('configuration')?.discovery || {};
                const currentExclusions = currentConfig.excludePatterns || [];

                // Identificar novas exclusões
                const newExclusions = obsidianExclusions.filter(pattern => 
                    !currentExclusions.includes(pattern)
                );

                result.exclusions = newExclusions;
                result.stats.imported = newExclusions.length;
                result.stats.alreadyExisting = obsidianExclusions.length - newExclusions.length;
                result.success = true;

                if (newExclusions.length > 0) {
                    result.message = `Importadas ${newExclusions.length} novas exclusões do Obsidian`;
                } else {
                    result.message = 'Todas as exclusões do Obsidian já estão configuradas';
                }

                // Log detalhado
                KC.Logger.info('ObsidianPluginUtils', 'Exclusões encontradas no Obsidian:', {
                    total: obsidianExclusions.length,
                    novas: newExclusions.length,
                    padrões: obsidianExclusions
                });

                return result;

            } catch (error) {
                KC.Logger.error('ObsidianPluginUtils', 'Erro ao importar exclusões', error);
                result.message = `Erro ao importar: ${error.message}`;
                return result;
            }
        }

        /**
         * Formata lista de exclusões para exibição
         * @param {string[]} exclusions - Array de padrões de exclusão
         * @returns {string} String formatada para exibição
         */
        static formatExclusionsList(exclusions) {
            if (!exclusions || exclusions.length === 0) {
                return 'Nenhuma exclusão configurada';
            }

            // Agrupar por tipo
            const directories = [];
            const wildcards = [];

            exclusions.forEach(pattern => {
                if (pattern.includes('*')) {
                    wildcards.push(pattern);
                } else {
                    directories.push(pattern);
                }
            });

            let formatted = '';

            if (directories.length > 0) {
                formatted += '📁 Diretórios:\n';
                directories.forEach(dir => {
                    formatted += `  • ${dir}\n`;
                });
            }

            if (wildcards.length > 0) {
                if (formatted) formatted += '\n';
                formatted += '🔍 Padrões Wildcard:\n';
                wildcards.forEach(pattern => {
                    formatted += `  • ${pattern}\n`;
                });
            }

            return formatted;
        }

        /**
         * Verifica se o Obsidian está presente no diretório
         * @param {FileSystemDirectoryHandle} rootHandle - Handle do diretório raiz
         * @returns {Promise<boolean>} True se .obsidian existe
         */
        static async checkObsidianPresence(rootHandle) {
            try {
                await rootHandle.getDirectoryHandle('.obsidian');
                return true;
            } catch {
                return false;
            }
        }
    }

    // Exporta para o namespace KC
    KC.ObsidianPluginUtils = ObsidianPluginUtils;
    window.KnowledgeConsolidator = KC;

    // Debug
    console.log('ObsidianPluginUtils carregado');

})(window);