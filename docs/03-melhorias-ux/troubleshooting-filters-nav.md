# 🔧 Troubleshooting - Navegação e Filtros

> **DATA**: 25/07/2025  
> **PROBLEMA**: Navegação e sincronização de filtros não funcionando  
> **STATUS**: 🔧 EM ANÁLISE  

---

## 📋 Como Testar e Diagnosticar

### 1. Teste Automático
Abra o console do navegador (F12) e execute:
```javascript
fetch('test-navigation-filters.js').then(r => r.text()).then(eval)
```

### 2. Verificações Manuais

#### A. Navegação entre Etapas
1. Verifique etapa atual:
   ```javascript
   KC.AppState.get('currentStep')
   ```

2. Teste navegação manual:
   ```javascript
   KC.AppController.navigateToStep(3)  // Vai para etapa 3
   ```

3. Clique nos botões ◀ Etapa e Etapa ▶ e verifique se mudou apenas 1 etapa

#### B. Sincronização de Filtros
1. Aplique um filtro no painel principal
2. Verifique se o filtro rápido correspondente fica com fundo azul (active)
3. Clique em um filtro rápido
4. Verifique se o radio button correspondente é marcado

### 3. Possíveis Problemas

#### Problema 1: Script não carregado
Verifique se o script v2 está carregado:
```javascript
document.querySelector('script[src*="quick-filters-fix-v2.js"]')
```

#### Problema 2: Timing de inicialização
Force a re-inicialização:
```javascript
window.setupQuickFiltersBar()
```

#### Problema 3: Seletores incorretos
Verifique se os inputs existem:
```javascript
// Status
document.querySelectorAll('input[data-filter-group="status"]').length

// Relevância
document.querySelectorAll('input[data-filter-group="relevance"]').length
```

### 4. Solução Temporária

Se nada funcionar, execute este código no console para corrigir manualmente:

```javascript
// Corrigir navegação
document.getElementById('nav-prev').onclick = function(e) {
    e.preventDefault();
    const step = KC.AppState.get('currentStep') || 2;
    if (step > 1) KC.AppController.navigateToStep(step - 1);
};

document.getElementById('nav-next').onclick = function(e) {
    e.preventDefault();
    const step = KC.AppState.get('currentStep') || 2;
    if (step < 4) KC.AppController.navigateToStep(step + 1);
};

// Corrigir filtros
document.querySelectorAll('.quick-filter-item').forEach(item => {
    item.onclick = function(e) {
        e.preventDefault();
        const type = this.dataset.filter;
        const value = this.dataset.value;
        
        // Mapear valores
        const mappings = {
            'todos': 'all',
            'pendente': 'pending',
            'aprovados': 'approved',
            'alta': 'high',
            'media': 'medium',
            'baixa': 'low'
        };
        
        const inputValue = mappings[value] || value;
        const input = document.querySelector(`input[data-filter-group="${type}"][value="${inputValue}"]`);
        
        if (input) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };
});
```

### 5. Informações Necessárias

Por favor, execute o teste automático e informe:
1. Qual é a etapa atual?
2. O navigateToStep está disponível?
3. Quantos inputs de filtro foram encontrados?
4. Os eventos estão sendo disparados?
5. Há algum erro no console?

---

**Com essas informações, posso criar uma correção específica para o problema encontrado.**