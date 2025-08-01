/**
 * test-manual-triple-extraction.js
 * 
 * Teste manual isolado para validação de extração de triplas
 * com arquivo real fornecido pelo usuário
 * 
 * @date 2025-01-17
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    
    /**
     * Função de teste manual com arquivo real
     * NÃO afeta o sistema em produção - totalmente isolado
     */
    async function testarExtracao(arquivo) {
        console.log('🧪 TESTE MANUAL DE EXTRAÇÃO DE TRIPLAS\n');
        console.log('ℹ️ Este é um teste ISOLADO - não afeta dados em produção\n');
        
        try {
            // Verificar se componentes estão disponíveis
            if (!KC.TripleStoreService) {
                console.error('❌ TripleStoreService não está disponível');
                return;
            }

            // Criar instância isolada do serviço
            console.log('1️⃣ Criando instância isolada do TripleStoreService...');
            // Criar uma nova instância do TripleStoreService
            const TripleStoreService = KC.TripleStoreService.constructor;
            const servicoTeste = new TripleStoreService();
            await servicoTeste.inicializar();
            console.log('✅ Serviço inicializado\n');

            // Preparar arquivo para teste
            console.log('2️⃣ Preparando arquivo para análise...');
            const arquivoTeste = {
                id: `test_manual_${Date.now()}`,
                name: arquivo.name || 'arquivo_teste.txt',
                path: arquivo.path || '/test/manual/',
                content: arquivo.content || '',
                type: arquivo.type || 'text/plain',
                size: arquivo.size || arquivo.content?.length || 0,
                lastModified: arquivo.lastModified || Date.now(),
                categories: arquivo.categories || [],
                relevanceScore: arquivo.relevanceScore || 0,
                analysisType: arquivo.analysisType || null,
                preview: arquivo.preview || arquivo.content?.substring(0, 200)
            };

            console.log('📄 Arquivo preparado:');
            console.log(`  - Nome: ${arquivoTeste.name}`);
            console.log(`  - Tamanho: ${arquivoTeste.size} bytes`);
            console.log(`  - Tipo: ${arquivoTeste.type}`);
            console.log(`  - Preview: ${arquivoTeste.preview?.substring(0, 100)}...`);
            console.log('');

            // Extrair triplas
            console.log('3️⃣ Extraindo triplas do arquivo...');
            const inicio = Date.now();
            const triplas = await servicoTeste.extrairTriplas(arquivoTeste);
            const duracao = Date.now() - inicio;

            console.log(`✅ Extração concluída em ${duracao}ms\n`);

            // Analisar resultados
            console.log('4️⃣ RESULTADOS DA EXTRAÇÃO:');
            console.log(`📊 Total de triplas extraídas: ${triplas.length}\n`);

            // Variáveis para análise
            const porPredicado = {};
            let confiancaMedia = 0;
            let fontes = [];

            if (triplas.length > 0) {
                // Agrupar por tipo de predicado
                triplas.forEach(tripla => {
                    const predicado = tripla.presente.valor;
                    if (!porPredicado[predicado]) {
                        porPredicado[predicado] = [];
                    }
                    porPredicado[predicado].push(tripla);
                });

                console.log('📋 Triplas por tipo de relação:');
                Object.entries(porPredicado).forEach(([predicado, triplasDoTipo]) => {
                    console.log(`\n  🔗 ${predicado} (${triplasDoTipo.length}):`);
                    triplasDoTipo.slice(0, 3).forEach(t => {
                        console.log(`     ${t.legado.valor} → ${t.objetivo.valor}`);
                    });
                    if (triplasDoTipo.length > 3) {
                        console.log(`     ... e mais ${triplasDoTipo.length - 3}`);
                    }
                });

                // Mostrar algumas triplas completas
                console.log('\n📝 Exemplos de triplas completas:');
                triplas.slice(0, 5).forEach((tripla, idx) => {
                    console.log(`\n  Tripla ${idx + 1}:`);
                    console.log(`    Legado: ${tripla.legado.valor}`);
                    console.log(`    Relação: ${tripla.presente.valor}`);
                    console.log(`    Objetivo: ${tripla.objetivo.valor}`);
                    console.log(`    Confiança: ${tripla.metadados.confianca}`);
                    console.log(`    Fonte: ${tripla.metadados.fonte}`);
                });

                // Estatísticas
                console.log('\n📈 Estatísticas:');
                confiancaMedia = triplas.reduce((acc, t) => 
                    acc + (t.metadados.confianca || 0), 0) / triplas.length;
                console.log(`  - Confiança média: ${confiancaMedia.toFixed(2)}`);
                
                fontes = [...new Set(triplas.map(t => t.metadados.fonte))];
                console.log(`  - Fontes de extração: ${fontes.join(', ')}`);
            }

            // Testar geração de insights
            console.log('\n5️⃣ Testando geração de insights...');
            const insights = await servicoTeste.gerarInsights({
                arquivo: arquivoTeste.id
            });

            console.log(`✅ ${insights.length} insights gerados`);
            if (insights.length > 0) {
                console.log('\n💡 Insights encontrados:');
                insights.slice(0, 3).forEach(insight => {
                    console.log(`  - ${insight.titulo}: ${insight.descricao}`);
                });
            }

            // Testar export
            console.log('\n6️⃣ Testando formatos de exportação...');
            
            // Qdrant
            const dadosQdrant = await servicoTeste.exportarParaIntegracao('qdrant');
            console.log(`  ✅ Formato Qdrant: ${dadosQdrant.length} pontos preparados`);
            if (dadosQdrant.length > 0) {
                console.log('     Exemplo:', JSON.stringify(dadosQdrant[0], null, 2).substring(0, 200) + '...');
            }

            // N8N
            const dadosN8N = await servicoTeste.exportarParaIntegracao('n8n');
            console.log(`  ✅ Formato N8N: ${dadosN8N.nodes.length} nós, ${dadosN8N.edges.length} arestas`);

            // Limpar dados de teste
            console.log('\n7️⃣ Limpando dados de teste...');
            servicoTeste.limpar();
            console.log('✅ Dados de teste removidos\n');

            console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
            console.log('ℹ️ Nenhum dado foi salvo no sistema em produção.\n');

            // Retornar resultados para análise
            return {
                sucesso: true,
                arquivo: arquivoTeste.name,
                triplas: triplas.length,
                insights: insights.length,
                duracao: duracao,
                detalhes: {
                    porPredicado,
                    confiancaMedia: confiancaMedia || 0,
                    fontes
                }
            };

        } catch (erro) {
            console.error('❌ ERRO durante o teste:', erro);
            console.error(erro.stack);
            return {
                sucesso: false,
                erro: erro.message
            };
        }
    }

    /**
     * Função auxiliar para criar arquivo de teste a partir de conteúdo
     */
    function criarArquivoTeste(conteudo, nome = 'teste.md', tipo = 'text/markdown') {
        return {
            name: nome,
            content: conteudo,
            type: tipo,
            size: conteudo.length,
            lastModified: Date.now()
        };
    }

    /**
     * Exemplos de uso
     */
    function mostrarExemplos() {
        console.log('📚 EXEMPLOS DE USO:\n');
        
        console.log('1. Com conteúdo direto:');
        console.log(`   const arquivo = criarArquivoTeste('Seu conteúdo aqui...', 'meu-arquivo.md');`);
        console.log(`   testarExtracao(arquivo);\n`);
        
        console.log('2. Com arquivo completo:');
        console.log(`   const arquivo = {
       name: 'projeto.md',
       content: 'Conteúdo do projeto...',
       categories: ['Projetos', 'IA'],
       relevanceScore: 85
   };`);
        console.log(`   testarExtracao(arquivo);\n`);
        
        console.log('3. Teste rápido:');
        console.log(`   testarExtracaoRapida('Este é um teste de Machine Learning com Python');\n`);
    }

    /**
     * Teste rápido com string
     */
    async function testarExtracaoRapida(conteudo) {
        const arquivo = criarArquivoTeste(conteudo, 'teste-rapido.txt', 'text/plain');
        return await testarExtracao(arquivo);
    }

    // Expor funções globalmente
    window.testarExtracao = testarExtracao;
    window.criarArquivoTeste = criarArquivoTeste;
    window.testarExtracaoRapida = testarExtracaoRapida;
    window.mostrarExemplosExtracao = mostrarExemplos;

    // Mensagem de carregamento
    console.log('🧪 Teste manual de extração carregado!');
    console.log('📝 Use: testarExtracao(arquivo) para testar com seu arquivo');
    console.log('💡 Use: mostrarExemplosExtracao() para ver exemplos de uso');

})(window);