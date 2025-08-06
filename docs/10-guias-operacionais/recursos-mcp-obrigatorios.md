# Recursos MCP Obrigatórios - Knowledge Consolidator

## 📅 Data de Implementação: 28/01/2025

## 🔧 Recursos MCP que DEVEM ser utilizados no projeto:

### 1. 🌐 Puppeteer
- **Função**: Automação de browser e captura de screenshots
- **Uso no projeto**: 
  - Testes automatizados de interface
  - Captura de screenshots para documentação
  - Validação visual de componentes
  - Testes de fluxo completo (E2E)
- **Comandos úteis**:
  ```javascript
  // Navegar para página
  mcp__puppeteer__puppeteer_navigate({ url: "http://127.0.0.1:5500" })
  
  // Capturar screenshot
  mcp__puppeteer__puppeteer_screenshot({ name: "dashboard", selector: ".workflow-panel" })
  
  // Executar código no console
  mcp__puppeteer__puppeteer_evaluate({ script: "kcdiag()" })
  ```

### 2. 🧠 Memory
- **Função**: Sistema de memória persistente para conhecimento
- **Uso no projeto**:
  - Armazenar contexto entre sessões
  - Criar entidades de conhecimento sobre o projeto
  - Relacionar componentes e suas funções
  - Manter histórico de decisões importantes
- **Comandos úteis**:
  ```javascript
  // Criar entidade
  mcp__memory-serve__create_entities({ entities: [...] })
  
  // Buscar conhecimento
  mcp__memory-serve__search_nodes({ query: "qdrant" })
  
  // Ler grafo completo
  mcp__memory-serve__read_graph()
  ```

### 3. 🤔 Sequential-Think
- **Função**: Pensamento sequencial estruturado para análise complexa
- **Uso no projeto**:
  - Análise de problemas complexos
  - Planejamento de implementações
  - Debug de erros difíceis
  - Arquitetura de novas features
- **Comandos úteis**:
  ```javascript
  // Iniciar pensamento sequencial
  mcp__sequencial-think__sequentialthinking({
    thought: "Analisar fluxo de dados...",
    nextThoughtNeeded: true,
    thoughtNumber: 1,
    totalThoughts: 5
  })
  ```

## 📋 Casos de Uso Específicos

### Para Testes Automatizados:
1. Usar Puppeteer para navegar até a aplicação
2. Executar comandos de diagnóstico
3. Capturar screenshots dos resultados
4. Validar elementos visuais

### Para Documentação:
1. Memory para armazenar decisões arquiteturais
2. Puppeteer para capturar estado visual
3. Sequential-think para análise de impacto

### Para Debug Complexo:
1. Sequential-think para analisar o problema
2. Memory para buscar contexto histórico
3. Puppeteer para reproduzir e validar

## ⚡ Integração com o Sistema

### Exemplo de Workflow Completo:
```javascript
// 1. Pensar sobre o problema
await mcp__sequencial-think__sequentialthinking({
  thought: "Analisar por que arquivos não estão sendo categorizados",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

// 2. Buscar contexto na memória
const context = await mcp__memory-serve__search_nodes({ 
  query: "categorização arquivos" 
});

// 3. Navegar e testar
await mcp__puppeteer__puppeteer_navigate({ 
  url: "http://127.0.0.1:5500" 
});
await mcp__puppeteer__puppeteer_evaluate({ 
  script: "KC.FileRenderer.showFilesSection()" 
});

// 4. Capturar evidência
await mcp__puppeteer__puppeteer_screenshot({ 
  name: "categorization-issue",
  selector: ".file-list"
});

// 5. Armazenar descoberta
await mcp__memory-serve__create_entities({
  entities: [{
    name: "Categorization_Bug_Fix",
    entityType: "Solution",
    observations: ["Bug corrigido", "Screenshot capturado", "Solução documentada"]
  }]
});
```

## 🚨 IMPORTANTE

Estes recursos MCP são OBRIGATÓRIOS e devem ser utilizados sempre que:
- Realizar testes complexos (Puppeteer)
- Precisar manter contexto entre sessões (Memory)
- Analisar problemas complexos (Sequential-think)

A não utilização destes recursos pode resultar em:
- Perda de contexto importante
- Testes manuais demorados
- Análises superficiais
- Documentação incompleta