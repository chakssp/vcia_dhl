# 05 - UnifiedConfidenceSystem Refactor Spec

## Status: 🔄 REQUER DESACOPLAMENTO

### Ordem de Implementação: 5/8

### Problema Principal
- Sistema atual depende fortemente de categorias para boost
- Se CategoryManager falha, confidence scores ficam incorretos
- Acoplamento desnecessário entre sistemas

### Arquitetura V2: Sistema Independente

#### Componentes de Confiança
```javascript
class ConfidenceCalculator {
  constructor() {
    // Fatores independentes de categorias
    this.factors = {
      content: {
        keywords: 0.3,      // Relevância por palavras-chave
        structure: 0.2,     // Qualidade estrutural do documento
        length: 0.1,        // Tamanho adequado
        metadata: 0.1       // Metadados completos
      },
      semantic: {
        embeddings: 0.2,    // Similaridade semântica
        clusters: 0.1       // Pertencimento a clusters
      },
      // Categorias como fator OPCIONAL, não obrigatório
      userCuration: {
        categories: 0.0,    // Começa em 0
        tags: 0.0,         // Tags manuais
        rating: 0.0        // Avaliação do usuário
      }
    };
  }
  
  calculate(file) {
    let score = 0;
    
    // Cálculos base (sempre funcionam)
    score += this.calculateKeywordScore(file) * this.factors.content.keywords;
    score += this.calculateStructureScore(file) * this.factors.content.structure;
    score += this.calculateLengthScore(file) * this.factors.content.length;
    score += this.calculateMetadataScore(file) * this.factors.content.metadata;
    
    // Semântico (se disponível)
    if (this.embeddingService?.isAvailable()) {
      score += this.calculateSemanticScore(file) * this.factors.semantic.embeddings;
    }
    
    // Boost opcional por curadoria (não quebra se faltar)
    if (file.categories?.length > 0) {
      score += 0.1 * Math.min(file.categories.length, 3); // Max 30% boost
    }
    
    return Math.min(score * 100, 100); // 0-100%
  }
}
```

#### Visualização V2
```javascript
// Barras de progresso coloridas
function getConfidenceColor(score) {
  if (score >= 70) return '#10b981'; // Verde
  if (score >= 40) return '#f59e0b'; // Amarelo
  return '#ef4444'; // Vermelho
}

// Componente visual
<div class="confidence-bar" style={{
  width: `${score}%`,
  backgroundColor: getConfidenceColor(score)
}}>
  <span class="confidence-value">{score}%</span>
</div>
```

### Integração V2
1. Calcular scores durante descoberta (LEI #13)
2. Mostrar barras coloridas na lista de arquivos
3. Permitir ordenação por confiança
4. Exportar scores para análise

### Benefícios do Desacoplamento
- ✅ Sistema funciona mesmo sem categorias
- ✅ Cálculo mais robusto e confiável
- ✅ Performance melhorada (menos dependências)
- ✅ Facilita testes e manutenção

### Métricas Adicionais (Futuro)
- Frequência de acesso
- Histórico de modificações
- Feedback de análise IA
- Relevância temporal

### Próximo: [06-analysis-ai-manager.md](./06-analysis-ai-manager.md)