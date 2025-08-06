# 🎭 Validação Rápida com Playwright - Sistema Automatizado

> **NOVO PADRÃO**: Validação 100% automatizada usando Playwright MCP
> **Atualizado**: 03/08/2025 - Substituindo validação manual por Playwright

## 🚀 Comando de Validação Ultra-Rápida
```javascript
// Validação completa em 1 comando
mcp__playwright__playwright_evaluate({
    script: "kcdiag() && KC.AppState.get('files').length && KC.QdrantService.checkConnection() && KC.EmbeddingService.checkOllamaAvailability()"
})
```

## ✅ Checklist Automatizado Playwright (2 minutos)

### 1. 🌐 Inicializar Browser e Navegar
```javascript
// Abrir aplicação
mcp__playwright__playwright_navigate({
    url: "http://127.0.0.1:5500",
    browserType: "chromium",
    headless: false,
    width: 1280,
    height: 720
})

// Verificar carregamento
mcp__playwright__playwright_evaluate({
    script: "document.readyState === 'complete' && window.KC ? 'Sistema Carregado' : 'Aguardando...'"
})
```

### 2. 🔍 Diagnóstico Completo do Sistema
```javascript
// Script de diagnóstico detalhado
const diagnosticScript = `
(async () => {
    console.log('=== DIAGNÓSTICO KC INICIADO ===');
    
    // 1. Verificar componentes
    const diag = kcdiag();
    console.log('Componentes carregados:', Object.keys(window.KC).length);
    
    // 2. Estado dos arquivos
    const files = KC.AppState.get('files') || [];
    console.log('Total de arquivos:', files.length);
    console.log('Arquivos analisados:', files.filter(f => f.analyzed).length);
    console.log('Arquivos categorizados:', files.filter(f => f.categories?.length > 0).length);
    
    // 3. Etapa atual
    console.log('Etapa atual:', KC.AppController.currentStep);
    
    // 4. Verificar serviços
    try {
        const ollama = await KC.EmbeddingService.checkOllamaAvailability();
        console.log('Ollama:', ollama ? 'CONECTADO' : 'OFFLINE');
    } catch(e) {
        console.log('Ollama: ERRO -', e.message);
    }
    
    try {
        const qdrant = await KC.QdrantService.checkConnection();
        console.log('Qdrant:', qdrant ? 'CONECTADO' : 'OFFLINE');
        
        if (qdrant) {
            const stats = await KC.QdrantService.getCollectionStats();
            console.log('Qdrant pontos:', stats.vectors_count);
        }
    } catch(e) {
        console.log('Qdrant: ERRO -', e.message);
    }
    
    console.log('=== DIAGNÓSTICO CONCLUÍDO ===');
    return 'Diagnóstico completo';
})();
`;

// Executar diagnóstico
mcp__playwright__playwright_evaluate({ script: diagnosticScript })

// Capturar resultados
mcp__playwright__playwright_console_logs({ 
    search: "DIAGNÓSTICO",
    limit: 20 
})
```

### 3. 📊 Validação de Dados e Serviços
```javascript
// Validar arquivos carregados
mcp__playwright__playwright_evaluate({
    script: `
        const files = KC.AppState.get('files') || [];
        const stats = {
            total: files.length,
            pendentes: files.filter(f => !f.analyzed).length,
            analisados: files.filter(f => f.analyzed).length,
            categorizados: files.filter(f => f.categories?.length > 0).length,
            comScores: files.filter(f => f.confidenceScore > 0).length
        };
        console.log('STATS:', JSON.stringify(stats, null, 2));
        stats;
    `
})

// Testar busca semântica
mcp__playwright__playwright_evaluate({
    script: `
        KC.SimilaritySearchService.searchByText('conhecimento')
            .then(results => {
                console.log('Busca semântica:', results.length, 'resultados');
                return results.length;
            })
            .catch(e => console.error('Erro na busca:', e));
    `
})
```

### 4. 📸 Captura Visual do Estado
```javascript
// Screenshot da interface
mcp__playwright__playwright_screenshot({
    name: "kc-validation-interface",
    fullPage: true,
    storeBase64: false,
    savePng: true
})

// Screenshot específica de componentes
mcp__playwright__playwright_screenshot({
    name: "kc-files-list",
    selector: "#files-container",
    storeBase64: false
})
```

### 5. 🔎 Verificação de Erros
```javascript
// Capturar apenas erros
mcp__playwright__playwright_console_logs({ 
    type: "error",
    limit: 50 
})

// Verificar erros de rede
mcp__btools__getNetworkErrors()

// Limpar logs antigos
mcp__btools__wipeLogs()
```

## 🔴 Troubleshooting Automatizado

### Script de Auto-Diagnóstico
```javascript
const troubleshootScript = `
(async () => {
    const issues = [];
    
    // Verificar componentes essenciais
    if (!window.KC) issues.push('KC não carregado');
    if (!window.kcdiag) issues.push('kcdiag não disponível');
    
    // Verificar serviços
    try {
        await KC.EmbeddingService.checkOllamaAvailability();
    } catch(e) {
        issues.push('Ollama offline - executar: ollama serve');
    }
    
    try {
        await KC.QdrantService.checkConnection();
    } catch(e) {
        issues.push('Qdrant não acessível - verificar VPN/Tailscale');
    }
    
    // Verificar dados
    const files = KC.AppState.get('files') || [];
    if (files.length === 0) {
        issues.push('Sem arquivos - ir para Etapa 1 e descobrir arquivos');
    }
    
    if (issues.length > 0) {
        console.error('PROBLEMAS ENCONTRADOS:', issues);
        return { status: 'erro', issues };
    }
    
    console.log('✅ Sistema OK - Sem problemas detectados');
    return { status: 'ok' };
})();
`;

mcp__playwright__playwright_evaluate({ script: troubleshootScript })
```

## 📊 Validação de Performance
```javascript
// Medir tempo de carregamento
mcp__playwright__playwright_evaluate({
    script: `
        const perfData = performance.getEntriesByType('navigation')[0];
        const metrics = {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            totalTime: perfData.loadEventEnd - perfData.fetchStart
        };
        console.log('PERFORMANCE:', metrics);
        metrics;
    `
})

// Executar auditoria de performance
mcp__btools__runPerformanceAudit()
```

## 🎯 Comandos Rápidos para Copiar

### Validação Completa (1 comando):
```javascript
mcp__playwright__playwright_evaluate({ script: "kcdiag() && KC.AppState.get('files').length && KC.QdrantService.checkConnection() && KC.EmbeddingService.checkOllamaAvailability()" })
```

### Diagnóstico Visual:
```javascript
// Navegar + Screenshot + Logs
mcp__playwright__playwright_navigate({ url: "http://127.0.0.1:5500" })
mcp__playwright__playwright_screenshot({ name: "validation", fullPage: true })
mcp__playwright__playwright_console_logs({ type: "all", limit: 50 })
```

### Reset e Nova Validação:
```javascript
// Limpar logs e revalidar
mcp__btools__wipeLogs()
mcp__playwright__playwright_evaluate({ script: "location.reload()" })
mcp__playwright__playwright_evaluate({ script: "kcdiag()" })
```

## 📈 Métricas de Sucesso

### ✅ Sistema Saudável:
- 20+ componentes KC carregados
- 0 erros no console
- Ollama e Qdrant conectados
- Arquivos carregados no AppState
- Interface responsiva

### ⚡ Performance Esperada:
- Carregamento < 2 segundos
- Validação completa < 30 segundos
- Screenshots instantâneos
- Busca semântica < 500ms

## 🚦 Próximos Passos Após Validação

1. **Desenvolvimento**: Sistema validado, pode prosseguir
2. **Debugging**: Usar console logs capturados
3. **Documentação**: Screenshots salvos automaticamente
4. **Testes**: Executar suítes de teste com Playwright

---

**LEMBRE-SE**: Playwright automatiza TUDO! Não é mais necessário abrir navegador manualmente ou copiar comandos. Validação completa em segundos! 🚀