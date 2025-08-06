# INSTRUÇÕES - SISTEMA DE EVENTOS DO KNOWLEDGE CONSOLIDATOR
## LEITURA OBRIGATÓRIA PARA DESENVOLVIMENTO

### 🚨 REGRA CRÍTICA DE ATUALIZAÇÃO DE INTERFACE

**SEMPRE que modificar arquivos no sistema, emitir DOIS eventos:**

```javascript
// PASSO 1: Salvar no AppState
AppState.set('files', files);

// PASSO 2: SEMPRE emitir STATE_CHANGED (sincroniza dados)
EventBus.emit(Events.STATE_CHANGED, {
    key: 'files',
    newValue: files,
    oldValue: files
});

// PASSO 3: SEMPRE emitir FILES_UPDATED (atualiza interface)
EventBus.emit(Events.FILES_UPDATED, {
    action: 'descricao_da_acao',
    fileId: file.id || file.name,
    // ... outros dados relevantes
});
```

### 📋 EVENTOS DO SISTEMA E SEUS PROPÓSITOS

#### 1. **Events.STATE_CHANGED**
- **Propósito**: Sincronizar dados entre componentes
- **Quem escuta**: FileRenderer, StatsPanel, FilterPanel
- **Quando emitir**: Após qualquer mudança no AppState

#### 2. **Events.FILES_UPDATED** ⚠️ CRÍTICO
- **Propósito**: Forçar re-renderização da interface
- **Quem escuta**: FilterPanel (que re-aplica filtros)
- **Quando emitir**: Após modificar arquivos (análise, categorização, etc)
- **IMPORTANTE**: Sem este evento, a interface NÃO atualiza automaticamente!

#### 3. **Events.FILES_FILTERED**
- **Propósito**: Notificar mudança de filtros
- **Quem escuta**: FileRenderer
- **Quando emitir**: Após aplicar filtros

#### 4. **Events.CATEGORIES_CHANGED**
- **Propósito**: Notificar mudanças em categorias
- **Quem escuta**: Components que mostram categorias
- **Quando emitir**: Após criar/editar/deletar categorias

### 🔄 FLUXO CORRETO DE ATUALIZAÇÃO

```
Ação do Usuário (ex: Analisar, Categorizar)
    ↓
Manager processa a ação
    ↓
Modifica dados no AppState
    ↓
Emite STATE_CHANGED → Componentes sincronizam dados
    ↓
Emite FILES_UPDATED → FilterPanel re-aplica filtros
    ↓
FilterPanel emite FILES_FILTERED → FileRenderer re-renderiza
    ↓
Interface atualizada automaticamente ✅
```

### ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

#### Problema: "Interface não atualiza após ação"
**Causa**: Faltou emitir FILES_UPDATED
**Solução**: Adicionar emissão de FILES_UPDATED após STATE_CHANGED

#### Problema: "Dados não persistem"
**Causa**: Campo não está em AppState._compressFilesData
**Solução**: Adicionar campo na função de compressão

#### Problema: "Tipo de análise não aparece"
**Causa**: analysisType não sendo salvo/preservado
**Solução**: Verificar se está em _compressFilesData e updateFileWithAnalysis

### 📝 TEMPLATE PARA NOVO MANAGER

```javascript
class NovoManager {
    // Ao modificar arquivos
    async processarArquivo(file) {
        // ... lógica de processamento ...
        
        // Atualizar no AppState
        const files = AppState.get('files') || [];
        const index = files.findIndex(f => f.id === file.id);
        
        if (index !== -1) {
            files[index] = {
                ...files[index],
                // suas modificações aqui
            };
            
            // CRÍTICO: Sempre emitir os dois eventos
            AppState.set('files', files);
            
            EventBus.emit(Events.STATE_CHANGED, {
                key: 'files',
                newValue: files,
                oldValue: files
            });
            
            EventBus.emit(Events.FILES_UPDATED, {
                action: 'processo_concluido',
                fileId: file.id,
                // dados adicionais
            });
        }
    }
}
```

### 🔍 COMPONENTES CHAVE

1. **FilterPanel**: 
   - Escuta FILES_UPDATED
   - Chama applyFilters() que dispara re-renderização

2. **FileRenderer**:
   - Escuta STATE_CHANGED e FILES_FILTERED
   - Renderiza a lista de arquivos

3. **CategoryManager**:
   - Exemplo correto de implementação
   - Sempre emite FILES_UPDATED após modificações

4. **AnalysisManager**:
   - Corrigido para emitir FILES_UPDATED
   - Detecta tipo de análise via FileRenderer

### ✅ CHECKLIST DE IMPLEMENTAÇÃO

Ao criar funcionalidade que modifica arquivos:

- [ ] Modificar dados no AppState
- [ ] Emitir STATE_CHANGED
- [ ] Emitir FILES_UPDATED
- [ ] Preservar campos em _compressFilesData
- [ ] Testar atualização automática
- [ ] Testar persistência após reload
- [ ] Documentar novos campos

### 🚫 NUNCA FAZER

1. ❌ Emitir apenas STATE_CHANGED (interface não atualiza)
2. ❌ Esquecer de preservar campos no AppState
3. ❌ Modificar arquivos sem emitir eventos
4. ❌ Assumir que componentes vão se atualizar sozinhos

### 📚 REFERÊNCIAS

- `/docs/sprint/1.3/correcao-tipo-analise-completa.md` - Caso de estudo
- `/js/managers/CategoryManager.js` - Implementação correta
- `/js/components/FilterPanel.js` - Como escutar FILES_UPDATED

### 🛠️ ARQUIVOS DE DEBUG

- `/debug-analysis-type.js` - Script de debug para testar detecção de tipos de análise
  - **Propósito**: Teste isolado da lógica de detecção
  - **Status**: Mantido para referência futura
  - **Nota**: Não incluído no index.html em produção