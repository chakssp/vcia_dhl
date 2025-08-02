#!/bin/bash

# 🛡️ Guardian Mode Setup Script
# Este script configura o Guardian Mode no seu projeto VSCode

echo "🛡️ Iniciando configuração do Guardian Mode..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para criar arquivo com confirmação
create_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}⚠️  $file já existe.${NC}"
        read -p "Deseja sobrescrever? (s/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            echo -e "${YELLOW}Pulando $file...${NC}"
            return
        fi
    fi
    
    echo -e "${GREEN}✅ Criando $description...${NC}"
}

# 1. Criar estrutura de diretórios
echo "📁 Criando estrutura de diretórios..."
mkdir -p .vscode
mkdir -p .claude-backups
mkdir -p scripts

# 2. Criar arquivos de configuração
create_file ".claude-rules.md" "Regras do Guardian"
if [ $? -eq 0 ]; then
    # Copiar conteúdo do artifact .claude-rules.md aqui
    echo "Por favor, copie o conteúdo do artifact '.claude-rules.md' para este arquivo"
fi

create_file ".claude-monitoring.json" "Configuração de Monitoramento"
if [ $? -eq 0 ]; then
    # Copiar conteúdo do artifact .claude-monitoring.json aqui
    echo "Por favor, copie o conteúdo do artifact '.claude-monitoring.json' para este arquivo"
fi

create_file ".vscode/settings.json" "Configurações do VSCode"
if [ $? -eq 0 ]; then
    # Copiar conteúdo do artifact settings.json aqui
    echo "Por favor, copie o conteúdo do artifact 'settings.json' para .vscode/settings.json"
fi

create_file ".claude-guardian-prompt.md" "Template de Prompt"
if [ $? -eq 0 ]; then
    # Copiar conteúdo do artifact prompt aqui
    echo "Por favor, copie o conteúdo do artifact '.claude-guardian-prompt.md' para este arquivo"
fi

# 3. Criar arquivos de log vazios
touch .claude-decisions.log
touch .claude-metrics.json
echo "{\"sessions\": []}" > .claude-metrics.json

# 4. Adicionar ao .gitignore
echo -e "\n# Guardian Mode Files" >> .gitignore
echo ".claude-decisions.log" >> .gitignore
echo ".claude-metrics.json" >> .gitignore
echo ".claude-backups/" >> .gitignore
echo -e "${GREEN}✅ Arquivos adicionados ao .gitignore${NC}"

# 5. Criar script de backup
cat > scripts/guardian-backup.sh << 'EOF'
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
EOF

chmod +x scripts/guardian-backup.sh
echo -e "${GREEN}✅ Script de backup criado${NC}"

# 6. Criar alias para facilitar uso
cat > scripts/guardian-commands.sh << 'EOF'
#!/bin/bash
# Guardian Mode Commands

case "$1" in
    status)
        echo "🛡️ Guardian Mode Status:"
        echo "Rules: $([ -f .claude-rules.md ] && echo "✅" || echo "❌") .claude-rules.md"
        echo "Config: $([ -f .claude-monitoring.json ] && echo "✅" || echo "❌") .claude-monitoring.json"
        echo "VSCode: $([ -f .vscode/settings.json ] && echo "✅" || echo "❌") settings.json"
        echo "Prompt: $([ -f .claude-guardian-prompt.md ] && echo "✅" || echo "❌") prompt template"
        ;;
    backup)
        ./scripts/guardian-backup.sh
        ;;
    clean-logs)
        > .claude-decisions.log
        echo "{\"sessions\": []}" > .claude-metrics.json
        echo "🧹 Logs limpos!"
        ;;
    *)
        echo "Uso: $0 {status|backup|clean-logs}"
        ;;
esac
EOF

chmod +x scripts/guardian-commands.sh
echo -e "${GREEN}✅ Comandos Guardian criados${NC}"

# 7. Verificação final
echo -e "\n${GREEN}🎉 Guardian Mode configurado com sucesso!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "\n📋 ${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo "1. Copie o conteúdo dos artifacts para os arquivos criados"
echo "2. Ajuste os caminhos no script de backup (linha 45-49)"
echo "3. Abra o Claude Code e use o prompt em .claude-guardian-prompt.md"
echo -e "\n🔧 ${YELLOW}COMANDOS ÚTEIS:${NC}"
echo "./scripts/guardian-commands.sh status  - Verificar instalação"
echo "./scripts/guardian-commands.sh backup  - Criar backup"
echo "./scripts/guardian-commands.sh clean-logs - Limpar logs"
echo -e "\n${RED}⚠️  IMPORTANTE:${NC}"
echo "SEMPRE inicie sessões do Claude Code com o prompt do Guardian!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"