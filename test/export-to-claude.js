/**
 * 🔄 EXPORTAR DADOS DO CLAUDE REPORTER PARA ARQUIVO
 * Para Claude ter visibilidade dos erros capturados
 */

// Função para copiar relatório para arquivo que Claude pode ler
async function copyReportToFile() {
    const report = getClaudeReport();
    
    if (!report) {
        console.error('❌ Nenhum relatório disponível!');
        console.log('Certifique-se que o Claude Reporter está ATIVO');
        return;
    }
    
    // Preparar dados completos
    const fullReport = {
        timestamp: new Date().toISOString(),
        sessionId: report.sessionId,
        duration: report.duration,
        url: window.location.href,
        
        // Resumo
        summary: report.summary,
        
        // ERROS COMPLETOS
        errors: report.errors || [],
        
        // Últimas chamadas de API
        apiCalls: report.apiCalls || [],
        
        // Logs recentes (incluindo erros)
        recentLogs: report.logs ? report.logs.slice(-100) : [],
        
        // Performance
        performance: report.performance || {},
        
        // Estado atual do KC
        kcState: {
            filesLoaded: KC?.AppState?.get('files')?.length || 0,
            currentStep: KC?.AppController?.currentStep || 0,
            qdrantConnected: KC?.QdrantService?.initialized || false,
            ollamaAvailable: KC?.EmbeddingService?.ollamaAvailable || false
        },
        
        // Erros do console (backup)
        consoleErrors: []
    };
    
    // Capturar erros adicionais do console
    if (window.ClaudeReporter?.errors) {
        fullReport.consoleErrors = window.ClaudeReporter.errors;
    }
    
    // Converter para JSON
    const jsonData = JSON.stringify(fullReport, null, 2);
    
    // Criar blob e baixar
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-report-output.json';
    a.click();
    
    console.log('✅ Relatório exportado para: claude-report-output.json');
    console.log('📋 O arquivo contém:');
    console.log(`  - ${fullReport.errors.length} erros`);
    console.log(`  - ${fullReport.apiCalls.length} chamadas de API`);
    console.log(`  - ${fullReport.recentLogs.length} logs recentes`);
    console.log('');
    console.log('🔄 Agora copie o conteúdo do arquivo para o Claude analisar!');
    
    // Também copiar para clipboard se possível
    try {
        await navigator.clipboard.writeText(jsonData);
        console.log('📋 Dados também copiados para a área de transferência!');
    } catch (e) {
        console.log('⚠️ Não foi possível copiar para clipboard automaticamente');
    }
    
    return fullReport;
}

// Função alternativa para mostrar erros diretamente
function showErrorsForClaude() {
    const report = getClaudeReport();
    
    if (!report || !report.errors || report.errors.length === 0) {
        console.log('✅ Nenhum erro capturado');
        return;
    }
    
    console.log('❌ ERROS CAPTURADOS PELO CLAUDE REPORTER:');
    console.log('=' .repeat(60));
    
    report.errors.forEach((error, idx) => {
        console.log(`\nERRO ${idx + 1}:`);
        console.log('Timestamp:', new Date(error.timestamp).toISOString());
        console.log('Mensagem:', error.message);
        if (error.stack) {
            console.log('Stack:', error.stack);
        }
        console.log('-'.repeat(40));
    });
    
    // Logs de erro também
    const errorLogs = report.logs.filter(log => log.type === 'error');
    if (errorLogs.length > 0) {
        console.log('\nLOGS DE ERRO:');
        errorLogs.forEach(log => {
            console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`);
            if (log.data) {
                console.log('Data:', log.data);
            }
        });
    }
}

// Função para pegar estado atual com erros
function getCurrentErrors() {
    // Coletar todos os erros possíveis
    const errors = {
        timestamp: new Date().toISOString(),
        
        // Do Claude Reporter
        reporterErrors: window.ClaudeReporter?.errors || [],
        
        // Do console (se capturado)
        consoleLogs: [],
        
        // Estado do sistema
        systemState: {
            kcLoaded: typeof KC !== 'undefined',
            claudeReporterActive: window.ClaudeReporter?.enabled || false,
            currentStep: KC?.AppController?.currentStep,
            qdrантService: !!KC?.QdrantService,
            embeddingService: !!KC?.EmbeddingService,
            
            // Verificar métodos novos
            enrichMethod: !!KC?.QdrantService?.enrichWithEmbeddings,
            processMethod: !!KC?.QdrantService?.processAndInsertFile,
            
            // UI Elements
            hasEmbeddingsButton: !!document.getElementById('btn-enrich-embeddings'),
            hasTestButton: !!document.getElementById('btn-test-embeddings')
        }
    };
    
    // Tentar capturar logs recentes do Claude Reporter
    const report = getClaudeReport();
    if (report) {
        errors.consoleLogs = report.logs.filter(log => 
            log.type === 'error' || 
            log.type === 'warn' ||
            (log.message && log.message.includes('Error'))
        );
    }
    
    return errors;
}

// Exportar funções
window.copyReportToFile = copyReportToFile;
window.showErrorsForClaude = showErrorsForClaude;
window.getCurrentErrors = getCurrentErrors;

console.log('🔄 COMANDOS PARA EXPORTAR DADOS AO CLAUDE:');
console.log('=' .repeat(60));
console.log('');
console.log('1️⃣ copyReportToFile()     - Baixa JSON com todos os dados');
console.log('2️⃣ showErrorsForClaude()  - Mostra erros no console');
console.log('3️⃣ getCurrentErrors()     - Retorna estado atual com erros');
console.log('');
console.log('📋 USE: copyReportToFile() e envie o arquivo para o Claude!');