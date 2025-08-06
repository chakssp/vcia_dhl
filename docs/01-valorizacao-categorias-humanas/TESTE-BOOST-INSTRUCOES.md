# 🧪 INSTRUÇÕES DE TESTE - Boost de Relevância

> **DATA**: 24/07/2025  
> **OBJETIVO**: Validar se boost está funcionando corretamente  

---

## 📋 Como Testar

### Opção 1: Teste Isolado (Recomendado)
```
http://127.0.0.1:5500/test/test-boost-simples.html
```

1. Clique em **"Criar Arquivo com 5% Relevância"**
2. Clique em **"Aplicar 1 Categoria"**
3. Verifique se:
   - Relevância muda de 5% para 8% (5 × 1.6 = 8)
   - Status mostra "✅ CORRETO!"
   - Logs mostram eventos sendo emitidos

### Opção 2: Na Aplicação Principal
```
http://127.0.0.1:5500
```

1. Descubra arquivos (Etapa 1)
2. Na lista de arquivos (Etapa 2):
   - Note a relevância inicial (ex: 5%)
   - Clique em "📂 Categorizar"
   - Adicione 1 categoria
   - Salve
3. Verifique se:
   - Toast notification aparece: "🚀 Boost aplicado"
   - Relevância muda imediatamente (ex: 5% → 8%)
   - Indicador 🚀 aparece ao lado do valor

---

## 🔍 O Que Verificar no Console

### Abra o Console (F12) e procure por:

```javascript
// Quando aplicar categoria:
[CategoryManager] Boost de relevância aplicado (individual) {
    file: "arquivo.md",
    originalScore: 5,
    boostedScore: 8,
    boost: "60%"
}

// No FileRenderer:
FileRenderer: Evento FILES_UPDATED recebido {action: "category_assigned"}
FileRenderer: Re-renderizando após mudança de categoria
```

### Comando para Debug:
```javascript
// Ver arquivo específico
KC.AppState.get('files')[0]

// Ver relevância e categorias
const f = KC.AppState.get('files')[0];
console.log({
    nome: f.name,
    relevancia: f.relevanceScore,
    categorias: f.categories,
    boost: f.categories ? (1.5 + f.categories.length * 0.1) : 1
});
```

---

## ✅ Comportamento Esperado

### Cenário 1: Adicionar Categoria
```
ANTES: arquivo.md - Relevância: 5%
AÇÃO: Adicionar categoria "Técnico"
DEPOIS: arquivo.md - Relevância: 8% 🚀 +60%
```

### Cenário 2: Adicionar 2ª Categoria
```
ANTES: arquivo.md - Relevância: 8% 🚀 +60%
AÇÃO: Adicionar categoria "Estratégico"
DEPOIS: arquivo.md - Relevância: 8.5% 🚀 +70%
```

### Cenário 3: Análise com IA
```
ANTES: arquivo.md - Relevância: 8% 🚀 +60%
AÇÃO: Clicar "Analisar com IA"
DEPOIS: arquivo.md - Relevância: 48% 🚀 +60% (boost preservado)
```

---

## ❌ Se Não Funcionar

### 1. Verifique se há erros no console
```javascript
// Procure por erros vermelhos
// Especialmente: "Cannot read property" ou "undefined"
```

### 2. Force atualização manual
```javascript
// Force re-renderização
KC.FileRenderer.renderFileList()
```

### 3. Verifique versão dos arquivos
```javascript
// Certifique-se que está usando versão mais recente
location.reload(true) // Force refresh
```

### 4. Limpe cache do navegador
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

---

## 📊 Resumo das Correções

1. **CategoryManager**: Aplica boost ao atribuir categoria ✅
2. **FileRenderer**: Escuta FILES_UPDATED e re-renderiza ✅
3. **Análise IA**: Preserva boost ao analisar ✅
4. **Notificações**: Toast mostra mudança de relevância ✅
5. **Indicador Visual**: 🚀 mostra % de boost aplicado ✅

---

**TESTE AGORA**: http://127.0.0.1:5500/test/test-boost-simples.html

---

**FIM DAS INSTRUÇÕES**