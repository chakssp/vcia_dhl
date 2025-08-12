/**
 * InteractiveHelp - In-app help system with tooltips, onboarding, and contextual assistance
 * 
 * @purpose Provides interactive guidance and help throughout the application
 * @dependencies EventBus, AppState, ModalManager
 * @events HELP_OPENED, HELP_CLOSED, ONBOARDING_STARTED, ONBOARDING_COMPLETED
 */

class InteractiveHelp {
  constructor() {
    this.initialized = false
    this.logger = window.KC?.Logger || console
    this.onboardingActive = false
    this.currentTour = null
    this.tooltips = new Map()
    this.helpContent = new Map()
    
    // Configuration
    this.config = {
      showOnFirstVisit: true,
      autoShowTooltips: true,
      tourStepDelay: 1000,
      tooltipDelay: 500,
      persistProgress: true
    }
    
    // Initialize help content
    this.initializeHelpContent()
    this.initializeTooltips()
    
    // Setup event listeners
    this.setupEventListeners()
  }

  /**
   * Initialize the interactive help system
   */
  async initialize() {
    if (this.initialized) return

    try {
      // Create help UI elements
      this.createHelpButton()
      this.createTooltipContainer()
      this.createOnboardingOverlay()
      
      // Check if first visit
      if (this.shouldShowOnboarding()) {
        setTimeout(() => this.startOnboarding(), 2000)
      }
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts()
      
      this.initialized = true
      this.logger.info('InteractiveHelp initialized')
      
    } catch (error) {
      this.logger.error('InteractiveHelp initialization failed', error)
      throw error
    }
  }

  /**
   * Initialize help content database
   */
  initializeHelpContent() {
    this.helpContent = new Map([
      // Step 1: Discovery
      ['step-1-discovery', {
        title: '🔍 Descoberta de Arquivos',
        content: `
          <div class="help-content">
            <h3>Como Descobrir Arquivos</h3>
            <ol>
              <li><strong>Selecionar Pasta:</strong> Clique em "📁 Selecionar Pasta" e escolha sua base de conhecimento</li>
              <li><strong>Detecção Automática:</strong> O sistema detecta automaticamente Obsidian Vaults</li>
              <li><strong>Filtros:</strong> Use os filtros para refinar os resultados:
                <ul>
                  <li>Relevância mínima (30%, 50%, 70%, 90%)</li>
                  <li>Período temporal (1m, 3m, 6m, 1a, 2a)</li>
                  <li>Tipos de arquivo (.md, .txt, .docx, .pdf)</li>
                </ul>
              </li>
            </ol>
            
            <div class="help-tip">
              💡 <strong>Dica:</strong> Arquivos categorizados manualmente recebem boost automático de relevância!
            </div>
            
            <h4>Comandos de Debug</h4>
            <code>KC.DiscoveryManager.getStats()</code> - Ver estatísticas de descoberta<br>
            <code>KC.HandleManager.list()</code> - Listar handles de arquivo
          </div>
        `,
        actions: [
          { text: 'Iniciar Descoberta', action: 'startDiscovery' },
          { text: 'Ver Filtros', action: 'showFilters' }
        ]
      }],
      
      // Step 2: Pre-Analysis
      ['step-2-preanalysis', {
        title: '📝 Pré-Análise Local',
        content: `
          <div class="help-content">
            <h3>Sistema de Preview Inteligente</h3>
            <p>Nossa tecnologia de preview reduz o uso de tokens em 70% através de:</p>
            
            <h4>5 Segmentos Semânticos:</h4>
            <ol>
              <li>Primeiras 30 palavras</li>
              <li>Segundo parágrafo completo</li>
              <li>Último parágrafo antes de ':'</li>
              <li>Frase com ':'</li>
              <li>30 palavras após ':'</li>
            </ol>
            
            <h4>Ações Disponíveis:</h4>
            <ul>
              <li><strong>🔍 Analisar:</strong> Enviar para análise IA</li>
              <li><strong>👁️ Ver:</strong> Visualizar conteúdo completo</li>
              <li><strong>📂 Categorizar:</strong> Adicionar categorias manualmente</li>
              <li><strong>📦 Arquivar:</strong> Mover para arquivados</li>
            </ul>
            
            <div class="help-tip">
              ⚡ <strong>Performance:</strong> Use Bulk Actions para processar múltiplos arquivos simultaneamente!
            </div>
          </div>
        `,
        actions: [
          { text: 'Ver Arquivos', action: 'showFiles' },
          { text: 'Bulk Actions', action: 'showBulkActions' }
        ]
      }],
      
      // Step 3: AI Analysis
      ['step-3-analysis', {
        title: '🤖 Análise com IA',
        content: `
          <div class="help-content">
            <h3>Sistema Multi-Provider de IA</h3>
            
            <h4>Providers Suportados:</h4>
            <ul>
              <li><strong>Ollama (Recomendado):</strong> Local, privado, gratuito</li>
              <li><strong>OpenAI:</strong> GPT-3.5/4 - Alta qualidade</li>
              <li><strong>Google Gemini:</strong> Multimodal, competitivo</li>
              <li><strong>Anthropic Claude:</strong> Respostas detalhadas</li>
            </ul>
            
            <h4>Templates de Análise:</h4>
            <ul>
              <li><strong>Momentos Decisivos:</strong> Identifica pontos de virada</li>
              <li><strong>Insights Técnicos:</strong> Soluções e breakthroughs</li>
              <li><strong>Análise de Projetos:</strong> Potencial e viabilidade</li>
            </ul>
            
            <h4>UnifiedConfidenceSystem:</h4>
            <p>Scores de confiança ML calculados em tempo real durante a descoberta:</p>
            <ul>
              <li>Similaridade Qdrant (40%)</li>
              <li>Relevância Local (30%)</li>
              <li>Boost Categorias (20%)</li>
              <li>Features Estruturais (10%)</li>
            </ul>
            
            <div class="help-warning">
              ⚠️ <strong>Configuração:</strong> Configure pelo menos um provider antes de iniciar análise!
            </div>
          </div>
        `,
        actions: [
          { text: 'Configurar APIs', action: 'openAPIConfig' },
          { text: 'Iniciar Análise', action: 'startAnalysis' }
        ]
      }],
      
      // Step 4: Organization
      ['step-4-organization', {
        title: '📚 Organização Inteligente',
        content: `
          <div class="help-content">
            <h3>Sistema de Organização e Exportação</h3>
            
            <h4>Categorização Inteligente:</h4>
            <ul>
              <li>Sistema hierárquico com cores automáticas</li>
              <li>Sugestões baseadas em ML</li>
              <li>Sincronização em tempo real</li>
              <li>Boost automático de relevância</li>
            </ul>
            
            <h4>Pipeline RAG:</h4>
            <p>Exportação otimizada para sistemas RAG:</p>
            <ol>
              <li>Chunking semântico inteligente</li>
              <li>Embeddings com Ollama (768D)</li>
              <li>Inserção no Qdrant</li>
              <li>Validação de qualidade</li>
            </ol>
            
            <h4>Formatos de Exportação:</h4>
            <ul>
              <li><strong>JSON RAG:</strong> Compatível com Qdrant</li>
              <li><strong>Markdown:</strong> Para Obsidian</li>
              <li><strong>PDF:</strong> Para documentação</li>
              <li><strong>CSV:</strong> Para análise de dados</li>
            </ul>
            
            <div class="help-success">
              ✅ <strong>Integração:</strong> Dados prontos para N8N, automações e sistemas externos!
            </div>
          </div>
        `,
        actions: [
          { text: 'Processar Pipeline', action: 'processPipeline' },
          { text: 'Exportar Dados', action: 'showExportOptions' }
        ]
      }],
      
      // API Configuration
      ['api-configuration', {
        title: '🔧 Configuração de APIs',
        content: `
          <div class="help-content">
            <h3>Como Configurar APIs de IA</h3>
            
            <h4>1. Ollama (Recomendado - Local)</h4>
            <pre><code># Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixar modelos
ollama pull llama2
ollama pull nomic-embed-text

# Verificar
curl http://localhost:11434/api/tags</code></pre>
            
            <h4>2. OpenAI</h4>
            <ol>
              <li>Acesse: <a href="https://platform.openai.com" target="_blank">platform.openai.com</a></li>
              <li>Navegue: API → API Keys</li>
              <li>Clique "Create new secret key"</li>
              <li>Cole a key no campo OpenAI</li>
            </ol>
            
            <h4>3. Google Gemini</h4>
            <ol>
              <li>Acesse: <a href="https://makersuite.google.com" target="_blank">makersuite.google.com</a></li>
              <li>Clique "Get API Key"</li>
              <li>Configure billing</li>
              <li>Cole a key no campo Gemini</li>
            </ol>
            
            <h4>4. Anthropic Claude</h4>
            <ol>
              <li>Acesse: <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></li>
              <li>Settings → API Keys</li>
              <li>Create Key</li>
              <li>Cole a key no campo Claude</li>
            </ol>
            
            <div class="help-tip">
              🔐 <strong>Segurança:</strong> Todas as API keys são criptografadas com AES-256!
            </div>
          </div>
        `,
        actions: [
          { text: 'Abrir Configuração', action: 'openAPIConfig' },
          { text: 'Testar Ollama', action: 'testOllama' }
        ]
      }],
      
      // Troubleshooting
      ['troubleshooting', {
        title: '🔧 Solução de Problemas',
        content: `
          <div class="help-content">
            <h3>Problemas Comuns e Soluções</h3>
            
            <h4>1. Sistema não carrega</h4>
            <ul>
              <li>Limpar cache: <kbd>Ctrl+Shift+R</kbd></li>
              <li>Verificar console: <kbd>F12</kbd></li>
              <li>Executar: <code>kcdiag()</code></li>
            </ul>
            
            <h4>2. Arquivos não aparecem</h4>
            <ul>
              <li>Verificar permissões do navegador</li>
              <li>Reselecionar pasta</li>
              <li>Limpar filtros: <code>KC.FilterManager.clearAllFilters()</code></li>
            </ul>
            
            <h4>3. Ollama não conecta</h4>
            <ul>
              <li>Verificar se está rodando: <code>curl http://localhost:11434/api/tags</code></li>
              <li>Reinstalar Ollama</li>
              <li>Baixar modelos necessários</li>
            </ul>
            
            <h4>4. APIs não funcionam</h4>
            <ul>
              <li>Verificar API keys</li>
              <li>Conferir billing/créditos</li>
              <li>Testar provider: <code>KC.AIAPIManager.testProvider('openai')</code></li>
            </ul>
            
            <h4>5. Performance lenta</h4>
            <ul>
              <li>Limpar cache: <code>KC.MemoryOptimizer.cleanup()</code></li>
              <li>Reduzir batch size</li>
              <li>Usar filtros mais restritivos</li>
            </ul>
            
            <h4>Comandos de Debug:</h4>
            <code>kcdiag()</code> - Diagnóstico completo<br>
            <code>KC.Logger.getRecentLogs('error')</code> - Ver erros<br>
            <code>KC.AppState.getStats()</code> - Estatísticas do sistema
          </div>
        `,
        actions: [
          { text: 'Executar Diagnóstico', action: 'runDiagnostic' },
          { text: 'Limpar Cache', action: 'clearCache' }
        ]
      }]
    ])
  }

  /**
   * Initialize tooltip definitions
   */
  initializeTooltips() {
    this.tooltips = new Map([
      // Workflow steps
      ['[data-step="1"]', {
        title: 'Etapa 1: Descoberta',
        content: 'Selecione uma pasta e configure filtros para descobrir arquivos relevantes',
        position: 'bottom'
      }],
      ['[data-step="2"]', {
        title: 'Etapa 2: Pré-Análise',
        content: 'Visualize arquivos descobertos com preview inteligente e categorize manualmente',
        position: 'bottom'
      }],
      ['[data-step="3"]', {
        title: 'Etapa 3: Análise IA',
        content: 'Configure providers de IA e processe arquivos para extrair insights',
        position: 'bottom'
      }],
      ['[data-step="4"]', {
        title: 'Etapa 4: Organização',
        content: 'Organize resultados em categorias e exporte para sistemas RAG',
        position: 'bottom'
      }],
      
      // Action buttons
      ['[data-action="select-directory"]', {
        title: 'Selecionar Pasta',
        content: 'Use File System Access API para acessar suas pastas locais',
        position: 'top'
      }],
      ['[data-action="configure-filters"]', {
        title: 'Configurar Filtros',
        content: 'Ajuste relevância, período temporal e tipos de arquivo',
        position: 'top'
      }],
      ['[data-action="start-analysis"]', {
        title: 'Iniciar Análise IA',
        content: 'Processe arquivos selecionados com IA para extrair insights',
        position: 'top'
      }],
      
      // API Configuration
      ['[data-api="ollama"]', {
        title: 'Ollama (Recomendado)',
        content: 'IA local, privada e gratuita. Ideal para análise confidencial.',
        position: 'right'
      }],
      ['[data-api="openai"]', {
        title: 'OpenAI GPT',
        content: 'Modelos avançados GPT-3.5/4. Requer API key e cobrança por uso.',
        position: 'right'
      }],
      
      // Confidence indicators
      ['[data-confidence]', {
        title: 'Score de Confiança ML',
        content: 'Calculado em tempo real usando UnifiedConfidenceSystem com múltiplos fatores',
        position: 'top'
      }],
      
      // Categories
      ['[data-category]', {
        title: 'Sistema de Categorias',
        content: 'Categorias aplicam boost automático de relevância e facilitam organização',
        position: 'top'
      }]
    ])
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for step changes to update contextual help
    window.KC?.EventBus?.on('STEP_CHANGED', (data) => {
      this.updateContextualHelp(data.step)
    })
    
    // Listen for errors to offer help
    window.KC?.EventBus?.on('ERROR_OCCURRED', (data) => {
      this.offerErrorHelp(data.error)
    })
    
    // Mouse events for tooltips
    document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true)
    document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true)
  }

  /**
   * Create floating help button
   */
  createHelpButton() {
    const helpButton = document.createElement('div')
    helpButton.id = 'help-button'
    helpButton.className = 'help-button'
    helpButton.innerHTML = `
      <button type="button" class="help-btn" title="Ajuda Interativa">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
        </svg>
      </button>
      <div class="help-menu" style="display: none;">
        <button data-help="quick-tour">🎯 Tour Rápido</button>
        <button data-help="step-guide">📋 Guia por Etapa</button>
        <button data-help="api-config">🔧 Config APIs</button>
        <button data-help="troubleshooting">🔧 Problemas</button>
        <button data-help="keyboard-shortcuts">⌨️ Atalhos</button>
      </div>
    `
    
    // Style the help button
    helpButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `
    
    // Add styles
    const style = document.createElement('style')
    style.textContent = `
      .help-button .help-btn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .help-button .help-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
      }
      
      .help-menu {
        position: absolute;
        bottom: 70px;
        right: 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
        border: 1px solid #e1e5e9;
        min-width: 200px;
        overflow: hidden;
      }
      
      .help-menu button {
        display: block;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: white;
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        color: #374151;
        transition: background-color 0.2s ease;
      }
      
      .help-menu button:hover {
        background: #f3f4f6;
      }
      
      .help-menu button:not(:last-child) {
        border-bottom: 1px solid #e5e7eb;
      }
    `
    
    document.head.appendChild(style)
    document.body.appendChild(helpButton)
    
    // Setup click handlers
    const helpBtn = helpButton.querySelector('.help-btn')
    const helpMenu = helpButton.querySelector('.help-menu')
    
    helpBtn.addEventListener('click', () => {
      const isVisible = helpMenu.style.display !== 'none'
      helpMenu.style.display = isVisible ? 'none' : 'block'
    })
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!helpButton.contains(e.target)) {
        helpMenu.style.display = 'none'
      }
    })
    
    // Help menu actions
    helpMenu.addEventListener('click', (e) => {
      const action = e.target.dataset.help
      if (action) {
        this.handleHelpAction(action)
        helpMenu.style.display = 'none'
      }
    })
  }

  /**
   * Create tooltip container
   */
  createTooltipContainer() {
    const tooltip = document.createElement('div')
    tooltip.id = 'interactive-tooltip'
    tooltip.className = 'interactive-tooltip'
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      max-width: 300px;
      z-index: 10001;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `
    
    document.body.appendChild(tooltip)
  }

  /**
   * Create onboarding overlay
   */
  createOnboardingOverlay() {
    const overlay = document.createElement('div')
    overlay.id = 'onboarding-overlay'
    overlay.className = 'onboarding-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10002;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `
    
    overlay.innerHTML = `
      <div class="onboarding-content" style="
        position: absolute;
        background: white;
        border-radius: 12px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      ">
        <div class="onboarding-header" style="
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="margin: 0; color: #111827; font-size: 24px;">Bem-vindo ao Knowledge Consolidator!</h2>
          <button class="close-onboarding" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
          ">&times;</button>
        </div>
        <div class="onboarding-body" style="padding: 24px;">
          <!-- Content will be dynamically inserted -->
        </div>
        <div class="onboarding-footer" style="
          padding: 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div class="onboarding-progress" style="
            display: flex;
            gap: 8px;
          ">
            <!-- Progress dots -->
          </div>
          <div class="onboarding-controls" style="
            display: flex;
            gap: 12px;
          ">
            <button class="btn-prev" style="
              padding: 8px 16px;
              border: 1px solid #d1d5db;
              background: white;
              border-radius: 6px;
              cursor: pointer;
            ">Anterior</button>
            <button class="btn-next" style="
              padding: 8px 16px;
              border: none;
              background: #3b82f6;
              color: white;
              border-radius: 6px;
              cursor: pointer;
            ">Próximo</button>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(overlay)
    
    // Setup event handlers
    this.setupOnboardingHandlers(overlay)
  }

  /**
   * Setup onboarding event handlers
   */
  setupOnboardingHandlers(overlay) {
    const closeBtn = overlay.querySelector('.close-onboarding')
    const prevBtn = overlay.querySelector('.btn-prev')
    const nextBtn = overlay.querySelector('.btn-next')
    
    closeBtn.addEventListener('click', () => this.closeOnboarding())
    prevBtn.addEventListener('click', () => this.previousOnboardingStep())
    nextBtn.addEventListener('click', () => this.nextOnboardingStep())
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeOnboarding()
      }
    })
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Help shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '?':
            e.preventDefault()
            this.showKeyboardShortcuts()
            break
          case 'h':
            e.preventDefault()
            this.toggleHelpMenu()
            break
        }
      }
      
      // Escape to close help
      if (e.key === 'Escape') {
        this.closeAllHelp()
      }
      
      // F1 for contextual help
      if (e.key === 'F1') {
        e.preventDefault()
        this.showContextualHelp()
      }
    })
  }

  /**
   * Handle help action from menu
   */
  handleHelpAction(action) {
    switch (action) {
      case 'quick-tour':
        this.startOnboarding()
        break
      case 'step-guide':
        this.showStepGuide()
        break
      case 'api-config':
        this.showHelp('api-configuration')
        break
      case 'troubleshooting':
        this.showHelp('troubleshooting')
        break
      case 'keyboard-shortcuts':
        this.showKeyboardShortcuts()
        break
    }
  }

  /**
   * Show help content in modal
   */
  showHelp(contentId) {
    const content = this.helpContent.get(contentId)
    if (!content) {
      this.logger.warn('Help content not found:', contentId)
      return
    }
    
    const modal = this.createHelpModal(content)
    document.body.appendChild(modal)
    
    // Emit event
    window.KC?.EventBus?.emit('HELP_OPENED', { contentId })
  }

  /**
   * Create help modal
   */
  createHelpModal(content) {
    const modal = document.createElement('div')
    modal.className = 'help-modal'
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10003;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `
    
    modal.innerHTML = `
      <div class="help-modal-content" style="
        background: white;
        border-radius: 12px;
        max-width: 800px;
        max-height: 90vh;
        width: 90%;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      ">
        <div class="help-modal-header" style="
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="margin: 0; color: #111827;">${content.title}</h2>
          <button class="close-help-modal" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
          ">&times;</button>
        </div>
        <div class="help-modal-body" style="
          padding: 24px;
          overflow-y: auto;
          max-height: calc(90vh - 160px);
        ">
          ${content.content}
        </div>
        <div class="help-modal-footer" style="
          padding: 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 12px;
        ">
          ${content.actions ? content.actions.map(action => `
            <button class="help-action-btn" data-action="${action.action}" style="
              padding: 8px 16px;
              border: 1px solid #3b82f6;
              background: white;
              color: #3b82f6;
              border-radius: 6px;
              cursor: pointer;
            ">${action.text}</button>
          `).join('') : ''}
        </div>
      </div>
    `
    
    // Add help content styles
    const style = document.createElement('style')
    style.textContent = `
      .help-content h3 { color: #111827; margin-top: 24px; margin-bottom: 12px; }
      .help-content h4 { color: #374151; margin-top: 16px; margin-bottom: 8px; }
      .help-content ul, .help-content ol { margin: 12px 0; padding-left: 24px; }
      .help-content li { margin: 4px 0; }
      .help-content code { 
        background: #f3f4f6; 
        padding: 2px 6px; 
        border-radius: 4px; 
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 13px;
      }
      .help-content pre { 
        background: #1f2937; 
        color: #f9fafb; 
        padding: 16px; 
        border-radius: 8px; 
        overflow-x: auto;
        font-size: 13px;
      }
      .help-tip {
        background: #dbeafe;
        border-left: 4px solid #3b82f6;
        padding: 12px;
        margin: 16px 0;
        border-radius: 4px;
      }
      .help-warning {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 12px;
        margin: 16px 0;
        border-radius: 4px;
      }
      .help-success {
        background: #d1fae5;
        border-left: 4px solid #10b981;
        padding: 12px;
        margin: 16px 0;
        border-radius: 4px;
      }
      .help-action-btn:hover {
        background: #3b82f6 !important;
        color: white !important;
      }
    `
    
    document.head.appendChild(style)
    
    // Setup event handlers
    const closeBtn = modal.querySelector('.close-help-modal')
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal)
      window.KC?.EventBus?.emit('HELP_CLOSED')
    })
    
    // Action buttons
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('help-action-btn')) {
        const action = e.target.dataset.action
        this.executeHelpAction(action)
      }
    })
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
        window.KC?.EventBus?.emit('HELP_CLOSED')
      }
    })
    
    return modal
  }

  /**
   * Execute help action
   */
  executeHelpAction(action) {
    switch (action) {
      case 'startDiscovery':
        // Navigate to step 1 and show discovery options
        window.KC?.AppController?.navigateToStep(1)
        break
      case 'showFilters':
        // Show filter panel
        document.querySelector('[data-action="configure-filters"]')?.click()
        break
      case 'openAPIConfig':
        // Open API configuration modal
        window.KC?.EventBus?.emit('OPEN_API_CONFIG')
        break
      case 'startAnalysis':
        // Navigate to step 3
        window.KC?.AppController?.navigateToStep(3)
        break
      case 'runDiagnostic':
        // Run system diagnostic
        if (typeof kcdiag === 'function') {
          kcdiag()
        }
        break
      case 'clearCache':
        // Clear system cache
        window.KC?.MemoryOptimizer?.cleanup()
        break
      case 'testOllama':
        // Test Ollama connection
        window.KC?.AIAPIManager?.checkOllamaAvailability()
        break
    }
  }

  /**
   * Start onboarding tour
   */
  startOnboarding() {
    if (this.onboardingActive) return
    
    this.onboardingActive = true
    this.currentTour = {
      step: 0,
      steps: [
        {
          title: '🎯 Bem-vindo!',
          content: `
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🧠</div>
              <h3>Knowledge Consolidator</h3>
              <p>Sistema inteligente para descoberta e análise de momentos decisivos em sua base de conhecimento.</p>
              <p><strong>Este tour levará apenas 2 minutos!</strong></p>
            </div>
          `,
          target: null
        },
        {
          title: '🔍 Etapa 1: Descoberta',
          content: `
            <h4>Descoberta Automatizada de Arquivos</h4>
            <ul>
              <li>Selecione uma pasta com seus documentos</li>
              <li>Configure filtros de relevância</li>
              <li>Sistema detecta automaticamente Obsidian Vaults</li>
              <li>Scores de confiança ML em tempo real</li>
            </ul>
            <p><strong>Próximo:</strong> Vamos ver a área de descoberta.</p>
          `,
          target: '[data-step="1"]'
        },
        {
          title: '📝 Etapa 2: Pré-Análise',
          content: `
            <h4>Preview Inteligente (70% economia de tokens)</h4>
            <ul>
              <li>5 segmentos semânticos otimizados</li>
              <li>Categorização manual com boost automático</li>
              <li>Bulk actions para processamento em massa</li>
              <li>Visualização rica dos arquivos</li>
            </ul>
          `,
          target: '[data-step="2"]'
        },
        {
          title: '🤖 Etapa 3: Análise IA',
          content: `
            <h4>Sistema Multi-Provider de IA</h4>
            <ul>
              <li><strong>Ollama:</strong> Local, privado, gratuito</li>
              <li><strong>OpenAI:</strong> GPT-3.5/4 de alta qualidade</li>
              <li><strong>Gemini & Claude:</strong> Alternativas robustas</li>
              <li>Templates especializados para diferentes tipos de análise</li>
            </ul>
          `,
          target: '[data-step="3"]'
        },
        {
          title: '📚 Etapa 4: Organização',
          content: `
            <h4>Pipeline RAG e Exportação</h4>
            <ul>
              <li>Sistema de categorias inteligente</li>
              <li>Chunking semântico para RAG</li>
              <li>Integração com Qdrant Vector DB</li>
              <li>Exportação para múltiplos formatos</li>
            </ul>
          `,
          target: '[data-step="4"]'
        },
        {
          title: '🎉 Pronto para Começar!',
          content: `
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
              <h3>Tudo Configurado!</h3>
              <p>Agora você conhece o fluxo completo do Knowledge Consolidator.</p>
              <h4>Próximos Passos:</h4>
              <ol style="text-align: left; max-width: 300px; margin: 0 auto;">
                <li>Configure APIs de IA (opcional, Ollama é gratuito)</li>
                <li>Selecione sua pasta de documentos</li>
                <li>Inicie a descoberta de conhecimento!</li>
              </ol>
              <p style="margin-top: 16px;">
                <strong>Dica:</strong> Use <kbd>F1</kbd> para ajuda contextual ou <kbd>Ctrl+?</kbd> para atalhos.
              </p>
            </div>
          `,
          target: null
        }
      ]
    }
    
    this.showOnboardingStep()
    
    // Mark as shown
    localStorage.setItem('kc_onboarding_shown', 'true')
    
    // Emit event
    window.KC?.EventBus?.emit('ONBOARDING_STARTED')
  }

  /**
   * Show current onboarding step
   */
  showOnboardingStep() {
    const overlay = document.getElementById('onboarding-overlay')
    const content = overlay.querySelector('.onboarding-body')
    const progress = overlay.querySelector('.onboarding-progress')
    const prevBtn = overlay.querySelector('.btn-prev')
    const nextBtn = overlay.querySelector('.btn-next')
    
    const currentStep = this.currentTour.steps[this.currentTour.step]
    
    // Update content
    content.innerHTML = `
      <h3>${currentStep.title}</h3>
      ${currentStep.content}
    `
    
    // Update progress dots
    progress.innerHTML = this.currentTour.steps.map((_, index) => `
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${index === this.currentTour.step ? '#3b82f6' : '#d1d5db'};
      "></div>
    `).join('')
    
    // Update buttons
    prevBtn.style.display = this.currentTour.step === 0 ? 'none' : 'block'
    nextBtn.textContent = this.currentTour.step === this.currentTour.steps.length - 1 ? 'Finalizar' : 'Próximo'
    
    // Position overlay
    this.positionOnboardingOverlay(currentStep.target)
    
    // Show overlay
    overlay.style.display = 'flex'
  }

  /**
   * Position onboarding overlay
   */
  positionOnboardingOverlay(target) {
    const overlay = document.getElementById('onboarding-overlay')
    const content = overlay.querySelector('.onboarding-content')
    
    if (target) {
      const element = document.querySelector(target)
      if (element) {
        const rect = element.getBoundingClientRect()
        
        // Position content near target
        content.style.position = 'absolute'
        content.style.top = `${Math.max(20, rect.bottom + 20)}px`
        content.style.left = `${Math.max(20, rect.left)}px`
        content.style.transform = 'none'
        
        // Highlight target element
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)'
        element.style.borderRadius = '8px'
        element.style.transition = 'all 0.3s ease'
        
        // Clear previous highlights
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
          el.classList.remove('onboarding-highlight')
          el.style.boxShadow = ''
        })
        
        element.classList.add('onboarding-highlight')
      }
    } else {
      // Center content
      content.style.position = 'absolute'
      content.style.top = '50%'
      content.style.left = '50%'
      content.style.transform = 'translate(-50%, -50%)'
    }
  }

  /**
   * Next onboarding step
   */
  nextOnboardingStep() {
    if (this.currentTour.step < this.currentTour.steps.length - 1) {
      this.currentTour.step++
      this.showOnboardingStep()
    } else {
      this.closeOnboarding()
    }
  }

  /**
   * Previous onboarding step
   */
  previousOnboardingStep() {
    if (this.currentTour.step > 0) {
      this.currentTour.step--
      this.showOnboardingStep()
    }
  }

  /**
   * Close onboarding
   */
  closeOnboarding() {
    const overlay = document.getElementById('onboarding-overlay')
    overlay.style.display = 'none'
    
    // Clear highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight')
      el.style.boxShadow = ''
    })
    
    this.onboardingActive = false
    this.currentTour = null
    
    // Emit event
    window.KC?.EventBus?.emit('ONBOARDING_COMPLETED')
  }

  /**
   * Handle mouse enter for tooltips
   */
  handleMouseEnter(e) {
    if (!this.config.autoShowTooltips) return
    
    for (const [selector, tooltipConfig] of this.tooltips) {
      if (e.target.matches(selector) || e.target.closest(selector)) {
        this.showTooltip(e.target, tooltipConfig)
        break
      }
    }
  }

  /**
   * Handle mouse leave for tooltips
   */
  handleMouseLeave(e) {
    this.hideTooltip()
  }

  /**
   * Show tooltip
   */
  showTooltip(element, config) {
    const tooltip = document.getElementById('interactive-tooltip')
    if (!tooltip) return
    
    tooltip.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${config.title}</div>
      <div style="font-size: 12px; opacity: 0.9;">${config.content}</div>
    `
    
    const rect = element.getBoundingClientRect()
    
    // Position tooltip
    let top, left
    switch (config.position) {
      case 'top':
        top = rect.top - tooltip.offsetHeight - 8
        left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)
        break
      case 'bottom':
        top = rect.bottom + 8
        left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)
        break
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2)
        left = rect.left - tooltip.offsetWidth - 8
        break
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2)
        left = rect.right + 8
        break
      default:
        top = rect.bottom + 8
        left = rect.left
    }
    
    // Keep tooltip in viewport
    top = Math.max(8, Math.min(top, window.innerHeight - tooltip.offsetHeight - 8))
    left = Math.max(8, Math.min(left, window.innerWidth - tooltip.offsetWidth - 8))
    
    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`
    tooltip.style.opacity = '1'
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.getElementById('interactive-tooltip')
    if (tooltip) {
      tooltip.style.opacity = '0'
    }
  }

  /**
   * Show keyboard shortcuts
   */
  showKeyboardShortcuts() {
    const shortcuts = {
      title: '⌨️ Atalhos de Teclado',
      content: `
        <div class="help-content">
          <h3>Atalhos Globais</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">F1</td>
              <td style="padding: 8px;">Ajuda contextual</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Ctrl + ?</td>
              <td style="padding: 8px;">Exibir atalhos</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Ctrl + H</td>
              <td style="padding: 8px;">Menu de ajuda</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Esc</td>
              <td style="padding: 8px;">Fechar modais/ajuda</td>
            </tr>
          </table>
          
          <h3>Navegação</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">1, 2, 3, 4</td>
              <td style="padding: 8px;">Navegar entre etapas</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Tab</td>
              <td style="padding: 8px;">Próximo elemento</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Shift + Tab</td>
              <td style="padding: 8px;">Elemento anterior</td>
            </tr>
          </table>
          
          <h3>Ações Rápidas</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Ctrl + D</td>
              <td style="padding: 8px;">Iniciar descoberta</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Ctrl + A</td>
              <td style="padding: 8px;">Selecionar todos os arquivos</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">Ctrl + Enter</td>
              <td style="padding: 8px;">Executar ação principal</td>
            </tr>
          </table>
          
          <h3>Console de Debug</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">F12</td>
              <td style="padding: 8px;">Abrir console do navegador</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px; font-weight: 600;">kcdiag()</td>
              <td style="padding: 8px;">Diagnóstico completo do sistema</td>
            </tr>
          </table>
        </div>
      `
    }
    
    this.showHelp('shortcuts')
    
    // Override content
    setTimeout(() => {
      const modal = document.querySelector('.help-modal')
      if (modal) {
        const body = modal.querySelector('.help-modal-body')
        const header = modal.querySelector('.help-modal-header h2')
        header.textContent = shortcuts.title
        body.innerHTML = shortcuts.content
      }
    }, 0)
  }

  /**
   * Check if should show onboarding
   */
  shouldShowOnboarding() {
    if (!this.config.showOnFirstVisit) return false
    return !localStorage.getItem('kc_onboarding_shown')
  }

  /**
   * Update contextual help based on current step
   */
  updateContextualHelp(step) {
    // Could show step-specific tips or highlights
    const stepHelp = {
      1: 'step-1-discovery',
      2: 'step-2-preanalysis', 
      3: 'step-3-analysis',
      4: 'step-4-organization'
    }
    
    const helpId = stepHelp[step]
    if (helpId) {
      // Update help button to show step-specific content
      this.currentStepHelp = helpId
    }
  }

  /**
   * Show contextual help for current step
   */
  showContextualHelp() {
    if (this.currentStepHelp) {
      this.showHelp(this.currentStepHelp)
    } else {
      this.showHelp('step-1-discovery') // Default
    }
  }

  /**
   * Offer help when errors occur
   */
  offerErrorHelp(error) {
    // Show error-specific help suggestions
    const errorHelp = {
      'Ollama connection failed': 'Parece que o Ollama não está conectado. Gostaria de ver o guia de configuração?',
      'No files discovered': 'Não foram encontrados arquivos. Quer verificar os filtros ou ver dicas de descoberta?',
      'API key invalid': 'Chave da API inválida. Deseja ver o guia de configuração de APIs?'
    }
    
    for (const [errorPattern, helpText] of Object.entries(errorHelp)) {
      if (error.message?.includes(errorPattern)) {
        this.showErrorHelp(helpText, errorPattern)
        break
      }
    }
  }

  /**
   * Show error-specific help
   */
  showErrorHelp(helpText, errorType) {
    const helpButton = document.getElementById('help-button')
    if (!helpButton) return
    
    // Create error help notification
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px;
      max-width: 300px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    `
    
    notification.innerHTML = `
      <div style="color: #dc2626; font-weight: 600; margin-bottom: 4px;">💡 Precisa de Ajuda?</div>
      <div style="color: #7f1d1d; font-size: 14px; margin-bottom: 8px;">${helpText}</div>
      <button class="error-help-btn" style="
        background: #dc2626;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      ">Ver Ajuda</button>
      <button class="dismiss-help-btn" style="
        background: none;
        border: none;
        color: #7f1d1d;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
      ">Dispensar</button>
    `
    
    document.body.appendChild(notification)
    
    // Auto dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 10000)
    
    // Event handlers
    notification.querySelector('.error-help-btn').addEventListener('click', () => {
      if (errorType.includes('Ollama')) {
        this.showHelp('api-configuration')
      } else {
        this.showHelp('troubleshooting')
      }
      notification.parentNode.removeChild(notification)
    })
    
    notification.querySelector('.dismiss-help-btn').addEventListener('click', () => {
      notification.parentNode.removeChild(notification)
    })
  }

  /**
   * Toggle help menu
   */
  toggleHelpMenu() {
    const helpButton = document.getElementById('help-button')
    if (helpButton) {
      helpButton.querySelector('.help-btn').click()
    }
  }

  /**
   * Close all help dialogs
   */
  closeAllHelp() {
    // Close help modal
    const helpModal = document.querySelector('.help-modal')
    if (helpModal) {
      helpModal.remove()
    }
    
    // Close onboarding
    if (this.onboardingActive) {
      this.closeOnboarding()
    }
    
    // Hide tooltips
    this.hideTooltip()
    
    // Hide help menu
    const helpMenu = document.querySelector('.help-menu')
    if (helpMenu) {
      helpMenu.style.display = 'none'
    }
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      initialized: this.initialized,
      onboardingShown: !!localStorage.getItem('kc_onboarding_shown'),
      helpContentLoaded: this.helpContent.size,
      tooltipsRegistered: this.tooltips.size,
      currentTour: this.currentTour?.step || null
    }
  }

  /**
   * Destroy component
   */
  destroy() {
    // Remove DOM elements
    const elements = [
      '#help-button',
      '#interactive-tooltip', 
      '#onboarding-overlay'
    ]
    
    elements.forEach(selector => {
      const element = document.querySelector(selector)
      if (element) {
        element.remove()
      }
    })
    
    // Clear data
    this.helpContent.clear()
    this.tooltips.clear()
    this.currentTour = null
    this.onboardingActive = false
    this.initialized = false
  }
}

// Auto-register component
if (window.KC) {
  window.KC.InteractiveHelp = new InteractiveHelp()
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveHelp
}