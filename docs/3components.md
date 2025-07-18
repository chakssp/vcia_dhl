📦 COMPONENTES DETALHADOS

  1. CORE - Núcleo da Aplicação

  AppState.js

  - Expectativa: Gerenciar todo o estado da aplicação de forma centralizada
  - Solução Proposta: Store reativo com observadores para mudanças de estado
  - Objetivo: Manter sincronização entre componentes sem dependências externas
  - Entregável: Classe singleton com métodos get/set/subscribe
  - Funcionalidades:
    - Estado persistente em localStorage
    - Notificação automática de mudanças
    - Validação de estado
    - Histórico de alterações (undo/redo)

  AppController.js

  - Expectativa: Orquestrar navegação e fluxo entre etapas
  - Solução Proposta: Controlador central com roteamento de painéis
  - Objetivo: Controle unificado da aplicação
  - Entregável: Sistema de navegação por etapas
  - Funcionalidades:
    - Navegação entre 4 etapas
    - Validação de progresso
    - Controle de permissões por etapa
    - Gestão de modais e overlays

  EventBus.js

  - Expectativa: Comunicação desacoplada entre componentes
  - Solução Proposta: Sistema pub/sub customizado
  - Objetivo: Permitir comunicação sem dependências diretas
  - Entregável: Event emitter leve e eficiente
  - Funcionalidades:
    - Eventos nomeados
    - Listeners com prioridade
    - Eventos assíncronos
    - Debug mode para rastreamento

  2. MANAGERS - Gerenciadores Funcionais

  ConfigManager.js

  - Expectativa: Centralizar todas as configurações do sistema
  - Solução Proposta: Manager com validação e persistência
  - Objetivo: Configurações flexíveis e validadas
  - Entregável: API de configuração completa
  - Funcionalidades:
    - Configurações por etapa
    - Validação de schemas
    - Import/export de configurações
    - Valores padrão inteligentes

  DiscoveryManager.js

  - Expectativa: Descobrir arquivos seguindo critérios configurados
  - Solução Proposta: Scanner com filtros avançados
  - Objetivo: Localizar arquivos relevantes eficientemente
  - Entregável: Sistema de descoberta multiplataforma
  - Funcionalidades:
    - Scan recursivo de diretórios
    - Filtros por padrão/data/tamanho
    - Cache de resultados
    - Progresso em tempo real

  AnalysisManager.js

  - Expectativa: Gerenciar análises IA com economia de tokens
  - Solução Proposta: Orquestrador de análises com preview inteligente
  - Objetivo: Análise eficiente e econômica
  - Entregável: Pipeline de análise otimizado
  - Funcionalidades:
    - Preview inteligente (5 segmentos)
    - Queue de análise
    - Retry automático
    - Cache de resultados

  CategoryManager.js

  - Expectativa: Sistema flexível de categorização
  - Solução Proposta: Categorias hierárquicas com cores customizáveis
  - Objetivo: Organização intuitiva de conhecimento
  - Entregável: Sistema completo de categorias
  - Funcionalidades:
    - Categorias pré-definidas
    - Criação dinâmica
    - Cores personalizáveis
    - Estatísticas por categoria

  FilterManager.js

  - Expectativa: Filtros dinâmicos com performance
  - Solução Proposta: Sistema de filtros com índices otimizados
  - Objetivo: Navegação rápida em grandes volumes
  - Entregável: Filtros multi-critério
  - Funcionalidades:
    - Filtros combinados
    - Contadores em tempo real
    - Ordenação multi-nível
    - Filtros salvos

  ExportManager.js

  - Expectativa: Exportação em múltiplos formatos RAG-ready
  - Solução Proposta: Pipeline de exportação modular
  - Objetivo: Preparar dados para SPRINT 2
  - Entregável: Exportador multi-formato
  - Funcionalidades:
    - Export JSON (Qdrant-ready)
    - Export Markdown
    - Export PDF/HTML
    - Validação de integridade

  StatsManager.js

  - Expectativa: Estatísticas em tempo real
  - Solução Proposta: Agregador de métricas reativo
  - Objetivo: Visibilidade do progresso
  - Entregável: Dashboard de estatísticas
  - Funcionalidades:
    - Métricas por etapa
    - Gráficos de progresso
    - Timeline de atividades
    - Export de relatórios

  3. COMPONENTS - Componentes UI

  FileRenderer.js

  - Expectativa: Renderização eficiente de listas grandes
  - Solução Proposta: Virtual scrolling com templates
  - Objetivo: Performance com 1000+ arquivos
  - Entregável: Renderer otimizado
  - Funcionalidades:
    - Virtual scrolling
    - Templates customizáveis
    - Ações contextuais
    - Preview inline

  ModalManager.js

  - Expectativa: Sistema unificado de modais
  - Solução Proposta: Manager com stack de modais
  - Objetivo: Experiência consistente
  - Entregável: Sistema completo de modais
  - Funcionalidades:
    - Modais empilháveis
    - Animações suaves
    - Foco automático
    - Atalhos de teclado

  WorkflowPanel.js

  - Expectativa: Navegação visual intuitiva
  - Solução Proposta: Cards interativos com estados
  - Objetivo: Fluxo claro de trabalho
  - Entregável: Painel de 4 etapas
  - Funcionalidades:
    - Estados visuais
    - Progresso por etapa
    - Validação de navegação
    - Tooltips informativos

  FilterBar.js

  - Expectativa: Barra de filtros responsiva
  - Solução Proposta: Componente com badges dinâmicos
  - Objetivo: Filtros acessíveis e informativos
  - Entregável: Barra de filtros completa
  - Funcionalidades:
    - Badges com contadores
    - Filtros combinados
    - Clear all
    - Estados persistentes

  StatsPanel.js

  - Expectativa: Visualização clara de estatísticas
  - Solução Proposta: Widgets configuráveis
  - Objetivo: Métricas relevantes visíveis
  - Entregável: Painel de estatísticas
  - Funcionalidades:
    - Widgets modulares
    - Atualização real-time
    - Drill-down em métricas
    - Export de dados

  4. UTILS - Utilitários

  FileUtils.js

  - Expectativa: Operações robustas com arquivos
  - Solução Proposta: Helpers com tratamento de erros
  - Objetivo: Manipulação segura de arquivos
  - Entregável: Biblioteca de utilidades
  - Funcionalidades:
    - Leitura com encoding
    - Validação de formatos
    - Extração de metadados
    - Hashing de conteúdo

  PreviewUtils.js

  - Expectativa: Geração inteligente de previews
  - Solução Proposta: Parser com regras de extração
  - Objetivo: Economia de 70% tokens
  - Entregável: Sistema de preview
  - Funcionalidades:
    - Extração 5 segmentos
    - Detecção de ':' inteligente
    - Truncamento otimizado
    - Preservação de contexto