#!/bin/bash
# TESTE RÁPIDO - FRAMEWORK EU-VOCÊ
# Executa validação básica antes de qualquer mudança

echo "🚀 TESTE RÁPIDO - FRAMEWORK EU-VOCÊ"
echo "===================================="

# Verificar se foi passado um arquivo para testar
if [ $# -eq 0 ]; then
    echo "Uso: ./quick-test.sh <arquivo.js>"
    echo "Exemplo: ./quick-test.sh js/managers/RAGExportManager.js"
    exit 1
fi

FILE=$1

# Verificar se arquivo existe
if [ ! -f "$FILE" ]; then
    echo "❌ Arquivo não encontrado: $FILE"
    exit 1
fi

echo "📋 Testando: $FILE"
echo ""

# TESTE 1: Sintaxe JavaScript
echo "1️⃣ Verificando sintaxe..."
node -c "$FILE" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Sintaxe válida"
else
    echo "   ❌ ERRO de sintaxe!"
    node -c "$FILE"
    exit 1
fi

# TESTE 2: Verificar UTF-8 handling
echo "2️⃣ Verificando suporte UTF-8..."
if grep -q '\[\\^\\\\w\\\\s\]' "$FILE"; then
    echo "   ⚠️ AVISO: Regex problemático detectado!"
    echo "   Use: [^\p{L}\p{N}\s]/gu ao invés de [^\w\s]"
else
    echo "   ✅ Sem problemas de UTF-8 detectados"
fi

# TESTE 3: Detectar mock data
echo "3️⃣ Verificando mock data..."
MOCK_COUNT=$(grep -i "mock\|stub\|fake\|dummy" "$FILE" | wc -l)
if [ $MOCK_COUNT -gt 0 ]; then
    echo "   ⚠️ AVISO: $MOCK_COUNT referências a mock/stub encontradas"
    echo "   LEMBRE-SE: Usar dados REAIS sempre!"
else
    echo "   ✅ Nenhum mock data detectado"
fi

# TESTE 4: Verificar console.log debug
echo "4️⃣ Verificando debug logs..."
DEBUG_COUNT=$(grep "console\.log" "$FILE" | grep -v "//" | wc -l)
if [ $DEBUG_COUNT -gt 5 ]; then
    echo "   ⚠️ AVISO: $DEBUG_COUNT console.log encontrados"
    echo "   Considere remover logs desnecessários"
else
    echo "   ✅ Logs em quantidade aceitável"
fi

# TESTE 5: Complexidade (linhas muito longas)
echo "5️⃣ Verificando complexidade..."
LONG_LINES=$(awk 'length > 120' "$FILE" | wc -l)
if [ $LONG_LINES -gt 10 ]; then
    echo "   ⚠️ AVISO: $LONG_LINES linhas muito longas (>120 chars)"
else
    echo "   ✅ Código bem formatado"
fi

echo ""
echo "===================================="
echo "📊 RESULTADO DO TESTE RÁPIDO"
echo "===================================="

if [ $MOCK_COUNT -eq 0 ] && [ $DEBUG_COUNT -le 5 ] && [ $LONG_LINES -le 10 ]; then
    echo "✅ PASSOU - Arquivo pronto para próximo gate"
else
    echo "⚠️ AVISOS DETECTADOS - Revise antes de continuar"
fi

echo ""
echo "💡 Próximo passo: ./validate-gates.sh"