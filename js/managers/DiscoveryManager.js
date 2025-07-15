/**
 * DiscoveryManager.js - Gerenciador de Descoberta de Arquivos
 * 
 * Responsável por escanear diretórios, descobrir arquivos relevantes,
 * aplicar filtros e gerenciar o processo de descoberta com suporte ao Obsidian
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;
    const Events = KC.Events;
    const AppState = KC.AppState;
    const FileUtils = KC.FileUtils;

    class DiscoveryManager {
        constructor() {
            this.isScanning = false;
            this.scanAbortController = null;
            this.discoveredFiles = [];
            this.processedPaths = new Set();
            this.errors = [];
            
            // Configurações padrão
            this.defaultConfig = {
                // ORIGINAL - Preservado para rollback
                // filePatterns: ['*.md', '*.txt', '*.docx', '*.pdf'],
                // NOVO - Adiciona .gdoc
                filePatterns: ['*.md', '*.txt', '*.docx', '*.pdf', '*.gdoc'],
                directories: [],
                obsidianVaults: [],
                dateMetric: 'lastModified', // lastModified, created
                timeRange: 'all', // 1m, 3m, 6m, 1y, 2y, all
                recursive: true,
                subfolderDepth: 0, // 0 = infinito, 1-4 = níveis limitados
                // ORIGINAL - Preservado para rollback
                // excludePatterns: ['temp', 'cache', 'backup', 'node_modules', '.git'],
                // NOVO - Padrões de exclusão atualizados
                excludePatterns: ['temp', 'cache', 'backup', '.git', '.trash', '.obsidian', 'ThirdPartyNoticeText.txt', 'CHANGELOG.md', 'README.md', '.excalidraw.md', 'node_modules'],
                minFileSize: 0, // bytes
                maxFileSize: 10 * 1024 * 1024, // 10MB
                includeHidden: false
            };

            // Estatísticas de progresso
            this.stats = {
                totalDirectories: 0,
                scannedDirectories: 0,
                totalFiles: 0,
                matchedFiles: 0,
                skippedFiles: 0,
                errors: 0,
                startTime: null,
                endTime: null
            };
        }

        /**
         * Inicializa o gerenciador
         */
        initialize() {
            console.log('DiscoveryManager inicializado');
            
            // Escuta eventos de configuração
            EventBus.on(Events.STATE_CHANGED, (data) => {
                if (data.path && data.path.startsWith('configuration.discovery')) {
                    this._updateConfiguration();
                }
            });

            // Carrega configuração inicial
            this._updateConfiguration();
        }

        /**
         * Inicia processo de descoberta
         * @param {Object} options - Opções adicionais
         */
        async startDiscovery(options = {}) {
            KC.Logger.flow('DiscoveryManager', 'startDiscovery', { options });
            
            if (this.isScanning) {
                KC.Logger.warning('Descoberta já em andamento');
                return;
            }

            try {
                this.isScanning = true;
                this.scanAbortController = new AbortController();
                this.discoveredFiles = [];
                this.processedPaths.clear();
                this.errors = [];
                
                // Reset estatísticas
                this.stats = {
                    totalDirectories: 0,
                    scannedDirectories: 0,
                    totalFiles: 0,
                    matchedFiles: 0,
                    skippedFiles: 0,
                    errors: 0,
                    startTime: Date.now(),
                    endTime: null
                };

                // Emite evento de início
                EventBus.emit(Events.PROGRESS_START, {
                    type: 'discovery',
                    message: 'Iniciando descoberta de arquivos...'
                });

                // Obtém configuração
                const config = this._getConfiguration(options);
                KC.Logger.debug('Configuração obtida', { config });
                
                // Valida diretórios
                const validDirectories = await this._validateDirectories(config.directories);
                KC.Logger.info(`Diretórios validados: ${validDirectories.length}`, { validDirectories });
                
                if (validDirectories.length === 0) {
                    throw new Error('Nenhum diretório válido para escanear');
                }

                // REMOVIDO: _discoverObsidianVaults - violava regra PRIORITY ZERO (dados MOCK)
                // Detecção do Obsidian agora usa apenas File System Access API real via detectObsidianVaults()

                // Escaneia cada diretório
                for (const directory of validDirectories) {
                    if (this.scanAbortController.signal.aborted) break;
                    
                    // Busca handle no HandleManager
                    let directoryInfo = directory;
                    const handleData = KC.handleManager.getByPath(directory);
                    
                    if (handleData) {
                        KC.Logger.success(`Handle encontrado para: ${directory}`, { 
                            metadata: handleData.metadata 
                        });
                        directoryInfo = {
                            path: directory,
                            handle: handleData.handle,
                            metadata: handleData.metadata
                        };
                    } else {
                        KC.Logger.warning(`Sem handle para: ${directory} - sem acesso real`);
                    }
                    
                    await this._scanDirectory(
                        directoryInfo, 
                        config, 
                        0 // nível inicial
                    );
                }

                // Aplica filtros temporais
                if (config.timeRange !== 'all') {
                    this.discoveredFiles = this._filterByTimeRange(this.discoveredFiles, config.timeRange);
                }

                // Aplica filtro de relevância (economia de tokens)
                const relevanceThreshold = config.relevanceThreshold || 0.3; // 30% padrão
                const preFilterCount = this.discoveredFiles.length;
                this.discoveredFiles = this.discoveredFiles.filter(file => {
                    return !file.relevanceScore || file.relevanceScore >= relevanceThreshold;
                });

                KC.Logger.info(`Filtro de relevância aplicado`, {
                    threshold: relevanceThreshold,
                    before: preFilterCount,
                    after: this.discoveredFiles.length,
                    filtered: preFilterCount - this.discoveredFiles.length
                });

                // Ordena por relevância e depois por data
                this.discoveredFiles.sort((a, b) => {
                    const relevanceA = a.relevanceScore || 0;
                    const relevanceB = b.relevanceScore || 0;
                    
                    if (relevanceA !== relevanceB) {
                        return relevanceB - relevanceA; // Maior relevância primeiro
                    }
                    return b.lastModified - a.lastModified; // Depois por data
                });

                // Finaliza estatísticas
                this.stats.endTime = Date.now();
                this.stats.matchedFiles = this.discoveredFiles.length;

                // NOVO: Detecção de duplicatas após descoberta
                let finalFiles = this.discoveredFiles;
                let duplicateStats = null;
                
                if (KC.duplicateDetector && this.discoveredFiles.length > 1) {
                    KC.Logger?.info('🔍 Iniciando detecção de duplicatas...');
                    
                    try {
                        const duplicateResults = KC.duplicateDetector.analyzeDuplicates(this.discoveredFiles);
                        duplicateStats = KC.duplicateDetector.getStats();
                        
                        KC.Logger?.success(`📊 Duplicatas detectadas: ${duplicateStats.duplicates} de ${duplicateStats.total} arquivos`, {
                            exact: duplicateResults.exact.length,
                            similar: duplicateResults.similar.length,
                            version: duplicateResults.version.length,
                            removable: duplicateStats.removable,
                            confident: duplicateStats.confident
                        });
                        
                        // Adiciona metadados de duplicata aos arquivos
                        duplicateResults.groups.forEach(group => {
                            const suggestion = group.suggestion;
                            if (suggestion) {
                                // Marca arquivos para remoção
                                suggestion.remove.forEach(file => {
                                    const fileIndex = finalFiles.findIndex(f => 
                                        (f.path || f.name) === (file.path || file.name)
                                    );
                                    if (fileIndex !== -1) {
                                        finalFiles[fileIndex].isDuplicate = true;
                                        finalFiles[fileIndex].duplicateGroup = group.type;
                                        finalFiles[fileIndex].duplicateReason = suggestion.reason;
                                        finalFiles[fileIndex].duplicateConfidence = suggestion.confidence;
                                    }
                                });
                                
                                // Marca arquivo principal
                                const primaryIndex = finalFiles.findIndex(f => 
                                    (f.path || f.name) === (suggestion.keep.path || suggestion.keep.name)
                                );
                                if (primaryIndex !== -1) {
                                    finalFiles[primaryIndex].isPrimaryDuplicate = true;
                                    finalFiles[primaryIndex].duplicateGroup = group.type;
                                }
                            }
                        });
                        
                    } catch (error) {
                        KC.Logger?.error('Erro na detecção de duplicatas:', error);
                    }
                }

                // Salva no estado
                AppState.set('files', finalFiles);
                AppState.update({
                    'stats.totalFiles': this.stats.totalFiles,
                    'stats.discoveredFiles': finalFiles.length,
                    'stats.duplicateStats': duplicateStats,
                    'stats.lastUpdate': new Date().toISOString()
                });

                // Log detalhado para debug
                console.log('DiscoveryManager: === RELATÓRIO FINAL DE DESCOBERTA ===');
                console.log(`Total de arquivos verificados: ${this.stats.totalFiles}`);
                console.log(`Arquivos com extensões suportadas: ${this.stats.matchedFiles}`);
                console.log(`Arquivos descobertos (após filtros): ${finalFiles.length}`);
                console.log(`Arquivos pulados: ${this.stats.skippedFiles}`);
                console.log('==========================================');
                
                // Emite evento de conclusão
                EventBus.emit(Events.FILES_DISCOVERED, {
                    files: finalFiles,
                    stats: { ...this.stats, duplicates: duplicateStats }
                });

                EventBus.emit(Events.PROGRESS_END, {
                    type: 'discovery',
                    message: `Descoberta concluída: ${this.stats.matchedFiles} arquivos encontrados`
                });

                return {
                    success: true,
                    files: this.discoveredFiles,
                    stats: this.stats
                };

            } catch (error) {
                console.error('Erro na descoberta:', error);
                EventBus.emit(Events.ERROR_OCCURRED, {
                    type: 'discovery',
                    error: error.message
                });
                
                return {
                    success: false,
                    error: error.message,
                    stats: this.stats
                };
                
            } finally {
                this.isScanning = false;
                this.scanAbortController = null;
            }
        }

        /**
         * Para o processo de descoberta
         */
        stopDiscovery() {
            if (this.scanAbortController) {
                this.scanAbortController.abort();
                EventBus.emit(Events.PROGRESS_END, {
                    type: 'discovery',
                    message: 'Descoberta cancelada'
                });
            }
        }

        /**
         * Escaneia um diretório recursivamente
         * @private
         */
        async _scanDirectory(path, config, currentDepth) {
            KC.Logger.flow('DiscoveryManager', '_scanDirectory', { 
                path: typeof path === 'string' ? path : path.path,
                hasHandle: !!(path && path.handle),
                currentDepth 
            });
            
            // Verifica se deve parar
            if (this.scanAbortController.signal.aborted) return;

            // Verifica limite de profundidade
            if (config.subfolderDepth > 0 && currentDepth > config.subfolderDepth) {
                return;
            }

            // Extrai path string para verificação
            const pathString = typeof path === 'string' ? path : path.path || 'unknown';
            
            // Evita reprocessar
            if (this.processedPaths.has(pathString)) return;
            this.processedPaths.add(pathString);

            this.stats.totalDirectories++;
            
            try {
                // Verifica se tem handle do File System Access API
                let files = [];
                
                if (path.handle && KC.compatibility && KC.compatibility.isSupported()) {
                    // Usa File System Access API para dados reais
                    KC.Logger.success('✅ DADOS REAIS - Usando File System Access API', {
                        source: path.metadata?.source,
                        directory: pathString
                    });
                    files = await this._realDirectoryScan(path.handle, config, currentDepth);
                } else if (typeof path === 'string') {
                    // String paths não têm acesso real
                    KC.Logger.error(`❌ SEM ACESSO REAL - Path string: ${path}`);
                    KC.Logger.info('💡 Use "Localizar Pasta" para acesso real aos arquivos');
                    files = [];
                } else {
                    KC.Logger.error('❓ TIPO DESCONHECIDO', { path });
                    files = [];
                }
                
                this.stats.scannedDirectories++;
                
                // Processa cada arquivo
                for (const file of files) {
                    if (this.scanAbortController.signal.aborted) break;
                    
                    // Se é um arquivo do _realDirectoryScan, já tem metadados
                    if (file.preview !== undefined) {
                        // Arquivo já processado com metadados
                        this.discoveredFiles.push(file);
                        this.stats.matchedFiles++;
                    } else {
                        // Arquivo precisa ser processado
                        await this._processFile(file, config);
                    }
                }

                // Atualiza progresso
                EventBus.emit(Events.PROGRESS_UPDATE, {
                    type: 'discovery',
                    current: this.stats.scannedDirectories,
                    total: this.stats.totalDirectories,
                    message: `Escaneando: ${pathString}`
                });

            } catch (error) {
                this.stats.errors++;
                this.errors.push({
                    path: pathString,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                console.error(`Erro ao escanear ${pathString}:`, error);
            }
        }

        /**
         * Processa um arquivo encontrado
         * @private
         */
        async _processFile(file, config) {
            this.stats.totalFiles++;

            try {
                // Verifica se arquivo é suportado
                if (!FileUtils.isFileSupported(file.name)) {
                    this.stats.skippedFiles++;
                    return;
                }

                // Verifica tamanho
                if (config.minFileSize > 0 && file.size < config.minFileSize) {
                    this.stats.skippedFiles++;
                    return;
                }

                if (config.maxFileSize > 0 && file.size > config.maxFileSize) {
                    this.stats.skippedFiles++;
                    return;
                }

                // Verifica padrões de exclusão
                const shouldExclude = config.excludePatterns.some(pattern => {
                    const regex = new RegExp(pattern, 'i');
                    return regex.test(file.name) || regex.test(file.path);
                });

                if (shouldExclude) {
                    this.stats.skippedFiles++;
                    return;
                }

                // Extrai metadados
                const metadata = await FileUtils.extractMetadata(file);
                
                // Adiciona informações adicionais
                metadata.id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                metadata.status = 'pending';
                metadata.relevanceScore = 0;
                metadata.category = null;
                metadata.analysis = null;
                metadata.discovered = true;
                metadata.discoveredAt = new Date().toISOString();

                // Adiciona à lista
                this.discoveredFiles.push(metadata);

            } catch (error) {
                this.stats.errors++;
                console.error(`Erro ao processar arquivo ${file.name}:`, error);
            }
        }

        // REMOVIDO: _discoverObsidianVaults método que continha dados MOCK
        // Este método violava a REGRA DE PRIORIDADE ZERO do CLAUDE.md
        // Detecção do Obsidian agora usa apenas File System Access API real

        /**
         * Valida diretórios antes de escanear
         * @private
         */
        async _validateDirectories(directories) {
            const valid = [];
            
            for (const dir of directories) {
                const validation = FileUtils.validatePath(dir);
                
                if (validation.isValid) {
                    valid.push(validation.normalized);
                } else {
                    this.errors.push({
                        path: dir,
                        error: validation.errors.join(', '),
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            return valid;
        }

        /**
         * Filtra arquivos por período
         * @private
         */
        _filterByTimeRange(files, timeRange) {
            const now = Date.now();
            const ranges = {
                '1m': 30 * 24 * 60 * 60 * 1000,      // 30 dias
                '3m': 90 * 24 * 60 * 60 * 1000,      // 90 dias
                '6m': 180 * 24 * 60 * 60 * 1000,     // 180 dias
                '1y': 365 * 24 * 60 * 60 * 1000,     // 365 dias
                '2y': 730 * 24 * 60 * 60 * 1000      // 730 dias
            };

            const cutoff = now - (ranges[timeRange] || 0);
            
            return files.filter(file => {
                const fileTime = file.lastModified || 0;
                return fileTime >= cutoff;
            });
        }

        /**
         * Obtém configuração mesclada
         * @private
         */
        _getConfiguration(overrides = {}) {
            const saved = AppState.get('configuration.discovery') || {};
            return {
                ...this.defaultConfig,
                ...saved,
                ...overrides
            };
        }

        /**
         * Atualiza configuração do estado
         * @private
         */
        _updateConfiguration() {
            const config = AppState.get('configuration.discovery') || {};
            Object.assign(this.defaultConfig, config);
        }

        /**
         * Escaneia diretório usando File System Access API
         * @private
         */
        async _realDirectoryScan(directoryHandle, configParam, currentDepth = 0) {
            // Verifica compatibilidade
            if (!KC.compatibility || !KC.compatibility.isSupported()) {
                console.error('File System Access API não suportada - use Chrome/Edge 86+');
                return [];
            }
            
            // Emite feedback visual detalhado
            EventBus.emit(Events.PROGRESS_UPDATE, {
                type: 'discovery',
                current: this.stats.scannedDirectories,
                total: this.stats.totalDirectories,
                message: `📁 Acessando diretório real...`,
                details: directoryHandle.name
            });

            const files = [];
            // Usa as extensões configuradas do parâmetro ou padrão
            const filePatterns = configParam.filePatterns || ['*.md', '*.txt', '*.docx', '*.pdf', '*.gdoc'];
            const supportedExtensions = filePatterns.map(pattern => 
                pattern.replace('*', '').toLowerCase()
            );
            console.log('DiscoveryManager: Extensões suportadas:', supportedExtensions);
            
            try {
                // Itera sobre os itens do diretório
                for await (const entry of directoryHandle.values()) {
                    // Verifica se deve parar
                    if (this.scanAbortController.signal.aborted) break;
                    
                    if (entry.kind === 'file') {
                        const file = await entry.getFile();
                        const extension = '.' + file.name.split('.').pop().toLowerCase();
                        
                        // SEMPRE incrementa totalFiles (mesmo que não seja suportado)
                        this.stats.totalFiles++;
                        
                        // Verifica se é um tipo de arquivo suportado
                        if (supportedExtensions.includes(extension)) {
                            this.stats.matchedFiles++;
                            // SPRINT 1.3.1: DESATIVADO - Sem filtros automáticos
                            // Aplica filtros de data e tamanho
                            // if (this._passesFilters(file, config)) {
                                const metadata = await this._extractRealMetadata(file, entry, directoryHandle.name);
                                files.push(metadata);
                                
                                // Atualiza estatísticas
                                // this.stats.totalFiles++; // JÁ INCREMENTADO ACIMA
                                
                                // Feedback de progresso
                                if (files.length % 5 === 0) {
                                    EventBus.emit(Events.PROGRESS_UPDATE, {
                                        type: 'discovery',
                                        current: this.stats.scannedDirectories,
                                        total: this.stats.totalDirectories,
                                        message: `📄 Processando arquivos...`,
                                        details: `${files.length} arquivos encontrados`
                                    });
                                }
                            // } else {
                            //     this.stats.skippedFiles++;
                            // }
                        }
                        
                    } else if (entry.kind === 'directory') {
                        // Scanning recursivo se configurado
                        const shouldRecurse = configParam.subfolderDepth === 0 || currentDepth < configParam.subfolderDepth;
                        
                        if (shouldRecurse) {
                            try {
                                const subDirHandle = await directoryHandle.getDirectoryHandle(entry.name);
                                const subFiles = await this._realDirectoryScan(subDirHandle, configParam, currentDepth + 1);
                                files.push(...subFiles);
                            } catch (error) {
                                console.warn(`Erro ao acessar subdiretório ${entry.name}:`, error);
                                this.stats.errors++;
                            }
                        }
                    }
                }
                
                // Feedback final do diretório
                EventBus.emit(Events.PROGRESS_UPDATE, {
                    type: 'discovery',
                    current: this.stats.scannedDirectories,
                    total: this.stats.totalDirectories,
                    message: `✅ Diretório processado`,
                    details: `${files.length} arquivos válidos encontrados`
                });
                
            } catch (error) {
                console.error('Erro ao escanear diretório:', error);
                this.stats.errors++;
                
                EventBus.emit(Events.PROGRESS_UPDATE, {
                    type: 'discovery',
                    current: this.stats.scannedDirectories,
                    total: this.stats.totalDirectories,
                    message: `❌ Erro no diretório`,
                    details: error.message
                });
            }
            
            return files;
        }

        /**
         * Extrai metadados reais de um arquivo
         * @private
         */
        async _extractRealMetadata(file, fileHandle, directoryPath) {
            const metadata = {
                id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                size: file.size,
                lastModified: new Date(file.lastModified),
                type: file.type,
                extension: '.' + file.name.split('.').pop().toLowerCase(),
                path: `${directoryPath}/${file.name}`,
                relativePath: file.name,
                handle: fileHandle, // Para acesso futuro se necessário
                status: 'pending',
                relevanceScore: 0,
                category: null,
                analysis: null,
                discovered: true,
                discoveredAt: new Date().toISOString()
            };

            // Extrai conteúdo para análise (com limite de segurança)
            if (file.size < 1024 * 1024) { // Máximo 1MB
                try {
                    const content = await file.text();
                    metadata.content = content;
                    
                    // NOVO: Gera preview inteligente usando PreviewUtils (economia de tokens)
                    if (KC.PreviewUtils) {
                        const smartPreview = KC.PreviewUtils.extractSmartPreview(content);
                        metadata.smartPreview = smartPreview;
                        
                        // Gera preview de texto combinado
                        metadata.preview = KC.PreviewUtils.getTextPreview(smartPreview);
                        
                        // Calcula relevância baseada no preview
                        const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
                        metadata.relevanceScore = KC.PreviewUtils.calculatePreviewRelevance(smartPreview, keywords);
                        
                        console.log(`Preview extraído para ${file.name}:`, {
                            preview: metadata.preview.substring(0, 100) + '...',
                            structure: smartPreview.structure
                        });
                    }
                    
                    // Fallback se PreviewUtils não estiver disponível
                    if (!KC.PreviewUtils && KC.FileUtils) {
                        metadata.preview = KC.FileUtils.extractSmartPreview(content);
                    }
                    
                } catch (error) {
                    console.warn(`Erro ao ler conteúdo de ${file.name}:`, error);
                    metadata.content = '';
                    metadata.preview = null;
                    metadata.error = error.message;
                }
            } else {
                metadata.content = '';
                metadata.preview = null;
                metadata.warning = 'Arquivo muito grande para leitura automática';
            }

            return metadata;
        }

        /**
         * SPRINT 1.3.1: DESATIVADO - Método de filtros automáticos comentado
         * Verifica se um arquivo passa pelos filtros configurados
         * @private
         */
        // _passesFilters(file, config) {
        //     // Filtro de tamanho mínimo
        //     if (config.minFileSize && file.size < config.minFileSize) {
        //         return false;
        //     }
        //
        //     // Filtro de data
        //     if (config.timeRange && config.timeRange !== 'all') {
        //         const fileDate = new Date(file.lastModified);
        //         const now = new Date();
        //         
        //         let cutoffDate;
        //         switch (config.timeRange) {
        //             case '1m':
        //                 cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        //                 break;
        //             case '3m':
        //                 cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        //                 break;
        //             case '6m':
        //                 cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        //                 break;
        //             case '1y':
        //                 cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        //                 break;
        //             case '2y':
        //                 cutoffDate = new Date(now.setFullYear(now.getFullYear() - 2));
        //                 break;
        //             default:
        //                 return true;
        //         }
        //         
        //         if (fileDate < cutoffDate) {
        //             return false;
        //         }
        //     }
        //
        //     return true;
        // }

        // REMOVIDO: _fallbackDirectoryScan - sem simulações

        /**
         * Detecta vaults do Obsidian MANUALMENTE - Usuário seleciona diretório
         */
        async detectObsidianVaults() {
            // Verifica compatibilidade
            if (!KC.compatibility || !KC.compatibility.isSupported()) {
                return this._fallbackObsidianDetection();
            }

            try {
                // Mostra modal explicativo antes de solicitar acesso
                console.log('Mostrando modal de permissão...');
                const userConsent = await this._showObsidianAccessModal();
                console.log('Resposta do usuário:', userConsent);
                
                if (!userConsent) {
                    console.log('Usuário cancelou o acesso');
                    return [];
                }

                // Solicita acesso ao diretório do usuário MANUALMENTE
                console.log('Solicitando seleção MANUAL do diretório...');
                const accessResult = await KC.compatibility.requestDirectoryAccess({
                    id: 'obsidian-manual-selection',
                    mode: 'read',
                    startIn: 'documents'
                });
                console.log('Resultado do acesso:', accessResult);

                if (!accessResult.success) {
                    if (accessResult.error !== 'cancelled') {
                        if (KC.showNotification) {
                            KC.showNotification({
                                type: 'error',
                                message: 'Erro ao acessar diretório selecionado: ' + accessResult.message
                            });
                        } else {
                            console.error('Erro ao acessar diretório selecionado:', accessResult.message);
                        }
                    }
                    return [];
                }

                // Procura por vaults Obsidian no diretório SELECIONADO MANUALMENTE
                console.log('Buscando vaults do Obsidian no diretório selecionado...');
                const vaults = await this._searchObsidianVaults(accessResult.handle);
                console.log('Vaults encontrados:', vaults);
                
                if (vaults.length > 0) {
                    if (KC.showNotification) {
                        KC.showNotification({
                            type: 'success',
                            message: `${vaults.length} vault(s) do Obsidian encontrado(s)`,
                            duration: 3000
                        });
                    } else {
                        console.log(`${vaults.length} vault(s) do Obsidian encontrado(s)`);
                    }
                } else {
                    if (KC.showNotification) {
                        KC.showNotification({
                            type: 'info',
                            message: 'Nenhum vault do Obsidian encontrado neste diretório',
                            duration: 3000
                        });
                    } else {
                        console.log('Nenhum vault do Obsidian encontrado neste diretório');
                    }
                }
                
                return vaults;
                
            } catch (error) {
                console.error('Erro ao detectar vaults do Obsidian:', error);
                if (KC.showNotification) {
                    KC.showNotification({
                        type: 'error',
                        message: 'Erro na detecção do Obsidian: ' + error.message
                    });
                } else {
                    console.error('Erro na detecção do Obsidian:', error.message);
                }
                return [];
            }
        }

        /**
         * Busca recursivamente por vaults Obsidian
         * @private
         */
        async _searchObsidianVaults(directoryHandle, maxDepth = 3, currentDepth = 0) {
            const vaults = [];
            
            if (currentDepth >= maxDepth) return vaults;

            try {
                // PRIMEIRO: Verifica se o diretório atual é um vault Obsidian
                const isCurrentVault = await this._isObsidianVault(directoryHandle);
                if (isCurrentVault) {
                    const vaultInfo = await this._extractVaultInfo(directoryHandle, directoryHandle.name);
                    vaults.push(vaultInfo);
                    KC.Logger.success(`✅ Vault encontrado: ${directoryHandle.name}`);
                }
                
                // SEGUNDO: Busca em subdiretórios
                for await (const entry of directoryHandle.values()) {
                    if (entry.kind === 'directory') {
                        const subDirHandle = await directoryHandle.getDirectoryHandle(entry.name);
                        
                        // Verifica se é um vault Obsidian (procura por .obsidian/)
                        const isVault = await this._isObsidianVault(subDirHandle);
                        
                        if (isVault) {
                            const vaultInfo = await this._extractVaultInfo(subDirHandle, entry.name);
                            vaults.push(vaultInfo);
                        } else {
                            // Busca recursivamente em subdiretórios
                            const subVaults = await this._searchObsidianVaults(
                                subDirHandle, 
                                maxDepth, 
                                currentDepth + 1
                            );
                            vaults.push(...subVaults);
                        }
                    }
                }
            } catch (error) {
                console.warn('Erro ao buscar vaults em diretório:', error);
            }

            return vaults;
        }

        /**
         * Verifica se um diretório é um vault Obsidian
         * @private
         */
        async _isObsidianVault(directoryHandle) {
            try {
                // Procura pela pasta .obsidian
                KC.Logger.debug(`Verificando se ${directoryHandle.name} é vault Obsidian...`);
                await directoryHandle.getDirectoryHandle('.obsidian');
                KC.Logger.success(`✅ ${directoryHandle.name} é um vault Obsidian`);
                return true;
            } catch (error) {
                KC.Logger.debug(`❌ ${directoryHandle.name} NÃO é um vault Obsidian`);
                return false;
            }
        }

        /**
         * Extrai informações detalhadas de um vault
         * @private
         */
        async _extractVaultInfo(vaultHandle, vaultName) {
            const vaultInfo = {
                name: vaultName,
                path: vaultName,
                handle: vaultHandle,
                isOpen: false,
                lastAccess: Date.now(),
                fileCount: 0,
                totalSize: 0
            };

            try {
                // Conta arquivos .md no vault
                let fileCount = 0;
                let totalSize = 0;

                for await (const entry of vaultHandle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                        try {
                            const file = await entry.getFile();
                            fileCount++;
                            totalSize += file.size;
                        } catch (error) {
                            // Ignora erros de arquivos individuais
                        }
                    }
                }

                vaultInfo.fileCount = fileCount;
                vaultInfo.totalSize = totalSize;

                // Tenta ler configurações do vault se disponível
                try {
                    const obsidianDir = await vaultHandle.getDirectoryHandle('.obsidian');
                    const configFile = await obsidianDir.getFileHandle('app.json');
                    const config = await configFile.getFile();
                    const configData = JSON.parse(await config.text());
                    
                    if (configData.vaultName) {
                        vaultInfo.name = configData.vaultName;
                    }
                } catch (error) {
                    // Configuração não disponível, usa nome do diretório
                }

            } catch (error) {
                console.warn('Erro ao extrair informações do vault:', error);
            }

            return vaultInfo;
        }

        /**
         * Mostra modal explicativo para acesso ao Obsidian
         * @private
         */
        async _showObsidianAccessModal() {
            return new Promise((resolve) => {
                const modalContent = `
                    <div class="obsidian-access-modal">
                        <div class="modal-header">
                            <h2>🔍 Detectar Vaults do Obsidian</h2>
                        </div>
                        <div class="modal-body">
                            <p>Para detectar seus vaults do Obsidian, o sistema precisa acessar seus diretórios.</p>
                            
                            <div class="access-explanation">
                                <h3>O que será feito:</h3>
                                <ul>
                                    <li>✅ Buscar pastas com estrutura do Obsidian (.obsidian/)</li>
                                    <li>✅ Contar arquivos .md em cada vault</li>
                                    <li>✅ Ler configurações básicas do vault</li>
                                    <li>❌ <strong>Nunca</strong> modificar seus arquivos</li>
                                </ul>
                            </div>
                            
                            <div class="security-note">
                                <strong>🔒 Privacidade:</strong> Todos os dados permanecem no seu navegador.
                                Nada é enviado para servidores externos.
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="window.resolveObsidianModal(false)">
                                Cancelar
                            </button>
                            <button class="btn btn-primary" onclick="window.resolveObsidianModal(true)">
                                Permitir Acesso
                            </button>
                        </div>
                    </div>
                `;

                // Função global temporária para resolver o modal
                window.resolveObsidianModal = (consent) => {
                    console.log('resolveObsidianModal chamado com:', consent);
                    if (KC.ModalManager) {
                        KC.ModalManager.closeModal('obsidian-access');
                    }
                    delete window.resolveObsidianModal;
                    console.log('Resolvendo promise com:', consent);
                    resolve(consent);
                };

                if (KC.ModalManager) {
                    console.log('Usando KC.ModalManager para mostrar modal');
                    KC.ModalManager.showModal('obsidian-access', modalContent);
                } else {
                    console.log('KC.ModalManager não disponível, usando fallback');
                    // Fallback simples
                    resolve(confirm('Permitir acesso aos diretórios para detectar vaults do Obsidian?'));
                }
            });
        }

        /**
         * Fallback para navegadores incompatíveis
         * @private
         */
        _fallbackObsidianDetection() {
            if (KC.showNotification) {
                KC.showNotification({
                    type: 'warning',
                    message: 'Detecção automática do Obsidian requer Chrome/Edge 86+',
                    details: 'Use "Adicionar Locais" para inserir caminhos manualmente'
                });
            } else {
                console.warn('Detecção automática do Obsidian requer Chrome/Edge 86+');
            }
            return [];
        }

        // REMOVIDO: _simulateObsidianJson - sem simulações

        /**
         * Obtém estatísticas atuais
         */
        getStats() {
            return { ...this.stats };
        }

        /**
         * Obtém erros encontrados
         */
        getErrors() {
            return [...this.errors];
        }

        /**
         * Limpa dados de descoberta
         */
        clearDiscovery() {
            this.discoveredFiles = [];
            this.processedPaths.clear();
            this.errors = [];
            this.stats = {
                totalDirectories: 0,
                scannedDirectories: 0,
                totalFiles: 0,
                matchedFiles: 0,
                skippedFiles: 0,
                errors: 0,
                startTime: null,
                endTime: null
            };
            
            AppState.set('files', []);
            EventBus.emit(Events.FILES_DISCOVERED, {
                files: [],
                stats: this.stats
            });
        }

        /**
         * Adiciona diretório à lista
         * @param {string} path - Caminho do diretório
         */
        addDirectory(path) {
            // Validação básica
            if (!path || typeof path !== 'string' || !path.trim()) {
                console.warn('Caminho inválido fornecido:', path);
                return false;
            }
            
            const cleanPath = path.trim();
            
            // Valida se o caminho é válido
            if (cleanPath.length < 2) {
                console.warn('Caminho muito curto:', cleanPath);
                return false;
            }
            
            const directories = AppState.get('configuration.discovery.directories') || [];
            
            if (!directories.includes(cleanPath)) {
                directories.push(cleanPath);
                AppState.set('configuration.discovery.directories', directories);
                console.log('Diretório adicionado:', cleanPath);
                return true;
            }
            
            console.log('Diretório já existe:', cleanPath);
            return false;
        }

        /**
         * Remove diretório da lista
         * @param {string} path - Caminho do diretório
         */
        removeDirectory(path) {
            const directories = AppState.get('configuration.discovery.directories') || [];
            const index = directories.indexOf(path);
            
            if (index > -1) {
                directories.splice(index, 1);
                AppState.set('configuration.discovery.directories', directories);
                return true;
            }
            
            return false;
        }

        /**
         * Remove todos os diretórios configurados
         */
        clearAllDirectories() {
            AppState.set('configuration.discovery.directories', []);
            KC.Logger.info('Todos os diretórios foram removidos');
            return true;
        }
    }

    // Cria instância singleton
    KC.DiscoveryManager = new DiscoveryManager();

    // Adiciona eventos relacionados à descoberta
    KC.Events = {
        ...KC.Events,
        DISCOVERY_STARTED: 'discovery:started',
        DISCOVERY_PROGRESS: 'discovery:progress',
        DISCOVERY_COMPLETED: 'discovery:completed',
        DISCOVERY_CANCELLED: 'discovery:cancelled',
        DISCOVERY_ERROR: 'discovery:error',
        OBSIDIAN_VAULTS_FOUND: 'discovery:obsidian:found'
    };

})(window);