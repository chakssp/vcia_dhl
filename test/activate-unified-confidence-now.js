/**
 * ATIVAR O SISTEMA QUE JÁ FOI IMPLEMENTADO
 * 
 * O UnifiedConfidenceSystem já existe mas não está sendo usado!
 * Este script ATIVA ele no fluxo principal.
 */

console.log('🚨 ATIVANDO UnifiedConfidenceSystem NO FLUXO PRINCIPAL\n');

// 1. VERIFICAR SE O SISTEMA EXISTE
if (!KC.UnifiedConfidenceControllerInstance) {
    console.error('❌ UnifiedConfidenceSystem não carregado!');
    console.log('Carregando agora...');
    
    // Carregar os scripts necessários
    const scripts = [
        'js/controllers/UnifiedConfidenceController.js',
        'js/services/QdrantScoreBridge.js',
        'js/utils/ScoreNormalizer.js'
    ];
    
    for (const script of scripts) {
        const s = document.createElement('script');
        s.src = script;
        document.head.appendChild(s);
    }
}

// 2. INTEGRAR NO DISCOVERYMANAGER
console.log('📌 Integrando no DiscoveryManager...');
const originalProcessFiles = KC.DiscoveryManager.processFiles;
KC.DiscoveryManager.processFiles = async function(files) {
    const result = await originalProcessFiles.call(this, files);
    
    // USAR UnifiedConfidenceSystem em CADA arquivo
    for (const file of result) {
        const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
        file.relevanceScore = confidence.confidence;
        file.confidence = confidence.confidence;
        file.confidenceSource = confidence.source;
    }
    
    return result;
};

// 3. INTEGRAR NO FILERENDERER
console.log('📌 Integrando no FileRenderer...');
const originalRenderFiles = KC.FileRenderer.renderFiles;
KC.FileRenderer.renderFiles = async function(files) {
    // Atualizar confidence antes de renderizar
    for (const file of files) {
        if (!file.confidenceSource || file.confidence === 0) {
            const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
            file.relevanceScore = confidence.confidence;
            file.confidence = confidence.confidence;
            file.confidenceSource = confidence.source;
        }
    }
    
    return originalRenderFiles.call(this, files);
};

// 4. INTEGRAR NO CATEGORYMANAGER
console.log('📌 Integrando no CategoryManager...');
const originalAddCategory = KC.CategoryManager.addCategoryToFile;
KC.CategoryManager.addCategoryToFile = async function(fileId, category) {
    const result = await originalAddCategory.call(this, fileId, category);
    
    // Recalcular confidence após adicionar categoria
    const files = KC.AppState.get('files');
    const file = files.find(f => f.id === fileId);
    if (file) {
        const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(fileId);
        file.relevanceScore = confidence.confidence;
        file.confidence = confidence.confidence;
        file.confidenceSource = confidence.source;
        
        KC.AppState.set('files', files);
        KC.EventBus.emit(KC.Events.FILES_UPDATED, {action: 'confidence_updated'});
    }
    
    return result;
};

// 5. PROCESSAR ARQUIVOS JÁ EXISTENTES
console.log('\n🔄 Processando arquivos existentes...\n');

const files = KC.AppState.get('files') || [];
let processados = 0;

for (const file of files) {
    const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
    if (confidence.confidence !== file.confidence) {
        file.relevanceScore = confidence.confidence;
        file.confidence = confidence.confidence;
        file.confidenceSource = confidence.source;
        processados++;
        console.log(`✅ ${file.name}: ${confidence.confidence}% (${confidence.source})`);
    }
}

// Salvar e atualizar UI
KC.AppState.set('files', files);
KC.EventBus.emit(KC.Events.FILES_UPDATED, {action: 'unified_confidence_activated'});
if (KC.FileRenderer && KC.FileRenderer.renderFiles) {
    KC.FileRenderer.renderFiles(files);
}

console.log(`\n✅ SISTEMA ATIVADO!`);
console.log(`📊 ${processados} arquivos atualizados`);
console.log(`🎯 UnifiedConfidenceSystem agora está ATIVO no fluxo principal`);
console.log(`\n⚡ Todos os novos arquivos usarão automaticamente o sistema unificado!`);