# 0. Analise de Exportação de Inteligência

## Investigar
⚠️ Itens sob investigação para melhorar a exportação de inteligência:

### 3.3 configuration.aiAnalysis (Análise IA)
🔑 KEY_SYS.R: `?`
🔑 KEY_SUB.R: `?`
🔑 KEY_ACT.R: `model`, `autoAnalyse`

```json
{
  "model": "claude-sonnet-4",    // Modelo utilizado ⚠️
  "tokenLimit": 8000,            // Limite de tokens por análise
  "customPrompt": "",            // Prompt customizado (se houver)
  "batchSize": 10,               // Tamanho do lote para processamento
  "autoAnalyze": false           // Se análise é automática após descoberta
}
```
### ⚠️Input: Identificar se a fonte dos dados que alimenta esta seção é a mesma que a de `configuration.discovery` e se o modelo é o mesmo que o usado na análise de IA.

### 3.2 configuration.preAnalysis (Pré-Análise)
🔑 KEY_SYS.R: `?`
🔑 KEY_SUB.R: `keywords`
🔑 KEY_ACT.R: `relevanceThreshold`, `previewEnabled`

```json
{
  "keywords": [                  // Keywords base para relevância ⚠️
    "decisão",
    "insight", 
    "transformação",
    "aprendizado",
    "breakthrough"
  ],
  "relevanceThreshold": 50,      // Threshold mínimo de relevância (%)
  "maxResults": 100,             // Limite máximo de resultados
  "sizeFilter": "all",           // Filtro de tamanho: all|small|medium|large
  "previewEnabled": true         // Se preview inteligente está ativo
}
```
### ⚠️Input: Identificar se as keywords impactam na análise de IA e se o threshold é usado para filtrar resultados.
---

### 3.4 configuration.organization (Organização)
🔑 KEY_SYS.R: `category`
🔑 KEY_SUB.R: `?`
🔑 KEY_ACT.R: `autoCategories`

```json
{
  "exportPath": "/Knowledge Consolidation",  // Caminho de exportação
  "structure": "category",                   // Estrutura: category|date|type⚠️
  "autoCategories": true,                    // Categorização automática
  "exportFormats": ["json", "markdown"]      // Formatos de exportação
}
```
### ⚠️Input: Verificar se a estrutura de exportação é consistente com as categorias e se o caminho de exportação é válido.
---

### 3.4.1 configuration.organization.exportPath (Caminho de Exportação)

```json
{
// estrutura de cada arquivo processado
  // === METADADOS ===
  "size": 11529,                            // Tamanho em bytes do arquivo importado
  "lastModified": "2025-06-28T03:44:36.072Z",
  "type": "",                               // MIME type (se identificado) ⚠️
  "extension": ".md",                       // Extensão do arquivo
  "handle": {},
}
```
### ⚠️Input: Verificar se os metadados são consistentes entre a descoberta e a análise de IA, especialmente o tipo MIME e a extensão do arquivo.
---

# 1. Intelligência de Exportação - Contexto
- Itens sob analise para identificar a correlação entre as seções do arquivo `./export-schema-documentation.md` e o arquivo `./export-fields-origin.md`.
- Analisar se as seções estão corretamente alinhadas e se há redundâncias ou inconsistências na lógica do sistema.
- Os dados relacionados a cada sessão entre Categories, Keywords, Classificacao são itens vitais entre a interação do usuário / sistema.
- Ao final da Etapa espera-se que o usuário tenha uma visão clara de como as seções se inter-relacionam e como os dados são utilizados no processo de exportação de inteligência.
- A integração entre este sistema e o Modelo de IA utilizado tem por objetivo otimizar a análise de documentos e a extração de insights relevantes.

## 5. Seção: `Categories` (Definições Globais) 
🔑 KEY_SYS.R: `id`
🔑 KEY_SUB.R: `color`
🔑 KEY_ACT.R: `name`

#### *Padrão do Sistema*
> id: `tech`, `estrategico`, `conceitual`

#### *Incluido pelo Usuário na Interface Web:*
> id: `prompt`, `prd`

```json
[
  {
    "id": "tech",                          // ID interno
    "name": "Momentos Decisivos/Técnicos", // Nome de exibição
    "color": "#3b82f6",                    // Cor hexadecimal
    "count": 0                             // Contagem de uso
  },
  {
    "id": "estrategico",
    "name": "Estratégico",
    "color": "#22c55e",
    "count": 1
  },
  {
    "id": "conceitual",
    "name": "Conceitual",
    "color": "#a855f7",
    "count": 1
  },
  {
    "id": "prompt",
    "name": "PROMPT",                      // Categoria criada pelo usuário
    "color": "#eab308",
    "count": 4
  },
  {
    "id": "prd",
    "name": "PRD",                         // Categoria criada pelo usuário
    "color": "#06b6d4",
    "count": 3
  }
]
```
### ⚠️Input: Permite categorias adicionais criadas pelo usuário.

---
## 8. Seção: Keywords
🔑 KEY_SYS.R: `?`
🔑 KEY_SUB.R: `?`
🔑 KEY_ACT.R: `?`

```json
[]  // Array de keywords adicionais (vazio neste exemplo)
```
### ⚠️Input: Investigar ITEM CHAVE: `?` para entender como as keywords são utilizadas no sistema e se há necessidade de ajustes.
---

## 9. Classificacao
🔑 KEY_SYS.R: `categoryId`
🔑 KEY_SUB.R: `keywords`
🔑 KEY_ACT.R: `name`

Tipos de Análise Automática (`analysisType` | `AnalysisTypes.js`)

### ⚠️Input: **`Classificacao Rapida`**

### 9.1 Componente Responsável
- **Detecção**: `FileRenderer.detectAnalysisType()` (linhas 1115-1138)
- **Definição Central**: `AnalysisTypes.js` (fonte única de verdade)
- **Boost de Relevância**: `FileRenderer.calculateEnhancedRelevance()`

### 9.2 Tipos Disponíveis

#### Breakthrough Técnico (+25% relevância)
```javascript
{
  name: "Breakthrough Técnico",
  keywords: ['solução', 'configuração', 'arquitetura', 'implementação', 'código'],
  relevanceBoost: 0.25,    // Adiciona 25% ao score de relevância
  priority: 1,             // Maior prioridade
  color: '#4f46e5',
  icon: '🔧',
  categoryId: 'tecnico'    // Sugere categoria técnica
}
```
**Quando é detectado**: Arquivos contendo soluções técnicas, configurações de sistema, arquiteturas ou implementações de código.

#### Evolução Conceitual (+25% relevância)
```javascript
{
  name: "Evolução Conceitual",
  keywords: ['entendimento', 'perspectiva', 'visão', 'conceito', 'teoria'],
  relevanceBoost: 0.25,
  priority: 2,
  color: '#dc2626',
  icon: '💡',
  categoryId: 'conceitual'
}
```
**Quando é detectado**: Arquivos com novos entendimentos, mudanças de perspectiva ou visões conceituais.

#### Momento Decisivo (+20% relevância)
```javascript
{
  name: "Momento Decisivo", 
  keywords: ['decisão', 'escolha', 'direção', 'estratégia', 'definição'],
  relevanceBoost: 0.20,
  priority: 3,
  color: '#d97706',
  icon: '🎯',
  categoryId: 'decisivo'
}
```
**Quando é detectado**: Documentos que registram decisões importantes, escolhas estratégicas ou mudanças de direção.

#### Insight Estratégico (+15% relevância)
```javascript
{
  name: "Insight Estratégico", 
  keywords: ['insight', 'transformação', 'breakthrough', 'descoberta', 'revelação'],
  relevanceBoost: 0.15,
  priority: 4,
  color: '#7c3aed',
  icon: '✨',
  categoryId: 'insight'
}
```
**Quando é detectado**: Arquivos contendo insights transformadores ou descobertas estratégicas.

#### Aprendizado Geral (+5% relevância)
```javascript
{
  name: "Aprendizado Geral",
  keywords: ['aprendizado', 'conhecimento', 'estudo', 'análise', 'observação'],
  relevanceBoost: 0.05,
  priority: 5,
  color: '#be185d',
  icon: '📚',
  categoryId: 'aprendizado'
}
```
**Quando é detectado**: Tipo padrão para arquivos que não se encaixam nas categorias acima.

### 9.3 Processo de Detecção (LÓGICO APRESENTADO)
🔑 KEY_SYS.R: `?`
🔑 KEY_SUB.R: `?`
🔑 KEY_ACT.R: `?`

🔑 KEY_SYS.R: `?`
🔑 KEY_SUB.R: `?`
🔑 KEY_ACT.R: `?`

```javascript
// FileRenderer.detectAnalysisType() - Processo simplificado
1. Combina nome do arquivo + conteúdo em lowercase
2. Verifica keywords em ordem de prioridade (1-5)
3. Retorna o primeiro tipo que encontrar match
4. Se nenhum match, retorna "Aprendizado Geral"
```

### 9.4 Impacto no Score de Relevância (EXEMPLO APRESENTADO)
🔑 KEY_SYS.R: `?`
🔑 KEY_SUB.R: `?`
🔑 KEY_ACT.R: `?`

```javascript
// FileRenderer.calculateEnhancedRelevance()
scoreBase = 0.50  // Exemplo
analysisType = "Aprendizado Geral", "Insight Estratégico", "Momento Decisivo", "Evolução Conceitual",   // +25%
scoreFinal = 0.50 * 1.25 = 0.625  // 62.5%
```

### 9.5 Relação com Categorias (LÓGICO APRESENTADO)
🔑 KEY_SYS.R: `?`
🔑 KEY_SUB.R: `?`
🔑 KEY_ACT.R: `?`

Cada tipo de análise sugere uma categoria automaticamente:
- "Breakthrough Técnico" → categoria "tecnico"
- "Evolução Conceitual" → categoria "conceitual"
- "Momento Decisivo" → categoria "decisivo"
- "Insight Estratégico" → categoria "insight"
- "Aprendizado Geral" → categoria "aprendizado"

**Nota**: O usuário pode sobrescrever essas sugestões durante a curadoria manual.

---

## 10. Fluxo de Processamento
🔑 KEY_SYS.R: ``
🔑 KEY_SUB.R: ``
🔑 KEY_ACT.R: ``

### 10.1 Etapa 1 - Descoberta (DiscoveryManager)

- Varre diretórios configurados
- Aplica filtros de padrão e exclusão
- Gera lista inicial de arquivos

### 10.2 Etapa 2 - Pré-Análise (FileRenderer + PreviewUtils)
- Calcula relevância baseada em keywords
- Extrai smart preview (5 segmentos)
- Identifica estrutura do documento

### 10.3 Etapa 3 - Análise IA (AnalysisManager)
- Detecta tipo de análise (analysisType)
- Aplica boost de relevância
- Marca arquivo como analisado

### 10.4 Curadoria Manual (CategoryManager)
- Usuário revisa análise automática
- Aplica/remove categorias
- Arquiva ou aprova arquivos

### 10.5 Exportação (ExportUI + RAGExportManager)
- Consolida todos os dados
- Gera JSON com estrutura completa
- Prepara para Fase 2