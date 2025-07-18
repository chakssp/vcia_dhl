(() => {
    console.log('🔍 DIAGNÓSTICO KNOWLEDGE CONSOLIDATOR');
    console.log('=====================================\n');

    // 1. Verificar namespace KC
    console.log('1️⃣ Verificando namespace KC...');
    if (typeof window.KnowledgeConsolidator === 'undefined') {
        console.error('❌ KnowledgeConsolidator não está definido!');
        return;
    }
    console.log('✅ KnowledgeConsolidator está definido\n');

    const KC = window.KnowledgeConsolidator;

    // 2. Verificar componentes principais
    console.log('2️⃣ Componentes principais:');
    const components = [
        'EventBus', 'AppState', 'AppController', 'Logger',
        'HandleManager', 'PreviewUtils', 'ChunkingUtils',
        'ConfigManager', 'DiscoveryManager', 'FilterManager',
        'AnalysisManager', 'CategoryManager', 'PromptManager',
        'AnalysisAdapter', 'AIAPIManager', 'RAGExportManager',
        'StatsManager', 'WorkflowPanel', 'FileRenderer',
        'FilterPanel', 'ModalManager', 'StatsPanel', 'APIConfig',
        'QdrantSchema'
    ];

    let loadedCount = 0;
    components.forEach(comp => {
        if (KC[comp]) {
            console.log(`  ✅ ${comp}: ${typeof KC[comp]}`);
            loadedCount++;
        } else {
            console.warn(`  ⚠️ ${comp}: undefined`);
        }
    });
    console.log(`\n📊 Componentes carregados: ${loadedCount}/${components.length}\n`);

    // 3. Verificar estado atual
    console.log('3️⃣ Estado atual:');
    if (KC.AppState) {
        try {
            const currentStep = KC.AppState.get('currentStep');
            const files = KC.AppState.get('files') || [];
            const categories = KC.AppState.get('categories') || [];
            
            console.log(`  📍 Etapa atual: ${currentStep || 1}`);
            console.log(`  📁 Arquivos: ${files.length}`);
            console.log(`  📂 Categorias: ${categories.length}`);
            
            // Verificar configuração de APIs
            const apiKeys = KC.AppState.get('apiKeys') || {};
            const activeProvider = KC.AppState.get('activeProvider') || 'ollama';
            console.log(`  🤖 Provider ativo: ${activeProvider}`);
            console.log(`  🔑 APIs configuradas: ${Object.keys(apiKeys).join(', ') || 'nenhuma'}`);
        } catch (error) {
            console.error('  ❌ Erro ao acessar AppState:', error);
        }
    } else {
        console.warn('  ⚠️ AppState não disponível');
    }
    console.log('');

    // 4. Verificar localStorage
    console.log('4️⃣ LocalStorage:');
    const kcKeys = Object.keys(localStorage).filter(k => k.startsWith('kc_'));
    if (kcKeys.length === 0) {
        console.log('  ℹ️ Nenhuma chave KC encontrada');
    } else {
        kcKeys.forEach(key => {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            console.log(`  💾 ${key}: ${(size / 1024).toFixed(2)} KB`);
        });
    }
    console.log('');

    // 5. Verificar função kcdiag
    console.log('5️⃣ Função kcdiag:');
    if (typeof kcdiag === 'function') {
        console.log('  ✅ kcdiag está disponível');
        console.log('  ℹ️ Execute kcdiag() para diagnóstico completo');
    } else {
        console.warn('  ⚠️ kcdiag não está disponível');
    }
    console.log('');

    // 6. Verificar erros no console
    console.log('6️⃣ Status geral:');
    const hasErrors = document.querySelectorAll('script[src*="/js/"][onerror]').length > 0;
    if (hasErrors) {
        console.error('  ❌ Existem erros de carregamento de scripts');
    } else {
        console.log('  ✅ Sem erros aparentes de carregamento');
    }

    console.log('\n=====================================');
    console.log('🏁 Diagnóstico concluído!');
    
    // Retornar resumo
    return {
        kcDefined: true,
        componentsLoaded: loadedCount,
        totalComponents: components.length,
        hasAppState: !!KC.AppState,
        hasKcdiag: typeof kcdiag === 'function',
        localStorageKeys: kcKeys.length
    };
