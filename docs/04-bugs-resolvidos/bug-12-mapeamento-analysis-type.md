# Bug #12: Mapeamento AnalysisType → IntelligenceType
## Data: 01/08/2025
## Status: ✅ RESOLVIDO

### PROBLEMA ORIGINAL
A análise com IA (analysisType) estava sendo detectada corretamente pelo AnalysisManager, mas apenas 2 dos 5 tipos estavam sendo mapeados corretamente no IntelligenceEnrichmentPipeline. Isso resultava em 351 pontos no Qdrant mostrando apenas "knowledge_piece" como intelligence_type, perdendo granularidade semântica importante.

### CAUSA RAIZ IDENTIFICADA
1. **Mapeamento Hardcoded**: O método `_determineIntelligenceType()` tinha apenas 2 mapeamentos hardcoded:
   - "Breakthrough Técnico" → "technical_innovation"
   - "Momento Decisivo" → "decision_point"
   - Todos os outros → "knowledge_piece" (fallback)

2. **Violação do Single Source of Truth**: Não usava AnalysisTypesManager como fonte única (violação da LEI 11)

3. **Falta de Propriedade**: AnalysisTypes.js não tinha a propriedade `intelligenceType`

### SOLUÇÃO IMPLEMENTADA

#### 1. Expansão do AnalysisTypes.js
Adicionada propriedade `intelligenceType` em cada tipo de análise:

```javascript
BREAKTHROUGH_TECNICO: {
    // ... propriedades existentes
    intelligenceType: 'technical_innovation'
},
EVOLUCAO_CONCEITUAL: {
    // ... propriedades existentes
    intelligenceType: 'conceptual_evolution' // NOVO
},
MOMENTO_DECISIVO: {
    // ... propriedades existentes
    intelligenceType: 'decision_point'
},
INSIGHT_ESTRATEGICO: {
    // ... propriedades existentes
    intelligenceType: 'strategic_insight' // NOVO
},
APRENDIZADO_GERAL: {
    // ... propriedades existentes
    intelligenceType: 'knowledge_piece' // NOVO
}
```

#### 2. Novo Método no AnalysisTypesManager
```javascript
getIntelligenceType(analysisTypeName) {
    const type = this.getByName(analysisTypeName);
    if (!type) {
        KC.Logger?.warning('AnalysisTypesManager', 
            `Tipo de análise não reconhecido: ${analysisTypeName}, usando fallback 'knowledge_piece'`);
        return 'knowledge_piece';
    }
    return type.intelligenceType || 'knowledge_piece';
}
```

#### 3. Refatoração do IntelligenceEnrichmentPipeline
```javascript
_determineIntelligenceType(doc, breakthroughs) {
    // Casos especiais primeiro (mantidos)
    if (breakthroughs.some(b => b.type === 'paradigm_shift')) {
        return 'paradigm_shifter';
    }
    // ... outros casos especiais ...
    
    // REFATORADO: Usar AnalysisTypesManager como fonte única
    if (doc.analysisType && KC.AnalysisTypesManager) {
        const intelligenceType = KC.AnalysisTypesManager.getIntelligenceType(doc.analysisType);
        
        // Log para rastreabilidade
        KC.Logger?.info('IntelligenceEnrichmentPipeline', 
            `Mapeando analysisType "${doc.analysisType}" → intelligenceType "${intelligenceType}" para documento "${doc.name}"`);
        
        return intelligenceType;
    }
    
    // Fallback com logging
    KC.Logger?.warning('IntelligenceEnrichmentPipeline', 
        `Documento "${doc.name}" sem analysisType, usando fallback 'knowledge_piece'`);
    
    return 'knowledge_piece';
}
```

### MAPEAMENTO COMPLETO IMPLEMENTADO
| AnalysisType | IntelligenceType |
|--------------|------------------|
| Breakthrough Técnico | technical_innovation |
| Evolução Conceitual | conceptual_evolution |
| Momento Decisivo | decision_point |
| Insight Estratégico | strategic_insight |
| Aprendizado Geral | knowledge_piece |

### COMANDOS DE VALIDAÇÃO
```javascript
// Verificar mapeamentos
Object.values(KC.AnalysisTypes).forEach(type => {
    const intelligence = KC.AnalysisTypesManager.getIntelligenceType(type.name);
    console.log(`${type.name} → ${intelligence}`);
});

// Testar método
KC.AnalysisTypesManager.getIntelligenceType('Breakthrough Técnico'); // 'technical_innovation'
KC.AnalysisTypesManager.getIntelligenceType('Evolução Conceitual'); // 'conceptual_evolution'

// Verificar no Qdrant após reprocessamento
KC.QdrantService.searchByText('*', { limit: 10 }).then(results => {
    const types = results.map(r => r.payload.intelligence_type);
    console.log('Intelligence Types únicos:', [...new Set(types)]);
});
```

### PRÓXIMOS PASSOS
1. **Reprocessar dados existentes**: Os 351 pontos no Qdrant precisam ser reprocessados para aplicar o mapeamento correto
2. **Validar distribuição**: Verificar que os 5 tipos estão sendo mapeados corretamente
3. **Monitorar logs**: Acompanhar logs de mapeamento para garantir funcionamento

### BENEFÍCIOS
- ✅ **Single Source of Truth**: AnalysisTypes.js como fonte única
- ✅ **Mapeamento Completo**: Todos os 5 tipos mapeados corretamente
- ✅ **Rastreabilidade**: Logs detalhados de cada mapeamento
- ✅ **Extensibilidade**: Novos tipos são automaticamente suportados
- ✅ **Compatibilidade**: Mantém funcionamento de casos especiais

### PADRÃO SEGUIDO
Esta correção seguiu o mesmo padrão bem-sucedido usado na correção das Categorias (Bug #11):
- Centralização em um Manager
- Fonte única de verdade
- Event-driven updates
- Logging para rastreabilidade
- Compatibilidade mantida

### LIÇÕES APRENDIDAS
1. **Sempre usar Managers centralizados** para evitar duplicação
2. **Evitar hardcoding** de mapeamentos
3. **Implementar logging** para facilitar debug
4. **Seguir padrões estabelecidos** (como o das Categorias)

### STATUS FINAL
✅ Mapeamento completo implementado
✅ Single Source of Truth respeitado
✅ Logging e rastreabilidade adicionados
✅ Compatibilidade com dados existentes mantida