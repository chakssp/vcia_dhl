#!/bin/bash
# run-tests.sh
# Script wrapper para execução de testes
# AIDEV-NOTE: Facilita execução em diferentes ambientes

# Detectar sistema operacional
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    NODE_CMD="node.exe"
    BASE_PATH="F:/vcia-1307/vcia_dhl/mdesk"
else
    # Linux/Mac/Container
    NODE_CMD="node"
    BASE_PATH="/workspace/vcia_dhl/mdesk"
fi

# Função de ajuda
show_help() {
    echo "Uso: ./run-tests.sh [opção]"
    echo ""
    echo "Opções:"
    echo "  full       - Executa teste completo (enhanced)"
    echo "  light      - Executa teste leve (sandbox)"
    echo "  quick      - Executa teste rápido (auto-detecta)"
    echo "  analyze    - Executa analisador estático"
    echo "  fix        - Executa teste completo com correções"
    echo "  clean      - Limpa relatórios antigos"
    echo "  help       - Mostra esta ajuda"
    echo ""
    echo "Exemplo: ./run-tests.sh full"
}

# Processar argumentos
case "$1" in
    full)
        echo "🚀 Executando teste completo..."
        cd "$BASE_PATH/test-systems"
        $NODE_CMD enhanced-test-system.js
        ;;
    light)
        echo "🚀 Executando teste leve..."
        cd "$BASE_PATH/test-systems"
        $NODE_CMD lightweight-test-system.js
        ;;
    quick)
        echo "🚀 Executando teste rápido..."
        cd "$BASE_PATH/scripts"
        $NODE_CMD quick-test.js
        ;;
    analyze)
        echo "🔍 Executando análise estática..."
        cd "$BASE_PATH/test-systems"
        $NODE_CMD claude-static-analyzer.js
        ;;
    fix)
        echo "🔧 Executando teste com correções..."
        cd "$BASE_PATH/test-systems"
        $NODE_CMD enhanced-test-system.js --fix
        ;;
    clean)
        echo "🧹 Limpando relatórios..."
        rm -f "$BASE_PATH/reports"/*
        echo "✅ Relatórios limpos!"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Opção inválida: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

# Mostrar localização dos relatórios
if [[ "$1" != "help" && "$1" != "clean" ]]; then
    echo ""
    echo "📊 Relatórios salvos em: $BASE_PATH/reports/"
    ls -la "$BASE_PATH/reports/" 2>/dev/null | grep -E "\.(json|txt)$"
fi