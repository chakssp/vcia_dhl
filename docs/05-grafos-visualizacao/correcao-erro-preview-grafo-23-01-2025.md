# Correção do Erro de Preview no Grafo - 23/01/2025

## Contexto
Após o upload bem-sucedido dos chunks no Qdrant, ao abrir o grafo de conhecimento ocorreu o erro:
```
TypeError: text.match is not a function
    at GraphVisualization._extractEntities
```

## Análise do Problema

### Causa Raiz
O método `_extractEntities()` esperava receber uma string, mas o campo `file.preview` é um objeto complexo criado pelo `PreviewUtils` com a seguinte estrutura:

```javascript
preview: {
    segments: {
        segment1: "primeiras 30 palavras...",
        segment2: "segundo parágrafo...",
        segment3: "último parágrafo antes de :",
        segment4: "frase com :",
        segment5: "30 palavras após :"
    },
    keywords: ["palavra1", "palavra2"],
    relevanceScore: 85
}
```

### Impacto
- O grafo não conseguia ser renderizado
- Erro impedia a visualização completa dos dados
- Afetava apenas quando havia arquivos com preview estruturado

## Solução Implementada

### 1. Método `_extractEntities` Corrigido
```javascript
_extractEntities(preview) {
    const entities = [];
    
    // Converter preview para string se necessário
    let text = '';
    if (typeof preview === 'string') {
        text = preview;
    } else if (preview && typeof preview === 'object') {
        // Se preview for um objeto com segmentos
        if (preview.segments) {
            text = Object.values(preview.segments).join(' ');
        } else if (preview.content) {
            text = preview.content;
        } else {
            // Tentar converter para string
            text = JSON.stringify(preview);
        }
    } else {
        return entities;
    }
    
    // Continua com extração normal...
}
```

### 2. Melhorias no `loadInitialData`
```javascript
async loadInitialData() {
    try {
        const files = AppState.get('files') || [];
        const categories = KC.CategoryManager?.getCategories() || [];
        
        if (files.length > 0 || categories.length > 0) {
            // Usa o método completo que garante SSO
            await this.loadFromAppState();
        } else {
            // Feedback ao usuário
            EventBus.emit(Events.NOTIFICATION, {
                type: 'info',
                message: 'Nenhum dado disponível para visualização'
            });
        }
    } catch (error) {
        Logger.error('[GraphVisualization] Erro ao carregar dados iniciais:', error);
        // Tratamento de erro com feedback
    }
}
```

## Benefícios da Correção

1. **Robustez**: Suporta diferentes formatos de preview
2. **Compatibilidade**: Funciona com preview estruturado do PreviewUtils
3. **Extração Melhorada**: Concatena todos os segmentos para análise
4. **Tratamento de Erros**: Feedback claro ao usuário
5. **SSO Garantido**: Usa `loadFromAppState` para manter fonte única

## Teste da Correção

Para testar:
1. Recarregue a página
2. Processe arquivos com o pipeline RAG
3. Abra o grafo de conhecimento
4. O grafo deve carregar sem erros

## Próximos Passos

1. Considerar melhorar a extração de entidades para usar o campo `keywords` do preview
2. Implementar cache de entidades extraídas
3. Adicionar mais padrões de extração específicos para o domínio

## Arquivos Modificados

- `/js/components/GraphVisualization.js`
  - Método `_extractEntities()` - linha 1226
  - Método `loadInitialData()` - linha 244

## LEI 6 - Documentação
Esta documentação foi criada conforme a LEI 6 do projeto para registrar a correção aplicada.