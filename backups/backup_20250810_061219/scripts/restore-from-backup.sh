#!/bin/bash

echo "========================================"
echo "🔄 RESTAURAR ARQUIVOS DO BACKUP"
echo "========================================"
echo ""
echo "Este script restaura arquivos do backup de 01/08/2025 07:10"
echo "ANTES da implementação do UnifiedConfidenceSystem"
echo ""
echo "Arquivos a serem restaurados:"
echo "- index.html"
echo "- RAGExportManager.js"
echo "- IntelligenceEnrichmentPipeline.js"
echo "- ConvergenceAnalysisService.js"
echo ""
echo "⚠️  ATENÇÃO: Isso sobrescreverá os arquivos atuais!"
echo ""
read -p "Deseja continuar? (s/n): " confirm

if [ "$confirm" != "s" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

# Criar backup dos arquivos atuais
echo ""
echo "📁 Criando backup dos arquivos atuais..."
mkdir -p backups/backup_before_restore_$(date +%Y%m%d_%H%M%S)

cp index.html backups/backup_before_restore_$(date +%Y%m%d_%H%M%S)/
cp js/managers/RAGExportManager.js backups/backup_before_restore_$(date +%Y%m%d_%H%M%S)/
cp js/services/IntelligenceEnrichmentPipeline.js backups/backup_before_restore_$(date +%Y%m%d_%H%M%S)/
cp js/services/ConvergenceAnalysisService.js backups/backup_before_restore_$(date +%Y%m%d_%H%M%S)/

# Restaurar do backup
echo ""
echo "🔄 Restaurando arquivos do backup..."

cp backups/backup_20250801_071056/index.html ./
cp backups/backup_20250801_071056/RAGExportManager.js js/managers/
cp backups/backup_20250801_071056/IntelligenceEnrichmentPipeline.js js/services/
cp backups/backup_20250801_071056/ConvergenceAnalysisService.js js/services/

echo ""
echo "✅ Arquivos restaurados com sucesso!"
echo ""
echo "📌 Próximos passos:"
echo "1. Abrir http://127.0.0.1:5500"
echo "2. Executar kcdiag() no console"
echo "3. Verificar se os erros pararam"
echo ""
echo "📌 Para reverter esta restauração:"
echo "   Seus arquivos atuais foram salvos em: backups/backup_before_restore_*"