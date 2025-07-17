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

  CONTEXTO DA ÚLTIMA SESSÃO (17/01/2025 - Sprint Fase 2 - Fundação Semântica):
  - 🚧 Sprint Fase 2 INICIADA - Análise arquitetural bottom-up
  - ⚠️ DESCOBERTA CRÍTICA: Sistema de triplas extraindo apenas metadados (13 triplas superficiais)
  - 💡 INSIGHT: "Construindo do telhado" - falta toda camada de embeddings/vetorização
  - 🎯 NOVA ABORDAGEM: Fundação → Embeddings → Qdrant → Similaridade → Triplas
  - ✅ Categorias manuais identificadas como ground truth para validação

  📊 STATUS ANTERIOR:
  - ✅ Sprint 2.0.1 CONCLUÍDA (BUG #6 e #7 corrigidos)
  - ✅ Sistema base 100% operacional
  - ✅ Pipeline RAG implementado (RAGExportManager, ChunkingUtils, QdrantSchema)

  ⚠️ IMPORTANTE: 
  - TripleStoreService atual só extrai metadados, não relações semânticas
  - RelationshipExtractor usa apenas regex, não compreensão semântica
  - Precisamos construir da fundação (embeddings) antes de extrair triplas reais

  📌 Arquivos chave da Sprint Fase 2:
  - Análise arquitetural: @docs/sprint/fase2/analise-arquitetural-bottomup.md
  - Triple Store Service: @js/services/TripleStoreService.js (a refatorar)
  - Relationship Extractor: @js/extractors/RelationshipExtractor.js (a substituir)
  - Teste 2Litros: @test/teste-final-2litros.js (benchmark de validação)

  🎯 Próximos passos imediatos:
  1. POC de EmbeddingService com Ollama
  2. Validar geração de embeddings com dados reais
  3. Criar estrutura básica do QdrantService
  4. Refatorar extração para usar similaridade semântica

  Este prompt garantirá continuidade com a nova abordagem bottom-up!
```

---

**LEMBRE-SE**: 5 minutos de setup correto economizam HORAS de retrabalho!