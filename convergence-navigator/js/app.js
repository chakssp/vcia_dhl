/**
 * 🚀 Convergence Navigator - Aplicação Principal
 * 
 * Inicializa e coordena todos os componentes do sistema de navegação por convergência
 */

// Namespace global
window.ConvergenceNavigator = {
    version: '1.0.0',
    initialized: false,
    engine: null,
    ui: {},
    stats: {
        totalFiles: 0,
        totalConvergences: 0,
        reductionRate: 0
    }
};

/**
 * Classe principal da aplicação
 */
class ConvergenceNavigatorApp {
    constructor() {
        this.engine = null;
        this.currentNavigation = null;
        this.isNavigating = false;
        
        // Elementos do DOM
        this.elements = {};
        
        // Bind de métodos
        this.handleIntentionSubmit = this.handleIntentionSubmit.bind(this);
        this.handleClear = this.handleClear.bind(this);
        this.handleExampleClick = this.handleExampleClick.bind(this);
    }
    
    /**
     * Inicializa a aplicação
     */
    async init() {
        console.log('🚀 Iniciando Convergence Navigator...');
        
        try {
            // 1. Cachear elementos do DOM
            this.cacheElements();
            
            // 2. Inicializar motor de convergência
            await this.initConvergenceEngine();
            
            // 3. Configurar event listeners
            this.setupEventListeners();
            
            // 4. Carregar estatísticas iniciais
            await this.loadInitialStats();
            
            // 5. Mostrar mensagem de boas-vindas
            this.showStatus('Sistema pronto para navegação por convergência!', 'success');
            
            // Marcar como inicializado
            window.ConvergenceNavigator.initialized = true;
            
            console.log('✅ Convergence Navigator iniciado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            this.showStatus('Erro ao inicializar o sistema', 'error');
        }
    }
    
    /**
     * Cacheia referências aos elementos do DOM
     */
    cacheElements() {
        this.elements = {
            // Input de intenção
            intentionInput: document.getElementById('intention-input'),
            navigateBtn: document.getElementById('navigate-btn'),
            clearBtn: document.getElementById('clear-btn'),
            exampleChips: document.querySelectorAll('.example-chip'),
            
            // Estatísticas do header
            totalFiles: document.getElementById('total-files'),
            totalConvergences: document.getElementById('total-convergences'),
            reductionRate: document.getElementById('reduction-rate'),
            
            // Seções
            dimensionsSection: document.getElementById('dimensions-section'),
            convergenceSection: document.getElementById('convergence-section'),
            insightsSection: document.getElementById('insights-section'),
            
            // Dimensões
            temporalContent: document.getElementById('temporal-content'),
            semanticContent: document.getElementById('semantic-content'),
            categoricalContent: document.getElementById('categorical-content'),
            analyticalContent: document.getElementById('analytical-content'),
            
            // Convergência
            convergenceCanvas: document.getElementById('convergence-canvas'),
            densityFill: document.getElementById('density-fill'),
            densityValue: document.getElementById('density-value'),
            pathDescription: document.getElementById('path-description'),
            evidenceCount: document.getElementById('evidence-count'),
            evidenceList: document.getElementById('evidence-list'),
            alternativePaths: document.getElementById('alternative-paths'),
            
            // Insights
            insightsContainer: document.getElementById('insights-container'),
            exportInsights: document.getElementById('export-insights'),
            newNavigation: document.getElementById('new-navigation'),
            
            // Loading
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingDetail: document.getElementById('loading-detail'),
            
            // Status
            statusContainer: document.getElementById('status-container')
        };
    }
    
    /**
     * Inicializa o motor de convergência
     */
    async initConvergenceEngine() {
        if (typeof ConvergenceEngine === 'undefined') {
            throw new Error('ConvergenceEngine não encontrado!');
        }
        
        this.engine = new ConvergenceEngine();
        window.ConvergenceNavigator.engine = this.engine;
        
        // Verificar se QdrantConnector está disponível e conectar
        if (typeof QdrantConnector !== 'undefined') {
            console.log('🔌 Conectando ao Qdrant real...');
            const connector = new QdrantConnector();
            await connector.checkConnection();
            this.engine.qdrantConnector = connector;
        }
        
        console.log('✅ Motor de convergência inicializado');
    }
    
    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botão de navegação
        this.elements.navigateBtn.addEventListener('click', this.handleIntentionSubmit);
        
        // Enter no textarea
        this.elements.intentionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.handleIntentionSubmit();
            }
        });
        
        // Botão limpar
        this.elements.clearBtn.addEventListener('click', this.handleClear);
        
        // Exemplos rápidos
        this.elements.exampleChips.forEach(chip => {
            chip.addEventListener('click', this.handleExampleClick);
        });
        
        // Botão de nova navegação
        if (this.elements.newNavigation) {
            this.elements.newNavigation.addEventListener('click', () => {
                this.handleClear();
                this.elements.intentionInput.focus();
            });
        }
        
        // Botão de exportar insights
        if (this.elements.exportInsights) {
            this.elements.exportInsights.addEventListener('click', () => {
                this.exportInsights();
            });
        }
    }
    
    /**
     * Carrega estatísticas iniciais
     */
    async loadInitialStats() {
        // Tentar conectar com KC ou Qdrant para obter stats
        try {
            // Por enquanto, usar valores mock
            this.updateStats({
                totalFiles: 1000,
                totalConvergences: 0,
                reductionRate: 0
            });
        } catch (error) {
            console.warn('⚠️ Não foi possível carregar estatísticas:', error);
        }
    }
    
    /**
     * Atualiza estatísticas na interface
     */
    updateStats(stats) {
        if (stats.totalFiles !== undefined) {
            this.elements.totalFiles.textContent = stats.totalFiles.toLocaleString('pt-BR');
            window.ConvergenceNavigator.stats.totalFiles = stats.totalFiles;
        }
        
        if (stats.totalConvergences !== undefined) {
            this.elements.totalConvergences.textContent = stats.totalConvergences.toLocaleString('pt-BR');
            window.ConvergenceNavigator.stats.totalConvergences = stats.totalConvergences;
        }
        
        if (stats.reductionRate !== undefined) {
            this.elements.reductionRate.textContent = `${stats.reductionRate}%`;
            window.ConvergenceNavigator.stats.reductionRate = stats.reductionRate;
        }
    }
    
    /**
     * Manipula submissão de intenção
     */
    async handleIntentionSubmit() {
        const intention = this.elements.intentionInput.value.trim();
        
        if (!intention) {
            this.showStatus('Por favor, descreva sua intenção de navegação', 'warning');
            return;
        }
        
        if (this.isNavigating) {
            this.showStatus('Navegação em progresso, aguarde...', 'warning');
            return;
        }
        
        await this.navigate(intention);
    }
    
    /**
     * Executa navegação por convergência
     */
    async navigate(intention) {
        console.log('🧭 Iniciando navegação:', intention);
        
        this.isNavigating = true;
        this.showLoading(true, 'Decomposição dimensional em progresso');
        
        try {
            // 1. Executar navegação no motor
            const result = await this.engine.navigate(intention);
            
            if (!result.success) {
                throw new Error(result.error || 'Erro na navegação');
            }
            
            // 2. Salvar resultado atual
            this.currentNavigation = result;
            
            // 3. Mostrar decomposição dimensional
            this.showDimensionalDecomposition(result.decomposition);
            
            // 4. Atualizar loading
            this.updateLoadingStatus('Calculando convergências...');
            
            // Pequeno delay para efeito visual
            await this.delay(500);
            
            // 5. Mostrar convergências
            this.showConvergences(result);
            
            // 6. Atualizar estatísticas
            this.updateStats({
                totalConvergences: result.convergenceCount,
                reductionRate: result.reductionRate
            });
            
            // 7. Gerar insights (simulado por enquanto)
            this.generateInsights(result);
            
            // 8. Mostrar status de sucesso
            this.showStatus(`Navegação concluída! ${result.convergenceCount} convergências encontradas.`, 'success');
            
        } catch (error) {
            console.error('❌ Erro na navegação:', error);
            this.showStatus(`Erro: ${error.message}`, 'error');
            
        } finally {
            this.isNavigating = false;
            this.showLoading(false);
        }
    }
    
    /**
     * Mostra decomposição dimensional
     */
    showDimensionalDecomposition(decomposition) {
        // Mostrar seção
        this.elements.dimensionsSection.style.display = 'block';
        
        // Temporal
        if (decomposition.temporal) {
            this.elements.temporalContent.innerHTML = `
                <div class="dimension-value">${decomposition.temporal.label || decomposition.temporal}</div>
            `;
        } else {
            this.elements.temporalContent.innerHTML = '<span class="dimension-empty">Não especificado</span>';
        }
        
        // Semântica
        if (decomposition.semantic && decomposition.semantic.length > 0) {
            this.elements.semanticContent.innerHTML = decomposition.semantic
                .map(keyword => `<span class="keyword-tag">${keyword}</span>`)
                .join(' ');
        } else {
            this.elements.semanticContent.innerHTML = '<span class="dimension-empty">Nenhuma palavra-chave</span>';
        }
        
        // Categorial
        if (decomposition.categorical && decomposition.categorical.length > 0) {
            this.elements.categoricalContent.innerHTML = decomposition.categorical
                .map(cat => `<span class="category-tag">${cat}</span>`)
                .join(' ');
        } else {
            this.elements.categoricalContent.innerHTML = '<span class="dimension-empty">Nenhuma categoria</span>';
        }
        
        // Analítica
        if (decomposition.analytical) {
            this.elements.analyticalContent.innerHTML = `
                <div class="analysis-type">${decomposition.analytical}</div>
            `;
        } else {
            this.elements.analyticalContent.innerHTML = '<span class="dimension-empty">Análise geral</span>';
        }
    }
    
    /**
     * Mostra convergências encontradas
     */
    showConvergences(result) {
        // Mostrar seção
        this.elements.convergenceSection.style.display = 'block';
        
        // Atualizar densidade
        const density = Math.round(result.confidence * 100);
        this.elements.densityFill.style.width = `${density}%`;
        this.elements.densityValue.textContent = `${density}%`;
        
        // Atualizar descrição do caminho
        if (result.primaryPath) {
            this.elements.pathDescription.innerHTML = `
                <p><strong>Caminho Principal:</strong> ${result.primaryPath.description}</p>
                <p>Este caminho representa a convergência mais forte entre as dimensões identificadas na sua intenção.</p>
            `;
        } else {
            this.elements.pathDescription.innerHTML = `
                <p>Nenhuma convergência forte foi identificada. Tente refinar sua intenção.</p>
            `;
        }
        
        // Atualizar pool de evidências
        this.elements.evidenceCount.textContent = result.evidencePool.length;
        
        if (result.evidencePool.length > 0) {
            this.elements.evidenceList.innerHTML = result.evidencePool
                .slice(0, 10)
                .map(file => `
                    <div class="evidence-item">
                        <div class="evidence-title">${file}</div>
                        <div class="evidence-meta">
                            <span class="evidence-relevance">Relevância: Alta</span>
                        </div>
                    </div>
                `)
                .join('');
        } else {
            this.elements.evidenceList.innerHTML = '<p>Nenhuma evidência encontrada</p>';
        }
        
        // Atualizar caminhos alternativos
        if (result.alternativePaths && result.alternativePaths.length > 0) {
            this.elements.alternativePaths.innerHTML = result.alternativePaths
                .map(path => `
                    <div class="path-item">
                        <div class="path-title">${path.description}</div>
                        <div class="path-density">
                            <div class="path-density-bar">
                                <div class="path-density-fill" style="width: ${Math.round(path.density * 100)}%"></div>
                            </div>
                            <span>${Math.round(path.density * 100)}%</span>
                        </div>
                    </div>
                `)
                .join('');
        } else {
            this.elements.alternativePaths.innerHTML = '<p>Nenhum caminho alternativo</p>';
        }
        
        // TODO: Renderizar visualização no canvas
        this.renderConvergenceVisualization(result);
    }
    
    /**
     * Renderiza visualização de convergência no canvas
     */
    renderConvergenceVisualization(result) {
        const canvas = this.elements.convergenceCanvas;
        const ctx = canvas.getContext('2d');
        
        // Ajustar tamanho do canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Limpar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Por enquanto, desenhar visualização simples
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Desenhar nó central (convergência)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Desenhar dimensões ao redor
        const dimensions = ['Temporal', 'Semântica', 'Categorial', 'Analítica'];
        const radius = 120;
        
        dimensions.forEach((dim, index) => {
            const angle = (index * Math.PI * 2) / dimensions.length - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Linha conectora
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Nó dimensional
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 2 * Math.PI);
            ctx.fillStyle = '#334155';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.stroke();
            
            // Label
            ctx.fillStyle = '#f1f5f9';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dim, x, y);
        });
        
        // Label central
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CONVERGÊNCIA', centerX, centerY);
    }
    
    /**
     * Gera insights baseados na navegação
     */
    generateInsights(result) {
        // Por enquanto, gerar insights simulados
        const insights = [
            {
                type: 'pattern',
                icon: '🔍',
                title: 'Padrão Identificado',
                content: 'Suas buscas recentes convergem para temas de inteligência artificial e arquitetura de sistemas.',
                evidence: result.evidencePool.slice(0, 3)
            },
            {
                type: 'recommendation',
                icon: '💡',
                title: 'Recomendação',
                content: 'Explore também conceitos relacionados a embeddings e vector databases para complementar seu conhecimento.',
                evidence: []
            }
        ];
        
        // Mostrar seção de insights
        this.elements.insightsSection.style.display = 'block';
        
        // Renderizar insights
        this.elements.insightsContainer.innerHTML = insights
            .map(insight => `
                <div class="insight-card">
                    <div class="insight-header">
                        <span class="insight-icon">${insight.icon}</span>
                        <div class="insight-title">
                            <h4>${insight.title}</h4>
                            <span class="insight-type">${insight.type}</span>
                        </div>
                    </div>
                    <div class="insight-content">
                        ${insight.content}
                    </div>
                    ${insight.evidence.length > 0 ? `
                        <div class="insight-evidence">
                            <div class="insight-evidence-label">Baseado em:</div>
                            <div class="insight-evidence-files">
                                ${insight.evidence.map(f => `<span class="evidence-chip">${f}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `)
            .join('');
    }
    
    /**
     * Limpa a interface
     */
    handleClear() {
        this.elements.intentionInput.value = '';
        this.elements.dimensionsSection.style.display = 'none';
        this.elements.convergenceSection.style.display = 'none';
        this.elements.insightsSection.style.display = 'none';
        this.currentNavigation = null;
        
        this.updateStats({
            totalConvergences: 0,
            reductionRate: 0
        });
        
        this.showStatus('Interface limpa', 'info');
    }
    
    /**
     * Manipula clique em exemplo
     */
    handleExampleClick(event) {
        const intention = event.target.dataset.intention;
        if (intention) {
            this.elements.intentionInput.value = intention;
            this.elements.intentionInput.focus();
        }
    }
    
    /**
     * Exporta insights
     */
    exportInsights() {
        if (!this.currentNavigation) {
            this.showStatus('Nenhuma navegação para exportar', 'warning');
            return;
        }
        
        const exportData = {
            timestamp: new Date().toISOString(),
            intention: this.currentNavigation.intention,
            decomposition: this.currentNavigation.decomposition,
            convergences: this.currentNavigation.convergenceCount,
            reductionRate: this.currentNavigation.reductionRate,
            primaryPath: this.currentNavigation.primaryPath,
            evidencePool: this.currentNavigation.evidencePool
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convergence-insights-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showStatus('Insights exportados com sucesso!', 'success');
    }
    
    /**
     * Mostra/esconde loading
     */
    showLoading(show, message = '') {
        this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
        if (message) {
            this.elements.loadingDetail.textContent = message;
        }
    }
    
    /**
     * Atualiza mensagem de loading
     */
    updateLoadingStatus(message) {
        this.elements.loadingDetail.textContent = message;
    }
    
    /**
     * Mostra mensagem de status
     */
    showStatus(message, type = 'info') {
        const statusEl = document.createElement('div');
        statusEl.className = `status-message ${type}`;
        statusEl.textContent = message;
        
        this.elements.statusContainer.appendChild(statusEl);
        
        // Remover após 5 segundos
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => statusEl.remove(), 300);
        }, 5000);
    }
    
    /**
     * Utility: delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Adicionar estilos CSS inline para tags
const style = document.createElement('style');
style.textContent = `
    .keyword-tag, .category-tag {
        display: inline-block;
        padding: 2px 8px;
        margin: 2px;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 4px;
        font-size: 0.875rem;
        color: #a5b4fc;
    }
    
    .dimension-value, .analysis-type {
        padding: 4px 8px;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 4px;
        color: #cbd5e1;
    }
`;
document.head.appendChild(style);

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new ConvergenceNavigatorApp();
    app.init();
    
    // Expor para debug
    window.ConvergenceNavigator.app = app;
});