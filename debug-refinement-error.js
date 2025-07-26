// Script para debugar erro no RefinementDetector
async function debugRefinementError() {
    console.log('=== DEBUG REFINEMENT DETECTOR ERROR ===\n');
    
    try {
        // 1. Verificar se RefinementDetector existe
        console.log('1. VERIFICANDO COMPONENTES:\n');
        console.log('RefinementDetector existe?', !!KC.RefinementDetector);
        console.log('RefinementService existe?', !!KC.RefinementService);
        console.log('ConvergenceCalculator existe?', !!KC.ConvergenceCalculator);
        
        if (!KC.RefinementDetector) {
            console.error('❌ RefinementDetector não encontrado!');
            return;
        }
        
        // 2. Verificar métodos do RefinementDetector
        console.log('\n2. MÉTODOS DO REFINEMENT DETECTOR:\n');
        const detector = KC.RefinementDetector;
        const methods = [
            'detectContext',
            'prepareContent',
            'detectSemanticPatterns',
            'detectRelations',
            'detectStructuralMetadata',
            'detectQualitySignals',
            'correlateWithCategories',
            'calculateContextConfidence',
            'createEmptyContext',
            'getFromCache',
            'saveToCache'
        ];
        
        methods.forEach(method => {
            console.log(`${method}: ${typeof detector[method] === 'function' ? '✅' : '❌'}`);
        });
        
        // 3. Testar com um arquivo de exemplo
        console.log('\n3. TESTANDO COM ARQUIVO:\n');
        const files = KC.AppState.get('files') || [];
        const testFile = files[0];
        
        if (!testFile) {
            console.log('Nenhum arquivo disponível para teste');
            return;
        }
        
        console.log('Arquivo teste:', testFile.name);
        console.log('Tem conteúdo?', !!testFile.content);
        console.log('Tem preview?', !!testFile.preview);
        console.log('Tem handle?', !!testFile.handle);
        
        // 4. Tentar detectar contexto manualmente
        console.log('\n4. TENTANDO DETECTAR CONTEXTO:\n');
        
        try {
            const context = await detector.detectContext(testFile);
            console.log('✅ Contexto detectado com sucesso!');
            console.log('Contexto:', context);
        } catch (error) {
            console.error('❌ Erro ao detectar contexto:');
            console.error('Mensagem:', error.message);
            console.error('Stack:', error.stack);
            
            // Tentar identificar exatamente onde está o erro
            console.log('\n5. DEBUGGING PASSO A PASSO:\n');
            
            // Teste prepareContent
            try {
                const content = await detector.prepareContent(testFile);
                console.log('prepareContent OK, retornou:', content ? content.length + ' chars' : 'null');
            } catch (e) {
                console.error('Erro em prepareContent:', e.message);
            }
            
            // Teste createEmptyContext
            try {
                const empty = detector.createEmptyContext();
                console.log('createEmptyContext OK:', empty);
            } catch (e) {
                console.error('Erro em createEmptyContext:', e.message);
            }
        }
        
        // 5. Verificar se é problema de inicialização
        console.log('\n6. VERIFICANDO INICIALIZAÇÃO:\n');
        
        // Verificar se o RefinementDetector foi criado como instância
        console.log('RefinementDetector é classe?', typeof KC.RefinementDetector === 'function');
        console.log('RefinementDetector é objeto?', typeof KC.RefinementDetector === 'object');
        
        // Se for classe, precisa ser instanciado
        if (typeof KC.RefinementDetector === 'function') {
            console.log('⚠️ RefinementDetector é uma classe mas não foi instanciado!');
            console.log('Tentando criar instância...');
            
            try {
                KC.RefinementDetector = new KC.RefinementDetector();
                console.log('✅ Instância criada com sucesso!');
                
                // Testar novamente
                const context = await KC.RefinementDetector.detectContext(testFile);
                console.log('✅ Contexto detectado após instanciação:', context);
            } catch (e) {
                console.error('Erro ao instanciar:', e.message);
            }
        }
        
    } catch (error) {
        console.error('Erro geral no debug:', error);
    }
}

// Executar
debugRefinementError();