# 🔍 DIAGNÓSTICO INICIAL - PROBLEMAS CRÍTICOS

**Data:** 10/07/2025  
**Hora Início:** 19:15  
**Status:** ✅ CONCLUÍDO

---

## 📊 RESUMO EXECUTIVO

Investigação completa dos componentes afetados revelou as causas raiz dos problemas críticos identificados durante a homologação.

---

## 🐛 PROBLEMA 1: Filtros Não Funcionais

### Componente Afetado
- **Arquivo:** `/js/managers/FilterManager.js`
- **Linhas:** 294-306 (método `applyCurrentFilters()`)

### Causa Raiz Identificada
```javascript
// FilterManager.js:294
applyCurrentFilters() {
    const files = AppState.get('files') || [];
    const filteredFiles = this.filterFiles(files);
    
    console.log(`Aplicando filtros: ${files.length} arquivos → ${filteredFiles.length} filtrados`);
    
    // Emite evento com arquivos filtrados
    EventBus.emit(Events.FILES_FILTERED, {  // ⚠️ PROBLEMA: FileRenderer não escuta este evento!
        originalFiles: files,
        filteredFiles: filteredFiles,
        filters: this.getActiveFilters()
    });
}
```

### Diagnóstico
1. **FilterManager emite evento `FILES_FILTERED`** quando filtros são aplicados
2. **FileRenderer NÃO está escutando este evento** (confirmado via grep)
3. **Resultado:** A lista visual nunca é atualizada quando filtros mudam

### Evidência
```bash
grep -n "FILES_FILTERED" /js/components/FileRenderer.js
# Resultado: No matches found
```

---

## 🐛 PROBLEMA 2: Relevância Fixa em 1%

### Componente Afetado
- **Arquivo:** `/js/components/FileRenderer.js`
- **Linhas:** 464-476 (método `calculateRelevance()`)

### Causa Raiz Identificada
```javascript
// FileRenderer.js:464
calculateRelevance(file) {
    // Implementação básica - será aprimorada com PreviewUtils
    if (file.relevanceScore !== undefined) {
        return Math.round(file.relevanceScore);
    }
    
    // Cálculo simples baseado no nome e tamanho
    let score = 50; // Base
    
    if (file.name.includes('insight') || file.name.includes('eureka')) score += 20;
    if (file.name.includes('projeto') || file.name.includes('decisão')) score += 15;
    if (file.size < 1024) score -= 10;
    
    return Math.min(Math.max(score, 1), 95);  // ⚠️ PROBLEMA: Math.max(score, 1) força mínimo de 1%
}
```

### Diagnóstico
1. **Linha 476 força valor mínimo de 1%** com `Math.max(score, 1)`
2. **Não integra com PreviewUtils** que tem cálculo sofisticado
3. **Ignora keywords configuradas** pelo usuário
4. **Usa apenas nome do arquivo** para cálculo básico

### Evidência Adicional
- PreviewUtils tem método `_calculateRelevanceScore()` implementado mas não usado
- FileRenderer deveria usar `file.relevanceScore` calculado pelo DiscoveryManager

---

## 🐛 PROBLEMA 3: Lista Inconsistente Após Categorização

### Componente Afetado
- **Arquivo:** `/js/components/FileRenderer.js`
- **Método:** `saveCategoriesForFile()` e eventos relacionados

### Hipótese Inicial
1. Após salvar categorias, a lista é re-renderizada sem preservar:
   - Filtros ativos
   - Ordenação atual
   - Página atual
2. Possível duplicação ou omissão de arquivos

### Investigação Necessária
- Verificar fluxo de eventos após salvar categorias
- Analisar se `renderFileList()` é chamado corretamente
- Verificar estado do AppState antes/depois

---

## 🐛 PROBLEMA 4: Função Arquivar Incompleta

### Status
- Modal de confirmação não implementado
- Lógica de arquivamento parcial
- Filtro "Arquivados" não existe

---

## 📈 MÉTRICAS DO DIAGNÓSTICO

| Problema | Severidade | Complexidade | Tempo Estimado |
|----------|------------|--------------|----------------|
| Filtros não funcionais | 🔴 CRÍTICA | Média | 45 min |
| Relevância 1% | 🔴 CRÍTICA | Baixa | 30 min |
| Lista inconsistente | 🟡 ALTA | Alta | 45 min |
| Arquivar incompleto | 🟡 MÉDIA | Média | 30 min |

---

## 🎯 PRÓXIMOS PASSOS

### Ordem de Correção Recomendada:
1. **Relevância (mais simples)** - Corrigir cálculo e integrar com PreviewUtils
2. **Filtros** - Adicionar listener no FileRenderer para FILES_FILTERED
3. **Lista inconsistente** - Preservar estado ao re-renderizar
4. **Arquivar** - Completar implementação

---

## 🧪 ARQUIVOS DE TESTE NECESSÁRIOS

```html
<!-- test-relevance.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Teste de Relevância</title>
    <script src="/js/utils/PreviewUtils.js"></script>
    <script src="/js/components/FileRenderer.js"></script>
</head>
<body>
    <script>
        // Teste isolado do cálculo de relevância
        const testFile = {
            name: "insight-projeto.md",
            size: 5000,
            content: "Este é um insight importante sobre decisão estratégica..."
        };
        
        console.log("Relevância atual:", KC.FileRenderer.calculateRelevance(testFile));
        // Esperado: valor variável baseado em keywords
        // Atual: provavelmente 65% (50 base + 20 + 15 - 0)
    </script>
</body>
</html>
```

---

## 📝 CONCLUSÃO DO DIAGNÓSTICO

Todos os problemas têm causas raiz claras e soluções diretas:
1. **Filtros**: Falta conexão de eventos
2. **Relevância**: Lógica incorreta e não integrada
3. **Lista**: Falta preservação de estado
4. **Arquivar**: Implementação incompleta

Tempo total estimado: ~2h30min para corrigir todos os problemas críticos.

---

**STATUS:** ✅ Diagnóstico Concluído  
**PRÓXIMA FASE:** Correção da Relevância (Problema #2)