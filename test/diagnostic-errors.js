/**
 * 🔍 DIAGNÓSTICO DE ERROS - SISTEMA KC
 * 
 * Script para identificar e resolver erros no sistema
 */

console.log('🔍 EXECUTANDO DIAGNÓSTICO DE ERROS');
console.log('=' .repeat(60));

// Função principal de diagnóstico
function diagnosticErrors() {
    const errors = [];
    const warnings = [];
    const info = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        browser: navigator.userAgent
    };
    
    console.log('\n1️⃣ VERIFICANDO CARREGAMENTO DE SCRIPTS...');
    
    // Verificar se ClaudeReporter carregou
    if (typeof ClaudeReporter === 'undefined') {
        errors.push({
            type: 'SCRIPT_NOT_LOADED',
            message: 'ClaudeReporter não está definido',
            solution: 'Verificar se js/services/ClaudeReporter.js está sendo carregado'
        });
        console.error('❌ ClaudeReporter não carregado');
    } else {
        console.log('✅ ClaudeReporter carregado');
        
        // Verificar se foi inicializado
        if (!window.ClaudeReporter) {
            warnings.push({
                type: 'NOT_INITIALIZED',
                message: 'ClaudeReporter não foi inicializado',
                solution: 'Verificar se new ClaudeReporter() está sendo executado'
            });
            console.warn('⚠️ ClaudeReporter não inicializado');
        } else {
            console.log('✅ ClaudeReporter inicializado');
            console.log(`   Estado: ${window.ClaudeReporter.enabled ? 'ATIVO' : 'INATIVO'}`);
        }
    }
    
    console.log('\n2️⃣ VERIFICANDO SISTEMA KC...');
    
    // Verificar KC
    if (typeof KC === 'undefined') {
        errors.push({
            type: 'KC_NOT_LOADED',
            message: 'KC (Knowledge Consolidator) não está definido',
            solution: 'Sistema KC não carregou corretamente'
        });
        console.error('❌ KC não carregado');
    } else {
        console.log('✅ KC carregado');
        
        // Verificar serviços essenciais
        const services = [
            'QdrantService',
            'EmbeddingService',
            'OrganizationPanel',
            'AppState',
            'EventBus'
        ];
        
        services.forEach(service => {
            if (!KC[service]) {
                warnings.push({
                    type: 'SERVICE_MISSING',
                    service: service,
                    message: `KC.${service} não está disponível`,
                    solution: `Verificar carregamento de ${service}.js`
                });
                console.warn(`⚠️ KC.${service} não disponível`);
            } else {
                console.log(`✅ KC.${service} disponível`);
            }
        });
    }
    
    console.log('\n3️⃣ VERIFICANDO MÉTODOS DE ENRIQUECIMENTO...');
    
    // Verificar novos métodos do QdrantService
    if (KC?.QdrantService) {
        const methods = [
            'enrichWithEmbeddings',
            'calculateConvergence',
            'processAndInsertFile',
            'processFilesBatch'
        ];
        
        methods.forEach(method => {
            if (!KC.QdrantService[method]) {
                errors.push({
                    type: 'METHOD_MISSING',
                    service: 'QdrantService',
                    method: method,
                    message: `Método ${method} não encontrado em QdrantService`,
                    solution: 'Verificar se as alterações em QdrantService.js foram salvas'
                });
                console.error(`❌ QdrantService.${method} não encontrado`);
            } else {
                console.log(`✅ QdrantService.${method} disponível`);
            }
        });
    }
    
    console.log('\n4️⃣ VERIFICANDO INTERFACE (OrganizationPanel)...');
    
    // Verificar métodos do OrganizationPanel
    if (KC?.OrganizationPanel) {
        const methods = [
            'testEmbeddingsWithOneFile',
            'startEmbeddingsEnrichment',
            '_getFilesByCriteria'
        ];
        
        methods.forEach(method => {
            if (!KC.OrganizationPanel[method]) {
                errors.push({
                    type: 'METHOD_MISSING',
                    service: 'OrganizationPanel',
                    method: method,
                    message: `Método ${method} não encontrado em OrganizationPanel`,
                    solution: 'Verificar se as alterações em OrganizationPanel.js foram salvas'
                });
                console.error(`❌ OrganizationPanel.${method} não encontrado`);
            } else {
                console.log(`✅ OrganizationPanel.${method} disponível`);
            }
        });
    }
    
    console.log('\n5️⃣ VERIFICANDO ELEMENTOS DA UI...');
    
    // Verificar se estamos na etapa correta
    if (KC?.AppController?.currentStep !== 4) {
        warnings.push({
            type: 'WRONG_STEP',
            message: `Sistema está na etapa ${KC?.AppController?.currentStep || 'desconhecida'}, não na etapa 4`,
            solution: 'Navegar para Etapa 4 (Organização e Exportação)'
        });
        console.warn(`⚠️ Não está na etapa 4 (atual: ${KC?.AppController?.currentStep})`);
    } else {
        // Verificar elementos da UI
        const uiElements = [
            'btn-enrich-embeddings',
            'btn-test-embeddings',
            'embeddings-status',
            'embeddings-progress'
        ];
        
        uiElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                warnings.push({
                    type: 'UI_ELEMENT_MISSING',
                    element: id,
                    message: `Elemento #${id} não encontrado na página`,
                    solution: 'Elemento será criado quando navegar para Etapa 4'
                });
                console.warn(`⚠️ Elemento #${id} não encontrado`);
            } else {
                console.log(`✅ Elemento #${id} presente`);
            }
        });
    }
    
    console.log('\n6️⃣ VERIFICANDO CONEXÕES EXTERNAS...');
    
    // Testar conexões (async)
    (async () => {
        // Qdrant
        if (KC?.QdrantService?.checkConnection) {
            try {
                const connected = await KC.QdrantService.checkConnection();
                if (connected) {
                    console.log('✅ Qdrant conectado');
                } else {
                    errors.push({
                        type: 'CONNECTION_FAILED',
                        service: 'Qdrant',
                        message: 'Não foi possível conectar ao Qdrant',
                        solution: 'Verificar se Qdrant está rodando em http://qdr.vcia.com.br:6333'
                    });
                    console.error('❌ Qdrant não conectado');
                }
            } catch (e) {
                console.error('❌ Erro ao verificar Qdrant:', e.message);
            }
        }
        
        // Ollama
        if (KC?.EmbeddingService?.checkOllamaAvailability) {
            try {
                const available = await KC.EmbeddingService.checkOllamaAvailability();
                if (available) {
                    console.log('✅ Ollama disponível');
                } else {
                    errors.push({
                        type: 'CONNECTION_FAILED',
                        service: 'Ollama',
                        message: 'Ollama não está disponível',
                        solution: 'Verificar se Ollama está rodando em http://localhost:11434'
                    });
                    console.error('❌ Ollama não disponível');
                }
            } catch (e) {
                console.error('❌ Erro ao verificar Ollama:', e.message);
            }
        }
        
        // Gerar relatório final
        console.log('\n' + '=' .repeat(60));
        console.log('📊 RELATÓRIO DE DIAGNÓSTICO');
        console.log('=' .repeat(60));
        
        if (errors.length === 0 && warnings.length === 0) {
            console.log('✅ SISTEMA FUNCIONANDO CORRETAMENTE!');
        } else {
            if (errors.length > 0) {
                console.log(`\n❌ ERROS CRÍTICOS (${errors.length}):`);
                errors.forEach((err, idx) => {
                    console.log(`\n${idx + 1}. ${err.message}`);
                    console.log(`   Tipo: ${err.type}`);
                    console.log(`   Solução: ${err.solution}`);
                });
            }
            
            if (warnings.length > 0) {
                console.log(`\n⚠️ AVISOS (${warnings.length}):`);
                warnings.forEach((warn, idx) => {
                    console.log(`\n${idx + 1}. ${warn.message}`);
                    console.log(`   Tipo: ${warn.type}`);
                    console.log(`   Solução: ${warn.solution}`);
                });
            }
        }
        
        console.log('\n💡 PRÓXIMOS PASSOS:');
        console.log('1. Corrigir erros críticos (se houver)');
        console.log('2. Navegar para Etapa 4 (Organização)');
        console.log('3. Ativar Claude Reporter (toggle na navbar)');
        console.log('4. Executar teste de embeddings');
        
        // Retornar relatório
        return {
            timestamp: info.timestamp,
            errors: errors,
            warnings: warnings,
            info: info
        };
    })();
}

// Função para recarregar scripts com problema
function reloadScript(scriptPath) {
    console.log(`🔄 Recarregando script: ${scriptPath}`);
    
    // Remover script existente
    const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
    if (existingScript) {
        existingScript.remove();
    }
    
    // Adicionar novo script
    const script = document.createElement('script');
    script.src = scriptPath + '?t=' + Date.now(); // Cache bust
    script.onload = () => console.log(`✅ ${scriptPath} recarregado`);
    script.onerror = () => console.error(`❌ Erro ao carregar ${scriptPath}`);
    document.body.appendChild(script);
}

// Função para forçar recarga dos scripts modificados
function fixScripts() {
    console.log('🔧 TENTANDO CORRIGIR SCRIPTS...');
    
    // Recarregar scripts na ordem correta
    const scriptsToReload = [
        'js/services/QdrantService.js',
        'js/services/ClaudeReporter.js',
        'js/components/OrganizationPanel.js'
    ];
    
    scriptsToReload.forEach((script, index) => {
        setTimeout(() => {
            reloadScript(script);
        }, index * 500); // Delay entre cada script
    });
    
    console.log('⏳ Aguarde os scripts recarregarem...');
    console.log('Execute diagnosticErrors() novamente em 3 segundos');
}

// Exportar funções
window.diagnosticErrors = diagnosticErrors;
window.fixScripts = fixScripts;
window.reloadScript = reloadScript;

// Executar diagnóstico automaticamente
console.log('\n🚀 Executando diagnóstico...\n');
diagnosticErrors();

console.log('\n📌 COMANDOS DISPONÍVEIS:');
console.log('  diagnosticErrors() - Executar diagnóstico novamente');
console.log('  fixScripts()       - Tentar recarregar scripts com problema');
console.log('  reloadScript(path) - Recarregar script específico');