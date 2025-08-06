/**
 * PowerUserFeatures.js - Funcionalidades do Power User Template v2
 * 
 * Replica todas as funcionalidades funcionais do v2 para o v1:
 * - Descoberta real de arquivos
 * - Seleção múltipla
 * - Filtros funcionais
 * - Sistema de categorias
 * - Configurações
 * - Exportação multi-formato
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class PowerUserFeatures {
        constructor() {
            this.state = {
                files: [],
                selectedFiles: new Set(),
                categories: this.loadCategories(),
                filters: {
                    relevance: 'all',
                    status: 'all',
                    time: 'all',
                    type: 'all',
                    search: '',
                    selectedCategoryFilter: null
                },
                sortBy: 'relevance',
                sortDirection: 'desc',
                searchPatterns: this.loadSearchPatterns()
            };

            this.settings = this.loadSettings();
            this.fileMap = new Map();
            this.initialize();
        }

        initialize() {
            // Aguarda o DOM carregar
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
            } else {
                this.setupEventListeners();
            }

            // Carregar dados salvos
            this.loadFromLocalStorage();
            
            // Se autosave estiver ativo
            if (this.settings.autoSave) {
                this.enableAutoSave();
            }
        }

        setupEventListeners() {
            // Botão de descoberta real
            const discoverBtn = document.querySelector('[data-action="discover-real"]');
            if (discoverBtn) {
                discoverBtn.addEventListener('click', () => this.discoverRealFiles());
            }

            // Event listeners para filtros
            this.setupFilterListeners();
            
            // Event listeners para seleção
            this.setupSelectionListeners();

            // Exportar para KC global
            KC.PowerUserFeatures = this;
        }

        // ========== DESCOBERTA REAL DE ARQUIVOS ==========
        async discoverRealFiles() {
            try {
                const dirHandle = await window.showDirectoryPicker();
                const files = [];
                await this.readDirectory(dirHandle, files, '');
                
                // Converter para formato do sistema
                this.state.files = files.map((file, index) => ({
                    id: `file-${Date.now()}-${index}`,
                    name: file.name,
                    path: file.path,
                    type: file.name.split('.').pop() || 'unknown',
                    relevance: this.calculateRelevance(file),
                    confidence: 0,
                    modified: file.lastModified || new Date(),
                    analyzed: false,
                    status: 'pending',
                    size: file.size || 0,
                    categories: [],
                    content: file.content || '',
                    handle: file.handle
                }));

                // Ativar modo Power User na interface
                this.activatePowerUserMode();
                
                // Atualizar interface
                this.renderFiles();
                this.updateStats();
                this.saveToLocalStorage();
                
                KC.Logger?.info(`Descobertos ${this.state.files.length} arquivos reais`);
                
                // Integrar com sistema KC existente
                this.integrateWithKC();
                
                // Emitir evento para atualizar badges
                if (KC.EventBus) {
                    KC.EventBus.emit('FILES_DISCOVERED', {
                        count: this.state.files.length,
                        source: 'powerUser'
                    });
                    
                    // Atualizar AppState
                    KC.AppState?.set('files', this.state.files);
                    KC.AppState?.set('currentStep', 2); // Avançar para pré-análise
                }
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    KC.Logger?.info('Seleção de diretório cancelada');
                } else {
                    KC.Logger?.error('Erro na descoberta de arquivos:', error);
                }
            }
        }

        activatePowerUserMode() {
            // Mostrar seções relevantes
            const filterSection = document.getElementById('filter-section');
            if (filterSection) filterSection.style.display = 'block';
            
            const filesSection = document.getElementById('files-section');
            if (filesSection) filesSection.style.display = 'block';
            
            const categoriesSidebar = document.getElementById('categories-sidebar');
            if (categoriesSidebar) categoriesSidebar.style.display = 'block';
            
            // Renderizar categorias iniciais
            this.renderCategories();
            
            // Inicializar contadores
            this.updateFilterBadges();
        }

        async readDirectory(dirHandle, files, path) {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    // Aplicar patterns de busca
                    if (!this.shouldIncludeFile(entry.name)) continue;
                    
                    const file = await entry.getFile();
                    const fullPath = path ? `${path}/${entry.name}` : entry.name;
                    
                    // Ler conteúdo para arquivos de texto
                    let content = '';
                    if (this.isTextFile(entry.name)) {
                        try {
                            content = await file.text();
                        } catch (e) {
                            console.warn(`Não foi possível ler: ${fullPath}`);
                        }
                    }
                    
                    files.push({
                        name: file.name,
                        path: fullPath,
                        size: file.size,
                        lastModified: new Date(file.lastModifiedDate || file.lastModified),
                        content: content,
                        handle: entry
                    });
                } else if (entry.kind === 'directory') {
                    const newPath = path ? `${path}/${entry.name}` : entry.name;
                    await this.readDirectory(entry, files, newPath);
                }
            }
        }

        shouldIncludeFile(filename) {
            const patterns = this.state.searchPatterns;
            
            // Verificar exclusões
            for (const pattern of patterns.exclude) {
                if (this.matchPattern(filename, pattern)) {
                    return false;
                }
            }
            
            // Verificar inclusões
            for (const pattern of patterns.include) {
                if (this.matchPattern(filename, pattern)) {
                    return true;
                }
            }
            
            return false;
        }

        matchPattern(filename, pattern) {
            // Converter glob pattern para regex
            const regex = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            return new RegExp(`^${regex}$`).test(filename);
        }

        isTextFile(filename) {
            const textExtensions = ['.txt', '.md', '.js', '.json', '.html', '.css', '.xml', '.yaml', '.yml'];
            return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
        }

        calculateRelevance(file) {
            let score = 50; // Base
            
            // Boost por tipo de arquivo
            if (file.name.endsWith('.md')) score += 20;
            if (file.name.endsWith('.txt')) score += 10;
            
            // Boost por conteúdo
            if (file.content) {
                const keywords = ['decisão', 'insight', 'aprendizado', 'descoberta', 'solução'];
                const lowerContent = file.content.toLowerCase();
                keywords.forEach(keyword => {
                    if (lowerContent.includes(keyword)) {
                        score += 10;
                    }
                });
            }
            
            // Boost por data recente
            const daysSinceModified = (Date.now() - file.lastModified) / (1000 * 60 * 60 * 24);
            if (daysSinceModified < 7) score += 15;
            else if (daysSinceModified < 30) score += 10;
            else if (daysSinceModified < 90) score += 5;
            
            return Math.min(100, score);
        }

        // ========== SISTEMA DE FILTROS ==========
        setupFilterListeners() {
            // Filtro de relevância
            const relevanceFilter = document.getElementById('relevance-filter');
            if (relevanceFilter) {
                relevanceFilter.addEventListener('change', (e) => {
                    this.state.filters.relevance = e.target.value;
                    this.applyFilters();
                });
            }

            // Filtro de status
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.state.filters.status = e.target.value;
                    this.applyFilters();
                });
            }

            // Filtro de tempo
            const timeFilter = document.getElementById('time-filter');
            if (timeFilter) {
                timeFilter.addEventListener('change', (e) => {
                    this.state.filters.time = e.target.value;
                    this.applyFilters();
                });
            }

            // Filtro de tipo
            const typeFilter = document.getElementById('type-filter');
            if (typeFilter) {
                typeFilter.addEventListener('change', (e) => {
                    this.state.filters.type = e.target.value;
                    this.applyFilters();
                });
            }

            // Busca
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.state.filters.search = e.target.value;
                    this.applyFilters();
                });
            }
        }

        applyFilters() {
            const filtered = this.getFilteredFiles();
            this.renderFiles(filtered);
            this.updateFilterBadges(filtered);
        }

        getFilteredFiles() {
            return this.state.files.filter(file => {
                // Filtro de relevância
                if (this.state.filters.relevance !== 'all') {
                    const minRelevance = parseInt(this.state.filters.relevance);
                    if (file.relevance < minRelevance) return false;
                }

                // Filtro de status
                if (this.state.filters.status !== 'all') {
                    if (this.state.filters.status === 'analyzed' && !file.analyzed) return false;
                    if (this.state.filters.status === 'pending' && file.analyzed) return false;
                    if (this.state.filters.status === 'categorized' && (!file.categories || file.categories.length === 0)) return false;
                    if (this.state.filters.status === 'archived' && file.status !== 'archived') return false;
                }

                // Filtro de tempo
                if (this.state.filters.time !== 'all') {
                    const now = Date.now();
                    const fileTime = new Date(file.modified).getTime();
                    const diff = now - fileTime;
                    const day = 24 * 60 * 60 * 1000;
                    
                    switch(this.state.filters.time) {
                        case '1d': if (diff > day) return false; break;
                        case '1w': if (diff > 7 * day) return false; break;
                        case '1m': if (diff > 30 * day) return false; break;
                        case '3m': if (diff > 90 * day) return false; break;
                        case '1y': if (diff > 365 * day) return false; break;
                    }
                }

                // Filtro de tipo
                if (this.state.filters.type !== 'all' && file.type !== this.state.filters.type) {
                    return false;
                }

                // Filtro de categoria
                if (this.state.filters.selectedCategoryFilter) {
                    if (!file.categories || !file.categories.includes(this.state.filters.selectedCategoryFilter)) {
                        return false;
                    }
                }

                // Busca
                if (this.state.filters.search) {
                    const search = this.state.filters.search.toLowerCase();
                    const inName = file.name.toLowerCase().includes(search);
                    const inPath = file.path.toLowerCase().includes(search);
                    const inContent = file.content && file.content.toLowerCase().includes(search);
                    if (!inName && !inPath && !inContent) return false;
                }

                return true;
            });
        }

        updateFilterBadges(filtered) {
            // Atualizar badges com contagens
            const badges = {
                'badge-all': this.state.files.length,
                'badge-high': this.state.files.filter(f => f.relevance >= 70).length,
                'badge-pending': this.state.files.filter(f => !f.analyzed).length,
                'badge-analyzed': this.state.files.filter(f => f.analyzed).length
            };

            Object.entries(badges).forEach(([id, count]) => {
                const badge = document.getElementById(id);
                if (badge) badge.textContent = count;
            });
        }

        // ========== SISTEMA DE SELEÇÃO ==========
        setupSelectionListeners() {
            // Evento global para limpar seleção com ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSelection();
                }
            });

            // Alt+A para selecionar todos visíveis (v2 compatível)
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 'a') {
                    e.preventDefault();
                    this.selectAllVisible();
                }
            });

            // Alt+S para gerenciar search patterns (v2 compatível)
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 's') {
                    e.preventDefault();
                    this.showSearchPatternsDialog();
                }
            });

            // Ctrl+B para toggle sidebar de categorias
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'b') {
                    e.preventDefault();
                    this.toggleCategoriesSidebar();
                }
            });
        }

        toggleCategoriesSidebar() {
            const sidebar = document.getElementById('categories-sidebar');
            if (sidebar) {
                const isVisible = sidebar.style.display !== 'none';
                sidebar.style.display = isVisible ? 'none' : 'block';
                
                // Ajustar margem do conteúdo principal
                const mainContent = document.querySelector('.main-container');
                if (mainContent) {
                    mainContent.style.marginLeft = isVisible ? '0' : '250px';
                }
            }
        }

        // ========== INTEGRAÇÃO COM KC ==========
        integrateWithKC() {
            // Sincronizar com CategoryManager se existir
            if (KC.CategoryManager) {
                // Adicionar categorias do Power User ao CategoryManager
                this.state.categories.forEach(cat => {
                    if (!KC.CategoryManager.exists(cat.id)) {
                        KC.CategoryManager.add(cat.name, cat.color);
                    }
                });
                
                // Sincronizar categorias do CategoryManager
                const kcCategories = KC.CategoryManager.getAll();
                kcCategories.forEach(cat => {
                    if (!this.state.categories.find(c => c.id === cat.id)) {
                        this.state.categories.push(cat);
                    }
                });
            }
            
            // Integrar com FilterManager se existir
            if (KC.FilterManager) {
                // Aplicar filtros do Power User
                KC.FilterManager.setConfig({
                    relevanceThreshold: parseInt(this.state.filters.relevance) || 0,
                    timeFilter: this.state.filters.time,
                    typeFilter: this.state.filters.type === 'all' ? [] : [this.state.filters.type]
                });
            }
            
            // Integrar com StatsManager se existir
            if (KC.StatsManager) {
                KC.StatsManager.updateStats({
                    totalFiles: this.state.files.length,
                    analyzedFiles: this.state.files.filter(f => f.analyzed).length,
                    categorizedFiles: this.state.files.filter(f => f.categories?.length > 0).length
                });
            }
        }

        toggleFileSelection(fileId, event) {
            if (event?.shiftKey && this.lastSelectedFile) {
                // Seleção em range
                this.rangeSelectFiles(this.lastSelectedFile, fileId);
            } else {
                // Toggle individual
                if (this.state.selectedFiles.has(fileId)) {
                    this.state.selectedFiles.delete(fileId);
                } else {
                    this.state.selectedFiles.add(fileId);
                }
                this.lastSelectedFile = fileId;
            }

            this.updateSelectionUI();
            this.updateBulkActions();
        }

        rangeSelectFiles(startId, endId) {
            const files = this.getFilteredFiles();
            const startIndex = files.findIndex(f => f.id === startId);
            const endIndex = files.findIndex(f => f.id === endId);
            
            if (startIndex === -1 || endIndex === -1) return;
            
            const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
            
            for (let i = from; i <= to; i++) {
                this.state.selectedFiles.add(files[i].id);
            }
        }

        selectAllVisible() {
            const filtered = this.getFilteredFiles();
            filtered.forEach(file => {
                this.state.selectedFiles.add(file.id);
            });
            this.updateSelectionUI();
            this.updateBulkActions();
        }

        clearSelection() {
            this.state.selectedFiles.clear();
            this.updateSelectionUI();
            this.updateBulkActions();
        }

        updateSelectionUI() {
            // Atualizar checkboxes
            document.querySelectorAll('.file-checkbox').forEach(checkbox => {
                const fileId = checkbox.dataset.fileId;
                checkbox.classList.toggle('checked', this.state.selectedFiles.has(fileId));
            });

            // Atualizar itens
            document.querySelectorAll('.file-item').forEach(item => {
                const fileId = item.dataset.fileId;
                item.classList.toggle('selected', this.state.selectedFiles.has(fileId));
            });
        }

        updateBulkActions() {
            const bulkActions = document.getElementById('bulk-actions');
            const bulkCount = document.getElementById('bulk-count');
            
            if (!bulkActions) return;

            const count = this.state.selectedFiles.size;
            if (count > 0) {
                bulkActions.style.display = 'flex';
                if (bulkCount) {
                    bulkCount.textContent = `${count} selecionado${count > 1 ? 's' : ''}`;
                }
            } else {
                bulkActions.style.display = 'none';
            }
        }

        // ========== SISTEMA DE CATEGORIAS ==========
        loadCategories() {
            const saved = localStorage.getItem('powerUser_categories');
            if (saved) {
                return JSON.parse(saved);
            }
            
            // Categorias padrão
            return [
                { id: 'cat-1', name: 'Importante', color: '#f85149' },
                { id: 'cat-2', name: 'Projeto', color: '#fb8500' },
                { id: 'cat-3', name: 'Pessoal', color: '#8ac926' }
            ];
        }

        showAddCategoryDialog() {
            const name = prompt('Nome da categoria:');
            if (!name) return;

            const colors = ['#f85149', '#fb8500', '#ffd500', '#8ac926', '#06ffa5', '#00b4d8', '#b07c9e', '#ff006e'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            const category = {
                id: `cat-${Date.now()}`,
                name: name,
                color: color
            };

            this.state.categories.push(category);
            this.saveCategories();
            this.renderCategories();
            
            // Sincronizar com CategoryManager se existir
            if (KC.CategoryManager) {
                KC.CategoryManager.add(name, color);
            }
        }

        assignCategoryToSelected(categoryId) {
            const selectedCount = this.state.selectedFiles.size;
            if (selectedCount === 0) {
                alert('Selecione arquivos primeiro');
                return;
            }

            const category = this.state.categories.find(cat => cat.id === categoryId);
            if (!category) return;

            // Adicionar categoria aos arquivos selecionados
            this.state.selectedFiles.forEach(fileId => {
                const file = this.state.files.find(f => f.id === fileId);
                if (file) {
                    if (!file.categories) file.categories = [];
                    if (!file.categories.includes(categoryId)) {
                        file.categories.push(categoryId);
                    }
                }
            });

            this.renderFiles();
            this.saveToLocalStorage();
            KC.Logger?.info(`Categoria "${category.name}" atribuída a ${selectedCount} arquivos`);
        }

        filterByCategory(categoryId) {
            if (this.state.filters.selectedCategoryFilter === categoryId) {
                // Limpar filtro se já estava ativo
                this.state.filters.selectedCategoryFilter = null;
            } else {
                // Aplicar filtro
                this.state.filters.selectedCategoryFilter = categoryId;
            }
            this.applyFilters();
        }

        renderCategories() {
            const container = document.getElementById('categories-list');
            if (!container) return;

            if (this.state.categories.length === 0) {
                container.innerHTML = '<div style="padding: 10px; color: #666;">Nenhuma categoria</div>';
                return;
            }

            container.innerHTML = this.state.categories.map(cat => {
                const count = this.state.files.filter(f => f.categories?.includes(cat.id)).length;
                const isActive = this.state.filters.selectedCategoryFilter === cat.id;
                
                return `
                    <div class="category-item ${isActive ? 'active' : ''}" 
                         data-category-id="${cat.id}"
                         style="cursor: pointer; padding: 8px; display: flex; align-items: center; gap: 8px;">
                        <div class="category-color" style="width: 12px; height: 12px; border-radius: 50%; background: ${cat.color}"></div>
                        <span class="category-name" style="flex: 1">${cat.name}</span>
                        <span class="category-count" style="font-size: 12px; color: #666">${count}</span>
                    </div>
                `;
            }).join('');

            // Event listeners
            container.querySelectorAll('.category-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const categoryId = item.dataset.categoryId;
                    if (e.shiftKey) {
                        this.filterByCategory(categoryId);
                    } else {
                        this.assignCategoryToSelected(categoryId);
                    }
                });
            });
        }

        saveCategories() {
            localStorage.setItem('powerUser_categories', JSON.stringify(this.state.categories));
        }

        // ========== CONFIGURAÇÕES ==========
        loadSettings() {
            const saved = localStorage.getItem('powerUser_settings');
            if (saved) {
                return JSON.parse(saved);
            }
            
            return {
                autoSave: true,
                confirmDelete: true,
                compactView: false,
                showPreview: true,
                darkMode: true
            };
        }

        saveSettings() {
            localStorage.setItem('powerUser_settings', JSON.stringify(this.settings));
        }

        showSettingsDialog() {
            // Criar modal de configurações
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(48, 48, 48, 0.85); display: flex; align-items: center; justify-content: center; z-index: 1000;';
            
            modal.innerHTML = `
                <div style="background: #303030; border: 3px solid #3D331F; border-radius: 8px; padding: 20px; min-width: 400px; color: #fff;">
                    <h2 style="margin-top: 0;">Configurações</h2>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="setting-autosave" ${this.settings.autoSave ? 'checked' : ''}>
                            Auto-salvar alterações
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="setting-confirm" ${this.settings.confirmDelete ? 'checked' : ''}>
                            Confirmar ao excluir
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="setting-preview" ${this.settings.showPreview ? 'checked' : ''}>
                            Mostrar preview
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button onclick="this.closest('.modal-overlay').remove()" style="padding: 8px 16px;">Cancelar</button>
                        <button onclick="KC.PowerUserFeatures.saveSettingsFromDialog()" style="padding: 8px 16px; background: #238636; color: white; border: none; border-radius: 4px;">Salvar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }

        saveSettingsFromDialog() {
            this.settings.autoSave = document.getElementById('setting-autosave')?.checked || false;
            this.settings.confirmDelete = document.getElementById('setting-confirm')?.checked || false;
            this.settings.showPreview = document.getElementById('setting-preview')?.checked || false;
            
            this.saveSettings();
            document.querySelector('.modal-overlay')?.remove();
            KC.Logger?.info('Configurações salvas');
        }

        // ========== EXPORTAÇÃO ==========
        async exportData(format = 'json') {
            const selectedFiles = this.state.files.filter(f => this.state.selectedFiles.has(f.id));
            const data = selectedFiles.length > 0 ? selectedFiles : this.state.files;
            
            let content, filename, mimeType;
            
            switch(format) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    filename = `export-${Date.now()}.json`;
                    mimeType = 'application/json';
                    break;
                    
                case 'markdown':
                    content = this.exportToMarkdown(data);
                    filename = `export-${Date.now()}.md`;
                    mimeType = 'text/markdown';
                    break;
                    
                case 'csv':
                    content = this.exportToCSV(data);
                    filename = `export-${Date.now()}.csv`;
                    mimeType = 'text/csv';
                    break;
            }
            
            // Download
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            KC.Logger?.info(`Exportados ${data.length} arquivos em formato ${format}`);
        }

        exportToMarkdown(files) {
            let md = '# Knowledge Export\n\n';
            md += `Exported: ${new Date().toLocaleString()}\n\n`;
            
            files.forEach(file => {
                md += `## ${file.name}\n`;
                md += `- Path: ${file.path}\n`;
                md += `- Relevance: ${file.relevance}%\n`;
                md += `- Modified: ${new Date(file.modified).toLocaleString()}\n`;
                
                if (file.categories?.length > 0) {
                    const catNames = file.categories.map(cId => {
                        const cat = this.state.categories.find(c => c.id === cId);
                        return cat?.name || cId;
                    });
                    md += `- Categories: ${catNames.join(', ')}\n`;
                }
                
                if (file.content) {
                    md += `\n### Content Preview\n`;
                    md += '```\n';
                    md += file.content.substring(0, 500) + '...\n';
                    md += '```\n';
                }
                
                md += '\n---\n\n';
            });
            
            return md;
        }

        exportToCSV(files) {
            const headers = ['Name', 'Path', 'Type', 'Relevance', 'Modified', 'Categories'];
            const rows = files.map(file => {
                const catNames = file.categories?.map(cId => {
                    const cat = this.state.categories.find(c => c.id === cId);
                    return cat?.name || cId;
                }).join(';') || '';
                
                return [
                    file.name,
                    file.path,
                    file.type,
                    file.relevance,
                    new Date(file.modified).toISOString(),
                    catNames
                ];
            });
            
            // Converter para CSV
            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');
                
            return csv;
        }

        // ========== SEARCH PATTERNS ==========
        loadSearchPatterns() {
            const saved = localStorage.getItem('powerUser_searchPatterns');
            if (saved) {
                return JSON.parse(saved);
            }
            
            return {
                include: ['*.md', '*.txt', '*.js', '*.html', '*.css'],
                exclude: ['node_modules', '.git', 'dist', 'build', '*.min.js']
            };
        }

        showSearchPatternsDialog() {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(48, 48, 48, 0.85); display: flex; align-items: center; justify-content: center; z-index: 1000;';
            
            modal.innerHTML = `
                <div style="background: #303030; border: 3px solid #3D331F; border-radius: 8px; padding: 20px; min-width: 500px; color: #fff;">
                    <h2 style="margin-top: 0;">Search Patterns</h2>
                    
                    <div style="margin-bottom: 15px;">
                        <h3>Include Patterns</h3>
                        <textarea id="include-patterns" style="width: 100%; height: 100px; background: #424242; border: 1px solid #3D331F; color: #fff; padding: 8px;">${this.state.searchPatterns.include.join('\n')}</textarea>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h3>Exclude Patterns</h3>
                        <textarea id="exclude-patterns" style="width: 100%; height: 100px; background: #424242; border: 1px solid #3D331F; color: #fff; padding: 8px;">${this.state.searchPatterns.exclude.join('\n')}</textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="this.closest('.modal-overlay').remove()" style="padding: 8px 16px;">Cancel</button>
                        <button onclick="KC.PowerUserFeatures.saveSearchPatterns()" style="padding: 8px 16px; background: #238636; color: white; border: none; border-radius: 4px;">Save</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }

        saveSearchPatterns() {
            const includePatterns = document.getElementById('include-patterns').value
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);
                
            const excludePatterns = document.getElementById('exclude-patterns').value
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);
                
            this.state.searchPatterns = {
                include: includePatterns,
                exclude: excludePatterns
            };
            
            localStorage.setItem('powerUser_searchPatterns', JSON.stringify(this.state.searchPatterns));
            document.querySelector('.modal-overlay')?.remove();
            KC.Logger?.info('Search patterns saved');
        }

        // ========== RENDERIZAÇÃO ==========
        renderFiles(files = null) {
            const container = document.getElementById('file-list');
            if (!container) return;

            const filesToRender = files || this.getFilteredFiles();
            
            // Ordenar arquivos
            filesToRender.sort((a, b) => {
                let aVal = a[this.state.sortBy];
                let bVal = b[this.state.sortBy];
                
                if (this.state.sortBy === 'modified') {
                    aVal = new Date(aVal).getTime();
                    bVal = new Date(bVal).getTime();
                }
                
                if (this.state.sortDirection === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });

            if (filesToRender.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
                        <h3>Nenhum arquivo encontrado</h3>
                        <p>Use a descoberta para encontrar arquivos ou ajuste os filtros</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = filesToRender.map(file => {
                const isSelected = this.state.selectedFiles.has(file.id);
                const categoryDots = (file.categories || []).map(catId => {
                    const cat = this.state.categories.find(c => c.id === catId);
                    if (!cat) return '';
                    return `<span class="category-dot" style="width: 8px; height: 8px; border-radius: 50%; background: ${cat.color}; display: inline-block; margin-left: 4px;" title="${cat.name}"></span>`;
                }).join('');
                
                return `
                    <div class="file-item ${isSelected ? 'selected' : ''}" 
                         data-file-id="${file.id}" 
                         style="padding: 12px; border-bottom: 1px solid #e1e4e8; cursor: pointer; ${isSelected ? 'background: #f6f8fa;' : ''}">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="file-checkbox ${isSelected ? 'checked' : ''}" 
                                 data-file-id="${file.id}"
                                 style="width: 16px; height: 16px; border: 1px solid #d1d5da; border-radius: 3px; ${isSelected ? 'background: #0366d6;' : ''}"></div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600;">${file.name} ${categoryDots}</div>
                                <div style="font-size: 12px; color: #586069;">${file.path}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 14px; font-weight: 500; color: ${file.relevance >= 70 ? '#28a745' : '#6f42c1'};">${file.relevance}%</div>
                                <div style="font-size: 12px; color: #586069;">${new Date(file.modified).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Event listeners
            container.querySelectorAll('.file-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const fileId = item.dataset.fileId;
                    if (e.target.classList.contains('file-checkbox')) {
                        this.toggleFileSelection(fileId, e);
                    } else {
                        // Click no item - selecionar
                        this.toggleFileSelection(fileId, e);
                    }
                });
            });
        }

        updateStats() {
            // Atualizar estatísticas globais
            const stats = {
                total: this.state.files.length,
                analyzed: this.state.files.filter(f => f.analyzed).length,
                categorized: this.state.files.filter(f => f.categories?.length > 0).length,
                avgRelevance: Math.round(this.state.files.reduce((sum, f) => sum + f.relevance, 0) / this.state.files.length || 0)
            };

            // Atualizar elementos da UI
            const filesCount = document.getElementById('files-count');
            if (filesCount) filesCount.textContent = `${stats.total} arquivos`;

            const confidenceAvg = document.getElementById('confidence-avg');
            if (confidenceAvg) confidenceAvg.textContent = `${stats.avgRelevance}%`;

            const analysisProgress = document.getElementById('analysis-progress');
            if (analysisProgress) analysisProgress.textContent = `${stats.analyzed}/${stats.total}`;
        }

        // ========== PERSISTÊNCIA ==========
        saveToLocalStorage() {
            try {
                const dataToSave = {
                    files: this.state.files.map(f => ({
                        ...f,
                        content: undefined // Não salvar conteúdo para economizar espaço
                    })),
                    categories: this.state.categories,
                    filters: this.state.filters,
                    sortBy: this.state.sortBy,
                    sortDirection: this.state.sortDirection
                };
                localStorage.setItem('powerUser_data', JSON.stringify(dataToSave));
            } catch (error) {
                console.error('Erro ao salvar no localStorage:', error);
            }
        }

        loadFromLocalStorage() {
            try {
                const saved = localStorage.getItem('powerUser_data');
                if (saved) {
                    const data = JSON.parse(saved);
                    if (data.files) this.state.files = data.files;
                    if (data.categories) this.state.categories = data.categories;
                    if (data.filters) this.state.filters = data.filters;
                    if (data.sortBy) this.state.sortBy = data.sortBy;
                    if (data.sortDirection) this.state.sortDirection = data.sortDirection;
                    
                    this.renderFiles();
                    this.renderCategories();
                    this.updateStats();
                }
            } catch (error) {
                console.error('Erro ao carregar do localStorage:', error);
            }
        }

        enableAutoSave() {
            // Auto-save a cada 30 segundos
            setInterval(() => {
                if (this.settings.autoSave) {
                    this.saveToLocalStorage();
                }
            }, 30000);
        }

        // ========== AÇÕES EM LOTE ==========
        handleBulkAction(action) {
            const selectedCount = this.state.selectedFiles.size;
            if (selectedCount === 0) {
                alert('Selecione arquivos primeiro');
                return;
            }

            switch(action) {
                case 'analyze':
                    this.analyzeSelected();
                    break;
                case 'categorize':
                    this.showCategoryAssignDialog();
                    break;
                case 'archive':
                    this.archiveSelected();
                    break;
                case 'delete':
                    this.deleteSelected();
                    break;
                case 'export':
                    this.exportSelected();
                    break;
            }
        }

        analyzeSelected() {
            const selectedFiles = Array.from(this.state.selectedFiles).map(id => 
                this.state.files.find(f => f.id === id)
            ).filter(f => f);

            if (KC.AnalysisManager) {
                KC.AnalysisManager.addToQueue(selectedFiles);
                KC.Logger?.info(`${selectedFiles.length} arquivos adicionados à fila de análise`);
            } else {
                alert('Sistema de análise não disponível');
            }
        }

        archiveSelected() {
            this.state.selectedFiles.forEach(fileId => {
                const file = this.state.files.find(f => f.id === fileId);
                if (file) {
                    file.status = 'archived';
                }
            });
            this.renderFiles();
            this.saveToLocalStorage();
            KC.Logger?.info(`${this.state.selectedFiles.size} arquivos arquivados`);
            this.clearSelection();
        }

        deleteSelected() {
            if (this.settings.confirmDelete) {
                if (!confirm(`Excluir ${this.state.selectedFiles.size} arquivos?`)) {
                    return;
                }
            }

            this.state.files = this.state.files.filter(f => !this.state.selectedFiles.has(f.id));
            this.clearSelection();
            this.renderFiles();
            this.updateStats();
            this.saveToLocalStorage();
        }

        exportSelected() {
            // Mostrar opções de formato
            const format = prompt('Formato de exportação: json, markdown, csv', 'json');
            if (format && ['json', 'markdown', 'csv'].includes(format)) {
                this.exportData(format);
            }
        }

        showCategoryAssignDialog() {
            if (this.state.categories.length === 0) {
                if (confirm('Nenhuma categoria existe. Criar uma nova?')) {
                    this.showAddCategoryDialog();
                }
                return;
            }

            // Criar modal simples para seleção
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(48, 48, 48, 0.85); display: flex; align-items: center; justify-content: center; z-index: 1000;';
            
            const categoriesList = this.state.categories.map(cat => 
                `<button onclick="KC.PowerUserFeatures.assignCategoryToSelected('${cat.id}'); this.closest('.modal-overlay').remove();" 
                         style="display: block; width: 100%; padding: 10px; margin: 5px 0; text-align: left; background: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: ${cat.color}; border-radius: 50%; margin-right: 8px;"></span>
                    ${cat.name}
                </button>`
            ).join('');

            modal.innerHTML = `
                <div style="background: #303030; border: 3px solid #3D331F; border-radius: 8px; padding: 20px; min-width: 300px; color: #fff;">
                    <h3 style="margin-top: 0;">Atribuir Categoria</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${categoriesList}
                    </div>
                    <button onclick="this.closest('.modal-overlay').remove()" style="margin-top: 15px; padding: 8px 16px;">Cancelar</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }
    }

    // Inicializar quando KC estiver pronto - COM VERIFICAÇÃO ROBUSTA
    function initializePowerUserFeatures() {
        if (!window.KC) {
            // KC ainda não existe, tentar novamente
            setTimeout(initializePowerUserFeatures, 100);
            return;
        }
        
        // KC existe, criar e atribuir PowerUserFeatures
        if (!KC.PowerUserFeatures) {
            KC.PowerUserFeatures = new PowerUserFeatures();
            console.log('✅ PowerUserFeatures inicializado e atribuído a KC');
        }
    }
    
    // Tentar inicializar imediatamente
    if (window.KC) {
        if (KC.EventBus) {
            KC.EventBus.on('APP_READY', () => {
                initializePowerUserFeatures();
            });
        } else {
            // Sem EventBus, inicializar diretamente
            initializePowerUserFeatures();
        }
    } else {
        // KC não existe ainda, iniciar polling
        setTimeout(initializePowerUserFeatures, 100);
    }

})(window);