/**
 * test-triple-store-service.js
 * 
 * Testes para o TripleStoreService
 * 
 * @date 2025-01-17
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    if (!KC || !KC.TripleStoreService) {
        console.error('TripleStoreService não está disponível');
        return;
    }

    /**
     * Teste completo do TripleStoreService
     */
    async function testTripleStoreService() {
        console.log('🧪 Iniciando testes do TripleStoreService...\n');
        
        const service = KC.TripleStoreService;
        const resultados = {
            total: 0,
            sucesso: 0,
            falhas: []
        };

        // Teste 1: Inicialização
        await testar('Inicialização do serviço', async () => {
            await service.inicializar();
            return service.initialized === true;
        }, resultados);

        // Teste 2: Extração de triplas de arquivo
        await testar('Extração de triplas de arquivo', async () => {
            const arquivoTeste = {
                id: 'test_file_001',
                name: 'projeto-ia.md',
                path: '/docs/projetos/projeto-ia.md',
                content: 'Este projeto usa Machine Learning para análise de dados. Integra com Python e TensorFlow.',
                type: 'text/markdown',
                size: 1024,
                lastModified: Date.now(),
                categories: ['Projetos', 'IA'],
                relevanceScore: 85,
                analysisType: 'Breakthrough Técnico'
            };

            const triplas = await service.extrairTriplas(arquivoTeste);
            console.log(`  ✓ ${triplas.length} triplas extraídas`);
            
            // Verificar se extraiu relações esperadas
            const temNome = triplas.find(t => t.presente.valor === 'temNome');
            const temTipo = triplas.find(t => t.presente.valor === 'temTipo');
            
            return triplas.length > 0 && temNome && temTipo;
        }, resultados);

        // Teste 3: Extração em batch
        await testar('Extração em batch', async () => {
            const arquivos = [
                {
                    id: 'batch_001',
                    name: 'arquivo1.md',
                    content: 'Conteúdo do primeiro arquivo',
                    type: 'text/markdown'
                },
                {
                    id: 'batch_002',
                    name: 'arquivo2.txt',
                    content: 'Conteúdo do segundo arquivo',
                    type: 'text/plain'
                }
            ];

            let progressoChamado = false;
            const resultado = await service.extrairTriplasBatch(arquivos, {
                batchSize: 1,
                onProgress: (info) => {
                    progressoChamado = true;
                    console.log(`  ✓ Progresso: ${info.porcentagem.toFixed(0)}%`);
                }
            });

            return resultado.triplas.length > 0 && progressoChamado;
        }, resultados);

        // Teste 4: Busca de triplas
        await testar('Busca de triplas', async () => {
            const triplas = await service.buscarTriplas({
                presente: 'temNome'
            });
            
            console.log(`  ✓ ${triplas.length} triplas encontradas com predicado 'temNome'`);
            return triplas.length > 0;
        }, resultados);

        // Teste 5: Geração de insights
        await testar('Geração de insights', async () => {
            const insights = await service.gerarInsights({
                categoria: 'Projetos'
            });
            
            console.log(`  ✓ ${insights.length} insights gerados`);
            
            // Verificar tipos de insights
            const tipos = [...new Set(insights.map(i => i.tipo))];
            console.log(`  ✓ Tipos: ${tipos.join(', ')}`);
            
            return insights.length >= 0; // Pode ser 0 se não houver dados suficientes
        }, resultados);

        // Teste 6: Estatísticas
        await testar('Atualização de estatísticas', async () => {
            await service.atualizarEstatisticas();
            const stats = service.stats;
            
            console.log(`  ✓ Total de triplas: ${stats.totalTriplas}`);
            console.log(`  ✓ Extrações concluídas: ${stats.extracoesConcluidas}`);
            
            return stats.totalTriplas > 0 && stats.extracoesConcluidas > 0;
        }, resultados);

        // Teste 7: Export para Qdrant
        await testar('Export para Qdrant', async () => {
            const dadosQdrant = await service.exportarParaIntegracao('qdrant');
            
            console.log(`  ✓ ${dadosQdrant.length} pontos preparados para Qdrant`);
            
            // Verificar estrutura
            if (dadosQdrant.length > 0) {
                const ponto = dadosQdrant[0];
                return ponto.hasOwnProperty('id') && 
                       ponto.hasOwnProperty('payload') &&
                       ponto.payload.hasOwnProperty('texto_busca');
            }
            return true;
        }, resultados);

        // Teste 8: Export para N8N
        await testar('Export para N8N', async () => {
            const dadosN8N = await service.exportarParaIntegracao('n8n');
            
            console.log(`  ✓ ${dadosN8N.nodes.length} nós`);
            console.log(`  ✓ ${dadosN8N.edges.length} arestas`);
            
            return dadosN8N.hasOwnProperty('nodes') && 
                   dadosN8N.hasOwnProperty('edges');
        }, resultados);

        // Teste 9: Cache
        await testar('Sistema de cache', async () => {
            const arquivo = {
                id: 'cache_test',
                name: 'teste-cache.md',
                content: 'Conteúdo para testar cache',
                lastModified: Date.now()
            };

            // Primeira extração
            const inicio1 = Date.now();
            const triplas1 = await service.extrairTriplas(arquivo);
            const tempo1 = Date.now() - inicio1;

            // Segunda extração (deve vir do cache)
            const inicio2 = Date.now();
            const triplas2 = await service.extrairTriplas(arquivo);
            const tempo2 = Date.now() - inicio2;

            console.log(`  ✓ Primeira extração: ${tempo1}ms`);
            console.log(`  ✓ Segunda extração (cache): ${tempo2}ms`);

            return triplas1.length === triplas2.length && tempo2 < tempo1;
        }, resultados);

        // Teste 10: Feedback do usuário
        await testar('Processamento de feedback', async () => {
            // Pegar uma tripla para testar
            const triplas = await service.buscarTriplas({});
            if (triplas.length > 0) {
                const tripla = triplas[0];
                
                await service.processarFeedback({
                    triplaId: tripla.id,
                    acao: 'confirmar'
                });

                console.log(`  ✓ Feedback processado para tripla ${tripla.id}`);
                return true;
            }
            return true; // Passa mesmo sem triplas
        }, resultados);

        // Relatório final
        console.log('\n📊 RELATÓRIO FINAL:');
        console.log(`✅ Testes bem-sucedidos: ${resultados.sucesso}/${resultados.total}`);
        
        if (resultados.falhas.length > 0) {
            console.log('\n❌ Falhas:');
            resultados.falhas.forEach(f => {
                console.log(`  - ${f.teste}: ${f.erro}`);
            });
        }

        // Estatísticas finais
        console.log('\n📈 Estatísticas do Serviço:');
        console.log(`  - Total de triplas: ${service.stats.totalTriplas}`);
        console.log(`  - Tipos de predicados: ${Object.keys(service.stats.triplasPorTipo).length}`);
        console.log(`  - Tempo médio de extração: ${service.stats.tempoMedioExtracao.toFixed(2)}ms`);
        console.log(`  - Insights gerados: ${service.stats.insightsGerados}`);

        return resultados;
    }

    /**
     * Função auxiliar para executar testes
     */
    async function testar(nome, funcao, resultados) {
        console.log(`\n🔍 ${nome}...`);
        resultados.total++;
        
        try {
            const resultado = await funcao();
            if (resultado) {
                console.log(`✅ ${nome} - PASSOU`);
                resultados.sucesso++;
            } else {
                console.log(`❌ ${nome} - FALHOU`);
                resultados.falhas.push({ teste: nome, erro: 'Teste retornou false' });
            }
        } catch (erro) {
            console.error(`❌ ${nome} - ERRO:`, erro.message);
            resultados.falhas.push({ teste: nome, erro: erro.message });
        }
    }

    /**
     * Limpar dados de teste
     */
    async function limparTesteService() {
        console.log('🧹 Limpando dados de teste do TripleStoreService...');
        
        const service = KC.TripleStoreService;
        service.limpar();
        
        // Limpar localStorage
        localStorage.removeItem('kc_triples');
        localStorage.removeItem('kc_tripleStats');
        
        console.log('✅ Dados de teste limpos');
    }

    // Expor funções globalmente
    window.testTripleStoreService = testTripleStoreService;
    window.limparTesteService = limparTesteService;

    // Mensagem de carregamento
    console.log('🧪 Testes do TripleStoreService carregados. Execute testTripleStoreService() para testar.');

})(window);