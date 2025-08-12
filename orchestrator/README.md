# 🎭 MULTI-WORKTREE ORCHESTRATOR

Sistema de orquestração para coordenar 4 agentes especializados trabalhando em paralelo no Knowledge Consolidator.

## 📊 Arquitetura

```
ORCHESTRATOR (Maestro Central)
    ├── Convergence Agent (Worktree 1)
    ├── ML Confidence Agent (Worktree 2)  
    ├── UI Improvements Agent (Worktree 3)
    └── Performance Agent (Worktree 4)
```

### Fluxo de Comunicação

1. **Você → Orchestrator**: Define objetivos estratégicos
2. **Orchestrator → Agentes**: Decompõe e distribui tarefas
3. **Agentes → Orchestrator**: Reportam progresso e resultados
4. **Orchestrator → Agentes**: Roteia mensagens para interoperabilidade
5. **Agentes ↔ Agentes**: Comunicação indireta via orchestrator

## 🚀 Como Usar

### 1. Iniciar o Orchestrator

```bash
cd orchestrator
node orchestrator.js
```

### 2. Comandos Disponíveis

```bash
# Iniciar nova orquestração
[ORCH]> start Implementar sistema de convergência semântica completa

# Ver status de todos os agentes
[ORCH]> status

# Sincronizar worktrees
[ORCH]> sync

# Processar mensagens pendentes
[ORCH]> messages

# Rotear mensagem entre agentes
[ORCH]> route convergence ml_confidence UNBLOCK "Engine ready"
```

### 3. Estrutura de Comunicação

#### Tarefas (orchestrator → agente)
```json
// vcia_dhl_convergence/tasks.json
{
  "assigned_by": "orchestrator",
  "tasks": [
    {
      "id": "CONV-001",
      "description": "Implementar ConvergenceEngine",
      "priority": "high"
    }
  ]
}
```

#### Mensagens (agente → orchestrator → agente)
```json
// vcia_dhl_convergence/outbox/msg-123.json
{
  "from": "convergence",
  "to": "ml_confidence",
  "type": "DEPENDENCY_READY",
  "data": {
    "component": "ConvergenceEngine",
    "ready": true
  }
}
```

## 📁 Estrutura de Diretórios

```
orchestrator/
├── orchestrator.js          # Sistema central de coordenação
├── shared-state.json        # Estado compartilhado
├── agent-template.js        # Template base para agentes
├── agents/
│   ├── convergence-agent.js # Agente de convergência
│   ├── ml-agent.js         # Agente ML (a criar)
│   ├── ui-agent.js         # Agente UI (a criar)
│   └── perf-agent.js       # Agente Performance (a criar)
├── tasks/                   # Armazena tarefas distribuídas
└── logs/                    # Logs de execução

vcia_dhl_convergence/        # Worktree 1
├── inbox/                   # Mensagens recebidas
├── outbox/                  # Mensagens a enviar
└── tasks.json              # Tarefas atribuídas

vcia_dhl_ml/                # Worktree 2
├── inbox/
├── outbox/
└── tasks.json

vcia_dhl_ui/                # Worktree 3
├── inbox/
├── outbox/
└── tasks.json

vcia_dhl_performance/       # Worktree 4
├── inbox/
├── outbox/
└── tasks.json
```

## 🔄 Protocolo de Sincronização

### Checkpoints Automáticos
- A cada 1 hora
- Quando progresso atinge marcos (25%, 50%, 75%, 100%)
- Antes de merge coordenado

### Resolução de Dependências
```javascript
// ML aguarda Convergence
{
  "dependencies": {
    "ml_confidence": ["convergence"],
    "performance": ["convergence", "ml_confidence"]
  }
}
```

### Merge Coordenado
1. Todos os agentes fazem commit
2. Orchestrator analisa conflitos
3. Merge sequencial respeitando dependências
4. Validação integrada

## 🎯 Exemplo de Sessão

```bash
# Terminal 1 - Orchestrator
$ node orchestrator.js
[ORCH]> start Implementar busca por convergência com 95% precisão

[ORCHESTRATOR] Analisando objetivo...
[ORCHESTRATOR] Distribuindo tarefas...
✓ 3 tarefas para convergence
✓ 2 tarefas para ml_confidence
✓ 2 tarefas para ui_improvements
✓ 1 tarefa para performance

[ORCH]> status

ORCHESTRATOR DASHBOARD
====================================
Sprint: sprint-2025-01-10
AGENT STATUS:
┌─────────────┬──────────┬─────────┬──────────┐
│ CONVERGENCE │    ML    │   UI    │   PERF   │
├─────────────┼──────────┼─────────┼──────────┤
│ 45%         │ 0%       │ 60%     │ 20%      │
│ 🟢          │ 🔴       │ 🟢      │ 🟡       │
└─────────────┴──────────┴─────────┴──────────┘

DEPENDENCIES:
⚠ ml_confidence → waiting for convergence
```

```bash
# Terminal 2 - Convergence Agent (no worktree)
$ cd ../vcia_dhl_convergence
$ node ../vcia_dhl/orchestrator/agents/convergence-agent.js

[CONVERGENCE] Agente de Convergência iniciado
[CONVERGENCE] Carregadas 3 tarefas
[CONVERGENCE] Processando: Implementar ConvergenceEngine
[CONVERGENCE] Mensagem enviada para orchestrator: PROGRESS_UPDATE
[CONVERGENCE] Mensagem enviada para ml_confidence: DEPENDENCY_READY
```

## 🤝 Interoperabilidade

### Tipos de Mensagens

- **DEPENDENCY_READY**: Notifica que dependência foi resolvida
- **UNBLOCK**: Solicita desbloqueio de agente
- **REQUEST_DATA**: Solicita dados de outro agente
- **DATA_RESPONSE**: Responde com dados solicitados
- **PROGRESS_UPDATE**: Atualiza progresso
- **TASK_COMPLETE**: Notifica conclusão de tarefa
- **SYNC**: Solicita sincronização

### Fluxo de Desbloqueio

1. Convergence completa ConvergenceEngine
2. Convergence envia DEPENDENCY_READY para ML
3. Orchestrator roteia mensagem
4. ML recebe e começa processamento
5. ML envia PROGRESS_UPDATE para orchestrator

## 📈 Monitoramento

### Dashboard em Tempo Real
- Progresso de cada agente
- Status de saúde (🟢 ready, 🟡 working, 🔴 blocked)
- Dependências e bloqueios
- Mensagens recentes
- Próxima sincronização

### Logs
- Cada agente gera logs próprios
- Orchestrator consolida logs em `logs/`
- Formato: `[AGENT] timestamp: message`

## 🔧 Configuração

### shared-state.json
```json
{
  "sprint_id": "sprint-2025-01-10",
  "status": {
    "convergence": {
      "progress": 45,
      "blocked": false,
      "health": "ready"
    }
  },
  "dependencies": {},
  "messages": [],
  "next_sync": "2025-01-10T01:00:00Z"
}
```

## 🚦 Próximos Passos

1. ✅ Orchestrator central criado
2. ✅ Template de agente criado
3. ✅ Convergence Agent implementado
4. ⏳ Implementar ML Confidence Agent
5. ⏳ Implementar UI Improvements Agent
6. ⏳ Implementar Performance Agent
7. ⏳ Testar orquestração completa
8. ⏳ Criar dashboard web visual

## 💡 Dicas

- Use `watch orchestrator.js status` para monitoramento contínuo
- Agentes podem rodar em background com `nohup`
- Mensagens são persistidas em JSON para debug
- Estado compartilhado permite recovery após falhas

---

**Desenvolvido para máxima paralelização e zero conflitos no desenvolvimento do Knowledge Consolidator**