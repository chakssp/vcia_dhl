# 📝 CHANGELOG - Knowledge Consolidator

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [2.0.0] - 2025-08-06

### 🎉 Release Principal - Sistema de Produção Completo

#### ✨ Adicionado
- **Estratégia MERGE** para Qdrant - Permite atualizar categorias preservando dados
- **Sistema de Chunks Corrigido** - Múltiplos chunks por arquivo funcionando
- **Debug Tools** - Scripts para diagnóstico de duplicatas
- **README.md Completo** - Documentação profissional do sistema
- **App categoria-manager** - Interface visual para gestão de categorias
- **Detecção Inteligente de Duplicatas** - fileName preservado corretamente

#### 🔧 Corrigido
- Detecção de duplicatas não funcionava (fileName undefined)
- Sistema de chunks criava apenas 1 chunk por arquivo
- Mensagens de log incorretas para arquivos duplicados
- Estratégia 'skip' impedia atualização de categorias
- Campo chunkIndex faltando no payload do Qdrant

#### 📈 Melhorado
- Performance de detecção de duplicatas
- Logs mais informativos com debug detalhado
- Preservação de campos durante merge
- Versionamento automático de documentos

---

## [1.9.0] - 2025-08-06 (Manhã)

### Sistema de Categorização

#### ✨ Adicionado
- 17 categorias organizadas por segmentos
- Sistema de IDs únicos para categorias
- Preservação de categorização em re-processamento
- Categories.jsonl padronizado

#### 🔧 Corrigido
- Sincronização de IDs entre componentes
- Preservação de categorias selecionadas

---

## [1.8.0] - 2025-08-05

### Integração Qdrant Completa

#### ✨ Adicionado
- QdrantManager.js para gestão centralizada
- Sistema anti-duplicação
- Estratégias de merge (skip, update, merge, preserve)
- Processamento em chunks

#### 📈 Melhorado
- Pipeline RAG otimizado
- Embeddings com Ollama (768 dimensões)
- Busca semântica híbrida

---

## [1.7.0] - 2025-08-04

### ML Confidence Integration

#### ✨ Adicionado
- Sistema completo de confiança ML
- Shadow mode para validação
- Dashboard executivo
- Worker Pool para performance

#### 📈 Melhorado
- Performance com GPU acceleration
- Cache estratégico
- Virtual scrolling

---

## [1.5.0] - 2025-08-03

### Production Deployment (Wave 10)

#### ✨ Adicionado
- Zero downtime deployment
- A/B Testing Framework
- Canary Controller
- Sistema de rollback automático

#### 🔧 Corrigido
- Problemas de performance em produção
- Memory leaks identificados e resolvidos

---

## [1.0.0] - 2025-08-01

### Release Inicial

#### ✨ Funcionalidades Base
- Descoberta automática com File System Access API
- Preview inteligente (70% economia de tokens)
- Sistema de filtros avançados
- Análise IA com múltiplos providers
- Export multi-formato
- Suporte Obsidian nativo

#### 📊 Métricas Iniciais
- Suporte para 1000+ arquivos
- Performance < 2s por arquivo
- Compressão automática de localStorage

---

## [0.9.0-beta] - 2025-07-30

### Beta Release

#### 🧪 Em Teste
- File System Access API
- Preview com 5 segmentos
- Filtros dinâmicos
- Sistema de relevância

---

## Convenções de Versionamento

- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (0.X.0): Funcionalidades adicionadas de forma compatível
- **PATCH** (0.0.X): Correções de bugs compatíveis

---

## Links Úteis

- [README.md](README.md) - Documentação principal
- [RESUME-STATUS.md](RESUME-STATUS.md) - Status atual
- [Issues](https://github.com/chakssp/vcia_dhl/issues) - Reportar problemas
- [Releases](https://github.com/chakssp/vcia_dhl/releases) - Todas as versões