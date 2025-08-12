// SIMPLES: Execute reportBug() para salvar erros em arquivo

function reportBug() {
    const data = JSON.parse(localStorage.getItem('CLAUDE_LIVE_REPORT') || '{}');
    const timestamp = Date.now();
    
    const report = {
        timestamp: new Date().toISOString(),
        errors: data.allErrors || [],
        logs: (data.allLogs || []).filter(l => l.type === 'error')
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `erros/bug-${timestamp}.json`;
    a.click();
    
    console.log(`✅ Salvo: erros/bug-${timestamp}.json`);
}

console.log('Execute: reportBug()');