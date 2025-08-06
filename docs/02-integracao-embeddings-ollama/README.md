# 🤖 Integração Embeddings e Ollama

Esta pasta documenta toda a **fundação semântica** do sistema através de embeddings locais com Ollama.

## 🎯 Objetivo Principal
Estabelecer uma base semântica sólida usando embeddings locais (Ollama) integrados com Qdrant para busca vetorial.

## 📄 Documentos Principais

### Implementação Base
- `inicio-implementacao-embeddings.md` - Início da jornada semântica
- `implementacao-qdrant-service.md` - Integração com banco vetorial
- `implementacao-similarity-search-service.md` - Busca por similaridade

### Arquitetura
- `arquitetura-embeddings-rag.md` - Design completo do sistema RAG
- `analise-arquitetural-bottomup.md` - Abordagem bottom-up

### Troubleshooting
- `homologacao-ollama-*.md` - Testes e validação
- `troubleshooting-resposta-vazia-ollama.md` - Soluções de problemas
- `debug-embeddings-*.md` - Debugging detalhado

## 🔧 Stack Técnica
- **Ollama**: Modelo nomic-embed-text (768 dimensões)
- **Qdrant**: Vector database na VPS
- **Cache**: IndexedDB local

## 🔍 Como Referenciar
```
@02-integracao-embeddings-ollama/arquitetura-embeddings-rag.md
```