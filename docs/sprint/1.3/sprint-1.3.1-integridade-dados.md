# SPRINT 1.3.1 - Correção de Integridade de Dados

## Data: 15/01/2025

## 🚨 CONTEXTO CRÍTICO

Durante a sessão de desenvolvimento, foi identificada uma discrepância crítica na contagem de arquivos que compromete a confiabilidade de todo o sistema:

### Evidências do Problema:
```
Descobertos: 627 arquivos
Únicos: 523 arquivos  
Duplicados: 104 arquivos
Exibindo: 532 arquivos (95 arquivos "desapareceram")
Período: Todos os campos zerados
```

## 📊 ANÁLISE DETALHADA

### 1. Dupla Filtragem Identificada

#### Sistema 1: Exclusões Inteligentes (FileRenderer)
- **Local**: `FileRenderer.applySmartExclusions()`
- **Tipo**: Automática e silenciosa
- **Remove**:
  - Pastas: `.trash`, `node_modules`, `.git`, `.obsidian`, `temp`, `cache`
  - Arquivos: `.md` (só extensão), `untitled`, `new file`, `changelog`, `readme`
  - Arquivos < 50 bytes
- **Problema**: Usuário não vê o que foi excluído

#### Sistema 2: Filtro de Duplicatas (FilterPanel)
- **Local**: `FilterPanel.applyDuplicateFilter()`
- **Tipo**: Pode estar ativo por padrão
- **Remove**: Arquivos marcados como `isDuplicate`
- **Problema**: Estado padrão não transparente

### 2. Fluxo de Dados Problemático

```
DiscoveryManager (627 arquivos)
    ↓
FileRenderer.applySmartExclusions() [Remove X arquivos]
    ↓
FilterPanel.applyDuplicateFilter() [Remove Y arquivos]
    ↓
Exibição Final (532 arquivos)
```

### 3. Problema de Cálculo de Período

- Arquivos sem `lastModified` válido são ignorados
- Sem fallback para data atual
- Resultado: Todos os contadores de período zerados

## 🎯 OBJETIVOS DO SPRINT 1.3.1

1. **Transparência Total**: Usuário deve ver TODOS os 627 arquivos descobertos
2. **Controle do Usuário**: Permitir ativar/desativar filtros e exclusões
3. **Integridade de Dados**: Garantir que contadores reflitam dados reais
4. **Correção de Período**: Implementar fallback robusto de datas

## 📋 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Correções Imediatas ✅

#### 1.1 Preservar Arquivos Originais (IMPLEMENTADO)
```javascript
// FileRenderer.js
this.originalFiles = [];    // Arquivos sem filtros
this.files = [];           // Arquivos para exibição

// Em FILES_DISCOVERED
this.originalFiles = data.files || [];
this.files = this.applySmartExclusions([...this.originalFiles]);
```

#### 1.2 Corrigir Cálculo de Período (IMPLEMENTADO)
```javascript
// FilterPanel.js - updatePeriodCounters()
if (file.lastModified) {
    fileDate = new Date(file.lastModified);
} else if (file.dateCreated) {
    fileDate = new Date(file.dateCreated);
} else {
    fileDate = new Date(); // Fallback
}
```

#### 1.3 Adicionar Métodos de Acesso
```javascript
// FileRenderer.js
getOriginalFiles() {
    return this.originalFiles;
}
```

### Fase 2: Transparência (PENDENTE)

#### 2.1 Desativar Filtro de Duplicatas por Padrão
- Verificar estado inicial do checkbox em FilterPanel
- Garantir que inicie desmarcado

#### 2.2 Logar Exclusões Detalhadamente
```javascript
// applySmartExclusions()
console.log(`Exclusões aplicadas:
- Pastas excluídas: ${excludedByPath.length}
- Nomes excluídos: ${excludedByName.length}  
- Tamanho < 50b: ${excludedBySize.length}
- Total removido: ${totalExcluded}`);
```

#### 2.3 Adicionar Contadores de Integridade no StatsPanel
```javascript
// Nova seção: "Integridade de Dados"
Descobertos: 627
Excluídos (smart): 95
Duplicados: 104
Visíveis: 532
```

### Fase 3: Controle do Usuário (FUTURA)

#### 3.1 Toggle para Exclusões Inteligentes
- Adicionar checkbox "Aplicar exclusões inteligentes"
- Salvar preferência no AppState

#### 3.2 Modal de Configurações de Exibição
- Listar todas as regras de exclusão
- Permitir ativar/desativar individualmente
- Mostrar preview do impacto

## 📊 MÉTRICAS DE SUCESSO

1. **Contagem Correta**: Total "Todos" = 627 arquivos
2. **Período Calculado**: Nenhum contador zerado
3. **Transparência**: Usuário vê quantos foram excluídos
4. **Controle**: Usuário pode desativar exclusões

## 🔧 IMPLEMENTAÇÕES REALIZADAS

### 1. Sistema de Preservação de Originais ✅
- FileRenderer agora mantém `originalFiles` e `files` separados
- Exclusões aplicadas apenas para exibição
- Getter `getOriginalFiles()` disponível

### 2. Correção de Cálculo de Período ✅
- Validação robusta com múltiplos campos de data
- Fallback para data atual se não houver data válida
- Logs de warning para arquivos sem data

### 3. Atualização de Documentação ✅
- RESUME-STATUS.md: Adicionada seção de BUGS CRÍTICOS
- RESUME-STATUS.md: Criada SPRINT 1.3.1
- CLAUDE.md: Adicionada LEI #12 sobre transparência
- INICIO-SESSAO.md: Adicionada verificação de integridade

## 📝 PRÓXIMOS PASSOS

1. **Verificar estado padrão do filtro de duplicatas**
2. **Implementar logs detalhados de exclusões**
3. **Adicionar seção de integridade no StatsPanel**
4. **Criar toggle para exclusões inteligentes**
5. **Testar com dados reais do usuário**

## 🎯 DEFINIÇÃO DE PRONTO

Sprint estará completo quando:
- [ ] Todos os 627 arquivos são contabilizados
- [ ] Período mostra valores corretos (não zerados)
- [ ] Usuário vê claramente quantos arquivos foram excluídos
- [ ] Existe opção para desativar exclusões
- [ ] Documentação atualizada
- [ ] Sem erros no console

## 📚 REFERÊNCIAS

- Bug original reportado: Sessão 15/01/2025
- Análise de causa: `/docs/sprint/1.3/fix-contador-data-consistency.md`
- Correções aplicadas: `/docs/sprint/1.3/fix-contador-ui-consistency.md`

---

**Status**: 🔄 EM ANDAMENTO - Fase 1 parcialmente completa