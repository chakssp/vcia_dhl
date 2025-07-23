/**
 * StatsCoordinator.js - Coordenador Central de Estatísticas
 * 
 * Responsável por manter a consistência de todos os contadores
 * do sistema, evitando divergências entre componentes.
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class StatsCoordinator {
        constructor() {
            this.stats = {
                files: {
                    total: 0,
                    unique: 0,
                    duplicates: 0,
                    approved: 0,
                    pending: 0,
                    archived: 0
                },
                duplicates: {
                    total: 0,
                    confident: 0,
                    removable: 0,
                    groups: {
                        exact: 0,
                        pattern: 0,
                        version: 0
                    }
                },
                relevance: {
                    high: 0,     // >= 70%
                    medium: 0,   // >= 50%
                    low: 0,      // >= 30%
                    none: 0      // < 30%
                },
                types: {},
                sizes: {
                    small: 0,    // < 50KB
                    medium: 0,   // 50-500KB
                    large: 0     // > 500KB
                }
            };
        }

        /**
         * Inicializa o coordenador
         */
        initialize() {
            console.log('[StatsCoordinator] Inicializando');
            
            // Escuta mudanças de estado
            EventBus.on(Events.STATE_CHANGED, (data) => {
                if (data.key === 'files' || data.key === 'stats') {
                    this.updateStats();
                }
            });

            // Escuta descoberta de arquivos
            EventBus.on(Events.FILES_DISCOVERED, () => {
                this.updateStats();
            });

            // Escuta atualizações de arquivos
            EventBus.on(Events.FILES_UPDATED, () => {
                this.updateStats();
            });

            // Atualiza stats iniciais
            this.updateStats();
        }

        /**
         * Atualiza todas as estatísticas baseado no estado atual
         */
        updateStats() {
            const files = AppState.get('files') || [];
            const duplicateStats = AppState.get('stats.duplicateStats');
            
            // Reseta stats
            this.resetStats();
            
            // Calcula estatísticas de arquivos
            files.forEach(file => {
                this.stats.files.total++;
                
                // Status
                if (file.isDuplicate) {
                    this.stats.files.duplicates++;
                } else {
                    this.stats.files.unique++;
                }
                
                // Estado de aprovação
                switch (file.status) {
                    case 'approved':
                        this.stats.files.approved++;
                        break;
                    case 'archived':
                        this.stats.files.archived++;
                        break;
                    default:
                        this.stats.files.pending++;
                }
                
                // Relevância
                const relevance = file.relevanceScore || 0;
                if (relevance >= 70) {
                    this.stats.relevance.high++;
                } else if (relevance >= 50) {
                    this.stats.relevance.medium++;
                } else if (relevance >= 30) {
                    this.stats.relevance.low++;
                } else {
                    this.stats.relevance.none++;
                }
                
                // Tipos
                const ext = this.getFileExtension(file);
                this.stats.types[ext] = (this.stats.types[ext] || 0) + 1;
                
                // Tamanhos
                const size = file.size || 0;
                if (size < 50 * 1024) {
                    this.stats.sizes.small++;
                } else if (size < 500 * 1024) {
                    this.stats.sizes.medium++;
                } else {
                    this.stats.sizes.large++;
                }
            });
            
            // Integra estatísticas de duplicatas
            if (duplicateStats) {
                this.stats.duplicates = {
                    total: duplicateStats.total || 0,
                    confident: duplicateStats.confident || 0,
                    removable: duplicateStats.removable || 0,
                    groups: duplicateStats.groups || {
                        exact: 0,
                        pattern: 0,
                        version: 0
                    }
                };
            }
            
            // Emite evento com stats atualizadas
            EventBus.emit('STATS_UPDATED', this.stats);
            
            console.log('[StatsCoordinator] Stats atualizadas:', this.stats);
        }

        /**
         * Reseta todas as estatísticas
         */
        resetStats() {
            this.stats = {
                files: {
                    total: 0,
                    unique: 0,
                    duplicates: 0,
                    approved: 0,
                    pending: 0,
                    archived: 0
                },
                duplicates: {
                    total: 0,
                    confident: 0,
                    removable: 0,
                    groups: {
                        exact: 0,
                        pattern: 0,
                        version: 0
                    }
                },
                relevance: {
                    high: 0,
                    medium: 0,
                    low: 0,
                    none: 0
                },
                types: {},
                sizes: {
                    small: 0,
                    medium: 0,
                    large: 0
                }
            };
        }

        /**
         * Obtém extensão do arquivo
         */
        getFileExtension(file) {
            const name = file.name || '';
            const lastDot = name.lastIndexOf('.');
            if (lastDot === -1) return 'other';
            
            const ext = name.substring(lastDot + 1).toLowerCase();
            
            // Normaliza extensões conhecidas
            switch (ext) {
                case 'md':
                case 'markdown':
                    return 'md';
                case 'txt':
                case 'text':
                    return 'txt';
                case 'doc':
                case 'docx':
                    return 'docx';
                case 'pdf':
                    return 'pdf';
                case 'gdoc':
                    return 'gdoc';
                default:
                    return ext || 'other';
            }
        }

        /**
         * Obtém estatísticas atuais
         */
        getStats() {
            return { ...this.stats };
        }

        /**
         * Força atualização de stats
         */
        forceUpdate() {
            this.updateStats();
        }
    }

    // Registra no KC
    KC.StatsCoordinator = new StatsCoordinator();

})(window);