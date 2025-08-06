# 📖 Guias Operacionais

Esta pasta contém **guias práticos e operacionais** para trabalhar com o sistema Knowledge Consolidator.

## 🎯 Objetivo Principal
Fornecer instruções claras para operação, configuração e entendimento do sistema.

## 📄 Documentos Principais

### Configuração e Operação
- `servidor.md` - Como gerenciar o Five Server (porta 5500)
- `INSTRUCOES-EVENTOS-SISTEMA.md` - Sistema de eventos e debugging

### Histórico e Contexto
- `timeline-completo-projeto.md` - História completa do projeto (10/07 - 21/07/2025)
  - Todas as sprints documentadas
  - Bugs resolvidos cronologicamente
  - Lições aprendidas

## 🔧 Comandos Úteis

### Debug no Console
```javascript
kcdiag()  // Diagnóstico completo
KC.AppState.get('files')  // Ver arquivos
KC.CategoryManager.getCategories()  // Ver categorias
```

### Verificações de Sistema
```javascript
KC.EmbeddingService.checkOllamaAvailability()
KC.QdrantService.checkConnection()
```

## 🔍 Como Referenciar
```
@guias-operacionais/servidor.md
@guias-operacionais/timeline-completo-projeto.md
```