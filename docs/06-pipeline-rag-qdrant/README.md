# 🚀 Pipeline RAG e Integração Qdrant

Esta pasta documenta o **pipeline completo de processamento RAG** desde a consolidação até a indexação no Qdrant.

## 🎯 Objetivo Principal
Implementar pipeline automatizado que transforma conhecimento bruto em embeddings vetorizados, prontos para busca semântica.

## 📄 Documentos Principais

### Pipeline Core
- `pipeline-consolidacao-rag-completo.md` - Documentação completa do pipeline
- `wave-1-execucao-pipeline.md` - Execução da primeira onda

### Implementação e UI
- `implementacao-export-ui.md` - Interface de exportação
- `instrucoes-teste-pipeline.md` - Como testar o pipeline
- `teste-final-pipeline.md` - Testes de validação

### Deploy e Status
- `deploy-check-pipeline.md` - Checklist de deploy
- `status-pipeline-final.md` - Status final da implementação

## 🔧 Fluxo do Pipeline

```
1. Consolidação (RAGExportManager)
   ↓
2. Chunking Semântico (ChunkingUtils)
   ↓
3. Geração de Embeddings (EmbeddingService)
   ↓
4. Indexação no Qdrant (QdrantService)
```

## 📊 Componentes
- **RAGExportManager** - Orquestrador principal
- **ChunkingUtils** - Chunking inteligente
- **QdrantSchema** - Estrutura de dados

## 🔍 Como Referenciar
```
@06-pipeline-rag-qdrant/pipeline-consolidacao-rag-completo.md
```