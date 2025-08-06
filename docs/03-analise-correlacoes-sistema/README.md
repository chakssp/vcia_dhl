# 🔄 Análise de Correlações do Sistema

Esta pasta contém análises profundas sobre as **correlações desconectadas** entre componentes do sistema.

## 🎯 Objetivo Principal
Identificar e documentar quebras nas correlações entre fontes de verdade, propondo soluções para criar um pipeline semântico verdadeiro.

## 📄 Documentos Principais

### Análises Críticas
- `ANALISE-CORRELACOES.md` - **DOCUMENTO CENTRAL** com 5 quebras críticas identificadas
- `ANALISE-PROBLEMAS-DUPLICACAO.md` - Problemas de sincronização e duplicação
- `FONTES-UNICAS-VERDADE.md` - Definição de Single Source of Truth (SSO)

### Fluxos e Mapeamentos
- `FLUXO-DADOS-ETAPAS.md` - Como dados fluem entre as 4 etapas
- `MAPEAMENTO-COMPLETO-FONTES-VERDADE.md` - Mapa completo de fontes

### Plano de Ação
- `README-EVOLUCAO-SISTEMA.md` - Roadmap de evolução em 3 fases

## 🚨 Problemas Críticos Identificados
1. Relevância não influencia embeddings
2. Categorias isoladas do sistema semântico
3. Preview inteligente subutilizado
4. RelationshipExtractor usa apenas regex
5. Análise IA não retroalimenta

## 🔍 Como Referenciar
```
@03-analise-correlacoes-sistema/ANALISE-CORRELACOES.md
```