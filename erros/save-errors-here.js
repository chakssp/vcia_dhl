/**
 * 💾 SALVAR ERROS AUTOMATICAMENTE NESTA PASTA
 * 
 * Comando simples para salvar erros aqui:
 * saveErrorsHere()
 */

async function saveErrorsHere() {
    // Pegar dados do ClaudeReporter
    const report = localStorage.getItem('CLAUDE_LIVE_REPORT');
    
    if (!report) {
        console.error('❌ Nenhum erro capturado. Ative o Claude Reporter primeiro!');
        return;
    }
    
    const data = JSON.parse(report);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Criar conteúdo do arquivo
    const errorFile = {
        timestamp: new Date().toISOString(),
        errors: data.allErrors || [],
        errorLogs: (data.allLogs || []).filter(log => 
            log.type === 'error' || 
            (log.message && log.message.includes('Error'))
        ),
        totalErrors: data.allErrors?.length || 0,
        systemState: data.systemState || {},
        summary: {
            totalLogs: data.allLogs?.length || 0,
            totalErrors: data.allErrors?.length || 0,
            totalAPICalls: data.allAPICalls?.length || 0
        }
    };
    
    // Criar script para salvar
    const saveScript = `
// ARQUIVO GERADO AUTOMATICAMENTE
// Data: ${new Date().toISOString()}
// Erros capturados: ${errorFile.totalErrors}

const errorReport = ${JSON.stringify(errorFile, null, 2)};

// Para Claude analisar
console.log('📊 RELATÓRIO DE ERROS');
console.log('Timestamp:', errorReport.timestamp);
console.log('Total de erros:', errorReport.totalErrors);

if (errorReport.errors.length > 0) {
    console.log('\\n❌ ERROS:');
    errorReport.errors.forEach((err, i) => {
        console.log(\`\\nERRO \${i+1}:\`);
        console.log('Mensagem:', err.message);
        if (err.stack) {
            console.log('Stack:', err.stack.split('\\n')[0]);
        }
    });
}

export default errorReport;
`;
    
    // Converter para blob
    const blob = new Blob([saveScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    // Criar link de download
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-${timestamp}.js`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log(`✅ Arquivo salvo: error-${timestamp}.js`);
    console.log(`📁 Mova para a pasta: F:\\vcia-1307\\vcia_dhl\\erros\\`);
    console.log(`📊 Total de erros: ${errorFile.totalErrors}`);
    
    // Mostrar resumo
    if (errorFile.totalErrors > 0) {
        console.log('\n❌ RESUMO DOS ERROS:');
        errorFile.errors.slice(0, 5).forEach((err, i) => {
            console.log(`${i+1}. ${err.message}`);
        });
        if (errorFile.totalErrors > 5) {
            console.log(`... e mais ${errorFile.totalErrors - 5} erros`);
        }
    }
    
    return errorFile;
}

// Comando ainda mais simples
function saveErrors() {
    const data = JSON.parse(localStorage.getItem('CLAUDE_LIVE_REPORT') || '{}');
    const timestamp = Date.now();
    
    // Criar arquivo JavaScript com os erros
    const content = `// Erros capturados em ${new Date().toISOString()}
export const errors = ${JSON.stringify(data.allErrors || [], null, 2)};
export const errorLogs = ${JSON.stringify((data.allLogs || []).filter(l => l.type === 'error'), null, 2)};
export const systemState = ${JSON.stringify(data.systemState || {}, null, 2)};
`;
    
    // Download automático
    const blob = new Blob([content], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${timestamp}.js`;
    a.click();
    
    console.log(`✅ Salvo: errors-${timestamp}.js`);
    console.log(`📁 Coloque em: erros/`);
}

// Exportar globalmente
window.saveErrorsHere = saveErrorsHere;
window.saveErrors = saveErrors;

console.log('💾 COMANDOS PARA SALVAR ERROS:');
console.log('  saveErrors()     - Salva arquivo com erros');
console.log('  saveErrorsHere() - Salva com mais detalhes');
console.log('');
console.log('📁 Depois de baixar, coloque na pasta erros/');