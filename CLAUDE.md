# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the specification for "Consolidador de Conhecimento Pessoal" (Personal Knowledge Consolidator) - an intelligent system for automated discovery, analysis, and structuring of decisive moments in personal knowledge bases.

**Vision:** Transform scattered knowledge into actionable insights, establishing a pre-structured foundation that will feed IA automation flows for internal project proposition and strategic decision-making.

## 🚀 ESTADO ATUAL DO PROJETO - 28/07/2025

### 📊 Status Geral
- **Sistema 100% Funcional**: Todas as 10 Waves implementadas e em produção
- **Sprint Atual**: FASE 2 - Fundação Semântica ✅ CONCLUÍDA
- **Última Atualização**: 28/07/2025 - Menu Quick Access implementado e correções de modais
- **Estrutura**: Projeto reorganizado com separação clara entre produção e temporários

### 🔍 Observações Importantes
- Nao se esquecer da Data Atual Desta Ultima Atualização 28/07/2025 22:22
- A partir deste ponto deve ser seguido o timeline de acordo com a evolução
- Qualquer data anterior ao mês de JULHO (07) deve ser ajustada para evitar conflitos de espaço/tempo

### 🎯 Conquistas Principais
1. **Knowledge Consolidator Base** (Waves 1-4) ✅
   - Descoberta automática com File System Access API
   - Preview inteligente com 70% economia de tokens
   - Sistema de filtros avançados
   - Análise IA com múltiplos providers

2. **ML Confidence Integration** (Waves 6-9) ✅
   - Sistema completo de confiança ML
   - Shadow mode para validação
   - Dashboard executivo implementado
   - Performance otimizada com Worker Pool

3. **Production Deployment** (Wave 10) ✅
   - Zero downtime deployment
   - A/B Testing Framework
   - Canary Controller
   - Sistema de rollback automático

### 📁 Estrutura Atualizada
```
vcia_dhl/
├── index.html           # App principal
├── js/                  # Código de produção organizado
├── css/                 # Estilos organizados
├── docs/                # Documentação completa
├── agents_output/       # Saídas das 10 Waves
├── test/                # Testes organizados
└── temp/                # Arquivos temporários (ignorados no git)
```

### 🔧 Serviços Principais Ativos
- **EmbeddingService**: Embeddings com Ollama (768 dimensões)
- **QdrantService**: Vector DB em http://qdr.vcia.com.br:6333
- **SimilaritySearchService**: Busca semântica híbrida
- **TripleStoreService**: Extração de triplas semânticas
- **ML Confidence System**: Sistema completo de confiança

## 🚨 PROTOCOLO DE INÍCIO DE SESSÃO OBRIGATÓRIO

**ATENÇÃO**: Existe um protocolo formal para início de sessão em `/INICIO-SESSAO.md`

Para evitar retrabalho (que já causou 3+ horas de perda), SEMPRE:

1. Leia este arquivo (CLAUDE.md) primeiro para entender as LEIS
2. Leia RESUME-STATUS.md para entender o estado atual
3. Siga as instruções em INICIO-SESSAO.md

**Comando padrão de início**:

```
Leia primeiro @CLAUDE.md para entender as LEIS do projeto, depois leia @RESUME-STATUS.md para entender o estado atual. O servidor Five Server já está rodando na porta 5500 (gerenciado pelo usuário conforme @docs/servidor.md). Acesse http://127.0.0.1:5500 e execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir.
```

# Estilo de Código

- Use ES modules (import/export)
- Destructuring quando possível
- Prefira const/let sobre var

# Workflow

- Sempre executar typechecking após mudanças
- Usar single tests para performance
- Criar feature branches do develop

## Server Maintenance Guidelines

### Procedimentos para Início de Sessão

- Ao iniciar a sessão Leia primeiro @CLAUDE.md para entender as LEIS do projeto
- Depois leia @RESUME-STATUS.md para entender o estado atual
- O servidor Five Server já está rodando na porta 5500 (gerenciado pelo usuário conforme @docs/servidor.md)
- Acesse http://127.0.0.1:5500
- Execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir

<LEIS>
### LEIS do projeto

[... previous content remains the same ...]

### 📌 Recursos MCP (OBRIGATÓRIOS - 28/01/2025)

- **Recursos que DEVEM ser utilizados:**
  - **Puppeteer**: Automação de browser, testes E2E e screenshots
  - **Memory**: Sistema de memória persistente para contexto entre sessões
  - **Sequential-Think**: Análise estruturada de problemas complexos
  
- **Documentação Completa**: `/docs/10-guias-operacionais/recursos-mcp-obrigatorios.md`

- **⚠️ Problema Conhecido - Indexação de Arquivos**:
  - Arquivos recém-criados podem não aparecer com @
  - Solução: Use caminho completo ou comando Read
  - O cache do Claude Code pode demorar para atualizar

</LEIS>

[... rest of the previous content remains the same ...]