/**
 * QdrantExplorer.js - Interface para explorar dados no Qdrant
 * 
 * Permite consultar, visualizar e analisar os pontos armazenados no Qdrant
 * incluindo busca semântica e visualização em grafo.
 * 
 * AIDEV-NOTE: qdrant-explorer; interface para explorar dados vetoriais
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const { Logger, EventBus, Events } = KC;

    class QdrantExplorer {
        constructor() {
            this.isConnected = false;
            this.collectionInfo = null;
            this.searchResults = [];
            this.selectedPoint = null;
        }

        /**
         * Inicializa o explorador
         */
        async initialize() {
            Logger?.info('QdrantExplorer', 'Inicializando explorador Qdrant');
            
            // Verificar conexão
            await this.checkConnection();
            
            // Registrar eventos
            this.registerEvents();
        }

        /**
         * Verifica conexão com Qdrant
         */
        async checkConnection() {
            try {
                this.isConnected = await KC.QdrantService?.checkConnection();
                
                if (this.isConnected) {
                    // Obter informações da collection
                    this.collectionInfo = await KC.QdrantService?.getCollectionInfo();
                    Logger?.info('QdrantExplorer', 'Conectado ao Qdrant', {
                        collection: this.collectionInfo?.name,
                        points: this.collectionInfo?.points_count,
                        status: this.collectionInfo?.status
                    });
                }
                
                return this.isConnected;
            } catch (error) {
                Logger?.error('QdrantExplorer', 'Erro ao conectar', error);
                return false;
            }
        }

        /**
         * Busca pontos no Qdrant
         * @param {string} query - Texto de busca
         * @param {Object} options - Opções de busca
         */
        async searchPoints(query, options = {}) {
            if (!this.isConnected) {
                await this.checkConnection();
            }

            try {
                const defaultOptions = {
                    limit: 10,
                    minScore: 0.7,
                    includePayload: true,
                    includeVector: false,
                    ...options
                };

                Logger?.info('QdrantExplorer', 'Buscando pontos', { query, options: defaultOptions });

                // Buscar por texto
                const results = await KC.QdrantService?.searchByText(query, defaultOptions);
                
                this.searchResults = results || [];
                
                EventBus?.emit('qdrant:search:completed', {
                    query,
                    results: this.searchResults,
                    count: this.searchResults.length
                });

                return this.searchResults;
            } catch (error) {
                Logger?.error('QdrantExplorer', 'Erro na busca', error);
                return [];
            }
        }

        /**
         * Busca por categoria
         * @param {string} category - Nome da categoria
         */
        async searchByCategory(category, options = {}) {
            if (!this.isConnected) {
                await this.checkConnection();
            }

            try {
                const results = await KC.QdrantService?.scroll({
                    filter: {
                        must: [
                            {
                                key: "categories",
                                match: {
                                    any: [category]
                                }
                            }
                        ]
                    },
                    limit: options.limit || 50,
                    with_payload: true,
                    with_vector: false
                });

                this.searchResults = results?.points || [];
                
                EventBus?.emit('qdrant:search:completed', {
                    category,
                    results: this.searchResults,
                    count: this.searchResults.length
                });

                return this.searchResults;
            } catch (error) {
                Logger?.error('QdrantExplorer', 'Erro na busca por categoria', error);
                return [];
            }
        }

        /**
         * Obtém estatísticas da collection
         */
        async getStats() {
            if (!this.isConnected) {
                await this.checkConnection();
            }

            try {
                const stats = await KC.QdrantService?.getCollectionStats();
                
                // Buscar categorias únicas
                const categories = new Set();
                const fileNames = new Set();
                
                // Fazer scroll para obter amostra de pontos
                const sample = await KC.QdrantService?.scroll({
                    limit: 100,
                    with_payload: true,
                    with_vector: false
                });

                sample?.points?.forEach(point => {
                    if (point.payload?.categories) {
                        point.payload.categories.forEach(cat => categories.add(cat));
                    }
                    if (point.payload?.source?.fileName) {
                        fileNames.add(point.payload.source.fileName);
                    }
                });

                return {
                    totalPoints: stats?.vectors_count || 0,
                    totalCategories: categories.size,
                    totalFiles: fileNames.size,
                    categories: Array.from(categories),
                    fileNames: Array.from(fileNames),
                    indexedSize: stats?.indexed_vectors_count || 0,
                    ...stats
                };
            } catch (error) {
                Logger?.error('QdrantExplorer', 'Erro ao obter estatísticas', error);
                return null;
            }
        }

        /**
         * Cria modal de exploração
         */
        async showExplorerModal() {
            // Verificar conexão primeiro
            if (!this.isConnected) {
                const connected = await this.checkConnection();
                if (!connected) {
                    KC.ModalManager?.showError('Não foi possível conectar ao Qdrant');
                    return;
                }
            }

            // Obter estatísticas
            const stats = await this.getStats();

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content qdrant-explorer-modal" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3>🔍 Explorador Qdrant</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <!-- Estatísticas -->
                        <div class="qdrant-stats">
                            <div class="stat-card">
                                <div class="stat-value">${stats?.totalPoints || 0}</div>
                                <div class="stat-label">Pontos Total</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats?.totalFiles || 0}</div>
                                <div class="stat-label">Arquivos</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats?.totalCategories || 0}</div>
                                <div class="stat-label">Categorias</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats?.indexedSize || 0}</div>
                                <div class="stat-label">Indexados</div>
                            </div>
                        </div>

                        <!-- Busca -->
                        <div class="search-section">
                            <h4>Busca Semântica</h4>
                            <div class="search-bar">
                                <input type="text" 
                                       id="qdrant-search-input" 
                                       placeholder="Digite sua busca..."
                                       class="search-input">
                                <button class="btn primary" onclick="KC.QdrantExplorer.performSearch()">
                                    🔍 Buscar
                                </button>
                            </div>
                            
                            <!-- Filtros -->
                            <div class="search-filters">
                                <label>
                                    <input type="checkbox" id="search-high-score" checked>
                                    Apenas alta relevância (>70%)
                                </label>
                                <label>
                                    Limite: 
                                    <select id="search-limit">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="20">20</option>
                                        <option value="50">50</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <!-- Categorias -->
                        <div class="categories-section">
                            <h4>Explorar por Categoria</h4>
                            <div class="category-chips">
                                ${(stats?.categories || []).map(cat => `
                                    <button class="category-chip" 
                                            onclick="KC.QdrantExplorer.searchByCategory('${cat}')">
                                        ${cat}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Resultados -->
                        <div class="results-section" id="qdrant-results">
                            <h4>Resultados</h4>
                            <div class="results-placeholder">
                                Faça uma busca para ver os resultados
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn secondary" onclick="KC.QdrantExplorer.visualizeGraph()">
                            📊 Visualizar Grafo
                        </button>
                        <button class="btn secondary" onclick="KC.QdrantExplorer.exportResults()">
                            💾 Exportar Resultados
                        </button>
                        <button class="btn primary" onclick="this.closest('.modal-overlay').remove()">
                            Fechar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Adicionar evento de Enter na busca
            const searchInput = document.getElementById('qdrant-search-input');
            searchInput?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });

            // Focar no campo de busca
            searchInput?.focus();
        }

        /**
         * Executa busca
         */
        async performSearch() {
            const input = document.getElementById('qdrant-search-input');
            const query = input?.value?.trim();
            
            if (!query) {
                KC.ModalManager?.showError('Digite algo para buscar');
                return;
            }

            const limit = parseInt(document.getElementById('search-limit')?.value || '10');
            const highScoreOnly = document.getElementById('search-high-score')?.checked;
            
            // Mostrar loading
            const resultsDiv = document.getElementById('qdrant-results');
            resultsDiv.innerHTML = '<div class="loading">Buscando...</div>';

            // Executar busca
            const results = await this.searchPoints(query, {
                limit,
                minScore: highScoreOnly ? 0.7 : 0.3
            });

            // Renderizar resultados
            this.renderResults(results, query);
        }

        /**
         * Renderiza resultados da busca
         */
        renderResults(results, query) {
            const resultsDiv = document.getElementById('qdrant-results');
            
            if (!results || results.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="no-results">
                        Nenhum resultado encontrado para "${query}"
                    </div>
                `;
                return;
            }

            resultsDiv.innerHTML = `
                <h4>Resultados (${results.length})</h4>
                <div class="results-list">
                    ${results.map((result, index) => `
                        <div class="result-item" onclick="KC.QdrantExplorer.showPointDetails(${index})">
                            <div class="result-header">
                                <span class="result-title">
                                    ${result.payload?.source?.fileName || 'Sem nome'}
                                </span>
                                <span class="result-score">
                                    ${(result.score * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div class="result-preview">
                                ${this.highlightText(result.payload?.text || '', query)}
                            </div>
                            <div class="result-meta">
                                <span class="result-chunk">Chunk ${result.payload?.chunkIndex || 0}</span>
                                ${result.payload?.categories?.map(cat => 
                                    `<span class="category-tag">${cat}</span>`
                                ).join('') || ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        /**
         * Destaca texto da busca
         */
        highlightText(text, query) {
            const preview = text.substring(0, 200);
            const regex = new RegExp(`(${query})`, 'gi');
            return preview.replace(regex, '<mark>$1</mark>') + '...';
        }

        /**
         * Mostra detalhes de um ponto
         */
        showPointDetails(index) {
            const point = this.searchResults[index];
            if (!point) return;

            console.log('Detalhes do ponto:', point);
            
            // TODO: Implementar modal de detalhes
            alert(`Ponto ID: ${point.id}\nScore: ${point.score}\nTexto: ${point.payload?.text?.substring(0, 200)}...`);
        }

        /**
         * Visualiza grafo dos resultados
         */
        async visualizeGraph() {
            if (this.searchResults.length === 0) {
                KC.ModalManager?.showError('Faça uma busca primeiro para visualizar o grafo');
                return;
            }

            // Usar o GraphVisualization existente
            if (KC.GraphVisualization) {
                // Converter resultados para formato de grafo
                const nodes = this.searchResults.map((result, i) => ({
                    id: result.id || i,
                    label: result.payload?.source?.fileName || `Chunk ${i}`,
                    group: result.payload?.categories?.[0] || 'default',
                    value: result.score * 100
                }));

                // Criar arestas baseadas em similaridade
                const edges = [];
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        if (this.searchResults[i].score > 0.8 && this.searchResults[j].score > 0.8) {
                            edges.push({
                                from: nodes[i].id,
                                to: nodes[j].id,
                                value: Math.min(this.searchResults[i].score, this.searchResults[j].score)
                            });
                        }
                    }
                }

                KC.GraphVisualization.showGraph({ nodes, edges });
            }
        }

        /**
         * Exporta resultados
         */
        exportResults() {
            if (this.searchResults.length === 0) {
                KC.ModalManager?.showError('Nenhum resultado para exportar');
                return;
            }

            const exportData = {
                timestamp: new Date().toISOString(),
                query: document.getElementById('qdrant-search-input')?.value,
                totalResults: this.searchResults.length,
                results: this.searchResults.map(r => ({
                    score: r.score,
                    fileName: r.payload?.source?.fileName,
                    text: r.payload?.text,
                    categories: r.payload?.categories,
                    chunkIndex: r.payload?.chunkIndex
                }))
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qdrant-search-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        /**
         * Registra eventos
         */
        registerEvents() {
            // Eventos do Qdrant
            EventBus?.on('qdrant:search:completed', (data) => {
                Logger?.info('QdrantExplorer', 'Busca concluída', {
                    count: data.count
                });
            });
        }
    }

    // Registra no namespace
    KC.QdrantExplorer = new QdrantExplorer();

    // Adiciona estilos
    const style = document.createElement('style');
    style.textContent = `
        .qdrant-explorer-modal .modal-body {
            max-height: 70vh;
            overflow-y: auto;
        }

        .qdrant-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary);
        }

        .stat-label {
            color: var(--text-secondary);
            margin-top: 0.5rem;
        }

        .search-section {
            margin-bottom: 2rem;
        }

        .search-bar {
            display: flex;
            gap: 1rem;
            margin: 1rem 0;
        }

        .search-input {
            flex: 1;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 1rem;
        }

        .search-filters {
            display: flex;
            gap: 2rem;
            margin-top: 1rem;
        }

        .search-filters label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .categories-section {
            margin-bottom: 2rem;
        }

        .category-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
        }

        .category-chip {
            padding: 0.5rem 1rem;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .category-chip:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .results-section {
            margin-top: 2rem;
        }

        .results-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-top: 1rem;
        }

        .result-item {
            background: var(--bg-secondary);
            padding: 1rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .result-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transform: translateX(4px);
        }

        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .result-title {
            font-weight: bold;
            color: var(--primary);
        }

        .result-score {
            background: var(--success);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
        }

        .result-preview {
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
            line-height: 1.5;
        }

        .result-preview mark {
            background: yellow;
            padding: 0 2px;
        }

        .result-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .result-chunk {
            color: var(--text-muted);
        }

        .category-tag {
            background: var(--bg-tertiary);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }

        .no-results, .results-placeholder {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }

        .loading {
            text-align: center;
            padding: 2rem;
            color: var(--primary);
        }
    `;
    document.head.appendChild(style);

})(window);