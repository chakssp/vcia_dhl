/**
 * Debug do OrganizationPanel - Verificação do problema de renderização
 * 
 * Este arquivo ajuda a diagnosticar por que a Etapa 4 não mostra os botões
 */

// Função de debug para verificar o estado do DOM e componentes
function debugOrganization() {
    console.log('=== DEBUG ORGANIZATION PANEL ===');
    
    // 1. Verifica se o componente existe
    console.log('1. OrganizationPanel existe?', !!KC.OrganizationPanel);
    
    // 2. Verifica o painel criado pelo WorkflowPanel
    const orgPanel = document.getElementById('organization-panel');
    console.log('2. Painel organization-panel existe?', !!orgPanel);
    if (orgPanel) {
        console.log('   - Display:', orgPanel.style.display);
        console.log('   - InnerHTML length:', orgPanel.innerHTML.length);
        console.log('   - Parent:', orgPanel.parentElement?.id);
    }
    
    // 3. Verifica o container principal
    const panelContainer = document.getElementById('panel-container');
    console.log('3. Panel container existe?', !!panelContainer);
    if (panelContainer) {
        console.log('   - Filhos:', panelContainer.children.length);
        Array.from(panelContainer.children).forEach((child, i) => {
            console.log(`   - Filho ${i}: ${child.id}, display: ${child.style.display}`);
        });
    }
    
    // 4. Verifica o estado atual
    console.log('4. Estado atual:');
    console.log('   - currentStep:', KC.AppState?.get('currentStep'));
    console.log('   - files count:', KC.AppState?.get('files')?.length || 0);
    console.log('   - categories:', KC.CategoryManager?.getCategories()?.length || 0);
    
    // 5. Verifica os steps configurados
    console.log('5. Steps configurados:');
    if (KC.AppController?.steps) {
        KC.AppController.steps.forEach(step => {
            console.log(`   - Step ${step.id}: ${step.name}, panel: ${step.panel}`);
        });
    }
    
    // 6. Tenta forçar renderização
    console.log('6. Tentando forçar renderização...');
    if (KC.OrganizationPanel && orgPanel) {
        try {
            // Garante que o painel está visível
            orgPanel.style.display = 'block';
            
            // Força inicialização
            KC.OrganizationPanel.initialize();
            
            // Força renderização
            KC.OrganizationPanel.render();
            
            console.log('   - Renderização forçada executada');
            console.log('   - InnerHTML length após:', orgPanel.innerHTML.length);
        } catch (error) {
            console.error('   - Erro ao forçar renderização:', error);
        }
    }
    
    console.log('=== FIM DEBUG ===');
}

// Função para navegar diretamente para etapa 4
function goToStep4() {
    console.log('Navegando para Etapa 4...');
    KC.AppController.navigateToStep(4);
    
    // Aguarda um pouco e executa debug
    setTimeout(() => {
        debugOrganization();
    }, 500);
}

// Função para verificar botões
function checkButtons() {
    console.log('=== VERIFICANDO BOTÕES ===');
    
    const buttons = document.querySelectorAll('.panel-actions button');
    console.log('Botões encontrados:', buttons.length);
    
    buttons.forEach((btn, i) => {
        console.log(`Botão ${i}:`, {
            text: btn.textContent.trim(),
            onclick: btn.onclick?.toString().substring(0, 50) + '...',
            className: btn.className
        });
    });
    
    // Verifica especificamente os botões esperados
    const exportBtn = document.querySelector('button[onclick*="startExport"]');
    const previewBtn = document.querySelector('button[onclick*="previewExport"]');
    
    console.log('Botão Exportar encontrado:', !!exportBtn);
    console.log('Botão Preview encontrado:', !!previewBtn);
    
    console.log('=== FIM VERIFICAÇÃO BOTÕES ===');
}

// Exporta funções para uso no console
window.debugOrg = debugOrganization;
window.goToStep4 = goToStep4;
window.checkButtons = checkButtons;

console.log(`
Debug do OrganizationPanel carregado!

Comandos disponíveis:
- debugOrg() - Executa diagnóstico completo
- goToStep4() - Navega para Etapa 4 e executa debug
- checkButtons() - Verifica se os botões estão presentes

Execute debugOrg() para começar o diagnóstico.
`);