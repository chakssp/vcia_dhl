## 8. Seção: Keywords

```json
[]  // Array de keywords adicionais (vazio neste exemplo)
```

---

## 9. Tipos de Análise Automática (`analysisType` | `AnalysisTypes.js`)

### 9.1 Componente Responsável
- **Detecção**: `FileRenderer.detectAnalysisType()` (linhas 1115-1138)
- **Definição Central**: `AnalysisTypes.js` (fonte única de verdade)
- **Boost de Relevância**: `FileRenderer.calculateEnhancedRelevance()`

### 9.2 Tipos Disponíveis

#### Breakthrough Técnico (+25% relevância)
```javascript
{
  name: "Breakthrough Técnico",
  keywords: ['solução', 'configuração', 'arquitetura', 'implementação', 'código'],
  relevanceBoost: 0.25,    // Adiciona 25% ao score de relevância
  priority: 1,             // Maior prioridade
  color: '#4f46e5',
  icon: '🔧',
  categoryId: 'tecnico'    // Sugere categoria técnica
}
```
**Quando é detectado**: Arquivos contendo soluções técnicas, configurações de sistema, arquiteturas ou implementações de código.

#### Evolução Conceitual (+25% relevância)
```javascript
{
  name: "Evolução Conceitual",
  keywords: ['entendimento', 'perspectiva', 'visão', 'conceito', 'teoria'],
  relevanceBoost: 0.25,
  priority: 2,
  color: '#dc2626',
  icon: '💡',
  categoryId: 'conceitual'
}
```
**Quando é detectado**: Arquivos com novos entendimentos, mudanças de perspectiva ou visões conceituais.

#### Momento Decisivo (+20% relevância)
```javascript
{
  name: "Momento Decisivo",
  keywords: ['decisão', 'escolha', 'direção', 'estratégia', 'definição'],
  relevanceBoost: 0.20,
  priority: 3,
  color: '#d97706',
  icon: '🎯',
  categoryId: 'decisivo'
}
```
**Quando é detectado**: Documentos que registram decisões importantes, escolhas estratégicas ou mudanças de direção.

#### Insight Estratégico (+15% relevância)
```javascript
{
  name: "Insight Estratégico",
  keywords: ['insight', 'transformação', 'breakthrough', 'descoberta', 'revelação'],
  relevanceBoost: 0.15,
  priority: 4,
  color: '#7c3aed',
  icon: '✨',
  categoryId: 'insight'
}
```
**Quando é detectado**: Arquivos contendo insights transformadores ou descobertas estratégicas.

#### Aprendizado Geral (+5% relevância)
```javascript
{
  name: "Aprendizado Geral",
  keywords: ['aprendizado', 'conhecimento', 'estudo', 'análise', 'observação'],
  relevanceBoost: 0.05,
  priority: 5,
  color: '#be185d',
  icon: '📚',
  categoryId: 'aprendizado'
}
```
**Quando é detectado**: Tipo padrão para arquivos que não se encaixam nas categorias acima.

### 9.3 Processo de Detecção

```javascript
// FileRenderer.detectAnalysisType() - Processo simplificado
1. Combina nome do arquivo + conteúdo em lowercase
2. Verifica keywords em ordem de prioridade (1-5)
3. Retorna o primeiro tipo que encontrar match
4. Se nenhum match, retorna "Aprendizado Geral"
```

### 9.4 Impacto no Score de Relevância

```javascript
// FileRenderer.calculateEnhancedRelevance()
scoreBase = 0.50  // Exemplo
analysisType = "Breakthrough Técnico"  // +25%
scoreFinal = 0.50 * 1.25 = 0.625  // 62.5%
```

### 9.5 Relação com Categorias

Cada tipo de análise sugere uma categoria automaticamente:
- "Breakthrough Técnico" → categoria "tecnico"
- "Evolução Conceitual" → categoria "conceitual"
- "Momento Decisivo" → categoria "decisivo"
- "Insight Estratégico" → categoria "insight"
- "Aprendizado Geral" → categoria "aprendizado"

**Nota**: O usuário pode sobrescrever essas sugestões durante a curadoria manual.

---