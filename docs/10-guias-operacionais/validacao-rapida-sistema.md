# Validação Rápida do Sistema - Checklist de Início

## 🎭 NOVO PADRÃO - VALIDAÇÃO COM PLAYWRIGHT
**Use o guia atualizado**: [@validacao-rapida-playwright.md](./validacao-rapida-playwright.md)
- Validação 100% automatizada com Playwright MCP
- Sem necessidade de abrir console manualmente
- Resultados instantâneos e screenshots automáticos

---

## 🚀 Comando de Início Ultra-Rápido (Método Antigo)
```
Execute no console em http://127.0.0.1:5500: kcdiag()
```
**Nota**: Este método manual está sendo substituído por Playwright

## ✅ Checklist de Validação (5 minutos)

### 1. Verificação Básica do Sistema
```javascript
// Execute no console do navegador
kcdiag()  // Deve mostrar todos os componentes carregados
```

✅ Esperado: Lista de componentes sem erros

### 2. Verificar Arquivos Carregados
```javascript
KC.AppState.get('files').length  // Quantidade total
KC.AppState.get('files').filter(f => f.analyzed).length  // Analisados
KC.AppState.get('files').filter(f => f.categories?.length > 0).length  // Categorizados
```

✅ Esperado: Números > 0 indicando arquivos no sistema

### 3. Verificar Serviços Externos
```javascript
// Ollama (embeddings)
KC.EmbeddingService.checkOllamaAvailability()

// Qdrant (vector DB)
KC.QdrantService.checkConnection()
KC.QdrantService.getCollectionStats()
```

✅ Esperado: Conexões ativas e estatísticas disponíveis

### 4. Testar Busca Semântica
```javascript
// Buscar por termo
KC.SimilaritySearchService.searchByText('conhecimento')

// Ver estatísticas
KC.SimilaritySearchService.getStats()
```

✅ Esperado: Resultados relevantes retornados

### 5. Verificar Interface
```javascript
// Mostrar lista de arquivos
KC.FileRenderer.showFilesSection()

// Verificar etapa atual
KC.AppController.currentStep
```

✅ Esperado: Interface responsiva e etapa correta

## 🔴 Troubleshooting Rápido

### Se Ollama não está disponível:
```bash
# Terminal
ollama serve
ollama pull nomic-embed-text
```

### Se Qdrant não conecta:
- Verificar VPN/Tailscale
- URL correta: http://qdr.vcia.com.br:6333

### Se não há arquivos:
1. Ir para Etapa 1 na interface
2. Selecionar pasta com arquivos
3. Aplicar descoberta

## 📊 Estado Esperado do Sistema

### Componentes Principais:
- ✅ 20+ componentes carregados
- ✅ EventBus ativo
- ✅ AppState com dados

### Serviços Ativos:
- ✅ EmbeddingService (Ollama)
- ✅ QdrantService (Vector DB)
- ✅ SimilaritySearchService
- ✅ TripleStoreService

### ML Confidence (Wave 10):
- ✅ ABTestingFramework
- ✅ CanaryController
- ✅ ProductionMonitor

## 🎯 Próximos Passos Após Validação

1. **Para desenvolvimento**: Consultar LEIS em CLAUDE.md
2. **Para correções**: Ver bugs em RESUME-STATUS.md
3. **Para arquitetura**: Docs em /docs/09-arquitetura-decisoes/
4. **Para testes**: Usar /test/html/ para validações

## 📝 Comando Resumido para Copiar
```
No console: kcdiag() && KC.AppState.get('files').length && KC.QdrantService.checkConnection() && KC.EmbeddingService.checkOllamaAvailability()
```

Este comando executa todas as validações essenciais de uma vez!