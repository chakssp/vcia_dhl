# 🚨 PLANO DE RECUPERAÇÃO - PROJETO QDRANT

## 📅 Data: 25/07/2025
## 🎯 Objetivo: Fazer o sistema usar o conhecimento curado no Qdrant

## 📊 DIAGNÓSTICO DO PROBLEMA

### O que DEVERIA acontecer:
1. **Etapa 4**: Após curadoria → Clicar "Processar Arquivos Aprovados"
2. **Pipeline**: Gera embeddings → Envia para Qdrant
3. **Análise**: Novos arquivos → Busca no Qdrant → Herda classificação
4. **Consultas**: Perguntas estratégicas → Contexto curado → Respostas ricas

### O que ESTÁ acontecendo:
1. ❌ Pipeline não está sendo executado (botão não clicado?)
2. ❌ Análise usa LLM direto, ignora Qdrant
3. ❌ Método `_detectAnalysisType()` inexistente causa erros
4. ❌ Todos arquivos classificados como "Aprendizado Geral"

## 🔧 PLANO DE AÇÃO (5 FASES)

### FASE 1: Validar Pipeline de Processamento ✅
```javascript
// Na Etapa 4, executar no console:
await KC.RAGExportManager.processApprovedFiles();
```

### FASE 2: Verificar População do Qdrant
```javascript
// Verificar se dados foram inseridos:
await KC.QdrantService.getCollectionStats();
// Deve mostrar pontos > 0
```

### FASE 3: Corrigir FileRenderer.analyzeFile()
```javascript
// ATUAL (linha ~450):
// this.analysisManager.addToQueue([file], options);

// CORRETO:
if (KC.QdrantService && KC.EmbeddingService) {
    // 1. Gerar embedding
    const embedding = await KC.EmbeddingService.generateEmbedding(file.content);
    
    // 2. Buscar similares no Qdrant
    const results = await KC.QdrantService.searchByVector(embedding, 5);
    
    // 3. Determinar tipo baseado nos vizinhos
    const types = results.map(r => r.payload.analysisType);
    const mostCommon = this._getMostCommonType(types);
    
    // 4. Atualizar arquivo
    file.analysisType = mostCommon;
    file.confidence = 0.92; // Alta confiança por ser baseado em curadoria
}
```

### FASE 4: Implementar Método Faltante
```javascript
// Em AnalysisAdapter.js, adicionar:
_detectAnalysisType(text) {
    // Usar os triggers do PRD
    const triggers = {
        'Breakthrough Técnico': ['inovacao', 'solucao', 'configuracao'],
        'Evolução Conceitual': ['entendimento', 'perspectiva', 'visao'],
        'Momento Decisivo': ['decisão', 'escolha', 'direção'],
        'Insight Estratégico': ['estrategia', 'padrão', 'tendencia'],
        'Aprendizado Geral': [] // default
    };
    
    // Lógica de detecção baseada em triggers
    // ...
}
```

### FASE 5: Habilitar Consultas Estratégicas
```javascript
// Novo método para consultas ricas:
async askStrategicQuestion(question) {
    // 1. Extrair contexto temporal da pergunta
    const timeframe = this._extractTimeframe(question);
    
    // 2. Buscar arquivos relevantes no Qdrant
    const relevantDocs = await KC.QdrantService.searchByMetadata({
        timeframe: timeframe,
        hasCategories: true
    });
    
    // 3. Montar contexto curado
    const context = this._buildCuratedContext(relevantDocs);
    
    // 4. Enviar para LLM com contexto
    const response = await KC.AIAPIManager.analyze(question, {
        context: context,
        systemPrompt: "Você tem acesso a uma base de conhecimento curada..."
    });
    
    return response;
}
```

## 📋 CHECKLIST DE VALIDAÇÃO

- [ ] Ollama está rodando? (`curl http://localhost:11434/api/tags`)
- [ ] Qdrant está acessível? (`curl http://qdr.vcia.com.br:6333/collections`)
- [ ] Collection 'knowledge_base' existe?
- [ ] Arquivos foram aprovados na Etapa 4?
- [ ] Botão "Processar Arquivos Aprovados" foi clicado?
- [ ] Console mostra progresso do pipeline?

## 🎯 RESULTADO ESPERADO

Após implementar este plano, você poderá:

1. **Classificação Automática**: Novos arquivos herdam tipos de similares
2. **Consultas Ricas**: "Quais assuntos evoluíram nos últimos 6 meses?"
3. **Insights Cruzados**: "Que padrões conectam projetos X e Y?"
4. **Análise Temporal**: "Como meu conhecimento sobre IA evoluiu?"

## 🚀 PRÓXIMO PASSO IMEDIATO

1. Abrir http://127.0.0.1:5500
2. Ir para Etapa 4
3. Clicar em "Processar Arquivos Aprovados"
4. Verificar console para erros
5. Executar: `KC.QdrantService.getCollectionStats()`

Se não houver botão ou der erro, precisamos investigar mais.