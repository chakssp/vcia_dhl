#!/bin/bash
# Guardian Backup Script
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".claude-backups/$TIMESTAMP"

echo "🔄 Criando backup em $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Copiar arquivos principais do Knowledge Consolidator
cp -r js "$BACKUP_DIR/" 2>/dev/null
cp -r css "$BACKUP_DIR/" 2>/dev/null
cp -r docs "$BACKUP_DIR/" 2>/dev/null
cp -r scripts "$BACKUP_DIR/" 2>/dev/null
cp -r test "$BACKUP_DIR/" 2>/dev/null
cp -r agents_output "$BACKUP_DIR/" 2>/dev/null

# Copiar arquivos de configuração
cp *.html "$BACKUP_DIR/" 2>/dev/null
cp *.json "$BACKUP_DIR/" 2>/dev/null
cp *.md "$BACKUP_DIR/" 2>/dev/null
cp .gitignore "$BACKUP_DIR/" 2>/dev/null

# Salvar informação do Git
echo "Git Status:" > "$BACKUP_DIR/BACKUP_INFO.txt"
git status --short >> "$BACKUP_DIR/BACKUP_INFO.txt" 2>/dev/null
echo "" >> "$BACKUP_DIR/BACKUP_INFO.txt"
echo "Last Commit:" >> "$BACKUP_DIR/BACKUP_INFO.txt"
git log --oneline -1 >> "$BACKUP_DIR/BACKUP_INFO.txt" 2>/dev/null

echo "✅ Backup completo!"
echo "📁 Salvo em: $BACKUP_DIR"
