#!/bin/bash

echo "==================================="
echo "🔄 ROLLBACK PARA VERSÃO ESTÁVEL"
echo "==================================="
echo ""
echo "Este script oferece opções para voltar a uma versão estável do sistema"
echo ""
echo "📊 Informações dos commits:"
echo "- Última versão estável: b7992b8 (29/07/2025 - mvDistribution)"
echo "- Implementação problemática: 7be21f5 até 5c032ca (01/08/2025)"
echo ""
echo "Escolha uma opção:"
echo ""
echo "1) Criar backup e voltar ao commit estável (RECOMENDADO)"
echo "2) Apenas desabilitar componentes UnifiedConfidence"
echo "3) Ver status atual do Git"
echo "4) Cancelar"
echo ""
read -p "Digite sua escolha (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📁 Criando backup do estado atual..."
        git stash save "Backup antes de rollback - $(date +%Y%m%d_%H%M%S)"
        
        echo "🔄 Voltando para o commit estável..."
        git checkout b7992b8
        
        echo ""
        echo "✅ Rollback concluído!"
        echo "📌 Para voltar ao estado anterior: git stash pop"
        ;;
        
    2)
        echo ""
        echo "🔧 Desabilitando componentes..."
        node scripts/disable-unified-confidence.js
        ;;
        
    3)
        echo ""
        echo "📊 Status atual:"
        git status
        echo ""
        echo "📝 Últimos 10 commits:"
        git log --oneline -10
        ;;
        
    4)
        echo "❌ Operação cancelada"
        exit 0
        ;;
        
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac