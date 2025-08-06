

```mermaid

graph TB
    %% Estilos
    classDef etapa fill:#3b82f6,stroke:#1e40af,stroke-width:2px,color:#fff
    classDef manager fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef storage fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef service fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff
  
    %% ETAPA 1: DESCOBERTA
    subgraph E1["🔍 ETAPA 1: DESCOBERTA"]
        U1[/"👤 Usuário seleciona diretórios"/]
        DM[DiscoveryManager]:::manager
        HM[HandleManager]:::manager
        FS[File System Access API]:::service
        U1 --> DM
        DM --> FS
        FS --> HM
    end
  
    %% ETAPA 2: PRÉ-ANÁLISE
    subgraph E2["📊 ETAPA 2: PRÉ-ANÁLISE"]
        FM[FilterManager]:::manager
        PU[PreviewUtils]:::service
        FR[FileRenderer]:::manager
        FM --> PU
        PU --> FR
    end
  
    %% ETAPA 3: ANÁLISE IA
    subgraph E3["🤖 ETAPA 3: ANÁLISE IA"]
        AM[AnalysisManager]:::manager
        AI[AIAPIManager]:::manager
        PM[PromptManager]:::manager
        LLM[/"Ollama/OpenAI/etc"/]:::service
        AM --> PM
        PM --> AI
        AI --> LLM
    end
  
    %% ETAPA 4: ORGANIZAÇÃO
    subgraph E4["📁 ETAPA 4: ORG"]
        CM[CategoryManager]:::manager
        REM[RAGExportManager]:::manager
        ES[EmbeddingService]:::service
        QS[QdrantService]:::service
        CM --> REM
        REM --> ES
        ES --> QS
    end
  
    %% ARMAZENAMENTO CENTRAL
    AS[AppState]:::storage
    SC[SessionCache]:::storage
    LS[localStorage]:::storage
    IDB[IndexedDB]:::storage
    
    %% FLUXOS ENTRE ETAPAS
    HM -->|"files[]"| AS
    AS -->|"files[]"| FM
    FR -->|"relevanceScore"| AS
    AS -->|"filtered files"| AM
    LLM -->|"analysisType"| AM
    AM -->|"analyzed=true"| AS
    AS -->|"analyzed files"| CM
    QS -->|"inQdrant=true"| AS

    %% CONEXÕES COM STORAGE
    AS <--> LS
    AS --> SC
    ES --> IDB

    %% EVENTOS
    EB{{EventBus}}:::service
    DM -.->|"FILES_DISCOVERED"| EB
    FM -.->|"FILTERS_CHANGED"| EB
    AM -.->|"ANALYSIS_COMPLETED"| EB
    CM -.->|"CATEGORIES_CHANGED"| EB
    EB -.->|"Notifica componentes"| FR
    EB -.->|"Notifica componentes"| AS

```

---
## 🔄 PIPELINE DE INTEGRAÇÃO IA CORRIGIDO
### REGEX
```mermaid

  graph TB
      %% Estilos
      classDef broken fill:#ef4444,stroke:#dc2626,color:#fff
      classDef fixed fill:#10b981,stroke:#059669,color:#fff
      classDef ai fill:#8b5cf6,stroke:#7c3aed,color:#fff
      classDef human fill:#f59e0b,stroke:#d97706,color:#fff
      classDef feedback fill:#3b82f6,stroke:#2563eb,color:#fff

      %% ETAPA 1: DESCOBERTA
      subgraph E1["🔍 ETAPA 1: DESCOBERTA INTELIGENTE"]
          D1[Descoberta de Arquivos]
          D2[Cálculo de Relevância]:::fixed
          D3[("Relevância + Contexto")]:::fixed
      end

      %% ETAPA 2: PRÉ-ANÁLISE SEMÂNTICA
      subgraph E2["📊 ETAPA 2: PRÉ-ANÁLISE"]
          P1[Preview Inteligente<br/>5 Segmentos]:::fixed
          P2[Análise Estruturada]:::fixed
          P3[("Preview + Relevância")]:::fixed
      end

      %% CURADORIA HUMANA
      subgraph CH["👤 CURADORIA HUMANA"]
          C1[Categorização Manual]:::human
          C2[("Ground Truth")]:::human
          C3[Boost Relevância<br/>1.5 + n×0.1]:::fixed
      end

      %% ETAPA 3: ANÁLISE IA
      subgraph E3["🤖 ETAPA 3: ANÁLISE IA"]
          A1[Ollama/LLMs]:::ai
          A2[Análise Contextual<br/>com Relevância]:::fixed
          A3[Validação por<br/>Ground Truth]:::fixed
      end

      %% SISTEMA SEMÂNTICO
      subgraph SS["🧠 SISTEMA SEMÂNTICO"]
          S1[EmbeddingService<br/>+ Contexto]:::fixed
          S2[Similaridade<br/>Semântica]:::fixed
          S3[Extração de<br/>Triplas Reais]:::fixed
      end

      %% ETAPA 4: ORGANIZAÇÃO
      subgraph E4["📁 ETAPA 4: QDRANT"]
          Q1[Threshold 0 para<br/>Categorizados]:::fixed
          Q2[Embeddings<br/>Enriquecidos]:::fixed
          Q3[Base Vetorial<br/>Validada]:::fixed
      end

      %% SISTEMA DE FEEDBACK
      subgraph FB["♻️ FEEDBACK LOOP"]
          F1[Aprendizado<br/>Contínuo]:::feedback
          F2[Ajuste de<br/>Embeddings]:::feedback
          F3[Melhoria de<br/>Relevância]:::feedback
      end

      %% FLUXO PRINCIPAL
      D1 --> D2 --> D3
      D3 --> P1
      P1 --> P2 --> P3

      %% CURADORIA PARALELA
      P3 --> C1
      C1 --> C2
      C2 --> C3
      C3 -.->|Boost| D2

      %% FLUXO PARA IA
      P3 --> A1
      C2 --> A3
      A1 --> A2
      A2 --> A3

      %% SISTEMA SEMÂNTICO
      A3 --> S1
      P2 -.->|Segmentos| S1
      C2 -.->|Validação| S2
      S1 --> S2
      S2 --> S3

      %% PARA QDRANT
      S3 --> Q1
      C1 -.->|Threshold 0| Q1
      Q1 --> Q2
      Q2 --> Q3

      %% FEEDBACK LOOPS
      Q3 --> F1
      F1 --> F2
      F2 --> F3
      F3 -.->|Ajusta| S1
      F3 -.->|Melhora| D2
      A3 -.->|Retroalimenta| F1

      %% INDICADORES DE CORREÇÃO
      D2 -.- N1{{"✅ Relevância passa<br/>para IA"}}
      C2 -.- N2{{"✅ Categorias como<br/>Ground Truth"}}
      P2 -.- N3{{"✅ Preview<br/>Estruturado"}}
      S3 -.- N4{{"✅ Embeddings<br/>Semânticos"}}
      F1 -.- N5{{"✅ Sistema<br/>Aprende"}}
      
```

## 🔄 PIPELINE SEMÂNTICO COM SCHEMA.ORG
### Semantico com Schema.org
```mermaid

  graph TB
      %% Estilos
      classDef human fill:#f59e0b,stroke:#d97706,color:#fff
      classDef schema fill:#8b5cf6,stroke:#7c3aed,color:#fff
      classDef semantic fill:#10b981,stroke:#059669,color:#fff
      classDef cache fill:#3b82f6,stroke:#2563eb,color:#fff
      classDef hybrid fill:#ef4444,stroke:#dc2626,color:#fff
      classDef knowledge fill:#14b8a6,stroke:#0d9488,color:#fff

      %% ETAPA 1: DESCOBERTA E CURADORIA
      subgraph E1["🔍 DESCOBERTA + CURADORIA HUMANA"]
          D1[Arquivos Descobertos]
          D2[Usuário clica<br/>'Analisar com IA']:::human
          D3[Sistema detecta<br/>analysisType]:::human
          D4{{"5 Tipos de Análise<br/>• Breakthrough Técnico<br/>• Evolução Conceitual<br/>• Momento Decisivo<br/>• Insight Estratégico<br/>• Aprendizado Geral"}}:::human      
      end

      %% ETAPA 2: MAPEAMENTO SCHEMA.ORG
      subgraph E2["🔮 TRANSFORMAÇÃO SCHEMA.ORG"]
          S1[SchemaOrgMapper]:::schema
          S2[["Mapeamento Semântico<br/>━━━━━━━━━━━━━━━━<br/>Breakthrough → TechArticle<br/>Evolução → ScholarlyArticle<br/>Momento → Event<br/>Insight →
  Report<br/>Aprendizado → Article"]]:::schema
          S3[Propriedades Ricas<br/>author, mentions,<br/>potentialAction,<br/>dependencies]:::schema
      end

      %% ETAPA 3: EXTRAÇÃO SEMÂNTICA
      subgraph E3["🧠 EXTRAÇÃO DE ENTIDADES"]
          EX1[SchemaOrgExtractor]:::semantic
          EX2[Entidades Tipadas<br/>Person, Organization,<br/>Technology, Concept]:::semantic
          EX3[Relações Contextualizadas<br/>isBasedOn, mentions,<br/>teaches, requires]:::semantic
          EX4[Embeddings Enriquecidos<br/>com Contexto Schema.org]:::semantic
      end

      %% SISTEMA HÍBRIDO
      subgraph SH["⚡ SISTEMA HÍBRIDO"]
          H1{Query Router}:::hybrid
          H2["Regex Engine<br/>15-50ms<br/>65% precisão"]:::hybrid
          H3["Schema.org Engine<br/>8-15ms (cached)<br/>89% precisão"]:::hybrid
          H4[["Cache 3 Camadas<br/>━━━━━━━━━━━<br/>L1: Memória<br/>L2: IndexedDB<br/>L3: Redis"]]:::cache
      end

      %% ETAPA 4: INDEXAÇÃO E BUSCA
      subgraph E4["📊 QDRANT + QUERIES SEMÂNTICAS"]
          Q1[Índices Schema.org<br/>@type, author.name,<br/>mentions.technology]:::semantic
          Q2[["Queries Impossíveis Antes<br/>━━━━━━━━━━━━━━━━━<br/>'TechArticles sobre Redis<br/>com potentialAction'<br/><br/>'Events de 2024 com<br/>result
  positivo'"]]:::semantic
          Q3[Resultados Rankeados<br/>por Relevância Semântica]:::semantic
      end

      %% ETAPA 5: GRAFO DE CONHECIMENTO
      subgraph E5["🌐 GRAFO DE CONHECIMENTO REAL"]
          G1[Clusters por @type]:::knowledge
          G2[Entidades Interconectadas]:::knowledge
          G3[Navegação Semântica<br/>não apenas visual]:::knowledge
          G4[Export JSON-LD<br/>Interoperável]:::knowledge
      end

      %% FLUXO PRINCIPAL
      D1 --> D2 --> D3 --> D4
      D4 --> S1
      S1 --> S2 --> S3
      S3 --> EX1
      EX1 --> EX2
      EX2 --> EX3
      EX3 --> EX4

      %% ROTEAMENTO HÍBRIDO
      EX4 --> H1
      H1 -->|"Simples"| H2
      H1 -->|"Complexa"| H3
      H2 --> H4
      H3 --> H4
      H4 --> Q1

      %% INDEXAÇÃO E VISUALIZAÇÃO
      Q1 --> Q2 --> Q3
      Q3 --> G1 --> G2 --> G3 --> G4

      %% FEEDBACK LOOPS
      G4 -.->|"Aprendizado"| S1
      Q3 -.->|"Métricas"| H1
      EX4 -.->|"Ground Truth"| S2

      %% DESTAQUES DE TRANSFORMAÇÃO
      D4 -.- T1{{"🔄 TRANSFORMAÇÃO 1<br/>Curadoria humana<br/>vira marca de<br/>qualidade semântica"}}
      S2 -.- T2{{"🔄 TRANSFORMAÇÃO 2<br/>Types genéricos viram<br/>ontologia Schema.org<br/>padronizada"}}
      EX3 -.- T3{{"🔄 TRANSFORMAÇÃO 3<br/>Regex patterns viram<br/>entidades e relações<br/>estruturadas"}}
      Q2 -.- T4{{"🔄 TRANSFORMAÇÃO 4<br/>Busca por palavras<br/>vira queries<br/>semânticas ricas"}}
      G3 -.- T5{{"🔄 TRANSFORMAÇÃO 5<br/>Visualização estática<br/>vira grafo navegável<br/>de conhecimento"}}
```

## ● 🔄 PIPELINE SEMÂNTICO
###  CICLO DE REFINAMENTO REGEX + CURADORIA + SCHEMA.ORG

```mermaid
  graph TB
      %% Estilos
      classDef initial fill:#fbbf24,stroke:#f59e0b,color:#000
      classDef human fill:#f59e0b,stroke:#d97706,color:#fff
      classDef refined fill:#10b981,stroke:#059669,color:#fff
      classDef schema fill:#8b5cf6,stroke:#7c3aed,color:#fff
      classDef converged fill:#14b8a6,stroke:#0d9488,color:#fff
      classDef metric fill:#ef4444,stroke:#dc2626,color:#fff

      %% DESCOBERTA E ANÁLISE INICIAL
      subgraph INICIAL["📊 ANÁLISE INICIAL (v1)"]
          I1[Arquivo Descoberto]
          I2[Clique 'Analisar com IA']:::initial
          I3[["analysisType Automático<br/>━━━━━━━━━━━━━━<br/>Confiança: 65%<br/>Pode ser impreciso"]]:::initial
          I4[Schema.org Tentativo<br/>TechArticle?]:::initial
      end

      %% CURADORIA HUMANA
      subgraph CURADORIA["👤 CURADORIA HUMANA"]
          C1[Usuário avalia resultado]:::human
          C2{Adiciona Categorias<br/>Manuais}:::human
          C3[["Categorias como<br/>Ground Truth<br/>━━━━━━━━━━━<br/>• Estratégia<br/>• IA/ML<br/>• Decisões"]]:::human
          C4[Clique 'Analisar<br/>com IA' NOVAMENTE]:::human
      end

      %% ANÁLISE REFINADA
      subgraph REFINADA["🎯 ANÁLISE REFINADA (v2+)"]
          R1[["Contexto Enriquecido<br/>━━━━━━━━━━━━━<br/>+ Categorias manuais<br/>+ Histórico v1<br/>+ Keywords inferidas<br/>+ Consulta QDRANT"]]:::refined
          R2[USA IA Embbeding<br/>para validar/ajustar]:::refined
          R3[["analysisType Refinado<br/>━━━━━━━━━━━━━━<br/>Confiança: 92%<br/>Mais preciso"]]:::refined
          R4[Schema.org Validado<br/>StrategicDocument!]:::refined
      end

      %% CONVERGÊNCIA
      subgraph CONVERGENCIA["✅ CONVERGÊNCIA"]
          CV1{Medir<br/>Convergência}:::converged
          CV2[["Score Convergência<br/>━━━━━━━━━━━<br/>typeStability: 1.0<br/>confidenceDelta: 0.92<br/>schemaStability: 1.0"]]:::converged
          CV3{Convergiu?<br/>>85%}:::converged
          CV4[analysisType<br/>DEFINITIVO]:::converged
          CV5[Schema.org<br/>ESTABELECIDO]:::converged
      end

      %% MÉTRICAS E HISTÓRICO
      subgraph METRICAS["📈 MÉTRICAS DO CICLO"]
          M1[["Histórico de Análises<br/>━━━━━━━━━━━━━<br/>v1: Breakthrough (65%)<br/>v2: Insight (85%)<br/>v3: Insight (92%)<br/>✓ Convergido"]]:::metric
          M2[Média: 2.3 iterações<br/>para convergir]:::metric
          M3[Ganho: +27%<br/>confiança]:::metric
      end

      %% INTEGRAÇÃO SCHEMA.ORG
      subgraph SCHEMA["🔮 SCHEMA.ORG DEFINITIVO"]
          S1[SchemaOrgMapper<br/>Enriquecido]:::schema
          S2[["Entidade Final<br/>━━━━━━━━━━━<br/>@type: StrategicDocument<br/>confidence: 0.92<br/>categories: [3]<br/>iterations: 3"]]:::schema
          S3[Propriedades Validadas<br/>por Curadoria]:::schema
      end

      %% FLUXO PRINCIPAL
      I1 --> I2 --> I3 --> I4
      I4 --> C1
      C1 --> C2 --> C3 --> C4
      C4 --> R1
      R1 --> R2 --> R3 --> R4
      R4 --> CV1
      CV1 --> CV2 --> CV3

      %% LOOP DE REFINAMENTO
      CV3 -->|"NÃO<br/><85%"| C1
      CV3 -->|"SIM<br/>≥85%"| CV4
      CV4 --> CV5
      CV5 --> S1
      S1 --> S2 --> S3

      %% MÉTRICAS PARALELAS
      I3 -.-> M1
      R3 -.-> M1
      CV2 -.-> M1
      M1 --> M2 --> M3

      %% DESTAQUES
      C3 -.- D1{{"💡 INSIGHT CHAVE<br/>Categorias manuais<br/>viram contexto rico<br/>para re-análise"}}
      R2 -.- D2{{"🔄 REFINAMENTO<br/>IA aprende com<br/>curadoria humana<br/>e melhora precisão"}}
      CV3 -.- D3{{"📊 CONVERGÊNCIA<br/>Sistema detecta quando<br/>análise estabilizou<br/>(média 2-3 iterações)"}}
      S2 -.- D4{{"✨ RESULTADO<br/>Schema.org definitivo<br/>validado por humano<br/>e máquina"}}
```