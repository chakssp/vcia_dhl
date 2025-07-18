/**
 * test-triple-extraction.js - Teste de Extração de Triplas
 * 
 * Valida a extração de triplas de dados existentes
 * Para executar: Abrir console e chamar testTripleExtraction()
 */

window.testTripleExtraction = async function() {
    console.log('🧪 Iniciando teste de extração de triplas...\n');
    
    const KC = window.KnowledgeConsolidator;
    
    // Verificar se componentes estão disponíveis
    if (!KC.TripleStoreManager || !KC.RelationshipExtractor) {
        console.error('❌ Componentes não encontrados. Certifique-se de que foram carregados.');
        return;
    }
    
    // Inicializar componentes
    const tripleStore = new KC.TripleStoreManager();
    await tripleStore.initialize();
    
    const extractor = new KC.RelationshipExtractor();
    
    // Dados de teste (arquivo exemplo)
    const arquivoTeste = {
        id: 'file_test_001',
        name: 'arquitetura-sistema-v2.md',
        path: '/docs/tech/arquitetura-sistema-v2.md',
        size: 15420,
        extension: '.md',
        type: 'text/markdown',
        lastModified: '2025-01-15T10:30:00Z',
        relevanceScore: 0.85,
        analyzed: true,
        analysisType: 'Breakthrough Técnico',
        categories: ['tech', 'estrategico'],
        preview: `# Arquitetura do Sistema v2
        
        ## Decisão Importante
        Decidimos migrar para uma arquitetura baseada em microserviços
        para melhorar a escalabilidade. Esta é uma evolução da v1.
        
        ### Código de Exemplo
        \`\`\`javascript
        const service = new MicroService({
            name: 'knowledge-processor',
            port: 3000
        });
        \`\`\`
        
        Insight: A modularização permitirá deploy independente.
        Solução: Usar Docker para containerização.
        
        Aprendemos que a arquitetura monolítica estava limitando o crescimento.`,
        
        content: null, // Simulando que só temos preview
        aiAnalysis: {
            entities: [
                { name: 'microserviços', type: 'tecnologia', confidence: 0.9 },
                { name: 'Docker', type: 'ferramenta', confidence: 0.85 }
            ],
            recommendations: [
                { action: 'implementar_ci_cd', priority: 'alta', confidence: 0.8 },
                { action: 'criar_documentacao_api', priority: 'media', confidence: 0.75 }
            ]
        }
    };
    
    console.log('📄 Arquivo de teste:', arquivoTeste.name);
    console.log('━'.repeat(50));
    
    try {
        // 1. Extrair triplas do arquivo
        console.log('\n1️⃣ Extraindo triplas do arquivo...');
        const triplasExtraidas = await extractor.extrairDeArquivo(arquivoTeste);
        console.log(`✅ Extraídas ${triplasExtraidas.length} triplas`);
        
        // Mostrar algumas triplas exemplo
        console.log('\n📊 Exemplos de triplas extraídas:');
        triplasExtraidas.slice(0, 5).forEach((tripla, i) => {
            console.log(`\n${i + 1}. ${tripla.legado.valor} → ${tripla.presente.valor} → ${tripla.objetivo.valor}`);
            console.log(`   Confiança: ${tripla.metadados.confianca}, Fonte: ${tripla.metadados.fonte}`);
        });
        
        // 2. Adicionar triplas ao TripleStore
        console.log('\n2️⃣ Adicionando triplas ao TripleStore...');
        let adicionadas = 0;
        for (const tripla of triplasExtraidas) {
            await tripleStore.adicionarTripla(
                tripla.legado.valor,
                tripla.presente.valor,
                tripla.objetivo.valor,
                tripla.metadados
            );
            adicionadas++;
        }
        console.log(`✅ ${adicionadas} triplas adicionadas ao store`);
        
        // 3. Testar buscas
        console.log('\n3️⃣ Testando buscas no TripleStore...');
        
        // Buscar por arquivo
        const triplasDoArquivo = tripleStore.buscar({ legado: arquivoTeste.id });
        console.log(`\n🔍 Triplas do arquivo: ${triplasDoArquivo.length}`);
        
        // Buscar por categoria
        const triplasCategorias = tripleStore.buscar({ presente: 'pertenceCategoria' });
        console.log(`🔍 Arquivos com categorias: ${triplasCategorias.length}`);
        
        // Buscar por análise
        const triplasAnalise = tripleStore.buscar({ presente: 'foiAnalisadoComo' });
        console.log(`🔍 Arquivos analisados: ${triplasAnalise.length}`);
        
        // Buscar relacionamentos
        console.log('\n4️⃣ Buscando relacionamentos...');
        const relacionados = tripleStore.buscarRelacionadas(arquivoTeste.id);
        console.log(`📎 Como legado: ${relacionados.comoLegado.length} triplas`);
        console.log(`📎 Como objetivo: ${relacionados.comoObjetivo.length} triplas`);
        console.log(`📎 Mencionado em: ${relacionados.mencionada.length} triplas`);
        
        // 5. Estatísticas
        console.log('\n5️⃣ Estatísticas do sistema:');
        const stats = tripleStore.obterEstatisticas();
        console.log(`📈 Total de triplas: ${stats.totalTriplas}`);
        console.log(`📈 Tipos diferentes: ${Object.keys(stats.triplasPorTipo).length}`);
        console.log(`📈 Memória estimada: ${stats.memoriaUsada.toFixed(2)} MB`);
        
        // Estatísticas do extrator
        const statsExtractor = extractor.obterEstatisticas();
        console.log(`\n📊 Estatísticas do Extrator:`);
        console.log(`   Total extraídas: ${statsExtractor.totalExtraidas}`);
        console.log(`   Tempo médio: ${statsExtractor.tempoMedio.toFixed(2)}ms`);
        
        // 6. Demonstrar aprendizado
        console.log('\n6️⃣ Demonstrando aprendizado do sistema...');
        
        // Simular categorização manual
        await tripleStore.adicionarTripla(
            arquivoTeste.id,
            'categorizadoComo',
            'tech',
            {
                fonte: 'curadoria_manual',
                confianca: 1.0,
                usuario: 'teste'
            }
        );
        
        // Sistema deve aprender correlação
        const correlacoes = tripleStore.buscar({ 
            legado: 'Breakthrough Técnico',
            presente: 'correlacionaCom'
        });
        
        if (correlacoes.length > 0) {
            console.log('✅ Sistema aprendeu correlação:');
            correlacoes.forEach(c => {
                console.log(`   ${c.legado.valor} correlaciona com ${c.objetivo.valor}`);
            });
        }
        
        // 7. Testar persistência
        console.log('\n7️⃣ Testando persistência...');
        await tripleStore.saveToStorage();
        console.log('✅ Dados salvos no localStorage');
        
        // Verificar se foi salvo
        const saved = KC.AppState.get('tripleStore');
        if (saved && saved.triplas) {
            console.log(`✅ Confirmado: ${saved.triplas.length} triplas salvas`);
        }
        
        console.log('\n' + '═'.repeat(50));
        console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
        console.log('═'.repeat(50));
        
        // Retornar dados para inspeção
        return {
            tripleStore,
            extractor,
            triplasExtraidas,
            estatisticas: {
                store: stats,
                extractor: statsExtractor
            }
        };
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
        throw error;
    }
};

// Função auxiliar para limpar dados de teste
window.limparTesteTriplas = function() {
    const KC = window.KnowledgeConsolidator;
    if (KC.tripleStore) {
        KC.tripleStore.limpar();
        KC.AppState.remove('tripleStore');
        console.log('✅ Dados de teste limpos');
    }
};

// Instruções
console.log(`
🧪 TESTE DE TRIPLAS SEMÂNTICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para executar o teste:
  testTripleExtraction()

Para limpar dados de teste:
  limparTesteTriplas()

Para inspecionar o TripleStore:
  KC.tripleStore

Para inspecionar o Extrator:
  KC.RelationshipExtractor
`);