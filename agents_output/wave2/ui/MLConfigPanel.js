/**
 * MLConfigPanel.js - ML Algorithm Configuration UI
 * 
 * Provides interface for configuring ML algorithms, dimension weights,
 * and convergence settings. Integrates with ConfidenceCalculator.
 */

(function(window) {
    'use strict';

    class MLConfigPanel {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? 
                document.querySelector(container) : container;
            
            this.options = {
                collapsible: true,
                startCollapsed: true,
                showPresets: true,
                showOptimization: true,
                animated: true,
                ...options
            };
            
            this.confidenceCalculator = null;
            this.currentConfig = {
                algorithm: 'weighted_ensemble',
                weights: {
                    semantic: 0.4,
                    categorical: 0.2,
                    structural: 0.2,
                    temporal: 0.2
                },
                convergence: {
                    target: 0.85,
                    strategy: 'adaptive',
                    maxIterations: 20,
                    threshold: 0.02
                },
                enableAdaptiveWeights: true,
                minConfidence: 0.65
            };
            
            this.presets = {
                balanced: {
                    name: 'Balanceado',
                    description: 'Peso igual para todas as dimensões',
                    weights: { semantic: 0.25, categorical: 0.25, structural: 0.25, temporal: 0.25 }
                },
                semantic_focus: {
                    name: 'Foco Semântico',
                    description: 'Ênfase em conteúdo e significado',
                    weights: { semantic: 0.5, categorical: 0.2, structural: 0.15, temporal: 0.15 }
                },
                structural_focus: {
                    name: 'Foco Estrutural',
                    description: 'Ênfase em organização e formato',
                    weights: { semantic: 0.2, categorical: 0.2, structural: 0.4, temporal: 0.2 }
                },
                recent_priority: {
                    name: 'Prioridade Recente',
                    description: 'Maior peso para conteúdo recente',
                    weights: { semantic: 0.3, categorical: 0.2, structural: 0.15, temporal: 0.35 }
                }
            };
            
            this.eventHandlers = new Map();
            this.isCollapsed = this.options.startCollapsed;
            
            this.init();
        }

        /**
         * Initialize the panel
         */
        init() {
            this.render();
            this.setupEventListeners();
            this.loadSavedConfig();
        }

        /**
         * Set the ConfidenceCalculator instance
         */
        setConfidenceCalculator(calculator) {
            this.confidenceCalculator = calculator;
            this.syncWithCalculator();
        }

        /**
         * Render the panel
         */
        render() {
            this.container.classList.add('ml-config-panel');
            if (this.isCollapsed) {
                this.container.classList.add('collapsed');
            }
            
            this.container.innerHTML = `
                <div class="panel-header">
                    <h3 class="panel-title">
                        <svg class="icon" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09zM4.157 8.5H7a.5.5 0 0 1 .478.647L6.11 13.59l5.732-6.09H9a.5.5 0 0 1-.478-.647L9.89 2.41 4.157 8.5z"/>
                        </svg>
                        Configuração ML
                    </h3>
                    ${this.options.collapsible ? `
                        <button class="btn-icon panel-toggle" title="Expandir/Recolher">
                            <svg class="icon-chevron" width="16" height="16" viewBox="0 0 16 16">
                                <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                
                <div class="panel-content">
                    <!-- Algorithm Selection -->
                    <div class="config-section algorithm-section">
                        <h4 class="section-title">Algoritmo Principal</h4>
                        <div class="algorithm-cards">
                            <label class="algorithm-card">
                                <input type="radio" name="algorithm" value="weighted_ensemble" 
                                       ${this.currentConfig.algorithm === 'weighted_ensemble' ? 'checked' : ''}>
                                <div class="card-content">
                                    <svg class="icon" width="24" height="24" viewBox="0 0 16 16">
                                        <path d="M6 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-1 0a.5.5 0 1 0-1 0 .5.5 0 0 0 1 0z"/>
                                        <path d="M2 1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 1 6.586V2a1 1 0 0 1 1-1zm0 5.586 7 7L13.586 9l-7-7H2v4.586z"/>
                                    </svg>
                                    <span class="algorithm-name">Weighted Ensemble</span>
                                    <small class="algorithm-desc">Melhor precisão geral</small>
                                </div>
                            </label>
                            
                            <label class="algorithm-card">
                                <input type="radio" name="algorithm" value="neural_confidence"
                                       ${this.currentConfig.algorithm === 'neural_confidence' ? 'checked' : ''}>
                                <div class="card-content">
                                    <svg class="icon" width="24" height="24" viewBox="0 0 16 16">
                                        <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A31.493 31.493 0 0 1 8 14.58a31.481 31.481 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z"/>
                                        <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                                    </svg>
                                    <span class="algorithm-name">Neural-Inspired</span>
                                    <small class="algorithm-desc">Aprendizado adaptativo</small>
                                </div>
                            </label>
                            
                            <label class="algorithm-card">
                                <input type="radio" name="algorithm" value="random_forest"
                                       ${this.currentConfig.algorithm === 'random_forest' ? 'checked' : ''}>
                                <div class="card-content">
                                    <svg class="icon" width="24" height="24" viewBox="0 0 16 16">
                                        <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                                    </svg>
                                    <span class="algorithm-name">Random Forest</span>
                                    <small class="algorithm-desc">Robustez e estabilidade</small>
                                </div>
                            </label>
                            
                            <label class="algorithm-card">
                                <input type="radio" name="algorithm" value="gradient_boost"
                                       ${this.currentConfig.algorithm === 'gradient_boost' ? 'checked' : ''}>
                                <div class="card-content">
                                    <svg class="icon" width="24" height="24" viewBox="0 0 16 16">
                                        <path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828l.645-1.937zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.734 1.734 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.734 1.734 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.734 1.734 0 0 0 3.407 2.31l.387-1.162zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L10.863.1z"/>
                                    </svg>
                                    <span class="algorithm-name">Gradient Boosting</span>
                                    <small class="algorithm-desc">Alta performance</small>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Weight Configuration -->
                    <div class="config-section weights-section">
                        <h4 class="section-title">
                            Pesos das Dimensões
                            <div class="section-actions">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="adaptive-weights" 
                                           ${this.currentConfig.enableAdaptiveWeights ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                    <span class="toggle-label">Pesos Adaptativos</span>
                                </label>
                            </div>
                        </h4>
                        
                        ${this.options.showPresets ? `
                            <div class="weight-presets">
                                <label>Predefinições:</label>
                                <select class="preset-select" id="weight-presets">
                                    <option value="custom">Personalizado</option>
                                    ${Object.entries(this.presets).map(([key, preset]) => `
                                        <option value="${key}">${preset.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                        ` : ''}
                        
                        <div class="weight-sliders">
                            ${this.renderWeightSlider('semantic', 'Semântico', this.currentConfig.weights.semantic)}
                            ${this.renderWeightSlider('categorical', 'Categórico', this.currentConfig.weights.categorical)}
                            ${this.renderWeightSlider('structural', 'Estrutural', this.currentConfig.weights.structural)}
                            ${this.renderWeightSlider('temporal', 'Temporal', this.currentConfig.weights.temporal)}
                        </div>
                        
                        <div class="weight-total">
                            <span class="total-label">Total:</span>
                            <span class="total-value" id="weight-total">100%</span>
                            <button class="btn-sm btn-secondary" id="normalize-weights">
                                Normalizar
                            </button>
                        </div>
                        
                        ${this.options.showOptimization ? `
                            <div class="weight-optimization">
                                <button class="btn-sm btn-primary" id="optimize-weights">
                                    <svg class="icon" width="14" height="14" viewBox="0 0 16 16">
                                        <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
                                    </svg>
                                    Otimizar Automaticamente
                                </button>
                                <p class="optimization-hint">
                                    Baseado no histórico de feedback
                                </p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Convergence Settings -->
                    <div class="config-section convergence-section">
                        <h4 class="section-title">Configurações de Convergência</h4>
                        
                        <div class="convergence-settings">
                            <div class="setting-row">
                                <label for="target-confidence">Meta de Confiança:</label>
                                <div class="input-group">
                                    <input type="range" 
                                           id="target-confidence" 
                                           min="50" 
                                           max="100" 
                                           value="${this.currentConfig.convergence.target * 100}"
                                           class="confidence-slider">
                                    <input type="number" 
                                           id="target-confidence-value" 
                                           min="50" 
                                           max="100" 
                                           value="${Math.round(this.currentConfig.convergence.target * 100)}"
                                           class="input-sm">
                                    <span class="input-suffix">%</span>
                                </div>
                            </div>
                            
                            <div class="setting-row">
                                <label for="convergence-strategy">Estratégia:</label>
                                <select id="convergence-strategy" class="select-sm">
                                    <option value="adaptive" ${this.currentConfig.convergence.strategy === 'adaptive' ? 'selected' : ''}>Adaptativa</option>
                                    <option value="linear" ${this.currentConfig.convergence.strategy === 'linear' ? 'selected' : ''}>Linear</option>
                                    <option value="exponential" ${this.currentConfig.convergence.strategy === 'exponential' ? 'selected' : ''}>Exponencial</option>
                                    <option value="conservative" ${this.currentConfig.convergence.strategy === 'conservative' ? 'selected' : ''}>Conservadora</option>
                                </select>
                            </div>
                            
                            <div class="setting-row">
                                <label for="max-iterations">Máx. Iterações:</label>
                                <input type="number" 
                                       id="max-iterations" 
                                       min="1" 
                                       max="50" 
                                       value="${this.currentConfig.convergence.maxIterations}"
                                       class="input-sm">
                            </div>
                            
                            <div class="setting-row">
                                <label for="convergence-threshold">Limiar de Convergência:</label>
                                <div class="input-group">
                                    <input type="number" 
                                           id="convergence-threshold" 
                                           min="0.001" 
                                           max="0.1" 
                                           step="0.001"
                                           value="${this.currentConfig.convergence.threshold}"
                                           class="input-sm">
                                    <span class="input-suffix">delta</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="convergence-info">
                            <svg class="icon" width="14" height="14" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                            </svg>
                            <span class="info-text">
                                Algoritmo converge quando a variação de confiança é menor que o limiar
                            </span>
                        </div>
                    </div>
                    
                    <!-- Additional Settings -->
                    <div class="config-section additional-section">
                        <h4 class="section-title">Configurações Adicionais</h4>
                        
                        <div class="additional-settings">
                            <div class="setting-row">
                                <label for="min-confidence">Confiança Mínima:</label>
                                <div class="input-group">
                                    <input type="number" 
                                           id="min-confidence" 
                                           min="0" 
                                           max="100" 
                                           value="${this.currentConfig.minConfidence * 100}"
                                           class="input-sm">
                                    <span class="input-suffix">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="panel-actions">
                        <button class="btn btn-secondary" id="reset-config">
                            <svg class="icon" width="14" height="14" viewBox="0 0 16 16">
                                <path d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 5H14.5a.5.5 0 0 0 .5-.5z"/>
                            </svg>
                            Resetar
                        </button>
                        <button class="btn btn-primary" id="apply-config">
                            <svg class="icon" width="14" height="14" viewBox="0 0 16 16">
                                <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                            </svg>
                            Aplicar
                        </button>
                    </div>
                </div>
            `;
        }

        /**
         * Render weight slider
         */
        renderWeightSlider(dimension, label, value) {
            const percent = Math.round(value * 100);
            
            return `
                <div class="weight-control" data-dimension="${dimension}">
                    <div class="weight-header">
                        <label class="weight-label">${label}</label>
                        <span class="weight-value">${percent}%</span>
                    </div>
                    <div class="weight-slider-container">
                        <input type="range" 
                               class="weight-slider" 
                               data-dimension="${dimension}"
                               min="0" 
                               max="100" 
                               value="${percent}">
                        <div class="weight-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Panel toggle
            const toggleBtn = this.container.querySelector('.panel-toggle');
            toggleBtn?.addEventListener('click', () => {
                this.togglePanel();
            });
            
            // Algorithm selection
            const algorithmInputs = this.container.querySelectorAll('input[name="algorithm"]');
            algorithmInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    this.currentConfig.algorithm = e.target.value;
                    this.emit('algorithmChanged', { algorithm: e.target.value });
                });
            });
            
            // Weight sliders
            const weightSliders = this.container.querySelectorAll('.weight-slider');
            weightSliders.forEach(slider => {
                slider.addEventListener('input', (e) => {
                    this.handleWeightChange(e.target.dataset.dimension, e.target.value);
                });
            });
            
            // Adaptive weights toggle
            const adaptiveToggle = this.container.querySelector('#adaptive-weights');
            adaptiveToggle?.addEventListener('change', (e) => {
                this.currentConfig.enableAdaptiveWeights = e.target.checked;
                this.toggleWeightControls(!e.target.checked);
            });
            
            // Weight presets
            const presetSelect = this.container.querySelector('#weight-presets');
            presetSelect?.addEventListener('change', (e) => {
                this.applyPreset(e.target.value);
            });
            
            // Normalize weights button
            const normalizeBtn = this.container.querySelector('#normalize-weights');
            normalizeBtn?.addEventListener('click', () => {
                this.normalizeWeights();
            });
            
            // Optimize weights button
            const optimizeBtn = this.container.querySelector('#optimize-weights');
            optimizeBtn?.addEventListener('click', () => {
                this.optimizeWeights();
            });
            
            // Convergence settings
            this.setupConvergenceListeners();
            
            // Action buttons
            const resetBtn = this.container.querySelector('#reset-config');
            resetBtn?.addEventListener('click', () => {
                this.resetConfig();
            });
            
            const applyBtn = this.container.querySelector('#apply-config');
            applyBtn?.addEventListener('click', () => {
                this.applyConfig();
            });
        }

        /**
         * Setup convergence settings listeners
         */
        setupConvergenceListeners() {
            // Target confidence slider and input sync
            const targetSlider = this.container.querySelector('#target-confidence');
            const targetInput = this.container.querySelector('#target-confidence-value');
            
            targetSlider?.addEventListener('input', (e) => {
                const value = e.target.value;
                targetInput.value = value;
                this.currentConfig.convergence.target = parseFloat(value) / 100;
            });
            
            targetInput?.addEventListener('change', (e) => {
                const value = Math.max(50, Math.min(100, parseFloat(e.target.value)));
                e.target.value = value;
                targetSlider.value = value;
                this.currentConfig.convergence.target = value / 100;
            });
            
            // Strategy select
            const strategySelect = this.container.querySelector('#convergence-strategy');
            strategySelect?.addEventListener('change', (e) => {
                this.currentConfig.convergence.strategy = e.target.value;
            });
            
            // Max iterations
            const maxIterations = this.container.querySelector('#max-iterations');
            maxIterations?.addEventListener('change', (e) => {
                this.currentConfig.convergence.maxIterations = parseInt(e.target.value);
            });
            
            // Convergence threshold
            const threshold = this.container.querySelector('#convergence-threshold');
            threshold?.addEventListener('change', (e) => {
                this.currentConfig.convergence.threshold = parseFloat(e.target.value);
            });
            
            // Min confidence
            const minConfidence = this.container.querySelector('#min-confidence');
            minConfidence?.addEventListener('change', (e) => {
                this.currentConfig.minConfidence = parseFloat(e.target.value) / 100;
            });
        }

        /**
         * Handle weight change
         */
        handleWeightChange(dimension, value) {
            const weight = parseFloat(value) / 100;
            this.currentConfig.weights[dimension] = weight;
            
            // Update UI
            const control = this.container.querySelector(`[data-dimension="${dimension}"]`);
            const valueEl = control.querySelector('.weight-value');
            const fillEl = control.querySelector('.weight-fill');
            
            valueEl.textContent = `${value}%`;
            fillEl.style.width = `${value}%`;
            
            // Update total
            this.updateWeightTotal();
            
            // Mark as custom if not applying preset
            const presetSelect = this.container.querySelector('#weight-presets');
            if (presetSelect && presetSelect.value !== 'custom') {
                presetSelect.value = 'custom';
            }
            
            this.emit('weightsChanged', { weights: this.currentConfig.weights });
        }

        /**
         * Update weight total display
         */
        updateWeightTotal() {
            const total = Object.values(this.currentConfig.weights)
                .reduce((sum, weight) => sum + weight, 0);
            
            const totalEl = this.container.querySelector('#weight-total');
            totalEl.textContent = `${Math.round(total * 100)}%`;
            
            // Highlight if not 100%
            if (Math.abs(total - 1) > 0.01) {
                totalEl.classList.add('invalid');
            } else {
                totalEl.classList.remove('invalid');
            }
        }

        /**
         * Toggle weight controls enabled state
         */
        toggleWeightControls(enabled) {
            const sliders = this.container.querySelectorAll('.weight-slider');
            const presetSelect = this.container.querySelector('#weight-presets');
            const normalizeBtn = this.container.querySelector('#normalize-weights');
            
            sliders.forEach(slider => {
                slider.disabled = !enabled;
            });
            
            if (presetSelect) presetSelect.disabled = !enabled;
            if (normalizeBtn) normalizeBtn.disabled = !enabled;
            
            // Update visual state
            const weightsSection = this.container.querySelector('.weights-section');
            if (weightsSection) {
                weightsSection.classList.toggle('disabled', !enabled);
            }
        }

        /**
         * Apply weight preset
         */
        applyPreset(presetKey) {
            if (presetKey === 'custom') return;
            
            const preset = this.presets[presetKey];
            if (!preset) return;
            
            // Apply weights
            Object.entries(preset.weights).forEach(([dimension, weight]) => {
                this.currentConfig.weights[dimension] = weight;
                
                // Update UI
                const slider = this.container.querySelector(`.weight-slider[data-dimension="${dimension}"]`);
                if (slider) {
                    slider.value = Math.round(weight * 100);
                    this.handleWeightChange(dimension, slider.value);
                }
            });
            
            this.updateWeightTotal();
        }

        /**
         * Normalize weights to sum to 1
         */
        normalizeWeights() {
            const total = Object.values(this.currentConfig.weights)
                .reduce((sum, weight) => sum + weight, 0);
            
            if (total === 0) return;
            
            Object.keys(this.currentConfig.weights).forEach(dimension => {
                const normalized = this.currentConfig.weights[dimension] / total;
                this.currentConfig.weights[dimension] = normalized;
                
                // Update UI
                const slider = this.container.querySelector(`.weight-slider[data-dimension="${dimension}"]`);
                if (slider) {
                    slider.value = Math.round(normalized * 100);
                    this.handleWeightChange(dimension, slider.value);
                }
            });
            
            this.updateWeightTotal();
        }

        /**
         * Optimize weights based on feedback
         */
        async optimizeWeights() {
            if (!this.confidenceCalculator) {
                this.showNotification('Calculadora de confiança não disponível', 'error');
                return;
            }
            
            const optimizeBtn = this.container.querySelector('#optimize-weights');
            optimizeBtn.disabled = true;
            optimizeBtn.textContent = 'Otimizando...';
            
            try {
                // In real implementation, would gather feedback data
                const feedbackData = this.gatherFeedbackData();
                
                // Optimize weights
                this.confidenceCalculator.optimizeWeights(feedbackData);
                
                // Get new weights
                const newWeights = this.confidenceCalculator.getWeights();
                
                // Apply new weights
                Object.entries(newWeights).forEach(([dimension, weight]) => {
                    this.currentConfig.weights[dimension] = weight;
                    const slider = this.container.querySelector(`.weight-slider[data-dimension="${dimension}"]`);
                    if (slider) {
                        slider.value = Math.round(weight * 100);
                        this.handleWeightChange(dimension, slider.value);
                    }
                });
                
                this.showNotification('Pesos otimizados com sucesso', 'success');
                
            } catch (error) {
                console.error('Error optimizing weights:', error);
                this.showNotification('Erro ao otimizar pesos', 'error');
                
            } finally {
                optimizeBtn.disabled = false;
                optimizeBtn.innerHTML = `
                    <svg class="icon" width="14" height="14" viewBox="0 0 16 16">
                        <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
                    </svg>
                    Otimizar Automaticamente
                `;
            }
        }

        /**
         * Gather feedback data for optimization
         */
        gatherFeedbackData() {
            // In real implementation, would collect actual feedback
            // For demo, return sample data
            return [
                {
                    predictedConfidence: 0.75,
                    actualConfidence: 0.82,
                    dimensions: {
                        semantic: 0.8,
                        categorical: 0.7,
                        structural: 0.85,
                        temporal: 0.6
                    }
                },
                // More feedback entries...
            ];
        }

        /**
         * Reset configuration to defaults
         */
        resetConfig() {
            // Reset to defaults
            this.currentConfig = {
                algorithm: 'weighted_ensemble',
                weights: {
                    semantic: 0.4,
                    categorical: 0.2,
                    structural: 0.2,
                    temporal: 0.2
                },
                convergence: {
                    target: 0.85,
                    strategy: 'adaptive',
                    maxIterations: 20,
                    threshold: 0.02
                },
                enableAdaptiveWeights: true,
                minConfidence: 0.65
            };
            
            // Re-render to update UI
            this.render();
            this.setupEventListeners();
            
            this.showNotification('Configuração resetada', 'info');
        }

        /**
         * Apply current configuration
         */
        applyConfig() {
            // Validate configuration
            if (!this.validateConfig()) {
                return;
            }
            
            // Save configuration
            this.saveConfig();
            
            // Apply to calculator if available
            if (this.confidenceCalculator) {
                this.confidenceCalculator.updateConfig({
                    minConfidence: this.currentConfig.minConfidence,
                    targetConfidence: this.currentConfig.convergence.target,
                    convergenceThreshold: this.currentConfig.convergence.threshold,
                    enableAdaptiveWeights: this.currentConfig.enableAdaptiveWeights
                });
                
                // Update weights if not adaptive
                if (!this.currentConfig.enableAdaptiveWeights) {
                    Object.entries(this.currentConfig.weights).forEach(([dim, weight]) => {
                        this.confidenceCalculator.weights[dim] = weight;
                    });
                }
            }
            
            // Emit configuration change event
            this.emit('configurationApplied', this.currentConfig);
            
            this.showNotification('Configuração aplicada com sucesso', 'success');
        }

        /**
         * Validate configuration
         */
        validateConfig() {
            // Check weight total
            const weightTotal = Object.values(this.currentConfig.weights)
                .reduce((sum, weight) => sum + weight, 0);
            
            if (Math.abs(weightTotal - 1) > 0.01) {
                this.showNotification('Os pesos devem somar 100%', 'error');
                return false;
            }
            
            // Check convergence settings
            if (this.currentConfig.convergence.target < 0.5 || 
                this.currentConfig.convergence.target > 1) {
                this.showNotification('Meta de confiança inválida', 'error');
                return false;
            }
            
            return true;
        }

        /**
         * Save configuration to localStorage
         */
        saveConfig() {
            try {
                localStorage.setItem('ml-config', JSON.stringify(this.currentConfig));
            } catch (error) {
                console.error('Error saving configuration:', error);
            }
        }

        /**
         * Load saved configuration
         */
        loadSavedConfig() {
            try {
                const saved = localStorage.getItem('ml-config');
                if (saved) {
                    this.currentConfig = JSON.parse(saved);
                    this.updateUIFromConfig();
                }
            } catch (error) {
                console.error('Error loading configuration:', error);
            }
        }

        /**
         * Update UI from current configuration
         */
        updateUIFromConfig() {
            // Update algorithm selection
            const algorithmInput = this.container.querySelector(`input[value="${this.currentConfig.algorithm}"]`);
            if (algorithmInput) algorithmInput.checked = true;
            
            // Update weights
            Object.entries(this.currentConfig.weights).forEach(([dimension, weight]) => {
                const slider = this.container.querySelector(`.weight-slider[data-dimension="${dimension}"]`);
                if (slider) {
                    slider.value = Math.round(weight * 100);
                    this.handleWeightChange(dimension, slider.value);
                }
            });
            
            // Update other settings
            // ... (implementation for other settings)
        }

        /**
         * Sync with ConfidenceCalculator
         */
        syncWithCalculator() {
            if (!this.confidenceCalculator) return;
            
            // Get current calculator config
            const calcConfig = this.confidenceCalculator.getConfig();
            const calcWeights = this.confidenceCalculator.getWeights();
            
            // Update our config
            this.currentConfig.minConfidence = calcConfig.minConfidence;
            this.currentConfig.convergence.target = calcConfig.targetConfidence;
            this.currentConfig.convergence.threshold = calcConfig.convergenceThreshold;
            this.currentConfig.enableAdaptiveWeights = calcConfig.enableAdaptiveWeights;
            
            Object.entries(calcWeights).forEach(([dim, weight]) => {
                this.currentConfig.weights[dim] = weight;
            });
            
            // Update UI
            this.updateUIFromConfig();
        }

        /**
         * Toggle panel collapsed state
         */
        togglePanel() {
            this.isCollapsed = !this.isCollapsed;
            this.container.classList.toggle('collapsed', this.isCollapsed);
            
            const chevron = this.container.querySelector('.icon-chevron');
            if (chevron) {
                chevron.style.transform = this.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
            }
            
            this.emit('panelToggled', { collapsed: this.isCollapsed });
        }

        /**
         * Show notification
         */
        showNotification(message, type = 'info') {
            // Would integrate with existing notification system
            console.log(`[${type}] ${message}`);
            this.emit('notification', { message, type });
        }

        /**
         * Get current configuration
         */
        getConfig() {
            return { ...this.currentConfig };
        }

        /**
         * Set configuration
         */
        setConfig(config) {
            this.currentConfig = { ...this.currentConfig, ...config };
            this.updateUIFromConfig();
        }

        /**
         * Event emitter
         */
        on(event, handler) {
            if (!this.eventHandlers.has(event)) {
                this.eventHandlers.set(event, []);
            }
            this.eventHandlers.get(event).push(handler);
        }

        /**
         * Remove event handler
         */
        off(event, handler) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }

        /**
         * Emit event
         */
        emit(event, data) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                handlers.forEach(handler => handler(data));
            }
        }

        /**
         * Destroy the panel
         */
        destroy() {
            this.eventHandlers.clear();
            this.container.innerHTML = '';
            this.container.classList.remove('ml-config-panel', 'collapsed');
        }
    }

    // Export to global namespace
    window.MLConfigPanel = MLConfigPanel;

    // Auto-register with KC if available
    if (window.KC) {
        window.KC.MLConfigPanel = MLConfigPanel;
    }

})(window);