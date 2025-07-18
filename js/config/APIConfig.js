/**
 * APIConfig.js - Configuração de APIs e Interface de Gerenciamento
 * 
 * Centraliza configuração de API keys e preferências de providers
 * Integra com AIAPIManager para gestão de APIs
 * 
 * @requires AIAPIManager
 * @requires ModalManager
 * @requires Logger
 * @requires EventBus
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class APIConfig {
        constructor() {
            this.isInitialized = false;
            this.configKey = 'kc_api_config';
            
            // Configuração padrão
            this.defaultConfig = {
                activeProvider: 'ollama',
                providers: {
                    ollama: {
                        enabled: true,
                        baseUrl: 'http://127.0.0.1:11434',
                        model: 'llama2'
                    },
                    openai: {
                        enabled: false,
                        apiKey: '',
                        model: 'gpt-3.5-turbo'
                    },
                    gemini: {
                        enabled: false,
                        apiKey: '',
                        model: 'gemini-pro'
                    }
                },
                analysis: {
                    template: 'decisiveMoments',
                    batchSize: 5,
                    temperature: 0.7,
                    maxTokens: 1000,
                    autoFallback: true
                }
            };

            this.config = this._loadConfig();
        }

        /**
         * Inicializa o APIConfig
         */
        async initialize() {
            if (this.isInitialized) return;

            try {
                // Aplica configurações ao AIAPIManager
                await this._applyConfiguration();
                
                // Registra eventos
                this._registerEvents();
                
                this.isInitialized = true;
                if (KC.Logger) {
                    KC.Logger.success('APIConfig', 'Inicializado com sucesso');
                }
                
            } catch (error) {
                if (KC.Logger) {
                    KC.Logger.error('APIConfig', 'Erro ao inicializar', error);
                }
                throw error;
            }
        }

        /**
         * Carrega configuração do localStorage
         */
        _loadConfig() {
            try {
                const saved = localStorage.getItem(this.configKey);
                if (saved) {
                    const loaded = JSON.parse(saved);
                    // Merge com defaults para garantir estrutura completa
                    return this._deepMerge(this.defaultConfig, loaded);
                }
            } catch (error) {
                if (KC.Logger) {
                    KC.Logger.warn('APIConfig', 'Erro ao carregar config, usando defaults', error);
                }
            }
            return { ...this.defaultConfig };
        }

        /**
         * Salva configuração no localStorage
         */
        _saveConfig() {
            try {
                localStorage.setItem(this.configKey, JSON.stringify(this.config));
                if (KC.Logger) {
                    KC.Logger.info('APIConfig', 'Configuração salva');
                }
            } catch (error) {
                if (KC.Logger) {
                    KC.Logger.error('APIConfig', 'Erro ao salvar config', error);
                }
            }
        }

        /**
         * Aplica configurações ao AIAPIManager
         */
        async _applyConfiguration() {
            const manager = KC.AIAPIManager;
            if (!manager) {
                if (KC.Logger) {
                    KC.Logger.warn('APIConfig', 'AIAPIManager não disponível');
                }
                return;
            }

            // Define provider ativo
            manager.setActiveProvider(this.config.activeProvider);

            // Configura API keys
            Object.entries(this.config.providers).forEach(([provider, config]) => {
                if (config.apiKey) {
                    manager.setApiKey(provider, config.apiKey);
                }
            });

            // Verifica disponibilidade do Ollama se for o provider ativo
            if (this.config.activeProvider === 'ollama') {
                const available = await manager.checkOllamaAvailability();
                if (!available) {
                    if (KC.Logger) {
                        KC.Logger.warn('APIConfig', 'Ollama não disponível, considere usar outro provider');
                    }
                    KC.EventBus.emit(KC.Events.NOTIFICATION_SHOW, {
                        type: 'warning',
                        message: 'Servidor Ollama não encontrado em http://127.0.0.1:11434',
                        details: 'Verifique se o Ollama está rodando ou configure outro provider'
                    });
                }
            }
        }

        /**
         * Registra eventos
         */
        _registerEvents() {
            const { EventBus, Events } = KC;

            // Escuta solicitações para abrir configuração
            if (Events.OPEN_API_CONFIG) {
                EventBus.on(Events.OPEN_API_CONFIG, () => {
                    this.showConfigModal();
                });
            }
        }

        /**
         * Mostra modal de configuração
         */
        showConfigModal() {
            if (!KC.ModalManager) {
                if (KC.Logger) {
                    KC.Logger.error('APIConfig', 'ModalManager não disponível');
                }
                return;
            }

            const modalContent = this._buildConfigModalContent();
            
            KC.ModalManager.showModal('api-config', modalContent, {
                width: '600px',
                closeOnOverlay: false
            });

            // Adiciona event listeners após modal estar no DOM
            setTimeout(() => {
                this._attachModalListeners();
                this.updateTemplatePreview();
                
                // Adiciona listener direto ao select de template
                const templateSelect = document.getElementById('analysis-template');
                if (templateSelect) {
                    // Remove listener antigo se existir
                    templateSelect.removeEventListener('change', this._templateChangeHandler);
                    
                    // Cria novo handler
                    this._templateChangeHandler = (e) => {
                        console.log('APIConfig: Change event disparado, novo valor:', e.target.value);
                        this.handleTemplateChange();
                    };
                    
                    // Adiciona listener
                    templateSelect.addEventListener('change', this._templateChangeHandler);
                    console.log('APIConfig: Listener de change adicionado ao select de template');
                }
            }, 100);
        }

        /**
         * Constrói conteúdo do modal
         */
        _buildConfigModalContent() {
            const providers = KC.AIAPIManager?.getProviders() || [];
            
            return `
                <div class="modal-header">
                    <h2>⚙️ Configuração de APIs de IA</h2>
                </div>
                <div class="modal-body">
                    <div class="config-section">
                        <h3>Provider Ativo</h3>
                        <select id="active-provider" class="config-select">
                            ${providers.map(p => `
                                <option value="${p.id}" ${p.id === this.config.activeProvider ? 'selected' : ''}>
                                    ${p.name} ${p.isLocal ? '(Local)' : '(Cloud)'}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="config-section">
                        <h3>Configuração dos Providers</h3>
                        
                        <!-- Ollama (Local) -->
                        <div class="provider-config">
                            <h4>🦙 Ollama (Local)</h4>
                            <div class="config-field">
                                <label>URL Base:</label>
                                <input type="text" id="ollama-url" value="${this.config.providers.ollama.baseUrl}" 
                                       placeholder="http://127.0.0.1:11434">
                            </div>
                            <div class="config-field">
                                <label>Modelo Padrão:</label>
                                <select id="ollama-model" class="config-select">
                                    <option value="${this.config.providers.ollama.model}">${this.config.providers.ollama.model}</option>
                                </select>
                                <small class="config-help">Clique em "Testar Conexão" para carregar modelos disponíveis</small>
                            </div>
                            <button class="btn btn-secondary" onclick="KC.APIConfig.testOllama()">
                                🔍 Testar Conexão
                            </button>
                        </div>

                        <!-- OpenAI -->
                        <div class="provider-config">
                            <h4>🤖 OpenAI GPT</h4>
                            <div class="config-field">
                                <label>API Key:</label>
                                <input type="password" id="openai-key" value="${this.config.providers.openai.apiKey}" 
                                       placeholder="sk-...">
                            </div>
                            <div class="config-field">
                                <label>Modelo:</label>
                                <select id="openai-model" class="config-select">
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                    <option value="gpt-4">GPT-4</option>
                                </select>
                            </div>
                        </div>

                        <!-- Gemini -->
                        <div class="provider-config">
                            <h4>✨ Google Gemini</h4>
                            <div class="config-field">
                                <label>API Key:</label>
                                <input type="password" id="gemini-key" value="${this.config.providers.gemini.apiKey}" 
                                       placeholder="AIza...">
                            </div>
                        </div>
                    </div>

                    <div class="config-section">
                        <h3>Configurações de Análise</h3>
                        <div class="config-field">
                            <label>Template Padrão:</label>
                            <select id="modal-analysis-template" class="config-select" onchange="KC.APIConfig.handleTemplateChange()">
                                ${this._renderTemplateOptions()}
                            </select>
                            <button class="btn btn-secondary btn-small" onclick="KC.APIConfig.toggleTemplateDetails()" style="margin-top: 8px;">
                                <span id="toggle-details-icon">➕</span> <span id="toggle-details-text">Expandir Detalhes</span>
                            </button>
                        </div>
                        <div id="template-preview" class="template-preview" style="display: none;">
                            <!-- Preview será renderizado aqui -->
                        </div>
                        
                        <!-- Seção expansível de detalhes do template -->
                        <div id="template-details-section" class="template-details-section" style="display: none;">
                            <div class="template-editor-grid">
                                <div class="editor-column">
                                    <h4>📝 Configuração do Template</h4>
                                    <div class="editor-field">
                                        <label>Nome:</label>
                                        <input type="text" id="template-name" class="config-input">
                                    </div>
                                    <div class="editor-field">
                                        <label>Descrição:</label>
                                        <textarea id="template-description" class="config-textarea" rows="2"></textarea>
                                    </div>
                                    <div class="editor-field">
                                        <label>Objetivos (um por linha):</label>
                                        <textarea id="template-objectives" class="config-textarea" rows="4"></textarea>
                                    </div>
                                    <div class="editor-row">
                                        <div class="editor-field">
                                            <label>Temperature:</label>
                                            <input type="number" id="template-temp" class="config-input" min="0" max="1" step="0.1">
                                        </div>
                                        <div class="editor-field">
                                            <label>Max Tokens:</label>
                                            <input type="number" id="template-tokens" class="config-input" min="100" max="4000" step="100">
                                        </div>
                                    </div>
                                </div>
                                <div class="editor-column">
                                    <h4>🤖 Prompts</h4>
                                    <div class="editor-field">
                                        <label>System Prompt:</label>
                                        <textarea id="template-system" class="config-textarea" rows="8"></textarea>
                                    </div>
                                    <div class="editor-field">
                                        <label>Template de Usuário:</label>
                                        <textarea id="template-user" class="config-textarea" rows="8"></textarea>
                                        <small>Variáveis: {{fileName}}, {{fileDate}}, {{preview}}</small>
                                    </div>
                                    <button class="btn btn-primary btn-small" onclick="KC.APIConfig.saveTemplateChanges()">
                                        💾 Salvar Alterações do Template
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="config-field">
                            <label>Tamanho do Batch:</label>
                            <input type="number" id="batch-size" value="${this.config.analysis.batchSize}" 
                                   min="1" max="20">
                        </div>
                        <div class="config-field">
                            <label>Temperature (0-1):</label>
                            <input type="number" id="temperature" value="${this.config.analysis.temperature}" 
                                   min="0" max="1" step="0.1">
                        </div>
                        <div class="config-field">
                            <label>
                                <input type="checkbox" id="auto-fallback" 
                                       ${this.config.analysis.autoFallback ? 'checked' : ''}>
                                Fallback automático para cloud se local falhar
                            </label>
                        </div>
                    </div>

                    <div id="test-results" class="test-results" style="display: none;"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="KC.APIConfig.saveConfiguration()">
                        💾 Salvar Configurações
                    </button>
                    <button class="btn btn-secondary" onclick="KC.ModalManager.closeModal('api-config')">
                        Cancelar
                    </button>
                </div>

                <style>
                    .config-section {
                        margin-bottom: 24px;
                    }
                    .config-section h3 {
                        margin-bottom: 12px;
                        color: var(--primary-color);
                    }
                    .provider-config {
                        background: var(--background-light);
                        padding: 16px;
                        border-radius: 8px;
                        margin-bottom: 16px;
                    }
                    .provider-config h4 {
                        margin-top: 0;
                        margin-bottom: 12px;
                    }
                    .config-field {
                        margin-bottom: 12px;
                    }
                    .config-field label {
                        display: block;
                        margin-bottom: 4px;
                        font-weight: 500;
                    }
                    .config-field input[type="text"],
                    .config-field input[type="password"],
                    .config-field input[type="number"],
                    .config-select {
                        width: 100%;
                        padding: 8px;
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        background: white;
                    }
                    .template-preview {
                        background: var(--background-light);
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        padding: 12px;
                        margin-top: 12px;
                        font-size: 0.9rem;
                    }
                    .template-objectives {
                        margin-top: 8px;
                    }
                    .template-objectives li {
                        margin: 4px 0;
                        padding-left: 20px;
                        position: relative;
                    }
                    .template-objectives li:before {
                        content: "✓";
                        position: absolute;
                        left: 0;
                        color: var(--success-color);
                    }
                    .btn-small {
                        padding: 4px 12px;
                        font-size: 0.85rem;
                    }
                    .template-details-section {
                        margin-top: 20px;
                        padding: 20px;
                        background: var(--background-light);
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        animation: slideDown 0.3s ease-out;
                    }
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .template-editor-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 30px;
                    }
                    .editor-column h4 {
                        margin: 0 0 16px 0;
                        color: var(--primary-color);
                        border-bottom: 1px solid var(--border-color);
                        padding-bottom: 8px;
                    }
                    .editor-field {
                        margin-bottom: 16px;
                    }
                    .editor-field label {
                        display: block;
                        margin-bottom: 6px;
                        font-weight: 500;
                    }
                    .config-input,
                    .config-textarea {
                        width: 100%;
                        padding: 8px;
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        font-family: inherit;
                        background: white;
                    }
                    .config-textarea {
                        resize: vertical;
                        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
                        font-size: 0.85rem;
                    }
                    .editor-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                    }
                    .editor-field small {
                        display: block;
                        margin-top: 4px;
                        color: var(--text-secondary);
                        font-size: 0.85rem;
                    }
                    /* Ajuste para modal expandido */
                    .modal-expanded {
                        width: 90% !important;
                        max-width: 1400px !important;
                        transition: all 0.3s ease-out;
                    }
                    .test-results {
                        padding: 12px;
                        border-radius: 4px;
                        margin-top: 16px;
                    }
                    .test-results.success {
                        background: #d1fae5;
                        color: #065f46;
                        border: 1px solid #6ee7b7;
                    }
                    .test-results.error {
                        background: #fee2e2;
                        color: #991b1b;
                        border: 1px solid #fca5a5;
                    }
                </style>
            `;
        }

        /**
         * Anexa listeners ao modal
         */
        _attachModalListeners() {
            // Atualiza modelo Ollama selecionado
            const ollamaModel = document.getElementById('ollama-model');
            if (ollamaModel) {
                ollamaModel.value = this.config.providers.ollama.model;
            }

            // Atualiza modelo OpenAI selecionado
            const openaiModel = document.getElementById('openai-model');
            if (openaiModel) {
                openaiModel.value = this.config.providers.openai.model;
            }

            // Atualiza template selecionado
            const template = document.getElementById('modal-analysis-template');
            if (template) {
                template.value = this.config.analysis.template;
            }
        }

        /**
         * Renderiza opções de templates
         */
        _renderTemplateOptions() {
            if (!KC.PromptManager) return '';
            
            const templates = KC.PromptManager.listTemplates();
            const currentTemplate = this.config.analysis.template;
            console.log('APIConfig: Template atual na config:', currentTemplate);
            
            return templates.map(t => {
                const isSelected = t.id === currentTemplate;
                console.log(`APIConfig: Template ${t.id} - selected: ${isSelected}`);
                return `
                    <option value="${t.id}" ${isSelected ? 'selected' : ''}>
                        ${t.name}${t.isCustom ? ' (Custom)' : ''}
                    </option>
                `;
            }).join('');
        }

        /**
         * Manipula mudança de template
         */
        handleTemplateChange() {
            const templateSelect = document.getElementById('modal-analysis-template');
            const selectedValue = templateSelect ? templateSelect.value : null;
            console.log('APIConfig: Template alterado para:', selectedValue);
            
            this.updateTemplatePreview();
            
            // Se a seção de detalhes estiver aberta, atualiza os campos
            const detailsSection = document.getElementById('template-details-section');
            if (detailsSection && detailsSection.style.display !== 'none') {
                console.log('APIConfig: Seção expandida, atualizando campos...');
                // Pequeno delay para garantir que o DOM está pronto
                setTimeout(() => this.loadTemplateDetails(), 50);
            }
        }

        /**
         * Atualiza preview do template selecionado
         */
        updateTemplatePreview() {
            const templateSelect = document.getElementById('modal-analysis-template');
            const previewDiv = document.getElementById('template-preview');
            
            if (!templateSelect || !previewDiv || !KC.PromptManager) return;
            
            const templateId = templateSelect.value;
            const templates = KC.PromptManager.listTemplates();
            const template = templates.find(t => t.id === templateId);
            
            if (template && template.objectives && template.objectives.length > 0) {
                previewDiv.innerHTML = `
                    <strong>📋 Objetivos do Template:</strong>
                    <ul class="template-objectives">
                        ${template.objectives.map(obj => `<li>${obj}</li>`).join('')}
                    </ul>
                `;
                previewDiv.style.display = 'block';
            } else {
                previewDiv.style.display = 'none';
            }
            
            // Removido - agora é tratado em handleTemplateChange()
        }

        /**
         * Alterna exibição dos detalhes do template
         */
        toggleTemplateDetails() {
            const detailsSection = document.getElementById('template-details-section');
            const toggleIcon = document.getElementById('toggle-details-icon');
            const toggleText = document.getElementById('toggle-details-text');
            const modal = document.querySelector('#modal-api-config .modal');
            
            if (!detailsSection) return;
            
            if (detailsSection.style.display === 'none') {
                // Expandir
                detailsSection.style.display = 'block';
                toggleIcon.textContent = '➖';
                toggleText.textContent = 'Recolher Detalhes';
                
                // Expandir modal
                if (modal) {
                    modal.classList.add('modal-expanded');
                }
                
                // Carregar dados do template atual
                // Força atualização dos campos
                setTimeout(() => {
                    this.loadTemplateDetails();
                }, 100);
            } else {
                // Recolher
                detailsSection.style.display = 'none';
                toggleIcon.textContent = '➕';
                toggleText.textContent = 'Expandir Detalhes';
                
                // Restaurar tamanho do modal
                if (modal) {
                    modal.classList.remove('modal-expanded');
                }
            }
        }

        /**
         * Carrega detalhes do template selecionado
         */
        loadTemplateDetails() {
            const templateSelect = document.getElementById('modal-analysis-template');
            if (!templateSelect || !KC.PromptManager) {
                console.warn('APIConfig: loadTemplateDetails - elementos não encontrados');
                return;
            }
            
            // Força leitura do valor selecionado
            const selectedIndex = templateSelect.selectedIndex;
            const templateId = selectedIndex >= 0 ? templateSelect.options[selectedIndex].value : templateSelect.value;
            
            console.log('APIConfig: Select info:', {
                value: templateSelect.value,
                selectedIndex: selectedIndex,
                selectedOption: selectedIndex >= 0 ? templateSelect.options[selectedIndex].text : 'none',
                templateId: templateId
            });
            
            const preview = KC.PromptManager.getTemplatePreview(templateId);
            
            if (!preview) {
                console.warn('APIConfig: Preview não encontrado para template:', templateId);
                return;
            }
            
            console.log('APIConfig: Preview carregado:', preview);
            
            // Verifica se os campos existem antes de preencher
            const nameField = document.getElementById('template-name');
            const descField = document.getElementById('template-description');
            const objField = document.getElementById('template-objectives');
            const sysField = document.getElementById('template-system');
            const userField = document.getElementById('template-user');
            const tempField = document.getElementById('template-temp');
            const tokensField = document.getElementById('template-tokens');
            
            // Só preenche se os campos existirem (seção expandida)
            let fieldsUpdated = 0;
            if (nameField) {
                nameField.value = preview.name || '';
                fieldsUpdated++;
            }
            if (descField) {
                descField.value = preview.description || '';
                fieldsUpdated++;
            }
            if (objField) {
                objField.value = (preview.objectives || []).join('\n');
                fieldsUpdated++;
            }
            if (sysField) {
                sysField.value = preview.systemPrompt || '';
                fieldsUpdated++;
            }
            if (userField) {
                userField.value = preview.userPromptTemplate || '';
                fieldsUpdated++;
            }
            if (tempField) {
                tempField.value = preview.temperature || 0.7;
                fieldsUpdated++;
            }
            if (tokensField) {
                tokensField.value = preview.maxTokens || 1000;
                fieldsUpdated++;
            }
            
            console.log(`APIConfig: ${fieldsUpdated} campos atualizados`);
        }

        /**
         * Salva alterações do template
         */
        saveTemplateChanges() {
            const templateSelect = document.getElementById('modal-analysis-template');
            if (!templateSelect) return;
            
            const templateId = templateSelect.value;
            
            // Obter preview atual para comparação
            const preview = KC.PromptManager.getTemplatePreview(templateId);
            
            const updates = {
                name: document.getElementById('template-name').value,
                description: document.getElementById('template-description').value,
                objectives: document.getElementById('template-objectives').value.split('\n').filter(o => o.trim()),
                systemPrompt: document.getElementById('template-system').value,
                userPromptTemplate: document.getElementById('template-user').value,
                temperature: parseFloat(document.getElementById('template-temp').value),
                maxTokens: parseInt(document.getElementById('template-tokens').value)
            };
            
            // Valida antes de salvar
            if (KC.PromptManager && KC.PromptManager.validateTemplateConfig) {
                const validation = KC.PromptManager.validateTemplateConfig(updates);
                if (!validation.isValid) {
                    KC.EventBus.emit(KC.Events.NOTIFICATION_SHOW, {
                        type: 'error',
                        message: 'Erro de validação',
                        details: validation.errors.join('<br>')
                    });
                    return;
                }
            }
            
            if (KC.PromptManager.updateTemplate(templateId, updates)) {
                KC.EventBus.emit(KC.Events.NOTIFICATION_SHOW, {
                    type: 'success',
                    message: 'Template atualizado com sucesso!'
                });
                
                // Atualiza preview
                this.updateTemplatePreview();
                
                // Recarrega opções se o nome mudou
                if (updates.name !== preview.name) {
                    templateSelect.innerHTML = this._renderTemplateOptions();
                    templateSelect.value = templateId;
                }
            } else {
                KC.EventBus.emit(KC.Events.NOTIFICATION_SHOW, {
                    type: 'error',
                    message: 'Erro ao atualizar template'
                });
            }
        }


        /**
         * Testa conexão com Ollama
         */
        async testOllama() {
            const resultsDiv = document.getElementById('test-results');
            if (!resultsDiv) return;

            resultsDiv.style.display = 'block';
            resultsDiv.className = 'test-results';
            resultsDiv.innerHTML = '⏳ Testando conexão com Ollama...';

            try {
                const url = document.getElementById('ollama-url')?.value || this.config.providers.ollama.baseUrl;
                const response = await fetch(`${url}/api/tags`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });

                if (response.ok) {
                    const data = await response.json();
                    const models = data.models || [];
                    const modelNames = models.map(m => m.name).join(', ') || 'Nenhum modelo encontrado';
                    
                    // Atualiza o select com os modelos reais
                    const modelSelect = document.getElementById('ollama-model');
                    if (modelSelect && models.length > 0) {
                        const currentValue = modelSelect.value;
                        modelSelect.innerHTML = '';
                        
                        // Adiciona os modelos reais como opções
                        models.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.name;
                            option.textContent = model.name;
                            if (model.name === currentValue) {
                                option.selected = true;
                            }
                            modelSelect.appendChild(option);
                        });
                        
                        // Se o modelo atual não estiver na lista, seleciona o primeiro
                        if (!models.find(m => m.name === currentValue) && models.length > 0) {
                            modelSelect.value = models[0].name;
                        }
                    }
                    
                    resultsDiv.className = 'test-results success';
                    resultsDiv.innerHTML = `
                        ✅ Ollama conectado com sucesso!<br>
                        Modelos disponíveis: ${modelNames}
                    `;
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (error) {
                resultsDiv.className = 'test-results error';
                resultsDiv.innerHTML = `
                    ❌ Falha ao conectar com Ollama<br>
                    Erro: ${error.message}<br>
                    Verifique se o servidor está rodando em ${document.getElementById('ollama-url')?.value}
                `;
            }
        }

        /**
         * Salva configurações do modal
         */
        saveConfiguration() {
            try {
                // Coleta valores do modal
                this.config.activeProvider = document.getElementById('active-provider')?.value || 'ollama';
                
                // Ollama
                this.config.providers.ollama.baseUrl = document.getElementById('ollama-url')?.value || this.config.providers.ollama.baseUrl;
                this.config.providers.ollama.model = document.getElementById('ollama-model')?.value || 'llama2';
                
                // OpenAI
                this.config.providers.openai.apiKey = document.getElementById('openai-key')?.value || '';
                this.config.providers.openai.model = document.getElementById('openai-model')?.value || 'gpt-3.5-turbo';
                
                // Gemini
                this.config.providers.gemini.apiKey = document.getElementById('gemini-key')?.value || '';
                
                // Análise
                const selectedTemplate = document.getElementById('modal-analysis-template')?.value || 'decisiveMoments';
                console.log('APIConfig: Salvando template selecionado:', selectedTemplate);
                this.config.analysis.template = selectedTemplate;
                this.config.analysis.batchSize = parseInt(document.getElementById('batch-size')?.value) || 5;
                this.config.analysis.temperature = parseFloat(document.getElementById('temperature')?.value) || 0.7;
                this.config.analysis.autoFallback = document.getElementById('auto-fallback')?.checked || false;

                // Salva e aplica
                this._saveConfig();
                this._applyConfiguration();

                // Fecha modal
                KC.ModalManager.closeModal('api-config');

                // Notifica sucesso
                KC.EventBus.emit(KC.Events.NOTIFICATION_SHOW, {
                    type: 'success',
                    message: 'Configurações salvas com sucesso!',
                    duration: 3000
                });

                // Emite evento de mudança
                KC.EventBus.emit(KC.Events.API_CONFIG_CHANGED, {
                    config: this.config
                });

            } catch (error) {
                if (KC.Logger) {
                    KC.Logger.error('APIConfig', 'Erro ao salvar configurações', error);
                }
                KC.EventBus.emit(KC.Events.NOTIFICATION_SHOW, {
                    type: 'error',
                    message: 'Erro ao salvar configurações',
                    details: error.message
                });
            }
        }

        /**
         * Obtém configuração atual
         */
        getConfig() {
            return { ...this.config };
        }

        /**
         * Obtém configuração de provider específico
         */
        getProviderConfig(providerId) {
            return this.config.providers[providerId];
        }

        /**
         * Obtém configuração de análise
         */
        getAnalysisConfig() {
            return { ...this.config.analysis };
        }

        /**
         * Merge profundo de objetos
         */
        _deepMerge(target, source) {
            const output = { ...target };
            
            if (this._isObject(target) && this._isObject(source)) {
                Object.keys(source).forEach(key => {
                    if (this._isObject(source[key])) {
                        if (!(key in target)) {
                            Object.assign(output, { [key]: source[key] });
                        } else {
                            output[key] = this._deepMerge(target[key], source[key]);
                        }
                    } else {
                        Object.assign(output, { [key]: source[key] });
                    }
                });
            }
            
            return output;
        }

        _isObject(item) {
            return item && typeof item === 'object' && !Array.isArray(item);
        }
    }

    // Registra no namespace global
    KC.APIConfig = new APIConfig();
    if (KC.Logger) {
        KC.Logger.info('APIConfig', 'Componente registrado com sucesso');
    }

})(window);