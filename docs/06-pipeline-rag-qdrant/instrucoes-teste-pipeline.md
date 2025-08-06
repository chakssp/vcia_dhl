# 🚀 Instruções para Testar o Pipeline de Processamento

## 1. Acessar a Etapa 4 (OrganizationPanel)

### Opção A: Navegação Direta (Recomendada)
No console do navegador em http://127.0.0.1:5500, execute:

```javascript
// Força navegação para Etapa 4
goToStep4()
```

Ou se a função não estiver disponível:

```javascript
// Navega diretamente
KC.AppController.navigateToStep(4)
```

### Opção B: Navegação Manual
1. Clique nas etapas 1, 2 e 3 sequencialmente
2. Depois clique na Etapa 4

## 2. Verificar se o Pipeline está Visível

Após acessar a Etapa 4, você deve ver:
- 🚀 **Pipeline de Processamento RAG** - Uma seção com botão azul
- **Botão**: "🔄 Processar Arquivos Aprovados"

Se não estiver visível, execute no console:
```javascript
debugOrg()  // Diagnóstico completo
```

## 3. Testar o Pipeline

### Pré-requisitos:
1. **Ollama** deve estar rodando em http://127.0.0.1:11434
2. **Qdrant** deve estar acessível em http://qdr.vcia.com.br:6333
3. Ter arquivos aprovados (com análise concluída)

### Execução:
1. Clique no botão "🔄 Processar Arquivos Aprovados"
2. Acompanhe o progresso na barra
3. Verifique os resultados exibidos

## 4. Página de Teste Completa

Também criamos uma página de teste dedicada:
```
http://127.0.0.1:5500/test/test-pipeline-processing.html
```

Esta página permite:
- Verificar status dos serviços
- Criar dados de teste
- Testar componentes individuais
- Executar o pipeline completo
- Fazer buscas semânticas

## 5. Troubleshooting

### Se a Etapa 4 continuar em branco:
1. Verifique o console para erros
2. Execute `KC.OrganizationPanel.initialize()` e depois `KC.OrganizationPanel.render()`
3. Verifique se o arquivo OrganizationPanel.js está carregado: `typeof KC.OrganizationPanel`

### Se o botão do pipeline não aparecer:
1. Inspecione o elemento com ID "organization-panel"
2. Verifique se existe a div com classe "pipeline-section"
3. Force a renderização: `KC.OrganizationPanel.render()`

### Para debug detalhado:
```javascript
// Verifica componentes
console.log('RAGExportManager:', typeof KC.RAGExportManager)
console.log('EmbeddingService:', typeof KC.EmbeddingService)
console.log('QdrantService:', typeof KC.QdrantService)
console.log('OrganizationPanel:', typeof KC.OrganizationPanel)

// Verifica métodos
console.log('processApprovedFiles:', typeof KC.RAGExportManager.processApprovedFiles)
console.log('processWithPipeline:', typeof KC.OrganizationPanel.processWithPipeline)
```

## 6. Verificação Final

O pipeline está funcionando se:
- ✅ O botão "Processar Arquivos Aprovados" está visível
- ✅ Ao clicar, mostra progresso
- ✅ Serviços Ollama e Qdrant estão online
- ✅ Processamento conclui sem erros
- ✅ Resultados mostram documentos processados

---

**NOTA**: Se precisar forçar a exibição do OrganizationPanel, use as funções de debug em `/js/debug-organization.js`