/**
 * Diagnóstico Completo do Sistema de Chunks no Qdrant
 * Data: 06/08/2025
 * Problema Reportado: "chunks não estão sendo feitos, apenas um arquivo é carregado"
 */

console.log('═══════════════════════════════════════════════════════════════');
console.log('     DIAGNÓSTICO COMPLETO - SISTEMA DE CHUNKS QDRANT');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Data:', new Date().toISOString());
console.log('');

// Função auxiliar para log estruturado
function logSection(title, content) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${title}`);
    console.log('─'.repeat(60));
    if (typeof content === 'object') {
        console.log(JSON.stringify(content, null, 2));
    } else {
        console.log(content);
    }
}

// Verificar se KC está carregado
if (typeof KC === 'undefined') {
    console.error('❌ ERRO: Sistema KC não está carregado!');
    console.log('Por favor, execute este script na página index.html após carregar o sistema.');
    return;
}

// Função principal de diagnóstico
async function diagnosticarSistemaChunks() {
    try {
        logSection('1. VERIFICANDO CONEXÃO COM QDRANT', '');
        
        const qdrantStatus = await KC.QdrantService.checkConnection();
        console.log('✅ Conexão com Qdrant:', qdrantStatus ? 'OK' : 'FALHA');
        
        const stats = await KC.QdrantService.getCollectionStats();
        console.log('📊 Total de pontos no Qdrant:', stats.vectors_count);
        
        // Verificar arquivos no sistema
        logSection('2. VERIFICANDO ARQUIVOS NO SISTEMA', '');
        
        const files = KC.AppState.get('files') || [];
        console.log('📁 Total de arquivos descobertos:', files.length);
        
        const filesWithContent = files.filter(f => f.content && f.content.length > 1000);
        console.log('📝 Arquivos com conteúdo completo (>1000 chars):', filesWithContent.length);
        
        const filesWithPreview = files.filter(f => f.preview && !f.content);
        console.log('👁️ Arquivos apenas com preview:', filesWithPreview.length);
        
        // Verificar RAGExportManager
        logSection('3. VERIFICANDO RAGEXPORTMANAGER', '');
        
        if (KC.RAGExportManager) {
            console.log('✅ RAGExportManager está carregado');
            
            // Verificar se o método de chunking está correto
            if (KC.RAGExportManager.createChunks) {
                console.log('✅ Método createChunks existe');
                
                // Testar com um arquivo exemplo
                if (filesWithContent.length > 0) {
                    const testFile = filesWithContent[0];
                    console.log(`\n🧪 Testando chunking com arquivo: ${testFile.name}`);
                    console.log(`📏 Tamanho do conteúdo: ${testFile.content.length} caracteres`);
                    
                    // Criar chunks de teste
                    const chunks = KC.RAGExportManager.createChunks(testFile.content, {
                        chunkSize: 500,
                        chunkOverlap: 50
                    });
                    
                    console.log(`✂️ Chunks criados: ${chunks.length}`);
                    
                    if (chunks.length > 0) {
                        console.log('\n📦 Estrutura do primeiro chunk:');
                        const firstChunk = chunks[0];
                        console.log({
                            index: firstChunk.index,
                            chunkIndex: firstChunk.chunkIndex,
                            size: firstChunk.content ? firstChunk.content.length : 0,
                            hasContent: !!firstChunk.content
                        });
                    }
                }
            } else {
                console.error('❌ Método createChunks NÃO existe!');
            }
        } else {
            console.error('❌ RAGExportManager NÃO está carregado!');
        }
        
        // Verificar QdrantManager
        logSection('4. VERIFICANDO QDRANTMANAGER', '');
        
        if (KC.QdrantManager) {
            console.log('✅ QdrantManager está carregado');
            
            // Verificar método checkDuplicate
            if (KC.QdrantManager.checkDuplicate) {
                console.log('✅ Método checkDuplicate existe');
                
                // Testar detecção de duplicatas
                const testData = {
                    fileName: 'test.md',
                    filePath: '/test/test.md',
                    chunkIndex: 0
                };
                
                const dupResult = await KC.QdrantManager.checkDuplicate(testData);
                console.log('🔍 Teste de duplicata:', dupResult);
            }
        } else {
            console.error('❌ QdrantManager NÃO está carregado!');
        }
        
        // Verificar dados no Qdrant
        logSection('5. ANALISANDO DADOS NO QDRANT', '');
        
        try {
            const points = await KC.QdrantService.scrollPoints({
                limit: 100,
                withPayload: true
            });
            
            if (points && points.points && points.points.length > 0) {
                console.log(`📊 Analisando ${points.points.length} pontos...`);
                
                // Agrupar por arquivo
                const fileGroups = {};
                points.points.forEach(point => {
                    const fileName = point.payload.fileName || 'unknown';
                    const chunkIndex = point.payload.chunkIndex;
                    
                    if (!fileGroups[fileName]) {
                        fileGroups[fileName] = {
                            chunks: [],
                            hasChunkIndex: false
                        };
                    }
                    
                    fileGroups[fileName].chunks.push(chunkIndex);
                    if (chunkIndex !== undefined && chunkIndex !== null && chunkIndex !== -1) {
                        fileGroups[fileName].hasChunkIndex = true;
                    }
                });
                
                console.log('\n📁 Arquivos e seus chunks:');
                Object.entries(fileGroups).forEach(([fileName, info]) => {
                    console.log(`\n  📄 ${fileName}`);
                    console.log(`     Chunks: ${info.chunks.length}`);
                    console.log(`     Tem chunkIndex? ${info.hasChunkIndex ? '✅' : '❌'}`);
                    if (info.chunks.length <= 5) {
                        console.log(`     Índices: [${info.chunks.join(', ')}]`);
                    }
                });
                
                // Verificar problema específico
                const problemFiles = Object.entries(fileGroups).filter(([_, info]) => 
                    info.chunks.length === 1 || !info.hasChunkIndex
                );
                
                if (problemFiles.length > 0) {
                    console.log('\n⚠️ ARQUIVOS COM PROBLEMA:');
                    problemFiles.forEach(([fileName, info]) => {
                        console.log(`  ❌ ${fileName}: ${info.chunks.length} chunk(s), chunkIndex: ${info.hasChunkIndex ? 'SIM' : 'NÃO'}`);
                    });
                }
            } else {
                console.log('⚠️ Nenhum ponto encontrado no Qdrant');
            }
        } catch (error) {
            console.error('❌ Erro ao buscar dados do Qdrant:', error);
        }
        
        // Recomendações
        logSection('6. DIAGNÓSTICO E RECOMENDAÇÕES', '');
        
        console.log('🔍 ANÁLISE DO PROBLEMA:');
        console.log('');
        
        if (filesWithPreview.length > filesWithContent.length) {
            console.log('❌ PROBLEMA IDENTIFICADO: Maioria dos arquivos tem apenas preview!');
            console.log('   → Solução: Carregar conteúdo completo antes de processar');
        }
        
        console.log('\n📋 CHECKLIST DE VERIFICAÇÃO:');
        console.log('1. [ ] Arquivos têm conteúdo completo carregado?');
        console.log('2. [ ] RAGExportManager está criando múltiplos chunks?');
        console.log('3. [ ] Campo chunkIndex está sendo incluído no payload?');
        console.log('4. [ ] QdrantManager está verificando chunkIndex corretamente?');
        console.log('5. [ ] Dados estão sendo inseridos sem serem marcados como duplicatas?');
        
        console.log('\n🔧 AÇÕES CORRETIVAS:');
        console.log('1. Executar: KC.FileRenderer.loadFullContent() para cada arquivo');
        console.log('2. Verificar: RAGExportManager linha 819 - campo chunkIndex presente?');
        console.log('3. Confirmar: QdrantManager.checkDuplicate() considera chunkIndex');
        console.log('4. Testar: Processar um arquivo e verificar múltiplos chunks no Qdrant');
        
    } catch (error) {
        console.error('❌ Erro durante diagnóstico:', error);
    }
}

// Executar diagnóstico
console.log('🚀 Iniciando diagnóstico...\n');
diagnosticarSistemaChunks();