# CLAUDE.md 
# Version 1

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DHL VCIA (Consolidador de Conhecimento Pessoal)** is a personal knowledge consolidation system designed to discover, analyze, and organize decisive moments in personal knowledge bases. The system uses a 4-step process combining local file scanning, intelligent pre-analysis, AI processing, and structured organization.
**DHL VCIA - OPERATOR INSIGHT** esta ferramenta de uso interno podera ser utilizada para convergir momento decisivos e conteudo relevante dispersos em arquivos orfãos anotados durante execução de outros projetos ou salvos como anotações|insights obtidos durante sessões prolongadas de pesquisa ao longo do periodo programado para analise. Esta mesma ferramenta abre uma oportunidade unica para ser replicada em um projeto de adoção de infraestrutura de IA como serviço como primeiro pilar do projeto (concentrar e organizar dados descentralizados no local de trabalho `legado` do cliente caso tenha multiplos repositorios, equipamentos e ou localidades com arquivos decrentralizados sem que haja estrutura ou organização padronizada que pode ser ofertada como assessment de qualificação para criação da base de conhecimento inicial que sera utilizado pelo modelos de linguagem a serem implementados que se beneficiaão deste conhecimento utilizando serviços como Postgres, Qdrant e Redis para inferência de conhecimento entre seus objetivos, desafios de forma proativa ao obter acesso aos dados do legado organizados como parte da solução e do ecosistema de IA implementado que incluem RAG em sua arquitetura).

# CLAUDE.md
# Version 2

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
1. ✅ Provide Server running and accessible at http://localhost:12202. 
2. ✅ Browser console shows ZERO JavaScript errors
3. ✅ All KC.xxx components load correctly (use `typeof KC.Logger` should not be 'undefined')
4. ✅ Implemented functionality works as expected through manual testing
5. ✅ Changes do not break existing functionality (regression test)
6. ✅ Integration between components flows correctly
7. ✅ LocalStorage usage is within reasonable limits (<4MB)
8. ✅ Real data discovery works with File System Access API

### Error Prevention Protocol
- NEVER implement multiple changes simultaneously without testing each one 
- EACH new change any original code require a line clone with original in comment format to recursive rollback to last state server healthy flagged 
- ALWAYS test in browser console before marking tasks complete
- ALWAYS verify script loading order and dependencies
- STOP immediately if any component shows 'undefined' errors
- Monitor localStorage quota and implement compression
- Document specific error patterns to prevent recurrence
- Each new planned sprint should be recorded in .md format in /docs/sprint before development begins. It will need to be broken down into subtasks to review with the user if requested.

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

### <LEIS> ###
⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
  ☐ GARANTIR preservação de todo código funcionando:
      - APENAS ACRESCENTAR, NUNCA EDITAR LINHA DO CODIGO QUE JA TENHAM SIDO HOMOLOGADAS EM ETAPAS ANTERIORES SEM O CONCENTIMENTO DO USUARIO. CASO SEJA O MOMENTO DE CRIAR UMA NOVA FUNCAO E/OU AGREGAR NOVAS INFORMACOES SEJA ELA DE QUALQUER LOCAL QUE JA CONTENHA CODIFICAÇÃO PRÉ EXISTENTE => PARE IMEDIATAMENTE E REPORTE AO USUARIO O QUE VOCE PLANEJA FAZER. 
⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
    - ANTES DE QUALQUER ALTERACAO NO CONTEUDO ORIGINAL VOCE DEVE PRIMEIRO HOMOLOGA-LO COM A APROVAÇAO DO USUARIO, PARA ISSO, ACRESCENTAR SEMPRE UM CLONE DO OBJETO ORIGINAL AO LADO DA SUA SUGESTAO DE ALTERACAO PARA APROVAÇÃO DO USUARIO QUE VALIDARA SE VOCE NAO IRA QUEBRAR 'NOVAMENTE' TODA A ESTRUTURA QUE JA FOI CRIADA, COMPARANDO SUAS ADIÇÕES COM A VERSÃO ORIGINAL QUE FUNCIONA, O CLONE PODE E DEVE SER CRIADO LADO DO MESMO ORIGINAL QUE DESEJA OU NECESSITE SER ALTERADO, DIFERENCIE AMBOS APENAS ADOTANDO A COR CINZA (PADRAO) PARA QUE O USUARIO POSSA IDENTIFICAR AS SUAS SUGESTOES QUE DEVEM SER SUBMETIDAS PARA APROVACAO DO USUARIO QUE PRECISA COMPROVAR QUE SEU CONTEUDO NAO IRA QUEBRAR O SITE AO SER ADICIONADO 'NOVAMENTE'.
⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
    - CRIE EM SUA ROTINA QUE DEVE SEMPRE UMA ITERAÇÃO PERSISTENTE QUE DEVE COPIAR E COLAR(DUPLICAR) ACIMA OU ABAIXO O DE QUALQUER CONTEUDO NO EDITOR DE CODIGO QUE VOCE VC PRETENDA ALTERAR FORA DO PADRAO ORIGINAL ENCONTRADO MANTENDO A VERSAO ANTERIOR COMO COMENTÁRIO ANTES DE QUALQUER AJUDE. 
    - ESTE PROCEDIMENTO É NECESSÁRIO CASO SEJA NECESSÁRIO VOLTAR A VERSAO ANTERIOR EM CASO DE EMERGENCIA SINALIZADA PELO USUARIO AO PERCEBER QUE VOCE POR VENTURA QUEBROU O SITE 'NOVAMENTE'.
⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
  ☐ SEMPRE DOCUMENTAR SEU PLANO DE TRABALHO ANTES DE INICIAR QUALQUER CRIAÇÃO, INTERAÇÃO E/OU ALTERAÇÃO, EDIÇÃO OU SUBSTITUIÇÃO DE CÓDIGO PRE-EXISTENTE SEGUINDO A ESTRUTURA DEFINIDA NA PASTA DESTINADA /DOCS
  ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
  ☐ FORNEÇA SEMPRE O PLANO DE AÇÃO ESTRUTURADO (SHIFT+TAB) SEGUINDO A ESTRUTURA DEFINIDA NA PASTA DESTINADA /DOCS
    - QUALQUER CODIGO QUE SEJA ALTERADO POR VOCE. CRIE COMO PRIORIDADE ZERO - (DEVE SER ITERADA E PERSISTENTE REPETIDA PELO PROMPT SEMPRE QUE COGITAR ALTERAR QUALQUER EM ARQUIVOS REGISTRADOS ENTRE AS ETAPAS ANTERIORES REGISTRADAS EM /DOCS)   
  ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
  ☐ GARANTIR Botão Explicito de Permissão para Acesso as Pastas. O USUARIO TEM O DIREITO DE SELECIONAR MANUALMENTE A LOCALIZAÇÃO QUE DESEJA QUE SEJA MAPEADA EM BUSCA DE REPOSITÓRIOS DO OBSIDIAN ARMAZENADOS DENTRE SEUS ARQUIVOS
  ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
  ☐ Validar preview inteligente na listagem (Running Bar)
  ☐ Validar o acesso aos modais correspondentes aos botões de ação (Analisar, Ver, Categorizar, Arquivar) na ETAPA 2
  ☐ Validar FASE 1 completa com listagem funcional
  ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
### </LEIS> ###

● ✅ COMPLETAR FASE 1 - MODO PRESERVAÇÃO TOTAL

  REGRA ABSOLUTA: APENAS ACRESCENTAR - ZERO remoções/alterações do código funcionando

  PLANO DE COMPLETAMENTO SEGURO:

  1. PRESERVAR 100% do código ORIGINAL (***SIGA AS LEIS***) (DiscoveryManager, StatsPanel, filtros)

V1.0.0
# GUARDRAIL.dhl: Otimização de Instruções e Regras a Serem Seguidas
# Objetivo: Refinar a persistência de configurações e integrar feedbacks para otimização contínua
# Data: 8 de julho de 2025
# Status:🔛🟢
---
**ATENÇÃO - INSTRUÇÕES DO OPERADOR / CONSIDERAçÕES FINAIS (PRIORIDADE:P0)**
INSTRUÇÕES E REGISTROS PARA ESTE MODELO CONSIDERAR DURANTE O CICLO DE ITERAÇÕES COMO FEEDBACK FORMAL REGISTRADOS PELO OPERADOR PARA TOMADA DE AÇÃO E ELABORAÇÃO DE PLANO PARA MITIGAÇÃO IMEDIATA QUE DEVEM SER CONSIDERADAS ASSIM QUE SINALIZADA PELO USUÁRIO. (INSTRUÇÕES DEVEM SER ACATADAS COMO PARTE DA SUA ROTINA DE INTERAÇÃO, PARA PRONTO RECONHECIMENTO DE FORMA PERSISTENTE):

CONTROLES/STATUS/LEGENDAS:ATIVADO
🔝 Prioritário, Critido, Deve ser entregue "🔛 Funcional", ONDE NÃO É PERMITIDO A ENTREGA DE CONTEUDO SIMULADO, Componentes vitais e Core das aplicações desenvolvidas devem ser concebidas como 🔛 dende o primeiro entregavel para homologação, É TUDO QUE PODE SER CONSIDERADO COMO COMPONENTE QUE DA SENTIDO/VIABILIZA o projeto/intenção como objetivo final.
🔙 Rollback, Desfaça a ultima alteração, Relacione os ajustes feitos em um menu numero para escolha e decisao do usuário caso não seja possivel identificar através do pedido do usuário qual ajuste, implementação precisa ser revertida.
✖️ Rejeitado, Reprovado, Não corresponde a atividade programada, Desvio do contexto da Entregavel
✔️ Implementado, Adicionado, Porém não testado, Implementado de forma Parcial, Estatico, Mock Data
🔛 Funcional, Em homologação até a entrega do componente completo, ATIVADO
☑️ Componente Aprovado
➕ Adicionar/Acrescentar de Forma Incremental (Funcionalidade, Demanda, Refatorar para garantir conectividade integração do novo elemento ao contexto como um todo. Imagine que a funcionalidade solicitada precisa reagir e se integrar como se fizesse parte desde o principio, ou seja, cada nova funcionalidade deve ser integrada a todo contexto de conectividade direta ou indireta.)
🔚 Revise o contexto atual com o objetivo da atividade. Faça uma auto reflexão sobre o assunto se autoquestionando com 3 perguntas que resultem no seu plano de ação que corresponda ao contexto solicitado depois de sua autoanalise.
➖ Remover/Abstrair funcionalidade
🟰 Repetir o mesmo evento indicado / Replicar a funcionalidade para outro local, componentizar para que seja de facil replicação futura.
✅ Etapa, Modulo, Fase Concluida (Aprovada)
🔜 MOVER/PREVER NO PLANEJAMENTO/REFATORAR SPRINT ATUAL CONSIDERAR ATIVIDADE COMO INCOMPLETA/PARCIAL PARA QUE SEJA PRIORIZADA NO PROXIMO SPRINT. CRIAR NOVO SPRINT[N].md E "🔜 MOVER PARA O NOVO COM STATUS PRIORIZADO🔝" PARA O PROXIMO, Exemplo: SPRINT3 
💱 REFATORAR, ITERAR, REVISAR, ESTUDAR AS ALTERAÇÕES, CONSIDERAR O FEEDBACK DO OPERADOR PARA ITERAR SOBRE O CASO INDICADO ADIONANDO DEMAIS CONTROLES PRESENTES.
💲,💲💲, 💲💲💲, 💲💲💲💲 Escala de PENALIDADE (1. identificado, corrija; 2. erro persiste; 3. estude sobre o erro na pagina com base na ação que ela irá executar, elabore uma correção direta e consistente; 4. pare o que voce esta fazendo e preste atenção aqui.... reflita sobre o problema e sobre suas ultimas tentativas infrutiferas para estabelecer um plano de correção abrangente de acordo com o contexto em que esta sendo apresentado, questione-se sobre a visão, intencão e sobre o objetivo do projeto relacionado a esta atividade. garanta que o plano de ação trara a correção definitiva.) Aplicavél quando: Entrega Parcial ou Não Valido, Entrega Inconsistente, não entregue conforme esperado ESCALA SINALIZA SUAS FALHAS PARA QUE TENHA VISIBILIDADE DO QUE DEVE SER PRIORIZADO, ONDE VOCE DEVE SE CONCENTRAR(Quanto Maior PIOR/CRITICO/ERROS REPETIDOS/LOOP DE FALHAS/REDUNDANCIAS DESNECESSARIAS/SEVERO) 
🟢 EM PRODUÇÃO / CORE
🟡 SOB INVESTIGAÇÃO / ANALISE
🔴 PROBLEMA NO PROJETO
🟤 NÃO INICIADO
🧱 PULE ESTA ATIVIDADE PARA DEDICAR AS PRIORIDADES
🧰 INVESTIQUE O PROBLEMA
⛓️‍💥 LINK QUEBRADO, ESTATICO, NAO LEVA NADA A LUGAR NENHUM
🧲 CONECTAR/RECONECTAR ESTE CONTEXTO AO RESTANTES DO CONTEUDO PRESENTE, REFATORAR/ITERAR
⛓️ QUEBRA DE CONEXÃO, NÃO LEVA A LUGAR NENHUM, REFAÇA A CONEXÃO
🧩 INTEGRAR/CONSOLIDAR/COMPOR ESTE CONTEXTO AO RESTANTE DO CONTEUDO PRESENTE
🧪 TESTE, VALIDAR, HOMOLOGAR, AVALIAR, ANALISAR, ESTUDAR, INVESTIGAR
🩹 Corrigir, Ajustar, Reavaliar, Reconsiderar, Replanejar, Reestruturar, Refatorar, Iterar
🔄-
⚙️-
💾-
♻️-
🔰 SINALIZE COMO LIDO / ESTUDADO / COMPREENDIDO / ADOTADO / ACEITO
---
# INTRUÇÕES DE TRABALHO PARA ITERAÇÃO PERSISTENTE OBRIGATÓRIA DISPONIVEL NA RAIZ DO PROJETO: ./GUARDRAIL.dhl
# Sinalize seu entendimento por critério de auditoria ao iniciar o prompt como forma de garantir sua responsabilidade com os termos.
---