/**
 * Debug para verificar porque os dados não estão sendo carregados no pipeline
 */

function debugPipelineData() {
    console.log('=== DEBUG PIPELINE DATA ===');
    
    // 1. Verifica o que tem no AppState
    const files = KC.AppState.get('files') || [];
    console.log(`1. Total de arquivos no AppState: ${files.length}`);
    
    if (files.length > 0) {
        console.log('2. Detalhes dos arquivos:');
        files.forEach((file, index) => {
            console.log(`   Arquivo ${index + 1}:`, {
                id: file.id,
                name: file.name,
                relevanceScore: file.relevanceScore,
                archived: file.archived,
                hasPreview: !!file.preview,
                hasContent: !!file.content,
                analyzed: file.analyzed,
                analysisType: file.analysisType
            });
        });
        
        // 3. Verifica quantos passam pelo filtro
        const approved = files.filter(file => {
            let relevance = file.relevanceScore;
            if (relevance && relevance < 1) {
                relevance = relevance * 100;
            }
            return relevance >= 50 && file.preview && !file.archived;
        });
        
        console.log(`3. Arquivos aprovados (relevância >= 50%, com preview, não arquivados): ${approved.length}`);
        
        if (approved.length === 0 && files.length > 0) {
            console.log('4. PROBLEMA: Nenhum arquivo passa pelos critérios!');
            console.log('   Verificando cada critério:');
            
            files.forEach((file, index) => {
                let relevance = file.relevanceScore;
                if (relevance && relevance < 1) {
                    relevance = relevance * 100;
                }
                
                console.log(`   Arquivo ${index + 1} (${file.name}):`);
                console.log(`     - Relevância >= 50%? ${relevance >= 50} (valor: ${relevance})`);
                console.log(`     - Tem preview? ${!!file.preview}`);
                console.log(`     - Não está arquivado? ${!file.archived}`);
                console.log(`     - APROVADO? ${relevance >= 50 && !!file.preview && !file.archived}`);
            });
        }
    } else {
        console.log('2. PROBLEMA: Nenhum arquivo no AppState!');
        
        // Verifica localStorage diretamente
        const lsData = localStorage.getItem('kc_state');
        if (lsData) {
            try {
                const parsed = JSON.parse(lsData);
                console.log('3. Dados no localStorage:', {
                    hasFiles: !!parsed.files,
                    filesLength: parsed.files?.length || 0
                });
            } catch (e) {
                console.log('3. Erro ao parsear localStorage:', e.message);
            }
        } else {
            console.log('3. Nada no localStorage com chave "kc_state"');
        }
    }
    
    console.log('=== FIM DEBUG ===');
}

// Função para forçar reload dos dados
function forceReloadData() {
    console.log('Forçando reload dos dados do localStorage...');
    
    const lsData = localStorage.getItem('kc_state');
    if (lsData) {
        try {
            const parsed = JSON.parse(lsData);
            if (parsed.files && parsed.files.length > 0) {
                KC.AppState.set('files', parsed.files);
                console.log(`✅ ${parsed.files.length} arquivos recarregados!`);
            } else {
                console.log('❌ Nenhum arquivo encontrado no localStorage');
            }
        } catch (e) {
            console.log('❌ Erro ao recarregar:', e.message);
        }
    }
}

// Função para verificar e processar
async function debugAndProcess() {
    console.log('=== DEBUG E PROCESSAR ===');
    
    // 1. Debug atual
    debugPipelineData();
    
    // 2. Tenta processar
    console.log('\nTentando processar...');
    const result = await KC.RAGExportManager.processApprovedFiles();
    console.log('Resultado:', result);
    
    return result;
}

// Registra no window
window.debugPipelineData = debugPipelineData;
window.forceReloadData = forceReloadData;
window.debugAndProcess = debugAndProcess;

console.log(`
🔍 Debug do Pipeline carregado!

Comandos disponíveis:
- debugPipelineData() - Verifica o que está no AppState
- forceReloadData() - Força recarregar do localStorage
- debugAndProcess() - Debug + tenta processar

Execute debugPipelineData() para começar.
`);