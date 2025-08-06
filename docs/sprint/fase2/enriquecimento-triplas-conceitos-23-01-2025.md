# Enriquecimento: Adicionar Triplas de Conceitos - 23/01/2025

## SPRINT 2.2.1 - FASE 3: Enriquecimento Semântico

### Problema Identificado
- Grafo mostrava apenas conexões diretas arquivo → analysisType
- Faltavam conceitos intermediários para criar rede mais rica
- Arquivos com mesmo tipo de análise não se conectavam visualmente

### Solução Implementada
- Adicionado mapeamento de conceitos para cada tipo de análise
- Criadas triplas adicionais: arquivo → conceito e analysisType → conceito
- Conceitos atuam como nós intermediários conectando arquivos similares

### Mapeamento de Conceitos
```javascript
const conceptMap = {
    'Breakthrough Técnico': ['inovação', 'tecnologia', 'solução técnica'],
    'Evolução Conceitual': ['evolução', 'conceito', 'desenvolvimento'],
    'Momento Decisivo': ['decisão', 'marco', 'ponto de virada'],
    'Insight Estratégico': ['estratégia', 'visão', 'planejamento'],
    'Aprendizado Geral': ['conhecimento', 'aprendizado', 'experiência']
};
```

### Triplas Geradas

1. **Arquivo → Conceito**
   ```javascript
   {
       legado: { tipo: 'SYS.R', valor: file.id },
       presente: { tipo: 'SUB.R', valor: 'relacionadoConceito' },
       objetivo: { tipo: 'ACT.R', valor: concept },
       metadados: {
           fonte: 'enriquecimento_semantico',
           confianca: 0.7,
           analysisType: file.analysisType
       }
   }
   ```

2. **AnalysisType → Conceito**
   ```javascript
   {
       legado: { tipo: 'SYS.R', valor: file.analysisType },
       presente: { tipo: 'SUB.R', valor: 'temConceito' },
       objetivo: { tipo: 'ACT.R', valor: concept },
       metadados: {
           fonte: 'modelo_semantico',
           confianca: 0.9
       }
   }
   ```

### Resultado Esperado
1. **Grafo mais conectado** - Conceitos criam pontes entre arquivos
2. **Clusters temáticos** - Arquivos com análises similares se agrupam
3. **Navegação intuitiva** - Usuário pode explorar por conceitos

### Exemplo de Conexões
```
file_123 ─┬─> "Breakthrough Técnico" ─┬─> "inovação"     <─┬─ file_456
          │                           ├─> "tecnologia"    <─┤
          │                           └─> "solução técnica"<─┘
          └─> categoria_789
```

### Conformidade com LEIS
- ✅ LEI 1: Apenas adicionou lógica, não modificou existente
- ✅ LEI 6: Documentação criada
- ✅ LEI 9: Enriquecimento modular e reutilizável
- ✅ LEI 11: Mantém correlação com analysisType da Etapa 3

### Próximos Passos
- FASE 4: Implementar física adaptativa para melhor distribuição visual