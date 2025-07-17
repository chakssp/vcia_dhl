/**
 * Script para executar debugTripleExtraction() e capturar resultados
 */

// Função para executar no contexto da página
async function runDebugInPage() {
    const KC = window.KnowledgeConsolidator;
    const results = {
        components: {},
        extraction: {},
        validation: {},
        storage: {},
        errors: []
    };
    
    try {
        // 1. Verificar componentes
        results.components = {
            TripleStoreManager: !!KC?.TripleStoreManager,
            TripleSchema: !!KC?.TripleSchema,
            RelationshipExtractor: !!KC?.RelationshipExtractor,
            TripleStoreService: !!KC?.TripleStoreService
        };
        
        // 2. Testar extração básica
        if (KC?.RelationshipExtractor) {
            const arquivoTeste = {
                id: 'debug_test_001',
                name: 'teste-debug.md',
                content: 'Este é um teste de Machine Learning com Python para análise de dados',
                type: 'text/markdown',
                size: 100
            };
            
            try {
                const extractor = new KC.RelationshipExtractor();
                const triplas = await extractor.extrairDeArquivo(arquivoTeste);
                
                results.extraction = {
                    success: true,
                    triplasCount: triplas.length,
                    firstTripla: triplas[0] || null,
                    allTriplas: triplas
                };
            } catch (erro) {
                results.extraction = {
                    success: false,
                    error: erro.toString()
                };
            }
        } else {
            results.extraction = {
                success: false,
                error: 'RelationshipExtractor não encontrado'
            };
        }
        
        // 3. Testar validação do schema
        if (KC?.TripleSchema?.validarTripla) {
            const triplaTest = {
                id: 'test_001',
                legado: { tipo: 'SYS.R', valor: 'arquivo_test' },
                presente: { tipo: 'SUB.R', valor: 'temNome' },
                objetivo: { tipo: 'ACT.R', valor: 'teste.md' },
                metadados: { fonte: 'teste', confianca: 1.0 }
            };
            
            try {
                const validacao = KC.TripleSchema.validarTripla(triplaTest);
                results.validation = {
                    success: true,
                    result: validacao
                };
            } catch (erro) {
                results.validation = {
                    success: false,
                    error: erro.toString()
                };
            }
        } else {
            results.validation = {
                success: false,
                error: 'TripleSchema.validarTripla não encontrado'
            };
        }
        
        // 4. Testar armazenamento
        if (KC?.TripleStoreService) {
            try {
                const store = KC.TripleStoreService.getInstance();
                const stats = await store.obterEstatisticas();
                results.storage = {
                    success: true,
                    stats: stats
                };
            } catch (erro) {
                results.storage = {
                    success: false,
                    error: erro.toString()
                };
            }
        } else {
            results.storage = {
                success: false,
                error: 'TripleStoreService não encontrado'
            };
        }
        
    } catch (error) {
        results.errors.push(error.toString());
    }
    
    return results;
}

// Executar se estiver no navegador
if (typeof window !== 'undefined' && window.KnowledgeConsolidator) {
    console.log('🔍 Executando diagnóstico de extração de triplas...\n');
    
    runDebugInPage().then(results => {
        console.log('📊 RESULTADOS DO DIAGNÓSTICO:\n');
        console.log('1️⃣ Componentes:', results.components);
        console.log('\n2️⃣ Extração:', results.extraction);
        console.log('\n3️⃣ Validação:', results.validation);
        console.log('\n4️⃣ Armazenamento:', results.storage);
        
        if (results.errors.length > 0) {
            console.error('\n❌ Erros encontrados:', results.errors);
        }
        
        // Salvar resultados globalmente para inspeção
        window.debugTripleResults = results;
        console.log('\n💾 Resultados salvos em window.debugTripleResults');
    });
}

// Exportar para uso em Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runDebugInPage };
}