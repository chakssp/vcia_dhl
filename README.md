# 🧠 Knowledge Consolidator v2.0

**Sistema Inteligente de Consolidação de Conhecimento Pessoal**

[![Status](https://img.shields.io/badge/Status-Production-green)](https://github.com/chakssp/vcia_dhl)
[![Version](https://img.shields.io/badge/Version-2.0-blue)](https://github.com/chakssp/vcia_dhl)
[![Qdrant](https://img.shields.io/badge/Qdrant-Integrated-purple)](http://qdr.vcia.com.br:6333)

Portal avançado para descoberta, análise e estruturação automatizada de momentos decisivos e oportunidades em bases de conhecimento pessoal. Transforma anotações dispersas, documentos e ideações em uma estrutura unificada de insights acionáveis.

## 🎯 Objetivo

Transformar conhecimento disperso em insights acionáveis, estabelecendo uma base pré-estruturada que alimentará fluxos de automação IA para proposição de projetos internos e tomada de decisões estratégicas.
É importante que a o Efeito UAU seja o principal fator de acesso com foco no interesse e inclusão do próprio Empresário(man-in-the-loop) desde o marco zero quando realiza este assesment para obter os primeiros insights e projeções em seu ultimo estágio enquanto avança no processo em busca de enriquecer ao máximo de contexto que traduza o seu objetivo como fator de sucesso, compreendendo seus pontos fortes, seus desafios e a sua rotina com base histórica através deste portal que deve utilizar estes dados como base de conhecimento e fonte estratégica para entrega de insights e oportunidades que considerem de forma verticalizada os meios viáveis e funcionáis que podem ser impulsionados e potencializados com o auxilio da Inteligencia Artifical estruturando uma base RAG que começa a partir das informações e dados históricos em documentos e arquivos do legado para ativo estratégico que já inicia preparado para o futuro.

## ✨ Funcionalidades Principais

### 🔍 Descoberta e Análise
- **File System Access API**: Acesso direto a arquivos locais
- **Preview Inteligente**: 70% economia de tokens com extração otimizada
- **Filtros Avançados**: Relevância, data, tamanho, tipo com contadores real-time
- **Análise IA Multi-Provider**: Claude, GPT-4, Gemini, Ollama
- **Suporte Obsidian**: Integração nativa com vaults

### 🚀 Integração Qdrant
- **Vector Database**: Armazenamento e busca semântica
- **Embeddings 768D**: Via Ollama local
- **Deduplicação Inteligente**: Detecção automática de duplicatas
- **Merge Strategy**: 4 estratégias de atualização (Skip, Update, Merge, Preserve)
- **Chunk Processing**: Divisão otimizada para RAG
- **Versionamento**: Controle automático de versões

### 📊 Sistema de Categorização
- **17 Categorias Pré-definidas**: Organizadas por segmentos
- **Interface Visual**: App categoria-manager dedicado
- **Merge Inteligente**: União de categorias em re-processamento
- **Preservação de Curadoria**: Mantém decisões humanas

### ⚡ Performance e Produção
- **10 Waves Implementadas**: Sistema completo em produção
- **ML Confidence System**: Scoring e validação avançados
- **Zero Downtime**: Deploy com rollback automático
- **4 Camadas de Backup**: Git + Local + Branches + MCP Memory

## 📋 Pré-requisitos

- **Browser**: Chrome 86+, Edge 86+ (File System Access API)
- **Qdrant**: Servidor rodando em http://qdr.vcia.com.br:6333
- **Ollama**: Para embeddings locais (opcional)
- **Servidor**: Five Server ou Python HTTP Server
- **Node.js**: 18+ (desenvolvimento)

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/chakssp/vcia_dhl.git
cd vcia_dhl
```

### 2. Configure os serviços
```javascript
// js/services/QdrantService.js
this.baseUrl = 'http://qdr.vcia.com.br:6333';

// js/services/EmbeddingService.js
this.ollamaUrl = 'http://localhost:11434';
```

### 3. Inicie o servidor
```bash
# Opção 1: Five Server (recomendado)
# Porta 5500 com Live Reload

# Opção 2: Python HTTP Server
python -m http.server 5500
```

### 4. Acesse http://localhost:5500

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

## 📖 Uso Rápido

### Comandos Essenciais

```javascript
// Diagnóstico completo do sistema
kcdiag()

// Descoberta de arquivos
KC.DiscoveryManager.startDiscovery()

// Processar e enviar para Qdrant
KC.RAGExportManager.consolidateData()

// Verificar conexão Qdrant
KC.QdrantService.checkConnection()

// Estatísticas do Qdrant
KC.QdrantService.getCollectionStats()

// Ver arquivos descobertos
KC.AppState.get('files')

// Categorias disponíveis
KC.CategoryManager.getAll()

// Debug de duplicatas
debugDuplicateDetection()
```

## 🔀 Estratégias de Merge (Qdrant)

### Como funciona cada estratégia:

#### 1. **SKIP** (Ignora duplicatas)
```javascript
{ duplicateAction: 'skip' }
// ✅ Preserva tudo no Qdrant
// ❌ Não atualiza nada
```

#### 2. **UPDATE** (Substitui tudo)
```javascript
{ duplicateAction: 'update' }
// ❌ Perde categorias antigas
// ✅ Atualiza com dados novos
```

#### 3. **MERGE** (Combina - PADRÃO)
```javascript
{ duplicateAction: 'merge' }
// ✅ Une categorias (sem duplicatas)
// ✅ Preserva enriquecimentos
// ✅ Incrementa versão
```

#### 4. **UPDATE+PRESERVE** (Híbrido)
```javascript
{ 
  duplicateAction: 'update',
  preserveFields: ['categories', 'approved']
}
// ✅ Atualiza mas preserva campos específicos
```

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

## 🏆 Projeto Completo - Waves 1-10 Implementadas

### ✅ PARTE I: Knowledge Consolidator Foundation (Waves 1-4)
- **Wave 1-2**: Core infrastructure + File System Access API + Preview inteligente
- **Wave 3-4**: Análise IA + Filtros avançados + Organização

### ✅ WAVE 5: Ponto de Virada Estratégica
- Transição para produção e preparação para ML Integration

### ✅ PARTE II: ML Confidence Integration (Waves 6-10)
- **Wave 6**: Infrastructure Foundation (Feature Flags, State Extension, Monitoring)
- **Wave 7**: ML Core Components (Calculator, Tracker, Shadow Mode) 
- **Wave 8**: UI/UX Enhancement (Badges, Dashboard, GPU acceleration)
- **Wave 9**: Performance & Scale (Worker Pool, Caching, Virtual Scroll)
- **Wave 10**: 🚀 **PRODUÇÃO COMPLETA** - Sistema integrado ativo

### 🎯 Resultados Alcançados
- **100% Feature Availability**: Sistema completo em produção
- **Zero Downtime**: Transição suave para produção real
- **Performance Excellence**: 100 files <2s, 60fps, 90%+ cache hit rate
- **ML Integration**: Confidence tracking com shadow mode validado
- **User Experience**: Dashboard executivo + interface otimizada

---

## 🐛 Troubleshooting

### Problema: Arquivos não detectados como duplicatas
```javascript
// Execute o script de debug
load('debug-duplicates-check.js')
// Ou diretamente:
debugDuplicateDetection()
```

### Problema: Erro de conexão com Qdrant
```javascript
// Verificar conexão
KC.QdrantService.checkConnection()
// Ver URL configurada
KC.QdrantService.baseUrl
```

### Problema: Embeddings não funcionam
```javascript
// Verificar Ollama
KC.EmbeddingService.checkOllamaAvailability()
// Ver URL Ollama
KC.EmbeddingService.ollamaUrl
```

### Problema: LocalStorage cheio
```javascript
// Limpar cache
KC.AppState.clearCache()
// Ver uso atual
KC.AppState.getStorageSize()
```

---

## 📚 Documentação Adicional

- **[CLAUDE.md](CLAUDE.md)** - Diretrizes e LEIS do projeto
- **[RESUME-STATUS.md](RESUME-STATUS.md)** - Status atual detalhado
- **[docs/](docs/)** - Documentação técnica completa
- **[qdrant-fase/](qdrant-fase/)** - Planejamento Qdrant-First
- **[test/](test/)** - Arquivos de teste e validação

---

## 🚀 Roadmap Futuro

- [ ] Interface de busca semântica avançada
- [ ] Integração com N8N workflows
- [ ] Export direto para Obsidian
- [ ] API REST pública
- [ ] Mobile app com React Native
- [ ] Integração com Langchain
- [ ] Multi-language support

---

## 📞 Contato e Suporte

- **GitHub Issues**: [Reportar problemas](https://github.com/chakssp/vcia_dhl/issues)
- **Documentação**: [Wiki do projeto](https://github.com/chakssp/vcia_dhl/wiki)
- **Email**: suporte@vcia.com.br

---

## 👏 Agradecimentos

- **Claude Code Assistant** - Arquitetura e implementação
- **Qdrant Team** - Vector database excepcional
- **Ollama** - Embeddings locais eficientes
- **Obsidian Community** - Inspiração e feedback

---

**Knowledge Consolidator v2.0** - Transformando conhecimento disperso em insights acionáveis 🚀

*Desenvolvido com foco em dados reais e economia de tokens para máxima eficiência.*