# 🚀 PROTOCOLO DE INÍCIO DE SESSÃO - KNOWLEDGE CONSOLIDATOR

> **⚠️ CRÍTICO P0 - PADRÃO EVER OBRIGATÓRIO**: O não cumprimento causa RETRABALHO CONSTANTE e PERDA TOTAL DE CONTEXTO
> **ATUALIZADO**: 03/08/2025 17:45 - Padrão EVER implementado para eliminar retrabalho
> **SEVERIDADE**: Problema reportado pelo stakeholder como CRÍTICO P0

## 🔴 PADRÃO EVER - INÍCIO OBRIGATÓRIO

### PASSO 1: BUSCAR CONTEXTO ANTERIOR
```bash
# SEMPRE executar primeiro:
mcp__memory-serve__search_nodes "EVER checkpoint sessão contexto"
```

### PASSO 2: OBTER TIMESTAMP
```bash
mcp__time__get_current_time timezone="America/Sao_Paulo"
```

### PASSO 3: CRIAR CHECKPOINT INICIAL
```bash
# Criar entidade EVER-Session-YYYYMMDD-HHMM
# Incluir: timestamp, estado do sistema, próximas ações
```

## 🎭 NOVO PADRÃO - PLAYWRIGHT MCP
**Use o protocolo atualizado**: [@INICIO-SESSAO-PLAYWRIGHT.md](./INICIO-SESSAO-PLAYWRIGHT.md)
- Validação 100% automatizada
- Sem necessidade de acesso manual ao navegador
- Captura automática de logs e screenshots

---

## 📋 COMANDO DE INÍCIO OBRIGATÓRIO COM EVER

### 🔴 COMANDO EVER COMPLETO (OBRIGATÓRIO):
```
1. BUSCAR: mcp__memory-serve__search_nodes "EVER checkpoint"
2. TIMESTAMP: mcp__time__get_current_time
3. LER: @CLAUDE.md (LEI #14 - PADRÃO EVER), @RESUME-STATUS.md (Estado EVER)
4. CRIAR: Checkpoint EVER-Session-[Data]-[Hora] na memória
5. VALIDAR: kcdiag() em http://127.0.0.1:5500
```

### ⚠️ PENALIDADE POR NÃO USAR EVER:
- **RETRABALHO GARANTIDO**
- **PERDA TOTAL DE CONTEXTO**
- **SEVERIDADE CRÍTICA P0**

---

## 📖 ORDEM DE LEITURA OBRIGATÓRIA

### 1️⃣ PRIMEIRO: CLAUDE.md (Seções Essenciais)
- **"ESTADO ATUAL DO PROJETO"** - Status atualizado
- **"LEI #14 - PADRÃO EVER"** - Crítico P0
- **"LEIS do projeto"** - Regras invioláveis
- **Tempo estimado**: 1 minuto (leitura focada)

### 2️⃣ SEGUNDO: Validação Rápida
- **docs/10-guias-operacionais/validacao-rapida-sistema.md**
- Checklist de 5 minutos para validar sistema
- Comandos prontos para copiar/colar
- **Tempo estimado**: 2 minutos

### 3️⃣ TERCEIRO: Contexto Adicional (se necessário)
- **RESUME-STATUS.md** - Para detalhes de sprints e bugs
- **docs/10-guias-operacionais/estrutura-atualizada-projeto.md** - Nova estrutura
- **docs/INDICE-DOCUMENTACAO.md** - Índice completo
```bash
# Servidor Five Server - Gerenciado pelo USUÁRIO
# Porta: 5500 (com Live Reload ativo)
# Detalhes: docs/servidor.md

# Browser - Verificar acesso
http://127.0.0.1:5500

# Console - Executar diagnóstico
kcdiag()
```

---

## ✅ CHECKLIST PRÉ-DESENVOLVIMENTO UTILIZANDO PROTOCOLO EVER / NEVER presente documentado @enevr-protocol.md

**ANTES de fazer QUALQUER modificação:**

- [ ] **EVER BUSCA**: Executei busca de contexto anterior
- [ ] **EVER TIMESTAMP**: Obtive timestamp atual
- [ ] **EVER CHECKPOINT**: Criei checkpoint inicial na memória
- [ ] Li e entendi CLAUDE.md (especialmente LEI #14 - PADRÃO EVER)
- [ ] Li RESUME-STATUS.md (sei o estado atual)
- [ ] Li docs/servidor.md (entendi que servidor é gerenciado pelo usuário)
- [ ] Verifiquei acesso ao servidor PLAYWRIGHT (porta 5500)
  - [ ] kcdiag() executado sem erros
  - [ ] EVER Console do browser aberto para debug
  - [ ] EVER Utilizou os logs PROVENIENTES DO CONSOLE onde compartilha da mesma visão que o usuário, EVER SUBMETER os resultados de sua analise do CONSOLE para confirmação do usuário como forma de garantir que a visão sobre a interface e sobre as atividades estão alinhadas a REALIDADE que AMBOS ESTAO COMPARTILHANDO NESTA SESSAO.
  - [ ] EVER Aguardar de 2~5 segundos entre o Envio de comandos e scripts PARA checar o console novamente PARA validar o SUCESSO / FALHA durante após a sua execução EVER antes de gerar qualquer Screenshot PARA controle/validação visual.
- [ ] Entendi qual Sprint/tarefa está em andamento
- [ ] Verificar integridade de dados:
      ```javascript
      // No console após descoberta:
      KC.FileRenderer.getOriginalFiles().length  // Total descoberto
      KC.FileRenderer.files.length              // Total com exclusões
      // Se houver diferença, há filtros/exclusões aplicadas
      ```

---

## 🚫 ERROS QUE CAUSAM RETRABALHO

### ❌ ERRO 1: NÃO USAR PADRÃO EVER
**SEMPRE** use o padrão EVER:
```javascript
// ERRADO
Começar trabalho sem buscar contexto

// CERTO
1. mcp__memory-serve__search_nodes "EVER checkpoint"
2. mcp__time__get_current_time
3. Criar checkpoint EVER-Session-[Data]-[Hora]
```

### ❌ ERRO 2: Criar código novo sem verificar existente
**SEMPRE** verifique se já existe implementação antes de criar:
```javascript
// ERRADO
criar novo FileRenderer

// CERTO
1. Ler FileRenderer.js existente
2. Entender implementação atual
3. Apenas adicionar o que falta
```

### ❌ ERRO 3: Modificar sem preservar original
**SEMPRE** mantenha versão comentada:
```javascript
// ORIGINAL - Preservado para rollback
// function antiga() { ... }

// NOVA implementação
function nova() { ... }
```

### ❌ ERRO 4: Não emitir eventos corretos
**SEMPRE** emita ambos eventos após modificar arquivos:
```javascript
// Emitir AMBOS eventos
EventBus.emit(Events.STATE_CHANGED, {...});
EventBus.emit(Events.FILES_UPDATED, {...});
```

### ❌ ERRO 5: Usar mock data sem permissão
**NUNCA** use dados simulados sem aprovação:
```javascript
// ERRADO
const mockFiles = generateTestData();

// CERTO
// Usar File System Access API com dados reais
const handle = await window.showDirectoryPicker();
```

---

## 🛡️ ESTRATÉGIA ANTI-RETRABALHO COM EVER

### 1. **Checkpoint Regular**
```javascript
// A cada 30 minutos ou mudança significativa
mcp__memory-serve__create_entities([{
  name: "EVER-Checkpoint-YYYYMMDD-HHMM",
  entityType: "checkpoint",
  observations: [
    "Estado atual: ...",
    "Próximas ações: ...",
    "Contexto: ..."
  ]
}])
```

### 2. **Conexões Semânticas**
```javascript
// Conectar checkpoints relacionados
mcp__memory-serve__create_relations([{
  from: "EVER-Checkpoint-Atual",
  to: "EVER-Checkpoint-Anterior",
  relationType: "continues_from"
}])
```

### 3. **Validação Contínua**
```javascript
// Sempre validar após salvar
const result = await mcp__memory-serve__search_nodes("EVER-Checkpoint-YYYYMMDD-HHMM");
if (result.entities.length === 0) {
  console.error("ERRO: Checkpoint não foi salvo!");
}
```

---

## 📊 COMANDOS ÚTEIS DE DEBUG

```javascript
// Diagnóstico completo
kcdiag()

// Ver arquivos descobertos
KC.AppState.get('files')

// Verificar categorias
KC.CategoryManager.getAll()

// Estado do pipeline
KC.RAGExportManager.consolidateData()

// Verificar Ollama
KC.AIAPIManager.checkOllamaAvailability()

// Verificar Qdrant
KC.QdrantService.checkConnection()

// EVER - Buscar checkpoints
// Use MCP: mcp__memory-serve__search_nodes "EVER checkpoint"
```

---

## 🏁 START - EXECUTE AGORA

```javascript
// 1. BUSCAR contexto anterior
mcp__memory-serve__search_nodes "EVER checkpoint sessão contexto"

// 2. TIMESTAMP atual
mcp__time__get_current_time timezone="America/Sao_Paulo"

// 3. CRIAR checkpoint inicial
// Nome: EVER-Session-YYYYMMDD-HHMM

// 4. VALIDAR sistema
// Acessar http://127.0.0.1:5500
// Executar kcdiag()

// 5. COMEÇAR trabalho
// Sempre salvando checkpoints a cada 30 minutos
```

---

### STATUS ATUAL - CHECKPOINT EVER
- **Data**: 03/08/2025 17:45 BRT
- **Iniciativa Atual**: PRIMEIRA CARGA DE DADOS REAIS
- **Contexto**: Sistema 100% operacional aguardando stakeholder fornecer arquivos
- **Objetivo**: Processar primeira carga no Qdrant e validar pipeline E2E
- **Atividades Pendentes**: 
  - 🔴 Primeira carga de dados reais
  - 🔴 Processar arquivos categorizados
  - 🔴 Testar pipeline completo E2E
  - 🟡 Integrar PrefixCache com busca semântica
  - 🟡 Validar visualização de grafo

### PADRÃO EVER - CHECKPOINT A CADA 30 MINUTOS
- **Próximo checkpoint**: 18:15 BRT
- **Query de busca**: "EVER checkpoint 03082025"
- **Validação**: Sempre confirmar salvamento bem-sucedido

---

**FIM DO PROTOCOLO - USE EVER OU PERCA CONTEXTO!**