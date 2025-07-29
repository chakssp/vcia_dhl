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
                            } else if (node.querySelector) {
                                const textarea = node.querySelector('#exclusion-patterns');
                                if (textarea) {
                                    this.attachHandlers(textarea);
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