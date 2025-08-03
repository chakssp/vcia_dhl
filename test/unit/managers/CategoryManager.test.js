/**
 * CategoryManager.test.js
 * Unit tests for CategoryManager - Category Management System
 * 
 * Tests cover:
 * - Category CRUD operations
 * - Validation and constraints
 * - Event emission and state management
 * - Default categories handling
 * - LocalStorage persistence
 */

// Mock dependencies
const mockEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
};

const mockAppState = {
    get: jest.fn(),
    set: jest.fn()
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

// Setup global mocks
global.window = {
    KnowledgeConsolidator: {
        EventBus: mockEventBus,
        Events: {
            CATEGORIES_CHANGED: 'categories_changed',
            STATE_CHANGED: 'state_changed'
        },
        AppState: mockAppState,
        Logger: mockLogger
    },
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
    }
};

describe('CategoryManager', () => {
    let categoryManager;

    // Default categories for testing
    const defaultCategories = [
        'IA/ML',
        'Negócios/Estratégia',
        'Tecnologia/Desenvolvimento',
        'Projetos/Gestão',
        'Pessoal/Reflexões'
    ];

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock localStorage behavior
        global.window.localStorage.getItem.mockReturnValue(null);
        
        // Import after mocks are set up
        require('../../../js/managers/CategoryManager.js');
        categoryManager = new window.KnowledgeConsolidator.CategoryManager();
    });

    describe('Initialization', () => {
        test('should initialize with default categories', () => {
            categoryManager.initialize();
            
            expect(categoryManager.getAllCategories()).toEqual(defaultCategories);
            expect(mockAppState.set).toHaveBeenCalledWith('categories', defaultCategories);
        });

        test('should load existing categories from localStorage', () => {
            const existingCategories = ['Custom Category 1', 'Custom Category 2'];
            global.window.localStorage.getItem.mockReturnValue(JSON.stringify(existingCategories));
            
            categoryManager.initialize();
            
            expect(categoryManager.getAllCategories()).toEqual(existingCategories);
        });

        test('should migrate and merge categories from AppState and localStorage', () => {
            const appStateCategories = ['IA/ML', 'Custom from AppState'];
            const localStorageCategories = ['Negócios/Estratégia', 'Custom from LocalStorage'];
            
            mockAppState.get.mockReturnValue(appStateCategories);
            global.window.localStorage.getItem.mockReturnValue(JSON.stringify(localStorageCategories));
            
            categoryManager.initialize();
            
            const finalCategories = categoryManager.getAllCategories();
            expect(finalCategories).toContain('IA/ML');
            expect(finalCategories).toContain('Negócios/Estratégia');
            expect(finalCategories).toContain('Custom from AppState');
            expect(finalCategories).toContain('Custom from LocalStorage');
            
            // Should remove duplicates
            expect(new Set(finalCategories).size).toBe(finalCategories.length);
        });

        test('should handle invalid localStorage data gracefully', () => {
            global.window.localStorage.getItem.mockReturnValue('invalid json');
            
            categoryManager.initialize();
            
            expect(categoryManager.getAllCategories()).toEqual(defaultCategories);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Erro ao carregar categorias do localStorage, usando padrão',
                expect.any(Error)
            );
        });
    });

    describe('Category Creation', () => {
        beforeEach(() => {
            categoryManager.initialize();
        });

        test('should create new category successfully', () => {
            const result = categoryManager.createCategory('New Category');
            
            expect(result.success).toBe(true);
            expect(result.category).toBe('New Category');
            expect(categoryManager.getAllCategories()).toContain('New Category');
            
            expect(mockEventBus.emit).toHaveBeenCalledWith('categories_changed', {
                action: 'created',
                category: 'New Category',
                categories: expect.arrayContaining(['New Category'])
            });
        });

        test('should normalize category names', () => {
            const result = categoryManager.createCategory('  NEW category  ');
            
            expect(result.success).toBe(true);
            expect(result.category).toBe('NEW category');
            expect(categoryManager.getAllCategories()).toContain('NEW category');
        });

        test('should reject empty category names', () => {
            const result = categoryManager.createCategory('');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Nome da categoria não pode estar vazio');
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });

        test('should reject whitespace-only category names', () => {
            const result = categoryManager.createCategory('   ');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Nome da categoria não pode estar vazio');
        });

        test('should reject duplicate categories', () => {
            categoryManager.createCategory('Duplicate Category');
            
            const result = categoryManager.createCategory('Duplicate Category');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Categoria já existe');
        });

        test('should reject categories that are too long', () => {
            const longName = 'a'.repeat(101); // Assuming 100 char limit
            
            const result = categoryManager.createCategory(longName);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('muito longo');
        });

        test('should reject invalid characters in category names', () => {
            const invalidNames = ['<script>', 'Category/with/slashes', 'Cat\nwith\nnewlines'];
            
            invalidNames.forEach(name => {
                const result = categoryManager.createCategory(name);
                expect(result.success).toBe(false);
                expect(result.error).toContain('caracteres inválidos');
            });
        });
    });

    describe('Category Removal', () => {
        beforeEach(() => {
            categoryManager.initialize();
            categoryManager.createCategory('Category to Remove');
        });

        test('should remove existing category', () => {
            const result = categoryManager.removeCategory('Category to Remove');
            
            expect(result.success).toBe(true);
            expect(categoryManager.getAllCategories()).not.toContain('Category to Remove');
            
            expect(mockEventBus.emit).toHaveBeenCalledWith('categories_changed', {
                action: 'removed',
                category: 'Category to Remove',
                categories: expect.not.arrayContaining(['Category to Remove'])
            });
        });

        test('should fail to remove non-existent category', () => {
            const result = categoryManager.removeCategory('Non-existent Category');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Categoria não existe');
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });

        test('should fail to remove default categories', () => {
            const result = categoryManager.removeCategory('IA/ML');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Não é possível remover categoria padrão');
        });

        test('should handle category removal with files assigned', () => {
            // Mock files that have this category
            const mockFiles = [
                { id: 'file1', categories: ['Category to Remove', 'IA/ML'] },
                { id: 'file2', categories: ['Category to Remove'] }
            ];
            
            mockAppState.get.mockReturnValue(mockFiles);
            
            const result = categoryManager.removeCategory('Category to Remove', { updateFiles: true });
            
            expect(result.success).toBe(true);
            expect(result.affectedFiles).toBe(2);
            
            // Should update AppState with modified files
            expect(mockAppState.set).toHaveBeenCalledWith('files', expect.arrayContaining([
                expect.objectContaining({
                    id: 'file1',
                    categories: ['IA/ML'] // Category removed
                }),
                expect.objectContaining({
                    id: 'file2',
                    categories: [] // All categories removed
                })
            ]));
        });
    });

    describe('Category Updates', () => {
        beforeEach(() => {
            categoryManager.initialize();
            categoryManager.createCategory('Original Category');
        });

        test('should rename category successfully', () => {
            const result = categoryManager.renameCategory('Original Category', 'Renamed Category');
            
            expect(result.success).toBe(true);
            expect(categoryManager.getAllCategories()).toContain('Renamed Category');
            expect(categoryManager.getAllCategories()).not.toContain('Original Category');
            
            expect(mockEventBus.emit).toHaveBeenCalledWith('categories_changed', {
                action: 'renamed',
                oldCategory: 'Original Category',
                newCategory: 'Renamed Category',
                categories: expect.arrayContaining(['Renamed Category'])
            });
        });

        test('should update files when renaming category', () => {
            const mockFiles = [
                { id: 'file1', categories: ['Original Category', 'IA/ML'] },
                { id: 'file2', categories: ['Other Category'] }
            ];
            
            mockAppState.get.mockReturnValue(mockFiles);
            
            const result = categoryManager.renameCategory('Original Category', 'Renamed Category');
            
            expect(result.success).toBe(true);
            expect(result.affectedFiles).toBe(1);
            
            expect(mockAppState.set).toHaveBeenCalledWith('files', expect.arrayContaining([
                expect.objectContaining({
                    id: 'file1',
                    categories: ['Renamed Category', 'IA/ML']
                }),
                expect.objectContaining({
                    id: 'file2',
                    categories: ['Other Category'] // Unchanged
                })
            ]));
        });

        test('should fail to rename to existing category', () => {
            categoryManager.createCategory('Existing Category');
            
            const result = categoryManager.renameCategory('Original Category', 'Existing Category');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Categoria com esse nome já existe');
        });
    });

    describe('Category Queries', () => {
        beforeEach(() => {
            categoryManager.initialize();
            categoryManager.createCategory('Custom Category 1');
            categoryManager.createCategory('Custom Category 2');
        });

        test('should return all categories', () => {
            const categories = categoryManager.getAllCategories();
            
            expect(categories).toContain('IA/ML');
            expect(categories).toContain('Custom Category 1');
            expect(categories).toContain('Custom Category 2');
        });

        test('should filter categories by pattern', () => {
            const filtered = categoryManager.filterCategories('Custom');
            
            expect(filtered).toContain('Custom Category 1');
            expect(filtered).toContain('Custom Category 2');
            expect(filtered).not.toContain('IA/ML');
        });

        test('should check if category exists', () => {
            expect(categoryManager.hasCategory('IA/ML')).toBe(true);
            expect(categoryManager.hasCategory('Custom Category 1')).toBe(true);
            expect(categoryManager.hasCategory('Non-existent')).toBe(false);
        });

        test('should get category usage statistics', () => {
            const mockFiles = [
                { id: 'file1', categories: ['IA/ML', 'Custom Category 1'] },
                { id: 'file2', categories: ['IA/ML'] },
                { id: 'file3', categories: ['Custom Category 2'] }
            ];
            
            mockAppState.get.mockReturnValue(mockFiles);
            
            const stats = categoryManager.getCategoryStats();
            
            expect(stats['IA/ML']).toBe(2);
            expect(stats['Custom Category 1']).toBe(1);
            expect(stats['Custom Category 2']).toBe(1);
            expect(stats['Negócios/Estratégia']).toBe(0);
        });

        test('should get categories sorted by usage', () => {
            const mockFiles = [
                { id: 'file1', categories: ['IA/ML'] },
                { id: 'file2', categories: ['IA/ML'] },
                { id: 'file3', categories: ['Custom Category 1'] }
            ];
            
            mockAppState.get.mockReturnValue(mockFiles);
            
            const sorted = categoryManager.getCategoriesByUsage();
            
            expect(sorted[0]).toEqual({ name: 'IA/ML', count: 2 });
            expect(sorted[1]).toEqual({ name: 'Custom Category 1', count: 1 });
        });
    });

    describe('Persistence', () => {
        beforeEach(() => {
            categoryManager.initialize();
        });

        test('should save categories to localStorage on changes', () => {
            categoryManager.createCategory('New Category');
            
            expect(global.window.localStorage.setItem).toHaveBeenCalledWith(
                'kc_categories',
                expect.stringContaining('New Category')
            );
        });

        test('should save categories to AppState on changes', () => {
            categoryManager.createCategory('New Category');
            
            expect(mockAppState.set).toHaveBeenCalledWith(
                'categories',
                expect.arrayContaining(['New Category'])
            );
        });

        test('should handle localStorage save errors gracefully', () => {
            global.window.localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage full');
            });
            
            const result = categoryManager.createCategory('New Category');
            
            expect(result.success).toBe(true); // Should still succeed
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Erro ao salvar categorias no localStorage',
                expect.any(Error)
            );
        });
    });

    describe('Import/Export', () => {
        beforeEach(() => {
            categoryManager.initialize();
        });

        test('should export categories as JSON', () => {
            categoryManager.createCategory('Export Test');
            
            const exported = categoryManager.exportCategories();
            const parsed = JSON.parse(exported);
            
            expect(parsed).toContain('Export Test');
            expect(parsed).toContain('IA/ML');
        });

        test('should import categories from JSON', () => {
            const importData = JSON.stringify(['Imported Category 1', 'Imported Category 2']);
            
            const result = categoryManager.importCategories(importData);
            
            expect(result.success).toBe(true);
            expect(result.imported).toBe(2);
            expect(categoryManager.getAllCategories()).toContain('Imported Category 1');
            expect(categoryManager.getAllCategories()).toContain('Imported Category 2');
        });

        test('should merge imported categories with existing ones', () => {
            categoryManager.createCategory('Existing Category');
            
            const importData = JSON.stringify(['Imported Category', 'Existing Category']);
            
            const result = categoryManager.importCategories(importData);
            
            expect(result.success).toBe(true);
            expect(result.imported).toBe(1); // Only one new category
            expect(result.duplicates).toBe(1);
        });

        test('should handle invalid import data', () => {
            const result = categoryManager.importCategories('invalid json');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('JSON inválido');
        });
    });

    describe('Event System', () => {
        beforeEach(() => {
            categoryManager.initialize();
        });

        test('should emit events on category operations', () => {
            // Test create event
            categoryManager.createCategory('Test Category');
            expect(mockEventBus.emit).toHaveBeenCalledWith('categories_changed', expect.objectContaining({
                action: 'created',
                category: 'Test Category'
            }));

            // Reset mock
            mockEventBus.emit.mockClear();

            // Test remove event
            categoryManager.removeCategory('Test Category');
            expect(mockEventBus.emit).toHaveBeenCalledWith('categories_changed', expect.objectContaining({
                action: 'removed',
                category: 'Test Category'
            }));
        });

        test('should not emit events on failed operations', () => {
            const result = categoryManager.createCategory(''); // Should fail
            
            expect(result.success).toBe(false);
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        beforeEach(() => {
            categoryManager.initialize();
        });

        test('should handle concurrent modifications gracefully', () => {
            // Simulate concurrent creation attempts
            const results = [
                categoryManager.createCategory('Concurrent Category'),
                categoryManager.createCategory('Concurrent Category')
            ];
            
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBe('Categoria já existe');
        });

        test('should handle special characters in category names', () => {
            const validSpecialChars = ['Category-with-dash', 'Category_with_underscore', 'Category (with parentheses)'];
            
            validSpecialChars.forEach(name => {
                const result = categoryManager.createCategory(name);
                expect(result.success).toBe(true);
            });
        });

        test('should handle unicode characters in category names', () => {
            const unicodeNames = ['Categoria çom acentos', 'カテゴリー', '分类'];
            
            unicodeNames.forEach(name => {
                const result = categoryManager.createCategory(name);
                expect(result.success).toBe(true);
            });
        });
    });
});