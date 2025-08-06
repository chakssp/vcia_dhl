/**
 * Simple Menu Fix - Remove menus problemáticos e adiciona botões simples
 * Data: 06/08/2025
 */

(function() {
    'use strict';
    
    // Remove menu lateral problemático quando a página carregar
    function removeProblematicMenus() {
        // Remove QUALQUER elemento com o menu colorido problemático
        // Procura por elementos com estilos inline específicos
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const style = el.getAttribute('style');
            if (style) {
                // Remove elementos com gradientes coloridos característicos do menu problemático
                if (style.includes('linear-gradient') && 
                    (style.includes('135deg') || style.includes('45deg')) &&
                    (style.includes('ff6b6b') || style.includes('4ecdc4') || 
                     style.includes('ffd93d') || style.includes('6bcf7f') ||
                     style.includes('c471ed'))) {
                    el.remove();
                    console.log('Menu colorido problemático removido');
                }
                
                // Remove elementos posicionados à direita com z-index alto
                if (style.includes('position: fixed') && 
                    style.includes('right:') && 
                    (style.includes('z-index: 9999') || style.includes('z-index: 10000'))) {
                    el.remove();
                    console.log('Elemento fixo suspeito removido');
                }
            }
        });
        
        // Remove elementos específicos por ID e classe
        const idsToRemove = ['kc-side-menu', 'quick-access-menu', 'qdrant-menu'];
        idsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
                console.log(`Elemento #${id} removido`);
            }
        });
        
        // Remove classes problemáticas
        const classesToRemove = ['.quick-access-modal', '.quick-access-tab', '.qdrant-modal', '.side-menu', '.menu-lateral'];
        classesToRemove.forEach(className => {
            const elements = document.querySelectorAll(className);
            elements.forEach(el => {
                el.remove();
                console.log(`Elemento ${className} removido`);
            });
        });
        
        // Remove qualquer div com width 280px (largura típica do menu problemático)
        const divsWithWidth = document.querySelectorAll('div');
        divsWithWidth.forEach(div => {
            const style = div.getAttribute('style');
            if (style && (style.includes('width: 280px') || style.includes('width:280px'))) {
                div.remove();
                console.log('Div com width 280px removida');
            }
        });
    }
    
    // Adiciona botão Go to Top simples
    function addSimpleGoToTop() {
        // Remove botão existente se houver
        const existingBtn = document.getElementById('simple-go-to-top');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // Cria novo botão
        const goToTopBtn = document.createElement('button');
        goToTopBtn.id = 'simple-go-to-top';
        goToTopBtn.innerHTML = '⬆️';
        goToTopBtn.title = 'Ir para o topo';
        goToTopBtn.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #333;
            color: white;
            border: none;
            cursor: pointer;
            z-index: 9000;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        
        // Adiciona ao body
        document.body.appendChild(goToTopBtn);
        
        // Funcionalidade do botão
        goToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Mostra/esconde baseado no scroll
        let scrollHandler = () => {
            if (window.scrollY > 300) {
                goToTopBtn.style.opacity = '1';
                goToTopBtn.style.visibility = 'visible';
            } else {
                goToTopBtn.style.opacity = '0';
                goToTopBtn.style.visibility = 'hidden';
            }
        };
        
        window.addEventListener('scroll', scrollHandler);
        scrollHandler(); // Chama uma vez para definir estado inicial
    }
    
    // Adiciona menu de ferramentas simples
    function addSimpleToolsMenu() {
        // Remove TODOS os elementos flutuantes antigos primeiro
        const elementsToRemove = [
            '.floating-actions',
            '.action-btn',
            '.theme-toggle',
            '.go-to-filters',
            '.go-to-top:not(#simple-go-to-top)',
            '#theme-toggle',
            '#go-to-filters',
            '#go-to-top',
            '#quick-filters-toggle',
            '#simple-tools-menu' // Remove menu anterior se existir
        ];
        
        elementsToRemove.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Cria container do menu
        const toolsMenu = document.createElement('div');
        toolsMenu.id = 'simple-tools-menu';
        toolsMenu.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 80px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 8000;
        `;
        
        // Botões do menu (incluindo todos os necessários)
        const buttons = [
            { icon: '☀️', title: 'Alternar tema', action: () => {
                if (window.KC && window.KC.ThemeManager) {
                    window.KC.ThemeManager.toggle();
                } else {
                    document.body.classList.toggle('dark-mode');
                }
            }},
            { icon: '📊', title: 'Filtros Rápidos', action: () => {
                const bar = document.getElementById('quick-filters-bar');
                if (bar) {
                    bar.classList.toggle('show');
                }
            }},
            { icon: '🔍', title: 'Qdrant Explorer', action: () => {
                if (window.KC && window.KC.QdrantExplorer) {
                    window.KC.QdrantExplorer.open();
                } else {
                    alert('Qdrant Explorer não disponível');
                }
            }},
            { icon: '🏥', title: 'Diagnóstico', action: () => {
                if (window.kcdiag) {
                    window.kcdiag();
                    alert('Diagnóstico executado! Verifique o console.');
                } else {
                    alert('Função de diagnóstico não disponível');
                }
            }},
            { icon: '🔧', title: 'Configurar APIs', action: () => {
                if (window.KC && window.KC.EventBus && window.KC.Events) {
                    window.KC.EventBus.emit(window.KC.Events.OPEN_API_CONFIG);
                } else {
                    alert('Configuração de API não disponível');
                }
            }}
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.innerHTML = btn.icon;
            button.title = btn.title;
            button.style.cssText = `
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: white;
                border: 1px solid #ddd;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            `;
            
            button.addEventListener('click', btn.action);
            
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
                button.style.boxShadow = '0 3px 8px rgba(0,0,0,0.2)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            });
            
            toolsMenu.appendChild(button);
        });
        
        document.body.appendChild(toolsMenu);
    }
    
    // Executa quando o DOM estiver pronto
    function initializeSimpleMenu() {
        // Remove menus problemáticos IMEDIATAMENTE
        removeProblematicMenus();
        
        // Aguarda um pouco e adiciona o menu simples
        setTimeout(() => {
            removeProblematicMenus(); // Remove novamente por garantia
            addSimpleGoToTop();
            addSimpleToolsMenu();
        }, 500);
        
        // Remove novamente após 2 segundos
        setTimeout(removeProblematicMenus, 2000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSimpleMenu);
    } else {
        initializeSimpleMenu();
    }
    
    // Remove menus problemáticos periodicamente (caso sejam recriados)
    setInterval(removeProblematicMenus, 3000);
    
    // Observa mudanças no DOM para remover elementos problemáticos assim que aparecem
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    const style = node.getAttribute ? node.getAttribute('style') : '';
                    if (style && style.includes('linear-gradient') && 
                        (style.includes('ff6b6b') || style.includes('4ecdc4'))) {
                        node.remove();
                        console.log('Menu colorido removido pelo observer');
                    }
                }
            });
        });
    });
    
    // Inicia o observer
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('Simple Menu Fix carregado');
})();