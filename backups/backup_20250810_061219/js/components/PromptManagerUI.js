/**
 * PromptManagerUI.js - Interface Visual para Gerenciamento de Templates
 * 
 * Componente de frontend que fornece interface completa para:
 * - Seleção de templates com cards
 * - Editor de templates com syntax highlighting
 * - Preview em tempo real
 * - Import/export JSON
 * - Integração com PromptManager existente
 * 
 * @requires PromptManager
 * @requires ModalManager
 * @requires Logger
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const logger = KC.Logger;

    class PromptManagerUI {
        constructor() {
            this.container = null;
            this.currentTemplate = null;
            this.isEditing = false;
            this.previewMode = false;
            this.unsavedChanges = false;
            
            // Estado da interface
            this.uiState = {
                selectedTemplateId: 'decisiveMoments',
                viewMode: 'cards', // cards, editor, preview
                filterCategory: 'all', // all, default, custom
                searchTerm: ''
            };

            // Cache para performance
            this.templateCache = new Map();
            this.previewTimer = null;
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            this.setupEventListeners();
            logger.info('PromptManagerUI', 'Componente inicializado');
        }

        /**
         * Configura event listeners
         */
        setupEventListeners() {
            // Event listener para abrir interface de templates
            KC.EventBus.on('OPEN_TEMPLATE_MANAGER', () => {
                this.openTemplateManager();
            });

            // Event listener para keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (this.container && this.container.style.display !== 'none') {
                    this.handleKeyboardShortcuts(e);
                }
            });
        }

        /**
         * Abre o gerenciador de templates em modal
         */
        openTemplateManager() {
            const modalContent = this.renderTemplateManagerModal();
            
            KC.ModalManager.open({
                id: 'template-manager',
                title: '🎯 Gerenciador de Templates de Análise',
                content: modalContent,
                size: 'extra-large',
                showCloseButton: true,
                onOpen: () => {
                    this.container = document.getElementById('template-manager-content');
                    this.setupTemplateManagerEvents();
                    this.loadTemplatesList();
                },
                onClose: () => {
                    this.handleUnsavedChanges();
                }
            });
        }

        /**
         * Renderiza conteúdo do modal de gerenciamento
         */
        renderTemplateManagerModal() {
            return `
                <div id="template-manager-content" class="template-manager">
                    <!-- Header com controles -->
                    <div class="template-header">
                        <div class="template-tabs">
                            <button class="tab-btn active" data-tab="cards">
                                <i class="icon-grid"></i> Templates
                            </button>
                            <button class="tab-btn" data-tab="editor">
                                <i class="icon-edit"></i> Editor
                            </button>
                            <button class="tab-btn" data-tab="preview">
                                <i class="icon-eye"></i> Preview
                            </button>
                        </div>
                        
                        <div class="template-actions">
                            <div class="search-box">
                                <input type="text" id="template-search" placeholder="Buscar templates..." />
                                <i class="icon-search"></i>
                            </div>
                            
                            <select id="template-filter" class="filter-select">
                                <option value="all">Todos os Templates</option>
                                <option value="default">Padrão</option>
                                <option value="custom">Customizados</option>
                            </select>
                            
                            <button class="btn-primary" id="create-template">
                                <i class="icon-plus"></i> Novo Template
                            </button>
                            
                            <button class="btn-secondary" id="import-templates">
                                <i class="icon-upload"></i> Importar
                            </button>
                        </div>
                    </div>

                    <!-- Conteúdo das abas -->
                    <div class="template-content">
                        <!-- Aba de Cards -->
                        <div id="tab-cards" class="tab-content active">
                            <div id="templates-grid" class="templates-grid">
                                <!-- Cards de templates serão inseridos aqui -->
                            </div>
                        </div>

                        <!-- Aba do Editor -->
                        <div id="tab-editor" class="tab-content">
                            <div class="editor-layout">
                                <!-- Sidebar com templates -->
                                <div class="editor-sidebar">
                                    <h4>Templates</h4>
                                    <div id="editor-template-list" class="template-list">
                                        <!-- Lista de templates -->
                                    </div>
                                </div>

                                <!-- Área principal do editor -->
                                <div class="editor-main">
                                    <div class="editor-toolbar">
                                        <div class="template-info">
                                            <h3 id="editing-template-name">Selecione um template</h3>
                                            <span id="editing-template-type" class="template-type-badge"></span>
                                        </div>
                                        
                                        <div class="editor-actions">
                                            <button class="btn-success" id="save-template" disabled>
                                                <i class="icon-save"></i> Salvar
                                            </button>
                                            <button class="btn-secondary" id="reset-template">
                                                <i class="icon-refresh"></i> Resetar
                                            </button>
                                            <button class="btn-danger" id="delete-template">
                                                <i class="icon-trash"></i> Excluir
                                            </button>
                                        </div>
                                    </div>

                                    <div class="editor-fields">
                                        <!-- Informações básicas -->
                                        <div class="field-group">
                                            <label for="template-name">Nome do Template</label>
                                            <input type="text" id="template-name" class="form-input" />
                                        </div>

                                        <div class="field-group">
                                            <label for="template-description">Descrição</label>
                                            <textarea id="template-description" class="form-textarea" rows="2"></textarea>
                                        </div>

                                        <!-- Objetivos -->
                                        <div class="field-group">
                                            <label for="template-objectives">Objetivos (um por linha)</label>
                                            <textarea id="template-objectives" class="form-textarea" rows="4"></textarea>
                                        </div>

                                        <!-- System Prompt -->
                                        <div class="field-group">
                                            <label for="system-prompt">System Prompt</label>
                                            <div class="code-editor-wrapper">
                                                <textarea id="system-prompt" class="code-editor" rows="8"></textarea>
                                                <div class="editor-tools">
                                                    <button class="tool-btn" data-action="format">Format</button>
                                                    <button class="tool-btn" data-action="validate">Validate</button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- User Prompt Template -->
                                        <div class="field-group">
                                            <label for="user-prompt">User Prompt Template</label>
                                            <div class="code-editor-wrapper">
                                                <textarea id="user-prompt" class="code-editor" rows="10"></textarea>
                                                <div class="placeholder-helper">
                                                    <span class="placeholder-tag" data-placeholder="{{fileName}}">{{fileName}}</span>
                                                    <span class="placeholder-tag" data-placeholder="{{filePath}}">{{filePath}}</span>
                                                    <span class="placeholder-tag" data-placeholder="{{fileDate}}">{{fileDate}}</span>
                                                    <span class="placeholder-tag" data-placeholder="{{content}}">{{content}}</span>
                                                    <span class="placeholder-tag" data-placeholder="{{context}}">{{context}}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Configurações -->
                                        <div class="config-row">
                                            <div class="field-group">
                                                <label for="template-temperature">Temperature</label>
                                                <input type="range" id="template-temperature" min="0" max="1" step="0.1" value="0.7" />
                                                <span class="range-value">0.7</span>
                                            </div>

                                            <div class="field-group">
                                                <label for="template-max-tokens">Max Tokens</label>
                                                <input type="number" id="template-max-tokens" min="100" max="4000" value="1000" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Aba de Preview -->
                        <div id="tab-preview" class="tab-content">
                            <div class="preview-layout">
                                <!-- Controles do preview -->
                                <div class="preview-controls">
                                    <select id="preview-template-select">
                                        <!-- Options serão preenchidas dinamicamente -->
                                    </select>
                                    
                                    <div class="preview-options">
                                        <label>
                                            <input type="checkbox" id="live-preview" checked />
                                            Preview em Tempo Real
                                        </label>
                                        
                                        <label>
                                            <input type="checkbox" id="show-variables" />
                                            Mostrar Variáveis
                                        </label>
                                    </div>
                                    
                                    <button class="btn-primary" id="refresh-preview">
                                        <i class="icon-refresh"></i> Atualizar Preview
                                    </button>
                                </div>

                                <!-- Área do preview -->
                                <div class="preview-content">
                                    <div class="preview-section">
                                        <h4>System Prompt</h4>
                                        <div id="preview-system" class="preview-text"></div>
                                    </div>

                                    <div class="preview-section">
                                        <h4>User Prompt (com exemplo)</h4>
                                        <div id="preview-user" class="preview-text"></div>
                                    </div>

                                    <div class="preview-section">
                                        <h4>Formato de Resposta Esperado</h4>
                                        <div id="preview-format" class="preview-code"></div>
                                    </div>

                                    <div class="preview-section">
                                        <h4>Configurações</h4>
                                        <div id="preview-config" class="preview-config">
                                            <!-- Configurações do template -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer com ações globais -->
                    <div class="template-footer">
                        <div class="footer-info">
                            <span id="template-count">0 templates carregados</span>
                            <span id="unsaved-indicator" class="unsaved-indicator" style="display: none;">
                                <i class="icon-warning"></i> Alterações não salvas
                            </span>
                        </div>
                        
                        <div class="footer-actions">
                            <button class="btn-secondary" id="export-all-templates">
                                <i class="icon-download"></i> Exportar Todos
                            </button>
                            
                            <button class="btn-primary" id="apply-template" disabled>
                                <i class="icon-check"></i> Usar Template Selecionado
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Configura event listeners específicos do template manager
         */
        setupTemplateManagerEvents() {
            // Navegação entre abas
            this.container.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.switchTab(e.target.dataset.tab);
                });
            });

            // Busca e filtros
            const searchInput = document.getElementById('template-search');
            const filterSelect = document.getElementById('template-filter');
            
            searchInput.addEventListener('input', debounce(() => {
                this.uiState.searchTerm = searchInput.value;
                this.filterTemplates();
            }, 300));

            filterSelect.addEventListener('change', () => {
                this.uiState.filterCategory = filterSelect.value;
                this.filterTemplates();
            });

            // Ações dos botões
            document.getElementById('create-template').addEventListener('click', () => {
                this.createNewTemplate();
            });

            document.getElementById('import-templates').addEventListener('click', () => {
                this.importTemplates();
            });

            document.getElementById('save-template').addEventListener('click', () => {
                this.saveCurrentTemplate();
            });

            document.getElementById('reset-template').addEventListener('click', () => {
                this.resetTemplate();
            });

            document.getElementById('delete-template').addEventListener('click', () => {
                this.deleteTemplate();
            });

            document.getElementById('export-all-templates').addEventListener('click', () => {
                this.exportAllTemplates();
            });

            document.getElementById('apply-template').addEventListener('click', () => {
                this.applySelectedTemplate();
            });

            // Editor events
            this.setupEditorEvents();
            
            // Preview events
            this.setupPreviewEvents();
        }

        /**
         * Configura eventos do editor
         */
        setupEditorEvents() {
            // Monitoramento de mudanças
            const editableFields = [
                'template-name', 'template-description', 'template-objectives',
                'system-prompt', 'user-prompt', 'template-temperature', 'template-max-tokens'
            ];

            editableFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('input', () => {
                        this.markAsUnsaved();
                        if (document.getElementById('live-preview')?.checked) {
                            this.updatePreview();
                        }
                    });
                }
            });

            // Range value display
            const temperatureRange = document.getElementById('template-temperature');
            if (temperatureRange) {
                temperatureRange.addEventListener('input', (e) => {
                    const valueSpan = e.target.nextElementSibling;
                    valueSpan.textContent = e.target.value;
                });
            }

            // Placeholder helper
            this.container.querySelectorAll('.placeholder-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    const placeholder = tag.dataset.placeholder;
                    const userPromptTextarea = document.getElementById('user-prompt');
                    const cursorPos = userPromptTextarea.selectionStart;
                    const textBefore = userPromptTextarea.value.substring(0, cursorPos);
                    const textAfter = userPromptTextarea.value.substring(cursorPos);
                    
                    userPromptTextarea.value = textBefore + placeholder + textAfter;
                    userPromptTextarea.focus();
                    userPromptTextarea.setSelectionRange(cursorPos + placeholder.length, cursorPos + placeholder.length);
                    
                    this.markAsUnsaved();
                });
            });

            // Code editor tools
            this.container.querySelectorAll('.tool-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    const textarea = e.target.closest('.code-editor-wrapper').querySelector('textarea');
                    this.handleCodeEditorAction(action, textarea);
                });
            });
        }

        /**
         * Configura eventos do preview
         */
        setupPreviewEvents() {
            const previewSelect = document.getElementById('preview-template-select');
            const livePreview = document.getElementById('live-preview');
            const showVariables = document.getElementById('show-variables');
            const refreshBtn = document.getElementById('refresh-preview');

            if (previewSelect) {
                previewSelect.addEventListener('change', () => {
                    this.updatePreview();
                });
            }

            if (livePreview) {
                livePreview.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.updatePreview();
                    }
                });
            }

            if (showVariables) {
                showVariables.addEventListener('change', () => {
                    this.updatePreview();
                });
            }

            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.updatePreview();
                });
            }
        }

        /**
         * Carrega lista de templates
         */
        loadTemplatesList() {
            const templates = KC.PromptManager.listTemplates();
            this.renderTemplateCards(templates);
            this.renderEditorTemplateList(templates);
            this.renderPreviewTemplateSelect(templates);
            this.updateTemplateCount(templates.length);
        }

        /**
         * Renderiza cards de templates
         */
        renderTemplateCards(templates) {
            const grid = document.getElementById('templates-grid');
            if (!grid) return;

            grid.innerHTML = templates.map(template => `
                <div class="template-card" data-template-id="${template.id}">
                    <div class="card-header">
                        <h3 class="template-name">${template.name}</h3>
                        <div class="template-badges">
                            ${template.isCustom ? '<span class="badge custom">Custom</span>' : '<span class="badge default">Padrão</span>'}
                        </div>
                    </div>
                    
                    <div class="card-content">
                        <p class="template-description">${template.description}</p>
                        
                        ${template.objectives ? `
                            <div class="objectives">
                                <h5>Objetivos:</h5>
                                <ul>
                                    ${template.objectives.map(obj => `<li>${obj}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn-primary btn-select" data-template-id="${template.id}">
                            <i class="icon-check"></i> Selecionar
                        </button>
                        <button class="btn-secondary btn-edit" data-template-id="${template.id}">
                            <i class="icon-edit"></i> Editar
                        </button>
                        <button class="btn-secondary btn-preview" data-template-id="${template.id}">
                            <i class="icon-eye"></i> Preview
                        </button>
                        ${template.isCustom ? `
                            <button class="btn-danger btn-delete" data-template-id="${template.id}">
                                <i class="icon-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            // Event listeners para os cards
            grid.querySelectorAll('.btn-select').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.selectTemplate(e.target.dataset.templateId);
                });
            });

            grid.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.editTemplate(e.target.dataset.templateId);
                });
            });

            grid.querySelectorAll('.btn-preview').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.previewTemplate(e.target.dataset.templateId);
                });
            });

            grid.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.deleteTemplateConfirm(e.target.dataset.templateId);
                });
            });
        }

        /**
         * Renderiza lista de templates no editor
         */
        renderEditorTemplateList(templates) {
            const list = document.getElementById('editor-template-list');
            if (!list) return;

            list.innerHTML = templates.map(template => `
                <div class="template-list-item" data-template-id="${template.id}">
                    <div class="item-info">
                        <span class="item-name">${template.name}</span>
                        ${template.isCustom ? '<span class="item-badge custom">Custom</span>' : '<span class="item-badge default">Padrão</span>'}
                    </div>
                </div>
            `).join('');

            // Event listeners
            list.querySelectorAll('.template-list-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.loadTemplateInEditor(item.dataset.templateId);
                });
            });
        }

        /**
         * Renderiza select de templates no preview
         */
        renderPreviewTemplateSelect(templates) {
            const select = document.getElementById('preview-template-select');
            if (!select) return;

            select.innerHTML = templates.map(template => `
                <option value="${template.id}">${template.name}</option>
            `).join('');
        }

        /**
         * Alterna entre abas
         */
        switchTab(tabName) {
            // Atualiza botões
            this.container.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });

            // Atualiza conteúdo
            this.container.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `tab-${tabName}`);
            });

            this.uiState.viewMode = tabName;

            // Ações específicas por aba
            if (tabName === 'preview') {
                this.updatePreview();
            }
        }

        /**
         * Seleciona template para uso
         */
        selectTemplate(templateId) {
            this.uiState.selectedTemplateId = templateId;
            
            // Atualiza UI
            this.container.querySelectorAll('.template-card').forEach(card => {
                card.classList.toggle('selected', card.dataset.templateId === templateId);
            });

            // Habilita botão de aplicar
            const applyBtn = document.getElementById('apply-template');
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.textContent = `✓ Usar ${KC.PromptManager.getTemplate(templateId)?.name}`;
            }

            logger.info('PromptManagerUI', `Template selecionado: ${templateId}`);
        }

        /**
         * Abre template no editor
         */
        editTemplate(templateId) {
            this.switchTab('editor');
            this.loadTemplateInEditor(templateId);
        }

        /**
         * Abre template no preview
         */
        previewTemplate(templateId) {
            this.switchTab('preview');
            document.getElementById('preview-template-select').value = templateId;
            this.updatePreview();
        }

        /**
         * Carrega template no editor
         */
        loadTemplateInEditor(templateId) {
            const template = KC.PromptManager.getTemplatePreview(templateId);
            if (!template) return;

            this.currentTemplate = template;
            this.isEditing = true;

            // Preenche campos
            document.getElementById('template-name').value = template.name || '';
            document.getElementById('template-description').value = template.description || '';
            document.getElementById('template-objectives').value = (template.objectives || []).join('\n');
            document.getElementById('system-prompt').value = template.systemPrompt || '';
            document.getElementById('user-prompt').value = template.userPromptTemplate || '';
            document.getElementById('template-temperature').value = template.temperature || 0.7;
            document.getElementById('template-max-tokens').value = template.maxTokens || 1000;

            // Atualiza UI
            document.getElementById('editing-template-name').textContent = template.name;
            document.getElementById('editing-template-type').textContent = template.isCustom ? 'Custom' : 'Padrão';
            
            // Atualiza range value
            const temperatureSpan = document.querySelector('#template-temperature + .range-value');
            if (temperatureSpan) {
                temperatureSpan.textContent = template.temperature || 0.7;
            }

            // Destaca template selecionado na lista
            this.container.querySelectorAll('.template-list-item').forEach(item => {
                item.classList.toggle('active', item.dataset.templateId === templateId);
            });

            // Habilita controles
            document.getElementById('save-template').disabled = false;
            document.getElementById('delete-template').disabled = !template.isCustom;

            this.unsavedChanges = false;
            this.updateUnsavedIndicator();

            logger.info('PromptManagerUI', `Template carregado no editor: ${templateId}`);
        }

        /**
         * Atualiza preview
         */
        updatePreview() {
            if (this.previewTimer) {
                clearTimeout(this.previewTimer);
            }

            this.previewTimer = setTimeout(() => {
                this._doUpdatePreview();
            }, 300);
        }

        /**
         * Executa atualização do preview
         */
        _doUpdatePreview() {
            const select = document.getElementById('preview-template-select');
            if (!select || !select.value) return;

            const templateId = select.value;
            const template = KC.PromptManager.getTemplatePreview(templateId);
            if (!template) return;

            // System prompt
            const systemEl = document.getElementById('preview-system');
            if (systemEl) {
                systemEl.innerHTML = this.formatPromptForDisplay(template.systemPrompt);
            }

            // User prompt com exemplo
            const userEl = document.getElementById('preview-user');
            if (userEl) {
                userEl.innerHTML = this.formatPromptForDisplay(template.userPromptExample);
            }

            // Formato de resposta
            const formatEl = document.getElementById('preview-format');
            if (formatEl) {
                formatEl.innerHTML = `<pre><code>${JSON.stringify(template.responseFormat, null, 2)}</code></pre>`;
            }

            // Configurações
            const configEl = document.getElementById('preview-config');
            if (configEl) {
                configEl.innerHTML = `
                    <div class="config-item">
                        <span class="config-label">Temperature:</span>
                        <span class="config-value">${template.temperature}</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Max Tokens:</span>
                        <span class="config-value">${template.maxTokens}</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Tipo:</span>
                        <span class="config-value">${template.isCustom ? 'Customizado' : 'Padrão'}</span>
                    </div>
                `;
            }
        }

        /**
         * Formata prompt para exibição
         */
        formatPromptForDisplay(promptText) {
            if (!promptText) return '<em>Nenhum conteúdo</em>';

            // Aplica syntax highlighting básico
            let formatted = promptText
                .replace(/\{\{([^}]+)\}\}/g, '<span class="variable">${$1}</span>')
                .replace(/^(#{1,6})\s+(.+)$/gm, '<h$1.length class="markdown-header">$2</h$1.length>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');

            return `<pre>${formatted}</pre>`;
        }

        /**
         * Marca template como não salvo
         */
        markAsUnsaved() {
            this.unsavedChanges = true;
            this.updateUnsavedIndicator();
            document.getElementById('save-template').disabled = false;
        }

        /**
         * Atualiza indicador de mudanças não salvas
         */
        updateUnsavedIndicator() {
            const indicator = document.getElementById('unsaved-indicator');
            if (indicator) {
                indicator.style.display = this.unsavedChanges ? 'flex' : 'none';
            }
        }

        /**
         * Lida com atalhos de teclado
         */
        handleKeyboardShortcuts(e) {
            // Ctrl+S - Salvar
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.isEditing) {
                    this.saveCurrentTemplate();
                }
            }
            // Escape - Fechar ou resetar
            else if (e.key === 'Escape') {
                if (this.unsavedChanges) {
                    this.handleUnsavedChanges();
                } else {
                    KC.ModalManager.close('template-manager');
                }
            }
        }

        /**
         * Lida com mudanças não salvas
         */
        handleUnsavedChanges() {
            if (!this.unsavedChanges) return true;

            const save = confirm('Você tem alterações não salvas. Deseja salvar antes de continuar?');
            if (save) {
                this.saveCurrentTemplate();
                return true;
            } else {
                this.unsavedChanges = false;
                return true;
            }
        }

        /**
         * Salva template atual
         */
        saveCurrentTemplate() {
            if (!this.currentTemplate) return;

            try {
                const updates = {
                    name: document.getElementById('template-name').value,
                    description: document.getElementById('template-description').value,
                    objectives: document.getElementById('template-objectives').value.split('\n').filter(obj => obj.trim()),
                    systemPrompt: document.getElementById('system-prompt').value,
                    userPromptTemplate: document.getElementById('user-prompt').value,
                    temperature: parseFloat(document.getElementById('template-temperature').value),
                    maxTokens: parseInt(document.getElementById('template-max-tokens').value)
                };

                KC.PromptManager.updateTemplate(this.currentTemplate.id, updates);
                
                this.unsavedChanges = false;
                this.updateUnsavedIndicator();
                
                // Recarrega lista
                this.loadTemplatesList();
                
                logger.info('PromptManagerUI', `Template salvo: ${this.currentTemplate.id}`);
                
                // Feedback visual
                const saveBtn = document.getElementById('save-template');
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="icon-check"></i> Salvo!';
                saveBtn.disabled = true;
                
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                }, 2000);

            } catch (error) {
                logger.error('PromptManagerUI', 'Erro ao salvar template', error);
                alert('Erro ao salvar template: ' + error.message);
            }
        }

        /**
         * Cria novo template
         */
        createNewTemplate() {
            const name = prompt('Nome do novo template:');
            if (!name) return;

            try {
                const id = 'custom_' + Date.now();
                KC.PromptManager.createCustomTemplate(id, {
                    name: name,
                    description: 'Template customizado',
                    systemPrompt: 'Você é um assistente especializado...',
                    userPromptTemplate: 'Analise o seguinte conteúdo:\n\n{{content}}',
                    temperature: 0.7,
                    maxTokens: 1000
                });

                this.loadTemplatesList();
                this.editTemplate(id);
                
                logger.info('PromptManagerUI', `Novo template criado: ${id}`);

            } catch (error) {
                logger.error('PromptManagerUI', 'Erro ao criar template', error);
                alert('Erro ao criar template: ' + error.message);
            }
        }

        /**
         * Deleta template
         */
        deleteTemplateConfirm(templateId) {
            const template = KC.PromptManager.getTemplate(templateId);
            if (!template || !template.isCustom) return;

            const confirm = window.confirm(`Tem certeza que deseja excluir o template "${template.name}"?`);
            if (confirm) {
                KC.PromptManager.removeCustomTemplate(templateId);
                this.loadTemplatesList();
                
                // Se estava editando este template, limpa editor
                if (this.currentTemplate?.id === templateId) {
                    this.currentTemplate = null;
                    this.isEditing = false;
                }
                
                logger.info('PromptManagerUI', `Template deletado: ${templateId}`);
            }
        }

        /**
         * Importa templates de arquivo JSON
         */
        importTemplates() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const templates = JSON.parse(e.target.result);
                        let imported = 0;

                        for (const [id, template] of Object.entries(templates)) {
                            try {
                                KC.PromptManager.createCustomTemplate(`imported_${id}_${Date.now()}`, template);
                                imported++;
                            } catch (error) {
                                logger.warn('PromptManagerUI', `Erro ao importar template ${id}:`, error);
                            }
                        }

                        this.loadTemplatesList();
                        alert(`${imported} template(s) importado(s) com sucesso!`);

                    } catch (error) {
                        logger.error('PromptManagerUI', 'Erro ao importar templates', error);
                        alert('Erro ao importar arquivo: formato inválido');
                    }
                };
                reader.readAsText(file);
            };

            input.click();
        }

        /**
         * Exporta todos os templates
         */
        exportAllTemplates() {
            try {
                const templates = KC.PromptManager.listTemplates();
                const exportData = {};

                templates.forEach(template => {
                    const fullTemplate = KC.PromptManager.getTemplate(template.id);
                    exportData[template.id] = {
                        name: fullTemplate.name,
                        description: fullTemplate.description,
                        objectives: fullTemplate.objectives,
                        systemPrompt: fullTemplate.systemPrompt,
                        userPromptTemplate: fullTemplate.userPromptTemplate,
                        responseFormat: fullTemplate.responseFormat,
                        temperature: fullTemplate.temperature,
                        maxTokens: fullTemplate.maxTokens,
                        isCustom: fullTemplate.isCustom
                    };
                });

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `knowledge-consolidator-templates-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                
                URL.revokeObjectURL(url);
                
                logger.info('PromptManagerUI', 'Templates exportados com sucesso');

            } catch (error) {
                logger.error('PromptManagerUI', 'Erro ao exportar templates', error);
                alert('Erro ao exportar templates');
            }
        }

        /**
         * Aplica template selecionado
         */
        applySelectedTemplate() {
            if (!this.uiState.selectedTemplateId) return;

            KC.EventBus.emit('TEMPLATE_SELECTED', {
                templateId: this.uiState.selectedTemplateId,
                template: KC.PromptManager.getTemplate(this.uiState.selectedTemplateId)
            });

            KC.ModalManager.close('template-manager');
            
            logger.info('PromptManagerUI', `Template aplicado: ${this.uiState.selectedTemplateId}`);
        }

        /**
         * Filtra templates baseado em busca e categoria
         */
        filterTemplates() {
            const allTemplates = KC.PromptManager.listTemplates();
            
            let filtered = allTemplates.filter(template => {
                // Filtro por categoria
                if (this.uiState.filterCategory !== 'all') {
                    const isCustomMatch = this.uiState.filterCategory === 'custom' && template.isCustom;
                    const isDefaultMatch = this.uiState.filterCategory === 'default' && !template.isCustom;
                    if (!isCustomMatch && !isDefaultMatch) return false;
                }

                // Filtro por termo de busca
                if (this.uiState.searchTerm) {
                    const searchLower = this.uiState.searchTerm.toLowerCase();
                    const nameMatch = template.name.toLowerCase().includes(searchLower);
                    const descMatch = template.description?.toLowerCase().includes(searchLower) || false;
                    if (!nameMatch && !descMatch) return false;
                }

                return true;
            });

            this.renderTemplateCards(filtered);
            this.updateTemplateCount(filtered.length, allTemplates.length);
        }

        /**
         * Atualiza contador de templates
         */
        updateTemplateCount(visible, total = null) {
            const countEl = document.getElementById('template-count');
            if (countEl) {
                if (total !== null && visible !== total) {
                    countEl.textContent = `${visible} de ${total} templates`;
                } else {
                    countEl.textContent = `${visible} templates carregados`;
                }
            }
        }

        /**
         * Lida com ações do editor de código
         */
        handleCodeEditorAction(action, textarea) {
            if (!textarea) return;

            switch (action) {
                case 'format':
                    // Formatação básica de texto
                    textarea.value = textarea.value
                        .replace(/\n{3,}/g, '\n\n') // Remove quebras excessivas
                        .replace(/[ \t]+$/gm, '') // Remove espaços no final das linhas
                        .trim();
                    this.markAsUnsaved();
                    break;

                case 'validate':
                    // Validação básica
                    const validation = KC.PromptManager.validatePrompt(textarea.value);
                    if (validation.isValid) {
                        alert('✅ Prompt válido!');
                    } else {
                        alert('❌ Problemas encontrados:\n' + validation.errors.join('\n'));
                    }
                    break;
            }
        }
    }

    // Função utilitária para debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Registra no namespace global
    KC.PromptManagerUI = new PromptManagerUI();
    logger.info('PromptManagerUI', 'Componente registrado com sucesso');

})(window);