# 🚀 TESTE RÁPIDO DO BOOST EM PRODUÇÃO

## 1️⃣ Abra a aplicação
```
http://127.0.0.1:5500
```

## 2️⃣ Abra o Console (F12)

## 3️⃣ Cole estes comandos em sequência:

### Comando 1: Ver arquivo e relevância atual
```javascript
// Pega primeiro arquivo da lista
const arquivo = KC.AppState.get('files')[0];
console.log('ANTES:', {
    nome: arquivo.name,
    relevancia: arquivo.relevanceScore + '%',
    categorias: arquivo.categories || []
});
```

### Comando 2: Aplicar categoria e ver mudança
```javascript
// Aplica categoria no primeiro arquivo
const arquivo = KC.AppState.get('files')[0];
const categoria = KC.CategoryManager.getCategories()[0];

if (!categoria) {
    // Cria categoria se não existir
    KC.CategoryManager.createCategory({name: 'Teste Boost', color: '#7c3aed'});
}

// Aplica categoria
KC.CategoryManager.assignCategoryToFile(arquivo.id || arquivo.name, categoria?.id || 'teste-boost');

// Mostra resultado após 1 segundo
setTimeout(() => {
    const arquivoAtualizado = KC.AppState.get('files')[0];
    console.log('DEPOIS:', {
        nome: arquivoAtualizado.name,
        relevancia: arquivoAtualizado.relevanceScore + '%',
        categorias: arquivoAtualizado.categories,
        boost_aplicado: arquivoAtualizado.categories?.length > 0 ? 
            '+' + Math.round((1.5 + arquivoAtualizado.categories.length * 0.1 - 1) * 100) + '%' : 
            'nenhum'
    });
    
    // Verifica se mudou
    if (arquivo.relevanceScore !== arquivoAtualizado.relevanceScore) {
        console.log('✅ BOOST FUNCIONANDO! Relevância mudou de', arquivo.relevanceScore + '%', 'para', arquivoAtualizado.relevanceScore + '%');
    } else {
        console.log('❌ PROBLEMA: Relevância não mudou!');
        console.log('Forçando re-renderização...');
        KC.FileRenderer.renderFileList();
    }
}, 1000);
```

## 4️⃣ Resultado Esperado:

Você deve ver no console algo como:
```
ANTES: {nome: "arquivo.md", relevancia: "5%", categorias: []}
DEPOIS: {nome: "arquivo.md", relevancia: "8%", categorias: ["teste-boost"], boost_aplicado: "+60%"}
✅ BOOST FUNCIONANDO! Relevância mudou de 5% para 8%
```

## 5️⃣ Se não funcionar:

### Comando de Debug Completo:
```javascript
// Debug completo
console.log('=== DEBUG BOOST ===');
const f = KC.AppState.get('files')[0];
console.log('1. Arquivo:', f.name);
console.log('2. Relevância atual:', f.relevanceScore);
console.log('3. Categorias:', f.categories);
console.log('4. Tem listener FILES_UPDATED?', KC.EventBus._events['files:updated']?.length > 0);
console.log('5. FileRenderer existe?', !!KC.FileRenderer);

// Tenta aplicar boost manualmente
if (f.categories && f.categories.length > 0) {
    const boost = 1.5 + (f.categories.length * 0.1);
    const novaRelevancia = Math.min(100, (f.relevanceScore || 5) * boost);
    console.log('6. Boost calculado:', boost + 'x');
    console.log('7. Nova relevância deveria ser:', novaRelevancia + '%');
}

// Força atualização
KC.FileRenderer.renderFileList();
console.log('8. Re-renderização forçada!');
```

---

**TESTE AGORA DIRETO NO CONSOLE!**