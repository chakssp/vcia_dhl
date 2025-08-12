// LIMPAR localStorage CHEIO
console.log('🧹 Limpando localStorage...');

// Remover apenas dados do Claude Reporter
const keysToRemove = [];
for (let key in localStorage) {
    if (key.includes('CLAUDE') || key.includes('claude-report')) {
        keysToRemove.push(key);
    }
}

keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`❌ Removido: ${key}`);
});

// Verificar espaço usado
const used = JSON.stringify(localStorage).length;
const usedMB = (used / 1048576).toFixed(2);
console.log(`\n📊 Espaço usado agora: ${usedMB} MB`);

// Desligar ClaudeReporter temporariamente
if (window.ClaudeReporter) {
    window.ClaudeReporter.enabled = false;
    console.log('⏸️ ClaudeReporter pausado');
}

console.log('\n✅ localStorage limpo! Pode continuar testando.');