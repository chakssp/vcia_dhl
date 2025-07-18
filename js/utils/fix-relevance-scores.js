/**
 * Utilitário para corrigir scores de relevância salvos em formato decimal
 * 
 * Problema: Arquivos antigos têm relevanceScore como decimal (0.01 = 1%)
 * Solução: Converter para percentual (1% = 1, não 0.01)
 */

function fixRelevanceScores() {
    console.log('🔧 Iniciando correção de scores de relevância...');
    
    // Obtém arquivos do AppState
    const files = KC.AppState.get('files') || [];
    let fixed = 0;
    
    // Corrige cada arquivo
    const correctedFiles = files.map(file => {
        if (file.relevanceScore && file.relevanceScore < 1) {
            const oldScore = file.relevanceScore;
            file.relevanceScore = Math.round(file.relevanceScore * 100 * 100) / 100; // Arredonda para 2 casas decimais
            fixed++;
            console.log(`✅ ${file.name}: ${oldScore} → ${file.relevanceScore}%`);
        }
        return file;
    });
    
    // Salva arquivos corrigidos
    if (fixed > 0) {
        KC.AppState.set('files', correctedFiles);
        console.log(`✅ Corrigidos ${fixed} arquivos!`);
        console.log('💡 Recarregue a página para ver as mudanças.');
    } else {
        console.log('ℹ️ Nenhum arquivo precisou de correção.');
    }
    
    return {
        total: files.length,
        fixed: fixed,
        files: correctedFiles
    };
}

// Função para executar no console
window.fixRelevanceScores = fixRelevanceScores;

console.log(`
🔧 Utilitário de Correção de Relevância Carregado!

Para corrigir os scores de relevância, execute no console:
fixRelevanceScores()

Isso converterá valores decimais (0.01) para percentuais (1%).
`);