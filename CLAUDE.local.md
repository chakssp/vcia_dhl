# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the specification for "Consolidador de Conhecimento Pessoal" (Personal Knowledge Consolidator) - an intelligent system for automated discovery, analysis, and structuring of decisive moments in personal knowledge bases.

**Vision:** Transform scattered knowledge into actionable insights, establishing a pre-structured foundation that will feed IA automation flows for internal project proposition and strategic decision-making.

## Key Architecture

The system is designed as a modular single-page application with the following structure:

```javascript
window.KnowledgeConsolidator = {
  // Core Infrastructure
  AppState: {},           // Central state management with compression
  AppController: {},      // Navigation and general control
  EventBus: {},          // Event-driven architecture
  
  // Utilities (Foundation)
  Logger: {},            // Comprehensive logging system
  HandleManager: {},     // File System Access API management
  BrowserCompatibility: {}, // Browser support detection
  FileUtils: {},         // Basic file operations
  PreviewUtils: {},      // Smart preview extraction (70% token economy)
  
  // Core Managers
  ConfigManager: {},     // Configuration management
  DiscoveryManager: {},  // File discovery with real data access
  FilterManager: {},     // Advanced filtering with real-time counters
  AnalysisManager: {},   // AI analysis
  ExportManager: {},     // Export and RAG preparation
  CategoryManager: {},   // Category system
  StatsManager: {},      // Real-time statistics
  
  // UI Components
  WorkflowPanel: {},     // Main workflow interface
  FileRenderer: {},      // Visual interface
  ModalManager: {},      // Modal controls
  FilterBar: {},         // Filter interface
  StatsPanel: {}         // Statistics display
};
```

## Core Functionality

### 4-Step Workflow
1. **Automated Discovery**: Configure file patterns, directories, and temporal filters with File System Access API
2. **Local Pre-Analysis**: Keyword relevance scoring with smart preview (70% token economy)
3. **Selective AI Analysis**: Contextual analysis with configurable models
4. **Intelligent Organization**: Categorization and multi-format export with RAG preparation

### Smart Preview System (Implemented)
The system uses an intelligent preview to reduce token usage by 70%:
- **Segment 1**: First 30 words
- **Segment 2**: Complete second paragraph
- **Segment 3**: Last paragraph before ':'
- **Segment 4**: Phrase starting with ':'
- **Segment 5**: First paragraph after ':' (30 words)

### Advanced Filtering System (Implemented)
- **Relevance threshold**: 30%, 50%, 70%, 90% configurable
- **Algorithm options**: Linear, Exponential, Logarithmic
- **Time filters**: 1m, 3m, 6m, 1y, 2y, all
- **Size filters**: Configurable min/max
- **Type filters**: md, txt, docx, pdf
- **Exclusion patterns**: temp, cache, backup, .git
- **Real-time counters**: Shows filtered results count
- **Multi-level sorting**: relevance, date, size, name

### Export Formats
- **Markdown (.md)**: For Obsidian compatibility
- **JSON**: For RAG integration (Qdrant-compatible)
- **PDF**: For documentation
- **HTML**: For visualization

## Technical Requirements

### Frontend Stack
- HTML5 + CSS3 (CSS variables)
- Vanilla JavaScript ES6+ (modules)
- Component architecture
- Mobile-first responsive design
- No external dependencies

### Performance Targets
- < 2s initial loading
- < 500ms filter response
- Support for 1000+ files
- LocalStorage compression for memory management

## Development Patterns

### State Management
All state is centralized in `AppState` object with automatic compression:
```javascript
const AppState = {
  currentStep: 1,
  configuration: {
    discovery: {},
    preAnalysis: {},
    aiAnalysis: {},
    organization: {},
    filters: {}  // FilterManager configuration
  },
  files: [],      // Compressed automatically for localStorage
  categories: [],
  stats: {},
  timeline: [],   // Limited to 50 items
  currentFilter: 'all',
  currentSort: 'relevance'
};
```

### Memory Management (CRITICAL)
- **LocalStorage compression**: Files data is compressed before saving
- **Content removal**: Full file content not saved to localStorage
- **Quota handling**: Automatic cleanup when quota exceeded
- **Minimal state**: Fallback to essential data only

### File Status Flow
- **Pending**: Ready for AI analysis
- **Analyzed**: Processing complete
- **Archived**: Stored for reference

### Export Schema
The system prepares data for SPRINT 2 RAG integration with:
- Qdrant vector database (384-dimension embeddings)
- PostgreSQL for metadata
- Redis for caching
- N8N workflow automation

## Critical Development Rules

### Core Development Guidelines
- **PRIORITY ZERO**: Core elements between phases 1 and 2 must NEVER use SIMULATED or MOCK data without prior user approval
- **Real Data Requirement**: Core components must be developed based on REAL DATA as proposed in the initial user prompt
- **MVP Validation**: This rule ensures proper validation of any application as a valid MVP
- **Critical Severity**: This rule is INDISPUTABLE and of ZERO PRIORITY
- **Implementation Requirements**: If provisioning is needed for this rule, provide STEP-BY-STEP description before starting development
- Elementos core tratados geralmente entre fases 1 e 2 NUNCA devem ser desenvolvidos considerando dados SIMULADOS ou MOCK sem que 
  - haja aprovação prévia ou solicitada pelo usuário, caso contrário este tipo de comportamento inviabiliza completamente o 
  - desenvolvimento
- Desenvolvimento de componentes ou páginas considerados CORE DEVEM SEMPRE ser planejadas e desenvolvidos baseando-se nos DADOS 
  - REAIS conforme proposto no Prompt inicial fornecido pelo usuário para a aplicação como forma de COMPROVAR se este e qualquer outro 
  - aplicativo é considerado um MVP válido
- ESTA REGRA É DE SEVERIDADE CRÍTICA e de PRIORIDADE ZERO (OU SEJA, INDISCUTÍVEL)
- Caso haja necessidade de provisionar requisitos necessários para que esta regra seja realizada, DEVE-SE FORNECER O DESCRITIVO 
  - PASSO A PASSO ANTES DE INICIAR QUALQUER DESENVOLVIMENTO PARA QUE O USUÁRIO DECIDA QUAL SERÁ O MELHOR CAMINHO A SER PERCORRIDO adote como insight para a interface de forma incremental os insights relacionados em @docs/sprint/insights-1.2.png 

### Error Prevention Protocol
- **Memory Management**: Never store full file content in localStorage
- **Performance**: Monitor localStorage usage and implement compression
- **Browser Compatibility**: Use File System Access API with proper fallbacks
- **Real Data Only**: No mock/simulated data in core discovery and analysis phases
- **Testing**: Always test with real files and directories

## Testing and Validation

### Mandatory Pre-Deployment Checklist
BEFORE declaring any phase complete, MUST verify:
1. ✅ Server is running and accessible at http://localhost:8000
2. ✅ Browser console shows ZERO JavaScript errors
3. ✅ All KC.xxx components load correctly (use `typeof KC.Logger` should not be 'undefined')
4. ✅ Implemented functionality works as expected through manual testing
5. ✅ Changes do not break existing functionality (regression test)
6. ✅ Integration between components flows correctly
7. ✅ LocalStorage usage is within reasonable limits (<4MB)
8. ✅ Real data discovery works with File System Access API

### Error Prevention Protocol
- NEVER implement multiple changes simultaneously without testing each one
- ALWAYS test in browser console before marking tasks complete
- ALWAYS verify script loading order and dependencies
- STOP immediately if any component shows 'undefined' errors
- Monitor localStorage quota and implement compression
- Document specific error patterns to prevent recurrence

## Memory Management Guidelines

### LocalStorage Optimization (NEW)
- **Automatic compression**: File content is removed before saving
- **Size monitoring**: Alerts when approaching quota limits
- **Quota exceeded handling**: Automatic cleanup and minimal state fallback
- **Debugging**: Use browser DevTools → Application → Storage to monitor usage

### Error Handling and Revision Process
- When an error is signaled by the user with "*erro", pause the current process
- Store the set of instructions delivered for testing before starting the code review
- Collaborate with the user to identify and mitigate the problem
- Once the problem is resolved, the user will signal with "*funciona"
- Resume validation/homologation from the point where the user stopped

### Server Maintenance Guidelines
- Always kill and restart the HTTP server after completing a correction
- Ensure user access is updated with each new attempt to mitigate flagged issues
- NEVER declare a phase complete without confirming server is accessible and functional
- Use `pkill -f "python -m http.server"` to kill existing processes before starting new server
- Always verify http://localhost:8000 is accessible before requesting user testing

### Sprint Delivery and Revision Guidelines
- When delivering each phase for user testing, create a corresponding file for the SPRINT being developed with the nomenclature ending in -rev.md (e.g., sprint1.2-rev.md)
- The file should contain all elements that were incorporated to allow the user to update and signal their feedback about errors or unexpected behavior in a consolidated manner
- When the user wants to report a problem, it will be signaled with "*report" to generate a model with the components being validated at the moment the server was provisioned
- When the user signals "*erro", analyze the generated file that will be indicated by the user after its completion, using pre-existing programming in memory to mitigate/correct based on the feedback provided by the user

## Future Integration (SPRINT 2)

The system is designed to integrate with a RAG stack:
- **Ollama**: Local embeddings and LLM
- **N8N**: Workflow automation
- **Langchain**: LLM framework
- **Qdrant**: Vector database
- **Redis**: Cache and sessions
- **PostgreSQL**: Structured metadata

## Current Implementation Status

### ✅ SPRINT 1.1 - COMPLETED
- Core infrastructure (EventBus, AppState, AppController)
- File System Access API integration
- Real file discovery with Obsidian support
- Handle management system
- Basic UI workflow

### ✅ SPRINT 1.2 - COMPLETED
- **PreviewUtils.js**: Smart preview extraction with 70% token economy
- **FilterManager.js**: Advanced filtering with real-time counters
- **DiscoveryManager integration**: Real data analysis with relevance scoring
- **LocalStorage compression**: Memory management for large datasets
- **Error handling**: Quota exceeded management and automatic cleanup

### 🔄 NEXT: SPRINT 1.3 - AI ANALYSIS
- Integration with AI models (Claude, GPT-4, Gemini)
- Analysis templates and prompt engineering
- Context-aware processing
- Multi-format result processing

## Diagnostic Commands

Available in browser console:
- `kcdiag()` - Complete system diagnostic
- `kclog.flow(component, method, data)` - Flow debugging
- `kchandles.list()` - List registered file handles
- `KC.PreviewUtils.testRelevance(content)` - Test content relevance
- `KC.FilterManager.getStats()` - Filter statistics

## Strategic Memory: Semantic Analysis Approach

### 🎯 PLANO REFATORADO - FASE 2: PRÉ-ANÁLISE SEMÂNTICA

- 🧠 **ELEMENTO ESTRATÉGICO CENTRAL**: Análise Semântica Colaborativa
- Baseado no RESUMO EXECUTIVO que define como objetivo "Transformar conhecimento disperso em insights acionáveis", implementarei um sistema onde o usuário atua como co-analista semântico, definindo metadados estratégicos personalizados para otimizar a descoberta de momentos decisivos

### 🔍 Sistema de Palavras-Chave Estratégicas Semânticas

**Configuração Colaborativa:**
- Interface de Configuração:
  - Campo multiline para keywords personalizadas
  - Keywords Base (PRD): decisão, insight, transformação, aprendizado, breakthrough
  - Keywords Extensíveis: Uma por linha ou separadas por vírgula
  - Pesos Semânticos: Linear, Exponencial, Logarítmico
  - Preview em tempo real do impacto das keywords

**Análise Semântica:**
- Detecção de contexto: frases adjacentes às keywords
- Densidade semântica: frequência vs. relevância contextual
- Correlação cruzada: combinações de keywords que amplificam relevância
- Score composto: algoritmo que considera posição, densidade e contexto

**Implementação Prioritária:**
1. Interface de Configuração Semântica - Permitir usuário definir suas keywords estratégicas
2. Engine de Análise Semântica - Algoritmos de scoring baseados nas keywords do usuário
3. Preview Inteligente Contextual - 5 segmentos otimizados com base na análise semântica
4. Filtros Dinâmicos Adaptativos - Contadores que se ajustam às configurações semânticas do usuário

### 🎯 Objetivo Estratégico Alinhado

- O usuário se torna co-curador semântico, direcionando o sistema para identificar exatamente os tipos de "momentos decisivos" e "insights acionáveis" que são relevantes para seus projetos internos e decisões estratégicas
- Implementação inicial focará na interface de configuração semântica para personalização de palavras-chave estratégicas

## Next Steps for SPRINT 1.3

### Update Todos
  ⎿  ☐ GARANTIR preservação de todo código funcionando - APENAS ACRESCENTAR   
     ☐ Implementar interface de listagem de arquivos conforme insights-1.2.png
     ☐ Adicionar preview inteligente na listagem
     ☐ Implementar botões de ação (Analisar, Ver, Categorizar, Arquivar)
     ☐ Validar FASE 1 completa com listagem funcional

● ✅ COMPLETAR FASE 1 - MODO PRESERVAÇÃO TOTAL

  REGRA ABSOLUTA: APENAS ACRESCENTAR - ZERO remoções/alterações do código funcionando

  PLANO DE COMPLETAMENTO SEGURO:

  1. PRESERVAR 100% do código atual (DiscoveryManager, StatsPanel, filtros)
  2. ACRESCENTAR FileRenderer para listagem de arquivos
  3. ACRESCENTAR preview inteligente básico
  4. ACRESCENTAR botões de ação funcionais

  PRÓXIMO PASSO IMEDIATO:

  Vou implementar FileRenderer.js que renderiza a lista de arquivo, integrando com os dados já descobertos pelo DiscoveryManager. <Exemplo_FileRenderer>
    ---
  Filtros: 
    || {[Todos]:[N]} || {[{Alta Relevância}.(Keywords Base PRD)]}:[N]} || {[{Potencial Extendido}.(Preview Combinado 'Keywords Base + Keywords Extencíveis')]:[KB+KE]} || [KB] || +[KE] || {[Pendente Análise]:[N]} || {[Já Analisados]:[N]}
  ---
  Classificar:
    || {[>].RELEVÂNCIA} || {[>].POTENCIAL} || {[>].antigo:DATA} | {[<].recente:DATA} || {[Agrupar_por_Pasta] + {[DATA].recente} + [POTENCIAL] + [RELEVANCIA]} ||
  ---
   Arquivo: serpro.txt
   Conteudo Inicial: Serpro.gov.br ## Conti nº 2301 Consulta pública eletrônica no modelo Request For 
   Caminho: ![](file:///C:/Users/britodll/AppData/Local/Packages/oice_16_974fa...
   Relevância: 12% ([KB] || [KE])
   Data Criação: 12/06/2025
   Tamanho: 21KB
   ---
    || 🔍 Analisar com IA (Recalibrar Relevância, Possibilidade de Incluir Novos Campos [KB] || 👁️ Ver Conteúdo (Possibilidade de Incluir Novos Campos [KE]) || 📂 Categorizar (Criar,Editar,Remover,Cor) || 📦 Arquivar (Descartar,Status:{Já Analisados}) ||
    ---</Exemplo_FileRenderer>

  ESTRATÉGIA SEGURA:
  - Criar novo componente FileRenderer
  - Integrar com AppState existente (sem modificar)
  - Adicionar ao WorkflowPanel (sem alterar funcionalidade atual)
  - Testar incrementalmente

  Pergunta de confirmação: Posso começar criando o arquivo js/components/FileRenderer.js que renderiza a lista de arquivos usando os dados já descobertos, mantendo toda funcionalidade atual intacta?