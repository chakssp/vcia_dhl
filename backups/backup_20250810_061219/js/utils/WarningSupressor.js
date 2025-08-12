/**
 * WarningSupressor.js - Suprime warnings específicos do console
 * 
 * Remove warnings desnecessários que poluem o console,
 * especialmente de componentes legados ou desativados.
 * 
 * @aidev-note warning-supressor; limpa console de warnings obsoletos
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator || {};

    class WarningSupressor {
        constructor() {
            this.suppressedPatterns = [
                'stats-cards',
                'Container stats-cards não encontrado',
                'statsCards'
            ];
            this.originalWarn = null;
            this.suppressedCount = 0;
            this.active = false;
        }

        /**
         * Ativa o supressor
         */
        activate() {
            if (this.active) return;

            // Salvar referência original
            this.originalWarn = console.warn;

            // Substituir console.warn
            console.warn = (...args) => {
                const message = args.join(' ');
                
                // Verificar se deve suprimir
                const shouldSuppress = this.suppressedPatterns.some(pattern => 
                    message.toLowerCase().includes(pattern.toLowerCase())
                );

                if (shouldSuppress) {
                    this.suppressedCount++;
                    // Log apenas em modo debug
                    if (KC.debugMode) {
                        console.debug('[WarningSupressor] Suprimido:', message);
                    }
                    return; // Não mostrar o warning
                }

                // Chamar o warn original
                this.originalWarn.apply(console, args);
            };

            this.active = true;
            console.log('%c✅ WarningSupressor ativado', 'color: #00ff00;');
        }

        /**
         * Desativa o supressor
         */
        deactivate() {
            if (!this.active || !this.originalWarn) return;

            console.warn = this.originalWarn;
            this.active = false;
            console.log(`%c❌ WarningSupressor desativado. ${this.suppressedCount} warnings foram suprimidos.`, 'color: #ff0000;');
        }

        /**
         * Adiciona padrão para suprimir
         */
        addPattern(pattern) {
            if (!this.suppressedPatterns.includes(pattern)) {
                this.suppressedPatterns.push(pattern);
            }
        }

        /**
         * Remove padrão
         */
        removePattern(pattern) {
            const index = this.suppressedPatterns.indexOf(pattern);
            if (index > -1) {
                this.suppressedPatterns.splice(index, 1);
            }
        }

        /**
         * Lista padrões ativos
         */
        listPatterns() {
            console.log('Padrões suprimidos:', this.suppressedPatterns);
            return this.suppressedPatterns;
        }

        /**
         * Estatísticas
         */
        getStats() {
            return {
                active: this.active,
                suppressedCount: this.suppressedCount,
                patterns: this.suppressedPatterns.length
            };
        }
    }

    // Criar instância e ativar automaticamente
    const warningSupressor = new WarningSupressor();
    warningSupressor.activate();

    // Registrar no KC
    KC.WarningSupressor = warningSupressor;

    // Criar atalho global
    window.kcsupressor = warningSupressor;

})(window);