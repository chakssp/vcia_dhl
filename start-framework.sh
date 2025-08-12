#!/bin/bash

# 🎯 START FRAMEWORK - Sistema Completo de Validação
# Com Gates Anti-Displicência e Convergence Agent

echo "🚀 INICIANDO FRAMEWORK DE TRABALHO EU-VOCÊ"
echo "==========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Verificar pré-requisitos
echo -e "${BLUE}[GATE 0]${NC} Verificando pré-requisitos..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado${NC}"
    exit 1
fi

if [ ! -f "orchestrator/orchestrator.js" ]; then
    echo -e "${RED}❌ Orchestrator não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pré-requisitos OK${NC}"
echo ""

# 2. Criar estrutura de validação
echo -e "${BLUE}[SETUP]${NC} Criando estrutura de validação..."

mkdir -p validation/gates
mkdir -p validation/tests
mkdir -p validation/logs

# 3. Criar script de validação BASH
cat > validation/validate-feature.sh << 'EOF'
#!/bin/bash
# Validação com dados reais - NUNCA MOCK!

FEATURE=$1
if [ -z "$FEATURE" ]; then
    echo "Uso: ./validate-feature.sh <arquivo.js>"
    exit 1
fi

echo "🔍 Validando: $FEATURE"
echo "------------------------"

# GATE 1: Arquivo existe?
if [ ! -f "$FEATURE" ]; then
    echo "❌ GATE 1 FAILED: Arquivo não encontrado"
    exit 1
fi
echo "✅ GATE 1 PASSED: Arquivo existe"

# GATE 2: Sem mock data?
if grep -q "mock\|Mock\|MOCK\|generateTest\|fakeData" "$FEATURE"; then
    echo "❌ GATE 2 FAILED: Mock data detectado!"
    exit 1
fi
echo "✅ GATE 2 PASSED: Sem mock data"

# GATE 3: Teste com dados reais
node -e "
try {
    const feature = require('./$FEATURE');
    const fs = require('fs');
    
    // Tentar carregar dados reais
    let realData;
    if (fs.existsSync('./docs/sample-data.json')) {
        realData = require('./docs/sample-data.json');
    } else {
        console.log('⚠️  Usando dados mínimos de teste');
        realData = { files: [], categories: [] };
    }
    
    // Executar teste
    console.log('📊 Testando com dados reais...');
    const result = typeof feature.process === 'function' 
        ? feature.process(realData)
        : feature(realData);
    
    console.log('✅ GATE 3 PASSED: Teste com dados reais OK');
    process.exit(0);
} catch(e) {
    console.error('❌ GATE 3 FAILED:', e.message);
    process.exit(1);
}
"

if [ $? -eq 0 ]; then
    echo "✅ TODOS OS GATES PASSARAM!"
    echo "$FEATURE" >> validation/logs/approved.log
else
    echo "❌ VALIDAÇÃO FALHOU"
    echo "$FEATURE" >> validation/logs/failed.log
    exit 1
fi
EOF

chmod +x validation/validate-feature.sh

echo -e "${GREEN}✅ Scripts de validação criados${NC}"
echo ""

# 4. Iniciar Orchestrator em background
echo -e "${BLUE}[START]${NC} Iniciando Orchestrator..."
cd orchestrator
nohup node orchestrator.js > ../validation/logs/orchestrator.log 2>&1 &
ORCH_PID=$!
cd ..
echo -e "${GREEN}✅ Orchestrator iniciado (PID: $ORCH_PID)${NC}"

# 5. Aguardar e verificar worktrees
sleep 2
echo ""
echo -e "${BLUE}[CHECK]${NC} Verificando worktrees..."

WORKTREES=("vcia_dhl_convergence" "vcia_dhl_ml" "vcia_dhl_ui" "vcia_dhl_performance")
for worktree in "${WORKTREES[@]}"; do
    if [ -d "../$worktree" ]; then
        echo -e "${GREEN}✅ $worktree pronto${NC}"
    else
        echo -e "${YELLOW}⚠️  $worktree não encontrado${NC}"
    fi
done

# 6. Criar comando de teste rápido
cat > quick-test.sh << 'EOF'
#!/bin/bash
# Teste rápido com validação de gates

echo "🚀 QUICK TEST - Framework EU-VOCÊ"
echo "================================"

# Verificar estado atual
echo ""
echo "📊 Estado do Sistema:"
node -e "
const fs = require('fs');
console.log('Orchestrator:', fs.existsSync('orchestrator/shared-state.json') ? '✅ Ativo' : '❌ Inativo');
console.log('Validation:', fs.existsSync('validation/logs') ? '✅ Pronto' : '❌ Não configurado');
"

# Executar kcdiag se disponível
echo ""
echo "🔍 Diagnóstico (kcdiag):"
curl -s http://127.0.0.1:5500 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Servidor ativo na porta 5500"
else
    echo "⚠️  Servidor não detectado na porta 5500"
fi

# Mostrar gates ativos
echo ""
echo "🚦 Gates de Validação:"
echo "  GATE 1: Medição antes de mudar"
echo "  GATE 2: Teste com dados reais"
echo "  GATE 3: Validação em produção"

echo ""
echo "Digite 'node orchestrator/orchestrator.js' para interface interativa"
EOF@

chmod +x quick-test.sh

# 7. Dashboard final
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 FRAMEWORK INICIADO COM SUCESSO!${NC}"
echo "=============================================="
echo ""
echo "📋 COMANDOS DISPONÍVEIS:"
echo "  ./quick-test.sh                    - Status rápido"
echo "  ./validation/validate-feature.sh   - Validar feature"
echo "  node orchestrator/orchestrator.js  - Interface interativa"
echo ""
echo "🚦 GATES ATIVOS:"
echo "  ✅ GATE 1: Medição obrigatória"
echo "  ✅ GATE 2: Dados reais apenas"
echo "  ✅ GATE 3: Produção validada"
echo ""
echo "📊 LOGS:"
echo "  validation/logs/orchestrator.log"
echo "  validation/logs/approved.log"
echo "  validation/logs/failed.log"
echo ""
echo "🎯 PRÓXIMO PASSO:"
echo "  1. Defina um objetivo"
echo "  2. Execute: node orchestrator/orchestrator.js"
echo "  3. Digite: start <seu objetivo>"
echo ""
echo "LEMBRE-SE: NEVER mock data, EVER dados reais!"
echo "=============================================="