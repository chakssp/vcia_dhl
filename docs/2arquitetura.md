● 📋 PLANEJAMENTO COMPLETO - CONSOLIDADOR DE CONHECIMENTO PESSOAL

  🏗️ ARQUITETURA DE PASTAS PROPOSTA

  knowledge-consolidator/
  ├── index.html                    # Arquivo principal HTML
  ├── package.json                  # Configuração do projeto (opcional para
  scripts)
  ├── README.md                     # Documentação do projeto
  ├── .gitignore                    # Arquivos ignorados pelo git
  │
  ├── assets/                       # Recursos estáticos
  │   ├── icons/                    # Ícones SVG/PNG
  │   │   ├── discovery.svg
  │   │   ├── analysis.svg
  │   │   ├── organization.svg
  │   │   └── export.svg
  │   └── images/                   # Imagens do projeto
  │       └── logo.png
  │
  ├── css/                          # Estilos CSS
  │   ├── main.css                  # Estilos principais
  │   ├── components/               # Estilos por componente
  │   │   ├── workflow.css          # Cards de workflow
  │   │   ├── filters.css           # Sistema de filtros
  │   │   ├── file-list.css         # Lista de arquivos
  │   │   ├── modals.css            # Modais
  │   │   └── stats.css             # Estatísticas
  │   └── utils/                    # Utilitários CSS
  │       ├── variables.css         # Variáveis CSS globais
  │       ├── animations.css        # Animações
  │       └── responsive.css        # Media queries
  │
  ├── js/                           # Código JavaScript
  │   ├── app.js                    # Inicialização principal
  │   ├── core/                     # Módulos principais
  │   │   ├── AppState.js           # Estado global da aplicação
  │   │   ├── AppController.js      # Controlador principal
  │   │   └── EventBus.js           # Sistema de eventos
  │   │
  │   ├── managers/                 # Gerenciadores funcionais
  │   │   ├── ConfigManager.js      # Configurações
  │   │   ├── DiscoveryManager.js   # Descoberta de arquivos
  │   │   ├── AnalysisManager.js    # Análise IA
  │   │   ├── CategoryManager.js    # Sistema de categorias
  │   │   ├── FilterManager.js      # Filtros e ordenação
  │   │   ├── ExportManager.js      # Exportação e RAG
  │   │   └── StatsManager.js       # Estatísticas
  │   │
  │   ├── components/               # Componentes UI
  │   │   ├── FileRenderer.js       # Renderização de arquivos
  │   │   ├── ModalManager.js       # Gerenciamento de modais
  │   │   ├── WorkflowPanel.js      # Painel de workflow
  │   │   ├── FilterBar.js          # Barra de filtros
  │   │   └── StatsPanel.js         # Painel de estatísticas
  │   │
  │   └── utils/                    # Utilitários
  │       ├── FileUtils.js          # Manipulação de arquivos
  │       ├── DateUtils.js          # Formatação de datas
  │       ├── PreviewUtils.js       # Preview inteligente
  │       └── ValidationUtils.js    # Validações
  │
  ├── templates/                    # Templates HTML (opcional)
  │   ├── file-card.html
  │   ├── modal-content.html
  │   └── stats-widget.html
  │
  └── config/                       # Configurações
      ├── defaults.json             # Configurações padrão
      └── categories.json           # Categorias pré-definidas