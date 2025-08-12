/**
 * CategoryManager.js - Gerenciador de Categorias
 * 
 * Gerencia categorias e relacionamentos com arquivos REAIS
 * Substituindo stub por implementação completa
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;

    class CategoryManager {
        constructor() {
            // Categorias padrão conforme PRD e FileRenderer
            this.defaultCategories = [
                { id: 'tecnico', name: 'Técnico', color: '#4f46e5', icon: '🔧' },
                { id: 'estrategico', name: 'Estratégico', color: '#059669', icon: '📊' },
                { id: 'conceitual', name: 'Conceitual', color: '#dc2626', icon: '💡' },
                { id: 'decisivo', name: 'Momento Decisivo', color: '#d97706', icon: '🎯' },
                { id: 'insight', name: 'Insight', color: '#7c3aed', icon: '✨' },
                { id: 'aprendizado', name: 'Aprendizado', color: '#be185d', icon: '📚' }
            ];
        }

        /**
         * Inicializa o gerenciador
         */
        async initialize() {
            console.log('CategoryManager inicializado com implementação completa');
            
            // AIDEV-NOTE: jsonl-persistence; carregar categorias do arquivo JSONL
            // Tentar carregar categorias do arquivo categories.jsonl primeiro
            try {
                const response = await fetch('categories.jsonl');
                if (response.ok) {
                    const jsonlContent = await response.text();
                    const result = this.importFromJSONL(jsonlContent, {
                        merge: false,      // Não mesclar, usar arquivo como fonte única
                        overwrite: true,   // Sobrescrever categorias padrão se necessário
                        activateSegment: 'default' // Ativar apenas segmento default inicialmente
                    });
                    
                    console.log(`[CategoryManager] ${result.imported} categorias carregadas do arquivo JSONL`);
                    if (result.errors.length > 0) {
                        console.warn('[CategoryManager] Erros ao carregar JSONL:', result.errors);
                    }
                    
                    // Categorias já foram importadas e salvas no AppState
                    return;
                }
            } catch (error) {
                console.log('[CategoryManager] Arquivo categories.jsonl não encontrado ou erro ao carregar:', error.message);
            }
            
            // Fallback: comportamento original se arquivo não existir
            // AIDEV-NOTE: migrate-categories; migrar categorias antigas para novo formato
            // Verifica se existem categorias customizadas no array principal
            const allCategories = AppState.get('categories') || [];
            const defaultIds = this.defaultCategories.map(cat => cat.id);
            const customFromMain = allCategories.filter(cat => !defaultIds.includes(cat.id));
            
            // Carrega categorias customizadas se existirem
            let customCategories = AppState.get('customCategories') || [];
            
            // Migra categorias do array principal se necessário
            if (customFromMain.length > 0 && customCategories.length === 0) {
                customCategories = customFromMain;
                AppState.set('customCategories', customCategories);
                console.log('[CategoryManager] Migradas categorias customizadas do array principal:', customCategories);
            }
            
            if (!customCategories || customCategories.length === 0) {
                AppState.set('customCategories', []);
                console.log('[CategoryManager] Inicializando customCategories vazio');
            } else {
                console.log('[CategoryManager] Categorias customizadas carregadas:', customCategories);
            }
            
            // AIDEV-NOTE: persist-categories; forçar salvamento inicial para garantir persistência
            // Força um save para garantir que customCategories esteja no localStorage
            AppState._save();
        }

        /**
         * Obtém todas as categorias (padrão + customizadas)
         */
        getCategories() {
            const customCategories = AppState.get('customCategories') || [];
            return [...this.defaultCategories, ...customCategories];
        }

        /**
         * Obtém categoria por ID
         */
        getCategoryById(categoryId) {
            const categories = this.getCategories();
            return categories.find(cat => cat.id === categoryId);
        }

        /**
         * Obtém categoria por nome
         * @param {string} categoryName - Nome da categoria
         * @returns {Object|null} Categoria encontrada ou null
         */
        getCategoryByName(categoryName) {
            const categories = this.getCategories();
            return categories.find(cat => cat.name === categoryName) || null;
        }

        /**
         * Cria nova categoria customizada
         */
        createCategory(category) {
            if (!category.name || !category.color) {
                console.error('Nome e cor são obrigatórios para criar categoria');
                return false;
            }

            // Gera ID único
            const categoryId = category.name.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            // Verifica se já existe
            const existing = this.getCategoryById(categoryId);
            if (existing) {
                console.warn('Categoria já existe:', categoryId);
                return false;
            }

            const newCategory = {
                id: categoryId,
                name: category.name,
                color: category.color,
                icon: category.icon || '🏷️',
                custom: true
            };

            // Adiciona às categorias customizadas
            const customCategories = AppState.get('customCategories') || [];
            customCategories.push(newCategory);
            AppState.set('customCategories', customCategories);
            
            // AIDEV-NOTE: persist-log; adicionar log para debug de persistência
            console.log('[CategoryManager] Nova categoria criada:', newCategory);
            console.log('[CategoryManager] Total de categorias customizadas:', customCategories.length);
            
            // Força salvamento imediato
            AppState._save();

            // Emite evento
            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'created',
                category: newCategory
            });

            // AUTO-SAVE: Salvar alterações no JSONL
            this.autoSaveToJSONL();

            return newCategory;
        }

        /**
         * Atualiza categoria existente
         */
        updateCategory(categoryId, updates) {
            const customCategories = AppState.get('customCategories') || [];
            const index = customCategories.findIndex(cat => cat.id === categoryId);
            
            if (index === -1) {
                console.warn('Apenas categorias customizadas podem ser editadas');
                return false;
            }

            customCategories[index] = { ...customCategories[index], ...updates };
            AppState.set('customCategories', customCategories);

            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'updated',
                categoryId: categoryId,
                updates: updates
            });

            // AUTO-SAVE: Salvar alterações no JSONL
            this.autoSaveToJSONL();

            return true;
        }

        /**
         * Remove categoria customizada
         */
        deleteCategory(categoryId) {
            // Não permite remover categorias padrão
            if (this.defaultCategories.find(cat => cat.id === categoryId)) {
                console.warn('Categorias padrão não podem ser removidas');
                return false;
            }

            const customCategories = AppState.get('customCategories') || [];
            const filtered = customCategories.filter(cat => cat.id !== categoryId);
            
            if (filtered.length === customCategories.length) {
                return false; // Não encontrou
            }

            AppState.set('customCategories', filtered);

            // Remove categoria de todos os arquivos
            this.removeCategoryFromAllFiles(categoryId);

            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'deleted',
                categoryId: categoryId
            });

            // AUTO-SAVE: Salvar alterações no JSONL
            this.autoSaveToJSONL();

            return true;
        }

        /**
         * Atribui categoria a um arquivo
         */
        assignCategoryToFile(fileId, categoryId) {
            const files = AppState.get('files') || [];
            const fileIndex = files.findIndex(f => 
                (f.id && f.id === fileId) || 
                (f.name === fileId) // fallback para nome
            );

            if (fileIndex === -1) {
                console.error('Arquivo não encontrado:', fileId);
                return false;
            }

            // Verifica se categoria existe
            if (!this.getCategoryById(categoryId)) {
                console.error('Categoria não encontrada:', categoryId);
                return false;
            }

            // Inicializa array de categorias se não existir
            if (!files[fileIndex].categories) {
                files[fileIndex].categories = [];
            }

            // Evita duplicatas
            if (!files[fileIndex].categories.includes(categoryId)) {
                files[fileIndex].categories.push(categoryId);
                
                // FASE 1.3: Aplicar boost de relevância ao categorizar (individual)
                // AIDEV-NOTE: category-boost-single; boost aplicado em atribuição individual
                const originalScore = files[fileIndex].relevanceScore || 0;
                const categoryCount = files[fileIndex].categories.length;
                // Usar RelevanceUtils para boost logarítmico suave
                const boostedScore = KC.RelevanceUtils.calculateCategoryBoost(categoryCount, originalScore);
                files[fileIndex].relevanceScore = boostedScore;
                
                KC.Logger?.info('CategoryManager', 'Boost de relevância aplicado (individual)', {
                    file: files[fileIndex].name,
                    category: categoryId,
                    totalCategories: categoryCount,
                    originalScore: originalScore,
                    boostedScore: files[fileIndex].relevanceScore,
                    boost: KC.RelevanceUtils.getBoostDescription(categoryCount)
                });
                
                AppState.set('files', files);

                EventBus.emit(Events.FILES_UPDATED, {
                    action: 'category_assigned',
                    fileId: fileId,
                    categoryId: categoryId
                });
                
                // NOVO: Emitir evento específico para refinamento
                // AIDEV-NOTE: refinement-event; notifica sistema de refinamento
                if (Events.CATEGORY_ASSIGNED) {
                    EventBus.emit(Events.CATEGORY_ASSIGNED, {
                        fileId: fileId,
                        categoryId: categoryId,
                        file: files[fileIndex],
                        totalCategories: categoryCount
                    });
                }
                
                // UNIFIED CONFIDENCE SYSTEM: Update confidence after categorization
                if (KC.UnifiedConfidenceControllerInstance && KC.FeatureFlagManagerInstance?.isEnabled('unified_confidence_system')) {
                    try {
                        // Update confidence for the specific file that was categorized
                        KC.UnifiedConfidenceControllerInstance.getFileConfidence(fileId);
                        
                        // Optionally trigger batch processing for all files if many categories were added
                        if (categoryCount > 1) {
                            KC.UnifiedConfidenceControllerInstance.processFiles([files[fileIndex]], {
                                background: true,
                                trigger: 'categorization'
                            }).catch(error => {
                                console.error('CategoryManager: Erro ao processar confidence após categorização:', error);
                            });
                        }
                        
                    } catch (error) {
                        console.error('CategoryManager: Erro na integração de confidence:', error);
                    }
                }
                
                // FASE 1.3 FIX: Notificação visual do boost aplicado
                // AIDEV-NOTE: boost-notification; feedback visual quando boost é aplicado
                if (KC.showNotification) {
                    const boostPercentage = KC.RelevanceUtils.getBoostPercentage(categoryCount);
                    KC.showNotification({
                        type: 'success',
                        message: `🚀 Boost aplicado: ${files[fileIndex].name}`,
                        details: `Relevância: ${Math.round(originalScore)}% → ${Math.round(files[fileIndex].relevanceScore)}% (${KC.RelevanceUtils.getBoostDescription(categoryCount)})`,
                        duration: 3000
                    });
                }

                return true;
            }

            return false; // Já tinha a categoria
        }

        /**
         * Remove categoria de um arquivo
         */
        removeCategoryFromFile(fileId, categoryId) {
            const files = AppState.get('files') || [];
            const fileIndex = files.findIndex(f => 
                (f.id && f.id === fileId) || 
                (f.name === fileId)
            );

            if (fileIndex === -1 || !files[fileIndex].categories) {
                return false;
            }

            const initialLength = files[fileIndex].categories.length;
            files[fileIndex].categories = files[fileIndex].categories
                .filter(catId => catId !== categoryId);

            if (files[fileIndex].categories.length < initialLength) {
                AppState.set('files', files);

                EventBus.emit(Events.FILES_UPDATED, {
                    action: 'category_removed',
                    fileId: fileId,
                    categoryId: categoryId
                });
                
                // NOVO: Emitir evento específico para refinamento
                // AIDEV-NOTE: refinement-event-remove; notifica remoção de categoria
                if (Events.CATEGORY_REMOVED) {
                    EventBus.emit(Events.CATEGORY_REMOVED, {
                        fileId: fileId,
                        categoryId: categoryId,
                        file: files[fileIndex],
                        remainingCategories: files[fileIndex].categories.length
                    });
                }

                return true;
            }

            return false;
        }

        /**
         * Atribui categoria a múltiplos arquivos (BULK)
         */
        assignCategoryToFiles(fileIds, categoryId) {
            if (!Array.isArray(fileIds) || fileIds.length === 0) {
                console.error('fileIds deve ser um array não vazio');
                return { success: false, updatedCount: 0 };
            }

            // Verifica se categoria existe
            if (!this.getCategoryById(categoryId)) {
                console.error('Categoria não encontrada:', categoryId);
                return { success: false, updatedCount: 0 };
            }

            const files = AppState.get('files') || [];
            let updatedCount = 0;

            fileIds.forEach(fileId => {
                const fileIndex = files.findIndex(f => 
                    (f.id && f.id === fileId) || 
                    (f.name === fileId)
                );

                if (fileIndex !== -1) {
                    if (!files[fileIndex].categories) {
                        files[fileIndex].categories = [];
                    }

                    // Evita duplicatas
                    if (!files[fileIndex].categories.includes(categoryId)) {
                        files[fileIndex].categories.push(categoryId);
                        updatedCount++;
                        
                        // FASE 1.3: Aplicar boost de relevância ao categorizar
                        // AIDEV-NOTE: category-boost-on-assign; boost aplicado quando categoria é atribuída
                        const originalScore = files[fileIndex].relevanceScore || 0;
                        const categoryCount = files[fileIndex].categories.length;
                        // Usar RelevanceUtils para boost logarítmico suave
                        const boostedScore = KC.RelevanceUtils.calculateCategoryBoost(categoryCount, originalScore);
                        files[fileIndex].relevanceScore = boostedScore;
                        
                        KC.Logger?.info('CategoryManager', 'Boost de relevância aplicado', {
                            file: files[fileIndex].name,
                            category: categoryId,
                            totalCategories: categoryCount,
                            originalScore: originalScore,
                            boostedScore: files[fileIndex].relevanceScore,
                            boost: KC.RelevanceUtils.getBoostDescription(categoryCount)
                        });
                    }
                }
            });

            if (updatedCount > 0) {
                AppState.set('files', files);
                
                // FASE 1.3 FIX: Notificação resumida para bulk
                // AIDEV-NOTE: bulk-boost-notification; feedback visual para múltiplos arquivos
                if (KC.showNotification && updatedCount > 0) {
                    // Usar boost logarítmico do RelevanceUtils
                    const boostDescription = KC.RelevanceUtils.getBoostDescription(1); // Mínimo 1 categoria
                    KC.showNotification({
                        type: 'success',
                        message: `🚀 Boost aplicado em ${updatedCount} arquivo(s)`,
                        details: `Relevância aumentada com boost logarítmico: ${boostDescription}`,
                        duration: 3000
                    });
                }

                EventBus.emit(Events.FILES_UPDATED, {
                    action: 'bulk_categorization',
                    count: updatedCount,
                    categoryId: categoryId
                });
                
                // UNIFIED CONFIDENCE SYSTEM: Update confidence after bulk categorization
                if (KC.UnifiedConfidenceControllerInstance && KC.FeatureFlagManagerInstance?.isEnabled('unified_confidence_system')) {
                    try {
                        // Get the updated files that were categorized
                        const updatedFiles = files.filter(file => 
                            fileIds.some(fileId => file.id === fileId || file.name === fileId) &&
                            file.categories && file.categories.includes(categoryId)
                        );
                        
                        if (updatedFiles.length > 0) {
                            console.log(`CategoryManager: Processando confidence para ${updatedFiles.length} arquivos categorizados`);
                            
                            KC.UnifiedConfidenceControllerInstance.processFiles(updatedFiles, {
                                background: true,
                                trigger: 'bulk_categorization'
                            }).catch(error => {
                                console.error('CategoryManager: Erro ao processar confidence após categorização bulk:', error);
                            });
                        }
                        
                    } catch (error) {
                        console.error('CategoryManager: Erro na integração de confidence (bulk):', error);
                    }
                }
            }

            return {
                success: updatedCount > 0,
                updatedCount: updatedCount,
                totalFiles: fileIds.length
            };
        }

        /**
         * Remove categoria de múltiplos arquivos
         */
        removeCategoryFromFiles(fileIds, categoryId) {
            const files = AppState.get('files') || [];
            let updatedCount = 0;

            fileIds.forEach(fileId => {
                const fileIndex = files.findIndex(f => 
                    (f.id && f.id === fileId) || 
                    (f.name === fileId)
                );

                if (fileIndex !== -1 && files[fileIndex].categories) {
                    const initialLength = files[fileIndex].categories.length;
                    files[fileIndex].categories = files[fileIndex].categories
                        .filter(catId => catId !== categoryId);
                    
                    if (files[fileIndex].categories.length < initialLength) {
                        updatedCount++;
                    }
                }
            });

            if (updatedCount > 0) {
                AppState.set('files', files);

                EventBus.emit(Events.FILES_UPDATED, {
                    action: 'bulk_category_removal',
                    count: updatedCount,
                    categoryId: categoryId
                });
            }

            return {
                success: updatedCount > 0,
                updatedCount: updatedCount
            };
        }

        /**
         * Remove categoria de todos os arquivos
         */
        removeCategoryFromAllFiles(categoryId) {
            const files = AppState.get('files') || [];
            let updatedCount = 0;

            files.forEach(file => {
                if (file.categories && file.categories.includes(categoryId)) {
                    file.categories = file.categories.filter(catId => catId !== categoryId);
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                AppState.set('files', files);
                console.log(`Categoria ${categoryId} removida de ${updatedCount} arquivo(s)`);
            }
        }

        /**
         * Obtém estatísticas de categorias
         */
        getCategoryStats() {
            const files = AppState.get('files') || [];
            const stats = {};

            // Inicializa contadores
            this.getCategories().forEach(cat => {
                stats[cat.id] = {
                    category: cat,
                    count: 0,
                    percentage: 0
                };
            });

            // Conta arquivos por categoria
            files.forEach(file => {
                if (file.categories && file.categories.length > 0) {
                    file.categories.forEach(catId => {
                        if (stats[catId]) {
                            stats[catId].count++;
                        }
                    });
                }
            });

            // Calcula percentuais
            const totalFiles = files.length;
            if (totalFiles > 0) {
                Object.values(stats).forEach(stat => {
                    stat.percentage = Math.round((stat.count / totalFiles) * 100);
                });
            }

            return stats;
        }

        /**
         * Busca arquivos por categoria
         */
        getFilesByCategory(categoryId) {
            const files = AppState.get('files') || [];
            return files.filter(file => 
                file.categories && file.categories.includes(categoryId)
            );
        }

        /**
         * Exporta categorias para formato JSONL
         * @param {string} segment - Filtrar por segmento específico (opcional)
         * @returns {string} Conteúdo JSONL
         */
        exportToJSONL(segment = null) {
            const allCategories = this.getCategories();
            const customCategories = AppState.get('customCategories') || [];
            
            // Combinar categorias padrão e customizadas
            const exportCategories = allCategories.map(cat => {
                const isCustom = customCategories.some(c => c.id === cat.id);
                return {
                    id: cat.id,
                    name: cat.name,
                    color: cat.color,
                    icon: cat.icon || '🏷️',
                    segment: cat.segment || (isCustom ? 'custom' : 'default'),
                    active: cat.active !== false,
                    created: cat.created || new Date().toISOString(),
                    custom: isCustom
                };
            });
            
            // Filtrar por segmento se especificado
            const filtered = segment 
                ? exportCategories.filter(cat => cat.segment === segment)
                : exportCategories;
            
            // Converter para JSONL (uma linha por objeto)
            return filtered.map(cat => JSON.stringify(cat)).join('\n');
        }

        /**
         * Importa categorias de formato JSONL
         * @param {string} jsonlContent - Conteúdo JSONL
         * @param {Object} options - Opções de importação
         * @returns {Object} Resultado da importação
         */
        importFromJSONL(jsonlContent, options = {}) {
            const {
                merge = true,          // Se deve mesclar com existentes
                activateSegment = null, // Ativar apenas categorias de um segmento
                overwrite = false      // Se deve sobrescrever categorias existentes
            } = options;
            
            const lines = jsonlContent.trim().split('\n').filter(line => line.trim());
            const imported = [];
            const errors = [];
            
            lines.forEach((line, index) => {
                try {
                    const category = JSON.parse(line);
                    
                    // Validar estrutura mínima
                    if (!category.id || !category.name || !category.color) {
                        errors.push(`Linha ${index + 1}: categoria inválida (faltam campos obrigatórios)`);
                        return;
                    }
                    
                    // Verificar se é categoria padrão
                    const isDefault = this.defaultCategories.some(cat => cat.id === category.id);
                    
                    if (isDefault && !overwrite) {
                        // Pular categorias padrão se não for para sobrescrever
                        return;
                    }
                    
                    // Aplicar filtro de segmento se especificado
                    if (activateSegment) {
                        category.active = category.segment === activateSegment;
                    }
                    
                    // Se for categoria customizada
                    if (!isDefault || category.custom) {
                        const customCategories = AppState.get('customCategories') || [];
                        const existingIndex = customCategories.findIndex(c => c.id === category.id);
                        
                        if (existingIndex >= 0) {
                            if (merge || overwrite) {
                                customCategories[existingIndex] = {
                                    ...customCategories[existingIndex],
                                    ...category,
                                    custom: true
                                };
                            }
                        } else {
                            customCategories.push({
                                ...category,
                                custom: true
                            });
                        }
                        
                        AppState.set('customCategories', customCategories);
                        imported.push(category);
                    }
                    
                } catch (error) {
                    errors.push(`Linha ${index + 1}: ${error.message}`);
                }
            });
            
            // Forçar salvamento
            AppState._save();
            
            // Emitir evento se houver mudanças
            if (imported.length > 0) {
                EventBus.emit(Events.CATEGORIES_CHANGED, {
                    action: 'imported',
                    count: imported.length,
                    categories: imported
                });
            }
            
            return {
                success: errors.length === 0,
                imported: imported.length,
                errors: errors,
                total: lines.length
            };
        }

        /**
         * Salva categorias atuais no arquivo JSONL (auto-save)
         * NOTA: Como estamos usando arquivo local, esta função gera instruções para o usuário
         * @returns {string} Conteúdo JSONL para salvar manualmente
         */
        async autoSaveToJSONL() {
            try {
                const jsonlContent = this.exportToJSONL();
                
                // AIDEV-NOTE: auto-save-notification; notificar usuário sobre atualização necessária
                console.log('[CategoryManager] AUTO-SAVE: Categorias modificadas');
                console.log('[CategoryManager] Para persistir as mudanças, atualize o arquivo categories.jsonl com:');
                console.log('------- INÍCIO DO CONTEÚDO -------');
                console.log(jsonlContent);
                console.log('------- FIM DO CONTEÚDO -------');
                
                // Salvar no localStorage como backup
                localStorage.setItem('categories_jsonl_backup', jsonlContent);
                localStorage.setItem('categories_jsonl_backup_timestamp', new Date().toISOString());
                
                return jsonlContent;
            } catch (error) {
                console.error('[CategoryManager] Erro ao gerar JSONL:', error);
                return null;
            }
        }

        /**
         * Salva categorias para download manual
         * @param {string} filePath - Nome do arquivo (opcional)
         * @returns {Promise<boolean>} Sucesso da operação
         */
        async downloadJSONLFile(filePath = 'categories.jsonl') {
            try {
                const jsonlContent = this.exportToJSONL();
                
                // Criar blob e link para download
                const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filePath;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('[CategoryManager] Categorias baixadas como JSONL');
                return true;
            } catch (error) {
                console.error('[CategoryManager] Erro ao baixar JSONL:', error);
                return false;
            }
        }

        /**
         * Carrega categorias de arquivo JSONL
         * @param {File} file - Arquivo JSONL
         * @param {Object} options - Opções de importação
         * @returns {Promise<Object>} Resultado da importação
         */
        async loadFromJSONLFile(file, options = {}) {
            try {
                const content = await file.text();
                return this.importFromJSONL(content, options);
            } catch (error) {
                console.error('[CategoryManager] Erro ao carregar JSONL:', error);
                return {
                    success: false,
                    imported: 0,
                    errors: [error.message],
                    total: 0
                };
            }
        }

        /**
         * Lista segmentos disponíveis nas categorias
         * @returns {Array<string>} Lista de segmentos únicos
         */
        getAvailableSegments() {
            const allCategories = this.getCategories();
            const segments = new Set(['default', 'custom']);
            
            allCategories.forEach(cat => {
                if (cat.segment) {
                    segments.add(cat.segment);
                }
            });
            
            return Array.from(segments);
        }

        /**
         * Ativa/desativa categorias por segmento
         * @param {string} segment - Segmento para ativar
         * @param {boolean} exclusive - Se true, desativa outros segmentos
         */
        activateSegment(segment, exclusive = false) {
            const customCategories = AppState.get('customCategories') || [];
            let updated = false;
            
            customCategories.forEach(cat => {
                if (exclusive) {
                    // Modo exclusivo: ativa apenas o segmento especificado
                    const shouldBeActive = cat.segment === segment;
                    if (cat.active !== shouldBeActive) {
                        cat.active = shouldBeActive;
                        updated = true;
                    }
                } else {
                    // Modo aditivo: ativa o segmento especificado
                    if (cat.segment === segment && !cat.active) {
                        cat.active = true;
                        updated = true;
                    }
                }
            });
            
            if (updated) {
                AppState.set('customCategories', customCategories);
                AppState._save();
                
                EventBus.emit(Events.CATEGORIES_CHANGED, {
                    action: 'segment_activated',
                    segment: segment,
                    exclusive: exclusive
                });
            }
            
            return updated;
        }
    }

    // Cria instância única
    KC.CategoryManager = new CategoryManager();

})(window);
