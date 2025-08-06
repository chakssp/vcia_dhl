# PLANO DE RECUPERAÇÃO DO PROJETO - INTEGRAÇÃO QDRANT
**Data**: 25/07/2025  
**Status**: 🔴 CRÍTICO - Sistema não utiliza conhecimento curado  
**Objetivo**: Implementar fluxo correto de curadoria → embeddings → Qdrant → consultas estratégicas

## RESUMO EXECUTIVO

O sistema atual gera payloads na Etapa 4 mas **não os utiliza**. Este plano corrige o fluxo para que a curadoria humana alimente o Qdrant, permitindo consultas estratégicas complexas sobre a evolução do conhecimento.

---

## FASE 1: CORREÇÕES CRÍTICAS IMEDIATAS (2-3 horas)

### 1.1 Corrigir Erro "context is not defined"
**Arquivo**: `/js/components/FileRenderer.js` (linha 640)  
**Atividade**: 
- Corrigir referência à variável `context` inexistente
- Usar `refinementContext` que já está definido

**Entregável**: FileRenderer funcionando sem erros no console  
**Validação**: Clicar em "Analisar" não gera erro

### 1.2 Implementar método _detectAnalysisType()
**Arquivo**: `/js/managers/AnalysisAdapter.js` (linhas 454, 473)  
**Atividade**:
- Implementar método faltante
- Usar triggers do PRD original, não detecção genérica
- Delegar para AnalysisTypesManager

**Entregável**: Método implementado usando fonte única de verdade  
**Validação**: Console não mostra erro de método undefined

### 1.3 Remover Duplicação de Fonte de Verdade
**Arquivo**: `/js/components/FileRenderer.js`  
**Atividade**:
- Remover método `detectAnalysisType()` duplicado
- Usar apenas `AnalysisTypesManager.detectType()`

**Entregável**: Uma única fonte de verdade para tipos  
**Validação**: Buscar por "detectAnalysisType" retorna apenas AnalysisTypesManager

---

## FASE 2: POPULAR QDRANT COM DADOS CURADOS (3-4 horas)

### 2.1 Criar Método de Carga no Qdrant
**Arquivo**: `/js/components/OrganizationPanel.js`  
**Atividade**:
- Adicionar botão "Enviar para Qdrant" na Etapa 4
- Implementar método `sendToQdrant()` que:
  - Pega arquivos aprovados
  - Gera embeddings via EmbeddingService
  - Envia para QdrantService com metadata curada

**Entregável**: Botão funcional que popula Qdrant  
**Validação**: 
- Clicar no botão mostra progresso
- QdrantService.getCollectionStats() mostra pontos aumentando

### 2.2 Verificar Conectividade Qdrant
**Atividade**:
- Confirmar acesso a http://qdr.vcia.com.br:6333
- Criar collection "knowledge_base" se não existir
- Configurar schema correto (384 dimensões)

**Entregável**: Qdrant acessível e configurado  
**Validação**: 
```javascript
KC.QdrantService.checkConnection() // retorna true
KC.QdrantService.getCollectionInfo() // mostra config correta
```

### 2.3 Popular com Dados Históricos
**Atividade**:
- Processar todos arquivos já curados (com categorias)
- Gerar embeddings e enviar ao Qdrant
- Incluir metadata: analysisType, categories, date, relevance

**Entregável**: Base de conhecimento populada  
**Validação**: Qdrant contém todos arquivos curados com metadata

---

## FASE 3: USAR QDRANT NA ANÁLISE (2-3 horas)

### 3.1 Modificar FileRenderer.analyzeFile()
**Arquivo**: `/js/components/FileRenderer.js`  
**Atividade**:
- Remover chamada para AnalysisManager
- Implementar fluxo:
  1. Gerar embedding do arquivo
  2. Buscar similares no Qdrant
  3. Determinar tipo baseado em vizinhos
  4. Se tem categorias, usar como ground truth

**Entregável**: Análise usando busca semântica  
**Validação**: 
- Console mostra "🔍 Buscando similares no Qdrant"
- Tipos determinados correspondem aos vizinhos

### 3.2 Ajustar Análise em Lote
**Arquivo**: `/js/components/FileRenderer.js` (método analyzeAll)  
**Atividade**:
- Aplicar mesmo fluxo da análise individual
- Processar em batches para performance
- Mostrar progresso detalhado

**Entregável**: Análise em massa usando Qdrant  
**Validação**: "Analisar Todos" usa busca semântica

---

## FASE 4: INTERFACE DE CONSULTAS ESTRATÉGICAS (4-5 horas)

### 4.1 Criar Modal de Consultas
**Arquivo**: Novo componente `QueryInterface.js`  
**Atividade**:
- Modal com campo de pergunta
- Exemplos de perguntas estratégicas
- Botão "Consultar Base de Conhecimento"

**Entregável**: Interface para fazer perguntas  
**Validação**: Modal abre e aceita perguntas

### 4.2 Implementar QueryService
**Arquivo**: Novo `/js/services/QueryService.js`  
**Atividade**:
- Processar pergunta do usuário
- Extrair contexto temporal (últimos 6 meses, etc)
- Buscar documentos relevantes no Qdrant
- Montar contexto curado
- Enviar para LLM com contexto

**Entregável**: Serviço que responde perguntas complexas  
**Validação**: Perguntas retornam respostas baseadas na curadoria

### 4.3 Adicionar Botão na Interface Principal
**Atividade**:
- Botão "💡 Fazer Pergunta Estratégica" no header
- Só aparece quando há dados no Qdrant
- Abre modal de consultas

**Entregável**: Acesso fácil às consultas  
**Validação**: Botão visível e funcional

---

## FASE 5: OTIMIZAÇÃO E REFINAMENTO (2-3 horas)

### 5.1 Cache de Embeddings
**Atividade**:
- Verificar se CacheService está cacheando embeddings
- Implementar cache de buscas no Qdrant
- TTL apropriado para não perder atualizações

**Entregável**: Performance otimizada  
**Validação**: Segunda busca é instantânea

### 5.2 Feedback Visual
**Atividade**:
- Mostrar "fonte" da classificação (vizinhos encontrados)
- Indicar confiança baseada em similaridade
- Destacar arquivos que influenciaram a decisão

**Entregável**: Transparência no processo  
**Validação**: Usuário entende por que arquivo recebeu determinado tipo

### 5.3 Documentação de Uso
**Arquivo**: `/docs/guia-consultas-estrategicas.md`  
**Atividade**:
- Exemplos de perguntas poderosas
- Como interpretar resultados
- Melhores práticas de curadoria

**Entregável**: Guia para usuário final  
**Validação**: Documento claro e útil

---

## MARCOS DE VALIDAÇÃO

### Marco 1 (Fim da Fase 1): Sistema Sem Erros
- [ ] Sem erros no console
- [ ] Análise individual funciona
- [ ] Uma fonte de verdade para tipos

### Marco 2 (Fim da Fase 2): Qdrant Populado
- [ ] Qdrant contém arquivos curados
- [ ] Metadata preservada (categorias, tipos)
- [ ] Stats mostram dados carregados

### Marco 3 (Fim da Fase 3): Análise Semântica
- [ ] Novos arquivos classificados por similaridade
- [ ] Categorias como ground truth respeitadas
- [ ] Não usa mais AnalysisManager/Ollama direto

### Marco 4 (Fim da Fase 4): Consultas Funcionais
- [ ] Perguntas estratégicas respondidas
- [ ] Contexto curado usado nas respostas
- [ ] Evolução temporal identificada

### Marco 5 (Fim da Fase 5): Sistema Otimizado
- [ ] Cache funcionando
- [ ] Feedback visual claro
- [ ] Documentação completa

---

## TEMPO TOTAL ESTIMADO

- **Fase 1**: 2-3 horas
- **Fase 2**: 3-4 horas  
- **Fase 3**: 2-3 horas
- **Fase 4**: 4-5 horas
- **Fase 5**: 2-3 horas

**TOTAL**: 13-18 horas de desenvolvimento focado

---

## RISCOS E MITIGAÇÕES

### Risco 1: Qdrant não acessível
**Mitigação**: Verificar conectividade primeiro, ter plano B com armazenamento local

### Risco 2: Performance com muitos arquivos
**Mitigação**: Processar em batches, implementar paginação

### Risco 3: Embeddings inconsistentes
**Mitigação**: Usar sempre mesmo modelo (nomic-embed-text)

---

## CRITÉRIO DE SUCESSO FINAL

Poder fazer a pergunta: **"Quais assuntos foram mais explorados e quais evoluíram como parte do conhecimento adquirido nos últimos seis meses?"** e receber uma resposta baseada na curadoria humana acumulada, não em análise genérica.

---

**IMPORTANTE**: Este plano foca em FAZER O SISTEMA FUNCIONAR, não em criar páginas de teste. Cada entregável é uma funcionalidade real integrada ao sistema principal.