# 🚀 PROTOCOLO DE INÍCIO DE SESSÃO COM PLAYWRIGHT - KNOWLEDGE CONSOLIDATOR

> **CRÍTICO**: Este protocolo usa PLAYWRIGHT como padrão definitivo para automação e validação do sistema.
> **ATUALIZADO**: 03/08/2025 - Substituindo Puppeteer por Playwright MCP

---

## 📋 COMANDO DE INÍCIO OBRIGATÓRIO COM PLAYWRIGHT

### 🎭 NOVO - Comando com Playwright (Padrão Definitivo):
```
Leia @CLAUDE.md e @RESUME-STATUS.md. Use Playwright MCP para validar o sistema:
1. mcp__playwright__playwright_navigate para acessar http://127.0.0.1:5500
2. mcp__playwright__playwright_evaluate para executar kcdiag()
3. mcp__playwright__playwright_console_logs para verificar erros
Siga @docs/10-guias-operacionais/validacao-rapida-playwright.md para validação completa.
```

### Comando Detalhado com Playwright:
```
Início de sessão Knowledge Consolidator com Playwright:
1. Ler LEIS em @CLAUDE.md e estado atual em @RESUME-STATUS.md
2. Navegar para http://127.0.0.1:5500 usando mcp__playwright__playwright_navigate
3. Executar diagnóstico: mcp__playwright__playwright_evaluate com kcdiag()
4. Capturar logs: mcp__playwright__playwright_console_logs
5. Screenshot de validação: mcp__playwright__playwright_screenshot
Servidor Five Server gerenciado pelo usuário (porta 5500).
```

---

## 📖 ORDEM DE LEITURA E VALIDAÇÃO

### 1️⃣ PRIMEIRO: Contexto do Projeto
- **CLAUDE.md** - LEIS e estado atual
- **RESUME-STATUS.md** - Status detalhado
- **Tempo**: 2 minutos

### 2️⃣ SEGUNDO: Validação Automatizada com Playwright
```javascript
// Sequência de validação com Playwright MCP:

// 1. Navegar para aplicação
mcp__playwright__playwright_navigate({
    url: "http://127.0.0.1:5500",
    browserType: "chromium",
    headless: false
})

// 2. Executar diagnóstico
mcp__playwright__playwright_evaluate({
    script: "kcdiag()"
})

// 3. Verificar componentes carregados
mcp__playwright__playwright_evaluate({
    script: "KC.AppState.get('files').length"
})

// 4. Capturar logs para análise
mcp__playwright__playwright_console_logs({
    type: "all",
    limit: 100
})

// 5. Screenshot de confirmação
mcp__playwright__playwright_screenshot({
    name: "validation-complete",
    fullPage: true
})
```

### 3️⃣ TERCEIRO: Validação de Serviços
```javascript
// Verificar serviços externos via Playwright
mcp__playwright__playwright_evaluate({
    script: `
        Promise.all([
            KC.EmbeddingService.checkOllamaAvailability(),
            KC.QdrantService.checkConnection(),
            KC.SimilaritySearchService.getStats()
        ]).then(results => console.log('Services Status:', results))
    `
})
```

---

## ✅ CHECKLIST AUTOMATIZADO COM PLAYWRIGHT

### 🤖 Validação Completa Automatizada:
```javascript
// Script completo de validação
const validationScript = `
    (async () => {
        const results = {
            timestamp: new Date().toISOString(),
            diagnostics: kcdiag(),
            files: {
                total: KC.AppState.get('files').length,
                analyzed: KC.AppState.get('files').filter(f => f.analyzed).length,
                categorized: KC.AppState.get('files').filter(f => f.categories?.length > 0).length
            },
            services: {
                ollama: await KC.EmbeddingService.checkOllamaAvailability().catch(e => ({error: e.message})),
                qdrant: await KC.QdrantService.checkConnection().catch(e => ({error: e.message}))
            },
            currentStep: KC.AppController.currentStep,
            errors: window.__validationErrors || []
        };
        console.log('VALIDATION_RESULTS:', JSON.stringify(results, null, 2));
        return results;
    })();
`;

// Executar validação
mcp__playwright__playwright_evaluate({ script: validationScript })

// Capturar resultados
mcp__playwright__playwright_console_logs({ 
    search: "VALIDATION_RESULTS",
    limit: 1 
})
```

---

## 🚫 MUDANÇAS DO PROTOCOLO ANTIGO

### ❌ NÃO FAZER MAIS:
- ~~Acessar manualmente http://127.0.0.1:5500~~
- ~~Abrir console do navegador manualmente~~
- ~~Copiar/colar comandos no console~~
- ~~Usar Puppeteer MCP (defasado)~~

### ✅ FAZER AGORA:
- Usar Playwright MCP para toda automação
- Validação automatizada via scripts
- Captura automática de logs e erros
- Screenshots para documentação

---

## 📊 BENEFÍCIOS DO PLAYWRIGHT

### 🎯 Vantagens sobre método anterior:
1. **Automação Total** - Sem intervenção manual
2. **Validação Consistente** - Mesmos testes sempre
3. **Captura de Erros** - Logs automáticos
4. **Documentação Visual** - Screenshots automáticos
5. **Performance** - Validação em segundos

### 🔧 Recursos Exclusivos Playwright:
- Multi-browser support (Chromium, Firefox, WebKit)
- Melhor handling de iframes
- Network interception
- Better error messages
- Mais estável que Puppeteer

---

## 🔥 COMANDOS RÁPIDOS PLAYWRIGHT

### Validação Express (1 comando):
```javascript
// Validação completa em um comando
mcp__playwright__playwright_evaluate({
    script: `
        kcdiag() && 
        KC.AppState.get('files').length && 
        KC.QdrantService.checkConnection() && 
        KC.EmbeddingService.checkOllamaAvailability()
    `
})
```

### Debug Rápido:
```javascript
// Ver erros do console
mcp__playwright__playwright_console_logs({ type: "error" })

// Ver estado atual
mcp__playwright__playwright_evaluate({ 
    script: "KC.AppController.currentStep" 
})

// Screenshot do estado
mcp__playwright__playwright_screenshot({ 
    name: "current-state" 
})
```

---

## 📝 TEMPLATE DE INÍCIO COM PLAYWRIGHT

```
Iniciando sessão Knowledge Consolidator com validação Playwright:

1. Li CLAUDE.md e RESUME-STATUS.md ✓
2. Executando validação automatizada com Playwright...
   [usar comandos Playwright acima]
3. Aguardando resultados da validação...
4. Pronto para prosseguir com desenvolvimento

Contexto: [descrever objetivo da sessão]
```

---

## 🚨 TROUBLESHOOTING PLAYWRIGHT

### Se Playwright não conecta:
```javascript
// Tentar com diferentes opções
mcp__playwright__playwright_navigate({
    url: "http://127.0.0.1:5500",
    browserType: "chromium",
    headless: true,  // mudar para true se headless
    timeout: 30000   // aumentar timeout
})
```

### Se comandos não executam:
```javascript
// Verificar se página carregou
mcp__playwright__playwright_evaluate({
    script: "document.readyState"
})

// Aguardar carregamento completo
mcp__playwright__playwright_evaluate({
    script: "window.KC ? 'Ready' : 'Not Ready'"
})
```

---

**IMPORTANTE**: Este protocolo substitui definitivamente o uso de Puppeteer. 
Playwright é mais moderno, estável e tem melhor suporte.

**Tempo total de validação: < 2 minutos** (vs 5+ minutos manual)