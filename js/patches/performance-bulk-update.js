/**
 * 🚀 PATCH: Performance Optimization for Bulk Updates
 * 
 * Problema: Quando uma ação é realizada em um item, toda a lista
 * de 649+ arquivos é re-renderizada, causando lentidão.
 * 
 * Solução: Implementar debouncing e atualização diferencial
 * 
 * @performance-fix Reduz re-renderizações desnecessárias
 */

(function(window) {
    'use strict';
    
    const KC = window.KnowledgeConsolidator;
    
    // Configurações de otimização
    const OPTIMIZATION_CONFIG = {
        DEBOUNCE_DELAY: 300,      // ms para aguardar antes de re-renderizar
        BATCH_SIZE: 50,            // Arquivos por batch de renderização
        USE_VIRTUAL_SCROLL: true,  // Renderizar apenas itens visíveis
        DIFF_UPDATE: true          // Atualizar apenas elementos modificados
    };
    
    // Cache de elementos DOM
    const domCache = new Map();
    
    // Debounce para re-renderização
    let renderTimeout = null;
    let pendingUpdates = [];
    
    /**
     * Aplicar patch no FileRenderer
     */
    const patchFileRenderer = () => {
        if (!KC?.FileRenderer) {
            setTimeout(patchFileRenderer, 100);
            return;
        }
        
        // Salvar método original
        const originalRenderFileList = KC.FileRenderer.renderFileList;
        
        // Substituir por versão otimizada
        KC.FileRenderer.renderFileList = function(options = {}) {
            // Se for atualização de item único, usar atualização diferencial
            if (options.updateSingleItem && OPTIMIZATION_CONFIG.DIFF_UPDATE) {
                const itemId = options.itemId;
                const updatedFile = KC.AppState.get('files').find(f => f.id === itemId);
                
                if (updatedFile) {
                    updateSingleFileElement(itemId, updatedFile);
                    console.log(`✅ [PERF] Atualização diferencial para arquivo ${itemId}`);
                    return;
                }
            }
            
            // Cancelar renderização pendente
            if (renderTimeout) {
                clearTimeout(renderTimeout);
            }
            
            // Adicionar à fila de atualizações
            pendingUpdates.push(options);
            
            // Agendar renderização com debounce
            renderTimeout = setTimeout(() => {
                // Mesclar todas as opções pendentes
                const mergedOptions = pendingUpdates.reduce((acc, opt) => ({...acc, ...opt}), {});
                pendingUpdates = [];
                
                console.log('⚡ [PERF] Executando renderização com debounce');
                
                // Chamar método original com otimizações
                originalRenderFileList.call(this, {
                    ...mergedOptions,
                    batchSize: OPTIMIZATION_CONFIG.BATCH_SIZE,
                    virtualScroll: OPTIMIZATION_CONFIG.USE_VIRTUAL_SCROLL
                });
                
            }, OPTIMIZATION_CONFIG.DEBOUNCE_DELAY);
        };
        
        console.log('✅ [PATCH] FileRenderer otimizado para performance');
    };
    
    /**
     * Atualizar apenas um elemento específico no DOM
     */
    function updateSingleFileElement(fileId, fileData) {
        const element = document.querySelector(`[data-file-id="${fileId}"]`);
        
        if (!element) {
            console.warn(`Elemento não encontrado para arquivo ${fileId}`);
            return;
        }
        
        // Atualizar apenas campos modificados
        const relevanceEl = element.querySelector('.file-relevance');
        if (relevanceEl && fileData.relevance !== undefined) {
            relevanceEl.textContent = `${Math.round(fileData.relevance * 100)}%`;
            relevanceEl.className = `file-relevance ${getRelevanceClass(fileData.relevance)}`;
        }
        
        const statusEl = element.querySelector('.file-status');
        if (statusEl && fileData.status) {
            statusEl.textContent = getStatusLabel(fileData.status);
            statusEl.className = `file-status status-${fileData.status}`;
        }
        
        const analyzedBadge = element.querySelector('.badge-analyzed');
        if (fileData.analyzed) {
            if (!analyzedBadge) {
                const badge = document.createElement('span');
                badge.className = 'badge badge-analyzed';
                badge.textContent = 'Analisado';
                element.querySelector('.file-badges')?.appendChild(badge);
            }
        }
        
        // Adicionar classe de atualização com animação
        element.classList.add('file-updated');
        setTimeout(() => element.classList.remove('file-updated'), 1000);
    }
    
    /**
     * Helpers
     */
    function getRelevanceClass(relevance) {
        if (relevance >= 0.7) return 'relevance-high';
        if (relevance >= 0.3) return 'relevance-medium';
        return 'relevance-low';
    }
    
    function getStatusLabel(status) {
        const labels = {
            'pending': 'Pendente',
            'analyzing': 'Analisando...',
            'analyzed': 'Analisado',
            'approved': 'Aprovado',
            'processed': 'Processado'
        };
        return labels[status] || status;
    }
    
    /**
     * Patch para EventBus - Batch de eventos
     */
    const patchEventBus = () => {
        if (!KC?.EventBus) {
            setTimeout(patchEventBus, 100);
            return;
        }
        
        const originalEmit = KC.EventBus.emit;
        const eventQueue = new Map();
        let flushTimeout = null;
        
        // Eventos que devem ser agrupados
        const BATCHABLE_EVENTS = [
            'files:updated',
            'files:filtered',
            'state:changed'
        ];
        
        KC.EventBus.emit = function(eventName, data) {
            // Se não for evento batchable, emitir imediatamente
            if (!BATCHABLE_EVENTS.includes(eventName)) {
                return originalEmit.call(this, eventName, data);
            }
            
            // Adicionar à fila
            if (!eventQueue.has(eventName)) {
                eventQueue.set(eventName, []);
            }
            eventQueue.get(eventName).push(data);
            
            // Agendar flush
            if (!flushTimeout) {
                flushTimeout = setTimeout(() => {
                    // Processar fila de eventos
                    eventQueue.forEach((dataArray, event) => {
                        // Mesclar dados do mesmo tipo
                        const mergedData = dataArray.reduce((acc, d) => ({...acc, ...d}), {});
                        originalEmit.call(this, event, mergedData);
                        console.log(`⚡ [PERF] Batch emit: ${event} (${dataArray.length} eventos mesclados)`);
                    });
                    
                    eventQueue.clear();
                    flushTimeout = null;
                }, 100);
            }
        };
        
        console.log('✅ [PATCH] EventBus otimizado com batching');
    };
    
    /**
     * Adicionar CSS para animações de atualização
     */
    const addOptimizationStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* Animação de atualização suave */
            .file-updated {
                animation: fileUpdate 1s ease-out;
            }
            
            @keyframes fileUpdate {
                0% {
                    background-color: rgba(99, 102, 241, 0.1);
                }
                100% {
                    background-color: transparent;
                }
            }
            
            /* Virtual scroll placeholder */
            .file-placeholder {
                height: 80px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
            }
            
            @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            /* Transições suaves */
            .file-relevance,
            .file-status,
            .badge {
                transition: all 0.3s ease;
            }
        `;
        document.head.appendChild(style);
        console.log('✅ [PATCH] Estilos de otimização adicionados');
    };
    
    // Aplicar patches quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            patchFileRenderer();
            patchEventBus();
            addOptimizationStyles();
        });
    } else {
        patchFileRenderer();
        patchEventBus();
        addOptimizationStyles();
    }
    
    // Expor configuração para ajuste dinâmico
    window.KC_PERFORMANCE_CONFIG = OPTIMIZATION_CONFIG;
    
    console.log('✅ [PATCH] Sistema de otimização de performance carregado');
    
})(window);