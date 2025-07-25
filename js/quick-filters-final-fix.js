/**
 * Correção FINAL para barra de filtros rápidos
 * Baseada nos logs de eventos reais do sistema
 */

(function() {
    'use strict';
    
    console.log('Quick filters FINAL: Iniciando...');
    
    // Aguardar KC carregar
    function waitForKC() {
        if (!window.KC || !window.KC.EventBus) {
            setTimeout(waitForKC, 100);
            return;
        }
        
        initQuickFilters();
    }
    
    function initQuickFilters() {
        console.log('Quick filters FINAL: KC disponível, configurando...');
        
        // 1. NAVEGAÇÃO - Configurar diretamente nos botões
        const navPrev = document.getElementById('nav-prev');
        const navNext = document.getElementById('nav-next');
        
        if (navPrev) {
            navPrev.onclick = function(e) {
                e.preventDefault();
                const currentStep = KC.AppState.get('currentStep') || 2;
                console.log('Navegação: Etapa atual', currentStep, '→', currentStep - 1);
                if (currentStep > 1) {
                    KC.AppController.navigateToStep(currentStep - 1);
                }
            };
        }
        
        if (navNext) {
            navNext.onclick = function(e) {
                e.preventDefault();
                const currentStep = KC.AppState.get('currentStep') || 2;
                console.log('Navegação: Etapa atual', currentStep, '→', currentStep + 1);
                if (currentStep < 4) {
                    KC.AppController.navigateToStep(currentStep + 1);
                }
            };
        }
        
        // 2. FILTROS RÁPIDOS - Configurar diretamente nos botões
        const quickFilters = document.querySelectorAll('.quick-filter-item');
        
        quickFilters.forEach(item => {
            item.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const filterType = this.dataset.filter;
                const filterValue = this.dataset.value;
                
                console.log('Quick filters FINAL: Filtro clicado:', filterType, '=', filterValue);
                
                // Se clicar em "Total:", clicar direto no botão reset
                if (filterValue === 'todos' && this.querySelector('#quick-count-all')) {
                    console.log('Botão Total clicado - clicando no botão reset...');
                    const resetBtn = document.querySelector('#reset-filters');
                    if (resetBtn) {
                        resetBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    }
                    return;
                }
                
                // Mapear valores para o formato do FilterPanel
                const valueMap = {
                    'todos': 'all',
                    'pendente': 'pending',
                    'aprovados': 'approved',
                    'arquivados': 'archived',
                    'alta': 'high',
                    'media': 'medium',
                    'baixa': 'low'
                };
                
                const mappedValue = valueMap[filterValue] || filterValue;
                
                // Encontrar e clicar no radio correspondente
                const selector = `input[type="radio"][name="${filterType}"][value="${mappedValue}"]`;
                const radio = document.querySelector(selector);
                
                if (radio) {
                    console.log('Acionando radio:', selector);
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    console.error('Radio não encontrado:', selector);
                }
                
                // Atualizar visual dos filtros rápidos
                updateQuickFiltersVisual();
            };
        });
        
        // 3. BOTÃO TOGGLE
        const toggleBtn = document.getElementById('quick-filters-toggle');
        const quickBar = document.getElementById('quick-filters-bar');
        
        if (toggleBtn && quickBar) {
            toggleBtn.onclick = function() {
                quickBar.classList.toggle('show');
                this.title = quickBar.classList.contains('show') ? 
                    'Ocultar Filtros Rápidos' : 'Mostrar Filtros Rápidos';
            };
            
            // ESC fecha
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && quickBar.classList.contains('show')) {
                    quickBar.classList.remove('show');
                    toggleBtn.title = 'Mostrar Filtros Rápidos';
                }
            });
        }
        
        // 4. BOTÃO EXPORTAR
        const exportBtn = document.getElementById('export-filter');
        if (exportBtn) {
            exportBtn.onclick = function(e) {
                e.preventDefault();
                exportCurrentFilter();
            };
        }
        
        // 5. SINCRONIZAÇÃO - Escutar o evento FILES_FILTERED
        KC.EventBus.on('FILES_FILTERED', function() {
            console.log('Quick filters: FILES_FILTERED recebido, sincronizando...');
            updateQuickFiltersVisual();
        });
        
        // 6. ATUALIZAÇÃO DE CONTADORES
        KC.EventBus.on('FILES_UPDATED', updateCounters);
        KC.EventBus.on('STATE_CHANGED', function(data) {
            if (data.key === 'files') {
                updateCounters();
            }
        });
        
        // 7. ATUALIZAÇÃO DE NAVEGAÇÃO
        KC.EventBus.on('STEP_CHANGED', updateNavigationButtons);
        
        // Inicializar estado
        updateCounters();
        updateNavigationButtons();
        updateQuickFiltersVisual();
        
        console.log('Quick filters FINAL: Configuração completa!');
    }
    
    // Função para atualizar visual dos filtros baseado no estado atual
    function updateQuickFiltersVisual() {
        const quickBar = document.getElementById('quick-filters-bar');
        if (!quickBar) return;
        
        // Limpar todos active
        quickBar.querySelectorAll('.quick-filter-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Mapear valores inverso
        const reverseMap = {
            'all': 'todos',
            'pending': 'pendente',
            'approved': 'aprovados',
            'archived': 'arquivados',
            'high': 'alta',
            'medium': 'media',
            'low': 'baixa'
        };
        
        // Verificar radios marcados e ativar correspondentes
        ['status', 'relevance'].forEach(filterType => {
            const checkedRadio = document.querySelector(`input[type="radio"][name="${filterType}"]:checked`);
            if (checkedRadio) {
                const value = checkedRadio.value;
                const quickValue = reverseMap[value] || value;
                const quickItem = quickBar.querySelector(`[data-filter="${filterType}"][data-value="${quickValue}"]`);
                if (quickItem) {
                    quickItem.classList.add('active');
                }
            }
        });
    }
    
    // Função para atualizar contadores
    function updateCounters() {
        const files = KC.AppState.get('files') || [];
        
        // Contadores
        const counts = {
            'quick-count-all': files.length,
            'quick-count-pending': files.filter(f => !f.approved && !f.archived).length,
            'quick-count-approved': files.filter(f => f.approved && !f.archived).length,
            'quick-count-archived': files.filter(f => f.archived).length,
            'quick-count-high': files.filter(f => f.relevanceScore >= 70 && !f.archived).length,
            'quick-count-medium': files.filter(f => f.relevanceScore >= 30 && f.relevanceScore < 70 && !f.archived).length,
            'quick-count-low': files.filter(f => f.relevanceScore < 30 && !f.archived).length
        };
        
        // Atualizar DOM
        Object.entries(counts).forEach(([id, count]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = count;
        });
    }
    
    // Função para atualizar botões de navegação
    function updateNavigationButtons() {
        const currentStep = KC.AppState.get('currentStep') || 2;
        const navPrev = document.getElementById('nav-prev');
        const navNext = document.getElementById('nav-next');
        const romanNumerals = ['I', 'II', 'III', 'IV'];
        
        if (navPrev) {
            navPrev.disabled = currentStep <= 1;
            const prevText = navPrev.querySelector('span');
            if (prevText && currentStep > 1) {
                prevText.textContent = `◀ Etapa ${romanNumerals[currentStep - 2]}`;
            }
        }
        
        if (navNext) {
            navNext.disabled = currentStep >= 4;
            const nextText = navNext.querySelector('span');
            if (nextText && currentStep < 4) {
                nextText.textContent = `Etapa ${romanNumerals[currentStep]} ▶`;
            }
        }
    }
    
    // Função para exportar
    function exportCurrentFilter() {
        // Verificar se há arquivos selecionados
        const selectedCount = KC.FileRenderer?.selectedFiles?.size || 0;
        
        if (selectedCount > 0) {
            // Exportar apenas os selecionados
            console.log(`Exportando ${selectedCount} arquivos selecionados...`);
            
            const selectedIds = Array.from(KC.FileRenderer.selectedFiles);
            const allFiles = KC.AppState.get('files') || [];
            
            // Filtrar apenas os arquivos selecionados
            const selectedFiles = allFiles.filter(f => 
                selectedIds.includes(f.id) || selectedIds.includes(f.name)
            );
            
            const exportData = {
                timestamp: new Date().toISOString(),
                exportType: 'selected',
                totalFiles: allFiles.length,
                selectedFiles: selectedFiles.length,
                files: selectedFiles.map(f => ({
                    id: f.id,
                    name: f.name,
                    path: f.path,
                    relevanceScore: f.relevanceScore,
                    categories: f.categories || [],
                    approved: f.approved || false,
                    archived: f.archived || false,
                    content: f.content || '' // Incluir conteúdo se disponível
                }))
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export-selecionados-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            if (KC.showNotification) {
                KC.showNotification({
                    type: 'success',
                    message: `${selectedFiles.length} arquivos selecionados exportados!`,
                    duration: 3000
                });
            }
        } else {
            // Exportar todos os arquivos filtrados atualmente
            console.log('Nenhum arquivo selecionado, exportando filtro atual...');
            
            const allFiles = KC.AppState.get('files') || [];
            
            // Obter arquivos filtrados através do FilterManager
            let filteredFiles = allFiles;
            if (KC.FilterManager && KC.FilterManager.applyFiltersToFiles) {
                filteredFiles = KC.FilterManager.applyFiltersToFiles(allFiles);
            }
            
            const exportData = {
                timestamp: new Date().toISOString(),
                exportType: 'filtered',
                totalFiles: allFiles.length,
                filteredFiles: filteredFiles.length,
                activeFilters: KC.FilterManager?.getActiveFilters() || {},
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
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export-filtrados-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            if (KC.showNotification) {
                KC.showNotification({
                    type: 'success',
                    message: `${filteredFiles.length} arquivos filtrados exportados!`,
                    duration: 3000
                });
            }
        }
    }
    
    // Iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForKC);
    } else {
        waitForKC();
    }
})();