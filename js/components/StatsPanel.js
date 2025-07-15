/**
 * StatsPanel.js - Painel de Estatísticas em Tempo Real
 * 
 * Implementa cards de estatísticas baseados no insights-1.2.png
 * com contadores em tempo real e sistema de categorias
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class StatsPanel {
        constructor() {
            this.statsContainer = null;
            this.categoryContainer = null;
            this.actionsContainer = null;
            this.currentStats = {
                arquivosEncontrados: 0,
                candidatosRelevantes: 0,
                jaAnalisados: 0,
                momentosDescobertos: 0,
                categorizados: 0,
                arquivados: 0,
                relevanciaMedia: 0
            };
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            this.statsContainer = document.getElementById('stats-cards');
            this.categoryContainer = document.getElementById('category-manager');
            this.actionsContainer = document.getElementById('system-actions');

            if (!this.statsContainer) {
                KC.Logger?.warning('Container stats-cards não encontrado');
                return;
            }

            this.setupEventListeners();
            this.renderStatsCards();
            this.renderCategories();
            this.setupActions();
            
            // Restaura estado do toggle
            this.restoreToggleState();

            KC.Logger?.success('StatsPanel inicializado com insights-1.2.png e toggle visual');
        }

        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // Escuta mudanças nos arquivos descobertos
            if (Events && Events.FILES_DISCOVERED) {
                EventBus.on(Events.FILES_DISCOVERED, (data) => {
                    this.updateStats({
                        arquivosEncontrados: data.files?.length || 0
                    });
                });
            }

            // Escuta mudanças no estado dos arquivos
            if (Events && Events.STATE_CHANGED) {
                EventBus.on(Events.STATE_CHANGED, (data) => {
                    if (data.path === 'files') {
                        this.calculateStatsFromFiles(data.newValue);
                    }
                });
            }

            // Escuta mudanças nas estatísticas
            if (Events && Events.STATS_UPDATED) {
                EventBus.on(Events.STATS_UPDATED, (data) => {
                    this.updateStats(data.stats);
                });
            }
        }

        /**
         * Renderiza cards de estatísticas baseados no insights-1.2.png
         */
        renderStatsCards() {
            const cardsData = [
                {
                    key: 'arquivosEncontrados',
                    value: this.currentStats.arquivosEncontrados,
                    label: 'Arquivos Encontrados',
                    color: '#6b7280',
                    icon: '📁'
                },
                {
                    key: 'candidatosRelevantes', 
                    value: this.currentStats.candidatosRelevantes,
                    label: 'Candidatos Relevantes',
                    color: '#3b82f6',
                    icon: '🎯'
                },
                {
                    key: 'jaAnalisados',
                    value: this.currentStats.jaAnalisados,
                    label: 'Já Analisados',
                    color: '#8b5cf6',
                    icon: '🔍'
                },
                {
                    key: 'momentosDescobertos',
                    value: this.currentStats.momentosDescobertos,
                    label: 'Momentos Descobertos',
                    color: '#10b981',
                    icon: '💡'
                },
                {
                    key: 'categorizados',
                    value: this.currentStats.categorizados,
                    label: 'Categorizados',
                    color: '#f59e0b',
                    icon: '📂'
                },
                {
                    key: 'arquivados',
                    value: this.currentStats.arquivados,
                    label: 'Arquivados',
                    color: '#6b7280',
                    icon: '📦'
                }
            ];

            const cardsHTML = cardsData.map(card => `
                <div class="stat-card" data-key="${card.key}">
                    <div class="stat-icon" style="color: ${card.color}">
                        ${card.icon}
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" style="color: ${card.color}">
                            ${card.value}
                        </div>
                        <div class="stat-label">
                            ${card.label}
                        </div>
                    </div>
                </div>
            `).join('');

            // Card de relevância média (diferenciado)
            const relevanceCard = `
                <div class="stat-card relevance-card">
                    <div class="relevance-indicator">
                        <div class="relevance-circle">
                            <span class="relevance-value">${Math.round(this.currentStats.relevanciaMedia)}%</span>
                        </div>
                        <div class="relevance-label">Relevância</div>
                    </div>
                </div>
            `;

            this.statsContainer.innerHTML = cardsHTML + relevanceCard;
        }

        /**
         * Renderiza sistema de categorias com badges coloridos
         */
        renderCategories() {
            const categories = AppState.get('categories') || [];
            
            const categoriesHTML = categories.map(category => `
                <div class="category-badge" data-id="${category.id}">
                    <span class="category-color" style="background-color: ${category.color}"></span>
                    <span class="category-name">${category.name}</span>
                    <span class="category-count">${category.count || 0}</span>
                    <button class="category-remove" data-id="${category.id}">×</button>
                </div>
            `).join('');

            const categoriesContainer = this.categoryContainer?.querySelector('#categories-list');
            if (categoriesContainer) {
                categoriesContainer.innerHTML = categoriesHTML;
            }

            // Adiciona event listeners para categorias
            this.setupCategoryListeners();
        }

        /**
         * Configura listeners para categorias
         */
        setupCategoryListeners() {
            const addBtn = document.getElementById('add-category');
            const input = document.getElementById('new-category');

            if (addBtn && input) {
                addBtn.addEventListener('click', () => {
                    const name = input.value.trim();
                    if (name) {
                        this.addCategory(name);
                        input.value = '';
                    }
                });

                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        addBtn.click();
                    }
                });
            }

            // Listeners para remover categorias
            document.querySelectorAll('.category-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const categoryId = e.target.dataset.id;
                    this.removeCategory(categoryId);
                });
            });
        }

        /**
         * Configura ações do sistema
         */
        setupActions() {
            const executeBtn = document.getElementById('execute-system');
            const resetBtn = document.getElementById('reset-config');
            const validateBtn = document.getElementById('validate-completeness');
            const summaryBtn = document.getElementById('generate-summary');
            const exportBtn = document.getElementById('export-state');

            if (executeBtn) {
                executeBtn.addEventListener('click', () => {
                    EventBus.emit(Events.EXECUTE_SYSTEM_REQUESTED);
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
                        EventBus.emit(Events.RESET_CONFIGURATION_REQUESTED);
                    }
                });
            }

            // Novos botões de validação
            if (validateBtn) {
                validateBtn.addEventListener('click', () => {
                    this.validateCompleteness();
                });
            }

            if (summaryBtn) {
                summaryBtn.addEventListener('click', () => {
                    this.generateSummary();
                });
            }

            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportState();
                });
            }
        }

        /**
         * Adiciona nova categoria
         */
        addCategory(name) {
            const categories = AppState.get('categories') || [];
            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
            
            const newCategory = {
                id: `cat_${Date.now()}`,
                name: name,
                color: colors[categories.length % colors.length],
                count: 0
            };

            categories.push(newCategory);
            AppState.set('categories', categories);
            this.renderCategories();

            KC.Logger?.success(`Categoria "${name}" adicionada`);
        }

        /**
         * Remove categoria
         */
        removeCategory(categoryId) {
            const categories = AppState.get('categories') || [];
            const updatedCategories = categories.filter(cat => cat.id !== categoryId);
            
            AppState.set('categories', updatedCategories);
            this.renderCategories();

            KC.Logger?.info(`Categoria removida`);
        }

        /**
         * Calcula estatísticas baseadas nos arquivos
         */
        calculateStatsFromFiles(files = []) {
            const stats = {
                arquivosEncontrados: files.length,
                candidatosRelevantes: files.filter(f => f.relevanceScore >= 0.5).length,
                jaAnalisados: files.filter(f => f.status === 'analyzed').length,
                momentosDescobertos: files.filter(f => f.category && f.status === 'analyzed').length,
                categorizados: files.filter(f => f.category).length,
                arquivados: files.filter(f => f.status === 'archived').length,
                relevanciaMedia: files.length > 0 ? 
                    files.reduce((sum, f) => sum + (f.relevanceScore || 0), 0) / files.length * 100 : 0
            };

            this.updateStats(stats);
        }

        /**
         * Atualiza estatísticas na interface
         */
        updateStats(newStats) {
            this.currentStats = { ...this.currentStats, ...newStats };
            
            // Atualiza cards individuais
            Object.keys(newStats).forEach(key => {
                const card = document.querySelector(`[data-key="${key}"] .stat-value`);
                if (card) {
                    card.textContent = newStats[key];
                    card.classList.add('stat-updated');
                    setTimeout(() => card.classList.remove('stat-updated'), 300);
                }
            });

            // Atualiza indicador de relevância
            if (newStats.relevanciaMedia !== undefined) {
                const relevanceValue = document.querySelector('.relevance-value');
                if (relevanceValue) {
                    relevanceValue.textContent = `${Math.round(newStats.relevanciaMedia)}%`;
                }
            }

            // Atualiza footer
            this.updateFooterStats();
        }

        /**
         * Atualiza estatísticas no footer
         */
        updateFooterStats() {
            const footerStats = document.getElementById('footer-stats');
            if (footerStats) {
                const { arquivosEncontrados, candidatosRelevantes, jaAnalisados } = this.currentStats;
                footerStats.textContent = `${arquivosEncontrados} encontrados • ${candidatosRelevantes} relevantes • ${jaAnalisados} analisados`;
            }
        }

        /**
         * Mostra/oculta painel de estatísticas
         */
        show() {
            const section = document.getElementById('stats-section');
            if (section) {
                section.style.display = 'block';
                this.renderStatsCards();
            }
        }

        hide() {
            const section = document.getElementById('stats-section');
            if (section) {
                section.style.display = 'none';
            }
        }

        /**
         * Valida completude da etapa 2
         */
        validateCompleteness() {
            if (!KC.StatsManager) {
                KC.showNotification({
                    type: 'error',
                    message: 'StatsManager não disponível',
                    duration: 3000
                });
                return;
            }

            const validation = KC.StatsManager.getValidationStatus();
            
            // Cria modal com resultado da validação
            const modalContent = `
                <div class="validation-modal">
                    <h3>📋 Validação de Completude - Etapa 2</h3>
                    
                    <div class="validation-stats">
                        <div class="stat-row">
                            <span>Total de Arquivos:</span>
                            <strong>${validation.totalFiles}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Arquivos Analisados:</span>
                            <strong class="${validation.analyzedFiles > 0 ? 'success' : 'warning'}">
                                ${validation.analyzedFiles} (${validation.completionPercentage}%)
                            </strong>
                        </div>
                        <div class="stat-row">
                            <span>Pendentes de Análise:</span>
                            <strong class="${validation.pendingFiles === 0 ? 'success' : 'warning'}">
                                ${validation.pendingFiles}
                            </strong>
                        </div>
                    </div>
                    
                    <div class="validation-requirements">
                        <h4>Requisitos:</h4>
                        <ul>
                            <li class="${validation.requirements.hasFiles ? 'check' : 'cross'}">
                                ${validation.requirements.hasFiles ? '✅' : '❌'} Ter arquivos descobertos
                            </li>
                            <li class="${validation.requirements.hasRelevantFiles ? 'check' : 'cross'}">
                                ${validation.requirements.hasRelevantFiles ? '✅' : '❌'} Ter arquivos relevantes
                            </li>
                            <li class="${validation.requirements.hasAnalysis ? 'check' : 'cross'}">
                                ${validation.requirements.hasAnalysis ? '✅' : '❌'} Ter pelo menos 1 análise
                            </li>
                            <li class="${validation.requirements.allAnalyzed ? 'check' : 'cross'}">
                                ${validation.requirements.allAnalyzed ? '✅' : '❌'} Todos analisados (opcional)
                            </li>
                        </ul>
                    </div>
                    
                    <div class="validation-result ${validation.canProceed ? 'success' : 'warning'}">
                        ${validation.canProceed 
                            ? '✅ Você pode prosseguir para a Etapa 3!' 
                            : '⚠️ Complete os requisitos antes de prosseguir'}
                    </div>
                </div>
            `;
            
            if (KC.ModalManager) {
                KC.ModalManager.showModal('validation', modalContent);
            }
        }

        /**
         * Gera resumo dos dados para dashboard
         */
        generateSummary() {
            const stats = KC.StatsManager ? KC.StatsManager.getStats() : this.currentStats;
            const files = AppState.get('files') || [];
            
            // Agrupa por tipo de análise
            const analysisSummary = {};
            files.forEach(file => {
                if (file.analyzed && file.analysisType) {
                    analysisSummary[file.analysisType] = (analysisSummary[file.analysisType] || 0) + 1;
                }
            });
            
            // Gera resumo HTML
            const summaryContent = `
                <div class="summary-modal">
                    <h3>📊 Resumo da Análise</h3>
                    
                    <div class="summary-section">
                        <h4>Estatísticas Gerais</h4>
                        <ul>
                            <li>Total de Arquivos: <strong>${stats.arquivosEncontrados}</strong></li>
                            <li>Candidatos Relevantes: <strong>${stats.candidatosRelevantes}</strong></li>
                            <li>Já Analisados: <strong>${stats.jaAnalisados}</strong></li>
                            <li>Momentos Descobertos: <strong>${stats.momentosDescobertos}</strong></li>
                            <li>Relevância Média: <strong>${stats.relevanciaMedia}%</strong></li>
                        </ul>
                    </div>
                    
                    <div class="summary-section">
                        <h4>Distribuição por Tipo</h4>
                        <ul>
                            ${Object.entries(analysisSummary).map(([type, count]) => 
                                `<li>${type}: <strong>${count}</strong></li>`
                            ).join('')}
                        </ul>
                    </div>
                    
                    <div class="summary-actions">
                        <button class="btn btn-secondary" onclick="KC.ModalManager.closeModal('summary')">
                            Fechar
                        </button>
                        <button class="btn btn-primary" onclick="KC.StatsPanel.copyToClipboard(this.dataset.summary)" 
                                data-summary='${JSON.stringify({stats, analysisSummary})}'>
                            📋 Copiar Resumo
                        </button>
                    </div>
                </div>
            `;
            
            if (KC.ModalManager) {
                KC.ModalManager.showModal('summary', summaryContent);
            }
        }

        /**
         * Exporta estado atual do sistema
         */
        exportState() {
            const exportData = {
                timestamp: new Date().toISOString(),
                version: '1.3.0',
                stats: KC.StatsManager ? KC.StatsManager.exportStats() : null,
                configuration: AppState.get('configuration'),
                files: AppState.get('files') || [],
                categories: AppState.get('categories') || [],
                filters: KC.FilterManager ? KC.FilterManager.getConfig() : null
            };
            
            // Cria blob e download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `knowledge-consolidator-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            KC.showNotification({
                type: 'success',
                message: '💾 Estado exportado com sucesso!',
                duration: 3000
            });
        }

        /**
         * Copia texto para clipboard
         */
        copyToClipboard(text) {
            try {
                const textToCopy = typeof text === 'string' ? text : JSON.stringify(JSON.parse(text), null, 2);
                navigator.clipboard.writeText(textToCopy).then(() => {
                    KC.showNotification({
                        type: 'success',
                        message: '📋 Copiado para a área de transferência!',
                        duration: 2000
                    });
                });
            } catch (error) {
                KC.Logger?.error('Erro ao copiar:', error);
            }
        }

        /**
         * Toggle visual do painel (expandido/minimizado)
         */
        toggle() {
            const statsSection = document.getElementById('stats-section');
            if (!statsSection) return;

            // Obtém estado atual
            const isExpanded = statsSection.classList.contains('expanded');
            const isMinimized = statsSection.classList.contains('minimized');

            // Remove todas as classes de estado
            statsSection.classList.remove('expanded', 'minimized', 'hidden');

            // Define novo estado
            if (isExpanded) {
                statsSection.classList.add('minimized');
                this.saveToggleState('minimized');
            } else {
                statsSection.classList.add('expanded');
                this.saveToggleState('expanded');
            }

            // Log para debug
            KC.Logger?.info('StatsPanel toggle:', { 
                from: isExpanded ? 'expanded' : 'minimized',
                to: isExpanded ? 'minimized' : 'expanded'
            });
        }

        /**
         * Salva preferência de toggle no localStorage
         */
        saveToggleState(state) {
            try {
                localStorage.setItem('statsPanel.toggleState', state);
            } catch (error) {
                KC.Logger?.warning('Erro ao salvar estado do toggle:', error);
            }
        }

        /**
         * Restaura preferência de toggle do localStorage
         */
        restoreToggleState() {
            try {
                const savedState = localStorage.getItem('statsPanel.toggleState');
                if (savedState && ['expanded', 'minimized', 'hidden'].includes(savedState)) {
                    const statsSection = document.getElementById('stats-section');
                    if (statsSection) {
                        statsSection.classList.remove('expanded', 'minimized', 'hidden');
                        statsSection.classList.add(savedState);
                    }
                }
            } catch (error) {
                KC.Logger?.warning('Erro ao restaurar estado do toggle:', error);
            }
        }
    }

    // Cria instância singleton
    KC.StatsPanel = new StatsPanel();
    
    // Expõe métodos para onclick handlers
    KC.StatsPanel.toggle = KC.StatsPanel.toggle.bind(KC.StatsPanel);
    KC.StatsPanel.copyToClipboard = KC.StatsPanel.copyToClipboard.bind(KC.StatsPanel);

})(window);