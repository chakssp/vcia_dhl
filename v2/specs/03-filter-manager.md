# 03 - FilterManager Integration Spec

## Status: 🔍 AGUARDANDO VALIDAÇÃO

### Ordem de Implementação: 3/8

### Componentes
- **DE:** `/js/managers/FilterManager.js`
- **PARA:** Integrar na sidebar do V2

### Estrutura Atual de Filtros
```javascript
Filtros:
├── Relevância
│   ├── all (0%)
│   ├── alta (>70%)
│   ├── média (>50%)
│   └── baixa (>30%)
├── Status
│   ├── todos
│   ├── pendente
│   ├── analisados
│   └── arquivados
├── Tempo
│   ├── all
│   ├── 1m, 3m, 6m
│   └── 1y, 2y
├── Tamanho
│   ├── all
│   ├── <50KB
│   ├── 50-500KB
│   └── >500KB
└── Tipo
    └── md, txt, docx, pdf, gdoc, eml (NOVO)
```

### Componentes Dependentes
1. **FileRenderer** - Atualização visual da lista
2. **StatsPanel** - Contadores em tempo real
3. **ExclusionPatternsHandler** - Filtros negativos
4. **PowerApp** - Estado central dos filtros

### Integração V2
1. Mapear dropdowns da sidebar V2 para FilterManager
2. Conectar eventos de mudança de filtro
3. Atualizar contadores visuais em tempo real
4. Sincronizar com novo sistema de persistência

### Mudanças Necessárias
- Adicionar suporte para .eml nos filtros de tipo
- Integrar com PatternMatcher do DiscoveryManager
- Criar API unificada para aplicar todos os filtros

### Questões para Validar
1. Manter estrutura de filtros atual?
2. Adicionar novos ranges de relevância?
3. Criar filtros customizáveis pelo usuário?
4. Implementar filtros salvos/presets?

### Próximo: [04-category-manager.md](./04-category-manager.md)