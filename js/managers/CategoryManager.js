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
        initialize() {
            console.log('CategoryManager inicializado com implementação completa');
            
            // Carrega categorias customizadas se existirem
            const customCategories = AppState.get('customCategories');
            if (!customCategories) {
                AppState.set('customCategories', []);
            }
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

            // Emite evento
            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'created',
                category: newCategory
            });

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
                AppState.set('files', files);

                EventBus.emit(Events.FILES_UPDATED, {
                    action: 'category_assigned',
                    fileId: fileId,
                    categoryId: categoryId
                });

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
                    }
                }
            });

            if (updatedCount > 0) {
                AppState.set('files', files);

                EventBus.emit(Events.FILES_UPDATED, {
                    action: 'bulk_categorization',
                    count: updatedCount,
                    categoryId: categoryId
                });
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
    }

    // Cria instância única
    KC.CategoryManager = new CategoryManager();

})(window);
