/**
 * Verificação rápida de categorias
 * Execute no console: copy(await fetch('test/quick-categories-check.js').then(r=>r.text())); eval(it)
 */

(function() {
    console.log('🔍 VERIFICAÇÃO RÁPIDA DE CATEGORIAS');
    console.log('='.repeat(50));
    
    // 1. Verificar CategoryManager
    console.log('\n1️⃣ CategoryManager:');
    if (KC.CategoryManager) {
        const categories = KC.CategoryManager.getCategories();
        console.log(`✅ Total de categorias: ${categories.length}`);
        console.log('Primeiras 5:', categories.slice(0, 5).map(c => `${c.id}: ${c.name}`));
    } else {
        console.log('❌ CategoryManager não encontrado');
    }
    
    // 2. Verificar CategoryNormalizer
    console.log('\n2️⃣ CategoryNormalizer:');
    if (KC.CategoryNormalizer) {
        console.log('✅ CategoryNormalizer disponível');
        
        // Teste rápido
        const testIds = ['tecnico', 'estrategico'];
        const normalized = KC.CategoryNormalizer.normalize(testIds, 'quick-test');
        console.log(`Teste: ${testIds} → ${normalized.map(c => c.name).join(', ')}`);
    } else {
        console.log('❌ CategoryNormalizer não encontrado');
    }
    
    // 3. Verificar arquivos no AppState
    console.log('\n3️⃣ Arquivos com categorias:');
    const files = KC.AppState.get('files') || [];
    const filesWithCategories = files.filter(f => f.categories && f.categories.length > 0);
    console.log(`Total de arquivos: ${files.length}`);
    console.log(`Arquivos com categorias: ${filesWithCategories.length}`);
    
    if (filesWithCategories.length > 0) {
        console.log('\nExemplos:');
        filesWithCategories.slice(0, 3).forEach(file => {
            console.log(`📄 ${file.name}:`);
            console.log(`   Categorias: ${file.categories.join(', ')}`);
            console.log(`   Tipo: ${typeof file.categories[0]} (${file.categories[0]})`);
        });
    }
    
    // 4. Verificar se há documentos processados
    console.log('\n4️⃣ Status do processamento:');
    const processed = KC.AppState.get('lastProcessedData');
    if (processed) {
        console.log('✅ Dados processados encontrados');
        console.log(`   Documents: ${processed.documents?.length || 0}`);
        if (processed.documents && processed.documents[0]) {
            const firstDoc = processed.documents[0];
            console.log(`   Primeiro doc: ${firstDoc.name}`);
            console.log(`   Categorias: ${firstDoc.categories || 'VAZIO'}`);
        }
    } else {
        console.log('⚠️ Nenhum dado processado ainda');
    }
    
    console.log('\n✅ Verificação concluída!');
})();