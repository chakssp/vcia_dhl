# Estrutura Organizada do MDesk - VCIA_DHL

## 📁 Estrutura de Pastas

```
mdesk/
├── test-systems/           # Sistemas de teste automatizado
│   ├── auto-test-system.js          # Sistema com Playwright (requer deps)
│   ├── lightweight-test-system.js   # Sistema leve sem deps externas
│   ├── enhanced-test-system.js      # Sistema com validação AIDEV
│   └── claude-static-analyzer.js    # Analisador estático
│
├── scripts/               # Scripts utilitários
│   ├── quick-test.js               # Script de teste rápido
│   └── run-tests.sh                # Shell script para execução
│
├── docs/                  # Documentação
│   ├── claude-workflow-instructions.md   # Instruções para Claude Code
│   ├── anchor-comments-guide.md          # Guia de AIDEV comments
│   └── test-system-overview.md           # Visão geral dos sistemas
│
└── reports/              # Relatórios gerados (criado automaticamente)
    ├── test-report.json
    ├── anchor-comments-report.txt
    └── suggested-fixes.json
```

## 🚀 Como Usar

### 1. Sistema de Teste Aprimorado (Recomendado)
```bash
cd mdesk/test-systems
node enhanced-test-system.js --fix
```

### 2. Sistema Leve (Para Sandbox)
```bash
cd mdesk/test-systems
node lightweight-test-system.js
```

### 3. Análise Estática Rápida
```bash
cd mdesk/scripts
node quick-test.js
```

## 📋 Funcionalidades

### Enhanced Test System
- ✅ Validação completa de AIDEV comments
- ✅ Verificação de estrutura de arquivos
- ✅ Análise de ordem de carregamento
- ✅ Detecção de erros de sintaxe
- ✅ Auto-correção com templates AIDEV

### Lightweight Test System
- ✅ Funciona sem dependências externas
- ✅ Ideal para ambientes restritos (sandbox)
- ✅ Análise estática de código
- ✅ Verificação de namespace KC

### Claude Static Analyzer
- ✅ Comandos shell para análise rápida
- ✅ Integração com filesystem MCP
- ✅ Checklist de verificações

## 🔧 Configuração

Todos os sistemas estão pré-configurados para trabalhar com a estrutura do projeto VCIA_DHL.
Os caminhos são relativos, então execute sempre a partir da raiz do projeto.

## 📊 Relatórios

Os relatórios são salvos automaticamente em `mdesk/reports/`:
- `test-report.json` - Relatório completo em JSON
- `anchor-comments-report.txt` - Relatório de AIDEV comments
- `suggested-fixes.json` - Correções sugeridas

## 🤖 Para Claude Code

Use o comando abaixo para executar testes automaticamente:
```
claud -p "Execute cd F:\vcia-1307\vcia_dhl\mdesk\test-systems && node enhanced-test-system.js"
```