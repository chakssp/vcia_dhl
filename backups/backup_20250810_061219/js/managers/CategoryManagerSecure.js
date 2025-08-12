/**
 * CategoryManagerSecure.js - Versão segura do CategoryManager
 * Implementa sanitização de entradas para prevenir XSS
 */

import InputSanitizer from '../utils/InputSanitizer.js';

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const AppState = KC.AppState;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const logger = KC.Logger;

    class CategoryManagerSecure {
        constructor() {
            this.defaultCategories = [
                { id: 'ai-ml', name: 'IA/ML', color: '#6366f1', icon: '🤖' },
                { id: 'dev-tech', name: 'Dev/Tech', color: '#10b981', icon: '💻' },
                { id: 'arquitetura', name: 'Arquitetura', color: '#f59e0b', icon: '🏛️' },
                { id: 'insights', name: 'Insights', color: '#ec4899', icon: '💡' },
                { id: 'docs', name: 'Documentação', color: '#06b6d4', icon: '📄' },
                { id: 'decisoes', name: 'Decisões', color: '#8b5cf6', icon: '🎯' },
                { id: 'projetos', name: 'Projetos', color: '#84cc16', icon: '📁' },
                { id: 'referencias', name: 'Referências', color: '#f97316', icon: '📚' }
            ];
            
            this.init();
        }

        init() {
            logger.info('CategoryManagerSecure', 'Inicializando versão segura');
            this._migrateOldCategories();
        }

        /**
         * Migra categorias antigas sem sanitização
         */
        _migrateOldCategories() {
            const customCategories = AppState.get('customCategories') || [];
            let migrated = false;

            const sanitizedCategories = customCategories.map(cat => {
                const sanitizedName = InputSanitizer.sanitizeCategory(cat.name);
                if (sanitizedName !== cat.name) {
                    migrated = true;
                    logger.info('CategoryManagerSecure', `Categoria sanitizada: "${cat.name}" → "${sanitizedName}"`);
                }
                
                return {
                    ...cat,
                    name: sanitizedName
                };
            });

            if (migrated) {
                AppState.set('customCategories', sanitizedCategories);
                logger.info('CategoryManagerSecure', 'Categorias migradas com sanitização');
            }
        }

        /**
         * Retorna todas as categorias disponíveis (padrão + customizadas)
         */
        getAllCategories() {
            const customCategories = AppState.get('customCategories') || [];
            return [...this.defaultCategories, ...customCategories];
        }

        /**
         * Busca categoria por ID
         */
        getCategoryById(categoryId) {
            // Sanitiza ID antes de buscar
            const sanitizedId = InputSanitizer.sanitizeCategory(categoryId)
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
                
            return this.getAllCategories().find(cat => cat.id === sanitizedId);
        }

        /**
         * Cria nova categoria com sanitização
         */
        createCategory(category) {
            logger.info('CategoryManagerSecure', 'Criando categoria com sanitização', category);

            // Validação e sanitização
            if (!category || !category.name) {
                logger.error('CategoryManagerSecure', 'Nome da categoria é obrigatório');
                return false;
            }

            // Sanitiza nome
            const sanitizedName = InputSanitizer.sanitizeCategory(category.name);
            if (!sanitizedName) {
                logger.error('CategoryManagerSecure', 'Nome da categoria inválido após sanitização');
                return false;
            }

            // Detecta tentativa de XSS
            if (InputSanitizer.detectXSS(category.name)) {
                logger.warn('CategoryManagerSecure', 'Tentativa de XSS detectada no nome da categoria');
                return false;
            }

            // Gera ID sanitizado
            const categoryId = sanitizedName
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            // Verifica se já existe
            const existing = this.getCategoryById(categoryId);
            if (existing) {
                logger.warn('CategoryManagerSecure', 'Categoria já existe:', categoryId);
                return false;
            }

            // Sanitiza cor (aceita apenas formato hexadecimal)
            let color = category.color || '#6366f1';
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
                logger.warn('CategoryManagerSecure', 'Cor inválida, usando padrão');
                color = '#6366f1';
            }

            // Sanitiza ícone (aceita apenas emojis únicos)
            let icon = category.icon || '🏷️';
            // Verifica se é um emoji válido (simplificado)
            if (icon.length > 2 || !/\p{Emoji}/u.test(icon)) {
                logger.warn('CategoryManagerSecure', 'Ícone inválido, usando padrão');
                icon = '🏷️';
            }

            const newCategory = {
                id: categoryId,
                name: sanitizedName,
                color: color,
                icon: icon,
                custom: true,
                createdAt: new Date().toISOString()
            };

            // Adiciona às categorias customizadas
            const customCategories = AppState.get('customCategories') || [];
            customCategories.push(newCategory);
            AppState.set('customCategories', customCategories);
            
            logger.info('CategoryManagerSecure', 'Nova categoria criada com segurança:', newCategory);
            
            // Força salvamento imediato
            AppState._save();

            // Emite evento
            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'created',
                category: newCategory
            });

            return newCategory;
        }

        /**
         * Atualiza categoria existente com sanitização
         */
        updateCategory(categoryId, updates) {
            // Sanitiza ID
            const sanitizedId = InputSanitizer.sanitizeCategory(categoryId)
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            const customCategories = AppState.get('customCategories') || [];
            const index = customCategories.findIndex(cat => cat.id === sanitizedId);
            
            if (index === -1) {
                logger.warn('CategoryManagerSecure', 'Apenas categorias customizadas podem ser editadas');
                return false;
            }

            const sanitizedUpdates = {};

            // Sanitiza nome se fornecido
            if (updates.name) {
                sanitizedUpdates.name = InputSanitizer.sanitizeCategory(updates.name);
                if (!sanitizedUpdates.name || InputSanitizer.detectXSS(updates.name)) {
                    logger.error('CategoryManagerSecure', 'Nome inválido ou tentativa de XSS');
                    return false;
                }
            }

            // Sanitiza cor se fornecida
            if (updates.color) {
                if (/^#[0-9A-F]{6}$/i.test(updates.color)) {
                    sanitizedUpdates.color = updates.color;
                } else {
                    logger.warn('CategoryManagerSecure', 'Cor inválida ignorada');
                }
            }

            // Sanitiza ícone se fornecido
            if (updates.icon) {
                if (updates.icon.length <= 2 && /\p{Emoji}/u.test(updates.icon)) {
                    sanitizedUpdates.icon = updates.icon;
                } else {
                    logger.warn('CategoryManagerSecure', 'Ícone inválido ignorado');
                }
            }

            // Atualiza categoria
            customCategories[index] = {
                ...customCategories[index],
                ...sanitizedUpdates,
                updatedAt: new Date().toISOString()
            };

            AppState.set('customCategories', customCategories);
            AppState._save();

            logger.info('CategoryManagerSecure', 'Categoria atualizada com segurança:', customCategories[index]);

            // Emite evento
            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'updated',
                category: customCategories[index]
            });

            return customCategories[index];
        }

        /**
         * Remove categoria customizada
         */
        removeCategory(categoryId) {
            // Sanitiza ID
            const sanitizedId = InputSanitizer.sanitizeCategory(categoryId)
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            const customCategories = AppState.get('customCategories') || [];
            const filtered = customCategories.filter(cat => cat.id !== sanitizedId);
            
            if (filtered.length === customCategories.length) {
                logger.warn('CategoryManagerSecure', 'Categoria não encontrada ou é padrão');
                return false;
            }

            AppState.set('customCategories', filtered);
            AppState._save();

            logger.info('CategoryManagerSecure', 'Categoria removida:', sanitizedId);

            // Emite evento
            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'removed',
                categoryId: sanitizedId
            });

            return true;
        }

        /**
         * Verifica se é categoria padrão
         */
        isDefaultCategory(categoryId) {
            const sanitizedId = InputSanitizer.sanitizeCategory(categoryId)
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
                
            return this.defaultCategories.some(cat => cat.id === sanitizedId);
        }

        /**
         * Exporta categorias (sem dados sensíveis)
         */
        exportCategories() {
            return {
                default: this.defaultCategories,
                custom: AppState.get('customCategories') || [],
                exportDate: new Date().toISOString()
            };
        }

        /**
         * Importa categorias com sanitização
         */
        importCategories(data) {
            if (!data || !data.custom || !Array.isArray(data.custom)) {
                logger.error('CategoryManagerSecure', 'Dados de importação inválidos');
                return false;
            }

            const sanitizedCategories = [];
            
            for (const cat of data.custom) {
                if (!cat.name) continue;
                
                const sanitized = {
                    ...cat,
                    name: InputSanitizer.sanitizeCategory(cat.name),
                    id: InputSanitizer.sanitizeCategory(cat.id || cat.name)
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '')
                };

                // Valida cor
                if (!/^#[0-9A-F]{6}$/i.test(sanitized.color)) {
                    sanitized.color = '#6366f1';
                }

                // Valida ícone
                if (!sanitized.icon || sanitized.icon.length > 2 || !/\p{Emoji}/u.test(sanitized.icon)) {
                    sanitized.icon = '🏷️';
                }

                sanitized.custom = true;
                sanitized.importedAt = new Date().toISOString();
                
                sanitizedCategories.push(sanitized);
            }

            AppState.set('customCategories', sanitizedCategories);
            AppState._save();

            logger.info('CategoryManagerSecure', `${sanitizedCategories.length} categorias importadas com segurança`);

            EventBus.emit(Events.CATEGORIES_CHANGED, {
                action: 'imported',
                count: sanitizedCategories.length
            });

            return true;
        }
    }

    // Registra no namespace global
    KC.CategoryManagerSecure = new CategoryManagerSecure();

})(window);