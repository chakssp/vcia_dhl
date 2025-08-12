// EXECUTAR AGORA - PROCESSAMENTO DIRETO DOS 39 ARQUIVOS

console.log('🚀 PROCESSANDO 39 ARQUIVOS AGORA!\n');

// Navegar para Etapa 2 onde estão os arquivos
KC.AppController.navigateToStep(2);

// Aguardar navegação e processar
setTimeout(async () => {
    const files = KC.AppState.get('files') || [];
    console.log(`📁 ${files.length} arquivos encontrados\n`);
    
    if (files.length === 0) {
        console.error('❌ Nenhum arquivo encontrado!');
        return;
    }
    
    // Processar cada arquivo
    const updatedFiles = [];
    let processados = 0;
    
    for (const file of files) {
        try {
            // Obter score do Qdrant
            const confidence = await KC.UnifiedConfidenceControllerInstance.getFileConfidence(file.id);
            
            // Atualizar arquivo
            updatedFiles.push({
                ...file,
                confidence: confidence.confidence,
                confidenceSource: confidence.source,
                relevanceScore: confidence.confidence // Atualizar relevanceScore também!
            });
            
            processados++;
            
            // Log a cada 10 arquivos
            if (processados % 10 === 0) {
                console.log(`✅ Processados: ${processados}/${files.length}`);
            }
            
        } catch (error) {
            console.error(`❌ Erro em ${file.name}:`, error.message);
            updatedFiles.push(file);
        }
    }
    
    // Salvar e atualizar UI
    KC.AppState.set('files', updatedFiles);
    
    // Emitir eventos
    KC.EventBus.emit(KC.Events.STATE_CHANGED, {
        key: 'files',
        newValue: updatedFiles,
        oldValue: files
    });
    
    KC.EventBus.emit(KC.Events.FILES_UPDATED, {
        action: 'confidence_updated',
        count: updatedFiles.length
    });
    
    // Forçar renderização
    if (KC.FileRenderer && KC.FileRenderer.renderFiles) {
        KC.FileRenderer.renderFiles(updatedFiles);
    }
    
    // Estatísticas
    const comScore = updatedFiles.filter(f => f.confidence > 0).length;
    const avgScore = updatedFiles.reduce((sum, f) => sum + (f.confidence || 0), 0) / updatedFiles.length;
    
    console.log('\n✅ PROCESSAMENTO CONCLUÍDO!');
    console.log(`📊 ${processados} arquivos processados`);
    console.log(`📈 ${comScore} arquivos com score > 0`);
    console.log(`📉 Score médio: ${avgScore.toFixed(1)}%`);
    
}, 1000);