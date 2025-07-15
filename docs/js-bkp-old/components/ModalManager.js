/**
 * ModalManager.js - Gerenciador de Modais
 * Responsável por exibir e gerenciar modais do sistema
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ModalManager {
        constructor() {
            this.activeModals = new Map();
        }

        initialize() {
            console.log('ModalManager inicializado');
            console.log('ModalManager está em:', window.KnowledgeConsolidator.ModalManager);
        }

        /**
         * Exibe um modal
         * @param {string} id - ID único do modal
         * @param {string} content - Conteúdo HTML do modal
         * @param {Object} options - Opções do modal
         */
        showModal(id, content, options = {}) {
            console.log('ModalManager.showModal chamado com ID:', id);
            console.log('Conteúdo do modal:', content);
            
            // Remove modal existente se houver
            this.closeModal(id);

            // Cria overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = `modal-${id}`;
            
            // Cria modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = content;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Adiciona ao mapa de modais ativos
            this.activeModals.set(id, overlay);
            
            // Adiciona classe 'show' após um pequeno delay para ativar a transição
            setTimeout(() => {
                overlay.classList.add('show');
                console.log('Classe show adicionada ao overlay:', overlay.classList.contains('show'));
                console.log('Overlay no DOM:', document.body.contains(overlay));
            }, 10);
            
            // Fecha ao clicar no overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(id);
                }
            });
            
            // Fecha com ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeModal(id);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            
            return overlay;
        }

        /**
         * Fecha um modal específico
         * @param {string} id - ID do modal a ser fechado
         */
        closeModal(id) {
            if (id && this.activeModals.has(id)) {
                const overlay = this.activeModals.get(id);
                overlay.classList.remove('show');
                // Remove após a transição
                setTimeout(() => {
                    overlay.remove();
                }, 300);
                this.activeModals.delete(id);
            } else if (!id) {
                // Fecha todos os modais
                this.activeModals.forEach((overlay) => {
                    overlay.classList.remove('show');
                    setTimeout(() => {
                        overlay.remove();
                    }, 300);
                });
                this.activeModals.clear();
            }
        }

        /**
         * Verifica se um modal está ativo
         * @param {string} id - ID do modal
         */
        isModalActive(id) {
            return this.activeModals.has(id);
        }

        /**
         * Obtém lista de modais ativos
         */
        getActiveModals() {
            return Array.from(this.activeModals.keys());
        }
    }

    KC.ModalManager = new ModalManager();

})(window);
