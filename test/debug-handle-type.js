/**
 * Debug para entender o tipo de handle armazenado
 */

function debugHandleType() {
    console.log('🔍 Investigando tipo de handle...');
    
    const files = KC.AppState.get('files') || [];
    
    if (files.length > 0) {
        const file = files[0];
        console.log('\n📄 Primeiro arquivo:', file.name);
        console.log('Handle tipo:', typeof file.handle);
        console.log('Handle valor:', file.handle);
        
        if (file.handle) {
            console.log('Handle é FileSystemHandle?', file.handle instanceof FileSystemFileHandle);
            console.log('Handle propriedades:', Object.keys(file.handle));
            console.log('Handle constructor:', file.handle.constructor?.name);
        }
    }
    
    // Verificar HandleManager
    console.log('\n📂 HandleManager:');
    if (KC.HandleManager) {
        console.log('HandleManager disponível:', true);
        const handles = KC.HandleManager.list();
        console.log('Handles registrados:', handles);
    }
}

// Solução alternativa - recarregar arquivos do zero
async function reloadFromDirectory() {
    console.log('🔄 Recarregando arquivos do diretório...');
    
    try {
        // Solicitar diretório novamente
        const dirHandle = await window.showDirectoryPicker();
        const files = [];
        
        // Processar arquivos
        async function processDirectory(dirHandle, path = '') {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && isRelevantFile(entry.name)) {
                    const file = await entry.getFile();
                    const content = await file.text();
                    
                    files.push({
                        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: entry.name,
                        path: path + '/' + entry.name,
                        size: file.size,
                        lastModified: file.lastModified,
                        content: content,
                        handle: entry,
                        preview: KC.PreviewUtils?.extractSmartPreview(content) || {},
                        relevanceScore: KC.PreviewUtils?.calculatePreviewRelevance(KC.PreviewUtils?.extractSmartPreview(content)) || 50
                    });
                    
                    console.log(`✅ ${entry.name} carregado (${content.length} caracteres)`);
                }
            }
        }
        
        await processDirectory(dirHandle);
        
        // Atualizar AppState
        KC.AppState.set('files', files);
        
        console.log(`\n✅ ${files.length} arquivos recarregados com conteúdo completo!`);
        
        // Executar pipeline
        const result = await KC.RAGExportManager.processApprovedFiles();
        console.log('📊 Resultado do pipeline:', result);
        
        return result;
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('❌ Erro:', error);
        }
    }
}

function isRelevantFile(filename) {
    const extensions = ['.md', '.txt', '.text', '.markdown'];
    return extensions.some(ext => filename.toLowerCase().endsWith(ext));
}

// Solução mais simples - usar o conteúdo do preview
async function processWithPreviewOnly() {
    console.log('🔧 Processando usando apenas preview...');
    
    const files = KC.AppState.get('files') || [];
    const filesWithContent = files.map(file => {
        if (!file.content && file.preview) {
            // Usar preview como conteúdo
            file.content = KC.PreviewUtils.getTextPreview(file.preview);
            console.log(`📝 Usando preview para ${file.name}`);
        }
        return file;
    });
    
    // Atualizar AppState
    KC.AppState.set('files', filesWithContent);
    
    // Executar pipeline
    const result = await KC.RAGExportManager.processApprovedFiles();
    console.log('📊 Resultado:', result);
    
    return result;
}

// Registrar funções
window.debugHandleType = debugHandleType;
window.reloadFromDirectory = reloadFromDirectory;
window.processWithPreviewOnly = processWithPreviewOnly;

console.log(`
🔧 Debug de Handle Carregado!

Comandos disponíveis:
- debugHandleType() - Verifica o tipo de handle armazenado
- reloadFromDirectory() - Recarrega arquivos do diretório (requer seleção)
- processWithPreviewOnly() - Processa usando apenas o preview disponível

Execute debugHandleType() primeiro para entender o problema.
`);