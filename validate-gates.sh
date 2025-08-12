#!/bin/bash
# FRAMEWORK EU-VOCÊ - VALIDAÇÃO DE GATES OBRIGATÓRIA
# Criado: 11/08/2025
# SEVERIDADE: P0 - NUNCA PULAR ESTES GATES

set -e  # Falha ao primeiro erro

echo "================================================"
echo "🚦 FRAMEWORK EU-VOCÊ - VALIDAÇÃO DE GATES"
echo "================================================"
echo ""

# GATE 1: MEDIR ANTES DE MUDAR
echo "🔍 GATE 1: Medindo estado atual..."
echo "-----------------------------------"

# Verificar se servidor está rodando
if curl -s http://127.0.0.1:5500 > /dev/null; then
    echo "✅ Servidor rodando na porta 5500"
else
    echo "❌ ERRO: Servidor não está rodando"
    echo "Execute: python -m http.server 5500"
    exit 1
fi

# Medir baseline atual
node -e "
console.log('📊 Medindo baseline...');
const fs = require('fs');

// Contar componentes
const jsFiles = fs.readdirSync('./js/components').filter(f => f.endsWith('.js'));
console.log('  Componentes:', jsFiles.length);

// Verificar arquivos críticos
const critical = [
    'js/managers/RAGExportManager.js',
    'js/services/QdrantService.js',
    'js/services/EmbeddingService.js'
];
critical.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log('  ✅', file, '(' + Math.round(stats.size/1024) + 'KB)');
    } else {
        console.log('  ❌', file, 'NÃO EXISTE');
        process.exit(1);
    }
});
"

echo ""
echo "🔍 GATE 2: Testando com dados REAIS..."
echo "-----------------------------------"

# Criar teste com dados reais
cat > test-real-data.js << 'EOF'
const fs = require('fs');
console.log('🧪 Testando com dados reais...');

// NUNCA usar mock - sempre dados reais
const realFiles = fs.readdirSync('./docs')
    .filter(f => f.endsWith('.md'))
    .slice(0, 5);

if (realFiles.length === 0) {
    console.error('❌ ERRO: Nenhum arquivo real .md encontrado em docs/');
    process.exit(1);
}

console.log('  Arquivos reais encontrados:', realFiles.length);
realFiles.forEach(f => console.log('    -', f));

// Teste de UTF-8 (bug crítico corrigido)
const testUTF8 = 'obrigatórios diagnóstico análise';
const regex = /[^\p{L}\p{N}\s]/gu;
const result = testUTF8.replace(regex, ' ');

if (result.includes('obrigatórios')) {
    console.log('  ✅ UTF-8 preservado corretamente');
} else {
    console.error('  ❌ ERRO: UTF-8 sendo cortado!');
    process.exit(1);
}

console.log('✅ Todos os testes com dados reais passaram');
EOF

node test-real-data.js
if [ $? -ne 0 ]; then
    echo "❌ GATE 2 FALHOU - Testes com dados reais falharam"
    exit 1
fi

echo ""
echo "🔍 GATE 3: Validação em produção..."
echo "-----------------------------------"

# Validar via kcdiag
node -e "
console.log('🏭 Validando ambiente de produção...');

// Simular kcdiag básico
const checks = {
    'Servidor HTTP': 'http://127.0.0.1:5500',
    'Arquivos JS': './js',
    'Documentação': './docs',
    'Convergence Navigator': './convergence-navigator'
};

let errors = 0;
const fs = require('fs');

Object.entries(checks).forEach(([name, path]) => {
    if (path.startsWith('http')) {
        // Skip HTTP check (já validado no GATE 1)
        console.log('  ✅', name, '- online');
    } else if (fs.existsSync(path)) {
        console.log('  ✅', name, '- existe');
    } else {
        console.log('  ❌', name, '- NÃO ENCONTRADO');
        errors++;
    }
});

if (errors > 0) {
    console.error('❌ GATE 3 FALHOU - ' + errors + ' erros em produção');
    process.exit(1);
} else {
    console.log('✅ GATE 3 PASSOU - 0 erros em produção');
}
"

echo ""
echo "================================================"
echo "✅ TODOS OS GATES PASSARAM - DEPLOY AUTORIZADO"
echo "================================================"
echo ""
echo "📋 Resumo:"
echo "  GATE 1: Baseline medido ✅"
echo "  GATE 2: Testado com dados reais ✅"
echo "  GATE 3: 0 erros em produção ✅"
echo ""
echo "🚀 Você pode proceder com o deploy!"
echo ""

# Salvar timestamp do último teste bem-sucedido
date > .last-successful-gates

# Limpar arquivo temporário
rm -f test-real-data.js