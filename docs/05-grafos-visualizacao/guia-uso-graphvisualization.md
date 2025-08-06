# 📖 Guia de Uso - GraphVisualizationV2

## 🎯 Visão Geral

O GraphVisualizationV2 é uma visualização avançada de grafo que representa as relações entre elementos do Knowledge Consolidator de forma hierárquica e interativa.

---

## 🚀 Como Acessar

### 1. Via Interface (Recomendado)

1. Navegue até a **Etapa 4** (Organização e Exportação)
2. Clique no botão **"📊 Visualizar Grafo de Conhecimento"**
3. O modal será aberto em tela cheia

### 2. Via Console do Navegador

```javascript
// Abrir diretamente
KC.OrganizationPanel.openGraphView()

// Verificar se V2 está disponível
typeof KC.GraphVisualizationV2 // deve retornar 'object'
```

---

## 🎨 Modos de Visualização

### 1. **Standard** (Básico)
- Visualização tradicional de triplas
- Estrutura: Legado → Presente → Objetivo
- Ideal para: Visão geral simples

### 2. **Clusters** (Agrupado)
- Nós agrupados por TipoAnalise
- Layout circular por clusters
- Ideal para: Análise por tipo

### 3. **Entity-Centric** (Centrado em Entidades)
- Entidades no centro
- Categorias ao redor
- Arquivos na periferia
- Ideal para: Foco em entidades principais

### 4. **Vertical-Clusters** ⭐ (Recomendado)
- Hierarquia completa em 4 níveis:
  - **Centro**: TipoAnalise (movimento lento)
  - **Médio**: Categorias (movimento médio)
  - **Submédio**: Entidades (movimento rápido)
  - **Periferia**: Arquivos (movimento muito rápido)
- Ideal para: Visão completa e organizada

### Como Trocar de Modo

1. Use o seletor no topo do modal
2. Ou via console:
```javascript
KC.GraphVisualizationV2.setViewMode('vertical-clusters')
```

---

## 🖱️ Interações Disponíveis

### Navegação Básica
- **Arrastar fundo**: Move a visualização
- **Scroll/Pinch**: Zoom in/out
- **Arrastar nó**: Reposiciona elemento (com física)

### Interações com Nós
- **Clique simples**: Mostra informações do nó
- **Duplo clique**: Foca e centraliza no nó
- **Hover**: Mostra tooltip com detalhes

### Exemplo de Informações Mostradas
```
Tipo: Breakthrough Técnico
Categorias: 3
Entidades: 15
Arquivos: 42
```

---

## 🔍 Usando os Filtros

### Filtros por Tipo de Elemento
- ☐ **Arquivos**: Mostra/esconde arquivos
- ☐ **Categorias**: Mostra/esconde categorias
- ☐ **Entidades**: Mostra/esconde entidades

### Filtros por TipoAnalise
- ☐ **Breakthrough Técnico**
- ☐ **Evolução Conceitual**
- ☐ **Momento Decisivo**
- ☐ **Insight Estratégico**
- ☐ **Aprendizado Geral**

### Filtro de Relevância
- Slider de 0% a 100%
- Esconde elementos abaixo do valor selecionado

---

## 📊 Interpretando a Visualização

### Significado das Cores
```javascript
{
  'Breakthrough Técnico': '#e74c3c',    // Vermelho
  'Evolução Conceitual': '#f39c12',     // Laranja
  'Momento Decisivo': '#27ae60',        // Verde
  'Insight Estratégico': '#8e44ad',     // Roxo
  'Aprendizado Geral': '#34495e'        // Cinza
}
```

### Significado das Formas
- **Hexágono** (⬡): TipoAnalise
- **Quadrado** (□): Categoria
- **Diamante** (◊): Entidade
- **Círculo** (●): Arquivo

### Significado dos Tamanhos
- **Maior**: Mais conexões/importância
- **Menor**: Menos conexões/importância
- Tamanhos são limitados para evitar sobreposição

---

## 🛠️ Comandos Avançados

### Estatísticas do Grafo
```javascript
// Ver estatísticas gerais
KC.GraphVisualizationV2.calculateDensityStats()

// Resultado esperado:
{
  nodeCount: 150,
  edgeCount: 280,
  density: 0.025,
  avgDegree: 3.73,
  clusters: {...}
}
```

### Exportar Dados
```javascript
// Exportar grafo completo
KC.GraphVisualizationV2.exportGraph()

// Download automático de JSON com:
// - Metadados
// - Todos os nós
// - Todas as conexões
// - Estatísticas
```

### Debug e Análise
```javascript
// Ver todos os nós
KC.GraphVisualizationV2.allNodes

// Ver todas as conexões
KC.GraphVisualizationV2.allEdges

// Ver entidades mapeadas
KC.GraphVisualizationV2.entityMap

// Forçar redesenho
KC.GraphVisualizationV2.network.redraw()

// Ajustar física
KC.GraphVisualizationV2.network.setOptions({
    physics: { enabled: false } // Desabilitar movimento
})
```

---

## ⚡ Dicas de Performance

### Para Grafos Grandes (500+ nós)
1. Use o modo **Vertical-Clusters** (mais otimizado)
2. Aplique filtros para reduzir elementos visíveis
3. Desabilite física temporariamente:
```javascript
// Desabilitar física
KC.GraphVisualizationV2.network.setOptions({physics: {enabled: false}})

// Reabilitar
KC.GraphVisualizationV2.network.setOptions({physics: {enabled: true}})
```

### Para Melhor Visualização
1. Comece com zoom out para visão geral
2. Use filtros para focar em áreas específicas
3. Arraste nós importantes para posições estratégicas

---

## ❓ Perguntas Frequentes

### Q: Por que alguns nós se movem mais que outros?
**R**: Sistema de física proporcional - elementos centrais (TipoAnalise) têm mais "massa" e movem menos.

### Q: Como salvar a visualização atual?
**R**: Use o botão "Exportar Grafo" ou `KC.GraphVisualizationV2.exportGraph()`

### Q: Posso customizar as cores?
**R**: Sim, via console:
```javascript
KC.GraphVisualizationV2.nodeColors['Breakthrough Técnico'] = '#00ff00'
KC.GraphVisualizationV2.loadData() // Recarregar
```

### Q: O que fazer se o grafo ficar muito bagunçado?
**R**: Troque de modo de visualização ou recarregue:
```javascript
KC.GraphVisualizationV2.loadData()
```

---

## 🎯 Casos de Uso

### 1. Análise de Clusters de Conhecimento
- Use modo **Clusters**
- Identifique grupos de conhecimento relacionados
- Analise densidade de conexões

### 2. Rastreamento de Entidades
- Use modo **Entity-Centric**
- Veja quais entidades aparecem em múltiplos contextos
- Identifique entidades centrais

### 3. Visão Hierárquica Completa
- Use modo **Vertical-Clusters** (recomendado)
- Analise fluxo Tipo→Categoria→Entidade→Arquivo
- Identifique gargalos ou concentrações

### 4. Exportação para Análise Externa
- Exporte dados via botão ou comando
- Use em ferramentas como Gephi ou Cytoscape
- Crie visualizações customizadas

---

## 📝 Notas Finais

O GraphVisualizationV2 é uma ferramenta poderosa para visualizar e entender as relações complexas entre elementos do seu conhecimento. Use os diferentes modos e filtros para extrair insights valiosos dos seus dados.

Para suporte adicional, consulte a documentação técnica ou use os comandos de debug mencionados acima.

---

**Guia criado em**: 23/07/2025  
**Versão**: 2.0