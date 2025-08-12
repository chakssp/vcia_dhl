/**
 * 🔧 Patch para corrigir timing do RAGExportManager
 * 
 * Corrige:
 * - SystemIntegrationOrchestrator não encontra RAGExportManager
 * - Problemas de ordem de inicialização
 */

(function() {
    'use strict';
    
    console.log('[RAGExport Timing Fix] Aplicando correções...');
    
    const KC = window.KnowledgeConsolidator || {};
    
    // 1. Garantir que RAGExportManager está registrado globalmente
    function ensureRAGExportManager() {
        // Verificar se já existe
        if (KC.RAGExportManager) {
            console.log('[RAGExport Timing Fix] RAGExportManager já está registrado');
            return true;
        }
        
        // Procurar em lugares alternativos
        if (window.RAGExportManager) {
            KC.RAGExportManager = window.RAGExportManager;
            console.log('[RAGExport Timing Fix] RAGExportManager encontrado no window');
            return true;
        }
        
        // Se existe a classe mas não a instância
        if (typeof RAGExportManager !== 'undefined') {
            KC.RAGExportManager = new RAGExportManager();
            console.log('[RAGExport Timing Fix] Nova instância de RAGExportManager criada');
            return true;
        }
        
        console.warn('[RAGExport Timing Fix] RAGExportManager ainda não disponível');
        return false;
    }
    
    // 2. Tentar registrar imediatamente
    ensureRAGExportManager();
    
    // 3. Adicionar ao SystemIntegrationOrchestrator se existir
    if (KC.SystemIntegrationOrchestrator) {
        const originalInit = KC.SystemIntegrationOrchestrator.initialize;
        
        KC.SystemIntegrationOrchestrator.initialize = async function() {
            // Garantir RAGExportManager antes de inicializar
            if (!KC.RAGExportManager) {
                console.log('[RAGExport Timing Fix] Aguardando RAGExportManager...');
                
                // Tentar algumas vezes
                let attempts = 0;
                while (!ensureRAGExportManager() && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (!KC.RAGExportManager) {
                    console.error('[RAGExport Timing Fix] RAGExportManager não pôde ser carregado');
                }
            }
            
            // Chamar inicialização original
            if (originalInit) {
                return originalInit.call(this);
            }
        };
    }
    
    // 4. Adicionar listener para quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                ensureRAGExportManager();
                
                // Verificar se precisa re-inicializar SystemIntegrationOrchestrator
                if (KC.SystemIntegrationOrchestrator && !KC.SystemIntegrationOrchestrator.initialized) {
                    console.log('[RAGExport Timing Fix] Re-inicializando SystemIntegrationOrchestrator');
                    KC.SystemIntegrationOrchestrator.initialize();
                }
            }, 500);
        });
    } else {
        // DOM já carregado
        setTimeout(() => {
            ensureRAGExportManager();
        }, 100);
    }
    
    // 5. Criar função global para processar para Qdrant se não existir
    if (!window.processToQdrant && !KC.processToQdrant) {
        window.processToQdrant = async function() {
            if (!KC.RAGExportManager) {
                ensureRAGExportManager();
            }
            
            if (KC.RAGExportManager && KC.RAGExportManager.processToQdrant) {
                return await KC.RAGExportManager.processToQdrant();
            } else {
                console.error('[RAGExport Timing Fix] RAGExportManager.processToQdrant não disponível');
                
                // Tentar usar o comando alternativo
                if (window.qdrant) {
                    console.log('[RAGExport Timing Fix] Usando comando qdrant() alternativo');
                    return await window.qdrant();
                }
            }
        };
        
        KC.processToQdrant = window.processToQdrant;
    }
    
    console.log('[RAGExport Timing Fix] Correções aplicadas');
    
})();