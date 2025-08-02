#!/bin/bash
# Guardian Backup Script
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".claude-backups/$TIMESTAMP"

echo "🔄 Criando backup em $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Copiar arquivos principais (adicione seus arquivos importantes aqui)
cp -r src "$BACKUP_DIR/" 2>/dev/null
cp -r components "$BACKUP_DIR/" 2>/dev/null
cp -r lib "$BACKUP_DIR/" 2>/dev/null
cp package.json "$BACKUP_DIR/" 2>/dev/null
cp .env "$BACKUP_DIR/" 2>/dev/null

echo "✅ Backup completo!"
