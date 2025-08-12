/**
 * COMANDO ÚNICO PARA PEGAR O RELATÓRIO DO CLAUDE REPORTER
 */

// Pegar dados salvos automaticamente
const report = localStorage.getItem('CLAUDE_LIVE_REPORT');

if (report) {
    const data = JSON.parse(report);
    
    console.log('📊 RELATÓRIO CLAUDE REPORTER');
    console.log('=' .repeat(60));
    console.log(`Timestamp: ${data.currentTime}`);
    console.log(`Logs: ${data.allLogs?.length || 0}`);
    console.log(`Erros: ${data.allErrors?.length || 0}`);
    console.log(`API Calls: ${data.allAPICalls?.length || 0}`);
    
    if (data.allErrors && data.allErrors.length > 0) {
        console.log('\n❌ ERROS ENCONTRADOS:');
        data.allErrors.forEach((err, idx) => {
            console.log(`\n${idx + 1}. ${err.message}`);
            if (err.stack) {
                console.log('   Stack:', err.stack.split('\n')[1]);
            }
        });
    }
    
    // Copiar para clipboard
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        console.log('\n✅ Dados copiados para área de transferência!');
        console.log('📋 Cole no chat do Claude para análise');
    });
    
    return data;
} else {
    console.log('❌ Nenhum relatório disponível');
    console.log('Certifique-se que o Claude Reporter está ATIVO (toggle na navbar)');
}