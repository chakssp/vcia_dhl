# 🚀 SETUP GIT WORKTREES PARA CLAUDE CODE PARALELO
## Knowledge Consolidator - Sessões Múltiplas

---

## 📊 CENÁRIO ATUAL
- **Branch principal**: main
- **Branch atual**: qdrant-try1
- **Diretório base**: F:\vcia-1307\vcia_dhl

---

## 🌳 CONFIGURAÇÃO DE WORKTREES

### 1️⃣ **Criar Estrutura de Diretórios**
```bash
# No diretório pai (F:\vcia-1307\)
mkdir vcia_dhl_worktrees
cd vcia_dhl_worktrees
```

### 2️⃣ **Adicionar Worktrees para Diferentes Features**

#### A. Worktree para ML Confidence (Agente Especialista)
```bash
cd F:\vcia-1307\vcia_dhl
git worktree add ../vcia_dhl_worktrees/ml-confidence -b feature/ml-confidence
```

#### B. Worktree para Convergência Semântica
```bash
git worktree add ../vcia_dhl_worktrees/convergence -b feature/convergence-nav
```

#### C. Worktree para UI/UX Improvements
```bash
git worktree add ../vcia_dhl_worktrees/ui-improvements -b feature/ui-ux
```

#### D. Worktree para Performance
```bash
git worktree add ../vcia_dhl_worktrees/performance -b feature/performance
```

---

## 📁 ESTRUTURA RESULTANTE
```
F:\vcia-1307\
├── vcia_dhl\                    # Repositório principal (qdrant-try1)
│   └── .git\                    # Git principal
└── vcia_dhl_worktrees\
    ├── ml-confidence\           # Branch: feature/ml-confidence
    ├── convergence\             # Branch: feature/convergence-nav
    ├── ui-improvements\         # Branch: feature/ui-ux
    └── performance\             # Branch: feature/performance
```

---

## 🎯 USO COM CLAUDE CODE

### Abrir Sessões Paralelas:
```bash
# Terminal 1 - ML Confidence
cd F:\vcia-1307\vcia_dhl_worktrees\ml-confidence
claude

# Terminal 2 - Convergência
cd F:\vcia-1307\vcia_dhl_worktrees\convergence
claude

# Terminal 3 - UI/UX
cd F:\vcia-1307\vcia_dhl_worktrees\ui-improvements
claude

# Terminal 4 - Performance
cd F:\vcia-1307\vcia_dhl_worktrees\performance
claude
```

---

## 🤖 ATRIBUIÇÃO DE AGENTES POR WORKTREE

### Worktree 1: ML Confidence
```bash
# Agente: ml-confidence-specialist
# Foco: ConfidenceTracker.js, algoritmos de convergência
# Sprint: 1-2
```

### Worktree 2: Convergência Semântica
```bash
# Agente: senior-architect-team-lead
# Foco: Navegação por convergência, CONVERGENCE-BREAKTHROUGH.md
# Sprint: 2-3
```

### Worktree 3: UI/UX
```bash
# Agente: ui-ux-dev-lead ou frontend-engineers-team
# Foco: Interface, visualizações, dashboard
# Sprint: 3-4
```

### Worktree 4: Performance
```bash
# Agente: performance-optimization-coordinator
# Foco: Otimização, cache, Worker Pool
# Sprint: 4-5
```

---

## 📝 COMANDOS ÚTEIS

### Listar Worktrees:
```bash
git worktree list
```

### Remover Worktree:
```bash
git worktree remove ../vcia_dhl_worktrees/nome-worktree
```

### Limpar Worktrees Antigas:
```bash
git worktree prune
```

### Sincronizar com Main:
```bash
# Em cada worktree
git fetch origin
git merge origin/main
```

---

## 💡 BENEFÍCIOS PARA O PROJETO KC

1. **Paralelização Real**: 4 agentes trabalhando simultaneamente
2. **Isolamento**: Mudanças não interferem entre si
3. **Merge Controlado**: Integração apenas quando pronto
4. **Especialização**: Cada agente focado em sua expertise

---

## ⚠️ CUIDADOS

1. **Arquivos Locais**: `.claude\settings.local.json` não é compartilhado
2. **Node Modules**: Cada worktree precisa seu próprio `npm install`
3. **Servidor**: Cada sessão usa porta diferente (5500, 5501, 5502...)
4. **Qdrant/Ollama**: Compartilhados entre todas as sessões

---

## 🚀 EXEMPLO PRÁTICO

### Sprint 3 - Trabalho Paralelo:
```bash
# Claude 1: ML Specialist implementando ConfidenceTracker
cd F:\vcia-1307\vcia_dhl_worktrees\ml-confidence
claude
# /ml-confidence-specialist

# Claude 2: Architect desenhando convergência
cd F:\vcia-1307\vcia_dhl_worktrees\convergence
claude
# /senior-architect-team-lead

# Claude 3: Frontend melhorando UI
cd F:\vcia-1307\vcia_dhl_worktrees\ui-improvements
claude
# /frontend-engineers-team

# Claude 4: Performance otimizando
cd F:\vcia-1307\vcia_dhl_worktrees\performance
claude
# /performance-optimization-coordinator
```

---

## 📊 GANHO DE PRODUTIVIDADE

**Sem Worktrees**: 1 agente por vez = 20 horas/sprint
**Com Worktrees**: 4 agentes paralelos = 5 horas/sprint

**Economia**: 75% do tempo! 🚀

---

## 🎯 PRÓXIMOS PASSOS

1. Criar primeiro worktree para testar
2. Configurar `.claude\settings.local.json` em cada um
3. Atribuir agentes específicos
4. Começar desenvolvimento paralelo

---

**COMANDO RÁPIDO PARA COMEÇAR**:
```bash
cd F:\vcia-1307\vcia_dhl
git worktree add ../vcia_dhl_ml -b feature/ml-confidence
cd ../vcia_dhl_ml
claude
```

Pronto! Agora você pode ter múltiplos Claudes trabalhando em paralelo! 🎉