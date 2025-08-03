# 🔧 CORREÇÃO: EventBus is not a constructor

## 🎯 Problema Identificado

**Erro**: `Uncaught (in promise) TypeError: EventBus is not a constructor`

**Causa**: Conflito entre imports - EventBus e AppState estavam sendo importados como default (instâncias singleton) mas o código tentava criar novas instâncias com `new`.

## ✅ Solução Aplicada

### 1. Ajuste no app.js
```javascript
// ANTES - Tentava criar nova instância
this.eventBus = new EventBus();
this.appState = new AppState();

// DEPOIS - Usa a instância singleton
this.eventBus = EventBus;
this.appState = AppState;
```

### 2. Melhoria nos Exports

Agora EventBus e AppState exportam tanto a classe quanto a instância:

**EventBus.js**:
```javascript
// Create singleton instance
const eventBus = new EventBus();

// Export both the class and the instance
export { EventBus, Events };
export default eventBus;
```

**AppState.js**:
```javascript
// Create singleton instance
const appState = new AppState();

// Export both the class and the instance
export { AppState };
export default appState;
```

## 📋 Vantagens desta Abordagem

1. **Flexibilidade**: Outros módulos podem escolher usar a instância singleton ou criar novas instâncias
2. **Compatibilidade**: Mantém compatibilidade com código existente
3. **Clareza**: Fica claro quando estamos usando singleton vs nova instância

## 🚀 Como Usar

### Para usar o singleton (recomendado):
```javascript
import EventBus from './core/EventBus.js';
import AppState from './core/AppState.js';

// Usar diretamente
EventBus.on('event', handler);
AppState.set('key', value);
```

### Para criar nova instância (se necessário):
```javascript
import { EventBus, AppState } from './core/EventBus.js';

// Criar nova instância
const myEventBus = new EventBus();
const myAppState = new AppState();
```

## ✅ Resultado

O erro `EventBus is not a constructor` foi corrigido e a aplicação V2 pode inicializar corretamente.

---

*Correção aplicada em 03/08/2025*