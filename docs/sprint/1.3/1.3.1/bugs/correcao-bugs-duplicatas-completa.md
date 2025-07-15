# Correção Completa - Bugs do Sistema de Duplicatas

## Data: 15/01/2025

## BUGS IDENTIFICADOS

### BUG 1: Seção de Duplicatas Não Aparece
**Descrição**:
- Primeira descoberta sem duplicatas → OK
- Segunda descoberta COM duplicatas → Seção não aparece
- Só aparece após F5, mas perde dados da descoberta

**Impacto**: Usuário não vê duplicatas sem recarregar, perdendo progresso

### BUG 2: Contadores Inconsistentes
**Descrição**:
- Contadores não atualizam após deduplicação
- Números divergentes entre total/duplicatas/únicos
- Diferentes valores em diferentes partes da UI

**Impacto**: Usuário não confia nos números mostrados

## SOLUÇÕES IMPLEMENTADAS

### 1. Re-renderização Dinâmica da Seção de Duplicatas

**Arquivo**: `js/components/FilterPanel.js`

**Alteração 1**: Listener para FILES_DISCOVERED
```javascript
// Em connectToExistingManagers()
EventBus.on(Events.FILES_DISCOVERED, (data) => {
    console.log('FilterPanel: FILES_DISCOVERED recebido');
    this.updateCounters(data.files || []);
    
    // BUG FIX: Re-renderiza seção de duplicatas se necessário
    const duplicateStats = KC.AppState?.get('stats.duplicateStats');
    if (duplicateStats && duplicateStats.duplicates > 0) {
        // Verifica se a seção de duplicatas não existe
        if (!document.querySelector('[data-group="duplicates"]')) {
            console.log('FilterPanel: Re-renderizando para mostrar seção de duplicatas');
            // Preserva estado atual dos filtros
            const currentFilters = this.getCurrentFilterState();
            // Re-renderiza interface
            this.renderIntuitiveInterface();
            this.setupEventListeners();
            // Restaura estado dos filtros
            this.restoreFilterState(currentFilters);
        }
    }
});
```

**Alteração 2**: Métodos auxiliares
```javascript
// Preserva estado dos filtros durante re-renderização
getCurrentFilterState() {
    const state = {
        relevance: this.uiConfig.relevance.active,
        status: this.uiConfig.status.active,
        period: this.uiConfig.period.active,
        size: this.uiConfig.size.active,
        types: [...this.uiConfig.types.active],
        search: this.searchTerm,
        customSize: {
            min: this.uiConfig.size.customMin,
            max: this.uiConfig.size.customMax
        },
        duplicates: {
            show: document.getElementById('show-duplicates')?.checked,
            hide: document.getElementById('hide-duplicates')?.checked
        }
    };
    return state;
}

// Restaura estado após re-renderização
restoreFilterState(state) {
    if (!state) return;
    
    // Restaura configurações
    this.uiConfig.relevance.active = state.relevance;
    this.uiConfig.status.active = state.status;
    this.uiConfig.period.active = state.period;
    this.uiConfig.size.active = state.size;
    this.uiConfig.types.active = state.types;
    this.searchTerm = state.search;
    this.uiConfig.size.customMin = state.customSize.min;
    this.uiConfig.size.customMax = state.customSize.max;
    
    // Restaura checkboxes de duplicatas
    const showDuplicates = document.getElementById('show-duplicates');
    const hideDuplicates = document.getElementById('hide-duplicates');
    if (showDuplicates) showDuplicates.checked = state.duplicates.show;
    if (hideDuplicates) hideDuplicates.checked = state.duplicates.hide;
    
    // Re-aplica filtros
    this.applyFilters();
}
```

### 2. Sistema Centralizado de Contadores

**Novo Arquivo**: `js/managers/StatsCoordinator.js`

```javascript
class StatsCoordinator {
    constructor() {
        this.stats = {
            files: {
                total: 0,
                unique: 0,
                duplicates: 0,
                approved: 0,
                pending: 0,
                archived: 0
            },
            duplicates: {
                total: 0,
                confident: 0,
                removable: 0,
                groups: {
                    exact: 0,
                    pattern: 0,
                    version: 0
                }
            },
            relevance: {
                high: 0,     // >= 70%
                medium: 0,   // >= 50%
                low: 0,      // >= 30%
                none: 0      // < 30%
            },
            types: {},
            sizes: {
                small: 0,    // < 50KB
                medium: 0,   // 50-500KB
                large: 0     // > 500KB
            }
        };
    }

    // Atualiza todas as estatísticas baseado no AppState
    updateStats() {
        const files = AppState.get('files') || [];
        const duplicateStats = AppState.get('stats.duplicateStats');
        
        // Reseta e recalcula todas as stats
        this.resetStats();
        
        // Calcula estatísticas
        files.forEach(file => {
            // ... lógica de cálculo ...
        });
        
        // Emite evento único para sincronização
        EventBus.emit('STATS_UPDATED', this.stats);
    }
}
```

### 3. Integração com FilterPanel

**Arquivo**: `js/components/FilterPanel.js`

```javascript
// Escuta evento centralizado
EventBus.on('STATS_UPDATED', (stats) => {
    console.log('FilterPanel: STATS_UPDATED recebido', stats);
    this.updateCountersFromStats(stats);
});

// Novo método para atualizar com dados centralizados
updateCountersFromStats(stats) {
    if (!stats) return;
    
    // Atualiza todos os contadores de uma vez
    const relevanceOptions = this.uiConfig.relevance.options;
    relevanceOptions[0].count = stats.files.total;
    relevanceOptions[1].count = stats.relevance.high;
    // ... etc ...
    
    // Atualiza UI
    this.updateCountersUI();
}
```

### 4. Sincronização em Todas as Operações

```javascript
// Após deduplicação
setTimeout(() => {
    // Força atualização centralizada
    if (KC.StatsCoordinator) {
        KC.StatsCoordinator.forceUpdate();
    }
    this.applyFilters();
    // Re-renderiza se não houver mais duplicatas
    if (remainingFiles.filter(f => f.isDuplicate).length === 0) {
        this.renderIntuitiveInterface();
        this.setupEventListeners();
    }
}, 100);
```

## RESULTADO

### ✅ BUG 1 CORRIGIDO
- Seção de duplicatas aparece automaticamente quando detectadas
- Estado dos filtros é preservado durante re-renderização
- Não precisa mais recarregar a página

### ✅ BUG 2 CORRIGIDO
- Contadores sempre sincronizados via StatsCoordinator
- Fonte única de verdade (AppState)
- Atualizações automáticas após todas as operações

## TESTES RECOMENDADOS

1. **Teste de Descoberta Múltipla**:
   - Descobrir pasta sem duplicatas
   - Adicionar pasta com duplicatas
   - Verificar se seção aparece automaticamente

2. **Teste de Contadores**:
   - Executar deduplicação
   - Verificar se todos os contadores atualizam
   - Comparar números em diferentes partes da UI

3. **Teste de Persistência**:
   - Aplicar filtros
   - Descobrir novos arquivos
   - Verificar se filtros permanecem aplicados