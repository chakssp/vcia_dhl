# ADR-001: Arquitetura de Triplas Semânticas

## Status
Aceito

## Contexto
O sistema Knowledge Consolidator possui três fontes de dados desconectadas:
1. CategoryManager - Define categorias
2. AnalysisTypes - Define tipos de análise
3. FileRenderer - Aplica classificações

Estas fontes operam independentemente, resultando em:
- Perda de inteligência e correlações
- Ausência de aprendizado do sistema
- Curadoria humana não efetiva
- Sistema funciona apenas como organizador, não como inteligência

## Decisão
Implementar um sistema unificado baseado em triplas semânticas usando o modelo Legado-Presente-Objetivo:
- **Legado (KEY_SYS.R)**: O que já existe, base histórica
- **Presente (KEY_SUB.R)**: Estado/contexto atual
- **Objetivo (KEY_ACT.R)**: Meta/ação desejada

### Componentes Principais:
1. **TripleStoreManager**: Gerenciador central de triplas
2. **TripleSchema**: Definições e validações semânticas
3. **RelationshipExtractor**: Extração automática de relacionamentos

## Consequências

### Positivas:
- Sistema unificado com fonte única de verdade
- Aprendizado contínuo através de correlações
- Insights acionáveis para automação (N8N, LangChain, Evolution API)
- Curadoria humana efetiva com feedback loop
- Base preparada para busca semântica e IA

### Negativas:
- Complexidade adicional inicial
- Necessidade de migração de dados existentes
- Curva de aprendizado para desenvolvedores
- Overhead de processamento para manter índices

### Impacto Técnico:
- Memória: ~2-5MB para 10k triplas
- Performance: <100ms para buscas com índices
- Storage: Uso de localStorage com compressão
- Compatibilidade: Mantida através de adaptadores

## Implementação
### Fase 1: Fundação (1 semana)
- [x] TripleStoreManager.js
- [x] TripleSchema.js
- [x] RelationshipExtractor.js

### Fase 2: Unificação (1 semana)
- [ ] Refatorar CategoryManager
- [ ] Refatorar FileRenderer
- [ ] Criar InsightGeneratorAI

### Fase 3: Integração (1 semana)
- [ ] N8NExporter
- [ ] LangChainIntegration
- [ ] EvolutionAPIConnector

## Referências
- PRD: /docs/lpo/prd-lpo.md
- LEIS do Projeto: /CLAUDE.md
- Documentação de Eventos: /docs/INSTRUCOES-EVENTOS-SISTEMA.md