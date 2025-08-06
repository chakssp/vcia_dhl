# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the specification for "Consolidador de Conhecimento Pessoal" (Personal Knowledge Consolidator) - an intelligent system for automated discovery, analysis, and structuring of decisive moments in personal knowledge bases.

**Vision:** Transform scattered knowledge into actionable insights, establishing a pre-structured foundation that will feed IA automation flows for internal project proposition and strategic decision-making.

## 🚀 ESTADO ATUAL DO PROJETO - 06/08/2025

### 📊 Status Geral
- **Sistema 100% Funcional**: Todas as 10 Waves implementadas e em produção
- **Sprint Atual**: SISTEMA ESTÁVEL COM BACKUP COMPLETO
- **Última Atualização**: 06/08/2025 01:30 - Sistema de Backup 4 Camadas implementado
- **Estrutura**: Projeto reorganizado com separação clara entre produção e temporários

### 🔍 Observações Importantes
- Data Atual: 06/08/2025 01:30 BRT
- **✅ RESOLVIDO**: Rollback bem-sucedido após loop de correções
- **✅ IMPLEMENTADO**: Sistema de Backup com 4 camadas de proteção
- **🛡️ PROTEÇÃO TOTAL**: Git + Backup Local + Branches + Memória MCP

### 🎯 Conquistas Principais
1. **Knowledge Consolidator Base** (Waves 1-4) ✅
   - Descoberta automática com File System Access API
   - Preview inteligente com 70% economia de tokens
   - Sistema de filtros avançados
   - Análise IA com múltiplos providers

2. **ML Confidence Integration** (Waves 6-9) ✅
   - Sistema completo de confiança ML
   - Shadow mode para validação
   - Dashboard executivo implementado
   - Performance otimizada com Worker Pool

3. **Production Deployment** (Wave 10) ✅
   - Zero downtime deployment
   - A/B Testing Framework
   - Canary Controller
   - Sistema de rollback automático

### 📁 Estrutura Atualizada
```
vcia_dhl/
├── index.html           # App principal
├── js/                  # Código de produção organizado
├── css/                 # Estilos organizados
├── docs/                # Documentação completa
├── agents_output/       # Saídas das 10 Waves
├── test/                # Testes organizados
└── temp/                # Arquivos temporários (ignorados no git)
```

### 🔧 Serviços Principais Ativos
- **EmbeddingService**: Embeddings com Ollama (768 dimensões)
- **QdrantService**: Vector DB em http://qdr.vcia.com.br:6333
- **SimilaritySearchService**: Busca semântica híbrida
- **TripleStoreService**: Extração de triplas semânticas
- **ML Confidence System**: Sistema completo de confiança

## 🚨 PROTOCOLO DE INÍCIO DE SESSÃO OBRIGATÓRIO - PADRÃO EVER

**⚠️ CRÍTICO P0**: O não cumprimento deste protocolo EVER causa RETRABALHO CONSTANTE e PERDA TOTAL DE CONTEXTO

### 🔴 PADRÃO EVER (Enhance Validation & Extensive Recording)

**OBRIGATÓRIO EM TODA SESSÃO**:

1. **BUSCA PRÉVIA**: Use `mcp__memory-serve__search_nodes` com query "EVER checkpoint sessão contexto"
2. **TIMESTAMP**: Use `mcp__time__get_current_time` para registro preciso
3. **LEITURA SEQUENCIAL**:
   - Leia @CLAUDE.md para entender as LEIS
   - Leia @RESUME-STATUS.md para estado atual
   - Leia @INICIO-SESSAO.md para protocolo
4. **CHECKPOINT INICIAL**: Crie entidade EVER-Session-[Data]-[Hora] na memória
5. **VALIDAÇÃO**: Execute kcdiag() em http://127.0.0.1:5500

**Comando padrão de início com EVER**:

```
1. Buscar contexto: mcp__memory-serve__search_nodes "EVER checkpoint"
2. Ler documentos: @CLAUDE.md, @RESUME-STATUS.md, @INICIO-SESSAO.md
3. Criar checkpoint: EVER-Session-YYYYMMDD-HHMM
4. Validar sistema: kcdiag() em http://127.0.0.1:5500
```

**FREQUÊNCIA**: A cada 30 minutos ou mudança significativa, criar novo checkpoint EVER

## 🛡️ SISTEMA DE BACKUP E VERSIONAMENTO - 4 CAMADAS

### Camada 1: Git com Tags
```bash
git tag -a funcional-YYYYMMDD -m "Sistema funcional"
git checkout funcional-06082025-sistema-estavel  # Voltar para versão estável
```

### Camada 2: Backup Local Automatizado
```batch
backup-local.bat  # Windows - Cria backup em F:\backups-vcia\
```

### Camada 3: Branch de Proteção
```bash
git checkout stable-backup-06082025  # Branch sempre com código estável
```

### Camada 4: Memória MCP
```javascript
// Salvar checkpoints para Claude rastrear
mcp__memory-serve__create_entities([{
    name: "CHECKPOINT-FUNCIONAL-" + Date.now(),
    entityType: "backup_checkpoint",
    observations: ["estado", "commit", "branch", "arquivos funcionando"]
}]);
```

### 📋 Protocolo Antes de Mudanças
1. Executar `backup-local.bat`
2. Criar tag se funcional: `git tag -a funcional-YYYYMMDD -m "desc"`
3. Salvar checkpoint na memória MCP
4. Atualizar `CHECKPOINT.md`

### 📍 Locais de Backup
- **Local**: `F:\backups-vcia\ultimo-funcional\`
- **Branch**: `stable-backup-06082025`
- **Tag**: `funcional-06082025-sistema-estavel`
- **Docs**: `README-BACKUP.md` e `CHECKPOINT.md`

# Estilo de Código

- Use ES modules (import/export)
- Destructuring quando possível
- Prefira const/let sobre var

# Workflow

- Sempre executar typechecking após mudanças
- Usar single tests para performance
- Criar feature branches do develop

## Server Maintenance Guidelines

### Procedimentos para Início de Sessão

- Ao iniciar a sessão Leia primeiro @CLAUDE.md para entender as LEIS do projeto
- Depois leia @RESUME-STATUS.md para entender o estado atual
- O servidor Five Server já está rodando na porta 5500 (gerenciado pelo usuário conforme @docs/servidor.md)
- Acesse http://127.0.0.1:5500
- Execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir

### Backup Guidelines

- Criar backup antes de mudanças grandes
  - Use o comando: `./scripts/guardian-commands.sh backup`

<LEIS>
### LEIS do projeto

### 🔴 LEI #14 - PADRÃO EVER OBRIGATÓRIO (03/08/2025) - CRÍTICO P0

**EVER (Enhance Validation & Extensive Recording)** é MANDATÓRIO para eliminar retrabalho:

1. **BUSCA SEMPRE**: Antes de qualquer ação, buscar contexto com `mcp__memory-serve__search_nodes`
2. **SALVE SEMPRE**: Após ações significativas, criar entidades EVER-[Tipo]-[Data]-[Hora]
3. **CONECTE SEMPRE**: Usar `create_relations` para conectar entidades relacionadas
4. **VALIDE SEMPRE**: Confirmar que salvamento foi bem-sucedido
5. **CHECKPOINT REGULAR**: A cada 30 minutos ou mudança crítica

**PENALIDADE**: Não seguir EVER = RETRABALHO GARANTIDO + PERDA DE CONTEXTO

### 📌 Recursos MCP (OBRIGATÓRIOS - 03/08/2025)

- **Recursos que DEVEM ser utilizados:**
  - **Puppeteer**: Automação de browser, testes E2E e screenshots
  - **Memory**: Sistema de memória persistente para contexto entre sessões
  - **Sequential-Think**: Análise estruturada de problemas complexos
  
- **Documentação Completa**: `/docs/10-guias-operacionais/recursos-mcp-obrigatorios.md`

- **⚠️ Problema Conhecido - Indexação de Arquivos**:
  - Arquivos recém-criados podem não aparecer com @
  - Solução: Use caminho completo ou comando Read
  - O cache do Claude Code pode demorar para atualizar

### 🎯 REGRA CRÍTICA - Fluxo de Confidence Scores (01/08/2025)

**LEI #13 - SCORES DURANTE DESCOBERTA**:
- Confidence scores DEVEM ser calculados DURANTE a descoberta de arquivos
- NUNCA implementar processamento posterior que cause fluxo invertido
- Usuário DEVE ver scores inteligentes em tempo real
- Sistema DEVE funcionar com inicialização lazy e fallbacks robustos
- **Documentação**: `/docs/12-correcao-fluxo-confidence/CORRECAO-FLUXO-INVERTIDO.md`
</LEIS>

**IMPORTANTE**: `Multi-Agent Orchestration Pattern`
The infinite command implements sophisticated parallel agent coordination:
1. **Specification Analysis** - Deeply understands the spec requirements
2. **Directory Reconnaissance** - Analyzes existing iterations to maintain uniqueness
3. **Parallel Sub-Agent Deployment** - Launches multiple agents with distinct creative directions
4. **Wave-Based Generation** - For infinite mode, manages successive agent waves
5. **Context Management** - Optimizes context usage across all agents

**IMPORTANTE**: `Key Implementation Details`
- Sub-agents receive complete context including spec, existing iterations, and unique creative assignments
- Parallel execution managed through Task tool with batch sizes optimized by count
- Progressive sophistication strategy for infinite mode waves
- Each iteration must be genuinely unique while maintaining spec compliance

### 🚨 Memory Warnings

- NEVER use PLAYWRIGHT WITHOUT AVOID AND PRIORITIZE USE CONSOLE MESSAGE TO DETERMINE YOUR PROGRESS OR FAIL. EVER USE the message console.

# IMPORTANT
- Remember EVER to translate to Brazilian Protuguese before send to User providing Best Experience!

[... rest of the previous content remains the same ...]