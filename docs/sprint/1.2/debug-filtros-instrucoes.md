# 🔍 INSTRUÇÕES DE DEBUG - FILTROS EM PRODUÇÃO

**Data:** 10/07/2025  
**Status:** Debug em andamento

---

## 📋 PASSOS PARA DEBUG

### 1. Abra o sistema principal
```
http://localhost:8000
```

### 2. Carregue seus 40 arquivos normalmente
- Configure as keywords
- Execute a descoberta
- Aguarde os arquivos aparecerem

### 3. Abra o Console do Navegador
- Chrome/Edge: F12 → Console
- Firefox: Ctrl+Shift+K

### 4. Execute o Debug
Cole o seguinte comando no console:

```javascript
// Carrega e executa o script de debug
fetch('/debug-filtros-producao.js')
  .then(r => r.text())
  .then(eval);
```

### 5. Analise os Resultados

O script vai mostrar:
1. Estado atual dos filtros
2. O que acontece quando ativa "medium"
3. Quantos arquivos são filtrados
4. A relevância dos arquivos mostrados
5. Distribuição real de relevância

---

## 🐛 O QUE PROCURAR

### Possível Problema 1: Mapeamento de Nomes
- HTML usa: "high", "medium", "low"
- FilterManager pode estar esperando: "alta", "media", "baixa"

### Possível Problema 2: Cálculo de Relevância
- Verifique se todos os arquivos têm a mesma relevância
- Verifique se o cálculo está retornando valores corretos

### Possível Problema 3: Filtro Não Aplicado
- Verifique se o filtro de relevância está realmente ativo
- Verifique se há algum filtro de status interferindo

---

## 🔧 CORREÇÃO RÁPIDA (SE NECESSÁRIO)

Se o problema for mapeamento de nomes, execute no console:

```javascript
// Correção temporária - mapear nomes corretamente
KC.FilterManager.activateFilter = function(filterType) {
    console.log('Filtro ativado:', filterType);
    
    // Mapeamento de nomes
    const nameMap = {
        'high': 'alta',
        'medium': 'media',
        'low': 'baixa'
    };
    
    const mappedType = nameMap[filterType] || filterType;
    
    // Resto do código original...
    // (copiar do método atual)
};
```

---

## 📊 COMPARTILHE OS RESULTADOS

Após executar o debug, compartilhe:
1. O output completo do console
2. Especialmente a "Distribuição de relevância"
3. Qualquer erro que aparecer

Com essas informações, poderei fazer a correção definitiva no código.