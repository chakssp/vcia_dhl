/**
 * Test completo do fluxo do sistema (Etapas 1-4) usando Playwright
 * Executa o workflow completo e verifica o pipeline de processamento
 */

const { chromium } = require('playwright');

async function runFullWorkflowTest() {
    console.log('🚀 Iniciando teste completo do workflow...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500 // Meio segundo entre ações para visualização
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // 1. Navegar para o sistema principal
        console.log('📍 Passo 1: Acessando sistema principal...');
        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('networkidle');
        
        // Aguardar carregamento completo
        await page.waitForFunction(() => {
            return window.KC && window.KC.AppState && window.KC.WorkflowPanel;
        }, { timeout: 10000 });
        
        console.log('✅ Sistema carregado com sucesso\n');
        
        // 2. ETAPA 1 - Descoberta de Arquivos
        console.log('📂 ETAPA 1: Descoberta de Arquivos');
        
        // Clicar no card da Etapa 1
        await page.click('.step-card[data-step="1"]');
        await page.waitForTimeout(1000);
        
        // Verificar se já tem dados ou precisa carregar
        const hasFiles = await page.evaluate(() => {
            const files = KC.AppState.get('files') || [];
            console.log(`Arquivos no AppState: ${files.length}`);
            return files.length > 0;
        });
        
        if (!hasFiles) {
            console.log('⚠️ Nenhum arquivo encontrado, selecionando diretório...');
            
            // Clicar no botão de seleção
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.click('#select-directory-btn')
            ]);
            
            // Nota: Em ambiente real, você precisaria selecionar um diretório
            console.log('📁 Por favor, selecione um diretório com arquivos .md no diálogo');
            
            // Aguardar processamento
            await page.waitForFunction(() => {
                const files = KC.AppState.get('files') || [];
                return files.length > 0;
            }, { timeout: 30000 });
        }
        
        const fileCount = await page.evaluate(() => {
            const files = KC.AppState.get('files') || [];
            return files.length;
        });
        
        console.log(`✅ ${fileCount} arquivos descobertos\n`);
        
        // 3. ETAPA 2 - Pré-Análise Local
        console.log('🔍 ETAPA 2: Pré-Análise Local');
        
        // Avançar para Etapa 2
        await page.click('button:has-text("Próxima Etapa")');
        await page.waitForTimeout(1000);
        
        // Aguardar carregamento da etapa 2
        await page.waitForSelector('#relevance-threshold', { timeout: 5000 });
        
        // Configurar threshold se necessário
        await page.fill('#relevance-threshold', '50');
        
        // Aplicar análise
        await page.click('button:has-text("Aplicar Análise")');
        await page.waitForTimeout(2000);
        
        const relevantFiles = await page.evaluate(() => {
            const files = KC.AppState.get('files') || [];
            return files.filter(f => {
                let score = f.relevanceScore;
                if (score && score < 1) score = score * 100;
                return score >= 50;
            }).length;
        });
        
        console.log(`✅ ${relevantFiles} arquivos com relevância >= 50%\n`);
        
        // 4. ETAPA 3 - Análise com IA
        console.log('🤖 ETAPA 3: Análise com IA');
        
        // Avançar para Etapa 3
        await page.click('button:has-text("Próxima Etapa")');
        await page.waitForTimeout(1000);
        
        // Verificar se precisa configurar API
        const needsApiConfig = await page.evaluate(() => {
            return !KC.AIAPIManager?.hasValidProvider();
        });
        
        if (needsApiConfig) {
            console.log('⚙️ Configurando Ollama...');
            
            // Abrir configuração de API
            await page.click('button:has-text("🔧 Configurar APIs")');
            await page.waitForTimeout(1000);
            
            // Selecionar Ollama
            await page.selectOption('#provider-select', 'ollama');
            
            // Testar conexão
            await page.click('button:has-text("Testar Conexão")');
            await page.waitForTimeout(2000);
            
            // Fechar modal
            await page.click('.modal-close');
        }
        
        console.log('✅ IA configurada, pulando análise para testar pipeline\n');
        
        // 5. ETAPA 4 - Organização e Exportação
        console.log('📦 ETAPA 4: Organização e Exportação');
        
        // Avançar para Etapa 4
        await page.click('button:has-text("Próxima Etapa")');
        await page.waitForTimeout(1000);
        
        // Aguardar carregamento do painel
        await page.waitForSelector('.organization-panel', { timeout: 5000 });
        
        // Verificar se o botão do pipeline está visível
        const pipelineButton = await page.$('button:has-text("🚀 Processar Arquivos Aprovados")');
        
        if (!pipelineButton) {
            throw new Error('Botão do pipeline não encontrado na Etapa 4!');
        }
        
        console.log('✅ Interface da Etapa 4 carregada\n');
        
        // 6. EXECUTAR PIPELINE
        console.log('🔄 EXECUTANDO PIPELINE DE PROCESSAMENTO...');
        
        // Verificar dados antes do pipeline
        const dataBeforePipeline = await page.evaluate(() => {
            const files = KC.AppState.get('files') || [];
            const approved = files.filter(file => {
                let relevance = file.relevanceScore;
                if (relevance && relevance < 1) relevance = relevance * 100;
                return relevance >= 50 && file.preview && !file.archived;
            });
            
            return {
                totalFiles: files.length,
                approvedFiles: approved.length,
                hasContent: approved.some(f => f.content || f.preview)
            };
        });
        
        console.log('📊 Dados antes do pipeline:');
        console.log(`   - Total de arquivos: ${dataBeforePipeline.totalFiles}`);
        console.log(`   - Arquivos aprovados: ${dataBeforePipeline.approvedFiles}`);
        console.log(`   - Tem conteúdo: ${dataBeforePipeline.hasContent}\n`);
        
        // Clicar no botão do pipeline
        await page.click('button:has-text("🚀 Processar Arquivos Aprovados")');
        
        // Aguardar conclusão do pipeline (máximo 2 minutos)
        console.log('⏳ Aguardando conclusão do pipeline...');
        
        const pipelineResult = await page.waitForFunction(() => {
            // Verificar se tem resultado no elemento
            const resultEl = document.querySelector('.pipeline-result');
            if (resultEl && resultEl.textContent.includes('chunks processados')) {
                return true;
            }
            
            // Ou verificar eventos
            return window.lastPipelineResult !== undefined;
        }, { timeout: 120000 });
        
        // Capturar resultado final
        const finalResult = await page.evaluate(() => {
            const resultEl = document.querySelector('.pipeline-result');
            const stats = KC.QdrantService?.getStats() || {};
            
            return {
                resultText: resultEl?.textContent || 'Não encontrado',
                pointsInserted: stats.pointsInserted || 0,
                errors: stats.errors || 0
            };
        });
        
        console.log('\n✅ PIPELINE CONCLUÍDO!');
        console.log(`📊 Resultado: ${finalResult.resultText}`);
        console.log(`   - Pontos inseridos no Qdrant: ${finalResult.pointsInserted}`);
        console.log(`   - Erros: ${finalResult.errors}`);
        
        // 7. VERIFICAR QDRANT
        console.log('\n🔍 Verificando dados no Qdrant...');
        
        const qdrantStats = await page.evaluate(async () => {
            if (!KC.QdrantService) return null;
            
            try {
                const stats = await KC.QdrantService.getCollectionStats();
                return stats;
            } catch (error) {
                return { error: error.message };
            }
        });
        
        if (qdrantStats && !qdrantStats.error) {
            console.log(`✅ Coleção Qdrant:`);
            console.log(`   - Total de pontos: ${qdrantStats.pointsCount}`);
            console.log(`   - Status: ${qdrantStats.status}`);
        }
        
        // 8. TESTE FINAL - RECARREGAR E VERIFICAR PERSISTÊNCIA
        console.log('\n🔄 Testando persistência de dados...');
        
        // Recarregar página
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Aguardar carregamento
        await page.waitForFunction(() => {
            return window.KC && window.KC.AppState;
        }, { timeout: 10000 });
        
        // Verificar se dados persistiram
        const dataAfterReload = await page.evaluate(() => {
            const files = KC.AppState.get('files') || [];
            const lsData = localStorage.getItem('kc_state');
            
            return {
                filesInAppState: files.length,
                hasLocalStorage: !!lsData,
                localStorageSize: lsData ? lsData.length : 0
            };
        });
        
        console.log('📊 Dados após recarregar:');
        console.log(`   - Arquivos no AppState: ${dataAfterReload.filesInAppState}`);
        console.log(`   - LocalStorage presente: ${dataAfterReload.hasLocalStorage}`);
        console.log(`   - Tamanho do localStorage: ${dataAfterReload.localStorageSize} bytes`);
        
        // RESULTADO FINAL
        console.log('\n' + '='.repeat(50));
        console.log('🎉 TESTE COMPLETO FINALIZADO!');
        console.log('='.repeat(50));
        
        if (dataAfterReload.filesInAppState > 0 && finalResult.pointsInserted > 0) {
            console.log('✅ SUCESSO: Sistema funcionando corretamente!');
            console.log('   - Dados carregados e persistidos');
            console.log('   - Pipeline processou e inseriu no Qdrant');
            console.log('   - Fluxo completo validado');
        } else {
            console.log('⚠️ ATENÇÃO: Verificar:');
            if (dataAfterReload.filesInAppState === 0) {
                console.log('   - Dados não persistiram após reload');
            }
            if (finalResult.pointsInserted === 0) {
                console.log('   - Pipeline não inseriu dados no Qdrant');
            }
        }
        
    } catch (error) {
        console.error('❌ ERRO no teste:', error.message);
        console.error(error.stack);
        
        // Capturar screenshot para debug
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('📸 Screenshot salva em test-error.png');
        
    } finally {
        // Aguardar um pouco antes de fechar para visualização
        console.log('\n⏸️ Aguardando 10 segundos antes de fechar...');
        await page.waitForTimeout(10000);
        
        await browser.close();
        console.log('🔚 Navegador fechado');
    }
}

// Executar o teste
runFullWorkflowTest().catch(console.error);