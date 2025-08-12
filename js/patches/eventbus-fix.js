/**
 * 🔧 Patch para corrigir erro do EventBus com eventos undefined
 * 
 * Corrige:
 * - EventBus error: "Nome do evento e callback são obrigatórios"
 * - Events.CATEGORIES_UPDATED undefined em ConvergenceIntegrationService
 */

(function() {
    'use strict';
    
    console.log('[EventBus Fix] Aplicando correções...');
    
    const KC = window.KnowledgeConsolidator || {};
    
    // 1. Garantir que Events existe e tem todos os eventos necessários
    if (!KC.Events) {
        KC.Events = {};
    }
    
    // Eventos padrão que devem existir
    const requiredEvents = {
        'FILES_UPDATED': 'files:updated',
        'CATEGORIES_UPDATED': 'categories:updated',
        'STATE_CHANGED': 'state:changed',
        'ANALYSIS_COMPLETE': 'analysis:complete',
        'DISCOVERY_COMPLETE': 'discovery:complete',
        'EXPORT_COMPLETE': 'export:complete',
        'FILTER_CHANGED': 'filter:changed',
        'STATS_UPDATED': 'stats:updated',
        'ERROR_OCCURRED': 'error:occurred',
        'QDRANT_PROCESSED': 'qdrant:processed'
    };
    
    // Adicionar eventos faltantes
    Object.entries(requiredEvents).forEach(([key, value]) => {
        if (!KC.Events[key]) {
            KC.Events[key] = value;
            console.log(`[EventBus Fix] Adicionado evento: ${key} = ${value}`);
        }
    });
    
    // 2. Corrigir ConvergenceIntegrationService se já existir
    if (KC.ConvergenceIntegrationService) {
        const originalRegister = KC.ConvergenceIntegrationService.registerEventListeners;
        
        KC.ConvergenceIntegrationService.registerEventListeners = function() {
            try {
                // Verificar se EventBus e Events existem
                if (!KC.EventBus || !KC.Events) {
                    console.warn('[EventBus Fix] EventBus ou Events não disponível ainda');
                    return;
                }
                
                // Verificar cada evento antes de registrar
                if (KC.Events.FILES_UPDATED) {
                    KC.EventBus.on(KC.Events.FILES_UPDATED, () => {
                        this.updateCache();
                    });
                }
                
                if (KC.Events.CATEGORIES_UPDATED) {
                    KC.EventBus.on(KC.Events.CATEGORIES_UPDATED, () => {
                        this.updateCache();
                    });
                }
                
                // Evento específico do Qdrant
                KC.EventBus.on('qdrant:processed', (data) => {
                    this.updateEmbeddings(data);
                });
                
                console.log('[EventBus Fix] Event listeners registrados com sucesso');
                
            } catch (error) {
                console.error('[EventBus Fix] Erro ao registrar listeners:', error);
            }
        };
        
        // Re-registrar listeners se o serviço já foi inicializado
        if (KC.ConvergenceIntegrationService.initialized) {
            KC.ConvergenceIntegrationService.registerEventListeners();
        }
    }
    
    // 3. Adicionar wrapper no EventBus para validação
    if (KC.EventBus) {
        const originalOn = KC.EventBus.on;
        
        KC.EventBus.on = function(event, callback) {
            // Validar parâmetros
            if (!event) {
                console.warn('[EventBus Fix] Tentativa de registrar evento sem nome, ignorando');
                return;
            }
            
            if (!callback || typeof callback !== 'function') {
                console.warn('[EventBus Fix] Tentativa de registrar evento sem callback válido, ignorando');
                return;
            }
            
            // Chamar método original
            return originalOn.call(this, event, callback);
        };
    }
    
    console.log('[EventBus Fix] Correções aplicadas com sucesso');
    
})();