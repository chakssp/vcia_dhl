# 🚀 PROTOCOLO DE INÍCIO DE SESSÃO - KNOWLEDGE CONSOLIDATOR

> **CRÍTICO**: Este protocolo DEVE ser seguido para evitar retrabalho e garantir continuidade eficiente do desenvolvimento.
> VERIFIQUE SE EXISTE ALGUMA ENTRADA EM [ ### STATUS ATUAL ]
---

## 📋 COMANDO DE INÍCIO OBRIGATÓRIO

**COPIE E COLE EXATAMENTE ESTE COMANDO NO INÍCIO DE CADA SESSÃO:**

```
Leia primeiro @CLAUDE.md para entender as LEIS do projeto, depois leia @RESUME-STATUS.md para entender o estado atual. O servidor Five Server já está rodando na porta 5500 (gerenciado pelo usuário conforme @docs/servidor.md). Acesse http://127.0.0.1:5500 e execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir.
```

---

## 📖 ORDEM DE LEITURA OBRIGATÓRIA

### 1️⃣ PRIMEIRO: CLAUDE.md
- Contém as LEIS invioláveis do projeto
- Define padrões de desenvolvimento
- Explica o que NUNCA fazer
- **Tempo estimado**: 2 minutos

### 2️⃣ SEGUNDO: RESUME-STATUS.md  
- Estado atual do projeto
- O que foi implementado
- O que está pendente
- Bugs conhecidos
- **Tempo estimado**: 3 minutos

### 3️⃣ TERCEIRO: Verificações do Sistema
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

## ✅ CHECKLIST PRÉ-DESENVOLVIMENTO

**ANTES de fazer QUALQUER modificação:**

- [ ] Li e entendi CLAUDE.md (especialmente as LEIS)
- [ ] Li RESUME-STATUS.md (sei o estado atual)
- [ ] Li docs/servidor.md (entendi que servidor é gerenciado pelo usuário)
- [ ] Verifiquei acesso ao servidor Five Server (porta 5500)
- [ ] kcdiag() executado sem erros
- [ ] Console do browser aberto para debug
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

### ❌ ERRO 1: Criar código novo sem verificar existente
**SEMPRE** verifique se já existe implementação antes de criar:
```javascript
// ERRADO
criar novo FileRenderer

// CERTO
1. Ler FileRenderer.js existente
2. Entender implementação atual
3. Apenas adicionar o que falta
```

### ❌ ERRO 2: Modificar sem preservar original
**SEMPRE** mantenha versão comentada:
```javascript
// ORIGINAL - Preservado para rollback
// function antiga() { ... }

// NOVO - Modificação aprovada
function nova() { ... }
```

### ❌ ERRO 3: Esquecer de emitir eventos
**SEMPRE** emita AMBOS eventos ao modificar arquivos:
```javascript
AppState.set('files', files);
EventBus.emit(Events.STATE_CHANGED, {...});
EventBus.emit(Events.FILES_UPDATED, {...}); // CRÍTICO!
```

### ❌ ERRO 4: Não testar incrementalmente
**SEMPRE** teste cada mudança:
1. Faça UMA modificação
2. Teste no browser
3. Verifique console
4. Só então prossiga

---

## 📊 MÉTRICAS DE SUCESSO

Uma sessão é considerada **EFICIENTE** quando:
- ✅ Setup completo em < 5 minutos
- ✅ Zero retrabalho por falta de contexto
- ✅ Funcionalidades implementadas na primeira tentativa
- ✅ Sem quebrar código existente

---

## 🔥 RESUMO EXECUTIVO

### Para começar RÁPIDO e CERTO:

1. **COPIE** o comando de início
2. **COLE** no chat
3. **AGUARDE** confirmação de leitura
4. **VERIFIQUE** servidor Five Server (porta 5500)
5. **EXECUTE** kcdiag()
6. **COMECE** desenvolvimento

**Tempo total de setup: 5 minutos**  
**Tempo economizado: 3+ horas de retrabalho**

---

## 📝 TEMPLATE DE PRIMEIRO MENSAJE

Se preferir uma mensagem mais detalhada:

```
Olá! Vamos continuar o desenvolvimento do Knowledge Consolidator.

1. Por favor, leia @CLAUDE.md para as regras do projeto
2. Depois leia @RESUME-STATUS.md para o estado atual
3. O servidor Five Server está rodando em http://127.0.0.1:5500 (veja @docs/servidor.md)
4. Confirme quando estiver pronto para prosseguir

Contexto adicional: [descreva o que pretende fazer hoje]
```

### STATUS ATUAL

```
Leia primeiro @CLAUDE.md para entender as LEIS do projeto, depois leia @RESUME-STATUS.md para entender o estado atual. O servidor Five Server já está rodando na porta 5500 (gerenciado pelo
  usuário conforme @docs/servidor.md). Acesse http://127.0.0.1:5500 e execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir.

  CONTEXTO DA SESSÃO ANTERIOR (15/01/2025 - Segunda sessão):
  - Implementei fonte única de tipos em /js/config/AnalysisTypes.js (já adicionado ao index.html)
  - Atualizei FileRenderer e AnalysisManager para usar KC.AnalysisTypesManager
  - Criei arquitetura completa para Fase 3 em /docs/sprint/1.3/plano/arquitetura-fase3-llms.md
  - Sistema está 100% funcional, sem bugs
  - Próximo passo: Implementar AIAPIManager começando com Ollama

  Favor verificar se KC.AnalysisTypesManager está carregando corretamente após o reinício.

  ATUALIZAÇÃO DA ARQUITETURA (15/01/2025 - Terceira atividade):
  - ✅ PromptManager.js implementado com templates completos
  - ✅ AnalysisAdapter.js com normalização inteligente de respostas
  - ✅ AIAPIManager.js com estrutura base e rate limiting
  - ✅ Revisão de código realizada com recomendações de segurança
  - Sistema pronto para integração real com Ollama
  - Templates de análise: Momentos Decisivos, Insights Técnicos, Análise de Projetos
  - Suporte para 4 providers: Ollama (prioridade), OpenAI, Gemini, Anthropic

  📌 Arquivos chave para referência rápida:

  - Checkpoint da sessão: @docs/sprint/1.3/checkpoint-15-01-2025-sessao2.md
  - Checkpoint arquitetura LLM: @docs/sprint/1.3/checkpoint-15-01-2025-arquitetura-llm.md
  - Fonte única de tipos: @js/config/AnalysisTypes.js
  - Arquitetura LLMs: @docs/sprint/1.3/plano/arquitetura-fase3-llms.md
  - PromptManager: @js/managers/PromptManager.js
  - AnalysisAdapter: @js/managers/AnalysisAdapter.js
  - AIAPIManager: @js/managers/AIAPIManager.js

  Este prompt garantirá que a próxima sessão tenha todo o contexto necessário!
```

---

**LEMBRE-SE**: 5 minutos de setup correto economizam HORAS de retrabalho!