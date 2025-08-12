/**
 * 🔧 PATCH: CategoryManager.getAll() Fix
 * 
 * Adiciona método getAll() que está faltando no CategoryManager
 * Corrige erro: "CategoryManager.getAll is not a function"
 * 
 * @bug-fix ERROR ConvergenceIntegration Erro ao carregar dados iniciais
 */

(function(window) {
    'use strict';
    
    const KC = window.KnowledgeConsolidator;
    
    // Aguardar CategoryManager estar disponível
    const patchCategoryManager = () => {
        if (!KC?.CategoryManager) {
            setTimeout(patchCategoryManager, 100);
            return;
        }
        
        // Adicionar método getAll se não existir
        if (!KC.CategoryManager.getAll) {
            KC.CategoryManager.getAll = function() {
                // Buscar categorias do AppState primeiro
                const storedCategories = KC.AppState?.get('categories');
                if (storedCategories && Array.isArray(storedCategories) && storedCategories.length > 0) {
                    return storedCategories;
                }
                
                // Se não houver categorias armazenadas, retornar padrão
                if (this.defaultCategories) {
                    return this.defaultCategories;
                }
                
                // Fallback para categorias mínimas
                return [
                    { id: 'tecnico', name: 'Técnico', segment: 'technical', color: '#4f46e5' },
                    { id: 'estrategico', name: 'Estratégico', segment: 'strategic', color: '#059669' },
                    { id: 'conceitual', name: 'Conceitual', segment: 'conceptual', color: '#dc2626' },
                    { id: 'backlog', name: 'Backlog', segment: 'management', color: '#9333ea' }
                ];
            };
            
            console.log('✅ [PATCH] CategoryManager.getAll() adicionado com sucesso');
        }
        
        // Adicionar método addCategory se não existir
        if (!KC.CategoryManager.addCategory) {
            KC.CategoryManager.addCategory = function(category) {
                const categories = this.getAll();
                
                // Verificar se categoria já existe
                if (categories.find(c => c.id === category.id)) {
                    console.warn(`Categoria ${category.id} já existe`);
                    return false;
                }
                
                // Adicionar nova categoria
                categories.push(category);
                KC.AppState?.set('categories', categories);
                
                // Emitir evento
                KC.EventBus?.emit(KC.Events.CATEGORIES_UPDATED, { categories });
                
                return true;
            };
        }
        
        // Adicionar método removeCategory se não existir
        if (!KC.CategoryManager.removeCategory) {
            KC.CategoryManager.removeCategory = function(categoryId) {
                let categories = this.getAll();
                const initialLength = categories.length;
                
                categories = categories.filter(c => c.id !== categoryId);
                
                if (categories.length < initialLength) {
                    KC.AppState?.set('categories', categories);
                    KC.EventBus?.emit(KC.Events.CATEGORIES_UPDATED, { categories });
                    return true;
                }
                
                return false;
            };
        }
        
        // Adicionar método updateCategory se não existir
        if (!KC.CategoryManager.updateCategory) {
            KC.CategoryManager.updateCategory = function(categoryId, updates) {
                const categories = this.getAll();
                const category = categories.find(c => c.id === categoryId);
                
                if (category) {
                    Object.assign(category, updates);
                    KC.AppState?.set('categories', categories);
                    KC.EventBus?.emit(KC.Events.CATEGORIES_UPDATED, { categories });
                    return true;
                }
                
                return false;
            };
        }
        
        console.log('✅ [PATCH] CategoryManager métodos essenciais adicionados');
    };
    
    // Aplicar patch quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchCategoryManager);
    } else {
        patchCategoryManager();
    }
    
})(window);