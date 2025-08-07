# ⚠️ AVISO CRÍTICO - NÃO MUDAR DETECÇÃO DE DUPLICATAS

**Data**: 06/08/2025  
**Problema**: Detecção de duplicatas no Qdrant

---

## 🚨 REGRA ABSOLUTA

**NUNCA** mudar a busca de duplicatas de `fileName` para `filePath`!

---

## 📋 HISTÓRICO DO PROBLEMA

### O que aconteceu:
1. Arquivos foram salvos no Qdrant com campo `fileName` (apenas nome do arquivo)
2. Na descoberta local, o `filePath` é diferente (caminho completo local)
3. Se buscarmos por `filePath`, NENHUM arquivo será encontrado como duplicata

### Exemplo:
```javascript
// NO QDRANT:
{
    fileName: "documento.md",
    filePath: "/original/path/documento.md"  // Caminho quando foi salvo
}

// LOCAL (nova descoberta):
{
    fileName: "documento.md", 
    filePath: "C:/Users/novo/path/documento.md"  // Caminho diferente!
}
```

---

## ✅ SOLUÇÃO CORRETA

Sempre buscar por `fileName` que é consistente entre sessões:

```javascript
// CORRETO - Buscar por fileName
filter = {
    must: [
        { key: "fileName", match: { value: cleanFileName } }
    ]
};

// ERRADO - Buscar por filePath (vai falhar!)
filter = {
    must: [
        { key: "filePath", match: { value: filePath } }
    ]
};
```

---

## 🔍 PROBLEMA ATUAL (06/08/2025)

Arquivos com símbolo 🔁 aparecem como "➕ Novo:" ao invés de "🔁 Existente:".

### Causa provável:
1. O símbolo 🔁 é adicionado ao nome durante descoberta
2. Na busca, precisamos remover o símbolo antes de comparar
3. A lógica já foi corrigida em `QdrantManager.js` linha 292

---

## 📝 PARA DEBUGAR

Use o script criado:
```javascript
// No console do browser:
load('debug-duplicates-check.js')
```

Ou execute diretamente:
```javascript
debugDuplicateDetection()
```

---

## ⚠️ CONSEQUÊNCIAS DE MUDAR PARA FILEPATH

Se você mudar para `filePath`:
- ❌ TODOS os arquivos serão considerados NOVOS
- ❌ Duplicatas massivas no Qdrant
- ❌ Perda de categorização anterior
- ❌ Perda de análises de IA
- ❌ Sistema quebrado

---

**MANTENHA SEMPRE A BUSCA POR `fileName`!**