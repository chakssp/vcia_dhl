/**
 * Debug detalhado para extração de triplas
 */

async function debugTripleExtraction() {
    console.log('🔍 DEBUG DETALHADO DE EXTRAÇÃO DE TRIPLAS\n');
    
    const KC = window.KnowledgeConsolidator;
    
    // 1. Verificar componentes
    console.log('1️⃣ Verificando componentes...');
    console.log('  TripleStoreManager:', !!KC.TripleStoreManager);
    console.log('  TripleSchema:', !!KC.TripleSchema);
    console.log('  RelationshipExtractor:', !!KC.RelationshipExtractor);
    console.log('  TripleStoreService:', !!KC.TripleStoreService);
    
    // 2. Testar extração básica
    console.log('\n2️⃣ Testando RelationshipExtractor diretamente...');
    
    const arquivoTeste = {
        id: 'debug_test_001',
        name: 'teste-debug.md',
        content: 'Este é um teste de Machine Learning com Python',
        type: 'text/markdown',
        size: 100
    };
    
    try {
        const extractor = new KC.RelationshipExtractor();
        const triplas = await extractor.extrairDeArquivo(arquivoTeste);
        
        console.log(`  ✅ Triplas extraídas: ${triplas.length}`);
        
        if (triplas.length > 0) {
            console.log('\n  Primeira tripla:');
            console.log('  ', JSON.stringify(triplas[0], null, 2));
        }
    } catch (erro) {
        console.error('  ❌ Erro na extração:', erro);
    }
    
    // 3. Testar validação do schema
    console.log('\n3️⃣ Testando validação do TripleSchema...');
    
    const triplaTest = {
        id: 'test_001',
        legado: { tipo: 'SYS.R', valor: 'arquivo_test' },
        presente: { tipo: 'SUB.R', valor: 'temNome' },
        objetivo: { tipo: 'ACT.R', valor: 'teste.md' },
        metadados: { fonte: 'teste', confianca: 1.0 }
    };
    
    try {
        if (KC.TripleSchema && KC.TripleSchema.validarTripla) {
            const validacao = KC.TripleSchema.validarTripla(triplaTest);
            console.log('  Resultado da validação:', validacao);
        } else {
            console.log('  ⚠️ TripleSchema.validarTripla não disponível');
        }
    } catch (erro) {
        console.error('  ❌ Erro na validação:', erro);
    }
    
    // 4. Testar adição manual ao TripleStoreManager
    console.log('\n4️⃣ Testando adição direta ao TripleStoreManager...');
    
    try {
        const manager = new KC.TripleStoreManager();
        
        // Desabilitar validação temporariamente
        manager.config.validateSchema = false;
        
        const resultado = await manager.adicionarTripla(
            'arquivo_debug',
            'temNome',
            'debug.md',
            { fonte: 'teste_manual' }
        );
        
        console.log('  ✅ Tripla adicionada:', resultado);
    } catch (erro) {
        console.error('  ❌ Erro ao adicionar:', erro.message);
        console.error('  Stack:', erro.stack);
    }
    
    // 5. Testar com validação habilitada
    console.log('\n5️⃣ Testando com validação habilitada...');
    
    try {
        const manager2 = new KC.TripleStoreManager();
        
        // Habilitar validação
        manager2.config.validateSchema = true;
        
        const resultado2 = await manager2.adicionarTripla(
            'arquivo_debug2',
            'temNome',
            'debug2.md',
            { fonte: 'teste_manual' }
        );
        
        console.log('  ✅ Tripla adicionada com validação:', resultado2);
    } catch (erro) {
        console.error('  ❌ Erro com validação:', erro.message);
        
        // Tentar entender o erro
        if (erro.message.includes('inválida')) {
            console.log('\n  🔍 Debugando validação...');
            const triplaDebug = {
                legado: { tipo: 'SYS.R', valor: 'arquivo_debug2' },
                presente: { tipo: 'SUB.R', valor: 'temNome' },
                objetivo: { tipo: 'ACT.R', valor: 'debug2.md' },
                metadados: { fonte: 'teste_manual' }
            };
            
            if (KC.TripleSchema && KC.TripleSchema.validarTripla) {
                const validacaoDebug = KC.TripleSchema.validarTripla(triplaDebug);
                console.log('  Validação detalhada:', validacaoDebug);
            }
        }
    }
    
    console.log('\n✅ Debug concluído!');
}

// Função auxiliar para testar predicados específicos
async function testarPredicado(predicado) {
    console.log(`\n🔍 Testando predicado: ${predicado}`);
    
    const KC = window.KnowledgeConsolidator;
    const manager = new KC.TripleStoreManager();
    manager.config.validateSchema = true;
    
    try {
        const resultado = await manager.adicionarTripla(
            'teste_sujeito',
            predicado,
            'teste_objeto',
            { fonte: 'teste' }
        );
        console.log('  ✅ Predicado válido');
        return true;
    } catch (erro) {
        console.error(`  ❌ Predicado inválido: ${erro.message}`);
        return false;
    }
}

// Exportar funções
window.debugTripleExtraction = debugTripleExtraction;
window.testarPredicado = testarPredicado;

console.log('🐛 Debug de extração carregado! Use: debugTripleExtraction()');