/**
 * Kill Colorful Menu - Script Agressivo para Remover Menu Problemático
 * Data: 06/08/2025
 * 
 * Este script DEVE ser executado ANTES de todos os outros
 */

(function() {
    'use strict';
    
    console.log('🔥 Kill Colorful Menu iniciado');
    
    // Função para destruir o menu colorido
    function destroyColorfulMenu() {
        // Lista de seletores para encontrar e destruir
        const killList = [
            // Por estilo inline
            '[style*="linear-gradient"]',
            '[style*="ff6b6b"]',
            '[style*="4ecdc4"]',
            '[style*="ffd93d"]',
            '[style*="6bcf7f"]',
            '[style*="c471ed"]',
            '[style*="667eea"]',
            '[style*="transform: translateY(-50%)"]',
            '[style*="width: 280px"]',
            '[style*="z-index: 9999"]',
            '[style*="z-index: 10000"]',
            
            // Por ID
            '#kc-side-menu',
            '#quick-access-menu',
            '#qdrant-menu',
            
            // Por classe
            '.quick-access-modal',
            '.quick-access-tab',
            '.qdrant-modal',
            '.side-menu',
            '.menu-lateral'
        ];
        
        // Mata todos os elementos da lista
        killList.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Verifica se é realmente o menu problemático
                    const style = el.getAttribute('style') || '';
                    
                    // Se tem gradiente colorido, remove sem piedade
                    if (style.includes('linear-gradient') && 
                        (style.includes('ff6b6b') || 
                         style.includes('4ecdc4') || 
                         style.includes('ffd93d') ||
                         style.includes('6bcf7f') ||
                         style.includes('c471ed'))) {
                        
                        console.log('💀 Destruindo menu colorido:', el);
                        
                        // Remove o elemento completamente
                        el.remove();
                        
                        // Se ainda existir, força remoção do parent
                        if (el.parentNode) {
                            el.parentNode.removeChild(el);
                        }
                    }
                    // Remove outros elementos suspeitos
                    else if (selector.startsWith('#') || selector.startsWith('.')) {
                        el.remove();
                        console.log('🗑️ Removendo elemento suspeito:', selector);
                    }
                });
            } catch (e) {
                // Ignora erros e continua destruindo
            }
        });
        
        // Procura por QUALQUER div com position fixed à direita
        const fixedDivs = document.querySelectorAll('div[style*="position: fixed"]');
        fixedDivs.forEach(div => {
            const style = div.getAttribute('style') || '';
            if (style.includes('right:') && 
                (style.includes('280px') || style.includes('gradient'))) {
                div.remove();
                console.log('🔫 Eliminando div fixa suspeita');
            }
        });
    }
    
    // Executa imediatamente
    destroyColorfulMenu();
    
    // Executa quando o DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', destroyColorfulMenu);
    }
    
    // Executa após um pequeno delay
    setTimeout(destroyColorfulMenu, 100);
    setTimeout(destroyColorfulMenu, 500);
    setTimeout(destroyColorfulMenu, 1000);
    setTimeout(destroyColorfulMenu, 2000);
    
    // Monitora mudanças no DOM e destrói qualquer menu colorido que apareça
    const killObserver = new MutationObserver((mutations) => {
        let needsKill = false;
        
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.getAttribute) {
                    const style = node.getAttribute('style') || '';
                    
                    // Se detectar gradiente colorido, marca para destruição
                    if (style.includes('linear-gradient') && 
                        (style.includes('ff6b6b') || 
                         style.includes('4ecdc4') ||
                         style.includes('ffd93d'))) {
                        needsKill = true;
                        node.remove();
                        console.log('⚡ Menu colorido detectado e destruído instantaneamente');
                    }
                }
            });
        });
        
        // Se detectou algo suspeito, executa limpeza completa
        if (needsKill) {
            destroyColorfulMenu();
        }
    });
    
    // Inicia o observador assassino
    if (document.body) {
        killObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            killObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });
        });
    }
    
    // Executa periodicamente para garantir
    setInterval(destroyColorfulMenu, 2000);
    
    console.log('✅ Kill Colorful Menu ativo e monitorando');
})();