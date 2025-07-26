// Script para corrigir o RefinementDetector
function fixRefinementDetector() {
    console.log('=== CORRIGINDO REFINEMENT DETECTOR ===\n');
    
    if (!KC.RefinementDetector) {
        console.error('❌ RefinementDetector não encontrado!');
        return;
    }
    
    // Salvar o método original
    const originalDetectContext = KC.RefinementDetector.detectContext;
    
    // Substituir por versão mais robusta
    KC.RefinementDetector.detectContext = async function(file) {
        try {
            // Validações básicas
            if (!file) {
                console.warn('RefinementDetector: arquivo nulo fornecido');
                return this.createEmptyContext();
            }
            
            // Garantir que file tem propriedades mínimas
            const safeFile = {
                id: file.id || `temp_${Date.now()}`,
                name: file.name || 'unknown',
                content: file.content || '',
                preview: file.preview || '',
                handle: file.handle || null,
                categories: file.categories || [],
                analyzed: file.analyzed || false,
                analysisType: file.analysisType || null,
                relevanceScore: file.relevanceScore || 0
            };
            
            // Log para debug
            console.log('RefinementDetector: detectando contexto para', safeFile.name, {
                hasContent: !!safeFile.content,
                hasPreview: !!safeFile.preview,
                hasHandle: !!safeFile.handle
            });
            
            // Chamar método original com arquivo seguro
            return originalDetectContext.call(this, safeFile);
            
        } catch (error) {
            console.error('RefinementDetector: erro tratado', {
                file: file?.name,
                error: error.message
            });
            
            // Retornar contexto vazio em caso de erro
            return this.createEmptyContext();
        }
    };
    
    console.log('✅ RefinementDetector corrigido com validações adicionais');
    
    // Testar com arquivo problemático
    const files = KC.AppState.get('files') || [];
    if (files.length > 0) {
        console.log('\nTestando com arquivo:', files[0].name);
        KC.RefinementDetector.detectContext(files[0]).then(context => {
            console.log('✅ Teste bem-sucedido! Contexto:', context);
        }).catch(error => {
            console.error('❌ Teste falhou:', error);
        });
    }
}

// Aplicar correção
fixRefinementDetector();