# Organização de Arquivos Temporários - 28/01/2025

## 📁 Situação Atual

### Arquivos de Correção de Bugs (fix-*.js) na Raiz:
1. `fix-approved-files.js` - Correção de arquivos aprovados
2. `fix-threshold-semantico.js` - Ajuste de threshold semântico
3. `fix-content-persistence.js` - Correção de persistência de conteúdo
4. `fix-analysis-issues.js` - Correção de problemas de análise
5. `fix-wave10-registration.js` - Correção de registro da Wave 10
6. `fix-diagnostic-errors.js` - Correção de erros de diagnóstico
7. `fix-triple-store-init.js` - Correção de inicialização do Triple Store
8. `fix-refinement-detector.js` - Correção do detector de refinamento
9. `fix-refinement-detector-dom.js` - Correção DOM do detector
10. `fix-content-access-system-wide.js` - Correção de acesso a conteúdo
11. `fix-refinement-loop.js` - Correção de loop de refinamento
12. `fix-refinement-detector-robust.js` - Versão robusta do detector

### Arquivos de Debug (debug-*.js) na Raiz:
1. `debug-busca-similares.js` - Debug de busca por similaridade
2. `debug-refinement-error.js` - Debug de erros de refinamento

### Arquivos de Teste (test-*.html) na Raiz:
1. `test-schema-org.html` - Teste de Schema.org
2. `test-filerenderer-load.html` - Teste de carregamento do FileRenderer
3. `test-ciclo-refinamento.html` - Teste de ciclo de refinamento
4. `test-refinement-cycle.html` - Teste de ciclo de refinamento (duplicado?)
5. `test-analise-semantica.html` - Teste de análise semântica
6. `test-diagnostico.html` - Teste de diagnóstico
7. `test-qdrant-verification.html` - Verificação do Qdrant
8. `test-debug-qdrant.html` - Debug do Qdrant
9. `test-schema-org-integration.html` - Integração Schema.org
10. `test-schema-org-export.html` - Exportação Schema.org
11. `test-schema-org-simple.html` - Schema.org simples
12. `test-export-schema-direct.html` - Exportação direta de schema
13. `test-export-fix.html` - Correção de exportação
14. `test-analysistype-field.html` - Campo de tipo de análise

### Arquivos de Teste (test-*.js) na Raiz:
1. `test-content-persistence.js` - Teste de persistência
2. `test-production-checklist.js` - Checklist de produção
3. `test-triple-store-complete.js` - Teste completo do Triple Store
4. `test-dom-content-fix.js` - Correção de conteúdo DOM

### Outros Scripts Temporários na Raiz:
1. `verificar-qdrant-dados.js` - Verificação de dados do Qdrant
2. `verificar-pontos-recentes.js` - Verificação de pontos recentes
3. `limpar-e-reprocessar-qdrant.js` - Limpeza e reprocessamento
4. `verificar-nova-estrutura.js` - Verificação de estrutura
5. `diagnosticar-arquivos-faltantes.js` - Diagnóstico de arquivos
6. `aprovar-e-categorizar-arquivos.js` - Aprovação e categorização
7. `reprocessar-com-categorias.js` - Reprocessamento com categorias
8. `corrigir-analise-semantica.js` - Correção de análise semântica
9. `melhorar-deteccao-local.js` - Melhoria de detecção local
10. `poc-wave5-validation.js` - Validação POC Wave 5
11. `verify-wave10-fix.js` - Verificação de correção Wave 10
12. `validate-wave10-integration.js` - Validação de integração Wave 10
13. `ensure-dom-content.js` - Garantir conteúdo DOM
14. `monitor-content-errors.js` - Monitorar erros de conteúdo
15. `apply-all-fixes.js` - Aplicar todas as correções

### Arquivos HTML Específicos na Raiz:
1. `poc-wave5-demo.html` - Demo POC Wave 5
2. `qdrant-diagnostics.html` - Diagnóstico do Qdrant
3. `qdrant-viewer.html` - Visualizador do Qdrant

### Arquivos MD de Correção na Raiz:
1. `fix-wave-integration-issues.md` - Problemas de integração Wave
2. `wave10-fix-instructions.md` - Instruções de correção Wave 10
3. `wave10-fixes-summary.md` - Resumo de correções Wave 10
4. `wave10-integration-architecture.md` - Arquitetura de integração
5. `wave10-next-steps.md` - Próximos passos Wave 10
6. `wave10-production-components.md` - Componentes de produção
7. `waves-architecture-map.md` - Mapa de arquitetura das Waves

## 📊 Estatísticas
- **Total de arquivos temporários na raiz**: ~45 arquivos
- **Arquivos fix-*.js**: 12
- **Arquivos debug-*.js**: 2
- **Arquivos test-*.html**: 14
- **Arquivos test-*.js**: 4
- **Outros scripts temporários**: 15
- **Arquivos HTML específicos**: 3
- **Arquivos MD de correção**: 7

## 🎯 Proposta de Organização

### 1. Criar estrutura de pastas:
```
/temp/
  /fixes/          # Arquivos fix-*.js
  /debug/          # Arquivos debug-*.js
  /validation/     # Scripts de verificação e validação
  /poc/            # POCs e demos
  /wave10-fixes/   # Correções específicas da Wave 10

/test/
  /html/           # Arquivos test-*.html
  /integration/    # Testes de integração
  /unit/           # Testes unitários
```

### 2. Mover documentação de correções:
- Mover arquivos MD de correção para `/docs/11-pendencias-revisao/wave10/`

### 3. Atualizar .gitignore:
```gitignore
# Arquivos temporários
/temp/
*.tmp
*.temp
fix-*.js
debug-*.js
test-*.html
verificar-*.js
diagnosticar-*.js
```

## 🚀 Próximos Passos
1. Criar as pastas propostas
2. Mover arquivos para locais apropriados
3. Atualizar .gitignore
4. Documentar no README a nova estrutura
5. Fazer commit das mudanças