/**
 * 🤝 COMANDOS RÁPIDOS - CLAUDE REPORTER
 * 
 * Comandos úteis para co-pilotagem em tempo real
 * Execute estes comandos no console para interagir com o Claude Reporter
 */

// ============================================
// COMANDOS PRINCIPAIS
// ============================================

/**
 * Obtém o relatório atual completo
 */
function getReport() {
    const report = getClaudeReport();
    if (report) {
        console.log('📊 RELATÓRIO CLAUDE REPORTER');
        console.log('=' .repeat(50));
        console.log(`Session ID: ${report.sessionId}`);
        console.log(`Duração: ${(report.duration / 1000).toFixed(2)}s`);
        console.log(`Total Logs: ${report.summary.totalLogs}`);
        console.log(`Total Erros: ${report.summary.totalErrors}`);
        console.log(`API Calls: ${report.summary.totalAPICalls}`);
        console.log(`Tempo médio API: ${report.summary.avgAPITime}ms`);
        console.log('=' .repeat(50));
        return report;
    } else {
        console.log('❌ Nenhum relatório disponível. Ative o Claude Reporter primeiro.');
        return null;
    }
}

/**
 * Mostra apenas os erros
 */
function showErrors() {
    const report = getClaudeReport();
    if (report && report.errors.length > 0) {
        console.log('❌ ERROS CAPTURADOS');
        console.log('=' .repeat(50));
        report.errors.forEach((err, idx) => {
            console.log(`\n${idx + 1}. [${new Date(err.timestamp).toLocaleTimeString()}]`);
            console.log(`   ${err.message}`);
            if (err.stack) {
                console.log(`   Stack: ${err.stack.split('\n')[1]}`);
            }
        });
    } else {
        console.log('✅ Nenhum erro capturado');
    }
}

/**
 * Mostra chamadas de API
 */
function showAPICalls(limit = 10) {
    const report = getClaudeReport();
    if (report && report.apiCalls.length > 0) {
        console.log('🔄 CHAMADAS DE API (últimas ' + limit + ')');
        console.log('=' .repeat(50));
        
        const calls = report.apiCalls.slice(-limit);
        calls.forEach((call, idx) => {
            const time = new Date(call.timestamp).toLocaleTimeString();
            const status = call.error ? '❌' : '✅';
            console.log(`\n${idx + 1}. [${time}] ${status} ${call.method} ${call.url}`);
            console.log(`   Duração: ${call.duration}ms | Status: ${call.status || 'N/A'}`);
            if (call.error) {
                console.log(`   Erro: ${call.error}`);
            }
        });
    } else {
        console.log('📭 Nenhuma chamada de API capturada');
    }
}

/**
 * Mostra métricas de performance
 */
function showPerformance() {
    const report = getClaudeReport();
    if (report && report.performance) {
        console.log('⚡ MÉTRICAS DE PERFORMANCE');
        console.log('=' .repeat(50));
        
        // Embeddings
        if (report.performance.embeddings.length > 0) {
            const avgEmb = report.performance.embeddings.reduce((sum, e) => sum + e.duration, 0) / report.performance.embeddings.length;
            console.log(`\n📊 Embeddings:`);
            console.log(`  - Total: ${report.performance.embeddings.length}`);
            console.log(`  - Tempo médio: ${avgEmb.toFixed(0)}ms`);
        }
        
        // Qdrant
        if (report.performance.qdrant.length > 0) {
            const avgQdr = report.performance.qdrant.reduce((sum, q) => sum + q.duration, 0) / report.performance.qdrant.length;
            console.log(`\n💾 Qdrant:`);
            console.log(`  - Total: ${report.performance.qdrant.length}`);
            console.log(`  - Tempo médio: ${avgQdr.toFixed(0)}ms`);
            
            // Operações por tipo
            const ops = {};
            report.performance.qdrant.forEach(q => {
                ops[q.operation] = (ops[q.operation] || 0) + 1;
            });
            Object.entries(ops).forEach(([op, count]) => {
                console.log(`  - ${op}: ${count}`);
            });
        }
    } else {
        console.log('📊 Nenhuma métrica de performance disponível');
    }
}

/**
 * Mostra logs recentes
 */
function showLogs(limit = 20) {
    const report = getClaudeReport();
    if (report && report.logs.length > 0) {
        console.log(`📝 LOGS RECENTES (últimos ${limit})`);
        console.log('=' .repeat(50));
        
        const logs = report.logs.slice(-limit);
        logs.forEach((log, idx) => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const icon = {
                'log': '📝',
                'error': '❌',
                'warn': '⚠️',
                'info': 'ℹ️',
                'api': '🔄',
                'system': '⚙️',
                'user': '👤'
            }[log.type] || '📌';
            
            console.log(`${icon} [${time}] ${log.message}`);
            if (log.data && Object.keys(log.data).length > 0) {
                console.log('   Data:', log.data);
            }
        });
    } else {
        console.log('📭 Nenhum log disponível');
    }
}

/**
 * Marca um ponto de interesse no log
 */
function mark(message, data = null) {
    claudeReport(`🔖 MARK: ${message}`, data);
    console.log(`✅ Marcação adicionada: ${message}`);
}

/**
 * Reporta um problema para Claude analisar
 */
function reportProblem(description, context = null) {
    const problem = {
        timestamp: Date.now(),
        description,
        context,
        state: {
            currentStep: KC?.AppController?.currentStep,
            filesLoaded: KC?.AppState?.get('files')?.length,
            lastError: window.ClaudeReporter?.errors.slice(-1)[0]
        }
    };
    
    claudeReport(`🚨 PROBLEMA REPORTADO: ${description}`, problem);
    console.log('🚨 Problema reportado para análise do Claude');
    console.log('Descrição:', description);
    if (context) console.log('Contexto:', context);
    
    // Salvar imediatamente
    if (window.ClaudeReporter) {
        window.ClaudeReporter.saveReport();
    }
    
    return problem;
}

/**
 * Cria checkpoint de validação
 */
function checkpoint(name) {
    const cp = {
        name,
        timestamp: Date.now(),
        kc: {
            files: KC?.AppState?.get('files')?.length || 0,
            step: KC?.AppController?.currentStep || 0,
            qdrantConnected: KC?.QdrantService?.initialized || false,
            ollamaAvailable: KC?.EmbeddingService?.ollamaAvailable || false
        }
    };
    
    claudeReport(`✅ CHECKPOINT: ${name}`, cp);
    console.log(`✅ Checkpoint criado: ${name}`);
    return cp;
}

/**
 * Exporta relatório para arquivo
 */
function exportReport() {
    if (window.ClaudeReporter) {
        window.ClaudeReporter.downloadReport();
    } else {
        console.log('❌ Claude Reporter não está carregado');
    }
}

/**
 * Limpa relatórios antigos
 */
function cleanReports() {
    if (window.ClaudeReporter) {
        window.ClaudeReporter.cleanOldReports();
    }
}

/**
 * Status atual do reporter
 */
function status() {
    if (window.ClaudeReporter) {
        const report = window.ClaudeReporter.getCurrentReport();
        console.log('🤝 CLAUDE REPORTER STATUS');
        console.log('=' .repeat(50));
        console.log(`Estado: ${report.enabled ? '🟢 ATIVO' : '🔴 INATIVO'}`);
        console.log(`Session ID: ${report.sessionId}`);
        console.log(`Uptime: ${(report.uptime / 1000).toFixed(0)}s`);
        console.log(`Logs: ${report.logs}`);
        console.log(`Erros: ${report.errors}`);
        console.log(`API Calls: ${report.apiCalls}`);
        return report;
    } else {
        console.log('❌ Claude Reporter não está carregado');
        return null;
    }
}

// ============================================
// COMANDOS ESPECÍFICOS PARA TESTE DE EMBEDDINGS
// ============================================

/**
 * Inicia monitoramento de teste de embeddings
 */
function startEmbeddingsTest(folder = 'docs/sprint/1.1') {
    console.log('🧪 INICIANDO MONITORAMENTO DE TESTE DE EMBEDDINGS');
    console.log(`📁 Pasta: ${folder}`);
    
    // Criar checkpoint inicial
    checkpoint(`EMBEDDINGS_TEST_START_${folder}`);
    
    // Marcar início
    mark(`Teste de embeddings iniciado para ${folder}`);
    
    // Verificar serviços
    const services = {
        qdrant: KC?.QdrantService?.checkConnection(),
        ollama: KC?.EmbeddingService?.checkOllamaAvailability()
    };
    
    claudeReport('Serviços verificados', services);
    
    console.log('✅ Monitoramento iniciado. Use os comandos:');
    console.log('  showLogs() - Ver logs recentes');
    console.log('  showAPICalls() - Ver chamadas de API');
    console.log('  showErrors() - Ver erros');
    console.log('  reportProblem("descrição") - Reportar problema');
    console.log('  checkpoint("nome") - Criar checkpoint');
}

/**
 * Finaliza teste e gera resumo
 */
function finishEmbeddingsTest() {
    checkpoint('EMBEDDINGS_TEST_END');
    
    const report = getReport();
    if (report) {
        console.log('\n📊 RESUMO DO TESTE DE EMBEDDINGS');
        console.log('=' .repeat(50));
        console.log(`Duração total: ${(report.duration / 1000).toFixed(2)}s`);
        console.log(`Erros encontrados: ${report.summary.totalErrors}`);
        console.log(`Chamadas de API: ${report.summary.totalAPICalls}`);
        
        // Performance específica
        if (report.performance) {
            if (report.performance.embeddings.length > 0) {
                console.log(`\nEmbeddings gerados: ${report.performance.embeddings.length}`);
            }
            if (report.performance.qdrant.length > 0) {
                console.log(`Operações Qdrant: ${report.performance.qdrant.length}`);
            }
        }
        
        console.log('\n📥 Use exportReport() para baixar o relatório completo');
    }
}

// ============================================
// ALIASES E ATALHOS
// ============================================

window.cr = {
    report: getReport,
    errors: showErrors,
    api: showAPICalls,
    perf: showPerformance,
    logs: showLogs,
    mark: mark,
    problem: reportProblem,
    checkpoint: checkpoint,
    export: exportReport,
    clean: cleanReports,
    status: status,
    startTest: startEmbeddingsTest,
    finishTest: finishEmbeddingsTest
};

// ============================================
// INSTRUÇÕES
// ============================================

console.log('🤝 COMANDOS DO CLAUDE REPORTER CARREGADOS');
console.log('=' .repeat(50));
console.log('COMANDOS DISPONÍVEIS:');
console.log('');
console.log('📊 Relatórios:');
console.log('  getReport()         - Relatório completo');
console.log('  showErrors()        - Apenas erros');
console.log('  showAPICalls(n)     - Últimas n chamadas de API');
console.log('  showPerformance()   - Métricas de performance');
console.log('  showLogs(n)         - Últimos n logs');
console.log('');
console.log('🔖 Marcações:');
console.log('  mark("msg")         - Adiciona marcação');
console.log('  checkpoint("nome")  - Cria checkpoint');
console.log('  reportProblem("x")  - Reporta problema');
console.log('');
console.log('💾 Gestão:');
console.log('  exportReport()      - Baixa relatório JSON');
console.log('  cleanReports()      - Limpa relatórios antigos');
console.log('  status()            - Status atual');
console.log('');
console.log('🧪 Teste de Embeddings:');
console.log('  startEmbeddingsTest() - Inicia monitoramento');
console.log('  finishEmbeddingsTest() - Finaliza e resume');
console.log('');
console.log('💡 ATALHOS: Use cr.* (ex: cr.report(), cr.errors())');
console.log('=' .repeat(50));