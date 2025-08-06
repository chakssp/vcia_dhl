/**
 * Force Corrections - Força aplicação das correções
 * Data: 06/08/2025
 * 
 * Script para garantir que as correções sejam aplicadas
 */

(function() {
    'use strict';
    
    console.log('🔧 Forçando aplicação das correções...');
    
    // 1. Garantir que PowerUserFeatures está disponível
    function ensurePowerUserFeatures() {
        if (window.KC && !window.KC.PowerUserFeatures) {
            console.log('⚠️ PowerUserFeatures não encontrado, criando...');
            
            // Verificar se a classe existe
            if (typeof PowerUserFeatures !== 'undefined') {
                window.KC.PowerUserFeatures = new PowerUserFeatures();
                console.log('✅ PowerUserFeatures criado e atribuído a KC');
            } else {
                console.log('❌ Classe PowerUserFeatures não encontrada');
            }
        } else if (window.KC && window.KC.PowerUserFeatures) {
            console.log('✅ PowerUserFeatures já está disponível');
        }
    }
    
    // 2. Garantir que QuickAccessMenu está visível
    function ensureQuickAccessMenu() {
        // Verificar se já existe - procurar por múltiplas classes possíveis
        let tab = document.querySelector('.quick-access-tab, .quick-access-tab-ultimate, #quick-access-tab-main');
        const menu = document.getElementById('kc-side-menu');
        
        if (!tab && menu) {
            console.log('⚠️ Aba do menu não encontrada, criando...');
            
            // Criar aba ULTRA-VISÍVEL NEON como FALLBACK
            tab = document.createElement('div');
            tab.className = 'quick-access-tab-forced';
            tab.id = 'quick-access-tab-fallback';
            tab.innerHTML = '🚀<br><span style="font-size:12px">MENU</span>';
            tab.style.cssText = `
                position: fixed !important;
                right: 0 !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                width: 70px !important;
                height: 130px !important;
                background: #ff00ff !important;
                background: linear-gradient(135deg, #ff00ff 0%, #00ffff 100%) !important;
                color: #ffffff !important;
                cursor: pointer !important;
                z-index: 999999 !important;
                border-radius: 15px 0 0 15px !important;
                font-size: 20px !important;
                font-weight: bold !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: -10px 0 40px rgba(255,0,255,0.8) !important;
                animation: pulse-glow 1.5s infinite !important;
                border: 3px solid #ffffff !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            
            // Adicionar funcionalidade
            let isOpen = false;
            tab.onclick = function() {
                isOpen = !isOpen;
                if (isOpen) {
                    menu.style.right = '0px';
                    tab.style.right = '280px';
                    tab.innerHTML = '❌<br>Fechar';
                } else {
                    menu.style.right = '-280px';
                    tab.style.right = '0px';
                    tab.innerHTML = '🚀<br>Menu';
                }
            };
            
            document.body.appendChild(tab);
            console.log('✅ Aba do menu criada e adicionada');
            
            // Garantir que o menu está posicionado corretamente
            if (menu) {
                menu.style.position = 'fixed';
                menu.style.right = '-280px';
                menu.style.top = '50%';
                menu.style.transform = 'translateY(-50%)';
                menu.style.zIndex = '99998';
                console.log('✅ Menu reposicionado');
            }
        } else if (tab) {
            console.log('✅ Aba do menu já existe');
            
            // Garantir que está visível
            tab.style.display = 'flex';
            tab.style.visibility = 'visible';
            tab.style.opacity = '1';
        }
        
        // Se QuickAccessMenu existir, inicializar
        if (window.KC && window.KC.QuickAccessMenu) {
            if (typeof window.KC.QuickAccessMenu.initialize === 'function') {
                window.KC.QuickAccessMenu.initialize();
                console.log('✅ QuickAccessMenu inicializado');
            }
        }
    }
    
    // 3. Verificar e corrigir zoom
    function ensureCorrectZoom() {
        const root = document.documentElement;
        const currentZoom = getComputedStyle(root).getPropertyValue('--zoom-level');
        
        if (!currentZoom || currentZoom.trim() !== '1.0') {
            console.log('⚠️ Zoom incorreto, corrigindo...');
            root.style.setProperty('--zoom-level', '1.0', 'important');
            root.style.zoom = '1';
            console.log('✅ Zoom corrigido para 1.0 (100%)');
        } else {
            console.log('✅ Zoom já está correto');
        }
    }
    
    // 4. Reconectar botões do menu
    function reconnectMenuButtons() {
        const buttons = document.querySelectorAll('#kc-side-menu button[data-action]');
        
        if (buttons.length > 0) {
            console.log(`🔗 Reconectando ${buttons.length} botões do menu...`);
            
            buttons.forEach(button => {
                const action = button.getAttribute('data-action');
                
                // Remover listeners antigos
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Adicionar novo listener
                newButton.onclick = function() {
                    console.log('Botão clicado:', action);
                    
                    switch(action) {
                        case 'openQdrantExplorer':
                            if (window.KC?.QdrantExplorerFixed?.open) {
                                window.KC.QdrantExplorerFixed.open();
                            } else if (window.KC?.QdrantExplorer?.open) {
                                window.KC.QdrantExplorer.open();
                            } else {
                                alert('Qdrant Explorer não disponível');
                            }
                            break;
                            
                        case 'openMLDashboard':
                            if (window.KC?.MLDashboard?.open) {
                                window.KC.MLDashboard.open();
                            } else {
                                alert('ML Dashboard não disponível');
                            }
                            break;
                            
                        case 'runDiagnostics':
                            if (window.kcdiag) {
                                window.kcdiag();
                            } else {
                                alert('Função de diagnóstico não disponível');
                            }
                            break;
                            
                        case 'openAPIConfig':
                            if (window.KC?.EventBus && window.KC?.Events) {
                                window.KC.EventBus.emit(window.KC.Events.OPEN_API_CONFIG);
                            } else {
                                alert('Configuração de API não disponível');
                            }
                            break;
                            
                        case 'openStatsPanel':
                            if (window.KC?.StatsPanel?.show) {
                                window.KC.StatsPanel.show();
                            } else {
                                alert('Painel de estatísticas não disponível');
                            }
                            break;
                            
                        case 'goToTop':
                            window.scrollTo({
                                top: 0,
                                behavior: 'smooth'
                            });
                            break;
                            
                        default:
                            console.log('Ação não reconhecida:', action);
                    }
                };
            });
            
            console.log('✅ Botões reconectados');
        }
    }
    
    // Executar correções
    function applyCorrections() {
        console.log('🚀 Aplicando todas as correções...');
        
        ensureCorrectZoom();
        ensurePowerUserFeatures();
        ensureQuickAccessMenu();
        reconnectMenuButtons();
        
        console.log('✅ Correções aplicadas!');
        
        // Relatório final
        console.log('\n📊 RELATÓRIO FINAL:');
        console.log('Zoom:', getComputedStyle(document.documentElement).getPropertyValue('--zoom-level'));
        console.log('PowerUserFeatures:', window.KC?.PowerUserFeatures ? '✅ Disponível' : '❌ Não encontrado');
        console.log('QuickAccessMenu Tab:', document.querySelector('.quick-access-tab, .quick-access-tab-forced') ? '✅ Visível' : '❌ Não encontrado');
        console.log('Menu Lateral:', document.getElementById('kc-side-menu') ? '✅ Existe' : '❌ Não encontrado');
    }
    
    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyCorrections);
    } else {
        // Aguardar um pouco para garantir que tudo carregou
        setTimeout(applyCorrections, 1000);
    }
    
    // Executar novamente após 2 segundos para garantir
    setTimeout(applyCorrections, 2000);
    
    // Adicionar atalho Ctrl+Shift+F para forçar correções
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            console.log('🔄 Forçando reaplicação das correções...');
            applyCorrections();
        }
    });
    
    console.log('💡 Dica: Use Ctrl+Shift+F para reaplicar correções a qualquer momento');
})();