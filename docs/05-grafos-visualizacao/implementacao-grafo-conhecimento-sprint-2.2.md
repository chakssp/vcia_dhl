# 📊 PLANO DE IMPLEMENTAÇÃO - GRAFO DE CONHECIMENTO MVP
## SPRINT 2.2 - Visualização de Triplas Semânticas

**Data**: 23/01/2025  
**Autor**: Claude (AI Developer)  
**Status**: 🟡 Planejado  
**Tempo Estimado**: 3-4 horas  

---

## 🎯 OBJETIVO

Implementar visualização interativa do grafo de conhecimento, conectando o sistema de triplas semânticas existente (TripleSchema/TripleStoreManager) com a visualização em grafo (GraphVisualization), seguindo rigorosamente as LEIS do projeto.

## 🔍 DESCOBERTA IMPORTANTE

Durante a verificação (LEI 10), descobrimos que o sistema já possui:
- ✅ **TripleSchema.js**: Schema completo com validação e conversão de dados para triplas
- ✅ **TripleStoreManager.js**: Gerenciador com índices e cache
- ✅ **TripleStoreService.js**: Serviço de persistência
- ✅ **GraphVisualization.js**: 95% pronto, faltando apenas conexão com dados reais

**Conclusão**: NÃO precisamos criar novos componentes, apenas conectar os existentes!

## 📋 PLANO DE AÇÃO

### 1️⃣ FASE 1: Conectar TripleStoreManager com GraphVisualization (1h)

#### Arquivo: `js/components/GraphVisualization.js`
**Ação**: Adicionar método `loadFromAppState()` (~50 linhas)

```javascript
async loadFromAppState() {
    // LEI 11: Correlacionar componentes existentes
    const files = KC.AppState.get('files') || [];
    const categories = KC.CategoryManager.getCategories();
    
    // Usar TripleSchema existente para converter
    const dados = { files, categories };
    const triplas = KC.TripleSchema.converterParaTriplas(dados);
    
    // Inicializar TripleStoreManager se necessário
    if (!KC.TripleStoreManager.initialized) {
        await KC.TripleStoreManager.initialize();
    }
    
    // Adicionar triplas ao store
    triplas.forEach(tripla => {
        KC.TripleStoreManager.adicionarTripla(tripla);
    });
    
    // Construir grafo visual
    this._buildGraphFromTriples(triplas);
    
    // LEI 5: Solicitar feedback ao usuário
    console.log(`[GraphVisualization] ${triplas.length} triplas carregadas`);
}
```

#### Adicionar método `_buildGraphFromTriples()` (~80 linhas)

```javascript
_buildGraphFromTriples(triplas) {
    const nodeMap = new Map();
    const edgeSet = new Set();
    
    // AIDEV-NOTE: triple-visualization; converter modelo Legado-Presente-Objetivo
    triplas.forEach(tripla => {
        // Criar nó para legado (sujeito)
        const legadoId = `triple-${tripla.legado.valor}`;
        if (!nodeMap.has(legadoId)) {
            nodeMap.set(legadoId, {
                id: legadoId,
                label: tripla.legado.valor,
                type: 'subject',
                color: '#3b82f6',
                size: 20,
                title: `Tipo: ${tripla.legado.tipo}`
            });
        }
        
        // Criar nó para objetivo (objeto)
        const objetivoId = `triple-obj-${tripla.objetivo.valor}`;
        if (!nodeMap.has(objetivoId)) {
            nodeMap.set(objetivoId, {
                id: objetivoId,
                label: tripla.objetivo.valor,
                type: 'object',
                color: this._getColorByType(tripla.objetivo.tipo),
                size: 15,
                shape: 'diamond'
            });
        }
        
        // Criar aresta (predicado)
        edgeSet.add(JSON.stringify({
            from: legadoId,
            to: objetivoId,
            label: tripla.presente.valor,
            color: '#666',
            width: tripla.metadados?.confianca ? tripla.metadados.confianca * 5 : 2,
            title: `Confiança: ${(tripla.metadados?.confianca || 0) * 100}%`
        }));
    });
    
    // Adicionar ao grafo
    this.nodes.add(Array.from(nodeMap.values()));
    this.edges.add(Array.from(edgeSet).map(e => JSON.parse(e)));
    
    // Atualizar estatísticas
    this._updateStats();
}
```

### 2️⃣ FASE 2: Adicionar métodos ao QdrantService (30min)

#### Arquivo: `js/services/QdrantService.js`
**Ação**: Adicionar 2 novos métodos (~30 linhas)

```javascript
// LEI 8: Preservar comentário do original caso precise rollback
/* Original: QdrantService não tinha métodos específicos para triplas */

async createTriplesCollection() {
    // AIDEV-NOTE: triple-collection; collection específica para triplas semânticas
    const params = {
        vectors: {
            size: this.config.vectorSize, // 768 dimensões
            distance: 'Cosine'
        },
        optimizers_config: {
            default_segment_number: 2
        }
    };
    
    return this.request('PUT', '/collections/knowledge_triples', params);
}

async saveTriples(triplas) {
    // Verificar/criar collection se não existir
    const collections = await this.listCollections();
    if (!collections.some(c => c.name === 'knowledge_triples')) {
        await this.createTriplesCollection();
    }
    
    // Converter triplas para pontos Qdrant
    const points = [];
    
    for (let i = 0; i < triplas.length; i++) {
        const tripla = triplas[i];
        const texto = `${tripla.legado.valor} ${tripla.presente.valor} ${tripla.objetivo.valor}`;
        
        // Gerar embedding se serviço disponível
        let vector = null;
        if (KC.EmbeddingService) {
            const embedding = await KC.EmbeddingService.generateEmbedding(texto);
            vector = embedding.embedding;
        } else {
            // Fallback: vetor aleatório para testes
            vector = Array(this.config.vectorSize).fill(0).map(() => Math.random());
        }
        
        points.push({
            id: `triple-${Date.now()}-${i}`,
            vector: vector,
            payload: {
                legado: tripla.legado,
                presente: tripla.presente,
                objetivo: tripla.objetivo,
                metadados: tripla.metadados,
                texto: texto
            }
        });
    }
    
    return this.insertBatch(points);
}
```

### 3️⃣ FASE 3: Adicionar botão na interface (30min)

#### Arquivo: `js/components/OrganizationPanel.js`
**Ação**: Adicionar botão e método (~20 linhas)

Localizar o template HTML da Etapa 4 e adicionar após os botões de exportação existentes:

```html
<!-- NOVO BOTÃO - LEI 3: Adicionar minimamente -->
<button class="btn-primary graph-view-btn" onclick="KC.OrganizationPanel.openGraphView()">
    <span class="icon">📊</span> 
    <span class="text">Visualizar Grafo de Conhecimento</span>
</button>
```

Adicionar método no componente:

```javascript
// LEI 7: Solicitar aprovação antes de modificar
openGraphView() {
    console.log('[OrganizationPanel] Abrindo visualização de grafo...');
    
    // LEI 12: Transparência - mostrar ao usuário o que está acontecendo
    KC.EventBus.emit(KC.Events.NOTIFICATION, {
        type: 'info',
        message: 'Carregando grafo de conhecimento...'
    });
    
    // Criar modal fullscreen
    KC.ModalManager.show({
        title: '📊 Grafo de Conhecimento - Visualização de Triplas Semânticas',
        size: 'fullscreen',
        content: '<div id="panel-container" style="height: 100%;"></div>',
        buttons: [
            {
                text: 'Exportar Grafo',
                class: 'btn-secondary',
                action: () => KC.GraphVisualization.exportGraph()
            },
            {
                text: 'Fechar',
                class: 'btn-primary',
                action: 'close'
            }
        ],
        onOpen: async () => {
            // Renderizar e carregar dados
            await KC.GraphVisualization.render();
            await KC.GraphVisualization.loadFromAppState();
            
            // Notificar conclusão
            KC.EventBus.emit(KC.Events.NOTIFICATION, {
                type: 'success',
                message: 'Grafo carregado com sucesso!'
            });
        }
    });
}
```

### 4️⃣ FASE 4: Testes e Validação (1h)

#### Procedimento de Teste:

1. **Verificar componentes carregados**:
   ```javascript
   // No console do navegador
   kcdiag(); // Verificar saúde geral
   console.log(typeof KC.TripleSchema); // Deve ser 'object'
   console.log(typeof KC.TripleStoreManager); // Deve ser 'object'
   console.log(typeof KC.GraphVisualization); // Deve ser 'object'
   ```

2. **Testar conversão de triplas**:
   ```javascript
   // Testar com dados atuais
   const files = KC.AppState.get('files');
   const triplas = KC.TripleSchema.converterParaTriplas({ files });
   console.log(`${triplas.length} triplas geradas`);
   ```

3. **Verificar botão na UI**:
   - Navegar até Etapa 4
   - Verificar presença do botão "Visualizar Grafo"
   - Clicar e verificar abertura do modal

4. **Validar visualização**:
   - Verificar se nós aparecem
   - Testar interação (arrastar, zoom)
   - Verificar labels e conexões

## 📊 MÉTRICAS DE SUCESSO

- ✅ Botão aparece na Etapa 4
- ✅ Modal abre sem erros
- ✅ Grafo renderiza com dados reais
- ✅ Mínimo de 10 triplas visualizadas
- ✅ Interações funcionam (zoom, pan, select)
- ✅ Exportação gera JSON válido
- ✅ Zero quebra de funcionalidades existentes

## 🚨 RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| ModalManager não existe | Baixa | Alto | Criar modal simples com div |
| Muitas triplas (>1000) | Média | Médio | Implementar limite inicial de 500 |
| Embeddings lentos | Alta | Baixo | Usar cache e processar em batch |
| Conflito de IDs | Baixa | Baixo | Usar prefixos únicos |

## 📝 AIDEV-NOTES IMPORTANTES

```javascript
// AIDEV-NOTE: triple-visualization; converter modelo Legado-Presente-Objetivo
// AIDEV-NOTE: triple-collection; collection específica para triplas semânticas
// AIDEV-TODO: implement-pagination; adicionar paginação se >500 triplas
// AIDEV-TODO: add-filters; filtros por tipo de predicado
```

## 🔄 PRÓXIMOS PASSOS (Pós-MVP)

1. **Filtros Avançados**: Filtrar por tipo de relação, confiança, fonte
2. **Análise de Clusters**: Detectar comunidades automaticamente
3. **Timeline**: Slider temporal para ver evolução
4. **Exportação Avançada**: Gephi, GraphML, Neo4j
5. **Busca no Grafo**: Encontrar caminhos entre nós

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Backup do código atual (git commit)
- [ ] Implementar `loadFromAppState()` em GraphVisualization
- [ ] Implementar `_buildGraphFromTriples()` 
- [ ] Adicionar métodos de triplas no QdrantService
- [ ] Adicionar botão na OrganizationPanel
- [ ] Testar no navegador com `kcdiag()`
- [ ] Validar visualização com dados reais
- [ ] Documentar no RESUME-STATUS.md
- [ ] Commit final com mensagem descritiva

---

**IMPORTANTE**: Este plano segue rigorosamente as LEIS do projeto, especialmente:
- LEI 1: Não modifica código funcionando
- LEI 3: Adiciona minimamente (~180 linhas total)
- LEI 10: Reutiliza componentes existentes
- LEI 11: Correlaciona componentes de forma integrada