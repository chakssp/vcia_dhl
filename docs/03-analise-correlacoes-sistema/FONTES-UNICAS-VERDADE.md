# 📋 FONTES ÚNICAS DE VERDADE - Knowledge Consolidator

> **CRÍTICO**: Este documento define as fontes únicas de verdade (Single Source of Truth - SSO) para cada tipo de dado no sistema, conforme LEI 11 do projeto.

## 🎯 Princípio Fundamental

**CADA TIPO DE DADO DEVE TER APENAS UMA FONTE DE VERDADE NO SISTEMA**

Isso evita:
- Duplicação de dados
- Inconsistências entre componentes
- Problemas de sincronização
- Bugs difíceis de rastrear

---

## 📊 Mapeamento de Fontes de Verdade

### 1. **CATEGORIAS**
- **Fonte Única**: `CategoryManager`
- **Método de Acesso**: `KC.CategoryManager.getCategories()`
- **Dados Salvos**: Apenas `customCategories` no AppState
- **NUNCA USE**: ~~`AppState.get('categories')`~~ (removido)
- **Campos Críticos**: `id`, `name`, `color`
- **Campos Opcionais**: `icon` (não afeta funcionalidade principal)

```javascript
// ✅ CORRETO
const todasCategorias = KC.CategoryManager.getCategories();
const categoriaEspecifica = KC.CategoryManager.getCategoryById('tech');

// ❌ ERRADO - NÃO USE
const categorias = AppState.get('categories'); // Este array foi removido!
```

**NOTA**: O campo `icon` é puramente visual e opcional. A integridade da fonte única de verdade depende apenas dos campos `id`, `name` e `color`. Todas as operações (busca, atribuição, remoção) funcionam independentemente da presença de ícones.

### 2. **ARQUIVOS**
- **Fonte Única**: `AppState`
- **Método de Acesso**: `AppState.get('files')`
- **Gestão**: `DiscoveryManager` (descoberta), `FileRenderer` (exibição)
- **Merge Inteligente**: Preserva campos customizados ao re-descobrir

```javascript
// ✅ CORRETO
const arquivos = AppState.get('files');
```

### 3. **CONFIGURAÇÕES**
- **Fonte Única**: `AppState`
- **Método de Acesso**: `AppState.get('configuration')`
- **Subseções**: 
  - `configuration.discovery` - Configurações de descoberta
  - `configuration.preAnalysis` - Configurações de pré-análise
  - `configuration.aiAnalysis` - Configurações de IA
  - `configuration.organization` - Configurações de organização

### 4. **FILTROS**
- **Fonte Única**: `FilterManager`
- **Método de Acesso**: `KC.FilterManager.getConfig()`
- **Estado dos Filtros**: `KC.FilterManager.getFilteredFiles()`

### 5. **ESTATÍSTICAS**
- **Fonte Única**: `StatsManager`
- **Método de Acesso**: `KC.StatsManager.getStats()`
- **Coordenação**: `StatsCoordinator` para múltiplas fontes

### 6. **TEMPLATES DE IA**
- **Fonte Única**: `PromptManager`
- **Método de Acesso**: `KC.PromptManager.getTemplate(templateId)`
- **Templates Disponíveis**: `KC.PromptManager.listTemplates()`

### 7. **CONFIGURAÇÕES DE API**
- **Fonte Única**: `AIAPIManager`
- **Provider Ativo**: `KC.AIAPIManager.getActiveProvider()`
- **Providers Disponíveis**: `KC.AIAPIManager.getProviders()`

### 8. **EMBEDDINGS**
- **Fonte Única**: `EmbeddingService`
- **Cache**: IndexedDB (gerenciado internamente)
- **Método de Acesso**: `KC.EmbeddingService.generateEmbedding(text)`

### 9. **DADOS VETORIAIS (QDRANT)**
- **Fonte Única**: `QdrantService`
- **Collection**: `knowledge_consolidator`
- **Método de Acesso**: `KC.QdrantService.searchByText(query)`

### 10. **TRIPLAS SEMÂNTICAS**
- **Fonte Única**: `TripleStoreManager`
- **Schema**: `TripleSchema`
- **Extração**: `RelationshipExtractor`

---

## 🔄 Padrões de Sincronização

### Eventos Principais
1. **STATE_CHANGED** - Mudanças no AppState
2. **FILES_UPDATED** - Atualizações em arquivos
3. **CATEGORIES_CHANGED** - Mudanças em categorias
4. **FILTERS_CHANGED** - Mudanças em filtros

### Fluxo de Dados
```
Usuario → Manager → AppState → EventBus → Componentes UI
```

---

## ⚠️ Erros Comuns a Evitar

### ❌ NÃO FAÇA:
1. Criar arrays locais de categorias em componentes
2. Salvar dados diretamente sem usar o Manager apropriado
3. Duplicar definições de dados padrão
4. Acessar dados sem verificar se o Manager existe

### ✅ SEMPRE FAÇA:
1. Use o Manager apropriado para cada tipo de dado
2. Escute eventos para manter sincronização
3. Verifique se o componente está disponível antes de usar
4. Documente quando criar nova fonte de verdade

---

## 🤖 Para Agentes de IA

**IMPORTANTE**: Ao implementar novas funcionalidades ou corrigir bugs:

1. **SEMPRE verifique** esta documentação primeiro
2. **NUNCA crie** nova fonte de dados sem verificar se já existe
3. **USE os Managers** listados acima - não acesse dados diretamente
4. **MANTENHA** este documento atualizado se criar nova fonte de verdade

### Exemplo de Verificação:
```javascript
// Antes de implementar algo com categorias
if (KC.CategoryManager) {
    const categorias = KC.CategoryManager.getCategories();
    // Use as categorias...
} else {
    console.error('CategoryManager não disponível');
}
```

---

## 📅 Histórico de Mudanças

### 24/07/2025 - Unificação de Categorias
- Removido array `categories` do AppState
- CategoryManager estabelecido como fonte única
- Migração automática de categorias antigas implementada
- BUG #11 resolvido

---

**FIM DO DOCUMENTO - Consulte sempre antes de implementar!**