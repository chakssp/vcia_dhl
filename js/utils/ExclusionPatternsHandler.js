/**
 * ExclusionPatternsHandler.js - Gerenciador de Padrões de Exclusão
 * 
 * Adiciona handlers ao textarea de padrões de exclusão para garantir
 * que os valores sejam salvos corretamente no AppState
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator || {};

    class ExclusionPatternsHandler {
        static initialize() {
            // Aguarda o DOM carregar
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }

        static setup() {
            // Usa MutationObserver para detectar quando o textarea é criado
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Verifica se é o textarea ou contém o textarea
                            if (node.id === 'exclusion-patterns') {
                                this.attachHandlers(node);
                                // REMOVIDO: Botão agora é automático na Etapa 1
                                // this.addObsidianImportButton(node);
                            } else if (node.querySelector) {
                                const textarea = node.querySelector('#exclusion-patterns');
                                if (textarea) {
                                    this.attachHandlers(textarea);
                                    // REMOVIDO: Botão agora é automático na Etapa 1
                                    // this.addObsidianImportButton(textarea);
                                }
                            }
                        }
                    });
                });
            });

            // Observa mudanças no body
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Tenta encontrar o textarea se já existir
            const existingTextarea = document.getElementById('exclusion-patterns');
            if (existingTextarea) {
                this.attachHandlers(existingTextarea);
                // REMOVIDO: Botão agora é automático na Etapa 1
                // this.addObsidianImportButton(existingTextarea);
            }
        }

        static attachHandlers(textarea) {
            console.log('Anexando handlers ao textarea de exclusion patterns');

            // Remove handlers anteriores para evitar duplicação
            textarea.removeEventListener('blur', this.handleUpdate);
            textarea.removeEventListener('change', this.handleUpdate);

            // Adiciona novos handlers
            textarea.addEventListener('blur', this.handleUpdate);
            textarea.addEventListener('change', this.handleUpdate);

            // Carrega padrões salvos
            this.loadSavedPatterns(textarea);
        }

        static handleUpdate(event) {
            const textarea = event.target;
            const value = textarea.value;
            
            // Converte string em array de padrões
            const patterns = value
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            // Salva no AppState
            KC.AppState.set('configuration.discovery.excludePatterns', patterns);
            
            // Atualiza também no DiscoveryManager se existir
            if (KC.DiscoveryManager && KC.DiscoveryManager.defaultConfig) {
                KC.DiscoveryManager.defaultConfig.excludePatterns = patterns;
                console.log(`Padrões de exclusão atualizados: ${patterns.length} padrões salvos`);
            }
        }

        static loadSavedPatterns(textarea) {
            // Carrega padrões salvos do AppState
            const savedPatterns = KC.AppState.get('configuration.discovery.excludePatterns');
            
            if (Array.isArray(savedPatterns) && savedPatterns.length > 0) {
                // Atualiza o valor do textarea com os padrões salvos
                textarea.value = savedPatterns.join(', ');
                console.log(`Carregados ${savedPatterns.length} padrões de exclusão salvos`);
            }
        }

        static addObsidianImportButton(textarea) {
            // Verifica se o botão já existe
            const existingButton = document.getElementById('import-obsidian-exclusions');
            if (existingButton) {
                return;
            }

            // Cria o botão
            const button = document.createElement('button');
            button.id = 'import-obsidian-exclusions';
            button.className = 'import-obsidian-btn';
            button.innerHTML = '🔮 Importar Exclusões do Obsidian';
            button.title = 'Importar padrões de exclusão do plugin file-explorer-plus do Obsidian';
            
            // Estilo do botão
            button.style.cssText = `
                margin-top: 10px;
                padding: 8px 16px;
                background: #7C3AED;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
                display: block;
                width: 100%;
            `;

            // Hover effect
            button.addEventListener('mouseenter', () => {
                button.style.background = '#6D28D9';
                button.style.transform = 'translateY(-1px)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.background = '#7C3AED';
                button.style.transform = 'translateY(0)';
            });

            // Click handler
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleObsidianImport(textarea);
            });

            // Insere o botão após o textarea
            if (textarea.parentNode) {
                textarea.parentNode.insertBefore(button, textarea.nextSibling);
            }
        }

        static async handleObsidianImport(textarea) {
            try {
                // Desabilita o botão durante o processo
                const button = document.getElementById('import-obsidian-exclusions');
                const originalText = button.innerHTML;
                button.disabled = true;
                button.innerHTML = '⏳ Importando...';

                // Chama o método de importação do DiscoveryManager
                if (!KC.DiscoveryManager) {
                    throw new Error('DiscoveryManager não está disponível');
                }

                const result = await KC.DiscoveryManager.importObsidianExclusions();

                if (result.success) {
                    // Atualiza o textarea com os novos padrões
                    const currentPatterns = KC.AppState.get('configuration.discovery.excludePatterns') || [];
                    textarea.value = currentPatterns.join(', ');

                    // Mostra notificação de sucesso
                    if (KC.showNotification) {
                        KC.showNotification({
                            type: 'success',
                            message: result.message,
                            details: `Total de exclusões: ${currentPatterns.length}`
                        });
                    } else {
                        alert(result.message);
                    }

                    // Log detalhado
                    if (result.stats) {
                        console.log('Estatísticas de importação:', {
                            encontradas: result.stats.totalFound,
                            importadas: result.stats.imported,
                            existentes: result.stats.alreadyExisting
                        });
                    }
                } else {
                    // Mostra erro
                    if (KC.showNotification) {
                        KC.showNotification({
                            type: 'error',
                            message: 'Erro ao importar exclusões',
                            details: result.message
                        });
                    } else {
                        alert(`Erro: ${result.message}`);
                    }
                }

                // Restaura o botão
                button.disabled = false;
                button.innerHTML = originalText;

            } catch (error) {
                console.error('Erro ao importar exclusões do Obsidian:', error);
                
                // Mostra erro
                if (KC.showNotification) {
                    KC.showNotification({
                        type: 'error',
                        message: 'Erro ao importar exclusões',
                        details: error.message
                    });
                } else {
                    alert(`Erro: ${error.message}`);
                }

                // Restaura o botão
                const button = document.getElementById('import-obsidian-exclusions');
                if (button) {
                    button.disabled = false;
                    button.innerHTML = '🔮 Importar Exclusões do Obsidian';
                }
            }
        }

        static getPatterns() {
            // Método utilitário para obter os padrões atuais
            return KC.AppState.get('configuration.discovery.excludePatterns') || [];
        }

        static setPatterns(patterns) {
            // Método utilitário para definir padrões programaticamente
            if (!Array.isArray(patterns)) {
                console.error('Padrões devem ser um array');
                return false;
            }

            KC.AppState.set('configuration.discovery.excludePatterns', patterns);
            
            // Atualiza o textarea se existir
            const textarea = document.getElementById('exclusion-patterns');
            if (textarea) {
                textarea.value = patterns.join(', ');
            }

            // Atualiza o DiscoveryManager
            if (KC.DiscoveryManager && KC.DiscoveryManager.defaultConfig) {
                KC.DiscoveryManager.defaultConfig.excludePatterns = patterns;
            }

            return true;
        }
    }

    // Exporta para o namespace KC
    KC.ExclusionPatternsHandler = ExclusionPatternsHandler;
    window.KnowledgeConsolidator = KC;

    // Inicializa automaticamente
    ExclusionPatternsHandler.initialize();

    console.log('ExclusionPatternsHandler carregado e inicializado');

})(window);