/**
 * Restaura o QuickAccessMenu Original
 * Data: 06/08/2025
 * 
 * Este script garante que o QuickAccessMenu funcione corretamente
 */

(function() {
    'use strict';
    
    console.log('🔄 Restaurando QuickAccessMenu...');
    
    // Aguarda o carregamento completo
    function initializeQuickAccess() {
        // Verifica se o QuickAccessMenu existe
        if (window.KC && window.KC.QuickAccessMenu) {
            console.log('✅ QuickAccessMenu encontrado');
            
            // Inicializa o menu se ainda não foi inicializado
            if (typeof window.KC.QuickAccessMenu.initialize === 'function') {
                window.KC.QuickAccessMenu.initialize();
                console.log('🚀 QuickAccessMenu inicializado');
            }
            
            // Verifica se o menu está visível
            setTimeout(() => {
                const menuTab = document.querySelector('.quick-access-tab');
                if (menuTab) {
                    console.log('✅ Aba do menu visível');
                } else {
                    console.log('⚠️ Aba do menu não encontrada, tentando criar...');
                    // Tenta criar o menu manualmente se necessário
                    if (window.KC.QuickAccessMenu.createMenu) {
                        window.KC.QuickAccessMenu.createMenu();
                    }
                }
            }, 1000);
            
        } else {
            console.log('⚠️ QuickAccessMenu ainda não carregado, tentando novamente...');
            setTimeout(initializeQuickAccess, 500);
        }
    }
    
    // Remove elementos conflitantes do simple-menu-fix se ainda existirem
    function removeConflictingElements() {
        // Remove menu simples que pode estar interferindo
        const simpleMenu = document.getElementById('simple-tools-menu');
        if (simpleMenu) {
            simpleMenu.remove();
            console.log('🗑️ Menu simples removido para evitar conflito');
        }
        
        // Remove botão go-to-top duplicado
        const simpleGoToTop = document.getElementById('simple-go-to-top');
        if (simpleGoToTop) {
            simpleGoToTop.remove();
            console.log('🗑️ Botão go-to-top simples removido');
        }
    }
    
    // Executa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            removeConflictingElements();
            initializeQuickAccess();
        });
    } else {
        removeConflictingElements();
        initializeQuickAccess();
    }
    
    // Adiciona atalho de teclado para abrir o menu (Ctrl+Shift+M)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            if (window.KC && window.KC.QuickAccessMenu && window.KC.QuickAccessMenu.toggle) {
                window.KC.QuickAccessMenu.toggle();
                console.log('🎯 Menu toggled via atalho');
            }
        }
    });
    
    console.log('✅ Script de restauração do QuickAccessMenu ativo');
    console.log('💡 Dica: Use Ctrl+Shift+M para abrir/fechar o menu');
})();