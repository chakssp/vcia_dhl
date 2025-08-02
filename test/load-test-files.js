/**
 * Script de Carga de Arquivos de Teste
 * 
 * Simula o fluxo completo do Knowledge Consolidator com arquivos reais
 * para validar o UnifiedConfidenceSystem
 */

console.log('📂 Iniciando carga de arquivos de teste...\n');

// Criar arquivos de teste que simulam descoberta real
const testFiles = [
    {
        id: 'projeto-ai-insights.md',
        name: 'projeto-ai-insights.md',
        path: '/documentos/projetos/projeto-ai-insights.md',
        content: `# Insights do Projeto AI

## Breakthrough Técnico
Descobrimos que usar embeddings com 768 dimensões melhorou a precisão em 45%.
Esta descoberta foi fundamental para o sucesso do projeto.

## Decisões Estratégicas
- Migração para arquitetura serverless
- Adoção de Qdrant como vector database
- Implementação de cache distribuído

## Lições Aprendidas
O uso de semantic search transformou completamente nossa abordagem...`,
        size: 2048,
        lastModified: new Date('2025-07-15'),
        categories: ['AI/ML', 'insights', 'breakthrough']
    },
    {
        id: 'meeting-notes-2025-07.md',
        name: 'meeting-notes-2025-07.md',
        path: '/documentos/reunioes/meeting-notes-2025-07.md',
        content: `# Notas da Reunião - Julho 2025

## Decisão: Nova Arquitetura
Decidimos migrar para microserviços para melhor escalabilidade.

## Pontos de Ação
1. Implementar UnifiedConfidenceSystem
2. Integrar com Qdrant
3. Criar pipeline de ML

## Insights da Equipe
A equipe identificou que precisamos focar em semantic search...`,
        size: 1536,
        lastModified: new Date('2025-07-20'),
        categories: ['reuniões', 'decisões']
    },
    {
        id: 'research-embeddings.txt',
        name: 'research-embeddings.txt',
        path: '/documentos/pesquisa/research-embeddings.txt',
        content: `Pesquisa sobre Embeddings e Vector Databases

Descoberta importante: Ollama com nomic-embed-text oferece melhor custo-benefício.
Performance: 768 dimensões são suficientes para nosso caso de uso.

Experimentos realizados:
- Teste com 384 dims: precisão 72%
- Teste com 768 dims: precisão 89%
- Teste com 1536 dims: precisão 91% (mas 3x mais lento)

Conclusão: 768 é o sweet spot.`,
        size: 1024,
        lastModified: new Date('2025-07-10'),
        categories: ['pesquisa', 'ML', 'embeddings']
    },
    {
        id: 'strategy-doc-q3.md',
        name: 'strategy-doc-q3.md',
        path: '/documentos/estrategia/strategy-doc-q3.md',
        content: `# Estratégia Q3 2025

## Visão
Transformar conhecimento disperso em insights acionáveis.

## Objetivos Principais
1. Implementar sistema de confiança unificado
2. Melhorar precisão de busca semântica em 50%
3. Reduzir tempo de descoberta de insights

## Métricas de Sucesso
- 85% dos arquivos com score > 0%
- Tempo médio de análise < 100ms
- Satisfação do usuário > 90%`,
        size: 1280,
        lastModified: new Date('2025-07-01'),
        categories: ['estratégia', 'planejamento', 'KPIs']
    },
    {
        id: 'code-review-notes.md',
        name: 'code-review-notes.md',
        path: '/documentos/desenvolvimento/code-review-notes.md',
        content: `# Code Review - UnifiedConfidenceSystem

## Pontos Positivos
- Arquitetura modular bem estruturada
- Performance excelente (<50ms por operação)
- Boa cobertura de testes

## Melhorias Sugeridas
- Adicionar mais logs para debugging
- Implementar retry logic no QdrantService
- Melhorar documentação das APIs

## Decisão Final
Aprovado para produção com as melhorias sugeridas.`,
        size: 896,
        lastModified: new Date('2025-07-25'),
        categories: ['desenvolvimento', 'code-review']
    }
];

// Função para carregar arquivos no sistema
async function loadTestFiles() {
    console.log(`📋 Carregando ${testFiles.length} arquivos de teste...\n`);
    
    try {
        // 1. Limpar estado anterior
        KC.AppState.set('files', []);
        KC.AppState.set('stats', {
            totalFiles: 0,
            totalSize: 0,
            avgRelevance: 0,
            categories: {}
        });
        
        // 2. Adicionar arquivos ao AppState
        KC.AppState.set('files', testFiles);
        
        // 3. Calcular estatísticas
        const stats = {
            totalFiles: testFiles.length,
            totalSize: testFiles.reduce((sum, f) => sum + f.size, 0),
            avgRelevance: 0,
            categories: {}
        };
        
        // Contar categorias
        testFiles.forEach(file => {
            file.categories.forEach(cat => {
                stats.categories[cat] = (stats.categories[cat] || 0) + 1;
            });
        });
        
        KC.AppState.set('stats', stats);
        
        // 4. Processar confiança para cada arquivo
        console.log('🔄 Processando scores de confiança...\n');
        
        const results = [];
        for (const file of testFiles) {
            const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
            
            // Atualizar arquivo com score de confiança
            file.confidenceScore = confidence.confidence;
            file.confidenceSource = confidence.source;
            file.confidenceDetails = confidence.details;
            
            results.push({
                file: file.name,
                confidence: confidence.confidence,
                source: confidence.source,
                categories: file.categories.length,
                hasQdrantMatch: confidence.source === 'qdrant'
            });
            
            console.log(`📄 ${file.name}:`);
            console.log(`   🎯 Confiança: ${confidence.confidence}%`);
            console.log(`   📊 Fonte: ${confidence.source}`);
            console.log(`   🏷️ Categorias: ${file.categories.join(', ')}`);
            console.log('');
        }
        
        // 5. Atualizar AppState com arquivos processados
        KC.AppState.set('files', testFiles);
        
        // 6. Emitir eventos
        KC.EventBus.emit(KC.Events.FILES_UPDATED, {
            action: 'load_test_files',
            count: testFiles.length
        });
        
        // 7. Relatório final
        console.log('=' * 60);
        console.log('📊 RELATÓRIO DE CARGA\n');
        console.log(`Total de arquivos: ${results.length}`);
        console.log(`Arquivos com match no Qdrant: ${results.filter(r => r.hasQdrantMatch).length}`);
        console.log(`Score médio de confiança: ${(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(1)}%`);
        console.log(`Total de categorias únicas: ${Object.keys(stats.categories).length}`);
        
        // 8. Salvar resultados
        localStorage.setItem('test-files-loaded', JSON.stringify({
            timestamp: new Date().toISOString(),
            files: testFiles,
            results: results,
            stats: stats
        }));
        
        console.log('\n✅ Carga concluída! Arquivos disponíveis no AppState.');
        console.log('💡 Use KC.AppState.get("files") para ver os arquivos carregados.');
        
        return results;
        
    } catch (error) {
        console.error('❌ Erro na carga:', error);
        return null;
    }
}

// Executar carga
loadTestFiles().then(results => {
    if (results) {
        console.log('\n🎉 Sucesso! Sistema pronto para uso com dados de teste.');
        
        // Verificar se a UI deve ser atualizada
        if (typeof KC.FileRenderer !== 'undefined' && KC.FileRenderer.renderFiles) {
            console.log('🔄 Atualizando interface...');
            KC.FileRenderer.renderFiles(KC.AppState.get('files'));
        }
    }
});