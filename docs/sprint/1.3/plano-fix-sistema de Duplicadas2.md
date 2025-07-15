*bug 1 - GERAL > ARQUIVOS DUPLICADOS - Ao finalizar uma Descoberta e carga de coleta de dados inicial Onde não foi localizado nenhuma duplicata Voltamos à etapa um novamente Adicionamos uma nova pasta que sabemos que contém arquivos duplicados . Adicionamos a pasta e iniciamos uma nova descoberta:
- Identificamos neste momento que após a nova descoberta de dados Efetiva A Carga completa das informações novamente, passando para a etapa seguinte, Na etapa 2 Identificamos a caixa de filtros correspondente aos arquivos duplicados neste momento , passa a NÃO SER MAIS EXIBIDA . Se atualizarmos a página , A CAIXA Arquivos duplicados agora é EXIBIDA, PORÉM, identificamos que a lógica aplicada no desenvolvimento para arquivos duplicacos Torna se inconsistente, Tornando A aplicação instável para realizar os Filtros de Duplicidade e Deduplicação dos dados Durante a análise .
- Identificado que o mesmo BUG acontece . Mesmo removendo todos os cookies e resetando . Todos os Campos , ou seja , o modal só é exibido quando a página é recarregada manualmente no navegador . Neste momento Os dados que foram carregados pela etapa um Deixam de ser considerados , ou seja Não são mais visíveis neste momento , sendo necessário Realizar novamente a etapa um Para que seja possível visualizar agora a caixa De arquivos duplicados 
*bug 2 - GERAL > ARQUIVOS DUPLICADOS > CONTADORES - Após as ações de alta limpeza e análise de arquivos duplicados Os contadores . De arquivos não são atualizados Ou apresentam números completamente divergentes entre Arquivos inventariados Dados duplicados e totais É necessário revisar toda a lógica relacionada à atualização dos contadores . Para este ponto , sugiro . Criar um plano dedicado para Busca e investigação voltado para o levantamento dos contadores seja para criar um componente dedicado para este controle Ou para providenciar uma correção imediata Desta inconsistência sobre os dados.

---

```code
│                                                                                                                                                                                              │
│ Here is Claude's plan:                                                                                                                                                                       │
│ ╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ Plano de Correção Completa - Sistema de Duplicatas                                                                                                                                       │ │
│ │                                                                                                                                                                                          │ │
│ │ BUG 1: Seção de Duplicatas Não Aparece Após Nova Descoberta                                                                                                                              │ │
│ │                                                                                                                                                                                          │ │
│ │ Problema                                                                                                                                                                                 │ │
│ │                                                                                                                                                                                          │ │
│ │ 1. Primeira descoberta sem duplicatas → OK                                                                                                                                               │ │
│ │ 2. Segunda descoberta com duplicatas → Seção não aparece                                                                                                                                 │ │
│ │ 3. Só aparece após recarregar a página (F5)                                                                                                                                              │ │
│ │ 4. Ao recarregar, perde os dados da descoberta                                                                                                                                           │ │
│ │                                                                                                                                                                                          │ │
│ │ Causa Raiz                                                                                                                                                                               │ │
│ │                                                                                                                                                                                          │ │
│ │ O renderDuplicateSection() só é chamado durante renderIntuitiveInterface(), que ocorre na inicialização. Quando novos dados são descobertos, a interface não é re-renderizada.           │ │
│ │                                                                                                                                                                                          │ │
│ │ Solução                                                                                                                                                                                  │ │
│ │                                                                                                                                                                                          │ │
│ │ Adicionar listener para o evento FILES_DISCOVERED que:                                                                                                                                   │ │
│ │ 1. Verifica se há novas duplicatas                                                                                                                                                       │ │
│ │ 2. Re-renderiza a interface se necessário                                                                                                                                                │ │
│ │ 3. Preserva o estado atual dos filtros                                                                                                                                                   │ │
│ │                                                                                                                                                                                          │ │
│ │ BUG 2: Contadores Inconsistentes                                                                                                                                                         │ │
│ │                                                                                                                                                                                          │ │
│ │ Problema                                                                                                                                                                                 │ │
│ │                                                                                                                                                                                          │ │
│ │ - Contadores não atualizam após deduplicação                                                                                                                                             │ │
│ │ - Números divergentes entre total/duplicatas/únicos                                                                                                                                      │ │
│ │ - Inconsistência entre diferentes partes da UI                                                                                                                                           │ │
│ │                                                                                                                                                                                          │ │
│ │ Causa Raiz                                                                                                                                                                               │ │
│ │                                                                                                                                                                                          │ │
│ │ Múltiplos pontos de atualização sem sincronização:                                                                                                                                       │ │
│ │ - updateAllCounters() usa dados do AppState                                                                                                                                              │ │
│ │ - Deduplicação modifica arrays localmente                                                                                                                                                │ │
│ │ - Falta de evento centralizado para atualização                                                                                                                                          │ │
│ │                                                                                                                                                                                          │ │
│ │ Solução                                                                                                                                                                                  │ │
│ │                                                                                                                                                                                          │ │
│ │ Criar sistema centralizado de contadores:                                                                                                                                                │ │
│ │ 1. Componente StatsCoordinator para gerenciar todos os contadores                                                                                                                        │ │
│ │ 2. Evento único STATS_UPDATE para sincronização                                                                                                                                          │ │
│ │ 3. Recalcular sempre baseado no AppState atual                                                                                                                                           │ │
│ │                                                                                                                                                                                          │ │
│ │ Implementação Proposta                                                                                                                                                                   │ │
│ │                                                                                                                                                                                          │ │
│ │ 1. Re-renderizar Seção de Duplicatas                                                                                                                                                     │ │
│ │                                                                                                                                                                                          │ │
│ │ // Em FilterPanel.js, adicionar ao connectToExistingManagers():                                                                                                                          │ │
│ │ EventBus.on(Events.FILES_DISCOVERED, (data) => {                                                                                                                                         │ │
│ │     const duplicateStats = KC.AppState?.get('stats.duplicateStats');                                                                                                                     │ │
│ │     if (duplicateStats && duplicateStats.duplicates > 0) {                                                                                                                               │ │
│ │         // Re-renderiza se há duplicatas e a seção não existe                                                                                                                            │ │
│ │         if (!document.querySelector('[data-group="duplicates"]')) {                                                                                                                      │ │
│ │             this.renderIntuitiveInterface();                                                                                                                                             │ │
│ │             this.setupEventListeners();                                                                                                                                                  │ │
│ │         }                                                                                                                                                                                │ │
│ │     }                                                                                                                                                                                    │ │
│ │ });                                                                                                                                                                                      │ │
│ │                                                                                                                                                                                          │ │
│ │ 2. Sistema Centralizado de Contadores                                                                                                                                                    │ │
│ │                                                                                                                                                                                          │ │
│ │ // Novo componente StatsCoordinator.js                                                                                                                                                   │ │
│ │ class StatsCoordinator {                                                                                                                                                                 │ │
│ │     updateStats() {                                                                                                                                                                      │ │
│ │         const files = AppState.get('files') || [];                                                                                                                                       │ │
│ │         const stats = {                                                                                                                                                                  │ │
│ │             total: files.length,                                                                                                                                                         │ │
│ │             unique: files.filter(f => !f.isDuplicate).length,                                                                                                                            │ │
│ │             duplicates: files.filter(f => f.isDuplicate).length,                                                                                                                         │ │
│ │             approved: files.filter(f => f.status === 'approved').length,                                                                                                                 │ │
│ │             archived: files.filter(f => f.status === 'archived').length                                                                                                                  │ │
│ │         };                                                                                                                                                                               │ │
│ │                                                                                                                                                                                          │ │
│ │         // Emite evento único para todos os componentes                                                                                                                                  │ │
│ │         EventBus.emit(Events.STATS_UPDATED, stats);                                                                                                                                      │ │
│ │     }                                                                                                                                                                                    │ │
│ │ }                                                                                                                                                                                        │ │
│ │                                                                                                                                                                                          │ │
│ │ 3. Sincronização Após Todas as Operações                                                                                                                                                 │ │
│ │                                                                                                                                                                                          │ │
│ │ - Após deduplicação                                                                                                                                                                      │ │
│ │ - Após aprovação/arquivamento em lote                                                                                                                                                    │ │
│ │ - Após nova descoberta                                                                                                                                                                   │ │
│ │ - Após reset                                                                                                                                                                             │ │
│ │                                                                                                                                                                                          │ │
│ │ Ordem de Execução                                                                                                                                                                        │ │
│ │                                                                                                                                                                                          │ │
│ │ 1. Adicionar listener para re-renderização dinâmica                                                                                                                                      │ │
│ │ 2. Implementar StatsCoordinator                                                                                                                                                          │ │
│ │ 3. Atualizar todos os pontos de modificação para usar o novo sistema                                                                                                                     │ │
│ │ 4. Testar cenários completos de descoberta → deduplicação → contadores                                                                                                                   │ │
│
```
\\
---
