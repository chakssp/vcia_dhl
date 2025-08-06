# Guia de Preparação de Dados - Fase 2
## Intelligence Enrichment Initiative

**Data**: 31/01/2025  
**Objetivo**: Preparar dados do próprio projeto para validação do pipeline  

---

## 📋 Checklist de Preparação

### 1. Reset do Qdrant
- [ ] Fazer backup da collection atual (opcional)
- [ ] Deletar collection `knowledge_consolidator`
- [ ] Verificar que foi removida com sucesso
- [ ] A collection será recriada automaticamente na primeira inserção

### 2. Seleção de Arquivos do Projeto

#### Arquivos Recomendados para Teste (Alta Convergência Esperada):

**Grupo 1 - Documentação da Intelligence Initiative (9 arquivos)**
```
docs/intelligence-enrichment-initiative/
├── PRD-INTELLIGENCE-ENRICHMENT.md
├── TECHNICAL-SPECS.md
├── IMPLEMENTATION-GUIDE.md
├── TEST-PLAN.md
├── CONTEXT-RECOVERY.md
├── PROTOCOLO-REINICIALIZACAO.md
├── PROGRESS-REPORT-PHASE1.md
├── PHASE1-COMPLETION-REPORT.md
└── FASE2-DATA-PREPARATION-GUIDE.md (este arquivo)
```

**Grupo 2 - Documentação Técnica do Projeto (10 arquivos)**
```
docs/
├── 01-valorizacao-categorias-humanas/
│   └── mudancas-criticas-implementadas.md
├── 02-integracao-embeddings-ollama/
│   └── progresso-embeddings-qdrant-17-07-2025.md
├── 03-analise-correlacoes-sistema/
│   └── FONTES-UNICAS-VERDADE.md
├── 04-bugs-resolvidos/
│   └── (vários arquivos de bugs resolvidos)
├── 05-grafos-visualizacao/
│   └── sistema-visualizacao-grafos.md
├── 06-pipeline-rag-qdrant/
│   └── pipeline-consolidacao-rag-completo.md
└── INDICE-DOCUMENTACAO.md
```

**Grupo 3 - Documentação de Controle (8 arquivos)**
```
├── CLAUDE.md
├── RESUME-STATUS.md
├── README.md
├── CHECKPOINT-30-07-2025.md
├── PLANO-RESET-CARGA-QDRANT.md
├── INICIO-SESSAO.md
├── PRD.md
└── CLAUDE.local.md (se existir)
```

**Grupo 4 - Documentação de Agentes e Workflows (5+ arquivos)**
```
agents_output/
├── wave1_discovery_system.md
├── wave2_preview_intelligence.md
├── wave3_ai_analysis_integration.md
├── wave4_organization_export.md
├── wave6_ml_confidence_core.md
├── wave7_confidence_validation.md
├── wave8_ml_dashboard.md
├── wave9_performance_optimization.md
└── wave10_production_deployment.md
```

**Total**: ~30+ arquivos .md altamente relacionados

### 3. Categorização Sugerida

Para maximizar o valor do teste, categorize os arquivos:

| Categoria | Arquivos | Razão |
|-----------|----------|-------|
| Intelligence/Docs | Todos de docs/intelligence-enrichment-initiative/ | Core da initiative |
| Technical/Docs | docs/01-*, 02-*, 03-*, etc | Documentação técnica |
| Project/Control | CLAUDE.md, RESUME-STATUS.md, etc | Controle do projeto |
| System/Waves | agents_output/wave*.md | Implementação por waves |
| Project/Meta | README.md, PRD.md, etc | Meta-documentação |

### 4. Preparação no Knowledge Consolidator

#### Passo a Passo:

1. **Etapa 1 - Descoberta**
   ```javascript
   // Configure para descobrir apenas arquivos .md relevantes
   // Use patterns como:
   // - docs/**/*.md
   // - agents_output/**/*.md
   // - *.md (para arquivos na raiz)
   
   // Ou simplesmente selecione o diretório raiz e filtre por .md
   ```

2. **Etapa 2 - Análise Local**
   ```javascript
   // Keywords recomendadas para aumentar relevância:
   - convergence
   - enrichment
   - intelligence
   - embedding
   - semantic
   - pipeline
   - qdrant
   - analysis
   ```

3. **Etapa 3 - Análise com IA**
   ```javascript
   // Certifique-se que Ollama está rodando
   // Use template "Momentos Decisivos" ou "Breakthrough Técnico"
   ```

4. **Etapa 4 - Organização**
   - Aplique as categorias sugeridas
   - Marque TODOS como aprovados
   - **IMPORTANTE**: Ative o toggle "🧠 Habilitar Análise de Inteligência"

### 5. Configurações Recomendadas para o Pipeline

```javascript
// No console, antes de processar:
KC.IntelligenceEnrichmentPipeline.config = {
    batchSize: 10, // Menor para melhor análise
    minConvergenceScore: 30,
    autoDetectBreakthroughs: true,
    enableCache: true
};

// Verificar configuração
KC.IntelligenceEnrichmentPipeline.config
```

### 6. Métricas Esperadas

Com estes arquivos altamente relacionados, esperamos:

| Métrica | Expectativa | Razão |
|---------|-------------|-------|
| Cadeias de convergência | 4-6 | Grupos temáticos claros |
| Força média | > 75% | Alta similaridade semântica |
| Documentos hub | 3-4 | CLAUDE.md, PRD-INTELLIGENCE-ENRICHMENT.md, RESUME-STATUS.md |
| Breakthroughs | 2-3 | Momentos de decisão do projeto |
| Insights | 10-15 | Padrões e relações entre documentos |

### 7. Comandos de Validação Pós-Processamento

```javascript
// Verificar metadados salvos
const metadata = KC.AppState.get('knowledgeMetadata');
console.log('Resumo:', metadata.summary);
console.log('Cadeias:', metadata.keyFindings.topChains);
console.log('Temas:', metadata.keyFindings.majorThemes);

// Verificar no Qdrant
// Use o Qdrant Explorer ou faça query direta
KC.QdrantService.search({
    vector: null, // busca sem vetor
    filter: {
        must: [{
            key: "convergenceScore",
            range: { gte: 50 }
        }]
    },
    limit: 10
});
```

### 8. Critérios de Sucesso da Validação

A Fase 2 será bem-sucedida se:

1. ✅ Todas as convergências detectadas fazem sentido semanticamente
2. ✅ Documentos relacionados estão nas mesmas cadeias
3. ✅ Scores refletem a realidade (docs similares = scores altos)
4. ✅ Intelligence Lab mostra visualizações enriquecidas
5. ✅ Performance se mantém < 2s por documento

### 9. Troubleshooting

**Se não detectar convergências:**
- Verifique se Ollama está gerando embeddings
- Reduza o threshold para 0.6 temporariamente
- Verifique o cache de embeddings

**Se detectar convergências fracas:**
- Verifique a qualidade dos embeddings
- Considere usar documentos mais relacionados
- Ajuste o minClusterSize para 2

**Se performance estiver lenta:**
- Reduza batchSize para 5
- Verifique se cache está funcionando
- Monitor o uso de memória

---

## 🎯 Resultado Esperado

Após o processamento, você deve ter:
- ~25 documentos no Qdrant com campos de inteligência populados
- 3-5 cadeias de convergência claramente identificadas
- Visualizações ricas no Intelligence Lab
- Base sólida para ajustar parâmetros

---

**Próximo Passo**: Após carregar os dados, execute análise detalhada dos resultados e documente em FASE2-VALIDATION-RESULTS.md