# Correção: analysisType não sendo contabilizado no Qdrant

## Data: 30/01/2025

## Problema Identificado

O campo `analysisType` (classificação semântica de análise com IA) não estava sendo corretamente propagado para o Qdrant. Análise revelou que 100% dos 351 pontos no Qdrant tinham:
- `analysisType`: "Aprendizado Geral" (sempre o fallback)
- `intelligenceType`: "knowledge_piece" (sempre o fallback)

Mesmo com a interface mostrando corretamente todas as 5 classificações.

## Causa Raiz

O `IntelligenceEnrichmentPipeline` procurava por `doc.analysisType` no nível raiz do documento, mas o `RAGExportManager` não estava incluindo este campo no nível raiz em seu método `_structureForExport()`.

### Fluxo Problemático:
1. AnalysisManager → define `file.analysisType` corretamente
2. AppState → mantém `file.analysisType` 
3. RAGExportManager → `_structureForExport()` NÃO incluía `analysisType` no nível raiz
4. IntelligenceEnrichmentPipeline → procurava `doc.analysisType` e não encontrava
5. Resultado → sempre usava fallback "Aprendizado Geral"

## Solução Implementada

### 1. RAGExportManager.js - Adicionado analysisType no nível raiz

```javascript
// Linha 365
return {
    // NOVO: Campos no nível raiz para Intelligence Enrichment Pipeline
    content: contentToUse,
    name: file.name,
    path: file.path,
    categories: KC.CategoryNormalizer.normalize(file.categories, 'RAGExportManager._structureForExport.root'),
    // CORREÇÃO: analysisType no nível raiz para IntelligenceEnrichmentPipeline
    analysisType: file.analysisType || 'Aprendizado Geral',
    
    // EXISTENTE: Estrutura original mantida
    id: file.id,
    // ...
}
```

### 2. Adicionado logging de debug

```javascript
// RAGExportManager.js - linha 800
analysisType: (() => {
    const type = doc.analysisType || doc.analysis?.type || 'Aprendizado Geral';
    KC.Logger?.debug('RAGExportManager', 'Determinando analysisType', {
        docName: doc.name,
        docAnalysisType: doc.analysisType,
        docAnalysisTypeExists: !!doc.analysisType,
        analysisType: doc.analysis?.type,
        analysisTypeExists: !!doc.analysis?.type,
        finalType: type
    });
    return type;
})(),
```

### 3. Removida duplicação em metadata

```javascript
// RAGExportManager.js - linha 814
metadata: {
    ...chunk.metadata,
    // REMOVIDO: analysisType duplicado - agora está no nível raiz
```

### 4. Melhorado logging no IntelligenceEnrichmentPipeline

```javascript
// IntelligenceEnrichmentPipeline.js - linha 454
// DEBUG: Log quando não há analysisType
KC.Logger?.debug('IntelligenceEnrichmentPipeline', 'Documento sem analysisType', {
    docName: doc.name,
    docKeys: Object.keys(doc),
    hasAnalysisType: 'analysisType' in doc,
    analysisTypeValue: doc.analysisType
});
```

## Teste da Solução

Para testar a correção:

1. **Limpar dados antigos no Qdrant** (opcional):
   ```javascript
   // No console do browser
   await KC.QdrantService.deleteCollection()
   await KC.QdrantService.createCollection()
   ```

2. **Processar novos arquivos**:
   - Descobrir arquivos
   - Fazer análise com IA (vai definir analysisType)
   - Processar arquivos aprovados

3. **Verificar logs no console**:
   - Procurar por: "Determinando analysisType"
   - Procurar por: "Mapeando analysisType"
   - Verificar se não há mais "usando fallback 'knowledge_piece'"

4. **Validar no Qdrant**:
   ```javascript
   // Verificar distribuição
   const stats = await KC.QdrantService.getCollectionStats()
   console.log(stats)
   
   // Buscar pontos e verificar analysisType
   const result = await KC.QdrantService.searchByText('test', 10)
   console.log(result.map(r => ({
       name: r.payload.fileName,
       analysisType: r.payload.analysisType,
       intelligenceType: r.payload.intelligenceType
   })))
   ```

## Resultado Esperado

Após a correção, os dados no Qdrant devem refletir a distribuição real dos tipos de análise:
- Breakthrough Técnico → technical_innovation
- Evolução Conceitual → conceptual_evolution  
- Momento Decisivo → decision_point
- Insight Estratégico → strategic_insight
- Aprendizado Geral → knowledge_piece

E não mais 100% como "Aprendizado Geral".

## Arquivos Modificados

1. `/js/managers/RAGExportManager.js` - Adicionado analysisType no nível raiz
2. `/js/services/IntelligenceEnrichmentPipeline.js` - Melhorado logging
3. `/js/config/AnalysisTypes.js` - Já tinha mapeamento correto (não modificado)

## Observações

- A interface já estava funcionando corretamente
- O problema era apenas no fluxo de dados para o Qdrant
- A correção mantém compatibilidade com código existente
- Logging adicional facilita debug futuro