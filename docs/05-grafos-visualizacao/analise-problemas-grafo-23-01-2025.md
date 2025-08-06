# Análise dos Problemas do Grafo de Conhecimento - 23/01/2025

## Análise da Imagem

A imagem mostra o grafo de conhecimento com os seguintes problemas identificados:

### 1. **Nós Amarelos (Arquivos) Ilegíveis**
- **Problema**: Labels dos nós amarelos estão truncados ou muito pequenos
- **Causa**: Formatação inadequada dos labels e fonte pequena
- **Solução Implementada**:
  - Melhorado método `_formatNodeLabel()` para buscar nomes reais de arquivos
  - Aumentado tamanho da fonte de 12 para 14px (bold)
  - Remoção automática de extensões de arquivo
  - Truncamento inteligente em 40 caracteres

### 2. **Nós Cinza (Centrais) Sem Identificação Clara**
- **Problema**: Nós cinza aparecem como hubs centrais mas sem labels claros
- **Causa**: São IDs de arquivo não resolvidos
- **Solução Implementada**:
  - Detecção de arquivos por ID (file_xxx)
  - Uso de forma diamante para arquivos
  - Cor cinza (#6b7280) para diferenciar

### 3. **Categoria Verde Isolada**
- **Problema**: Categoria aparece sem conexões com arquivos
- **Causa**: Arquivos não foram categorizados ou conexões não criadas
- **Solução Implementada**:
  - Categorias sempre adicionadas ao grafo (mesmo sem conexões)
  - Melhorado algoritmo de busca de conexões arquivo-categoria
  - Cores mais vibrantes e tamanho dinâmico baseado em número de arquivos

### 4. **Erro TripleStoreManager**
- **Problema**: `KC.TripleStoreManager.adicionarTripla is not a function`
- **Solução**: Adicionado verificação de tipo antes de chamar o método

### 5. **Dados MCP/Qdrant Desconectados**
- **Problema**: "Projeto IA" e "Qdrant" aparecem isolados
- **Causa**: Diferentes esquemas de dados não integrados
- **Análise**: Necessita revisão da integração entre fontes de dados

## Melhorias Implementadas

### 1. Formatação de Labels
```javascript
// Busca nome real de arquivos
if (str.startsWith('file_')) {
    const file = files.find(f => f.id === str);
    if (file) return this._truncateLabel(file.name);
}

// Remove extensões e prefixos técnicos
const cleaned = str.replace(/^(file_|cat_|triple-|analysis_|triple-obj-)/, '');
const noExt = cleaned.replace(/\.(txt|md|pdf|docx|doc|json|js|html|css|png|jpg|jpeg)$/i, '');
```

### 2. Categorias Melhoradas
```javascript
// Tamanho dinâmico baseado em arquivos
size: 30 + (fileCount * 2),

// Cores com destaque
color: {
    background: cat.color || '#10b981',
    border: cat.color || '#10b981',
    highlight: {
        background: cat.color || '#10b981',
        border: '#064e3b'
    }
}
```

### 3. Conexões Arquivo-Categoria
```javascript
// Busca mais abrangente de nós de arquivo
const fileNode = nodeMap.get(fileNodeId) || 
    Array.from(nodeMap.values()).find(n => 
        n.label === file.name || 
        n.label === this._formatNodeLabel(file.name) ||
        n.id.includes(file.id)
    );

// Arestas mais visíveis
{
    from: fileNode.id,
    to: catNodeId,
    label: 'categorizado como',
    color: { color: '#10b981', opacity: 0.6 },
    width: 3
}
```

## Problemas Pendentes

### 1. **Integração de Dados**
- MCP e Qdrant usam esquemas diferentes
- Necessita normalização dos dados antes de adicionar ao grafo
- Considerar criar adaptadores específicos para cada fonte

### 2. **Layout do Grafo**
- Muitos nós sobrepostos no centro
- Considerar usar layout hierárquico para melhor organização
- Implementar agrupamento por tipo ou categoria

### 3. **Interatividade**
- Adicionar filtros para mostrar/ocultar tipos de nós
- Implementar zoom para áreas específicas
- Melhorar tooltip com mais informações

## Próximos Passos

1. **Testar com dados reais categorizados**
2. **Implementar normalização de dados MCP/Qdrant**
3. **Melhorar algoritmo de layout**
4. **Adicionar legendas para tipos de nós**
5. **Implementar filtros interativos**

## Conclusão

As correções implementadas melhoram significativamente a legibilidade e organização do grafo. O principal desafio restante é a integração adequada entre diferentes fontes de dados (AppState, MCP, Qdrant) que usam esquemas diferentes.