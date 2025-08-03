# ✅ Correção Adicional - StatusBar APIService

## Problema
O StatusBar.js estava tentando importar `apiService` (minúsculo) quando deveria receber a instância via construtor.

## Correções Aplicadas

### 1. app.js
- Linha 106: Agora passa a instância do APIService para o StatusBar
```javascript
this.components.statusBar = new StatusBar(this.api);
```

### 2. StatusBar.js
- Removido import incorreto: `import { apiService } from '../services/APIService.js';`
- Construtor atualizado para receber apiService como parâmetro
- Linha 131: Corrigido para usar `this.apiService.checkHealth()`

## Resultado
O StatusBar agora recebe corretamente a instância do APIService do app.js, seguindo o mesmo padrão das views.

Isso resolve o erro de import e mantém a consistência da arquitetura do projeto.