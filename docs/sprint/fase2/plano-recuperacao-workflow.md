# 🔄 PLANO DE RECUPERAÇÃO E REINICIALIZAÇÃO - WORKFLOW COMPLETO

## 📋 VISÃO GERAL

Este documento fornece um guia passo a passo para testar o workflow completo do Knowledge Consolidator e como recuperar/reiniciar em caso de interrupções.

**Data**: 21/07/2025  
**Sprint**: Fase 2 - Fundação Semântica  
**Status**: Sistema operacional com correções aplicadas  

---

## 🎯 OBJETIVOS DO TESTE

1. Validar fluxo completo: Descoberta → Análise → Categorização → Exportação
2. Verificar persistência de dados entre sessões
3. Confirmar funcionamento de todos os filtros
4. Testar integração com serviços (Ollama/Qdrant)
5. Validar correções de bugs #8, #9 e #10

---

## ⚡ PREPARAÇÃO PRÉ-TESTE

### 1. Verificação do Ambiente

```bash
# Terminal 1 - Servidor Five Server (gerenciado pelo usuário)
# Verificar se está rodando em http://127.0.0.1:5500

# Terminal 2 - Ollama (se disponível)
ollama serve
# ou verificar se já está rodando:
curl http://127.0.0.1:11434/api/tags

# Terminal 3 - Qdrant (se disponível via VPN)
# Verificar conexão:
curl http://qdr.vcia.com.br:6333/collections
```

### 2. Limpeza de Estado (Opcional)

```javascript
// No console do navegador - APENAS se quiser começar do zero
localStorage.clear();
location.reload();
```

### 3. Backup de Estado Atual

```javascript
// Salvar estado atual antes de começar
const backup = KC.AppState.export();
localStorage.setItem('kc_backup_pre_test', JSON.stringify(backup));
console.log('✅ Backup criado: kc_backup_pre_test');
```

---

## 📊 CHECKPOINTS DE SALVAMENTO

### 🔍 Checkpoint 1: Após Descoberta

```javascript
// Salvar após descoberta bem-sucedida
const checkpoint1 = {
    step: 'discovery_complete',
    timestamp: new Date().toISOString(),
    stats: {
        discovered: KC.AppState.get('stats.discoveredFiles'),
        total: KC.AppState.get('files').length,
        original: KC.FileRenderer.getOriginalFiles().length
    }
};
localStorage.setItem('kc_checkpoint_1', JSON.stringify(checkpoint1));
console.log('✅ Checkpoint 1 salvo:', checkpoint1);
```

### 📈 Checkpoint 2: Após Pré-Análise

```javascript
// Salvar após aplicar filtros e relevância
const checkpoint2 = {
    step: 'preanalysis_complete',
    timestamp: new Date().toISOString(),
    filters: {
        active: KC.FilterPanel.getActiveFilters(),
        excluded: KC.AppState.get('configuration.discovery.excludePatterns'),
        results: {
            pending: document.querySelector('[data-status="pending"] .counter')?.textContent,
            approved: document.querySelector('[data-status="approved"] .counter')?.textContent,
            highRelevance: document.querySelector('[data-relevance="high"] .counter')?.textContent
        }
    }
};
localStorage.setItem('kc_checkpoint_2', JSON.stringify(checkpoint2));
console.log('✅ Checkpoint 2 salvo:', checkpoint2);
```

### 🤖 Checkpoint 3: Após Análise IA

```javascript
// Salvar após análise com IA
const checkpoint3 = {
    step: 'ai_analysis_complete',
    timestamp: new Date().toISOString(),
    analysis: {
        analyzed: KC.AppState.get('stats.analyzedFiles'),
        pending: KC.AppState.get('stats.pendingFiles'),
        providers: KC.AIAPIManager.getProviders(),
        activeProvider: KC.AIAPIManager.activeProvider
    }
};
localStorage.setItem('kc_checkpoint_3', JSON.stringify(checkpoint3));
console.log('✅ Checkpoint 3 salvo:', checkpoint3);
```

### 📦 Checkpoint 4: Após Organização

```javascript
// Salvar após categorização
const checkpoint4 = {
    step: 'organization_complete',
    timestamp: new Date().toISOString(),
    categories: KC.CategoryManager.getAll().map(c => ({
        name: c.name,
        count: c.count
    })),
    approved: KC.AppState.get('files').filter(f => f.approved).length
};
localStorage.setItem('kc_checkpoint_4', JSON.stringify(checkpoint4));
console.log('✅ Checkpoint 4 salvo:', checkpoint4);
```

---

## 🔄 PROCEDIMENTOS DE RECUPERAÇÃO

### 1. Verificar Último Checkpoint

```javascript
// Identificar onde parou
function getLastCheckpoint() {
    const checkpoints = [];
    for (let i = 1; i <= 4; i++) {
        const cp = localStorage.getItem(`kc_checkpoint_${i}`);
        if (cp) {
            checkpoints.push(JSON.parse(cp));
        }
    }
    return checkpoints[checkpoints.length - 1];
}

const lastCheckpoint = getLastCheckpoint();
console.log('📍 Último checkpoint:', lastCheckpoint);
```

### 2. Recuperar Estado do Backup

```javascript
// Se precisar voltar ao início
function restoreFromBackup() {
    const backup = localStorage.getItem('kc_backup_pre_test');
    if (backup) {
        KC.AppState.import(JSON.parse(backup));
        console.log('✅ Estado restaurado do backup');
        location.reload();
    } else {
        console.log('❌ Nenhum backup encontrado');
    }
}
```

### 3. Continuar de Checkpoint Específico

```javascript
// Navegar para etapa específica baseado no checkpoint
function continueFromCheckpoint(checkpointNum) {
    KC.AppController.goToStep(checkpointNum);
    console.log(`✅ Continuando da etapa ${checkpointNum}`);
}

// Exemplo: continuar da etapa 3 (Análise IA)
continueFromCheckpoint(3);
```

---

## 🧪 ROTEIRO DE TESTE COMPLETO

### ETAPA 1: Descoberta de Arquivos

```javascript
// 1. Configurar descoberta
KC.AppController.goToStep(1);

// 2. Selecionar diretório
// Clicar em "Configurar Descoberta" na UI

// 3. Verificar resultados
kcdiag(); // Verificar saúde geral

// 4. Salvar checkpoint 1
// (código do checkpoint 1 acima)
```

### ETAPA 2: Pré-Análise e Filtros

```javascript
// 1. Navegar para etapa 2
KC.AppController.goToStep(2);

// 2. Testar filtros
// - Aplicar exclusões
// - Testar relevância (30%, 50%, 70%, 90%)
// - Testar período (1m, 3m, 6m, 1y, 2y)

// 3. Verificar contadores
KC.FilterPanel.updateAllCounters(KC.AppState.get('files'));

// 4. Salvar checkpoint 2
// (código do checkpoint 2 acima)
```

### ETAPA 3: Análise com IA

```javascript
// 1. Navegar para etapa 3
KC.AppController.goToStep(3);

// 2. Configurar APIs (se necessário)
KC.EventBus.emit(KC.Events.OPEN_API_CONFIG);

// 3. Selecionar arquivos e analisar
// Via interface ou:
const pendingFiles = KC.AppState.get('files').filter(f => !f.analyzed);
KC.AnalysisManager.addToQueue(pendingFiles.slice(0, 5)); // Testar com 5 arquivos

// 4. Verificar progresso
KC.AnalysisManager.getQueueStatus();

// 5. Salvar checkpoint 3
// (código do checkpoint 3 acima)
```

### ETAPA 4: Organização e Exportação

```javascript
// 1. Navegar para etapa 4
KC.AppController.goToStep(4);

// 2. Revisar e aprovar arquivos
// Via interface

// 3. Categorizar arquivos
// Via interface ou:
KC.CategoryManager.addCategory({
    name: 'Teste/Workflow',
    color: '#10b981'
});

// 4. Processar para Qdrant (se disponível)
// Clicar em "Processar Arquivos Aprovados"

// 5. Exportar resultados
// Via interface de exportação

// 6. Salvar checkpoint 4
// (código do checkpoint 4 acima)
```

---

## 🐛 TROUBLESHOOTING

### Problema: Arquivos desapareceram após análise

```javascript
// Verificar se é problema de filtro
console.log('Arquivos originais:', KC.FileRenderer.getOriginalFiles().length);
console.log('Arquivos filtrados:', KC.FileRenderer.files.length);

// Resetar filtros se necessário
KC.FilterPanel.resetFilters();
```

### Problema: Contadores não atualizam

```javascript
// Forçar atualização
KC.FilterPanel.updateAllCounters(KC.AppState.get('files'));
KC.EventBus.emit(KC.Events.FILES_UPDATED, { action: 'force_update' });
```

### Problema: Estado corrompido

```javascript
// Limpar e reiniciar
localStorage.removeItem('kc_app_state');
location.reload();

// Ou restaurar do backup
restoreFromBackup();
```

### Problema: Erro na análise IA

```javascript
// Verificar provider ativo
console.log('Provider:', KC.AIAPIManager.activeProvider);
console.log('Disponível:', await KC.AIAPIManager.checkAvailability());

// Trocar provider se necessário
KC.AIAPIManager.setActiveProvider('ollama'); // ou 'openai', 'gemini', etc.
```

---

## 📋 VALIDAÇÕES FINAIS

### 1. Verificar Persistência

```javascript
// Recarregar página e verificar se dados persistem
location.reload();

setTimeout(() => {
    console.log('Files:', KC.AppState.get('files').length);
    console.log('Step:', KC.AppState.get('currentStep'));
    console.log('Categories:', KC.CategoryManager.getAll());
}, 2000);
```

### 2. Verificar Integridade

```javascript
// Executar diagnóstico completo
kcdiag();

// Verificar bugs corrigidos
// Bug #8: Método showFilesSection existe?
console.log('Bug #8 OK:', typeof KC.FileRenderer.showFilesSection === 'function');

// Bug #9: Exclusões atualizam contadores?
// (testar via interface)

// Bug #10: Arquivos permanecem em "Pendentes" após análise?
const analyzed = KC.AppState.get('files').filter(f => f.analyzed && !f.approved);
console.log('Bug #10 OK:', analyzed.length, 'arquivos analisados mas não aprovados');
```

### 3. Gerar Relatório Final

```javascript
// Relatório de teste
const report = {
    timestamp: new Date().toISOString(),
    environment: {
        ollama: await KC.AIAPIManager.checkOllamaAvailability(),
        qdrant: await KC.QdrantService?.checkConnection(),
        browser: navigator.userAgent
    },
    results: {
        totalFiles: KC.AppState.get('files').length,
        analyzed: KC.AppState.get('stats.analyzedFiles'),
        approved: KC.AppState.get('files').filter(f => f.approved).length,
        categories: KC.CategoryManager.getAll().length,
        checkpoints: [1,2,3,4].map(i => localStorage.getItem(`kc_checkpoint_${i}`) ? `CP${i} ✓` : `CP${i} ✗`)
    },
    bugs: {
        bug8_fixed: typeof KC.FileRenderer.showFilesSection === 'function',
        bug9_fixed: 'Testar manualmente',
        bug10_fixed: 'Testar manualmente'
    }
};

console.log('📊 RELATÓRIO FINAL:', report);
localStorage.setItem('kc_test_report', JSON.stringify(report));
```

---

## 🚀 COMANDOS RÁPIDOS

```javascript
// Copiar e colar conforme necessário:

// Iniciar teste do zero
localStorage.clear(); location.reload();

// Salvar estado atual
localStorage.setItem('kc_backup_' + Date.now(), JSON.stringify(KC.AppState.export()));

// Ver checkpoints salvos
[1,2,3,4].forEach(i => console.log(`CP${i}:`, localStorage.getItem(`kc_checkpoint_${i}`)));

// Ir direto para etapa
KC.AppController.goToStep(3); // 1-4

// Diagnóstico rápido
kcdiag();

// Status dos serviços
KC.AIAPIManager.checkOllamaAvailability();
KC.QdrantService?.checkConnection();
```

---

## 📝 NOTAS IMPORTANTES

1. **Sempre** fazer backup antes de testes destrutivos
2. **Verificar** servidor Five Server está rodando
3. **Documentar** qualquer comportamento inesperado
4. **Salvar** checkpoints em cada etapa importante
5. **Testar** incrementalmente, não tudo de uma vez

Este plano garante que você possa:
- ✅ Testar o sistema completamente
- ✅ Recuperar de qualquer ponto
- ✅ Validar todas as correções
- ✅ Documentar resultados
- ✅ Reiniciar se necessário

**BOA SORTE COM OS TESTES! 🎯**

---

## 🆕 SPRINT 2.2 - IMPLEMENTAÇÃO DO GRAFO DE CONHECIMENTO

### 📊 Checkpoint 5: Visualização de Grafo

```javascript
// Salvar após visualizar grafo de conhecimento
const checkpoint5 = {
    step: 'graph_visualization_complete',
    timestamp: new Date().toISOString(),
    graph: {
        triplesGenerated: KC.TripleSchema.converterParaTriplas({ 
            files: KC.AppState.get('files'), 
            categories: KC.CategoryManager.getCategories() 
        }).length,
        nodesCount: KC.GraphVisualization?.nodes?.length || 0,
        edgesCount: KC.GraphVisualization?.edges?.length || 0,
        qdrantSaved: false // será true após salvar no Qdrant
    }
};
localStorage.setItem('kc_checkpoint_5', JSON.stringify(checkpoint5));
console.log('✅ Checkpoint 5 salvo:', checkpoint5);
```

### 🧪 Teste da Nova Funcionalidade

#### 1. Verificar Componentes de Triplas

```javascript
// Verificar se sistema de triplas está carregado
console.log('TripleSchema:', typeof KC.TripleSchema);
console.log('TripleStoreManager:', typeof KC.TripleStoreManager);
console.log('GraphVisualization:', typeof KC.GraphVisualization);

// Testar conversão de dados para triplas
const testData = {
    files: KC.AppState.get('files').slice(0, 5),
    categories: KC.CategoryManager.getCategories()
};
const triplas = KC.TripleSchema.converterParaTriplas(testData);
console.log(`✅ ${triplas.length} triplas geradas dos dados atuais`);
```

#### 2. Acessar Visualização do Grafo

```javascript
// Navegar para Etapa 4
KC.AppController.goToStep(4);

// Verificar se botão foi adicionado
const graphButton = document.querySelector('.graph-view-btn');
console.log('Botão de grafo presente:', !!graphButton);

// Abrir visualização programaticamente (se botão não aparecer)
if (KC.OrganizationPanel?.openGraphView) {
    KC.OrganizationPanel.openGraphView();
} else {
    console.error('❌ Método openGraphView não encontrado');
}
```

#### 3. Validar Visualização

```javascript
// Após abrir o modal do grafo
// Verificar estatísticas
setTimeout(() => {
    const stats = {
        nodes: document.getElementById('node-count')?.textContent,
        edges: document.getElementById('edge-count')?.textContent,
        density: document.getElementById('graph-density')?.textContent,
        clusters: document.getElementById('cluster-count')?.textContent
    };
    console.log('📊 Estatísticas do Grafo:', stats);
}, 2000);

// Testar interações
// - Clicar em um nó para ver detalhes
// - Arrastar para reposicionar
// - Scroll para zoom
// - Duplo clique para focar
```

#### 4. Salvar Triplas no Qdrant (Opcional)

```javascript
// Se Qdrant estiver disponível
if (KC.QdrantService) {
    // Verificar conexão
    const connected = await KC.QdrantService.checkConnection();
    console.log('Qdrant conectado:', connected);
    
    if (connected) {
        // Salvar triplas
        const triplas = KC.TripleSchema.converterParaTriplas({
            files: KC.AppState.get('files'),
            categories: KC.CategoryManager.getCategories()
        });
        
        const result = await KC.QdrantService.saveTriples(triplas.slice(0, 10)); // Testar com 10
        console.log('✅ Triplas salvas no Qdrant:', result);
        
        // Atualizar checkpoint
        const cp5 = JSON.parse(localStorage.getItem('kc_checkpoint_5'));
        cp5.graph.qdrantSaved = true;
        localStorage.setItem('kc_checkpoint_5', JSON.stringify(cp5));
    }
}
```

### 🐛 Troubleshooting do Grafo

#### Problema: Botão não aparece na Etapa 4

```javascript
// Verificar se OrganizationPanel está carregado
console.log('OrganizationPanel:', typeof KC.OrganizationPanel);

// Forçar re-render da etapa
KC.AppController.goToStep(3);
setTimeout(() => KC.AppController.goToStep(4), 100);
```

#### Problema: Grafo vazio ou sem dados

```javascript
// Verificar se há arquivos no AppState
const files = KC.AppState.get('files');
console.log('Arquivos disponíveis:', files.length);

// Verificar se conversão funciona
const triplas = KC.TripleSchema.converterParaTriplas({ files });
console.log('Triplas geradas:', triplas.length);

// Forçar carregamento manual
if (KC.GraphVisualization?.loadFromAppState) {
    KC.GraphVisualization.loadFromAppState();
}
```

#### Problema: Modal não abre

```javascript
// Verificar se ModalManager existe
console.log('ModalManager:', typeof KC.ModalManager);

// Criar modal alternativo se necessário
if (!KC.ModalManager) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999;';
    modal.innerHTML = '<div id="panel-container" style="height:100%;"></div>';
    document.body.appendChild(modal);
    
    // Renderizar grafo
    KC.GraphVisualization.render();
    KC.GraphVisualization.loadFromAppState();
}
```

### 📋 Validações do Grafo

```javascript
// Relatório específico do grafo
const graphReport = {
    timestamp: new Date().toISOString(),
    implementation: {
        tripleSchema: typeof KC.TripleSchema === 'object',
        tripleStoreManager: typeof KC.TripleStoreManager === 'function',
        graphVisualization: typeof KC.GraphVisualization === 'object',
        buttonAdded: !!document.querySelector('.graph-view-btn')
    },
    data: {
        filesCount: KC.AppState.get('files').length,
        categoriesCount: KC.CategoryManager.getCategories().length,
        triplesGenerated: 0,
        nodesRendered: 0,
        edgesRendered: 0
    },
    interactions: {
        clickNode: 'Testar manualmente',
        dragNode: 'Testar manualmente',
        zoom: 'Testar manualmente',
        export: 'Testar manualmente'
    }
};

// Tentar gerar dados
try {
    const triplas = KC.TripleSchema.converterParaTriplas({
        files: KC.AppState.get('files'),
        categories: KC.CategoryManager.getCategories()
    });
    graphReport.data.triplesGenerated = triplas.length;
    
    if (KC.GraphVisualization?.nodes) {
        graphReport.data.nodesRendered = KC.GraphVisualization.nodes.length;
        graphReport.data.edgesRendered = KC.GraphVisualization.edges.length;
    }
} catch (e) {
    console.error('Erro ao gerar relatório:', e);
}

console.log('📊 RELATÓRIO DO GRAFO:', graphReport);
localStorage.setItem('kc_graph_report', JSON.stringify(graphReport));
```

### 🎯 Comandos Rápidos - Grafo

```javascript
// Testar conversão de triplas
KC.TripleSchema.converterParaTriplas({ files: KC.AppState.get('files').slice(0, 3) });

// Abrir grafo diretamente
KC.OrganizationPanel?.openGraphView();

// Exportar grafo
KC.GraphVisualization?.exportGraph();

// Ver estatísticas de triplas
KC.TripleStoreManager?.getStats();

// Limpar cache do grafo
KC.GraphVisualization?.nodes?.clear();
KC.GraphVisualization?.edges?.clear();
```

---

**DOCUMENTAÇÃO ATUALIZADA COM SPRINT 2.2! 📊✨**