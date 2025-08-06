

● 🎯 VISUALIZAÇÃO DOS FLUXOS DE TRABALHO

  Entendi perfeitamente! Vou criar os diagramas Mermaid para visualizar os fluxos de trabalho em ondas (waves) do sistema:

  📊 FLUXO COMPLETO - VISÃO GERAL
```mermaid

  graph TB
      subgraph "🌊 WAVE 1 - ONBOARDING INICIAL"
          A1[📥 INPUT DATA] --> B1[👤 CURADORIA HUMANA]
          B1 --> C1[🧠 EMBEDDINGS]
          C1 --> D1[💾 QDRANT PAYLOAD 1]
          D1 --> E1[🤖 ANÁLISE OLLAMA]
          E1 --> F1[💡 INSIGHTS DIA 0]
          F1 --> G1[📚 BASE CONHECIMENTO v1]
          G1 --> H1[➡️ WAVE 2]
      end

      subgraph "🌊 WAVE 2 - ENRIQUECIMENTO SEMÂNTICO"
          H1 --> A2[📥 INPUT DATA WAVE 2]
          A2 --> B2[👤 CURADORIA]
          B2 --> C2[🧠 EMBEDDINGS]
          C2 --> D2[💾 QDRANT PAYLOAD 2]
          D2 --> E2[🔍 DEDUPLICATION]
          E2 --> F2[🔗 TRIPLAS SEMÂNTICAS]
          F2 --> G2[📚 BASE CONHECIMENTO v2]
          G2 --> H2[➡️ WAVE 3]
      end

      subgraph "🔄 WAVE 3+ - CALIBRAÇÃO CONTÍNUA"
          H2 --> A3[🔍 REVIEW INSIGHTS]
          A3 --> B3[⚙️ CALIBRATE]
          B3 --> C3[🎯 REFINE EMBEDDINGS]
          C3 --> D3[💾 UPDATE QDRANT]
          D3 --> E3[📊 ANALYTICS]
          E3 --> F3[📚 BASE CONHECIMENTO v3+]
          F3 -.->|Feedback Loop| A3
      end

      style A1 fill:#e1f5fe
      style A2 fill:#e1f5fe
      style A3 fill:#fff3e0
      style F1 fill:#c8e6c9
      style F2 fill:#c8e6c9
      style F3 fill:#c8e6c9
```
  
  🌊 WAVE 1 - ONBOARDING DETALHADO
```mermaid
  flowchart LR
      subgraph "INPUT"
          I1[📁 Arquivos Raw]
          I2[📝 Metadados]
          I3[🏷️ Tags Iniciais]
      end

      subgraph "CURADORIA"
          C1[Filtros Relevância]
          C2[Categorização Manual]
          C3[Validação Humana]
      end

      subgraph "EMBEDDINGS"
          E1[ChunkingUtils]
          E2[EmbeddingService]
          E3[Cache IndexedDB]
      end

      subgraph "QDRANT"
          Q1[Collection: wave_1]
          Q2[Vectors: 768D]
          Q3[Metadata: categories]
      end

      subgraph "OLLAMA"
          O1[Análise Contextual]
          O2[Extração Patterns]
          O3[Score Relevância]
      end

      subgraph "INSIGHTS DIA 0"
          IN1[Momentos Decisivos]
          IN2[Breakthrough Técnico]
          IN3[Aprendizados Gerais]
      end

      I1 & I2 & I3 --> C1 & C2 & C3
      C1 & C2 & C3 --> E1
      E1 --> E2 --> E3
      E2 --> Q1 & Q2 & Q3
      Q1 --> O1 & O2 & O3
      O1 & O2 & O3 --> IN1 & IN2 & IN3
      IN1 & IN2 & IN3 --> BASE1[📚 Knowledge Base v1]
```

  🌊 WAVE 2 - ENRIQUECIMENTO SEMÂNTICO

```mermaid
  flowchart TB
      subgraph "ENTRADA WAVE 2"
          W2_IN[📚 Base v1 + Novos Dados]
      end

      subgraph "PROCESSAMENTO"
          W2_CUR[👤 Curadoria Wave 2]
          W2_EMB[🧠 Embeddings Enriquecidos]
          W2_QDR[💾 Qdrant Payload 2]
      end

      subgraph "DEDUPLICAÇÃO"
          DED1[Similaridade > 95%]
          DED2[Merge Metadados]
          DED3[Preservar Melhor]
      end

      subgraph "TRIPLAS SEMÂNTICAS"
          T1[SimilaritySearchService]
          T2[Vizinhos Semânticos]
          T3[LLM Inference]
          T4[Triplas RDF]
      end

      subgraph "RESULTADO"
          R1[Sujeito → Predicado → Objeto]
          R2[Confidence Score]
          R3[Categoria Validada]
      end

      W2_IN --> W2_CUR --> W2_EMB --> W2_QDR
      W2_QDR --> DED1 --> DED2 --> DED3
      DED3 --> T1 --> T2 --> T3 --> T4
      T4 --> R1 & R2 & R3
      R1 & R2 & R3 --> BASE2[📚 Knowledge Base v2]
```

  🔄 REVIEW & CALIBRATION - LOOP CONTÍNUO

```mermaid
  flowchart LR
      subgraph "REVIEW INSIGHTS"
          REV1[📊 Analytics Dashboard]
          REV2[🎯 Accuracy Metrics]
          REV3[👤 Human Feedback]
      end

      subgraph "CALIBRATE"
          CAL1[Ajustar Thresholds]
          CAL2[Refinar Prompts]
          CAL3[Update Categories]
      end

      subgraph "REFINE"
          REF1[Re-embedding]
          REF2[Re-clustering]
          REF3[Re-ranking]
      end

      subgraph "UPDATE"
          UPD1[Qdrant Update]
          UPD2[Model Fine-tune]
          UPD3[Rules Engine]
      end

      REV1 & REV2 & REV3 --> CAL1 & CAL2 & CAL3
      CAL1 & CAL2 & CAL3 --> REF1 & REF2 & REF3
      REF1 & REF2 & REF3 --> UPD1 & UPD2 & UPD3
      UPD1 & UPD2 & UPD3 --> NEXT[📚 Knowledge Base v3+]
      NEXT -.->|Continuous Loop| REV1
```
  
  🏗️ ARQUITETURA TÉCNICA - COMPONENTES POR WAVE

```mermaid
  graph TD
      subgraph "COMPONENTES WAVE 1"
          CW1[DiscoveryManager]
          CW2[FilterManager]
          CW3[CategoryManager]
          CW4[AnalysisManager]
          CW5[EmbeddingService]
          CW6[QdrantService]
      end

      subgraph "COMPONENTES WAVE 2"
          CW7[SimilaritySearchService]
          CW8[DeduplicationService]
          CW9[SemanticTripleExtractor]
          CW10[RelationshipValidator]
      end

      subgraph "COMPONENTES WAVE 3+"
          CW11[InsightReviewService]
          CW12[CalibrationEngine]
          CW13[FeedbackCollector]
          CW14[MetricsAnalyzer]
      end

      CW1 --> CW2 --> CW3 --> CW4
      CW4 --> CW5 --> CW6
      CW6 --> CW7 --> CW8
      CW8 --> CW9 --> CW10
      CW10 --> CW11 --> CW12
      CW12 --> CW13 --> CW14
      CW14 -.->|Feedback| CW1
```
  
  💡 INSIGHTS DO FLUXO

  1. WAVE 1: Foco em captura e categorização inicial
  2. WAVE 2: Enriquecimento semântico e deduplicação
  3. WAVE 3+: Refinamento contínuo baseado em feedback

  Este fluxo permite evolução incremental da base de conhecimento, com cada wave construindo sobre a anterior, criando um sistema cada vez mais inteligente e preciso.
  