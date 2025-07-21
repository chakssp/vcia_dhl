# Consolidador de Conhecimento Pessoal

Portal para descoberta, análise e estruturação automatizada de momentos decisivos, potenciais oportunidades baseado em documentos do legado, insights a partir de ideações registradas considera fator de sucesso atender ao desafio de convergir anotações, arquivos de texto, pdf, e em formado markdown registradas em bases de conhecimento pessoal como Obsidian que estejam decentralizados em uma unica estrutura de dados que contenha os principais insights com base no legado para contextualizar o momento presente para projetar o próximo passo (A OBRA colocada em prática).

## 🎯 Objetivo

Transformar conhecimento disperso em insights acionáveis, estabelecendo uma base pré-estruturada que alimentará fluxos de automação IA para proposição de projetos internos e tomada de decisões estratégicas.
É importante que a o Efeito UAU seja o principal fator de acesso com foco no interesse e inclusão do próprio Empresário(man-in-the-loop) desde o marco zero quando realiza este assesment para obter os primeiros insights e projeções em seu ultimo estágio enquanto avança no processo em busca de enriquecer ao máximo de contexto que traduza o seu objetivo como fator de sucesso, compreendendo seus pontos fortes, seus desafios e a sua rotina com base histórica através deste portal que deve utilizar estes dados como base de conhecimento e fonte estratégica para entrega de insights e oportunidades que considerem de forma verticalizada os meios viáveis e funcionáis que podem ser impulsionados e potencializados com o auxilio da Inteligencia Artifical estruturando uma base RAG que começa a partir das informações e dados históricos em documentos e arquivos do legado para ativo estratégico que já inicia preparado para o futuro.

## 🚀 Características Principais

### ✅ Sistema Base (SPRINT 1.1 & 1.2)
- **Descoberta Automática**: Integração com File System Access API para acesso real a arquivos
- **Preview Inteligente**: Economia de 70% em tokens através de extração otimizada de 5 segmentos
- **Filtros Avançados**: Sistema dinâmico com contadores em tempo real e múltiplos critérios
- **Análise de Relevância**: Algoritmos configuráveis (Linear, Exponential, Logarithmic)
- **Gestão de Memória**: Compressão automática do localStorage para grandes volumes
- **Suporte Obsidian**: Detecção automática de vaults e integração nativa
- **Exportação RAG-Ready**: Preparado para integração com Qdrant, PostgreSQL e Redis

### 🔄 Em Desenvolvimento (SPRINT 1.3)
- **Análise IA Seletiva**: Integração com Claude, GPT-4, Gemini
- **Categorização Inteligente**: Auto-classificação baseada em conteúdo
- **Exportação Multi-formato**: JSON, Markdown, PDF, HTML

## 📋 Pré-requisitos

- Navegador moderno com suporte a ES6+ e File System Access API (Chrome 86+, Edge 86+)
- Python 3 (para servidor de desenvolvimento)
- Sem dependências externas em produção

## 🛠️ Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/knowledge-consolidator.git
cd knowledge-consolidator
```

2. Inicie o servidor de desenvolvimento
```bash
python -m http.server 8000
# ou
python3 -m http.server 8000
```

3. Acesse http://localhost:8000

## 🏗️ Arquitetura

O sistema utiliza arquitetura modular com vanilla JavaScript:

```javascript
window.KnowledgeConsolidator = {
  // Core Infrastructure
  AppState: {},           // Estado global com compressão automática
  AppController: {},      // Controle principal
  EventBus: {},          // Arquitetura orientada a eventos
  
  // Utilities
  Logger: {},            // Sistema de logging colorido
  HandleManager: {},     // Gerenciamento File System Access API
  PreviewUtils: {},      // Extração inteligente de preview
  FilterManager: {},     // Filtros avançados com contadores
  
  // Managers
  DiscoveryManager: {},  // Descoberta com dados reais
  AnalysisManager: {},   // Análise IA (SPRINT 1.3)
  ExportManager: {},     // Exportação multi-formato
  
  // UI Components
  WorkflowPanel: {},     // Interface principal
  // ... outros módulos
};
```

## 📱 Workflow de 4 Etapas

### 1. Descoberta Automática
- **File System Access API**: Acesso real aos arquivos do usuário
- **Suporte Obsidian**: Detecção automática de vaults
- **Filtros Temporais**: 1m, 3m, 6m, 1y, 2y, all
- **Padrões de Arquivo**: *.md, *.txt, *.docx, *.pdf
- **Profundidade Configurável**: Até 4 níveis de subdiretórios

### 2. Pré-Análise Local (70% Economia de Tokens)
- **Preview Inteligente**: 5 segmentos estratégicos
  - Primeiras 30 palavras
  - Segundo parágrafo completo  
  - Último parágrafo antes de ':'
  - Frase que contém ':'
  - Primeiro parágrafo após ':' (30 palavras)
- **Sistema de Relevância**: Palavras-chave estratégicas configuráveis
- **Algoritmos**: Linear, Exponencial, Logarítmico
- **Thresholds**: 30%, 50%, 70%, 90%

### 3. Análise IA Seletiva (SPRINT 1.3)
- Processamento inteligente com modelos configuráveis
- Detecção de tipos de momento decisivo
- Análise contextual otimizada

### 4. Organização e Exportação
- Categorização automática baseada em análise
- Formatos múltiplos (JSON, Markdown, PDF, HTML)
- Preparação para RAG (Qdrant-compatible)

## 🔧 Funcionalidades Implementadas

### Sistema de Filtros Avançados
- **Filtro de Relevância**: Threshold configurável (30-90%)
- **Filtros Temporais**: Baseados em data de modificação
- **Filtros de Tamanho**: Min/max configurável
- **Filtros de Tipo**: Por extensão de arquivo
- **Padrões de Exclusão**: temp, cache, backup, .git
- **Contadores em Tempo Real**: Mostra resultados por filtro
- **Ordenação Multi-nível**: Relevância, data, tamanho, nome

### Gestão de Memória Inteligente
- **Compressão Automática**: Remove conteúdo pesado do localStorage
- **Monitoramento de Quota**: Detecta aproximação dos limites
- **Limpeza Automática**: Remove dados antigos quando necessário
- **Estado Mínimo**: Fallback para dados essenciais
- **Notificações**: Alerta o usuário sobre otimizações

### Comandos de Diagnóstico
Disponíveis no console do navegador:
```javascript
kcdiag()                              // Diagnóstico completo do sistema
kclog.flow('component', 'method', {}) // Debug de fluxo
kchandles.list()                      // Lista handles registrados
KC.PreviewUtils.testRelevance(text)   // Testa relevância de conteúdo
KC.FilterManager.getStats()           // Estatísticas de filtros
```

## 📊 Performance

- **Carregamento inicial**: < 2s
- **Resposta de filtros**: < 500ms
- **Suporte para arquivos**: 1000+ com compressão automática
- **Economia de tokens**: Até 70% através do preview inteligente
- **Gestão de memória**: Automática com fallbacks inteligentes

## 🔍 Sistema de Logging

Sistema de logs colorido e estruturado:
- **Flow logs**: Rastreamento de fluxo de execução
- **Success logs**: Operações bem-sucedidas
- **Warning logs**: Avisos e otimizações
- **Error logs**: Tratamento de erros
- **Debug logs**: Informações detalhadas para desenvolvimento

## 🗂️ Estrutura de Dados

### Estado Comprimido (localStorage)
```javascript
{
  "files": [
    {
      "id": "unique_id",
      "name": "arquivo.md",
      "path": "/caminho/completo",
      "relevanceScore": 0.85,
      "tokenSavings": 73,
      "smartPreview": {
        "relevanceScore": 0.85,
        "structureAnalysis": {...},
        "stats": {...}
      }
      // conteúdo completo removido para economia
    }
  ]
}
```

### Preparação RAG (SPRINT 2)
```javascript
{
  "qdrant_payload": {
    "vector": [/* 384 dimensions */],
    "payload": {
      "filename": "arquivo.md",
      "relevance_score": 0.85,
      "analysis_type": "Breakthrough Técnico",
      "content_segments": {...},
      "keywords": ["insight", "transformação"]
    }
  }
}
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: Nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🔮 Roadmap

### ✅ SPRINT 1.1 - Sistema Base
- Core infrastructure (EventBus, AppState, AppController)
- File System Access API integration
- Real file discovery with Obsidian support
- Handle management system
- Basic UI workflow

### ❌ SPRINT 1.2 - Pré-Análise Local
- Smart preview extraction (70% token economy)
- Advanced filtering with real-time counters
- Relevance scoring with configurable algorithms
- LocalStorage compression and memory management
- Error handling and quota management

### 📅 SPRINT 1.3 - Análise IA Seletiva
- Integration with AI models (Claude, GPT-4, Gemini)
- Analysis templates and prompt engineering
- Context-aware processing
- Multi-format result processing

### 📅 SPRINT 2 - Integração RAG
- Ollama integration for local embeddings
- N8N workflow automation
- Qdrant vector database setup
- PostgreSQL metadata storage
- Redis caching layer

### 📅 SPRINT 3 - Inteligência Avançada
- Pattern detection and cross-connections
- Predictive decisive moment identification
- Automated insight generation
- Executive reporting

## 📞 Suporte

Para reportar problemas ou sugerir melhorias:
- Use as Issues do GitHub
- Consulte a documentação em `/docs/`
- Utilize os comandos de diagnóstico no console

---

**Desenvolvido com foco em dados reais e economia de tokens para máxima eficiência.**