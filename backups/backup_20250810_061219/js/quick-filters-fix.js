/**
 * Correção para a funcionalidade da barra de filtros rápidos
 * Este arquivo sobrescreve a função setupQuickFiltersBar com uma versão corrigida
 */

(function() {
    'use strict';
    
    // Aguardar o carregamento completo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixQuickFilters);
    } else {
        fixQuickFilters();
    }
    
    function fixQuickFilters() {
        // Verificar se KC existe
        if (!window.KC) {
            console.error('Knowledge Consolidator não carregado');
            return;
        }
        
        // Sobrescrever a função setupQuickFiltersBar
        window.setupQuickFiltersBar = function() {
            console.log('Inicializando barra de filtros rápidos (versão corrigida)...');
            
            const quickFiltersToggle = document.getElementById('quick-filters-toggle');
            const quickFiltersBar = document.getElementById('quick-filters-bar');
            
            if (!quickFiltersToggle || !quickFiltersBar) {
                console.warn('Elementos de filtros rápidos não encontrados');
                return;
            }
            
            // Estado inicial - fechado
            let isExpanded = false;
            
            // Toggle ao clicar no botão
            quickFiltersToggle.addEventListener('click', () => {
                isExpanded = !isExpanded;
                if (isExpanded) {
                    quickFiltersBar.classList.add('show');
                    quickFiltersToggle.title = 'Ocultar Filtros Rápidos';
                } else {
                    quickFiltersBar.classList.remove('show');
                    quickFiltersToggle.title = 'Mostrar Filtros Rápidos';
                }
            });
            
            // ESC fecha a barra
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isExpanded) {
                    isExpanded = false;
                    quickFiltersBar.classList.remove('show');
                    quickFiltersToggle.title = 'Mostrar Filtros Rápidos';
                }
            });
            
            // Adicionar listeners aos filtros com delegação de eventos
            quickFiltersBar.addEventListener('click', (e) => {
                const item = e.target.closest('.quick-filter-item');
                if (!item) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const filterType = item.dataset.filter;
                const filterValue = item.dataset.value;
                
                console.log('Filtro clicado:', filterType, filterValue);
                
                // Verificar se FilterManager existe
                if (!KC.FilterManager) {
                    console.error('FilterManager não disponível');
                    if (KC.showNotification) {
                        KC.showNotification({
                            type: 'error',
                            message: 'Sistema de filtros não está carregado',
                            duration: 3000
                        });
                    }
                    return;
                }
                
                // Aplicar filtro
                applyQuickFilter(filterType, filterValue);
                
                // Atualizar visual
                quickFiltersBar.querySelectorAll('.quick-filter-item').forEach(f => {
                    f.classList.remove('active');
                });
                item.classList.add('active');
                
                // Scroll para lista de arquivos
                const filesSection = document.getElementById('files-section');
                if (filesSection && filesSection.style.display !== 'none') {
                    filesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            
            // Botão de navegação - Etapa anterior
            const navPrev = document.getElementById('nav-prev');
            if (navPrev) {
                navPrev.addEventListener('click', (e) => {
                    e.preventDefault();
                    const currentStep = KC.AppState.get('currentStep') || 2;
                    if (currentStep > 1 && KC.AppController) {
                        // Navegar apenas para etapa anterior imediata
                        KC.AppController.navigateToStep(currentStep - 1);
                    }
                });
            }
            
            // Botão de navegação - Próxima etapa
            const navNext = document.getElementById('nav-next');
            if (navNext) {
                navNext.addEventListener('click', (e) => {
                    e.preventDefault();
                    const currentStep = KC.AppState.get('currentStep') || 2;
                    if (currentStep < 4 && KC.AppController) {
                        // Navegar apenas para próxima etapa imediata
                        KC.AppController.navigateToStep(currentStep + 1);
                    }
                });
            }
            
            // Botão exportar
            const exportFilter = document.getElementById('export-filter');
            if (exportFilter) {
                exportFilter.addEventListener('click', (e) => {
                    e.preventDefault();
                    exportCurrentFilter();
                });
            }
            
            // Atualizar contadores quando arquivos mudarem
            KC.EventBus.on('FILES_UPDATED', updateQuickFilterCounters);
            KC.EventBus.on('STATE_CHANGED', (data) => {
                if (data.key === 'files') {
                    updateQuickFilterCounters();
                }
            });
            
            // Sincronizar com mudanças nos filtros principais
            KC.EventBus.on('FILTERS_CHANGED', syncQuickFiltersState);
            
            // Atualizar contadores iniciais
            updateQuickFilterCounters();
            
            // Sincronizar estado inicial dos filtros
            syncQuickFiltersState();
            
            console.log('Barra de filtros rápidos inicializada com sucesso');
        };
        
        // Função para aplicar filtros
        function applyQuickFilter(filterType, filterValue) {
            console.log('Aplicando filtro:', filterType, '=', filterValue);
            
            // Verificar estrutura de filtros do FilterManager
            if (!KC.FilterManager || !KC.FilterManager.filters) {
                console.error('FilterManager não está pronto');
                return;
            }
            
            // Limpar todos os filtros primeiro
            KC.FilterManager.clearAllFilters();
            
            // Aplicar filtro baseado no tipo
            if (filterType === 'status') {
                if (filterValue === 'todos') {
                    // Mostrar todos - marcar radio "all" em status
                    const allRadio = document.querySelector('input[name="status"][value="all"]');
                    if (allRadio) {
                        allRadio.checked = true;
                        allRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (filterValue === 'pendente') {
                    // Mostrar apenas pendentes
                    const pendingRadio = document.querySelector('input[name="status"][value="pending"]');
                    if (pendingRadio) {
                        pendingRadio.checked = true;
                        pendingRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (filterValue === 'aprovados') {
                    // Mostrar apenas aprovados
                    const approvedRadio = document.querySelector('input[name="status"][value="approved"]');
                    if (approvedRadio) {
                        approvedRadio.checked = true;
                        approvedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            } else if (filterType === 'relevance') {
                if (filterValue === 'todos') {
                    // Mostrar todos
                    const allRadio = document.querySelector('input[name="relevance"][value="all"]');
                    if (allRadio) {
                        allRadio.checked = true;
                        allRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (filterValue === 'alta') {
                    const highRadio = document.querySelector('input[name="relevance"][value="high"]');
                    if (highRadio) {
                        highRadio.checked = true;
                        highRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (filterValue === 'media') {
                    const mediumRadio = document.querySelector('input[name="relevance"][value="medium"]');
                    if (mediumRadio) {
                        mediumRadio.checked = true;
                        mediumRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (filterValue === 'baixa') {
                    const lowRadio = document.querySelector('input[name="relevance"][value="low"]');
                    if (lowRadio) {
                        lowRadio.checked = true;
                        lowRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
            
            // Notificar
            if (KC.showNotification) {
                KC.showNotification({
                    type: 'info',
                    message: `Filtro aplicado: ${filterValue}`,
                    duration: 2000
                });
            }
        }
        
        // Função para exportar filtro atual
        function exportCurrentFilter() {
            const files = KC.AppState.get('files') || [];
            const filteredFiles = KC.FilterManager ? KC.FilterManager.getFilteredFiles() : files;
            
            const exportData = {
                timestamp: new Date().toISOString(),
                totalFiles: files.length,
                filteredFiles: filteredFiles.length,
                files: filteredFiles.map(f => ({
                    id: f.id,
                    name: f.name,
                    path: f.path,
                    relevanceScore: f.relevanceScore,
                    categories: f.categories || [],
                    approved: f.approved || false,
                    archived: f.archived || false
                }))
            };
            
            // Download como JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `filtro-export-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            if (KC.showNotification) {
                KC.showNotification({
                    type: 'success',
                    message: 'Filtro exportado com sucesso!',
                    duration: 3000
                });
            }
        }
        
        // Função para atualizar contadores
        window.updateQuickFilterCounters = function() {
            const files = KC.AppState.get('files') || [];
            
            // Contadores de status
            const allCount = files.length;
            const pendingCount = files.filter(f => !f.approved && !f.archived).length;
            const approvedCount = files.filter(f => f.approved && !f.archived).length;
            
            // Contadores de relevância
            const highCount = files.filter(f => f.relevanceScore >= 70 && !f.archived).length;
            const mediumCount = files.filter(f => f.relevanceScore >= 30 && f.relevanceScore < 70 && !f.archived).length;
            const lowCount = files.filter(f => f.relevanceScore < 30 && !f.archived).length;
            
            // Atualizar elementos
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            updateElement('quick-count-all', allCount);
            updateElement('quick-count-pending', pendingCount);
            updateElement('quick-count-approved', approvedCount);
            updateElement('quick-count-high', highCount);
            updateElement('quick-count-medium', mediumCount);
            updateElement('quick-count-low', lowCount);
            
            // Atualizar navegação
            const currentStep = KC.AppState.get('currentStep') || 2;
            const navPrev = document.getElementById('nav-prev');
            const navNext = document.getElementById('nav-next');
            
            if (navPrev) {
                const prevText = navPrev.querySelector('span');
                if (prevText) {
                    // Mostrar número romano para etapas
                    const romanNumerals = ['I', 'II', 'III', 'IV'];
                    const prevStep = currentStep > 1 ? currentStep - 1 : 1;
                    prevText.textContent = `◀ Etapa ${romanNumerals[prevStep - 1]}`;
                }
                navPrev.disabled = currentStep <= 1;
            }
            
            if (navNext) {
                const nextText = navNext.querySelector('span');
                if (nextText) {
                    // Mostrar número romano para etapas
                    const romanNumerals = ['I', 'II', 'III', 'IV'];
                    const nextStep = currentStep < 4 ? currentStep + 1 : 4;
                    nextText.textContent = `Etapa ${romanNumerals[nextStep - 1]} ▶`;
                }
                navNext.disabled = currentStep >= 4;
            }
        };
        
        // Função para sincronizar estado dos filtros rápidos com os principais
        function syncQuickFiltersState() {
            const quickFiltersBar = document.getElementById('quick-filters-bar');
            if (!quickFiltersBar) return;
            
            // Remover todos os active
            quickFiltersBar.querySelectorAll('.quick-filter-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Verificar filtros de status ativos
            const statusRadios = document.querySelectorAll('input[name="status"]:checked');
            statusRadios.forEach(radio => {
                const value = radio.value;
                let quickValue = value;
                if (value === 'all') quickValue = 'todos';
                else if (value === 'pending') quickValue = 'pendente';
                else if (value === 'approved') quickValue = 'aprovados';
                
                const quickItem = quickFiltersBar.querySelector(`[data-filter="status"][data-value="${quickValue}"]`);
                if (quickItem) quickItem.classList.add('active');
            });
            
            // Verificar filtros de relevância ativos
            const relevanceRadios = document.querySelectorAll('input[name="relevance"]:checked');
            relevanceRadios.forEach(radio => {
                const value = radio.value;
                let quickValue = value;
                if (value === 'all') quickValue = 'todos';
                else if (value === 'high') quickValue = 'alta';
                else if (value === 'medium') quickValue = 'media';
                else if (value === 'low') quickValue = 'baixa';
                
                const quickItem = quickFiltersBar.querySelector(`[data-filter="relevance"][data-value="${quickValue}"]`);
                if (quickItem) quickItem.classList.add('active');
            });
        }
        
        // Exportar função de sincronização
        window.syncQuickFiltersState = syncQuickFiltersState;
        
        // Re-inicializar se já estiver carregado
        if (typeof window.setupQuickFiltersBar === 'function') {
            setTimeout(() => {
                window.setupQuickFiltersBar();
            }, 100);
        }
    }
})();