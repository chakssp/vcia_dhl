# 🚀 Claude Code + VSCode - Setup Definitivo com MCPs Persistentes

## 🎯 O Problema Resolvido

- ✅ **Configurações persistentes** (não dependem mais do devcontainer)
- ✅ **MCPs instalados localmente** (sobrevivem a reinicializações)
- ✅ **Integração total com VSCode** (produtividade máxima)
- ✅ **Todos os MCPs funcionando** (incluindo Magic UI e Graphiti)

## 📦 MCPs Incluídos

### Core MCPs
- **filesystem** - Acesso completo aos arquivos
- **memory** - Memória persistente entre sessões
- **github** - Integração com GitHub (token já configurado)
- **brave-search** - Pesquisa web (API key já configurada)
- **everything** - Busca rápida de arquivos
- **sequential-thinking** - Raciocínio estruturado
- **n8n-mcp** - Integração com sua VPS

### Novos MCPs
- **Magic UI** - Componentes de UI avançados
- **Graphiti** - Grafos de conhecimento com Neo4j

## ⚡ Instalação Rápida (5 minutos)

### 1️⃣ Execute como Admin
```batch
cd F:\site_vps\claude-code-setup
INSTALAR-TUDO.bat
```

### 2️⃣ Faça login no Claude Code
```bash
claude login
```

### 3️⃣ Pronto! Use no VSCode
```bash
# Abra seu projeto
cd F:\vcia-1307\vcia_dhl

# Inicie Claude Code
claude
```

## 🎯 Comandos de Produtividade no VSCode

### Comandos Essenciais
```bash
/mcp                 # Ver todos MCPs disponíveis
/permissions         # Gerenciar permissões de acesso
/doctor             # Diagnosticar problemas
/memory             # Usar memória persistente
/todo               # Gerenciar tarefas
/continue           # Continuar conversa anterior
```

### Atalhos de Produtividade
- **Tab** - Autocompletar arquivos
- **Shift+Tab** - Toggle auto-accept
- **Ctrl+\\** - Desfazer última ação
- **@arquivo** - Mencionar arquivo direto
- **#texto** - Adicionar à memória

### Workflow com MCPs

#### 1. Análise de Código com Memory
```
# Salvar contexto do projeto
/memory add "Projeto VCI/A usa arquitetura de triplas semânticas"

# Recuperar depois
/memory search "triplas"
```

#### 2. Busca Rápida com Everything
```
# Encontrar arquivos
Use o MCP everything para buscar "AnalysisManager"
```

#### 3. Desenvolvimento com Magic UI
```
# Gerar componente
Use Magic UI para criar um dashboard com animações
```

#### 4. Grafos com Graphiti
```
# Criar grafo de conhecimento
Use Graphiti para mapear relações entre componentes
```

## 🔧 Estrutura de Arquivos

```
~/                                    # Home do usuário
├── .claude/                          # Configurações persistentes
│   ├── claude_desktop_config.json    # MCPs configurados
│   ├── settings.json                 # Permissões e preferências
│   └── commands/                     # Comandos customizados
│
├── mcp-servers/                      # MCPs instalados
│   ├── servers/                      # MCPs oficiais
│   ├── magicui/                      # Magic UI MCP
│   ├── graphiti/                     # Graphiti MCP
│   ├── start-neo4j.ps1              # Iniciar Neo4j
│   └── test-mcps.ps1                # Testar MCPs
│
└── start-claude-vscode.sh/bat        # Launcher rápido
```

## 🚨 Troubleshooting

### "MCP não aparece"
```bash
# Verificar instalação
claude /doctor

# Recarregar MCPs
claude /mcp reload
```

### "Permissão negada"
```bash
# Adicionar permissão
claude /permissions add FS(F:\site_vps\*)
```

### "Neo4j não conecta" (Graphiti)
```powershell
# Iniciar Neo4j
cd ~/mcp-servers
.\start-neo4j.ps1

# Verificar
docker ps | grep neo4j
```

### "Magic UI não funciona"
```bash
# Reinstalar
npm install -g @magicuidesign/mcp --force

# Verificar
/mcp tools magicui
```

## 💡 Dicas Pro

### 1. Configurar Aliases
```bash
# No .bashrc ou perfil PowerShell
alias cv='claude'
alias cvs='claude --continue'
```

### 2. Templates Customizados
Crie arquivos em `~/.claude/commands/`:
- `sprint.md` - Template de sprint
- `review.md` - Template de review
- `debug.md` - Template de debug

### 3. Integração com VSCode Tasks
```json
// .vscode/tasks.json
{
  "tasks": [{
    "label": "Claude Analyze",
    "type": "shell",
    "command": "claude",
    "args": ["--print", "Analyze ${file}"]
  }]
}
```

### 4. Git Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
claude --print "Review changes" | grep -q "APPROVED" || exit 1
```

## 🎯 Workflow Completo de Desenvolvimento

### 1. Iniciar Sessão
```bash
cd F:\vcia-1307\vcia_dhl
claude --continue  # Continua de onde parou
```

### 2. Análise Inicial
```
/memory search "projeto"
@CLAUDE.md @RESUME-STATUS.md
Qual o status atual do projeto?
```

### 3. Desenvolvimento
```
Use filesystem MCP para ler AnalysisManager.js
Implemente a integração com Ollama
Teste com exemplos práticos
```

### 4. Salvar Progresso
```
/memory add "Implementei integração Ollama em AnalysisManager"
/todo add "Testar com diferentes modelos"
```

## 📞 Suporte

- **Logs**: `~/.claude/logs/`
- **Debug**: `claude --mcp-debug`
- **Reset**: Delete `~/.claude` e rode setup novamente

---

**Criado por Brito** - Finalmente uma configuração que PERSISTE! 🎉

*PS: Se ainda der problema, me manda o output de `claude /doctor`*