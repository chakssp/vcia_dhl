/**
 * Script de Processamento para 39 Arquivos de Homologação
 * 
 * Este script processa os arquivos carregados pelo usuário através do
 * UnifiedConfidenceSystem, gerando scores baseados no Qdrant.
 */

console.log('🚀 PROCESSAMENTO DE ARQUIVOS PARA HOMOLOGAÇÃO\n');
console.log('📅 Data:', new Date().toLocaleString('pt-BR'));
console.log('=' + '='.repeat(60) + '\n');

async function processarArquivosHomologacao() {
    try {
        console.log('📊 FASE 1: ANÁLISE DO ESTADO ATUAL\n');
        
        // 1. Verificar arquivos no AppState
        const files = KC.AppState.get('files') || [];
        console.log(`📁 Total de arquivos encontrados: ${files.length}`);
        
        if (files.length === 0) {
            console.log('❌ Nenhum arquivo encontrado no AppState');
            console.log('💡 Navegando para Etapa 2 onde os arquivos estão...\n');
            
            // Navegar para etapa 2
            KC.AppController.navigateToStep(2);
            
            // Aguardar navegação
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tentar novamente
            const filesStep2 = KC.AppState.get('files') || [];
            console.log(`📁 Arquivos após navegação: ${filesStep2.length}`);
            
            if (filesStep2.length === 0) {
                throw new Error('Arquivos não encontrados mesmo na Etapa 2');
            }
        }
        
        // 2. Verificar UnifiedConfidenceSystem
        console.log('\n🔧 FASE 2: VERIFICAÇÃO DO SISTEMA\n');
        
        const systemCheck = {
            controller: !!KC.UnifiedConfidenceControllerInstance,
            bridge: !!KC.QdrantScoreBridgeInstance,
            normalizer: !!KC.ScoreNormalizerInstance,
            flags: KC.FeatureFlagManagerInstance?.isEnabled('unified_confidence_system')
        };
        
        console.log('Sistema de Confiança Unificado:');
        Object.entries(systemCheck).forEach(([key, value]) => {
            console.log(`  • ${key}: ${value ? '✅' : '❌'}`);
        });
        
        if (!systemCheck.controller || !systemCheck.bridge) {
            throw new Error('Sistema não inicializado corretamente');
        }
        
        // 3. Verificar conexão com Qdrant
        console.log('\n🔌 FASE 3: CONEXÃO QDRANT\n');
        
        const qdrantConnected = await KC.QdrantService.checkConnection();
        if (!qdrantConnected) {
            throw new Error('Qdrant não está acessível');
        }
        
        const stats = await KC.QdrantService.getCollectionStats();
        console.log('Estatísticas do Qdrant:');
        console.log(`  • Pontos: ${stats.pointsCount}`);
        console.log(`  • Status: ${stats.status}`);
        
        // 4. Inicializar QdrantScoreBridge se necessário
        if (!KC.QdrantScoreBridgeInstance.initialized) {
            console.log('\n🔄 Inicializando QdrantScoreBridge...');
            await KC.QdrantScoreBridgeInstance.initialize();
            console.log('✅ Bridge inicializado');
        }
        
        // 5. Processar arquivos
        console.log('\n🎯 FASE 4: PROCESSAMENTO DE CONFIANÇA\n');
        
        const updatedFiles = [];
        const results = {
            success: 0,
            failed: 0,
            scores: []
        };
        
        // Recarregar arquivos após navegação
        const filesToProcess = KC.AppState.get('files') || [];
        console.log(`📄 Processando ${filesToProcess.length} arquivos...\n`);
        
        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            
            try {
                // Obter confiança através do sistema unificado
                const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
                
                // Atualizar arquivo com scores
                const updatedFile = {
                    ...file,
                    confidence: confidence.confidence,
                    confidenceSource: confidence.source,
                    confidenceMetadata: confidence.metadata,
                    qdrantScore: confidence.rawScore
                };
                
                updatedFiles.push(updatedFile);
                results.success++;
                results.scores.push(confidence.confidence);
                
                // Log para cada 5 arquivos
                if ((i + 1) % 5 === 0 || i === filesToProcess.length - 1) {
                    console.log(`✅ Processados: ${i + 1}/${filesToProcess.length}`);
                }
                
            } catch (error) {
                console.error(`❌ Erro no arquivo ${file.name}:`, error.message);
                updatedFiles.push(file); // Manter arquivo original
                results.failed++;
            }
        }
        
        // 6. Salvar arquivos atualizados
        console.log('\n💾 FASE 5: SALVANDO RESULTADOS\n');
        
        KC.AppState.set('files', updatedFiles);
        
        // Emitir eventos para atualizar UI
        KC.EventBus.emit(KC.Events.STATE_CHANGED, {
            key: 'files',
            newValue: updatedFiles,
            oldValue: filesToProcess
        });
        
        KC.EventBus.emit(KC.Events.FILES_UPDATED, {
            action: 'confidence_processing_complete',
            count: updatedFiles.length
        });
        
        // 7. Estatísticas finais
        console.log('=' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL\n');
        
        console.log(`✅ Arquivos processados com sucesso: ${results.success}`);
        console.log(`❌ Arquivos com erro: ${results.failed}`);
        
        if (results.scores.length > 0) {
            const avgScore = results.scores.reduce((a, b) => a + b, 0) / results.scores.length;
            const minScore = Math.min(...results.scores);
            const maxScore = Math.max(...results.scores);
            
            console.log(`\n📈 Estatísticas de Confiança:`);
            console.log(`  • Média: ${avgScore.toFixed(1)}%`);
            console.log(`  • Mínimo: ${minScore}%`);
            console.log(`  • Máximo: ${maxScore}%`);
            
            // Distribuição
            const distribution = {
                '0-25%': results.scores.filter(s => s <= 25).length,
                '26-50%': results.scores.filter(s => s > 25 && s <= 50).length,
                '51-75%': results.scores.filter(s => s > 50 && s <= 75).length,
                '76-100%': results.scores.filter(s => s > 75).length
            };
            
            console.log(`\n📊 Distribuição:`);
            Object.entries(distribution).forEach(([range, count]) => {
                const percent = (count / results.scores.length * 100).toFixed(1);
                console.log(`  • ${range}: ${count} arquivos (${percent}%)`);
            });
        }
        
        // 8. Forçar atualização da UI
        console.log('\n🔄 Atualizando interface...');
        
        // Se FileRenderer estiver disponível, renderizar arquivos
        if (KC.FileRenderer && typeof KC.FileRenderer.renderFiles === 'function') {
            KC.FileRenderer.renderFiles(updatedFiles);
            console.log('✅ Interface atualizada');
        }
        
        // Salvar resultado no localStorage
        const processResult = {
            timestamp: new Date().toISOString(),
            filesProcessed: results.success,
            filesFailed: results.failed,
            averageScore: results.scores.length > 0 ? 
                (results.scores.reduce((a, b) => a + b, 0) / results.scores.length).toFixed(1) : 0,
            scores: results.scores
        };
        
        localStorage.setItem('homologation-process-result', JSON.stringify(processResult));
        console.log('\n💾 Resultado salvo em localStorage');
        console.log('   Use: JSON.parse(localStorage.getItem("homologation-process-result"))');
        
        return processResult;
        
    } catch (error) {
        console.error('\n❌ Erro no processamento:', error);
        throw error;
    }
}

// Verificar se deve executar automaticamente
console.log('🔍 Verificando ambiente...\n');

if (KC.UnifiedConfidenceControllerInstance && KC.QdrantScoreBridgeInstance) {
    console.log('✅ Sistema pronto para processamento\n');
    console.log('💡 Execute: processarArquivosHomologacao()');
    console.log('   ou navegue para Etapa 2 e execute novamente\n');
} else {
    console.error('❌ Sistema não está pronto');
    console.error('   Verifique se todos os componentes foram carregados');
}

// Expor função globalmente
window.processarArquivosHomologacao = processarArquivosHomologacao;