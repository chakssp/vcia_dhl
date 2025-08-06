# 📋 Documentação Completa do Schema de Exportação
## Knowledge Consolidator - Export State v1.3.0

> **IMPORTANTE**: Este documento descreve TODAS as variáveis e estruturas presentes no arquivo de exportação JSON, servindo como referência técnica completa para a Fase 2 do projeto.

---

## 1. Estrutura Raiz

```json
{
  // === METADADOS DO EXPORT ===
  "timestamp": "2025-07-16T18:40:43.435Z",  // ISO 8601 - Momento da exportação
  "version": "1.3.0",                       // Versão do schema de exportação
  
  // === ESTATÍSTICAS DO SISTEMA ===
  "stats": {...},                           // Estatísticas consolidadas (seção 2)
  
  // === CONFIGURAÇÕES DO USUÁRIO ===
  "configuration": {...},                   // Configurações utilizadas (seção 3)
  
  // === DADOS PROCESSADOS ===
  "files": [...],                          // Array de arquivos processados (seção 4)
  
  // === SISTEMA DE CATEGORIZAÇÃO ===
  "categories": [...],                     // Definições globais de categorias (seção 5)
  
  // === ESTADO DA INTERFACE ===
  "filters": {...},                        // Estado dos filtros aplicados (seção 6)
  "activeFilters": {...},                  // Filtros ativos no momento da exportação (seção 7)
  
  // === ANÁLISE SEMÂNTICA ===
  "keywords": [...],                       // Keywords utilizadas na análise (seção 8)
  
  // === DADOS DO SISTEMA (NÃO DOCUMENTADOS NO EXEMPLO) ===
  // Os seguintes campos podem aparecer dependendo da versão:
  "appVersion": "1.3.0",                   // Versão da aplicação
  "exportedBy": "anonymous",               // Usuário que fez a exportação
  "exportFormat": "json",                  // Formato de exportação selecionado
  "totalProcessingTime": 125000,           // Tempo total de processamento (ms)
  "systemInfo": {                          // Informações do sistema
    "browser": "Chrome 120.0",
    "platform": "Windows",
    "language": "pt-BR"
  }
}
```

---

## 2. Seção: Stats (Estatísticas)

### 2.1 stats.stats (Métricas Gerais)
```json
{
  "arquivosEncontrados": 4,      // Total de arquivos descobertos
  "candidatosRelevantes": 2,     // Arquivos com relevância > threshold
  "jaAnalisados": 4,             // Arquivos que passaram pela análise IA
  "momentosDescobertos": 4,      // Arquivos com insights identificados
  "categorizados": 4,            // Arquivos com categorias atribuídas
  "arquivados": 1,               // Arquivos marcados como arquivados
  "pendenteAnalise": 0,          // Arquivos aguardando análise
  "altaRelevancia": 1,           // Relevância >= 70%
  "mediaRelevancia": 1,          // Relevância 50-69%
  "baixaRelevancia": 2,          // Relevância < 50%
  "periodos": {
    "hoje": 2,                   // Últimas 24h
    "semana": 2,                 // Últimos 7 dias
    "mes": 3,                    // Últimos 30 dias
    "tresMeses": 3,              // Últimos 90 dias
    "seisMeses": 4,              // Últimos 180 dias
    "ano": 4,                    // Últimos 365 dias
    "todos": 4                   // Sem filtro temporal
  },
  "relevanciaMedia": 57          // Média ponderada de relevância
}
```

### 2.2 stats.validation (Validação de Completude)
```json
{
  "totalFiles": 4,               // Total de arquivos no sistema
  "analyzedFiles": 4,            // Arquivos analisados
  "pendingFiles": 0,             // Arquivos pendentes
  "isComplete": true,            // Se todos foram processados
  "canProceed": true,            // Se pode prosseguir para próxima fase
  "completionPercentage": 100,   // Percentual de conclusão
  "requirements": {
    "hasFiles": true,            // Tem arquivos descobertos
    "hasRelevantFiles": true,    // Tem arquivos relevantes
    "hasAnalysis": true,         // Análise foi executada
    "allAnalyzed": true          // Todos foram analisados
  }
}
```

---

## 3. Seção: Configuration (Configurações)

### 3.1 configuration.discovery (Descoberta)
```json
{
  "filePatterns": ["*.md", "*.txt", "*.docx", "*.pdf", "*.gdoc"],
  "directories": ["teste"],      // Diretórios analisados
  "dateMetric": "created",       // Métrica temporal: created|modified
  "timeRange": "all",            // Período: 1m|3m|6m|1y|2y|all
  "recursive": true,             // Busca recursiva em subpastas
  "excludePatterns": ["temp", "cache", "backup"],
  "subfolderDepth": 0            // Profundidade de subpastas (0 = ilimitado)
}
```

### 3.2 configuration.preAnalysis (Pré-Análise)
```json
{
  "keywords": [                  // Keywords base para relevância
    "decisão",
    "insight", 
    "transformação",
    "aprendizado",
    "breakthrough"
  ],
  "relevanceThreshold": 50,      // Threshold mínimo de relevância (%)
  "maxResults": 100,             // Limite máximo de resultados
  "sizeFilter": "all",           // Filtro de tamanho: all|small|medium|large
  "previewEnabled": true         // Se preview inteligente está ativo
}
```

### 3.3 configuration.aiAnalysis (Análise IA)
```json
{
  "model": "claude-sonnet-4",    // Modelo utilizado
  "tokenLimit": 8000,            // Limite de tokens por análise
  "customPrompt": "",            // Prompt customizado (se houver)
  "batchSize": 10,               // Tamanho do lote para processamento
  "autoAnalyze": false           // Se análise é automática após descoberta
}
```

### 3.4 configuration.organization (Organização)
```json
{
  "exportPath": "/Knowledge Consolidation",  // Caminho de exportação
  "structure": "category",                   // Estrutura: category|date|type
  "autoCategories": true,                    // Categorização automática
  "exportFormats": ["json", "markdown"]      // Formatos de exportação
}
```

---

## 4. Seção: Files (Arquivos Processados)

### 4.1 Estrutura de Cada Arquivo
```json
{
  // === IDENTIFICAÇÃO ===
  "id": "file_1752691095476_ay8ihxytr",     // ID único gerado
  "name": "plano de teste.md",              // Nome do arquivo
  "path": "teste/plano de teste.md",        // Caminho completo
  "relativePath": "plano de teste.md",      // Caminho relativo
  
  // === METADADOS ===
  "size": 11529,                            // Tamanho em bytes
  "lastModified": "2025-06-28T03:44:36.072Z",
  "type": "",                               // MIME type (se identificado)
  "extension": ".md",                       // Extensão do arquivo
  "handle": {},                             // File System Access API handle
  
  // === STATUS DE PROCESSAMENTO ===
  "status": "pending",                      // pending|analyzed|archived
  "discovered": true,                       // Se foi descoberto com sucesso
  "discoveredAt": "2025-07-16T18:38:15.476Z",
  "analyzed": true,                         // Se passou pela análise IA
  "analysisDate": "2025-07-16T18:38:54.484Z",
  "archived": false,                        // Se foi arquivado
  "archivedDate": null,                     // Data de arquivamento
  
  // === ANÁLISE E RELEVÂNCIA ===
  "relevanceScore": 0.65,                   // Score 0-1 (65%)
  "analysisType": "Aprendizado Geral",     // Tipo detectado pela IA (ver seção 9)
  "category": null,                         // Categoria principal (deprecated)
  "analysis": null,                         // Resultado da análise (deprecated)
  
  // === CATEGORIZAÇÃO ===
  "categories": [                           // Categorias atribuídas
    "conceitual",
    "prompt",
    "prd"
  ],
  "categorizedDate": "2025-07-16T18:40:24.191Z",
  
  // === CONTEÚDO ===
  "content": "● 🧪 PLANO DE TESTES...",    // Conteúdo completo do arquivo
  
  // === PREVIEW INTELIGENTE ===
  "smartPreview": {
    "segment1": "Primeiras 30 palavras...",
    "segment2": "Segundo parágrafo completo...",
    "segment3": "Último parágrafo antes de ':'...",
    "segment4": "Frase com ':'...",
    "segment5": "30 palavras após ':'...",
    "structure": {
      "hasHeaders": true,                   // Tem cabeçalhos markdown
      "hasLists": true,                     // Tem listas
      "hasCode": true,                      // Tem blocos de código
      "hasLinks": true,                     // Tem links
      "hasImages": false,                   // Tem imagens
      "linkDomains": ["github.com", ...]    // Domínios dos links
    }
  },
  "preview": "Concatenação dos 5 segmentos...",
  
  // === DUPLICAÇÃO ===
  "isDuplicate": false,                     // Se é duplicata
  "duplicateGroup": null,                   // Grupo de duplicatas
  "duplicateReason": null,                  // Razão da duplicação
  "duplicateConfidence": null               // Confiança na detecção
}
```

---

## 5. Seção: Categories (Definições Globais)

```json
[
  {
    "id": "tech",                          // ID interno
    "name": "Momentos Decisivos/Técnicos", // Nome de exibição
    "color": "#3b82f6",                    // Cor hexadecimal
    "count": 0                             // Contagem de uso
  },
  {
    "id": "estrategico",
    "name": "Estratégico",
    "color": "#22c55e",
    "count": 1
  },
  {
    "id": "conceitual",
    "name": "Conceitual",
    "color": "#a855f7",
    "count": 1
  },
  {
    "id": "prompt",
    "name": "PROMPT",                      // Categoria criada pelo usuário
    "color": "#eab308",
    "count": 4
  },
  {
    "id": "prd",
    "name": "PRD",                         // Categoria criada pelo usuário
    "color": "#06b6d4",
    "count": 3
  }
]
```

---

## 6. Seção: Filters (Estado dos Filtros)

### 6.1 filters.relevance (Filtros de Relevância)
```json
{
  "all": { "active": true, "min": 0, "max": 100, "count": 4 },
  "high": { "active": false, "min": 70, "max": 100, "count": 1 },
  "medium": { "active": false, "min": 50, "max": 69, "count": 1 },
  "low": { "active": false, "min": 0, "max": 49, "count": 2 }
}
```

### 6.2 filters.status (Filtros de Status)
```json
{
  "todos": { "active": true, "statuses": [], "count": 4 },
  "pendente": { "active": false, "statuses": ["pending"], "count": 0 },
  "analisado": { "active": false, "statuses": ["analyzed"], "count": 4 },
  "arquivado": { "active": false, "statuses": ["archived"], "count": 1 }
}
```

### 6.3 filters.timeRange (Filtros Temporais)
```json
{
  "all": { "active": true, "days": null, "count": 4 },
  "1m": { "active": false, "days": 30, "count": 3 },
  "3m": { "active": false, "days": 90, "count": 3 },
  "6m": { "active": false, "days": 180, "count": 4 },
  "1y": { "active": false, "days": 365, "count": 4 },
  "2y": { "active": false, "days": 730, "count": 4 }
}
```

### 6.4 filters.size (Filtros de Tamanho)
```json
{
  "all": { "active": true, "min": 0, "max": null, "count": 4 },
  "small": { "active": false, "min": 0, "max": 51200, "count": 4 },
  "medium": { "active": false, "min": 51200, "max": 512000, "count": 0 },
  "large": { "active": false, "min": 512000, "max": null, "count": 0 }
}
```

### 6.5 filters.fileType (Filtros de Tipo)
```json
{
  "all": { "active": true, "extensions": [], "count": 4 },
  "md": { "active": false, "extensions": [".md"], "count": 2 },
  "txt": { "active": false, "extensions": [".txt"], "count": 1 },
  "docx": { "active": false, "extensions": [".docx"], "count": 0 },
  "pdf": { "active": false, "extensions": [".pdf"], "count": 0 }
}
```

---

## 7. Seção: ActiveFilters (Filtros Ativos)

```json
{
  "relevance": "all",      // all|high|medium|low
  "status": "todos",       // todos|pendente|analisado|arquivado
  "timeRange": "all",      // all|1m|3m|6m|1y|2y
  "size": "all",          // all|small|medium|large
  "fileType": "all"       // all|md|txt|docx|pdf
}
```

---

## 8. Seção: Keywords

```json
[]  // Array de keywords adicionais (vazio neste exemplo)
```

---

## 9. Tipos de Análise Automática (analysisType)

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

## 10. Fluxo de Processamento

### 10.1 Etapa 1 - Descoberta (DiscoveryManager)
- Varre diretórios configurados
- Aplica filtros de padrão e exclusão
- Gera lista inicial de arquivos

### 10.2 Etapa 2 - Pré-Análise (FileRenderer + PreviewUtils)
- Calcula relevância baseada em keywords
- Extrai smart preview (5 segmentos)
- Identifica estrutura do documento

### 10.3 Etapa 3 - Análise IA (AnalysisManager)
- Detecta tipo de análise (analysisType)
- Aplica boost de relevância
- Marca arquivo como analisado

### 10.4 Curadoria Manual (CategoryManager)
- Usuário revisa análise automática
- Aplica/remove categorias
- Arquiva ou aprova arquivos

### 10.5 Exportação (ExportUI + RAGExportManager)
- Consolida todos os dados
- Gera JSON com estrutura completa
- Prepara para Fase 2

---

## 11. Dados Adicionais do Sistema

### 11.1 Componentes que Geram Dados

| Campo | Componente Gerador | Quando é Gerado |
|-------|-------------------|-----------------|
| `timestamp` | ExportUI | Momento do clique em exportar |
| `version` | RAGExportManager | Versão hardcoded do schema |
| `stats` | StatsManager + FilterPanel | Calculado em tempo real |
| `configuration` | AppState | Salvo durante configuração inicial |
| `files` | DiscoveryManager → FileRenderer → AnalysisManager | Pipeline completo |
| `categories` | CategoryManager | Gerenciamento de categorias |
| `filters` | FilterManager | Estado dos filtros disponíveis |
| `activeFilters` | FilterPanel | Filtros selecionados pelo usuário |
| `keywords` | ConfigManager | Keywords customizadas |

### 11.2 Dados Computados vs Armazenados

**Armazenados no AppState:**
- `files` (comprimido sem content)
- `configuration`
- `categories` 
- `activeFilters`

**Computados na Exportação:**
- `timestamp`
- `version`
- `stats` (agregação em tempo real)
- `filters` (estado atual)
- Content completo dos files (recuperado do handle)

### 11.3 Fluxo de Dados no Sistema

```
1. DESCOBERTA (DiscoveryManager)
   └─> files[].{id, name, path, size, lastModified}

2. PRÉ-ANÁLISE (PreviewUtils + FileRenderer)
   └─> files[].{relevanceScore, smartPreview, preview}

3. ANÁLISE IA (AnalysisManager + FileRenderer)
   └─> files[].{analysisType, analyzed, analysisDate}
   └─> Boost aplicado ao relevanceScore

4. CURADORIA (CategoryManager + UI)
   └─> files[].{categories, categorizedDate}
   └─> categories[] (lista global atualizada)

5. EXPORTAÇÃO (RAGExportManager + ExportUI)
   └─> Consolida tudo + recupera content completo
   └─> Adiciona metadados de exportação
```

---

## 📊 Resumo do Valor do Export

Este arquivo JSON exportado representa o **"manifesto"** mencionado no PRD, contendo:

1. **Dados Brutos Refinados**: Conteúdo completo de cada arquivo
2. **Metadados Enriquecidos**: Categorias, relevância, análise IA
3. **Contexto de Curadoria**: Timestamps, configurações, filtros
4. **Estrutura Preparada**: SmartPreview já processado para chunking
5. **Rastreabilidade Completa**: Todo o histórico do processamento
6. **Estado Completo do Sistema**: Configurações, filtros, categorias

### Pronto para Fase 2:
- ✅ **Segmentação**: `content` + `smartPreview.structure`
- ✅ **Vetorização**: `content` + `categories` para contexto
- ✅ **Filtragem**: `categories`, `relevanceScore`, `analysisType`
- ✅ **Indexação**: `id`, `path`, todos os metadados

Este é o **ativo de conhecimento** validado e curado, pronto para ser transformado em inteligência ativa na Fase 2!