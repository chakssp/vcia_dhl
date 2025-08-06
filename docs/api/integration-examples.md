# 🔌 Integration Examples

## Overview

Este documento fornece exemplos práticos de integração do Knowledge Consolidator com diferentes sistemas e plataformas, incluindo N8N, aplicações customizadas e automações.

## N8N Workflow Integration

### Workflow: Análise Automática de Documentos

#### 1. Configuração do Webhook
```json
{
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "knowledge-consolidator-trigger",
        "httpMethod": "POST"
      }
    }
  ]
}
```

#### 2. Node de Análise KC
```json
{
  "name": "KC Analysis",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "http://localhost:3000/api/files/analyze",
    "method": "POST",
    "authentication": "genericCredentialType",
    "headers": {
      "Authorization": "Bearer kc-n8n-integration-token",
      "Content-Type": "application/json"
    },
    "body": {
      "file_ids": "{{ $json.file_ids }}",
      "template": "decisiveMoments",
      "provider": "ollama",
      "batch_size": 5
    }
  }
}
```

#### 3. Monitor Job Status
```json
{
  "name": "Monitor Analysis",
  "type": "n8n-nodes-base.wait",
  "parameters": {
    "resume": "webhook",
    "timeout": 600,
    "webhookSuffix": "analysis-complete"
  }
}
```

#### 4. Process Results
```javascript
// N8N Code Node
const results = $input.first().json;

// Filtrar insights de alta confiança
const highConfidenceInsights = results.data.job.results
  .filter(result => result.confidence > 0.8)
  .map(result => ({
    file_name: result.file_name,
    analysis_type: result.analysis_type,
    insights: result.insights,
    confidence: result.confidence
  }));

// Agrupar por tipo de análise
const groupedInsights = highConfidenceInsights.reduce((acc, item) => {
  const type = item.analysis_type;
  if (!acc[type]) acc[type] = [];
  acc[type].push(item);
  return acc;
}, {});

return {
  high_confidence_insights: highConfidenceInsights,
  grouped_insights: groupedInsights,
  total_processed: results.data.job.files_processed,
  avg_confidence: results.data.job.metrics.avg_confidence
};
```

### Workflow Completo JSON
```json
{
  "name": "Knowledge Consolidator - Auto Analysis",
  "nodes": [
    {
      "parameters": {
        "path": "kc-analysis-trigger",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "url": "http://localhost:3000/api/files/analyze",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          }
        },
        "authentication": "genericCredentialType",
        "requestMethod": "POST",
        "jsonParameters": true,
        "bodyParametersJson": "={\n  \"file_ids\": {{ $json.file_ids }},\n  \"template\": \"{{ $json.template || 'decisiveMoments' }}\",\n  \"provider\": \"{{ $json.provider || 'ollama' }}\",\n  \"batch_size\": {{ $json.batch_size || 5 }}\n}"
      },
      "name": "Start Analysis",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [460, 300]
    },
    {
      "parameters": {
        "amount": 30,
        "unit": "seconds"
      },
      "name": "Wait",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [680, 300]
    },
    {
      "parameters": {
        "url": "=http://localhost:3000/api/analysis/jobs/{{ $('Start Analysis').first().json.data.job_id }}/status",
        "authentication": "genericCredentialType",
        "options": {}
      },
      "name": "Check Status",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [900, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.data.job.status }}",
              "value2": "completed"
            }
          ]
        }
      },
      "name": "Is Complete?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1120, 300]
    },
    {
      "parameters": {
        "jsCode": "// Process and format results\nconst job = $input.first().json.data.job;\n\n// Extract high confidence results\nconst highConfidenceResults = job.results\n  .filter(result => result.confidence > 0.8)\n  .map(result => ({\n    file_id: result.file_id,\n    file_name: result.file_name,\n    analysis_type: result.analysis_type,\n    confidence: result.confidence,\n    insights: result.insights,\n    next_steps: result.next_steps\n  }));\n\n// Create summary\nconst summary = {\n  total_files: job.files_processed,\n  high_confidence_count: highConfidenceResults.length,\n  avg_confidence: job.metrics.avg_confidence,\n  processing_time: job.total_time,\n  insights_by_type: {}\n};\n\n// Group insights by type\nhighConfidenceResults.forEach(result => {\n  const type = result.analysis_type;\n  if (!summary.insights_by_type[type]) {\n    summary.insights_by_type[type] = [];\n  }\n  summary.insights_by_type[type].push(result);\n});\n\nreturn {\n  summary,\n  high_confidence_results: highConfidenceResults,\n  raw_job_data: job\n};"
      },
      "name": "Process Results",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [1340, 200]
    },
    {
      "parameters": {
        "url": "https://hooks.slack.com/your-slack-webhook",
        "requestMethod": "POST",
        "jsonParameters": true,
        "bodyParametersJson": "={\n  \"text\": \"📊 Knowledge Consolidator Analysis Complete\",\n  \"blocks\": [\n    {\n      \"type\": \"section\",\n      \"text\": {\n        \"type\": \"mrkdwn\",\n        \"text\": \"*Analysis Summary*\\n• Files Processed: {{ $json.summary.total_files }}\\n• High Confidence: {{ $json.summary.high_confidence_count }}\\n• Avg Confidence: {{ Math.round($json.summary.avg_confidence * 100) }}%\\n• Processing Time: {{ $json.summary.processing_time }}\"\n      }\n    }\n  ]\n}"
      },
      "name": "Notify Slack",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1560, 200]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Start Analysis",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Start Analysis": {
      "main": [
        [
          {
            "node": "Wait",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Wait": {
      "main": [
        [
          {
            "node": "Check Status",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Status": {
      "main": [
        [
          {
            "node": "Is Complete?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Complete?": {
      "main": [
        [
          {
            "node": "Process Results",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Wait",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Results": {
      "main": [
        [
          {
            "node": "Notify Slack",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## React Application Integration

### Setup e Configuração
```jsx
// components/KnowledgeProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { KnowledgeConsolidatorAPI } from '@knowledge-consolidator/js-sdk'

const KnowledgeContext = createContext()

export const KnowledgeProvider = ({ children }) => {
  const [api] = useState(() => new KnowledgeConsolidatorAPI({
    baseURL: process.env.REACT_APP_KC_API_URL,
    token: process.env.REACT_APP_KC_API_TOKEN
  }))
  
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  const loadFiles = async (filters = {}) => {
    setLoading(true)
    try {
      const response = await api.files.list(filters)
      setFiles(response.data.files)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchFiles = async (query, filters = {}) => {
    setLoading(true)
    try {
      const response = await api.search.semantic({ query, filters })
      return response.data.results
    } catch (error) {
      console.error('Error searching files:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const value = {
    api,
    files,
    categories,
    loading,
    loadFiles,
    searchFiles
  }

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
    </KnowledgeContext.Provider>
  )
}

export const useKnowledge = () => {
  const context = useContext(KnowledgeContext)
  if (!context) {
    throw new Error('useKnowledge must be used within KnowledgeProvider')
  }
  return context
}
```

### Componente de Busca
```jsx
// components/KnowledgeSearch.jsx
import React, { useState, useCallback, useMemo } from 'react'
import { useKnowledge } from './KnowledgeProvider'
import { debounce } from 'lodash'

export const KnowledgeSearch = () => {
  const { searchFiles, loading } = useKnowledge()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [filters, setFilters] = useState({
    categories: [],
    confidence_min: 0.7
  })

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery, searchFilters) => {
      if (searchQuery.trim().length < 3) {
        setResults([])
        return
      }
      
      const searchResults = await searchFiles(searchQuery, searchFilters)
      setResults(searchResults)
    }, 500),
    [searchFiles]
  )

  const handleQueryChange = (e) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    debouncedSearch(newQuery, filters)
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    if (query.trim().length >= 3) {
      debouncedSearch(query, newFilters)
    }
  }

  const highlightText = (text, query) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  return (
    <div className="knowledge-search">
      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Buscar no conhecimento..."
          className="form-control"
        />
        {loading && <div className="spinner">🔄</div>}
      </div>

      <div className="search-filters">
        <CategoryFilter 
          selected={filters.categories}
          onChange={(categories) => handleFilterChange({ ...filters, categories })}
        />
        <ConfidenceSlider
          value={filters.confidence_min}
          onChange={(confidence_min) => handleFilterChange({ ...filters, confidence_min })}
        />
      </div>

      <div className="search-results">
        {results.map((result) => (
          <div key={result.file_id} className="search-result">
            <h4 
              dangerouslySetInnerHTML={{
                __html: highlightText(result.file.name, query)
              }}
            />
            <p className="confidence">Confiança: {Math.round(result.similarity_score * 100)}%</p>
            <p 
              className="preview"
              dangerouslySetInnerHTML={{
                __html: highlightText(result.file.preview, query)
              }}
            />
            <div className="categories">
              {result.file.categories.map(cat => (
                <span key={cat} className="category-tag">{cat}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Hook para Análise em Tempo Real
```jsx
// hooks/useAnalysis.js
import { useState, useCallback, useRef } from 'react'
import { useKnowledge } from '../components/KnowledgeProvider'

export const useAnalysis = () => {
  const { api } = useKnowledge()
  const [jobs, setJobs] = useState(new Map())
  const intervalsRef = useRef(new Map())

  const startAnalysis = useCallback(async (fileIds, options = {}) => {
    try {
      const response = await api.files.analyze({
        file_ids: fileIds,
        template: options.template || 'decisiveMoments',
        provider: options.provider || 'ollama',
        batch_size: options.batchSize || 5
      })

      const jobId = response.data.job_id
      setJobs(prev => new Map(prev).set(jobId, {
        id: jobId,
        status: 'processing',
        progress: 0,
        files_queued: response.data.files_queued,
        created_at: new Date()
      }))

      // Monitor progress
      const interval = setInterval(async () => {
        try {
          const status = await api.analysis.getJobStatus(jobId)
          
          setJobs(prev => {
            const updated = new Map(prev)
            updated.set(jobId, {
              ...updated.get(jobId),
              ...status.data.job,
              progress: Math.round((status.data.job.files_processed / status.data.job.files_queued) * 100)
            })
            return updated
          })

          if (['completed', 'failed', 'cancelled'].includes(status.data.job.status)) {
            clearInterval(interval)
            intervalsRef.current.delete(jobId)
          }
        } catch (error) {
          console.error('Error monitoring job:', error)
          clearInterval(interval)
          intervalsRef.current.delete(jobId)
        }
      }, 5000)

      intervalsRef.current.set(jobId, interval)
      return jobId

    } catch (error) {
      console.error('Error starting analysis:', error)
      throw error
    }
  }, [api])

  const cancelAnalysis = useCallback(async (jobId) => {
    try {
      await api.analysis.cancelJob(jobId)
      
      const interval = intervalsRef.current.get(jobId)
      if (interval) {
        clearInterval(interval)
        intervalsRef.current.delete(jobId)
      }

      setJobs(prev => {
        const updated = new Map(prev)
        if (updated.has(jobId)) {
          updated.set(jobId, { ...updated.get(jobId), status: 'cancelled' })
        }
        return updated
      })
    } catch (error) {
      console.error('Error cancelling job:', error)
      throw error
    }
  }, [api])

  const getJobResults = useCallback(async (jobId) => {
    try {
      const response = await api.analysis.getJobStatus(jobId)
      return response.data.job.results || []
    } catch (error) {
      console.error('Error getting job results:', error)
      return []
    }
  }, [api])

  return {
    jobs: Array.from(jobs.values()),
    startAnalysis,
    cancelAnalysis,
    getJobResults
  }
}
```

## Node.js Backend Integration

### Express.js Middleware
```javascript
// middleware/knowledgeMiddleware.js
const { KnowledgeConsolidatorAPI } = require('@knowledge-consolidator/js-sdk')

const createKnowledgeMiddleware = (config) => {
  const api = new KnowledgeConsolidatorAPI({
    baseURL: config.apiUrl || 'http://localhost:3000/api',
    token: config.token || process.env.KC_API_TOKEN
  })

  return {
    // Middleware para anexar API ao request
    attachAPI: (req, res, next) => {
      req.knowledge = api
      next()
    },

    // Middleware para busca automática
    autoSearch: (searchField = 'query') => async (req, res, next) => {
      const query = req.query[searchField] || req.body[searchField]
      
      if (query) {
        try {
          const results = await api.search.semantic({
            query,
            limit: req.query.limit || 10,
            filters: req.query.filters || {}
          })
          req.searchResults = results.data.results
        } catch (error) {
          console.error('Auto search failed:', error)
          req.searchResults = []
        }
      }
      
      next()
    },

    // Middleware para categorização automática
    autoCategories: async (req, res, next) => {
      try {
        const categories = await api.categories.list()
        req.categories = categories.data.categories
      } catch (error) {
        console.error('Failed to load categories:', error)
        req.categories = []
      }
      next()
    }
  }
}

module.exports = createKnowledgeMiddleware
```

### API Routes
```javascript
// routes/knowledge.js
const express = require('express')
const router = express.Router()
const createKnowledgeMiddleware = require('../middleware/knowledgeMiddleware')

const knowledge = createKnowledgeMiddleware({
  apiUrl: process.env.KC_API_URL,
  token: process.env.KC_API_TOKEN
})

// Aplicar middleware
router.use(knowledge.attachAPI)

// Busca endpoint
router.get('/search', knowledge.autoSearch(), async (req, res) => {
  try {
    const results = req.searchResults || []
    
    // Enriquecer resultados com dados do banco local
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        // Buscar dados adicionais do seu banco
        const additionalData = await getUserSpecificData(result.file_id, req.user.id)
        
        return {
          ...result,
          user_data: additionalData,
          is_favorite: await checkIfFavorite(result.file_id, req.user.id)
        }
      })
    )

    res.json({
      query: req.query.query,
      results: enrichedResults,
      total: enrichedResults.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Análise de documentos do usuário
router.post('/analyze-user-docs', async (req, res) => {
  try {
    const { document_ids, template } = req.body
    
    // Mapear IDs locais para IDs do KC
    const kcFileIds = await mapUserDocsToKCFiles(document_ids, req.user.id)
    
    const analysisJob = await req.knowledge.files.analyze({
      file_ids: kcFileIds,
      template: template || 'decisiveMoments'
    })

    // Salvar job ID no banco local para tracking
    await saveAnalysisJob(analysisJob.data.job_id, req.user.id)

    res.json({
      job_id: analysisJob.data.job_id,
      status: 'started',
      estimated_time: analysisJob.data.estimated_time
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Webhook para resultados de análise
router.post('/webhook/analysis-complete', async (req, res) => {
  try {
    const { job_id, results } = req.body
    
    // Verificar assinatura do webhook
    const isValid = req.knowledge.webhooks.validateSignature(
      req.body,
      req.headers['x-kc-signature'],
      process.env.KC_WEBHOOK_SECRET
    )

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Processar resultados
    await processAnalysisResults(job_id, results)
    
    // Notificar usuário (WebSocket, push notification, etc.)
    await notifyUserAnalysisComplete(job_id)

    res.json({ status: 'processed' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
```

## Python Integration (FastAPI)

### FastAPI Application
```python
# main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os

app = FastAPI(title="Knowledge Consolidator Integration")

# Configuration
KC_API_URL = os.getenv("KC_API_URL", "http://localhost:3000/api")
KC_API_TOKEN = os.getenv("KC_API_TOKEN")

class SearchRequest(BaseModel):
    query: str
    filters: Optional[dict] = {}
    limit: Optional[int] = 20

class AnalysisRequest(BaseModel):
    file_ids: List[str]
    template: Optional[str] = "decisiveMoments"
    provider: Optional[str] = "ollama"

class KnowledgeAPI:
    def __init__(self):
        self.base_url = KC_API_URL
        self.headers = {
            "Authorization": f"Bearer {KC_API_TOKEN}",
            "Content-Type": "application/json"
        }
    
    async def search_semantic(self, query: str, filters: dict = {}, limit: int = 20):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/search/semantic",
                headers=self.headers,
                json={
                    "query": query,
                    "filters": filters,
                    "options": {"limit": limit}
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def analyze_files(self, file_ids: List[str], template: str = "decisiveMoments"):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/files/analyze",
                headers=self.headers,
                json={
                    "file_ids": file_ids,
                    "template": template
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_job_status(self, job_id: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/analysis/jobs/{job_id}/status",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

kc_api = KnowledgeAPI()

@app.post("/search")
async def search_knowledge(request: SearchRequest):
    """Busca semântica no Knowledge Consolidator"""
    try:
        results = await kc_api.search_semantic(
            query=request.query,
            filters=request.filters,
            limit=request.limit
        )
        
        # Processar e enriquecer resultados
        processed_results = []
        for result in results["data"]["results"]:
            processed_result = {
                "id": result["file_id"],
                "title": result["file"]["name"],
                "preview": result["file"]["preview"],
                "similarity": result["similarity_score"],
                "categories": result["file"]["categories"],
                "url": f"/knowledge/{result['file_id']}"
            }
            processed_results.append(processed_result)
        
        return {
            "query": request.query,
            "results": processed_results,
            "total": len(processed_results)
        }
    
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def start_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Inicia análise de arquivos"""
    try:
        response = await kc_api.analyze_files(
            file_ids=request.file_ids,
            template=request.template
        )
        
        job_id = response["data"]["job_id"]
        
        # Monitorar job em background
        background_tasks.add_task(monitor_analysis_job, job_id)
        
        return {
            "job_id": job_id,
            "status": "started",
            "files_queued": response["data"]["files_queued"]
        }
    
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=str(e))

async def monitor_analysis_job(job_id: str):
    """Monitor analysis job progress"""
    import asyncio
    
    while True:
        try:
            status_response = await kc_api.get_job_status(job_id)
            job = status_response["data"]["job"]
            
            print(f"Job {job_id}: {job['status']} - {job.get('progress', 0)}%")
            
            if job["status"] in ["completed", "failed", "cancelled"]:
                # Processar resultados finais
                await process_analysis_results(job_id, job)
                break
                
            await asyncio.sleep(10)  # Check every 10 seconds
            
        except Exception as e:
            print(f"Error monitoring job {job_id}: {e}")
            break

async def process_analysis_results(job_id: str, job_data: dict):
    """Process completed analysis results"""
    # Implementar lógica específica da aplicação
    # Por exemplo: salvar no banco, enviar notificações, etc.
    
    results = job_data.get("results", [])
    high_confidence_results = [
        result for result in results 
        if result.get("confidence", 0) > 0.8
    ]
    
    print(f"Analysis {job_id} completed:")
    print(f"- Total files: {len(results)}")
    print(f"- High confidence: {len(high_confidence_results)}")
    
    # Salvar resultados, enviar notificações, etc.
```

## Webhook Listeners

### Express.js Webhook Handler
```javascript
// webhooks/knowledgeWebhook.js
const express = require('express')
const crypto = require('crypto')
const router = express.Router()

// Middleware para validar assinatura
const validateSignature = (req, res, next) => {
  const signature = req.headers['x-kc-signature']
  const payload = JSON.stringify(req.body)
  const secret = process.env.KC_WEBHOOK_SECRET

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  next()
}

// Handler para arquivo analisado
router.post('/file-analyzed', validateSignature, async (req, res) => {
  try {
    const { event, data } = req.body
    const { file_id, analysis_type, confidence, insights } = data

    // Atualizar banco de dados local
    await updateFileAnalysis(file_id, {
      analysis_type,
      confidence,
      insights,
      analyzed_at: new Date()
    })

    // Notificar usuários interessados
    await notifyUsersFileAnalyzed(file_id, analysis_type, confidence)

    // Trigger automações baseadas no tipo de análise
    if (analysis_type === 'Momento Decisivo' && confidence > 0.9) {
      await triggerHighPriorityAlert(file_id, insights)
    }

    res.json({ status: 'processed' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Processing failed' })
  }
})

// Handler para análise completa
router.post('/analysis-completed', validateSignature, async (req, res) => {
  try {
    const { event, data } = req.body
    const { job_id, files_processed, avg_confidence, processing_time } = data

    // Atualizar status do job
    await updateAnalysisJob(job_id, {
      status: 'completed',
      files_processed,
      avg_confidence,
      processing_time,
      completed_at: new Date()
    })

    // Gerar relatório automático
    const report = await generateAnalysisReport(job_id)
    
    // Enviar por email ou Slack
    await sendAnalysisReport(report)

    res.json({ status: 'processed' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Processing failed' })
  }
})

module.exports = router
```

## Automated Workflows

### Cron Job para Análise Periódica
```javascript
// jobs/scheduledAnalysis.js
const cron = require('node-cron')
const { KnowledgeConsolidatorAPI } = require('@knowledge-consolidator/js-sdk')

const api = new KnowledgeConsolidatorAPI({
  baseURL: process.env.KC_API_URL,
  token: process.env.KC_API_TOKEN
})

// Análise diária de novos arquivos
cron.schedule('0 2 * * *', async () => {
  console.log('Starting daily analysis job...')
  
  try {
    // Buscar arquivos não analisados
    const unanalyzedFiles = await api.files.list({
      analyzed: false,
      limit: 100
    })

    if (unanalyzedFiles.data.files.length === 0) {
      console.log('No new files to analyze')
      return
    }

    // Agrupar por categoria para análise especializada
    const filesByCategory = groupFilesByCategory(unanalyzedFiles.data.files)

    for (const [category, files] of Object.entries(filesByCategory)) {
      const template = getTemplateForCategory(category)
      
      const analysisJob = await api.files.analyze({
        file_ids: files.map(f => f.id),
        template,
        provider: 'ollama'
      })

      console.log(`Started analysis job ${analysisJob.data.job_id} for category ${category}`)
    }

  } catch (error) {
    console.error('Daily analysis job failed:', error)
    // Enviar alerta para administradores
    await sendAdminAlert('Daily analysis job failed', error.message)
  }
})

// Limpeza semanal de dados antigos
cron.schedule('0 3 * * 0', async () => {
  console.log('Starting weekly cleanup job...')
  
  try {
    // Arquivar análises antigas
    await archiveOldAnalysis()
    
    // Limpar exports expirados
    await cleanupExpiredExports()
    
    // Otimizar índices do Qdrant
    await optimizeQdrantIndices()
    
    console.log('Weekly cleanup completed')
  } catch (error) {
    console.error('Weekly cleanup failed:', error)
  }
})

function groupFilesByCategory(files) {
  return files.reduce((groups, file) => {
    const category = file.categories[0] || 'general'
    if (!groups[category]) groups[category] = []
    groups[category].push(file)
    return groups
  }, {})
}

function getTemplateForCategory(category) {
  const templates = {
    'IA/ML': 'technicalInsights',
    'Estratégia': 'decisiveMoments',
    'Projetos': 'projectAnalysis',
    'default': 'decisiveMoments'
  }
  return templates[category] || templates.default
}
```

---

**Anterior**: [← JavaScript SDK](javascript-sdk.md) | **Próximo**: [Developer Guide →](../developer/architecture-overview.md)