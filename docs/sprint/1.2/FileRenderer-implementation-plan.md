# 📋 PLANO DE IMPLEMENTAÇÃO - FileRenderer Component
**Sprint**: 1.2  
**Data**: 2025-07-11  
**Status**: 🔛 Em Desenvolvimento  
**Prioridade**: 🔝 Crítico  

## 🎯 OBJETIVO
Implementar o componente FileRenderer para exibir a listagem de arquivos descobertos, seguindo o exemplo visual fornecido e mantendo 100% do código existente funcional.

## ⚠️ REGRAS ABSOLUTAS - GUARDRAIL.dhl
1. **PRESERVAÇÃO TOTAL**: ZERO alterações no código existente
2. **APENAS ACRESCENTAR**: Novos arquivos e integrações não-invasivas
3. **DADOS REAIS**: Usar dados do DiscoveryManager, sem mocks
4. **DOCUMENTAÇÃO PRÉVIA**: Este plano antes de qualquer código

## 🏗️ ARQUITETURA DO COMPONENTE

### Estrutura FileRenderer
```javascript
window.KnowledgeConsolidator.FileRenderer = {
    // Renderização principal
    render(files, container),
    
    // Renderização de item individual
    renderFileItem(file),
    
    // Filtros visuais
    renderFilters(),
    
    // Ordenação visual
    renderSortOptions(),
    
    // Ações dos botões
    handleAnalyze(fileId),
    handleView(fileId),
    handleCategorize(fileId),
    handleArchive(fileId)
};
```

## 📐 LAYOUT CONFORME EXEMPLO

### Barra de Filtros
```
Filtros: 
|| {[Todos]:[N]} || {[Alta Relevância]:[N]} || {[Potencial Extendido]:[N]} || [KB] || +[KE] || {[Pendente Análise]:[N]} || {[Já Analisados]:[N]}
```

### Barra de Ordenação
```
Classificar:
|| {[>].RELEVÂNCIA} || {[>].POTENCIAL} || {[>].DATA} || {[Agrupar_por_Pasta]} ||
```

### Item de Arquivo
```
Arquivo: [nome]
Conteúdo Inicial: [preview]
Caminho: [path]
Relevância: [%] ([KB] || [KE])
Data Criação: [data]
Tamanho: [size]
---
|| 🔍 Analisar || 👁️ Ver || 📂 Categorizar || 📦 Arquivar ||
```

## 🔧 IMPLEMENTAÇÃO INCREMENTAL

### FASE 1 - Estrutura Base
1. Criar FileRenderer.js com estrutura básica
2. Implementar render() que recebe files do AppState
3. Criar renderFileItem() para cada arquivo

### FASE 2 - Filtros e Ordenação
1. Implementar renderFilters() com contadores dinâmicos
2. Adicionar renderSortOptions() com opções de ordenação
3. Conectar com FilterManager existente (sem modificá-lo)

### FASE 3 - Preview e Ações
1. Integrar com PreviewUtils para exibir preview
2. Implementar botões de ação com handlers
3. Preparar estrutura para modais (ETAPA 2)

### FASE 4 - Integração
1. Adicionar ao index.html após FilterManager
2. Chamar FileRenderer.render() no WorkflowPanel
3. Conectar com EventBus para atualizações

## 🔌 PONTOS DE INTEGRAÇÃO

### Com Componentes Existentes
- **AppState**: Ler files[] para renderização
- **FilterManager**: Aplicar filtros ativos
- **PreviewUtils**: Exibir preview inteligente
- **EventBus**: Escutar 'filesUpdated', 'filterChanged'
- **ModalManager**: Preparar para futuros modais

### Eventos a Escutar
```javascript
EventBus.on('filesUpdated', () => FileRenderer.render());
EventBus.on('filterChanged', () => FileRenderer.render());
EventBus.on('sortChanged', () => FileRenderer.render());
```

## 🧪 VALIDAÇÃO

### Checklist de Testes
- [ ] FileRenderer carrega sem erros
- [ ] Lista exibe arquivos reais descobertos
- [ ] Contadores de filtros funcionam
- [ ] Preview aparece corretamente
- [ ] Botões respondem ao clique
- [ ] Integração não quebra código existente
- [ ] Performance adequada com 100+ arquivos

## 📊 MÉTRICAS DE SUCESSO
- Renderização < 100ms para 100 arquivos
- Zero erros no console
- 100% código existente preservado
- Interface responsiva e intuitiva

## 🚀 PRÓXIMOS PASSOS
1. Aprovar este plano com usuário
2. Implementar FileRenderer.js
3. Adicionar ao index.html
4. Integrar com WorkflowPanel
5. Testar com dados reais
6. Validar FASE 1 completa

---
**🔰 PLANO APROVADO E COMPREENDIDO**