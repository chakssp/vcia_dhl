/**
 * 📋 SCRIPT DE VALIDAÇÃO: Enriquecimento com Embeddings
 * Teste Controlado: docs/sprint/1.1
 * Data: 10/08/2025
 * 
 * Este script documenta e valida o teste de enriquecimento
 * com embeddings usando arquivos da pasta docs/sprint/1.1
 */

console.log('=' .repeat(70));
console.log('🧪 VALIDAÇÃO DE EMBEDDINGS - TESTE CONTROLADO');
console.log('=' .repeat(70));
console.log('');
console.log('📁 Pasta de Teste: docs/sprint/1.1');
console.log('📅 Data do Teste: ' + new Date().toLocaleString('pt-BR'));
console.log('👤 Stakeholder: Brito');
console.log('');

// Função para capturar estado ANTES do teste
async function captureInitialState() {
    console.log('📊 ESTADO INICIAL DO SISTEMA');
    console.log('-'.repeat(40));
    
    const state = {
        timestamp: new Date().toISOString(),
        files: {
            total: 0,
            fromSprint11: 0,
            list: []
        },
        services: {
            qdrant: false,
            ollama: false,
            embedding: false
        },
        qdrantStats: null
    };
    
    // 1. Verificar arquivos carregados
    if (typeof KC !== 'undefined' && KC.AppState) {
        const allFiles = KC.AppState.get('files') || [];
        state.files.total = allFiles.length;
        
        // Filtrar arquivos de docs/sprint/1.1
        const sprint11Files = allFiles.filter(f => 
            f.path?.includes('docs/sprint/1.1') || 
            f.path?.includes('docs\\sprint\\1.1')
        );
        
        state.files.fromSprint11 = sprint11Files.length;
        state.files.list = sprint11Files.map(f => ({
            fileName: f.fileName,
            size: f.size,
            relevanceScore: f.relevanceScore || 0,
            category: f.category || f.categories?.[0] || 'N/A'
        }));
        
        console.log(`✅ Arquivos totais: ${state.files.total}`);
        console.log(`📁 Arquivos de sprint/1.1: ${state.files.fromSprint11}`);
        
        if (sprint11Files.length > 0) {
            console.log('\nArquivos encontrados:');
            sprint11Files.forEach((f, idx) => {
                console.log(`  ${idx + 1}. ${f.fileName}`);
                console.log(`     - Tamanho: ${f.size} bytes`);
                console.log(`     - Relevância: ${(f.relevanceScore * 100).toFixed(0)}%`);
                console.log(`     - Categoria: ${f.category || 'N/A'}`);
            });
        }
    }
    
    // 2. Verificar serviços
    console.log('\n🔌 ESTADO DOS SERVIÇOS:');
    
    if (KC?.QdrantService) {
        state.services.qdrant = await KC.QdrantService.checkConnection();
        console.log(`  Qdrant: ${state.services.qdrant ? '✅ Conectado' : '❌ Desconectado'}`);
        
        if (state.services.qdrant) {
            try {
                state.qdrantStats = await KC.QdrantService.getCollectionStats();
                console.log(`  - Points no Qdrant: ${state.qdrantStats.pointsCount || 0}`);
            } catch (e) {
                console.log('  - Erro ao obter stats do Qdrant');
            }
        }
    }
    
    if (KC?.EmbeddingService) {
        state.services.ollama = await KC.EmbeddingService.checkOllamaAvailability();
        console.log(`  Ollama: ${state.services.ollama ? '✅ Disponível' : '❌ Indisponível'}`);
        state.services.embedding = state.services.ollama;
    }
    
    console.log('');
    return state;
}

// Função para executar teste de enriquecimento
async function runEnrichmentTest(files) {
    console.log('🚀 INICIANDO TESTE DE ENRIQUECIMENTO');
    console.log('-'.repeat(40));
    
    const results = {
        startTime: Date.now(),
        endTime: null,
        totalFiles: files.length,
        successful: 0,
        failed: 0,
        errors: [],
        enrichedDocs: [],
        metrics: {
            avgProcessingTime: 0,
            avgConvergenceScore: 0,
            avgVectorDimensions: 0,
            semanticClusters: new Set(),
            relatedConcepts: new Set()
        }
    };
    
    console.log(`📦 Processando ${files.length} arquivo(s)...\n`);
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[${i + 1}/${files.length}] Processando: ${file.fileName}`);
        
        const fileStartTime = Date.now();
        
        try {
            // Enriquecer arquivo
            const enrichedDoc = await KC.QdrantService.enrichWithEmbeddings(file);
            
            // Validar estrutura
            console.assert(enrichedDoc.id, '  ✓ ID gerado');
            console.assert(enrichedDoc.vector?.length === 768, '  ✓ Vector 768D');
            console.assert(enrichedDoc.payload, '  ✓ Payload presente');
            
            // Coletar métricas
            const convergence = enrichedDoc.payload.convergence;
            results.metrics.avgConvergenceScore += convergence.totalScore;
            
            // Adicionar clusters e conceitos únicos
            convergence.semanticClusters?.forEach(c => results.metrics.semanticClusters.add(c));
            convergence.relatedConcepts?.forEach(c => results.metrics.relatedConcepts.add(c));
            
            // Inserir no Qdrant
            const insertResult = await KC.QdrantService.upsertPoints([enrichedDoc]);
            
            if (insertResult.success) {
                results.successful++;
                results.enrichedDocs.push({
                    fileName: file.fileName,
                    convergenceScore: convergence.totalScore,
                    dimensions: convergence.dimensions,
                    processingTime: Date.now() - fileStartTime
                });
                
                console.log(`  ✅ Sucesso! Convergência: ${(convergence.totalScore * 100).toFixed(1)}%`);
                console.log(`  - Temporal: ${(convergence.dimensions.temporal * 100).toFixed(0)}%`);
                console.log(`  - Categoria: ${(convergence.dimensions.category * 100).toFixed(0)}%`);
                console.log(`  - Importância: ${(convergence.dimensions.importance * 100).toFixed(0)}%`);
                console.log(`  - Clusters: [${convergence.semanticClusters.join(', ')}]`);
                console.log(`  - Tempo: ${Date.now() - fileStartTime}ms\n`);
            } else {
                throw new Error('Falha ao inserir no Qdrant');
            }
            
        } catch (error) {
            results.failed++;
            results.errors.push({
                file: file.fileName,
                error: error.message
            });
            console.log(`  ❌ Erro: ${error.message}\n`);
        }
    }
    
    // Calcular métricas finais
    results.endTime = Date.now();
    results.metrics.avgConvergenceScore /= results.successful || 1;
    results.metrics.avgProcessingTime = (results.endTime - results.startTime) / files.length;
    
    return results;
}

// Função para capturar estado DEPOIS do teste
async function captureFinalState(initialState) {
    console.log('📊 ESTADO FINAL DO SISTEMA');
    console.log('-'.repeat(40));
    
    const finalState = {
        timestamp: new Date().toISOString(),
        qdrantStats: null,
        changes: {}
    };
    
    // Verificar mudanças no Qdrant
    if (KC?.QdrantService) {
        try {
            finalState.qdrantStats = await KC.QdrantService.getCollectionStats();
            
            const initialPoints = initialState.qdrantStats?.pointsCount || 0;
            const finalPoints = finalState.qdrantStats.pointsCount || 0;
            
            finalState.changes.pointsAdded = finalPoints - initialPoints;
            
            console.log(`📈 Points no Qdrant:`);
            console.log(`  - Antes: ${initialPoints}`);
            console.log(`  - Depois: ${finalPoints}`);
            console.log(`  - Adicionados: ${finalState.changes.pointsAdded}`);
        } catch (e) {
            console.log('❌ Erro ao obter stats finais do Qdrant');
        }
    }
    
    console.log('');
    return finalState;
}

// Função para gerar relatório final
function generateReport(initialState, testResults, finalState) {
    console.log('=' .repeat(70));
    console.log('📋 RELATÓRIO FINAL DE VALIDAÇÃO');
    console.log('=' .repeat(70));
    console.log('');
    
    const report = {
        testId: `EMB-TEST-${Date.now()}`,
        timestamp: new Date().toISOString(),
        folder: 'docs/sprint/1.1',
        summary: {
            filesProcessed: testResults.totalFiles,
            successful: testResults.successful,
            failed: testResults.failed,
            successRate: ((testResults.successful / testResults.totalFiles) * 100).toFixed(1) + '%',
            totalTime: ((testResults.endTime - testResults.startTime) / 1000).toFixed(2) + 's',
            avgTimePerFile: (testResults.metrics.avgProcessingTime / 1000).toFixed(2) + 's'
        },
        convergenceMetrics: {
            avgScore: (testResults.metrics.avgConvergenceScore * 100).toFixed(1) + '%',
            uniqueClusters: Array.from(testResults.metrics.semanticClusters),
            uniqueConcepts: Array.from(testResults.metrics.relatedConcepts)
        },
        qdrantImpact: {
            pointsBefore: initialState.qdrantStats?.pointsCount || 0,
            pointsAfter: finalState.qdrantStats?.pointsCount || 0,
            pointsAdded: finalState.changes?.pointsAdded || 0
        },
        errors: testResults.errors
    };
    
    console.log('📊 RESUMO DO TESTE:');
    console.log(`  ID do Teste: ${report.testId}`);
    console.log(`  Pasta: ${report.folder}`);
    console.log('');
    
    console.log('✅ RESULTADOS:');
    console.log(`  - Arquivos processados: ${report.summary.filesProcessed}`);
    console.log(`  - Sucesso: ${report.summary.successful}`);
    console.log(`  - Falhas: ${report.summary.failed}`);
    console.log(`  - Taxa de sucesso: ${report.summary.successRate}`);
    console.log('');
    
    console.log('⏱️ PERFORMANCE:');
    console.log(`  - Tempo total: ${report.summary.totalTime}`);
    console.log(`  - Média por arquivo: ${report.summary.avgTimePerFile}`);
    console.log('');
    
    console.log('🎯 CONVERGÊNCIA:');
    console.log(`  - Score médio: ${report.convergenceMetrics.avgScore}`);
    console.log(`  - Clusters identificados: ${report.convergenceMetrics.uniqueClusters.length}`);
    console.log(`    [${report.convergenceMetrics.uniqueClusters.join(', ')}]`);
    console.log(`  - Conceitos extraídos: ${report.convergenceMetrics.uniqueConcepts.length}`);
    console.log(`    [${report.convergenceMetrics.uniqueConcepts.join(', ')}]`);
    console.log('');
    
    console.log('💾 IMPACTO NO QDRANT:');
    console.log(`  - Points antes: ${report.qdrantImpact.pointsBefore}`);
    console.log(`  - Points depois: ${report.qdrantImpact.pointsAfter}`);
    console.log(`  - Points adicionados: ${report.qdrantImpact.pointsAdded}`);
    
    if (report.errors.length > 0) {
        console.log('\n⚠️ ERROS ENCONTRADOS:');
        report.errors.forEach((err, idx) => {
            console.log(`  ${idx + 1}. ${err.file}: ${err.error}`);
        });
    }
    
    // Salvar relatório em JSON
    localStorage.setItem(report.testId, JSON.stringify(report));
    console.log(`\n💾 Relatório salvo em localStorage com ID: ${report.testId}`);
    
    return report;
}

// Função principal de validação
async function validateEmbeddingsEnrichment() {
    try {
        console.log('🔄 Iniciando validação completa...\n');
        
        // 1. Capturar estado inicial
        const initialState = await captureInitialState();
        
        if (initialState.files.fromSprint11 === 0) {
            console.log('⚠️ ATENÇÃO: Nenhum arquivo de docs/sprint/1.1 encontrado!');
            console.log('Por favor, faça a descoberta de arquivos primeiro.');
            return null;
        }
        
        // 2. Confirmar com usuário
        console.log('\n⚠️ CONFIRME O TESTE:');
        console.log(`Serão processados ${initialState.files.fromSprint11} arquivo(s) de docs/sprint/1.1`);
        console.log('Execute: continueValidation() para prosseguir');
        
        // Guardar estado para continuação
        window._validationState = {
            initial: initialState,
            files: initialState.files.list
        };
        
    } catch (error) {
        console.error('❌ Erro na validação:', error);
    }
}

// Função para continuar após confirmação
async function continueValidation() {
    if (!window._validationState) {
        console.log('❌ Nenhuma validação em andamento. Execute validateEmbeddingsEnrichment() primeiro.');
        return;
    }
    
    const { initial, files } = window._validationState;
    
    // 3. Executar teste
    const allFiles = KC.AppState.get('files') || [];
    const sprint11Files = allFiles.filter(f => 
        f.path?.includes('docs/sprint/1.1') || 
        f.path?.includes('docs\\sprint\\1.1')
    );
    
    const testResults = await runEnrichmentTest(sprint11Files);
    
    // 4. Capturar estado final
    const finalState = await captureFinalState(initial);
    
    // 5. Gerar relatório
    const report = generateReport(initial, testResults, finalState);
    
    // Limpar estado temporário
    delete window._validationState;
    
    console.log('\n✅ VALIDAÇÃO CONCLUÍDA!');
    console.log('Use getValidationReport("' + report.testId + '") para recuperar o relatório.');
    
    return report;
}

// Função para recuperar relatório
function getValidationReport(testId) {
    const report = localStorage.getItem(testId);
    if (report) {
        return JSON.parse(report);
    }
    console.log('❌ Relatório não encontrado. IDs disponíveis:');
    Object.keys(localStorage).filter(k => k.startsWith('EMB-TEST-')).forEach(k => {
        console.log(`  - ${k}`);
    });
    return null;
}

// Exportar funções
window.validateEmbeddings = validateEmbeddingsEnrichment;
window.continueValidation = continueValidation;
window.getValidationReport = getValidationReport;

// Instruções
console.log('📌 INSTRUÇÕES DE USO:');
console.log('');
console.log('1. Execute: validateEmbeddings()');
console.log('   Isso irá analisar os arquivos de docs/sprint/1.1');
console.log('');
console.log('2. Confirme com: continueValidation()');
console.log('   Isso iniciará o processamento com embeddings');
console.log('');
console.log('3. Recupere relatórios com: getValidationReport("EMB-TEST-xxx")');
console.log('');
console.log('PRONTO PARA VALIDAÇÃO!');