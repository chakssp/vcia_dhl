// Script para corrigir a persistência de conteúdo para arquivos pequenos
function fixContentPersistence() {
    console.log('=== CORRIGINDO PERSISTÊNCIA DE CONTEÚDO ===\n');
    
    // Backup do método original
    const originalCompressFilesData = KC.AppState._compressFilesData;
    
    // Substituir por versão que mantém conteúdo para arquivos pequenos
    KC.AppState._compressFilesData = function(files) {
        return files.map(file => {
            const compressed = {
                // Metadados essenciais
                id: file.id,
                name: file.name,
                path: file.path,
                size: file.size,
                extension: file.extension,
                lastModified: file.lastModified,
                
                // Preserva handle para re-leitura posterior
                handle: file.handle,
                
                // Análise e relevância
                relevanceScore: file.relevanceScore,
                tokenSavings: file.tokenSavings,
                status: file.status,
                categories: file.categories || [],
                analyzed: file.analyzed,
                analysisType: file.analysisType,
                analysisDate: file.analysisDate,
                
                // Preview
                smartPreview: file.smartPreview ? {
                    relevanceScore: file.smartPreview.relevanceScore,
                    structureAnalysis: file.smartPreview.structureAnalysis,
                    stats: file.smartPreview.stats
                } : null,
                
                preview: file.preview,
                
                // Timestamps
                discoveredAt: file.discoveredAt,
                analyzedAt: file.analyzedAt,
                categorizedDate: file.categorizedDate,
                
                // Fingerprint e Qdrant
                fingerprint: file.fingerprint || this._generateFingerprint(file),
                inQdrant: file.inQdrant || false,
                
                // Estados adicionais
                approved: file.approved || false,
                archived: file.archived || false
            };
            
            // NOVA LÓGICA: Mantém conteúdo completo para arquivos pequenos
            const MAX_SIZE_FOR_CONTENT = 500 * 1024; // 500KB
            const isTextFile = ['.md', '.txt', '.markdown'].includes(file.extension?.toLowerCase() || '');
            
            if (file.content && file.size < MAX_SIZE_FOR_CONTENT && isTextFile) {
                compressed.content = file.content;
                console.log(`✅ Mantendo conteúdo completo para: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
            } else if (file.content && file.size >= MAX_SIZE_FOR_CONTENT) {
                console.log(`⚠️ Removendo conteúdo de arquivo grande: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
            }
            
            return compressed;
        });
    };
    
    console.log('✅ Método _compressFilesData atualizado!');
    console.log('Arquivos .md e .txt < 500KB manterão conteúdo completo no localStorage\n');
    
    // Estatísticas dos arquivos atuais
    const files = KC.AppState.get('files') || [];
    const stats = {
        total: files.length,
        withContent: files.filter(f => f.content).length,
        smallTextFiles: files.filter(f => 
            f.size < 500 * 1024 && 
            ['.md', '.txt', '.markdown'].includes(f.extension?.toLowerCase() || '')
        ).length,
        largeFiles: files.filter(f => f.size >= 500 * 1024).length
    };
    
    console.log('📊 ESTATÍSTICAS ATUAIS:');
    console.log(`Total de arquivos: ${stats.total}`);
    console.log(`Com conteúdo carregado: ${stats.withContent}`);
    console.log(`Arquivos texto < 500KB: ${stats.smallTextFiles}`);
    console.log(`Arquivos grandes (>= 500KB): ${stats.largeFiles}`);
    
    // Forçar re-save para aplicar nova lógica
    if (stats.withContent > 0) {
        console.log('\nAplicando nova lógica aos arquivos atuais...');
        KC.AppState._save();
        console.log('✅ Estado salvo com nova lógica de persistência!');
    }
}

// Executar correção
fixContentPersistence();