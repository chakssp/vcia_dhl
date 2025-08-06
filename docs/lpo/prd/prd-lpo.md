# Prompt - PRD - LPO Inteligência Baseado em Triplas Semânticas

```text
ask is running… por favor, formalize esta estrutura em um PRD como backlog do projeto. Em seguida estabeleça o planejamento 
contendo os requisitos que são necessários bem como os componentes envolvidos para esta atividade, precisamos trabalhar com 
maxima componentização para este caso para depois ajustarmos as inconsistencia encontradas no sistema durante sua analise para 
providenciar o plano de ação para correção definitiva deste bug de arquitetura
```

---

Update Todos
  ⎿  ☒ Validate architecture for AI-driven insights generation
     ☐ Create PRD for Triple-Based Intelligence System
     ☐ Design component architecture for semantic triples
     ☐ Identify and document architecture bugs
     ☐ Create action plan for architecture fixes
-------------------------------------------------

# PRD - Sistema de Inteligência Baseado em Triplas Semânticas

## 1. VISÃO DO PRODUTO

### 1.1 Objetivo

Implementar uma camada de inteligência semântica no Knowledge Consolidator que unifique as três fontes de dados desconectadas (Categorias, Tipos de Análise, Classificações) através de um modelo de triplas semânticas (Legado-Presente-Objetivo), permitindo geração de insights acionáveis e integração com o ecossistema de automação.

### 1.2 Problema Identificado

- Bug de Arquitetura: 3 fontes de dados operando independentemente sem correlação
- Impacto: Perda de inteligência, ausência de aprendizado, curadoria ineficaz
- Consequência: Sistema funciona como organizador simples, não como inteligência

### 1.3 Solução Proposta

Sistema unificado de triplas semânticas que conecta todas as fontes de dados, permite aprendizado contínuo e gera insights
acionáveis para automação.

## 2. BACKLOG DO PRODUTO

### 2.1 Épicos

#### ÉPICO 1: Infraestrutura de Triplas Semânticas

Como arquiteto do sistema
Quero uma infraestrutura unificada de triplas semânticas
Para conectar todas as fontes de dados e permitir inteligência real

#### ÉPICO 2: Integração com Ecossistema

Como operador do sistema
Quero que insights sejam automaticamente acionáveis
Para que N8N, LangChain e Evolution API executem ações sem intervenção manual

#### ÉPICO 3: Correção do Bug de Arquitetura

Como desenvolvedor
Quero refatorar os componentes desconectados
Para estabelecer uma fonte única de verdade semântica

### 2.2 User Stories Detalhadas

#### Sprint 1: Fundação (1 semana)

##### US-001: Criar TripleStoreManager

Como sistema 

Quero armazenar e gerenciar triplas semânticas
Para estabelecer relacionamentos entre dados

### Critérios de Aceite:

- [ ] Estrutura legado-presente-objetivo implementada
- [ ] Índices por cada dimensão
- [ ] API de adição/busca/remoção
- [ ] Eventos de mudança implementados

##### US-002: Criar TripleSchema

Como sistema
Quero definir esquema de predicados válidos
Para garantir consistência semântica

### Critérios de Aceite:

- [ ] Predicados definidos para cada domínio
- [ ] Validação de triplas
- [ ] Conversão de dados existentes

##### US-003: Implementar RelationshipExtractor

Como sistema
Quero extrair relacionamentos automaticamente
Para popular a base de triplas

Critérios de Aceite:

- [ ] Extração de categorias → triplas
- [ ] Extração de análises → triplas
- [ ] Detecção de padrões

#### Sprint 2: Unificação (1 semana)

##### US-004: Refatorar CategoryManager
Como desenvolvedor
Quero que CategoryManager use TripleStore
Para eliminar fonte de dados isolada

Critérios de Aceite:

- [ ] Migração de dados existentes
- [ ] API mantida (retrocompatibilidade)
- [ ] Eventos propagados para TripleStore

##### US-005: Refatorar FileRenderer
Como desenvolvedor
Quero que FileRenderer consulte TripleStore
Para decisões baseadas em inteligência unificada

Critérios de Aceite:

- [ ] Detecção via triplas
- [ ] Sugestões baseadas em histórico
- [ ] Performance mantida

##### US-006: Criar InsightGeneratorAI
Como sistema
Quero gerar insights acionáveis via IA
Para criar valor imediato

Critérios de Aceite:

- [ ] Análise de padrões em triplas
- [ ] Geração de recomendações
- [ ] Formato acionável (N8N/LangChain)

#### Sprint 3: Integração (1 semana)

##### US-007: Criar N8NExporter
Como sistema
Quero exportar workflows para N8N
Para automação de insights

Critérios de Aceite:

- [ ] Conversão tripla → workflow
- [ ] Webhooks configurados
- [ ] Templates de automação

##### US-008: Criar LangChainIntegration
Como sistema
Quero integrar com LangChain
Para processamento avançado

Critérios de Aceite:

- [ ] Chains baseadas em triplas
- [ ] Retrieval aumentado
- [ ] Feedback para TripleStore

##### US-009: Criar EvolutionAPIConnector
Como sistema
Quero notificar via Evolution API
Para comunicação automatizada

Critérios de Aceite:

- [ ] Templates baseados em insights
- [ ] Triggers configuráveis
- [ ] Rastreamento de entregas

## 3. ARQUITETURA DE COMPONENTES

### 3.1 Componentes Core (Novos)

// Estrutura de componentes maximizada
/js/
  ├── core/
  │   └── TripleStoreCore.js       // Motor central de triplas
  ├── managers/
  │   ├── TripleStoreManager.js    // Gerenciador principal
  │   ├── InsightGeneratorAI.js    // Gerador de insights
  │   └── UnifiedIntelligence.js   // Orquestrador
  ├── schemas/
  │   ├── TripleSchema.js          // Definições semânticas
  │   └── PredicateOntology.js     // Ontologia de predicados
  ├── extractors/
  │   ├── RelationshipExtractor.js // Extrator base
  │   ├── CategoryExtractor.js     // Específico categorias
  │   └── AnalysisExtractor.js     // Específico análises
  ├── exporters/
  │   ├── N8NExporter.js           // Export para N8N
  │   ├── QdrantExporter.js        // Export para Qdrant
  │   └── PostgresExporter.js      // Export para Postgres
  ├── integrations/
  │   ├── LangChainIntegration.js  // Integração LangChain
  │   ├── EvolutionAPIConnector.js // Integração Evolution
  │   └── EcosystemOrchestrator.js // Orquestrador geral
  └── validators/
      ├── TripleValidator.js       // Validação de triplas
      └── SchemaValidator.js       // Validação de esquemas

### 3.2 Componentes Modificados

// Componentes que precisam refatoração
    CategoryManager.js      → Usar TripleStore como backend
    FileRenderer.js         → Consultar TripleStore para classificação
    AnalysisManager.js      → Gerar triplas após análise
    RAGExportManager.js     → Incluir camada semântica
    StatsPanel.js           → Mostrar estatísticas de triplas

## 4. REQUISITOS TÉCNICOS

### 4.1 Requisitos Funcionais

- RF-001: Sistema deve armazenar triplas no formato legado-presente-objetivo
- RF-002: Cada operação deve gerar eventos para sincronização
- RF-003: Insights devem ser convertidos em ações executáveis
- RF-004: Sistema deve manter retrocompatibilidade durante migração
- RF-005: Exportação deve incluir camada semântica

### 4.2 Requisitos Não-Funcionais

- RNF-001: Performance de busca < 100ms para 10k triplas
- RNF-002: Armazenamento otimizado com índices
- RNF-003: Sistema deve ser extensível para novos predicados
- RNF-004: Logs detalhados para auditoria de decisões
- RNF-005: Fallback para operação sem TripleStore

### 4.3 Requisitos de Integração

- RI-001: API REST para consulta de triplas
- RI-002: Webhooks para N8N
- RI-003: Formato compatível com LangChain
- RI-004: Eventos para RabbitMQ
- RI-005: Schema para PostgreSQL

## 5. PLANO DE AÇÃO - CORREÇÃO DO BUG

### 5.1 Análise do Bug Atual

// PROBLEMA: 3 fontes desconectadas
    CategoryManager {
      categories: [...]  // Isolado
    }

    AnalysisTypes {
      types: [...]      // Isolado
    }

    FileRenderer {
      classify()        // Não aprende
    }

// RESULTADO: Sem correlação, sem aprendizado

### 5.2 Estratégia de Correção

#### Fase 1: Preparação (Sem Breaking Changes)

1. Implementar TripleStore em paralelo
2. Criar adaptadores para componentes existentes
3. Popular TripleStore com dados atuais

#### Fase 2: Migração Gradual

1. FileRenderer começa a consultar TripleStore
2. CategoryManager escreve em ambos (legacy + triple)
3. Testes extensivos de regressão

#### Fase 3: Consolidação

1. Remover código legado
2. TripleStore como única fonte
3. Otimizações de performance

### 5.3 Validação da Correção

// DEPOIS: Sistema unificado e inteligente
TripleStore {
      // Categoria técnica correlaciona com Breakthrough
      {
          legado: "tech",
          presente: "correlacionaCom",
          objetivo: "Breakthrough Técnico",
          confianca: 0.92
      },
      // Sistema aprende e melhora
      {
          legado: "padrão_detectado",
          presente: "sugereAção",
          objetivo: "criar_documentação",
          metadados: { n8n_workflow: "doc_gen" }
      }
  }

## 6. MÉTRICAS DE SUCESSO

### 6.1 Métricas Técnicas

- Correlação de dados: De 0% para 85%+
- Precisão de sugestões: De 60% para 85%+
- Tempo de classificação: -50%
- Automações criadas: 10+ workflows/mês

### 6.2 Métricas de Negócio

- Time to Intelligence: Imediato (vs manual)
- Insights acionáveis: 80%+ com automação
- Redução de curadoria manual: 70%
- ROI de automação: 5x em 3 meses

## 7. RISCOS E MITIGAÇÕES

| Risco                     | Impacto | Probabilidade | Mitigação                           |
| ------------------------  | ------- | ------------- | ------------------------------------|
| Breaking changes          | Alto    | Média         | Implementação gradual com adapters  |
| Performance degradada     | Médio   | Baixa         | Índices e cache agressivo           |
| Complexidade aumentada    | Médio   | Média         | Documentação extensa                |
| Resistência à mudança     | Baixo   | Baixa         | Manter API compatível               |

## 8. CRONOGRAMA

### Semana 1: Fundação
  ├── TripleStoreManager ✓
  ├── Schemas e Validadores ✓
  └── Extractors básicos ✓

### Semana 2: Unificação
  ├── Refatoração CategoryManager ✓
  ├── Refatoração FileRenderer ✓
  └── InsightGenerator ✓

### Semana 3: Integração
  ├── N8N Exporter ✓
  ├── LangChain Integration ✓
  └── Evolution Connector ✓

### Semana 4: Validação
  ├── Testes integrados ✓
  ├── Documentação ✓
  └── Deploy gradual ✓

## 9. CONCLUSÃO

// Este PRD estabelece um plano claro para:
    9.1. Corrigir o bug fundamental de arquitetura (fontes desconectadas)
    9.2. Implementar inteligência real através de triplas semânticas
    9.3. Maximizar componentização para manutenibilidade
    9.4. Garantir integração com todo o ecossistema

---
O sistema resultante não apenas organiza, mas aprende, correlaciona e automatiza, cumprindo a visão original do Knowledge Consolidator.
---
