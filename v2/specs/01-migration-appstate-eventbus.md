# 01 - AppState + EventBus Migration Spec

## Status: ✅ APROVADO

### Ordem de Implementação: 1/8

### Componentes
- **DE:** `/js/core/AppState.js` + `/js/core/EventBus.js`
- **PARA:** `/v2/js/core/AppState.js` + `/v2/js/core/EventBus.js`

### Ação
1. Copiar arquivos direto (são compatíveis)
2. Manter sistema de eventos existente
3. Preservar compressão de dados

### Dependências
- Nenhuma (base de tudo)

### Próximo: [02-discovery-manager.md](./02-discovery-manager.md)