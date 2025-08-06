/**
 * CategoryQuickSelector.js - Seletor rápido de categorias
 * 
 * Interface rápida e eficiente para seleção múltipla de categorias
 * Estilo Spotify com cores preservadas para melhor curadoria
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;

    class CategoryQuickSelector {
        constructor() {
            this.selectedCategories = [];
            this.currentFileId = null;
            this.popup = null;
            this.backdrop = null;
            
            // Paleta expandida de cores (25 cores vibrantes)
            this.colorPalette = [
                '#ef4444', '#f59e0b', '#f97316', '#fb923c', '#fdba74',  // Reds/Oranges
                '#facc15', '#fde047', '#a3e635', '#84cc16', '#65a30d',  // Yellows/Limes
                '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',  // Greens/Teals/Blues
                '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c026d3',  // Blues/Purples
                '#d946ef', '#e879f9', '#ec4899', '#f43f5e', '#dc2626'   // Magentas/Pinks/Reds
            ];
            
            this.selectedColor = this.colorPalette[0];
            this.selectedEmoji = '🏷️';
            
            // Emojis disponíveis
            this.emojiOptions = ['🏷️', '📌', '🔖', '💼', '📊', '🎯', '💡', '🚀', '⭐', '🔥', '💎', '🎨'];
        }

        /**
         * Abre o seletor rápido para um arquivo
         */
        open(fileId, currentCategories = []) {
            this.currentFileId = fileId;
            
            // NOVA LÓGICA: Processar categorias do histórico
            const processedCategories = [];
            const existingCategoryManager = KC.CategoryManager;
            
            // Processar cada categoria do arquivo (agora vem como nomes do DOM)
            (currentCategories || []).forEach(cat => {
                let categoryName = null;
                
                // Agora vem sempre como string (nome da categoria do DOM)
                if (typeof cat === 'string') {
                    categoryName = cat.trim();
                } else if (cat && typeof cat === 'object') {
                    categoryName = cat.name || cat.id;
                }
                
                if (!categoryName) return;
                
                // Buscar categoria por nome (já que agora vem do DOM)
                const allCategories = existingCategoryManager.getCategories();
                let existingCategory = allCategories.find(c => 
                    c.name === categoryName || 
                    c.id === categoryName ||
                    c.name.toLowerCase() === categoryName.toLowerCase()
                );
                
                // Se existe, usar o ID existente
                if (existingCategory) {
                    processedCategories.push(existingCategory.id);
                    console.log(`[CategoryQuickSelector] Categoria existente encontrada: ${existingCategory.name}`);
                } else {
                    // CRIAR CATEGORIA QUE NÃO EXISTE
                    console.log(`[CategoryQuickSelector] Criando categoria do histórico: ${categoryName}`);
                    
                    // Determinar cor e ícone baseado no nome ou usar padrões
                    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
                    const icons = ['📁', '🏷️', '📌', '🔖', '💼', '📊', '🎯'];
                    const randomIndex = Math.floor(Math.random() * colors.length);
                    
                    // Gerar ID baseado no nome
                    const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
                    
                    const newCategory = existingCategoryManager.createCategory({
                        id: categoryId,
                        name: categoryName,
                        color: colors[randomIndex],
                        icon: icons[randomIndex]
                    });
                    
                    if (newCategory) {
                        processedCategories.push(newCategory.id);
                        console.log(`[CategoryQuickSelector] Nova categoria criada: ${newCategory.name} (${newCategory.id})`);
                    }
                }
            });
            
            // Usar as categorias processadas
            this.selectedCategories = processedCategories;
            console.log(`[CategoryQuickSelector] Total de categorias selecionadas: ${this.selectedCategories.length}`);
            
            // Adicionar classe ao body para prevenir scroll
            document.body.classList.add('category-popup-open');
            
            // Criar backdrop
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'category-quick-backdrop';
            this.backdrop.onclick = () => this.close();
            
            // Criar popup
            this.popup = document.createElement('div');
            this.popup.className = 'category-quick-popup';
            this.popup.onclick = (e) => e.stopPropagation();
            
            this.render();
            
            // Adicionar ao DOM
            document.body.appendChild(this.backdrop);
            document.body.appendChild(this.popup);
            
            // Adicionar estilos se ainda não existirem
            this.injectStyles();
        }

        /**
         * Renderiza o conteúdo do popup
         */
        render() {
            const categories = KC.CategoryManager.getCategories();
            
            this.popup.innerHTML = `
                <div class="cqs-header">
                    <h3>Selecione as Categorias</h3>
                    <span class="cqs-subtitle">Clique para selecionar múltiplas</span>
                </div>
                
                <div class="cqs-tags-container">
                    ${categories.map(cat => `
                        <span class="cqs-tag ${this.selectedCategories.includes(cat.id) ? 'selected' : ''}"
                              data-id="${cat.id}"
                              style="background: ${cat.color}; color: white;"
                              onclick="KC.CategoryQuickSelector.toggle('${cat.id}')">
                            ${cat.icon || '🏷️'} ${cat.name}
                        </span>
                    `).join('')}
                    
                    <span class="cqs-add-tag" onclick="KC.CategoryQuickSelector.showAddForm()">
                        + Adicionar
                    </span>
                </div>
                
                <div id="cqs-add-form" class="cqs-add-form">
                    <div class="cqs-form-row">
                        <input type="text" 
                               id="cqs-new-name" 
                               placeholder="Nome da categoria"
                               onkeypress="if(event.key === 'Enter') KC.CategoryQuickSelector.addNewCategory()">
                        
                        <div class="cqs-emoji-picker">
                            ${this.emojiOptions.map((emoji, i) => `
                                <span class="cqs-emoji-option ${i === 0 ? 'selected' : ''}"
                                      onclick="KC.CategoryQuickSelector.selectEmoji('${emoji}', this)">
                                    ${emoji}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="cqs-color-grid">
                        ${this.colorPalette.map((color, i) => `
                            <div class="cqs-color-dot ${i === 0 ? 'selected' : ''}"
                                 style="background: ${color};"
                                 onclick="KC.CategoryQuickSelector.selectColor('${color}', this)"></div>
                        `).join('')}
                    </div>
                    
                    <div class="cqs-form-actions">
                        <button onclick="KC.CategoryQuickSelector.addNewCategory()">Criar</button>
                        <button onclick="KC.CategoryQuickSelector.hideAddForm()" class="cqs-cancel">Cancelar</button>
                    </div>
                </div>
                
                <div class="cqs-footer">
                    <span class="cqs-count">
                        <strong>${this.selectedCategories.length}</strong> selecionada${this.selectedCategories.length !== 1 ? 's' : ''}
                    </span>
                    <button class="cqs-confirm" onclick="KC.CategoryQuickSelector.confirm()">
                        Confirmar
                    </button>
                </div>
            `;
        }

        /**
         * Toggle categoria
         */
        toggle(categoryId) {
            const index = this.selectedCategories.indexOf(categoryId);
            if (index > -1) {
                this.selectedCategories.splice(index, 1);
            } else {
                this.selectedCategories.push(categoryId);
            }
            
            // Atualizar visual
            const tag = this.popup.querySelector(`[data-id="${categoryId}"]`);
            if (tag) {
                tag.classList.toggle('selected');
            }
            
            // Atualizar contador
            this.updateCount();
        }

        /**
         * Atualiza contador
         */
        updateCount() {
            const countEl = this.popup.querySelector('.cqs-count');
            if (countEl) {
                countEl.innerHTML = `<strong>${this.selectedCategories.length}</strong> selecionada${this.selectedCategories.length !== 1 ? 's' : ''}`;
            }
        }

        /**
         * Mostra formulário de adicionar
         */
        showAddForm() {
            const form = this.popup.querySelector('#cqs-add-form');
            form.classList.add('active');
            this.popup.querySelector('#cqs-new-name').focus();
        }

        /**
         * Esconde formulário
         */
        hideAddForm() {
            const form = this.popup.querySelector('#cqs-add-form');
            form.classList.remove('active');
            this.popup.querySelector('#cqs-new-name').value = '';
        }

        /**
         * Seleciona cor
         */
        selectColor(color, element) {
            this.selectedColor = color;
            this.popup.querySelectorAll('.cqs-color-dot').forEach(dot => {
                dot.classList.remove('selected');
            });
            element.classList.add('selected');
        }

        /**
         * Seleciona emoji
         */
        selectEmoji(emoji, element) {
            this.selectedEmoji = emoji;
            this.popup.querySelectorAll('.cqs-emoji-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            element.classList.add('selected');
        }

        /**
         * Adiciona nova categoria
         */
        addNewCategory() {
            const input = this.popup.querySelector('#cqs-new-name');
            const name = input.value.trim();
            
            if (!name) {
                input.focus();
                return;
            }
            
            // Criar categoria
            const newCategory = KC.CategoryManager.createCategory({
                name: name,
                color: this.selectedColor,
                icon: this.selectedEmoji
            });
            
            if (newCategory) {
                // Adicionar à seleção
                this.selectedCategories.push(newCategory.id);
                
                // Re-renderizar
                this.render();
                
                KC.Logger?.success(`Categoria "${name}" criada`);
            }
        }

        /**
         * Confirma seleção
         */
        confirm() {
            // Emitir evento com seleção
            EventBus.emit(Events.CATEGORIES_SELECTED, {
                fileId: this.currentFileId,
                categories: this.selectedCategories
            });
            
            this.close();
        }

        /**
         * Fecha o seletor
         */
        close() {
            // Remover classe do body
            document.body.classList.remove('category-popup-open');
            
            if (this.backdrop) this.backdrop.remove();
            if (this.popup) this.popup.remove();
            this.backdrop = null;
            this.popup = null;
        }

        /**
         * Injeta estilos CSS
         */
        injectStyles() {
            if (document.getElementById('category-quick-selector-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'category-quick-selector-styles';
            style.textContent = `
                .category-quick-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    z-index: 9998;
                    backdrop-filter: blur(4px);
                }
                
                .category-quick-popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #1a1a1a;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    width: 90%;
                    max-width: 720px;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 9999;
                }
                
                .cqs-header {
                    margin-bottom: 20px;
                }
                
                .cqs-header h3 {
                    margin: 0;
                    color: #fff;
                    font-size: 20px;
                }
                
                .cqs-subtitle {
                    color: #b3b3b3;
                    font-size: 14px;
                }
                
                .cqs-tags-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    max-height: 120px;
                    overflow-y: auto;
                    padding: 10px 0;
                    margin-bottom: 20px;
                }
                
                .cqs-tag {
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.1s;
                    border: 2px solid transparent;
                    user-select: none;
                }
                
                .cqs-tag:hover {
                    transform: scale(1.05);
                    filter: brightness(1.1);
                }
                
                .cqs-tag.selected {
                    border-color: #fff;
                    box-shadow: 0 0 0 3px rgba(255,255,255,0.2);
                }
                
                .cqs-add-tag {
                    padding: 8px 16px;
                    border-radius: 20px;
                    background: transparent;
                    border: 2px dashed #666;
                    color: #b3b3b3;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                
                .cqs-add-tag:hover {
                    border-color: #1db954;
                    color: #1db954;
                    background: rgba(29, 185, 84, 0.1);
                }
                
                .cqs-add-form {
                    display: none;
                    margin: 20px 0;
                    padding: 20px;
                    background: #282828;
                    border-radius: 8px;
                }
                
                .cqs-add-form.active {
                    display: block;
                }
                
                .cqs-form-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                    align-items: center;
                }
                
                .cqs-add-form input {
                    flex: 1;
                    padding: 10px 14px;
                    background: #1a1a1a;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: #fff;
                    font-size: 14px;
                }
                
                .cqs-add-form input:focus {
                    outline: none;
                    border-color: #1db954;
                }
                
                .cqs-emoji-picker {
                    display: flex;
                    gap: 4px;
                }
                
                .cqs-emoji-option {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 18px;
                    border: 2px solid transparent;
                }
                
                .cqs-emoji-option:hover {
                    background: #333;
                }
                
                .cqs-emoji-option.selected {
                    border-color: #1db954;
                    background: #333;
                }
                
                .cqs-color-grid {
                    display: grid;
                    grid-template-columns: repeat(10, 1fr);
                    gap: 6px;
                    margin-bottom: 16px;
                }
                
                .cqs-color-dot {
                    aspect-ratio: 1;
                    border-radius: 6px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s;
                }
                
                .cqs-color-dot:hover {
                    transform: scale(1.1);
                }
                
                .cqs-color-dot.selected {
                    border-color: #fff;
                    box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
                }
                
                .cqs-form-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .cqs-form-actions button {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .cqs-form-actions button:first-child {
                    background: #1db954;
                    color: #000;
                }
                
                .cqs-form-actions button:first-child:hover {
                    background: #1ed760;
                }
                
                .cqs-form-actions .cqs-cancel {
                    background: #444;
                    color: #fff;
                }
                
                .cqs-form-actions .cqs-cancel:hover {
                    background: #555;
                }
                
                .cqs-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 20px;
                    border-top: 1px solid #333;
                }
                
                .cqs-count {
                    color: #b3b3b3;
                    font-size: 14px;
                }
                
                .cqs-count strong {
                    color: #1db954;
                    font-size: 16px;
                }
                
                .cqs-confirm {
                    padding: 10px 24px;
                    background: #1db954;
                    color: #000;
                    border: none;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .cqs-confirm:hover {
                    background: #1ed760;
                    transform: scale(1.05);
                }
                
                /* Scrollbar styling */
                .cqs-tags-container::-webkit-scrollbar,
                .category-quick-popup::-webkit-scrollbar {
                    width: 6px;
                }
                
                .cqs-tags-container::-webkit-scrollbar-track,
                .category-quick-popup::-webkit-scrollbar-track {
                    background: #282828;
                }
                
                .cqs-tags-container::-webkit-scrollbar-thumb,
                .category-quick-popup::-webkit-scrollbar-thumb {
                    background: #666;
                    border-radius: 3px;
                }
                
                .cqs-tags-container::-webkit-scrollbar-thumb:hover,
                .category-quick-popup::-webkit-scrollbar-thumb:hover {
                    background: #888;
                }
            `;
            
            document.head.appendChild(style);
        }
    }

    // Criar instância e registrar
    const instance = new CategoryQuickSelector();
    KC.CategoryQuickSelector = instance;

    // Registrar evento personalizado
    if (!Events.CATEGORIES_SELECTED) {
        Events.CATEGORIES_SELECTED = 'categories_selected';
    }

    // Método helper para abrir o seletor
    KC.openCategorySelector = function(fileId, currentCategories) {
        instance.open(fileId, currentCategories);
    };

})(window);