# 🔍 Debug de Embeddings - Análise e Correções

## Problema Identificado

O pipeline estava falhando na geração de embeddings com retry múltiplo:
```
Tentando novamente chunk ... (2 tentativas restantes)
Tentando novamente chunk ... (1 tentativas restantes)
Erro ao processar chunk ... após 3 tentativas
```

## Possíveis Causas

1. **Conteúdo muito curto** - Alguns chunks podem ter menos de 10 caracteres
2. **Problemas de conexão com Ollama** - API pode estar instável
3. **Formato de resposta inesperado** - Embedding retornando undefined

## Correções Aplicadas

### 1. Requisito de Tamanho Reduzido
- Antes: Mínimo 10 caracteres
- Depois: Mínimo 3 caracteres

### 2. Enriquecimento de Texto Curto
```javascript
// Se conteúdo < 20 chars, adiciona contexto
if (content.trim().length < 20) {
    textForEmbedding = `Documento: ${content}`;
}
```

### 3. IDs Numéricos para Qdrant
- Mudança de IDs string para numéricos únicos
- Formato: `Date.now() * 1000 + index`

## Ferramentas de Debug Criadas

### 1. Página de Debug de Embeddings
```
http://127.0.0.1:5500/test/test-embedding-debug.html
```

Esta página oferece:
- Teste básico de embedding
- Teste com conteúdo de arquivo real
- Teste direto com Ollama API
- Verificação de configuração

### 2. Testes Recomendados

1. **Verificar Ollama**:
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```

2. **Testar embedding direto**:
   ```bash
   curl -X POST http://127.0.0.1:11434/api/embeddings \
     -H "Content-Type: application/json" \
     -d '{"model": "nomic-embed-text", "prompt": "teste"}'
   ```

3. **No console do navegador**:
   ```javascript
   // Teste simples
   KC.EmbeddingService.generateEmbedding("teste").then(console.log)
   
   // Ver configuração
   console.log(KC.EmbeddingService.config)
   
   // Ver estatísticas
   console.log(KC.EmbeddingService.stats)
   ```

## Próximos Passos

1. **Use a página de debug** para identificar exatamente onde está falhando
2. **Verifique se Ollama está respondendo** corretamente
3. **Execute o pipeline novamente** após as correções

## Status Esperado

Se tudo funcionar:
- ✅ Embeddings gerados (Array[768])
- ✅ Sem erros de retry
- ✅ Inserção bem-sucedida no Qdrant
- ✅ 42 chunks processados com sucesso

---

**Data**: 17/01/2025
**Problema**: Falhas múltiplas na geração de embeddings
**Solução**: Redução de requisitos e enriquecimento de texto