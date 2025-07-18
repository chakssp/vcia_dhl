/**
 * Script para forçar carregamento de conteúdo completo dos arquivos
 */

async function forceLoadAllContent() {
    console.log('🔧 Forçando carregamento de conteúdo completo...');
    
    const files = KC.AppState.get('files') || [];
    console.log(`📁 ${files.length} arquivos encontrados`);
    
    let loaded = 0;
    let failed = 0;
    
    for (const file of files) {
        if (!file.content && file.handle) {
            try {
                const fileObj = await file.handle.getFile();
                file.content = await fileObj.text();
                loaded++;
                console.log(`✅ Conteúdo carregado: ${file.name} (${file.content.length} caracteres)`);
            } catch (error) {
                failed++;
                console.error(`❌ Erro ao carregar ${file.name}:`, error);
            }
        } else if (file.content) {
            console.log(`✓ ${file.name} já tem conteúdo`);
        }
    }
    
    // Atualizar AppState
    KC.AppState.set('files', files);
    
    // Forçar atualização da interface
    KC.EventBus.emit(KC.Events.FILES_UPDATED, {
        action: 'content_loaded',
        loaded: loaded,
        failed: failed
    });
    
    console.log(`\n📊 Resultado:`);
    console.log(`✅ Carregados: ${loaded}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log(`📁 Total: ${files.length}`);
    
    // Verificar
    const withContent = files.filter(f => f.content).length;
    console.log(`\n✅ Arquivos com conteúdo: ${withContent}/${files.length}`);
    
    return files;
}

// Executar o pipeline após carregar conteúdo
async function loadAndProcess() {
    console.log('🚀 Carregando conteúdo e processando...');
    
    // 1. Carregar conteúdo
    await forceLoadAllContent();
    
    // 2. Executar pipeline
    console.log('\n🔄 Executando pipeline...');
    const result = await KC.RAGExportManager.processApprovedFiles();
    
    console.log('\n📊 Resultado do pipeline:', result);
    
    return result;
}

// Registrar no window
window.forceLoadAllContent = forceLoadAllContent;
window.loadAndProcess = loadAndProcess;

console.log(`
🔧 Correção de Conteúdo Carregada!

Comandos disponíveis:
- forceLoadAllContent() - Carrega conteúdo completo de todos os arquivos
- loadAndProcess() - Carrega conteúdo E executa o pipeline

Execute forceLoadAllContent() para começar.
`);