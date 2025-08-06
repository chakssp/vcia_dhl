# 🌐 REST API Specification

## Overview

O Knowledge Consolidator expõe uma API REST interna para integração com sistemas externos como N8N, automações personalizadas e aplicações terceiras.

**Base URL**: `http://localhost:3000/api`  
**Authentication**: Bearer Token  
**Content-Type**: `application/json`

## Authentication

### Bearer Token
```http
Authorization: Bearer <token>
```

### Configuração de Tokens
```javascript
// Configurar tokens válidos
KC.APIServer.configure({
  authentication: {
    type: 'bearer',
    tokens: [
      'kc-secure-token-2025',
      'n8n-integration-token',
      'custom-app-token'
    ]
  }
})
```

## Endpoints

### 📁 Files API

#### GET `/api/files`
Lista todos os arquivos descobertos e analisados.

**Query Parameters**:
- `category` (string, optional): Filtrar por categoria
- `analyzed` (boolean, optional): Filtrar por status de análise
- `relevance_min` (number, optional): Relevância mínima (0-1)
- `limit` (number, optional): Limite de resultados (default: 100)
- `offset` (number, optional): Offset para paginação (default: 0)

**Response**:
```json
{
  "status": "success",
  "data": {
    "files": [
      {
        "id": "file_001",
        "name": "estrategia-ia.md",
        "path": "/knowledge/projetos/estrategia-ia.md",
        "size": 15420,
        "created_at": "2025-01-15T10:30:00Z",
        "modified_at": "2025-08-01T14:22:00Z",
        "relevanceScore": 0.94,
        "confidence": 0.92,
        "analysisType": "Momento Decisivo",
        "categories": ["IA/ML", "Estratégia"],
        "analyzed": true,
        "preview": "Análise estratégica sobre implementação de IA...",
        "insights": [
          "Automatização de processos críticos",
          "ROI esperado de 300% em 18 meses"
        ],
        "embeddings": {
          "vector_id": "emb_001",
          "dimensions": 768,
          "model": "nomic-embed-text"
        }
      }
    ],
    "pagination": {
      "total": 247,
      "limit": 100,
      "offset": 0,
      "has_next": true
    }
  }
}
```

#### POST `/api/files/analyze`
Inicia análise IA para arquivos específicos.

**Request Body**:
```json
{
  "file_ids": ["file_001", "file_002"],
  "template": "decisiveMoments",
  "provider": "ollama",
  "batch_size": 5
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "job_id": "analysis_job_123",
    "files_queued": 2,
    "estimated_time": "00:05:30",
    "webhook_url": "/api/jobs/analysis_job_123/status"
  }
}
```

#### GET `/api/files/{file_id}`
Obtém detalhes completos de um arquivo específico.

**Response**:
```json
{
  "status": "success",
  "data": {
    "file": {
      "id": "file_001",
      "name": "estrategia-ia.md",
      "content": "# Estratégia de IA\n\nEste documento...",
      "metadata": {
        "word_count": 2340,
        "reading_time": "9 min",
        "complexity_score": 0.73,
        "entities": ["Machine Learning", "Automação", "ROI"],
        "topics": ["Tecnologia", "Negócios", "Estratégia"]
      },
      "analysis_results": {
        "type": "Momento Decisivo",
        "confidence": 0.92,
        "insights": [...],
        "next_steps": [...],
        "related_files": ["file_045", "file_067"]
      },
      "qdrant_data": {
        "collection": "knowledge_base",
        "point_id": "point_001",
        "similarity_threshold": 0.8
      }
    }
  }
}
```

### 🧠 Analysis API

#### GET `/api/analysis/jobs`
Lista jobs de análise IA em andamento e concluídos.

**Response**:
```json
{
  "status": "success",
  "data": {
    "jobs": [
      {
        "id": "analysis_job_123",
        "status": "processing",
        "created_at": "2025-08-02T15:30:00Z",
        "progress": {
          "completed": 3,
          "total": 5,
          "percentage": 60
        },
        "template": "decisiveMoments",
        "provider": "ollama",
        "estimated_completion": "2025-08-02T15:35:00Z"
      }
    ]
  }
}
```

#### GET `/api/analysis/jobs/{job_id}/status`
Status detalhado de um job específico.

**Response**:
```json
{
  "status": "success",
  "data": {
    "job": {
      "id": "analysis_job_123",
      "status": "completed",
      "files_processed": 5,
      "files_failed": 0,
      "total_time": "00:04:23",
      "results": [
        {
          "file_id": "file_001",
          "analysis_type": "Momento Decisivo",
          "confidence": 0.94,
          "processing_time": "00:00:52"
        }
      ],
      "metrics": {
        "tokens_used": 12450,
        "cost_usd": 0.034,
        "avg_confidence": 0.87
      }
    }
  }
}
```

#### POST `/api/analysis/templates`
Cria um novo template de análise personalizado.

**Request Body**:
```json
{
  "name": "Análise de Oportunidades",
  "description": "Identifica oportunidades de negócio",
  "prompt": "Analise o conteúdo buscando: 1. Oportunidades...",
  "output_format": "structured",
  "categories": ["Oportunidades", "ROI"],
  "estimated_tokens": 500
}
```

### 📂 Categories API

#### GET `/api/categories`
Lista todas as categorias disponíveis.

**Response**:
```json
{
  "status": "success",
  "data": {
    "categories": [
      {
        "id": "ia_ml",
        "name": "IA/ML",
        "color": "#3B82F6",
        "file_count": 34,
        "created_at": "2025-01-10T08:00:00Z",
        "hierarchy": {
          "parent": null,
          "children": ["deep_learning", "nlp", "computer_vision"]
        }
      }
    ]
  }
}
```

#### POST `/api/categories`
Cria uma nova categoria.

**Request Body**:
```json
{
  "name": "Blockchain",
  "color": "#F59E0B",
  "parent_id": "tecnologia",
  "description": "Tecnologias blockchain e criptomoedas"
}
```

#### PUT `/api/categories/{category_id}`
Atualiza uma categoria existente.

#### DELETE `/api/categories/{category_id}`
Remove uma categoria (move arquivos para "Sem Categoria").

### 🔍 Search API

#### POST `/api/search/semantic`
Busca semântica usando embeddings e Qdrant.

**Request Body**:
```json
{
  "query": "automação inteligente com machine learning",
  "filters": {
    "categories": ["IA/ML", "Automação"],
    "confidence_min": 0.7,
    "date_range": {
      "start": "2024-01-01",
      "end": "2025-08-02"
    }
  },
  "options": {
    "limit": 20,
    "include_content": false,
    "similarity_threshold": 0.75
  }
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "file_id": "file_001",
        "similarity_score": 0.94,
        "rank": 1,
        "file": {
          "name": "estrategia-ia.md",
          "preview": "Sistema de IA para automação...",
          "categories": ["IA/ML"],
          "relevance": 0.92
        },
        "matching_chunks": [
          {
            "content": "A implementação de machine learning...",
            "score": 0.91,
            "start_position": 1240
          }
        ]
      }
    ],
    "query_info": {
      "processed_query": "automação inteligente machine learning",
      "query_embedding": {
        "model": "nomic-embed-text",
        "dimensions": 768
      },
      "total_results": 15,
      "search_time_ms": 245
    }
  }
}
```

#### POST `/api/search/hybrid`
Busca híbrida combinando métodos densos e esparsos.

**Request Body**:
```json
{
  "query": "implementação de IA",
  "methods": {
    "dense": {
      "enabled": true,
      "weight": 0.7,
      "model": "nomic-embed-text"
    },
    "sparse": {
      "enabled": true,
      "weight": 0.3,
      "method": "tfidf"
    }
  },
  "rerank": {
    "enabled": true,
    "top_k": 50
  }
}
```

### 📊 Export API

#### POST `/api/export/rag`
Exporta dados no formato RAG (Qdrant-compatible).

**Request Body**:
```json
{
  "format": "qdrant_json",
  "filters": {
    "categories": ["IA/ML", "Estratégia"],
    "analyzed_only": true,
    "confidence_min": 0.8
  },
  "options": {
    "include_embeddings": true,
    "include_content": true,
    "chunk_size": 1000,
    "compression": "gzip"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "export_id": "export_789",
    "download_url": "/api/exports/export_789/download",
    "metadata": {
      "total_points": 156,
      "file_size_mb": 12.4,
      "export_time": "2025-08-02T15:45:00Z",
      "expires_at": "2025-08-09T15:45:00Z"
    }
  }
}
```

#### GET `/api/exports/{export_id}/download`
Download do arquivo exportado.

### 📈 Metrics API

#### GET `/api/metrics/system`
Métricas gerais do sistema.

**Response**:
```json
{
  "status": "success",
  "data": {
    "system": {
      "uptime": "15d 4h 23m",
      "memory_usage": {
        "heap_used": "45.2 MB",
        "heap_total": "128 MB",
        "external": "12.8 MB"
      },
      "performance": {
        "avg_response_time": 245,
        "requests_per_minute": 12.5,
        "error_rate": 0.02
      }
    },
    "knowledge_base": {
      "total_files": 1247,
      "analyzed_files": 456,
      "total_categories": 12,
      "avg_confidence": 0.87,
      "last_update": "2025-08-02T15:30:00Z"
    },
    "ai_providers": {
      "ollama": {
        "status": "healthy",
        "requests_today": 234,
        "avg_latency": 1200,
        "success_rate": 0.98
      },
      "openai": {
        "status": "healthy", 
        "requests_today": 45,
        "cost_today": 2.34,
        "tokens_today": 15420
      }
    }
  }
}
```

#### GET `/api/metrics/confidence`
Métricas do UnifiedConfidenceSystem.

**Response**:
```json
{
  "status": "success",
  "data": {
    "confidence_metrics": {
      "avg_confidence": 0.87,
      "confidence_distribution": {
        "high_confidence": 234,    // >0.8
        "medium_confidence": 156,  // 0.5-0.8
        "low_confidence": 67       // <0.5
      },
      "accuracy_metrics": {
        "precision": 0.942,
        "recall": 0.878,
        "f1_score": 0.908
      },
      "processing_metrics": {
        "avg_processing_time": 1245,
        "files_per_minute": 2.3,
        "queue_size": 12
      }
    }
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "status": "error",
  "error": {
    "code": "ERR_001",
    "message": "Invalid file ID provided",
    "details": {
      "file_id": "invalid_id",
      "valid_format": "file_\\d{3,}"
    },
    "timestamp": "2025-08-02T15:45:00Z"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limiting

### Limits
- **Authenticated requests**: 1000/hour
- **Search requests**: 100/hour
- **Analysis requests**: 50/hour
- **Export requests**: 10/hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1691856000
```

## Webhooks

### Configuration
```javascript
KC.WebhookManager.configure({
  endpoints: {
    'file_analyzed': 'https://your-app.com/webhooks/file-analyzed',
    'analysis_completed': 'https://your-app.com/webhooks/analysis-completed',
    'export_ready': 'https://your-app.com/webhooks/export-ready'
  }
})
```

### Webhook Payload Example
```json
{
  "event": "file_analyzed",
  "timestamp": "2025-08-02T15:45:00Z",
  "data": {
    "file_id": "file_001",
    "analysis_type": "Momento Decisivo",
    "confidence": 0.94,
    "categories": ["IA/ML"],
    "insights": [...]
  },
  "signature": "sha256=abc123..."
}
```

## SDK Integration

### JavaScript SDK
```javascript
// Instalar SDK
npm install @knowledge-consolidator/js-sdk

// Usar SDK
import { KnowledgeConsolidatorAPI } from '@knowledge-consolidator/js-sdk'

const api = new KnowledgeConsolidatorAPI({
  baseURL: 'http://localhost:3000/api',
  token: 'your-bearer-token'
})

// Listar arquivos
const files = await api.files.list({ category: 'IA/ML' })

// Busca semântica
const results = await api.search.semantic({
  query: 'machine learning',
  limit: 20
})
```

### Python SDK
```python
# Instalar SDK
pip install knowledge-consolidator-sdk

# Usar SDK
from knowledge_consolidator import KnowledgeConsolidatorAPI

api = KnowledgeConsolidatorAPI(
    base_url='http://localhost:3000/api',
    token='your-bearer-token'
)

# Listar arquivos
files = api.files.list(category='IA/ML')

# Análise de arquivos
job = api.analysis.analyze(
    file_ids=['file_001', 'file_002'],
    template='decisiveMoments'
)
```

---

**Próximo**: [JavaScript SDK →](javascript-sdk.md)