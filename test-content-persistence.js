// Script de teste para validar persistência de conteúdo
console.log('=== TESTANDO PERSISTÊNCIA DE CONTEÚDO ===\n');

// 1. Verificar arquivos atuais
const files = KC.AppState.get('files') || [];
console.log(`Total de arquivos: ${files.length}`);

// 2. Estatísticas sobre tamanhos
const stats = {
    total: files.length,
    withContent: files.filter(f => f.content).length,
    smallTextFiles: files.filter(f => 
        f.size < 500 * 1024 && 
        ['.md', '.txt', '.markdown'].includes(f.extension?.toLowerCase() || '')
    ).length,
    largeFiles: files.filter(f => f.size >= 500 * 1024).length,
    textFiles: files.filter(f => ['.md', '.txt', '.markdown'].includes(f.extension?.toLowerCase() || '')).length
};

console.log('\n📊 ESTATÍSTICAS DOS ARQUIVOS:');
console.log(`Total de arquivos: ${stats.total}`);
console.log(`Com conteúdo carregado: ${stats.withContent}`);
console.log(`Arquivos texto total: ${stats.textFiles}`);
console.log(`Arquivos texto < 500KB: ${stats.smallTextFiles}`);
console.log(`Arquivos grandes (>= 500KB): ${stats.largeFiles}`);

// 3. Listar arquivos que manterão conteúdo
console.log('\n📁 ARQUIVOS QUE MANTERÃO CONTEÚDO COMPLETO:');
files.forEach(file => {
    const isTextFile = ['.md', '.txt', '.markdown'].includes(file.extension?.toLowerCase() || '');
    const isSmall = file.size < 500 * 1024;
    
    if (isTextFile && isSmall) {
        console.log(`✅ ${file.name} (${(file.size/1024).toFixed(1)}KB) - ${file.content ? 'COM conteúdo' : 'SEM conteúdo'}`);
    }
});

// 4. Forçar re-save para aplicar nova lógica
console.log('\n🔄 Aplicando nova lógica de persistência...');
KC.AppState._save();

// 5. Verificar resultado após save
setTimeout(() => {
    const saved = localStorage.getItem('kc_app_state');
    if (saved) {
        const { state } = JSON.parse(saved);
        const filesWithContent = state.files.filter(f => f.content).length;
        console.log(`\n✅ Estado salvo! Arquivos com conteúdo preservado: ${filesWithContent}`);
        
        // Mostrar tamanho do localStorage
        const size = new Blob([saved]).size;
        console.log(`📏 Tamanho total do estado salvo: ${(size/1024).toFixed(1)}KB`);
    }
}, 1000);

console.log('\n💡 Dica: Recarregue a página e execute kcdiag() para verificar se o conteúdo foi mantido!');