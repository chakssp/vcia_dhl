// Estado da aplicação
let categories = [];
let editingCategory = null;
let availableSegments = ['default'];

// Cores pré-definidas - Paleta escura
const predefinedColors = [
    '#1e40af', '#4E1963', '#875F2C', '#08728F', '#7c2d12', '#991b1b',
    '#a21caf', '#6d28d9', '#1e3a8a', '#0f766e', '#b45309', '#be123c',
    '#5b21b6', '#1f2937', '#374151', '#0c4a6e', '#7f1d1d', '#581c87'
];

// Emojis populares
const popularEmojis = [
    '🔧', '📊', '💡', '🎯', '✨', '📚', '💼', '🚀', '⚡', '🎨',
    '📱', '💻', '🌟', '🔍', '📝', '💰', '🎪', '🔥', '🌈', '🎭',
    '🎲', '🎵', '📈', '🏆', '💎', '🎁', '🌸', '🦄', '🍀', '⭐',
    '🌙', '☀️', '🌊', '🍃', '🔮', '🎊', '🎈', '🌺', '🦋', '🌻',
    '🍎', '🧩', '🎪', '🎨', '🎭', '🎯', '🎲', '🎵'
];

// Função para normalizar texto
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado - inicializando aplicação...');
    initializeColorPicker();
    initializeEmojiPanel();
    initializeEventListeners();
    console.log('Aplicação inicializada com sucesso!');
});

function initializeColorPicker() {
    const colorGrid = document.getElementById('colorGrid');
    if (!colorGrid) {
        console.error('Elemento colorGrid não encontrado');
        return;
    }
    
    predefinedColors.forEach(function(color) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.onclick = function() { setColor(color); };
        colorGrid.appendChild(swatch);
    });
    console.log('Color picker inicializado com', predefinedColors.length, 'cores');
}

function initializeEmojiPanel() {
    const emojiGrid = document.getElementById('emojiGrid');
    if (!emojiGrid) {
        console.error('Elemento emojiGrid não encontrado');
        return;
    }
    
    popularEmojis.forEach(function(emoji) {
        const item = document.createElement('div');
        item.className = 'emoji-item';
        item.textContent = emoji;
        item.onclick = function() { setIcon(emoji); };
        emojiGrid.appendChild(item);
    });
    console.log('Emoji panel inicializado com', popularEmojis.length, 'emojis');
}

function initializeEventListeners() {
    console.log('Configurando event listeners...');
    
    // Upload area - Simplificado
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea && fileInput) {
        // Remover todos os event listeners existentes primeiro
        uploadArea.onclick = null;
        
        // Event listener único para clique
        uploadArea.addEventListener('click', function(e) {
            console.log('Clique na área de upload detectado');
            fileInput.click();
        }, { once: false });
        
        // Event listener para drag and drop
        uploadArea.addEventListener('drop', function(e) {
            console.log('Drop detectado');
            handleDrop(e);
        });
        
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
        
        uploadArea.addEventListener('dragenter', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Event listener para seleção de arquivo
        fileInput.addEventListener('change', function(e) {
            console.log('Arquivo selecionado:', e.target.files[0]?.name);
            handleFileUpload(e);
        });
        
        console.log('Upload listeners configurados');
    } else {
        console.error('Elementos de upload não encontrados');
    }

    // Form
    const categoryForm = document.getElementById('categoryForm');
    const newCategoryBtn = document.getElementById('newCategoryBtn');
    const exportBtn = document.getElementById('exportBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (categoryForm) {
        categoryForm.addEventListener('submit', saveCategory);
    }
    
    if (newCategoryBtn) {
        newCategoryBtn.addEventListener('click', newCategory);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCategories);
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllCategories);
    }

    // Color picker
    const colorPreview = document.getElementById('colorPreview');
    const categoryColor = document.getElementById('categoryColor');
    
    if (colorPreview) {
        colorPreview.addEventListener('click', toggleColorPicker);
    }
    
    if (categoryColor) {
        categoryColor.addEventListener('input', function(e) { 
            setColor(e.target.value); 
        });
    }

    // Icon input
    const categoryIcon = document.getElementById('categoryIcon');
    if (categoryIcon) {
        categoryIcon.addEventListener('input', function(e) { 
            setIcon(e.target.value); 
        });
    }

    // Name input with normalization
    const categoryName = document.getElementById('categoryName');
    if (categoryName) {
        categoryName.addEventListener('input', function(e) {
            e.target.value = normalizeText(e.target.value);
        });
    }

    // Segment input
    const segmentInput = document.getElementById('categorySegment');
    if (segmentInput) {
        segmentInput.addEventListener('focus', showSegmentSuggestions);
        segmentInput.addEventListener('blur', function() { 
            setTimeout(hideSegmentSuggestions, 200); 
        });
        segmentInput.addEventListener('input', filterSegmentSuggestions);
        segmentInput.addEventListener('keydown', handleSegmentKeydown);
    }

    // Click outside to close pickers
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.color-row') && !e.target.closest('.color-picker')) {
            const colorPicker = document.getElementById('colorPicker');
            if (colorPicker) {
                colorPicker.classList.add('hidden');
            }
        }
    });
    
    console.log('Event listeners configurados com sucesso');
}

function handleDrop(e) {
    console.log('Processando drop...');
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    console.log('Arquivo dropado:', file?.name, file?.type);
    
    if (file && (file.name.endsWith('.jsonl') || file.type === 'text/plain')) {
        console.log('Arquivo válido, processando...');
        
        // Mostrar aviso sobre importação cumulativa se já há categorias
        if (categories.length > 0) {
            const proceed = confirm(
                `📁 Você já tem ${categories.length} categoria(s) carregada(s).\n\n` +
                `🔄 Este arquivo será ADICIONADO às categorias existentes (importação cumulativa).\n\n` +
                `💡 Se quiser substituir tudo, clique no botão 🗑️ primeiro.\n\n` +
                `Continuar com a importação cumulativa?`
            );
            
            if (!proceed) {
                return;
            }
        }
        
        processFile(file);
    } else {
        alert('Por favor, selecione um arquivo .jsonl válido');
    }
}

function handleFileUpload(e) {
    console.log('Processando upload...');
    const file = e.target.files[0];
    console.log('Arquivo selecionado:', file?.name, file?.type);
    
    if (file) {
        // Mostrar aviso sobre importação cumulativa se já há categorias
        if (categories.length > 0) {
            const proceed = confirm(
                `📁 Você já tem ${categories.length} categoria(s) carregada(s).\n\n` +
                `🔄 Este arquivo será ADICIONADO às categorias existentes (importação cumulativa).\n\n` +
                `💡 Se quiser substituir tudo, clique no botão 🗑️ primeiro.\n\n` +
                `Continuar com a importação cumulativa?`
            );
            
            if (!proceed) {
                // Limpar o input para que o usuário possa tentar novamente
                e.target.value = '';
                return;
            }
        }
        
        processFile(file);
    }
}

function processFile(file) {
    console.log('Lendo arquivo:', file.name);
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let content = e.target.result;
            console.log('Conteúdo do arquivo carregado, tamanho:', content.length);
            
            // Limpar o conteúdo de caracteres invisíveis e problemas de encoding
            content = content
                .replace(/\r\n/g, '\n')  // Normalizar quebras de linha
                .replace(/\r/g, '\n')    // Converter CR para LF
                .trim();                 // Remover espaços extras
            
            const lines = content.split('\n')
                .map(line => line.trim())  // Limpar cada linha
                .filter(line => line.length > 0);  // Remover linhas vazias
            
            console.log('Linhas encontradas:', lines.length);
            
            // Debug: mostrar as primeiras linhas
            lines.slice(0, 3).forEach((line, index) => {
                console.log(`Linha ${index + 1}:`, line);
            });
            
            const parsedCategories = [];
            const errors = [];
            const duplicates = [];
            
            lines.forEach(function(line, index) {
                try {
                    // Verificar se a linha parece ser JSON válido
                    if (!line.startsWith('{') || !line.endsWith('}')) {
                        throw new Error('Linha não parece ser JSON válido');
                    }
                    
                    const category = JSON.parse(line);
                    
                    // Validar se tem as propriedades mínimas necessárias
                    const processedCategory = {
                        id: category.id || 'category_' + index,
                        name: normalizeText(category.name || 'Nova Categoria'),
                        color: category.color && category.color.startsWith('#') ? category.color : '#1e40af',
                        icon: category.icon || '🎯',
                        segment: category.segment || 'default',
                        active: category.active !== undefined ? category.active : true,
                        created: category.created || new Date().toISOString()
                    };
                    
                    // Verificar se já existe uma categoria com o mesmo ID
                    const existingCategory = categories.find(cat => cat.id === processedCategory.id);
                    if (existingCategory) {
                        duplicates.push({
                            id: processedCategory.id,
                            existing: existingCategory,
                            new: processedCategory
                        });
                    }
                    
                    parsedCategories.push(processedCategory);
                    
                } catch (err) {
                    const errorMsg = `Linha ${index + 1}: ${err.message}`;
                    console.warn(errorMsg);
                    console.warn('Conteúdo da linha:', line);
                    errors.push(errorMsg);
                }
            });

            if (parsedCategories.length === 0) {
                alert('Nenhuma categoria válida foi encontrada no arquivo.\n\nVerifique se o arquivo está no formato JSONL correto:\n- Uma categoria por linha\n- Cada linha deve ser um JSON válido\n\nErros encontrados:\n' + errors.slice(0, 3).join('\n'));
                return;
            }

            // Tratar duplicatas se houver
            if (duplicates.length > 0) {
                const action = confirm(
                    `Encontradas ${duplicates.length} categoria(s) com IDs duplicados:\n\n` +
                    duplicates.slice(0, 3).map(d => `• ${d.id}`).join('\n') +
                    (duplicates.length > 3 ? `\n• ... e mais ${duplicates.length - 3}` : '') +
                    `\n\n✅ OK = Manter as existentes (ignorar duplicatas)\n❌ Cancelar = Sobrescrever com as novas`
                );
                
                if (action) {
                    // Manter existentes - filtrar duplicatas das novas
                    const duplicateIds = duplicates.map(d => d.id);
                    const newCategories = parsedCategories.filter(cat => !duplicateIds.includes(cat.id));
                    categories = categories.concat(newCategories);
                    console.log('Mantidas categorias existentes, adicionadas', newCategories.length, 'novas');
                } else {
                    // Sobrescrever - remover existentes e adicionar novas
                    const duplicateIds = duplicates.map(d => d.id);
                    categories = categories.filter(cat => !duplicateIds.includes(cat.id));
                    categories = categories.concat(parsedCategories);
                    console.log('Categorias duplicadas sobrescritas, total:', categories.length);
                }
            } else {
                // Não há duplicatas - adicionar tudo
                const previousCount = categories.length;
                categories = categories.concat(parsedCategories);
                console.log(`Importação cumulativa: ${previousCount} + ${parsedCategories.length} = ${categories.length} categorias`);
            }

            if (errors.length > 0 && errors.length < lines.length) {
                const proceed = confirm(`Arquivo processado com ${errors.length} erros de ${lines.length} linhas.\n\n${parsedCategories.length} categorias foram importadas.\n\nDeseja continuar?`);
                if (!proceed) return;
            }
            
            // Extrair segmentos únicos (cumulativo)
            const allSegments = categories.map(function(cat) { return cat.segment; });
            const segmentsSet = {};
            allSegments.forEach(function(segment) { segmentsSet[segment] = true; });
            availableSegments.forEach(function(segment) { segmentsSet[segment] = true; });
            availableSegments = Object.keys(segmentsSet);
            
            renderCategories();
            toggleExportButton();
            
            // Feedback de sucesso
            const totalCategorias = categories.length;
            const novasCategorias = parsedCategories.length - duplicates.length;
            
            alert(`🎉 Importação concluída!\n\n` +
                  `📁 Arquivo: ${file.name}\n` +
                  `➕ Novas categorias: ${novasCategorias}\n` +
                  `📊 Total de categorias: ${totalCategorias}\n` +
                  `🔄 Duplicatas tratadas: ${duplicates.length}`);
            
            console.log('Arquivo processado com sucesso! Total de categorias:', totalCategorias);
            
        } catch (error) {
            console.error('Erro crítico ao processar arquivo:', error);
            alert('Erro crítico ao processar arquivo.\n\nDetalhes do erro: ' + error.message + '\n\nVerifique se o arquivo está no formato JSONL correto.');
        }
    };
    
    reader.onerror = function() {
        console.error('Erro ao ler arquivo');
        alert('Erro ao ler arquivo');
    };
    
    reader.readAsText(file, 'utf-8');  // Especificar encoding UTF-8
}

function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    const categoryCount = document.getElementById('categoryCount');
    
    if (!categoryList || !categoryCount) {
        console.error('Elementos da lista não encontrados');
        return;
    }
    
    categoryCount.textContent = categories.length;

    if (categories.length === 0) {
        categoryList.innerHTML = [
            '<div class="empty-state">',
            '<div class="empty-icon">',
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
            '<polyline points="7,10 12,15 17,10"/>',
            '<line x1="12" y1="15" x2="12" y2="3"/>',
            '</svg>',
            '</div>',
            '<p class="empty-title">Nenhuma categoria importada</p>',
            '<p class="empty-subtitle">Importe um arquivo .jsonl para começar</p>',
            '</div>'
        ].join('');
        return;
    }

    let html = '';
    categories.forEach(function(category) {
        const statusClass = category.active ? 'status-active' : 'status-inactive';
        const statusText = category.active ? 'Ativo' : 'Inativo';
        
        html += [
            '<div class="category-item" onclick="editCategory(\'' + category.id + '\')">',
            '<div class="category-content">',
            '<div class="category-info">',
            '<div class="category-icon" style="background-color: ' + category.color + '">',
            category.icon,
            '</div>',
            '<div class="category-details">',
            '<h3>',
            category.name,
            '<span class="status-badge ' + statusClass + '">',
            statusText,
            '</span>',
            '</h3>',
            '<div class="category-meta">',
            category.segment + ' • ' + category.id,
            '</div>',
            '</div>',
            '</div>',
            '<button class="delete-button" onclick="event.stopPropagation(); deleteCategory(\'' + category.id + '\')">',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
            '<polyline points="3,6 5,6 21,6"/>',
            '<path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>',
            '<line x1="10" y1="11" x2="10" y2="17"/>',
            '<line x1="14" y1="11" x2="14" y2="17"/>',
            '</svg>',
            '</button>',
            '</div>',
            '</div>'
        ].join('');
    });

    categoryList.innerHTML = html;
    
    // Debug: verificar se o scroll está funcionando
    setTimeout(function() {
        const scrollContainer = document.getElementById('categoryList');
        if (scrollContainer) {
            const hasScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
            console.log('Scroll check:', {
                categorias: categories.length,
                alturaTotal: scrollContainer.scrollHeight,
                alturaVisivel: scrollContainer.clientHeight,
                temScroll: hasScroll,
                overflow: window.getComputedStyle(scrollContainer).overflowY
            });
            
            if (hasScroll) {
                console.log('✅ Scroll está ativo!');
            } else if (categories.length > 5) {
                console.log('⚠️ Deveria ter scroll mas não tem...');
            }
        }
    }, 200);
    
    console.log('Lista renderizada com', categories.length, 'categorias');
}

// Variáveis globais para o indicador de scroll
let scrollTimeout = null;

function updateScrollIndicator() {
    const categoryScrollContainer = document.getElementById('categoryList');
    const categoryListContainer = categoryScrollContainer?.closest('.category-list');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const scrollPosition = document.getElementById('scrollPosition');
    
    if (categoryScrollContainer && categoryListContainer) {
        const hasScroll = categoryScrollContainer.scrollHeight > categoryScrollContainer.clientHeight;
        const isAtBottom = categoryScrollContainer.scrollTop + categoryScrollContainer.clientHeight >= categoryScrollContainer.scrollHeight - 10;
        
        // Aplicar estilo compacto se houver muitas categorias (mais de 6)
        if (categories.length > 6) {
            categoryScrollContainer.classList.add('compact');
        } else {
            categoryScrollContainer.classList.remove('compact');
        }
        
        // Mostrar/esconder indicador de scroll
        if (hasScroll && !isAtBottom) {
            categoryListContainer.classList.add('has-scroll');
        } else {
            categoryListContainer.classList.remove('has-scroll');
        }
        
        // Atualizar indicador de posição
        if (hasScroll && categories.length > 0) {
            updateScrollPosition();
        } else {
            hideScrollPosition();
        }
        
        // Log para debug
        if (hasScroll) {
            console.log('Scroll ativo - Categorias:', categories.length, 'Altura total:', categoryScrollContainer.scrollHeight, 'Visível:', categoryScrollContainer.clientHeight);
        }
    }
}

function updateScrollPosition() {
    const categoryScrollContainer = document.getElementById('categoryList');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const scrollPosition = document.getElementById('scrollPosition');
    
    if (!categoryScrollContainer || !scrollIndicator || !scrollPosition) return;
    
    // Calcular posição aproximada baseada no scroll
    const scrollTop = categoryScrollContainer.scrollTop;
    const scrollHeight = categoryScrollContainer.scrollHeight - categoryScrollContainer.clientHeight;
    const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    
    // Estimar itens visíveis baseado no scroll
    const totalItems = categories.length;
    const estimatedItemHeight = 85; // Altura aproximada de cada item
    const visibleItems = Math.floor(categoryScrollContainer.clientHeight / estimatedItemHeight);
    const firstVisibleItem = Math.max(1, Math.floor((scrollTop / estimatedItemHeight)) + 1);
    const lastVisibleItem = Math.min(totalItems, firstVisibleItem + visibleItems - 1);
    
    // Atualizar texto do indicador
    if (totalItems > 0) {
        scrollPosition.textContent = `${firstVisibleItem}-${lastVisibleItem} de ${totalItems}`;
        
        // Mostrar indicador
        scrollIndicator.classList.add('visible');
        
        // Esconder após 2 segundos de inatividade
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            scrollIndicator.classList.remove('visible');
        }, 2000);
    }
}

function hideScrollPosition() {
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
        scrollIndicator.classList.remove('visible');
    }
    clearTimeout(scrollTimeout);
}

function editCategory(id) {
    const category = categories.find(function(cat) { return cat.id === id; });
    if (!category) return;

    editingCategory = category;
    
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryColor').value = category.color;
    document.getElementById('categoryIcon').value = category.icon;
    document.getElementById('categorySegment').value = category.segment;
    document.getElementById('categoryActive').checked = category.active;
    
    setColor(category.color);
    setIcon(category.icon);
    
    document.getElementById('saveButtonText').textContent = 'Atualizar';
}

function deleteCategory(id) {
    categories = categories.filter(function(cat) { return cat.id !== id; });
    if (editingCategory && editingCategory.id === id) {
        newCategory();
    }
    renderCategories();
    toggleExportButton();
}

function newCategory() {
    editingCategory = null;
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryColor').value = '#1e40af';
    document.getElementById('categoryIcon').value = '🎯';
    document.getElementById('categorySegment').value = 'default';
    document.getElementById('categoryActive').checked = true;
    
    setColor('#1e40af');
    setIcon('🎯');
    
    document.getElementById('saveButtonText').textContent = 'Salvar';
}

function saveCategory(e) {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value.trim();
    if (!name) {
        alert('Nome da categoria é obrigatório');
        return;
    }

    const normalizedName = normalizeText(name);
    const color = document.getElementById('categoryColor').value;
    const icon = document.getElementById('categoryIcon').value;
    const segment = document.getElementById('categorySegment').value;
    const active = document.getElementById('categoryActive').checked;

    const updatedData = {
        id: editingCategory ? editingCategory.id : normalizedName.replace(/\s+/g, '-'),
        name: normalizedName,
        color: color,
        icon: icon,
        segment: segment,
        active: active,
        created: editingCategory ? editingCategory.created : new Date().toISOString()
    };

    // Adicionar novo segmento se não existir
    if (segment && availableSegments.indexOf(segment) === -1) {
        availableSegments.push(segment);
    }

    if (editingCategory) {
        // Editando categoria existente
        const index = categories.findIndex(function(cat) { return cat.id === editingCategory.id; });
        categories[index] = updatedData;
    } else {
        // Criando nova categoria
        const exists = categories.find(function(cat) { return cat.id === updatedData.id; });
        if (exists) {
            alert('ID da categoria já existe');
            return;
        }
        categories.push(updatedData);
    }

    renderCategories();
    newCategory();
    toggleExportButton();
}

function setColor(color) {
    document.getElementById('categoryColor').value = color;
    document.getElementById('colorPreview').style.backgroundColor = color;
    updateIconPreview();
    updateEmojiSelection();
}

function setIcon(icon) {
    document.getElementById('categoryIcon').value = icon;
    document.getElementById('iconPreview').textContent = icon;
    updateEmojiSelection();
}

function updateIconPreview() {
    const color = document.getElementById('categoryColor').value;
    const iconPreview = document.getElementById('iconPreview');
    iconPreview.style.backgroundColor = color + '20';
    iconPreview.style.border = '2px solid ' + color + '50';
}

function updateEmojiSelection() {
    const selectedIcon = document.getElementById('categoryIcon').value;
    document.querySelectorAll('.emoji-item').forEach(function(item) {
        if (item.textContent === selectedIcon) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function toggleColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.classList.toggle('hidden');
    }
}

function showSegmentSuggestions() {
    renderSegmentSuggestions();
    const suggestions = document.getElementById('segmentSuggestions');
    if (suggestions) {
        suggestions.classList.remove('hidden');
    }
}

function hideSegmentSuggestions() {
    const suggestions = document.getElementById('segmentSuggestions');
    if (suggestions) {
        suggestions.classList.add('hidden');
    }
}

function filterSegmentSuggestions() {
    renderSegmentSuggestions();
}

function renderSegmentSuggestions() {
    const segmentInput = document.getElementById('categorySegment');
    const suggestions = document.getElementById('segmentSuggestions');
    
    if (!segmentInput || !suggestions) return;
    
    const input = segmentInput.value.toLowerCase();
    const filtered = availableSegments.filter(function(segment) {
        return segment.toLowerCase().indexOf(input) !== -1;
    });

    let html = '';
    filtered.forEach(function(segment) {
        html += '<div class="segment-option" onclick="selectSegment(\'' + segment + '\')">' + segment + '</div>';
    });

    const hasExact = filtered.some(function(segment) { return segment.toLowerCase() === input; });
    if (!hasExact && input.trim()) {
        html += '<div class="segment-create">Pressione Enter para criar "' + input + '"</div>';
    }

    suggestions.innerHTML = html;
}

function selectSegment(segment) {
    document.getElementById('categorySegment').value = segment;
    hideSegmentSuggestions();
}

function handleSegmentKeydown(e) {
    if (e.key === 'Enter') {
        const segment = e.target.value.trim();
        if (segment && availableSegments.indexOf(segment) === -1) {
            availableSegments.push(segment);
        }
        hideSegmentSuggestions();
    }
}

function clearAllCategories() {
    if (categories.length === 0) {
        return;
    }
    
    const confirmed = confirm(
        `🗑️ Tem certeza que deseja limpar TODAS as categorias?\n\n` +
        `📊 Total de categorias: ${categories.length}\n` +
        `⚠️ Esta ação não pode ser desfeita!\n\n` +
        `✅ OK = Limpar tudo\n❌ Cancelar = Manter categorias`
    );
    
    if (confirmed) {
        categories = [];
        availableSegments = ['default'];
        renderCategories();
        toggleExportButton();
        newCategory(); // Limpar formulário também
        
        console.log('Todas as categorias foram removidas');
        alert('🧹 Todas as categorias foram removidas!\n\nVocê pode importar novos arquivos agora.');
    }
}

function toggleExportButton() {
    const exportBtn = document.getElementById('exportBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (exportBtn) {
        if (categories.length === 0) {
            exportBtn.classList.add('hidden');
        } else {
            exportBtn.classList.remove('hidden');
        }
    }
    
    if (clearAllBtn) {
        if (categories.length === 0) {
            clearAllBtn.classList.add('hidden');
        } else {
            clearAllBtn.classList.remove('hidden');
        }
    }
}

function exportCategories() {
    if (categories.length === 0) {
        alert('Nenhuma categoria para exportar');
        return;
    }

    const jsonlContent = categories.map(function(cat) { return JSON.stringify(cat); }).join('\n');
    const blob = new Blob([jsonlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'categories.jsonl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}