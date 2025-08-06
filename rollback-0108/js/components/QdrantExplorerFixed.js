/**
 * QdrantExplorerFixed.js - Versão corrigida do Qdrant Explorer
 * 
 * Interface simplificada e funcional para explorar dados no Qdrant
 * com tratamento de erros robusto.
 * 
 * @aidev-note qdrant-explorer-fixed; versão estável do explorer
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const { Logger, EventBus } = KC;

    class QdrantExplorerFixed {
        constructor() {
            this.isConnected = false;
            this.stats = null;
        }

        /**
         * Verifica conexão com Qdrant
         */
        async checkConnection() {
            try {
                this.isConnected = await KC.QdrantService?.checkConnection();
                return this.isConnected;
            } catch (error) {
                console.error('Erro ao verificar conexão:', error);
                return false;
            }
        }

        /**
         * Obtém estatísticas da collection
         */
        async getStats() {
            try {
                const info = await KC.QdrantService?.getCollectionInfo();
                
                return {
                    totalPoints: info?.points_count || 0,
                    indexedSize: info?.indexed_vectors_count || 0,
                    status: info?.status || 'unknown',
                    vectorSize: info?.config?.params?.vectors?.size || 768
                };
            } catch (error) {
                console.error('Erro ao obter stats:', error);
                return {
                    totalPoints: 0,
                    indexedSize: 0,
                    status: 'error',
                    vectorSize: 0
                };
            }
        }

        /**
         * Busca pontos por texto
         */
        async searchByText(query, options = {}) {
            try {
                const results = await KC.QdrantService?.searchByText(query, {
                    limit: options.limit || 10,
                    minScore: options.minScore || 0.5
                });
                
                return results || [];
            } catch (error) {
                console.error('Erro na busca:', error);
                return [];
            }
        }

        /**
         * Obtém amostras aleatórias de pontos
         */
        async getSamplePoints(limit = 10) {
            try {
                // Buscar pontos diretamente sem filtro
                const response = await KC.QdrantService?.scrollPoints({
                    limit: limit,
                    with_payload: true,
                    with_vector: false
                });
                
                return response?.points || [];
            } catch (error) {
                console.error('Erro ao obter pontos de amostra:', error);
                return [];
            }
        }

        /**
         * Carrega todos os pontos com paginação
         */
        async loadAllPoints(offset = null, allPoints = []) {
            try {
                const response = await KC.QdrantService?.scrollPoints({
                    limit: 100,
                    offset: offset,
                    with_payload: true,
                    with_vector: false
                });
                
                if (response?.points) {
                    allPoints.push(...response.points);
                    
                    // Se houver mais pontos, continuar carregando
                    if (response.next_page_offset) {
                        return this.loadAllPoints(response.next_page_offset, allPoints);
                    }
                }
                
                return allPoints;
            } catch (error) {
                console.error('Erro ao carregar todos os pontos:', error);
                return allPoints;
            }
        }

        /**
         * Obtém estatísticas detalhadas por categoria
         */
        async getCategoryStats() {
            try {
                const allPoints = await KC.QdrantService?.scrollPoints({
                    limit: 100,
                    with_payload: true, // Pegar todo o payload para debug
                    with_vector: false
                });

                const stats = {
                    byCategory: {},
                    byAnalysisType: {},
                    byRelevance: {
                        high: 0,
                        medium: 0,
                        low: 0
                    }
                };

                allPoints?.points?.forEach(point => {
                    // Por categoria - verificar em metadata primeiro, depois em payload direto
                    const categories = point.payload?.metadata?.categories || 
                                     point.payload?.categories || 
                                     ['Sem categoria'];
                    categories.forEach(cat => {
                        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
                    });

                    // Por tipo de análise
                    const analysisType = point.payload?.metadata?.analysisType || 
                                       point.payload?.analysisType || 
                                       'Não analisado';
                    stats.byAnalysisType[analysisType] = (stats.byAnalysisType[analysisType] || 0) + 1;

                    // Por relevância
                    const relevance = point.payload?.metadata?.relevanceScore || 
                                    point.payload?.relevanceScore || 0;
                    if (relevance >= 70) stats.byRelevance.high++;
                    else if (relevance >= 30) stats.byRelevance.medium++;
                    else stats.byRelevance.low++;
                });

                return stats;
            } catch (error) {
                console.error('Erro ao obter estatísticas por categoria:', error);
                return null;
            }
        }

        /**
         * Abre modal do explorer
         */
        async showModal() {
            // Verificar conexão
            const connected = await this.checkConnection();
            if (!connected) {
                alert('Não foi possível conectar ao Qdrant. Verifique se o servidor está rodando.');
                return;
            }

            // Obter stats e dados
            const stats = await this.getStats();
            // Carregar mais pontos inicialmente (50 em vez de 5)
            const samplePoints = await this.getSamplePoints(50);
            const categoryStats = await this.getCategoryStats();

            // Remover modal anterior
            document.getElementById('qdrant-explorer-modal')?.remove();

            // Criar modal
            const modal = document.createElement('div');
            modal.id = 'qdrant-explorer-modal';
            modal.className = 'qdrant-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            modal.innerHTML = `
                <div class="modal-content" style="
                    background: #1a1a1a;
                    border: 2px solid #0ff;
                    border-radius: 12px;
                    padding: 30px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #fff;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #0ff;">🔍 Qdrant Explorer</h2>
                        <button onclick="this.closest('.qdrant-modal').remove()" style="
                            background: #ff0000;
                            color: #fff;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                        ">✖</button>
                    </div>
                    
                    <!-- Stats -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
                        <div style="background: #0a0a0a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #0ff; font-size: 24px; font-weight: bold;">${stats.totalPoints}</div>
                            <div style="color: #aaa; font-size: 14px;">Total Points</div>
                        </div>
                        <div style="background: #0a0a0a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #0f0; font-size: 24px; font-weight: bold;">${stats.indexedSize}</div>
                            <div style="color: #aaa; font-size: 14px;">Indexed</div>
                        </div>
                        <div style="background: #0a0a0a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #ff0; font-size: 24px; font-weight: bold;">${stats.status}</div>
                            <div style="color: #aaa; font-size: 14px;">Status</div>
                        </div>
                        <div style="background: #0a0a0a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #f0f; font-size: 24px; font-weight: bold;">${stats.vectorSize}</div>
                            <div style="color: #aaa; font-size: 14px;">Vector Size</div>
                        </div>
                    </div>
                    
                    <!-- Search -->
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #0ff;">Search</h3>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="qdrant-search-input" placeholder="Enter search query..." style="
                                flex: 1;
                                padding: 10px;
                                background: #0a0a0a;
                                border: 1px solid #333;
                                border-radius: 5px;
                                color: #fff;
                                font-size: 16px;
                            ">
                            <button onclick="KC.QdrantExplorerFixed.performSearch()" style="
                                background: #0ff;
                                color: #000;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 5px;
                                cursor: pointer;
                                font-weight: bold;
                            ">Search</button>
                        </div>
                    </div>
                    
                    <!-- Category Stats -->
                    ${categoryStats ? `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #0ff;">📊 Distribuição dos Dados</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            ${Object.entries(categoryStats.byCategory).map(([cat, count]) => `
                                <div style="background: #0a0a0a; padding: 10px; border-radius: 5px; border-left: 3px solid #0ff;">
                                    <div style="color: #fff;">${cat}</div>
                                    <div style="color: #0ff; font-size: 20px; font-weight: bold;">${count} arquivos</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Sample Points -->
                    ${samplePoints.length > 0 ? `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #0ff;">📁 Todos os Arquivos no Qdrant (${samplePoints.length} de ${stats.totalPoints})</h3>
                        <div style="background: #0a0a0a; padding: 15px; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                            ${samplePoints.map((point, idx) => `
                                <div style="
                                    padding: 10px;
                                    margin-bottom: 10px;
                                    border-bottom: 1px solid #333;
                                ">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <strong style="color: #0ff;">${point.payload?.fileName || point.payload?.filename || 'Sem nome'}</strong>
                                        <span style="color: #0f0;">Relevância: ${point.payload?.metadata?.relevanceScore || point.payload?.relevanceScore || 0}%</span>
                                    </div>
                                    <div style="color: #aaa; font-size: 14px;">
                                        Categorias: ${(point.payload?.metadata?.categories || point.payload?.categories || []).join(', ') || 'Sem categoria'}
                                    </div>
                                    <div style="color: #666; font-size: 12px; margin-top: 5px;">
                                        ${(point.payload?.content || '').substring(0, 100)}...
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${samplePoints.length < stats.totalPoints ? `
                        <div style="text-align: center; margin-top: 15px;">
                            <button id="load-all-btn" onclick="KC.QdrantExplorerFixed.loadAllData()" style="
                                background: #0f0;
                                color: #000;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 5px;
                                cursor: pointer;
                                font-weight: bold;
                            ">Carregar Todos os ${stats.totalPoints} Arquivos</button>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Search Results -->
                    <div id="qdrant-results" style="
                        background: #0a0a0a;
                        padding: 20px;
                        border-radius: 8px;
                        min-height: 100px;
                    ">
                        <h3 style="color: #0ff; margin-top: 0;">🔍 Resultados da Busca</h3>
                        <p style="color: #666; text-align: center;">Faça uma busca para ver resultados específicos</p>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Enter key para buscar
            document.getElementById('qdrant-search-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        /**
         * Carrega todos os dados do Qdrant
         */
        async loadAllData() {
            const btn = document.getElementById('load-all-btn');
            if (!btn) return;
            
            // Desabilitar botão e mostrar loading
            btn.disabled = true;
            btn.textContent = 'Carregando...';
            
            try {
                // Carregar todos os pontos
                const allPoints = await this.loadAllPoints();
                
                // Renderizar na interface
                const container = btn.closest('div').parentElement.querySelector('div');
                if (container && allPoints.length > 0) {
                    container.innerHTML = allPoints.map((point, idx) => `
                        <div style="
                            padding: 10px;
                            margin-bottom: 10px;
                            border-bottom: 1px solid #333;
                        ">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <strong style="color: #0ff;">${point.payload?.fileName || point.payload?.filename || 'Sem nome'}</strong>
                                <span style="color: #0f0;">Relevância: ${point.payload?.metadata?.relevanceScore || point.payload?.relevanceScore || 0}%</span>
                            </div>
                            <div style="color: #aaa; font-size: 14px;">
                                Categorias: ${(point.payload?.metadata?.categories || point.payload?.categories || []).join(', ') || 'Sem categoria'}
                            </div>
                            <div style="color: #666; font-size: 12px; margin-top: 5px;">
                                ${(point.payload?.content || '').substring(0, 100)}...
                            </div>
                        </div>
                    `).join('');
                    
                    // Remover botão após carregar
                    btn.parentElement.remove();
                }
            } catch (error) {
                console.error('Erro ao carregar todos os dados:', error);
                btn.textContent = 'Erro ao carregar - Tentar novamente';
                btn.disabled = false;
            }
        }

        /**
         * Executa busca
         */
        async performSearch() {
            const input = document.getElementById('qdrant-search-input');
            const resultsDiv = document.getElementById('qdrant-results');
            const query = input.value.trim();

            if (!query) {
                resultsDiv.innerHTML = '<p style="color: #f00; text-align: center;">Please enter a search query</p>';
                return;
            }

            resultsDiv.innerHTML = '<p style="color: #0ff; text-align: center;">Searching...</p>';

            try {
                const results = await this.searchByText(query);

                if (results.length === 0) {
                    resultsDiv.innerHTML = '<p style="color: #ff0; text-align: center;">No results found</p>';
                    return;
                }

                let html = `<h4 style="color: #0ff; margin-top: 0;">Found ${results.length} results:</h4>`;
                
                results.forEach((result, idx) => {
                    const score = result.score ? result.score.toFixed(3) : 'N/A';
                    const fileName = result.payload?.fileName || 'Unknown';
                    const preview = result.payload?.content?.substring(0, 150) || 'No preview available';
                    
                    html += `
                        <div style="
                            background: #1a1a1a;
                            padding: 15px;
                            margin-bottom: 10px;
                            border-radius: 8px;
                            border-left: 3px solid #0ff;
                        ">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <strong style="color: #0ff;">${idx + 1}. ${fileName}</strong>
                                <span style="color: #0f0;">Score: ${score}</span>
                            </div>
                            <div style="color: #aaa; font-size: 14px;">${preview}...</div>
                        </div>
                    `;
                });

                resultsDiv.innerHTML = html;

            } catch (error) {
                resultsDiv.innerHTML = `<p style="color: #f00; text-align: center;">Error: ${error.message}</p>`;
            }
        }
    }

    // Criar instância e registrar
    const explorerFixed = new QdrantExplorerFixed();
    KC.QdrantExplorerFixed = explorerFixed;

    // Substituir o explorer original
    KC.QdrantExplorer = explorerFixed;
    KC.QdrantExplorer.showExplorerModal = () => explorerFixed.showModal();

    console.log('✅ QdrantExplorerFixed carregado e registrado');

})(window);