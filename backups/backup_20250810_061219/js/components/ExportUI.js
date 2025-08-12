/**
 * ExportUI.js - Interface de Exportação de Dados
 * 
 * Componente responsável pela interface de exportação na Etapa 4
 * Integra com RAGExportManager para consolidar e exportar dados
 * 
 * @requires EventBus, AppState, RAGExportManager, ModalManager
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Events = KC.Events;

    class ExportUI {
        constructor() {
            this.exportInProgress = false;
            this.selectedFormats = new Set(['json']); // Formato padrão
            this.previewData = null;
        }

        /**
         * Inicializa o componente
         */
        initialize() {
            this._setupEventListeners();
            KC.Logger?.info('ExportUI', 'Componente inicializado');
        }

        /**
         * Configura os event listeners
         */
        _setupEventListeners() {
            // Escuta eventos de exportação
            KC.EventBus?.on(Events.EXPORT_REQUEST, (data) => {
                this.handleExportRequest(data);
            });

            // Escuta atualizações de progresso
            KC.EventBus?.on(Events.EXPORT_PROGRESS, (progress) => {
                this.updateProgress(progress);
            });
        }

        /**
         * Manipula requisição de exportação
         */
        async handleExportRequest(options = {}) {
            if (this.exportInProgress) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Exportação já em andamento. Aguarde...'
                });
                return;
            }

            try {
                this.exportInProgress = true;

                // Coleta formatos selecionados
                const formats = this._getSelectedFormats();
                if (formats.length === 0) {
                    KC.showNotification({
                        type: 'error',
                        message: 'Selecione pelo menos um formato de exportação'
                    });
                    this.exportInProgress = false;
                    return;
                }

                // Verifica se há dados para exportar
                const previewData = await KC.RAGExportManager?.consolidateData();
                if (!previewData || !previewData.documents || previewData.documents.length === 0) {
                    KC.showNotification({
                        type: 'warning',
                        message: 'Nenhum arquivo aprovado para exportação. Verifique se há arquivos com relevância >= 50%'
                    });
                    this.exportInProgress = false;
                    return;
                }

                // Mostra modal de progresso
                this._showProgressModal();

                // Executa exportação para cada formato
                for (const format of formats) {
                    await this._exportFormat(format);
                }

                // Fecha modal e mostra sucesso
                KC.ModalManager?.close();
                KC.showNotification({
                    type: 'success',
                    message: `Exportação concluída! ${formats.length} arquivo(s) gerado(s).`
                });

            } catch (error) {
                KC.Logger?.error('ExportUI', 'Erro na exportação', error);
                KC.showNotification({
                    type: 'error',
                    message: 'Erro durante a exportação. Verifique o console.'
                });
            } finally {
                this.exportInProgress = false;
            }
        }

        /**
         * Coleta formatos selecionados na UI
         */
        _getSelectedFormats() {
            const checkboxes = document.querySelectorAll('input[name="export-format"]:checked');
            const formats = Array.from(checkboxes).map(cb => cb.value);
            
            // Mapeia valores do HTML para valores do RAGExportManager
            const formatMap = {
                'json': 'qdrant',      // JSON RAG-Ready é Qdrant
                'markdown': 'markdown',
                'pdf': 'pdf',          // Será implementado futuramente
                'html': 'html'         // Será implementado futuramente
            };

            return formats.map(f => formatMap[f] || f).filter(f => 
                ['qdrant', 'json', 'markdown', 'csv'].includes(f)
            );
        }

        /**
         * Exporta em um formato específico
         */
        async _exportFormat(format) {
            try {
                KC.EventBus?.emit(Events.EXPORT_PROGRESS, {
                    format: format,
                    status: 'processing',
                    message: `Processando exportação ${format.toUpperCase()}...`
                });

                // Verifica se RAGExportManager está disponível
                if (!KC.RAGExportManager) {
                    throw new Error('RAGExportManager não está disponível');
                }

                // Usa o método correto baseado no formato
                switch(format) {
                    case 'json':
                        await KC.RAGExportManager.exportToJSON();
                        KC.EventBus?.emit(Events.EXPORT_PROGRESS, {
                            format: format,
                            status: 'completed',
                            message: `${format.toUpperCase()} exportado com sucesso!`
                        });
                        break;
                    
                    case 'csv':
                        // CSV ainda não implementado no RAGExportManager
                        // Por enquanto, vamos exportar como JSON
                        KC.Logger?.warning('ExportUI', 'CSV ainda não implementado, exportando como JSON');
                        await KC.RAGExportManager.exportToJSON();
                        KC.EventBus?.emit(Events.EXPORT_PROGRESS, {
                            format: 'json',
                            status: 'completed',
                            message: `Exportado como JSON (CSV em desenvolvimento)`
                        });
                        break;
                    
                    default:
                        throw new Error(`Formato não suportado: ${format}`);
                }

            } catch (error) {
                KC.Logger?.error('ExportUI', `Erro ao exportar ${format}`, error);
                KC.EventBus?.emit(Events.EXPORT_PROGRESS, {
                    format: format,
                    status: 'error',
                    message: `Erro ao exportar ${format.toUpperCase()}`
                });
                throw error;
            }
        }

        /**
         * Faz download do arquivo exportado
         */
        _downloadFile(data, format) {
            let content, mimeType, extension;

            switch(format) {
                case 'qdrant':
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                case 'markdown':
                    content = data;
                    mimeType = 'text/markdown';
                    extension = 'md';
                    break;
                case 'csv':
                    content = data;
                    mimeType = 'text/csv';
                    extension = 'csv';
                    break;
                default:
                    return;
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.download = `knowledge_export_${format}_${timestamp}.${extension}`;
            a.href = url;
            a.click();
            
            URL.revokeObjectURL(url);
        }

        /**
         * Mostra modal de progresso
         */
        _showProgressModal() {
            const content = `
                <div class="export-progress-modal">
                    <h3>Exportando Dados</h3>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <p class="progress-message">Iniciando exportação...</p>
                    </div>
                    <div class="export-log"></div>
                </div>
            `;

            KC.ModalManager?.open({
                title: 'Exportação em Progresso',
                content: content,
                size: 'medium',
                closeable: false
            });
        }

        /**
         * Atualiza progresso da exportação
         */
        updateProgress(progress) {
            const progressFill = document.querySelector('.progress-fill');
            const progressMessage = document.querySelector('.progress-message');
            const exportLog = document.querySelector('.export-log');

            if (progressMessage) {
                progressMessage.textContent = progress.message;
            }

            if (exportLog) {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry log-${progress.status}`;
                logEntry.innerHTML = `
                    <span class="log-icon">${this._getStatusIcon(progress.status)}</span>
                    <span class="log-message">${progress.message}</span>
                `;
                exportLog.appendChild(logEntry);
                exportLog.scrollTop = exportLog.scrollHeight;
            }

            // Atualiza barra de progresso (estimativa simples)
            if (progressFill) {
                const currentWidth = parseInt(progressFill.style.width) || 0;
                const newWidth = Math.min(currentWidth + 33, 100); // 33% por formato
                progressFill.style.width = `${newWidth}%`;
            }
        }

        /**
         * Retorna ícone baseado no status
         */
        _getStatusIcon(status) {
            const icons = {
                'processing': '⏳',
                'completed': '✅',
                'error': '❌'
            };
            return icons[status] || '📄';
        }

        /**
         * Mostra preview dos dados a serem exportados
         */
        async showExportPreview() {
            try {
                // Consolida dados para preview
                const previewData = await KC.RAGExportManager?.consolidateData();
                
                if (!previewData || !previewData.documents || previewData.documents.length === 0) {
                    KC.showNotification({
                        type: 'warning',
                        message: 'Nenhum arquivo aprovado para exportação. Verifique se há arquivos com relevância >= 50%'
                    });
                    return;
                }

                this.previewData = previewData;

                // Gera estatísticas do preview
                const stats = this._generatePreviewStats(previewData);

                // Mostra modal com preview
                const content = `
                    <div class="export-preview">
                        <h3>Preview da Exportação</h3>
                        
                        <div class="preview-stats">
                            <h4>Estatísticas</h4>
                            <ul>
                                <li><strong>Total de Documentos:</strong> ${stats.totalDocuments}</li>
                                <li><strong>Total de Chunks:</strong> ${stats.totalChunks}</li>
                                <li><strong>Categorias:</strong> ${stats.categories.join(', ')}</li>
                                <li><strong>Tipos de Análise:</strong> ${stats.analysisTypes.join(', ')}</li>
                                <li><strong>Tamanho Estimado:</strong> ${stats.estimatedSize}</li>
                            </ul>
                        </div>

                        <div class="preview-sample">
                            <h4>Amostra dos Dados</h4>
                            <pre>${JSON.stringify(stats.sample, null, 2)}</pre>
                        </div>

                        <div class="export-actions">
                            <button class="btn btn-secondary" onclick="KC.ModalManager.close()">
                                Cancelar
                            </button>
                            <button class="btn btn-primary" onclick="KC.ExportUI.confirmExport()">
                                Confirmar e Exportar
                            </button>
                        </div>
                    </div>
                `;

                KC.ModalManager?.open({
                    title: 'Preview da Exportação',
                    content: content,
                    size: 'large'
                });

            } catch (error) {
                KC.Logger?.error('ExportUI', 'Erro ao gerar preview', error);
                KC.showNotification({
                    type: 'error',
                    message: 'Erro ao gerar preview. Verifique o console.'
                });
            }
        }

        /**
         * Gera estatísticas do preview
         */
        _generatePreviewStats(data) {
            const stats = {
                totalDocuments: data.documents?.length || 0,
                totalChunks: 0,
                categories: [],
                analysisTypes: [],
                estimatedSize: '0 KB',
                sample: null
            };

            if (data.documents && data.documents.length > 0) {
                // Conta chunks
                stats.totalChunks = data.documents.reduce((acc, doc) => 
                    acc + (doc.chunks?.length || 0), 0
                );

                // Coleta categorias únicas
                const categoriesSet = new Set();
                const typesSet = new Set();

                data.documents.forEach(doc => {
                    doc.categories?.forEach(cat => categoriesSet.add(cat));
                    if (doc.analysisType) typesSet.add(doc.analysisType);
                });

                stats.categories = Array.from(categoriesSet).slice(0, 5);
                stats.analysisTypes = Array.from(typesSet);

                // Estima tamanho
                const jsonSize = JSON.stringify(data).length;
                stats.estimatedSize = this._formatBytes(jsonSize);

                // Pega amostra do primeiro documento
                stats.sample = {
                    id: data.documents[0].id,
                    name: data.documents[0].name,
                    chunks: data.documents[0].chunks?.length || 0,
                    categories: data.documents[0].categories || []
                };
            }

            return stats;
        }

        /**
         * Formata bytes para tamanho legível
         */
        _formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        /**
         * Confirma e executa exportação
         */
        confirmExport() {
            KC.ModalManager?.close();
            this.handleExportRequest();
        }

        /**
         * Limpa dados e reseta estado
         */
        reset() {
            this.exportInProgress = false;
            this.selectedFormats.clear();
            this.selectedFormats.add('json');
            this.previewData = null;
        }
    }

    // Registra o componente
    KC.ExportUI = new ExportUI();
    KC.Logger?.info('ExportUI', 'Componente registrado com sucesso');

})(window);