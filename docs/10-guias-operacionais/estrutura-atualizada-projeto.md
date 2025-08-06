# Estrutura Atualizada do Projeto - 28/01/2025

## 📁 Estrutura Principal do Sistema

```
vcia_dhl/
├── index.html                    # Aplicação principal
├── package.json                  # Configuração do projeto
├── README.md                     # Documentação principal
├── CLAUDE.md                     # LEIS do projeto
├── RESUME-STATUS.md              # Status atual do desenvolvimento
├── INICIO-SESSAO.md              # Protocolo de início
│
├── css/                          # Estilos organizados
│   ├── main.css                  # Estilo principal
│   ├── components/               # Estilos por componente
│   │   ├── export-ui.css
│   │   ├── file-list.css
│   │   ├── filter-panel.css
│   │   ├── graph-visualization.css
│   │   ├── modals.css
│   │   ├── organization-panel.css
│   │   ├── stats.css
│   │   ├── workflow.css
│   │   └── ...
│   └── utils/                    # Utilitários CSS
│       ├── animations.css
│       ├── dark-mode.css
│       ├── responsive.css
│       └── variables.css
│
├── js/                           # JavaScript organizado
│   ├── app.js                    # Aplicação principal
│   ├── components/               # Componentes UI
│   │   ├── FileRenderer.js
│   │   ├── FilterPanel.js
│   │   ├── OrganizationPanel.js
│   │   ├── WorkflowPanel.js
│   │   ├── GraphVisualization.js
│   │   └── ...
│   ├── core/                     # Núcleo do sistema
│   │   ├── AppController.js
│   │   ├── AppState.js
│   │   └── EventBus.js
│   ├── managers/                 # Gerenciadores
│   │   ├── AnalysisManager.js
│   │   ├── CategoryManager.js
│   │   ├── DiscoveryManager.js
│   │   ├── RAGExportManager.js
│   │   └── ...
│   ├── services/                 # Serviços
│   │   ├── EmbeddingService.js
│   │   ├── QdrantService.js
│   │   ├── SimilaritySearchService.js
│   │   └── ...
│   ├── utils/                    # Utilitários
│   │   ├── PreviewUtils.js
│   │   ├── ChunkingUtils.js
│   │   ├── Logger.js
│   │   └── ...
│   └── wave10/                   # Componentes Wave 10
│       ├── ABTestingFramework.js
│       ├── CanaryController.js
│       └── ...
│
├── docs/                         # Documentação organizada
│   ├── 01-valorizacao-categorias-humanas/
│   ├── 02-integracao-embeddings-ollama/
│   ├── 03-analise-correlacoes-sistema/
│   ├── 04-bugs-resolvidos/
│   ├── 05-grafos-visualizacao/
│   ├── 06-pipeline-rag-qdrant/
│   ├── 08-security-aes256/
│   ├── 09-arquitetura-decisoes/
│   ├── 10-guias-operacionais/
│   ├── 11-pendencias-revisao/
│   │   └── wave10/              # Docs Wave 10 movidos
│   └── INDICE-DOCUMENTACAO.md   # Índice geral
│
├── agents_output/                # Saída dos agentes ML
│   ├── wave1/                    # Wave 1 completa
│   ├── wave2/                    # Wave 2 completa
│   ├── ...
│   └── wave10/                   # Wave 10 completa
│
├── specs/                        # Especificações
│   ├── feature-ml-confidence-integration/
│   ├── wave10-production-spec.md
│   └── ...
│
├── test/                         # Testes organizados
│   ├── html/                     # Páginas de teste movidas
│   ├── integration/              # Testes de integração
│   └── unit/                     # Testes unitários
│
├── temp/                         # Arquivos temporários organizados
│   ├── fixes/                    # Scripts fix-*.js
│   ├── debug/                    # Scripts debug-*.js
│   ├── validation/               # Scripts de validação
│   ├── poc/                      # POCs e demos
│   └── wave10-fixes/             # Correções Wave 10
│
├── mdesk/                        # Sistema de teste
├── claude-code-setup/            # Setup do Claude Code
└── ai_docs/                      # Documentação AI
```

## 🎯 Arquivos Principais na Raiz

### Configuração e Documentação:
- `index.html` - Aplicação principal
- `package.json` - Configuração NPM
- `README.md` - Visão geral do projeto
- `CLAUDE.md` - LEIS e diretrizes do projeto
- `RESUME-STATUS.md` - Status atual detalhado
- `INICIO-SESSAO.md` - Protocolo de início de sessão

### Arquivos de Controle:
- `.gitignore` - Atualizado com novos padrões
- `vcia_dhl.code-workspace` - Workspace do VS Code

## 📊 Mudanças Realizadas

### 1. **Organização de Arquivos Temporários**
- Movidos ~45 arquivos da raiz para pastas apropriadas
- Criada estrutura `/temp/` para arquivos temporários
- Separados por tipo: fixes, debug, validation, poc

### 2. **Reorganização de Testes**
- Movidos arquivos `test-*.html` para `/test/html/`
- Estrutura preparada para testes unitários e de integração

### 3. **Documentação Wave 10**
- Movidos arquivos MD de correção para `/docs/11-pendencias-revisao/wave10/`
- Melhor organização da documentação de correções

### 4. **Atualização do .gitignore**
- Adicionados padrões para ignorar arquivos temporários
- Evita poluição do repositório com arquivos de debug

## ✅ Benefícios da Nova Estrutura

1. **Raiz Limpa**: Apenas arquivos essenciais na raiz
2. **Organização Lógica**: Arquivos agrupados por função
3. **Fácil Navegação**: Estrutura intuitiva e bem documentada
4. **Manutenção Simplificada**: Arquivos temporários isolados
5. **Git Mais Limpo**: .gitignore atualizado evita commits desnecessários

## 🚀 Próximos Passos Recomendados

1. **Revisar arquivos em `/temp/`** - Alguns podem ser deletados
2. **Documentar scripts úteis** - Alguns scripts de validação podem ser permanentes
3. **Criar README em `/temp/`** - Explicar o propósito de cada subpasta
4. **Limpar `/test/`** - Remover testes obsoletos
5. **Atualizar CI/CD** - Ajustar caminhos se necessário

## 📝 Notas Importantes

- A pasta `/temp/` está no .gitignore e não será commitada
- Scripts úteis de validação podem ser movidos para uma pasta permanente
- A estrutura facilita a identificação de código de produção vs temporário
- Documentação centralizada em `/docs/` com índice geral