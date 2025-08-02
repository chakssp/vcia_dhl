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
            
            // AIDEV-NOTE: progress-throttle; prevent UI blocking with many files (100ms default)
            this.lastProgressUpdate = 0;
            this.progressThrottleDelay = 100; // milliseconds
            this.pendingProgressUpdate = null;
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

                // PRESERVA DADOS EXISTENTES: Faz merge com arquivos já salvos
                // AIDEV-NOTE: category-persistence; merge preserva categorias e campos personalizados (BUG #11 fix)
                const existingFiles = AppState.get('files') || [];
                const mergedFiles = this._mergeWithExistingFiles(finalFiles, existingFiles);
                
                // Salva no estado preservando campos personalizados
                AppState.set('files', mergedFiles);
                AppState.update({
                    'stats.totalFiles': this.stats.totalFiles,
                    'stats.discoveredFiles': mergedFiles.length,
                    'stats.duplicateStats': duplicateStats,
                    'stats.lastUpdate': new Date().toISOString()
                });
                
                // AIDEV-NOTE: discovery-complete; emit 100% progress when done
                EventBus.emit(Events.DISCOVERY_PROGRESS, {
                    phase: 'complete',
                    progress: 100,
                    message: 'Descoberta concluída!',
                    currentFile: '',
                    stats: {
                        directories: this.stats.scannedDirectories,
                        totalFiles: this.stats.totalFiles,
                        validFiles: this.stats.matchedFiles,
                        skipped: this.stats.skippedFiles,
                        elapsed: ((Date.now() - this.stats.startTime) / 1000).toFixed(1)
                    }
                });

                // Log detalhado para debug
                console.log('DiscoveryManager: === RELATÓRIO FINAL DE DESCOBERTA ===');
                console.log(`Total de arquivos verificados: ${this.stats.totalFiles}`);
                console.log(`Arquivos com extensões suportadas: ${this.stats.matchedFiles}`);
                console.log(`Arquivos descobertos (após filtros): ${finalFiles.length}`);
                console.log(`Arquivos pulados: ${this.stats.skippedFiles}`);
                console.log(`Diretórios excluídos: ${this.stats.skippedDirs || 0}`);
                console.log('==========================================');
                
                // Emite evento de conclusão com arquivos já merged
                EventBus.emit(Events.FILES_DISCOVERED, {
                    files: mergedFiles,
                    stats: { ...this.stats, duplicates: duplicateStats }
                });

                // REFATORAÇÃO REMOVIDA: Processamento posterior de confidence scores
                // MOTIVO: Scores agora são calculados DURANTE descoberta via _calculateConfidenceDuringDiscovery()
                // O processamento posterior criava fluxo invertido onde usuário via 0% e depois scores apareciam
                console.log('✅ REFATORAÇÃO: Confidence scores calculados durante descoberta - processamento posterior removido');

                EventBus.emit(Events.PROGRESS_END, {
                    type: 'discovery',
                    message: `Descoberta concluída: ${this.stats.matchedFiles} arquivos encontrados`
                });

                return {
                    success: true,
                    files: mergedFiles,
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
            
            // AIDEV-NOTE: emit-progress-update; throttled updates for smooth UI feedback
            this._emitProgressUpdate('scanning', pathString);
            
            try {
                // Verifica se tem handle do File System Access API
                let files = [];
                
                if (path.handle && KC.compatibility && KC.compatibility.isSupported()) {
                    // Usa File System Access API para dados reais
                    KC.Logger.success('✅ DADOS REAIS - Usando File System Access API', {
                        source: path.metadata?.source,
                        directory: pathString
                    });
                    files = await this._realDirectoryScan(path.handle, config, currentDepth, pathString);
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
                        
                        // AIDEV-NOTE: file-progress; emit progress after each batch of files
                        if (this.stats.matchedFiles % 10 === 0) {
                            this._emitProgressUpdate('processing', file.path || file.name);
                        }
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
                const shouldExclude = config.excludePatterns && config.excludePatterns.length > 0 && 
                    KC.PatternUtils && KC.PatternUtils.matchesFilePattern(
                        file.path || file.name, 
                        file.name, 
                        config.excludePatterns
                    );

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
        async _realDirectoryScan(directoryHandle, configParam, currentDepth = 0, parentPath = '') {
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
                            // Verifica padrões de exclusão antes de processar
                            const filePath = parentPath ? `${parentPath}/${file.name}` : file.name;
                            const shouldExclude = configParam.excludePatterns && configParam.excludePatterns.length > 0 && 
                                KC.PatternUtils && KC.PatternUtils.matchesFilePattern(
                                    filePath, 
                                    file.name, 
                                    configParam.excludePatterns
                                );

                            if (shouldExclude) {
                                this.stats.skippedFiles++;
                                KC.Logger.debug(`Arquivo excluído por padrão: ${file.name}`);
                            } else {
                                this.stats.matchedFiles++;
                                // SPRINT 1.3.1: DESATIVADO - Sem filtros automáticos
                                // Aplica filtros de data e tamanho
                                // if (this._passesFilters(file, config)) {
                                    const metadata = await this._extractRealMetadata(file, entry, parentPath || directoryHandle.name);
                                    files.push(metadata);
                                
                                // Atualiza estatísticas
                                // this.stats.totalFiles++; // JÁ INCREMENTADO ACIMA
                                
                                // AIDEV-NOTE: file-progress-update; emit progress for each file processed
                                this._emitProgressUpdate('scanning', `${directoryHandle.name}/${file.name}`);
                                
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
                        }
                        
                    } else if (entry.kind === 'directory') {
                        // Constrói o caminho completo desde a raiz
                        const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
                        
                        // NOVO: Verifica se QUALQUER parte do caminho contém diretórios excluídos
                        const shouldExclude = this._shouldExcludeDirectory(currentPath, entry.name, configParam.excludePatterns || []) ||
                                            this._pathContainsExcludedDirectory(currentPath, configParam.excludePatterns || []);
                        
                        if (shouldExclude) {
                            this.stats.skippedDirs = (this.stats.skippedDirs || 0) + 1;
                            KC.Logger.debug('DiscoveryManager', `Diretório excluído: ${currentPath}`);
                            continue; // Pula este diretório completamente
                        }
                        
                        // Scanning recursivo se configurado
                        const shouldRecurse = configParam.subfolderDepth === 0 || currentDepth < configParam.subfolderDepth;
                        
                        if (shouldRecurse) {
                            try {
                                const subDirHandle = await directoryHandle.getDirectoryHandle(entry.name);
                                const subFiles = await this._realDirectoryScan(subDirHandle, configParam, currentDepth + 1, currentPath);
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
         * Verifica se qualquer parte do caminho contém um diretório excluído
         * @private
         * @param {string} path - Caminho completo para verificar
         * @param {string[]} excludePatterns - Padrões de exclusão
         * @returns {boolean} True se o caminho contém diretório excluído
         */
        _pathContainsExcludedDirectory(path, excludePatterns) {
            if (!excludePatterns || excludePatterns.length === 0 || !path) {
                return false;
            }

            // Primeiro verifica padrões com caminho completo
            for (const pattern of excludePatterns) {
                const cleanPattern = pattern.trim().replace(/\/$/, '');
                const cleanPath = path.replace(/\/$/, '');
                
                // Se o padrão contém '/', é um caminho e não apenas um nome de diretório
                if (cleanPattern.includes('/')) {
                    // Verifica se o caminho atual contém ou termina com o padrão
                    if (cleanPath.includes(cleanPattern) || cleanPath.endsWith(cleanPattern)) {
                        return true;
                    }
                }
            }

            // Depois verifica cada parte do caminho contra padrões simples
            const pathParts = path.split('/').filter(part => part);
            
            for (const part of pathParts) {
                for (const pattern of excludePatterns) {
                    const cleanPattern = pattern.trim().replace(/\/$/, '');
                    
                    // Se o padrão NÃO contém '/', é um nome de diretório simples
                    if (!cleanPattern.includes('/')) {
                        // Verifica match exato
                        if (part === cleanPattern) {
                            return true;
                        }
                        
                        // Verifica wildcards se disponível
                        if (KC.PatternUtils && KC.PatternUtils.matchesWildcard) {
                            if (KC.PatternUtils.matchesWildcard(part, cleanPattern)) {
                                return true;
                            }
                        }
                    }
                }
            }
            
            return false;
        }

        /**
         * Verifica se um diretório deve ser excluído baseado nos padrões
         * @private
         * @param {string} dirPath - Caminho completo do diretório
         * @param {string} dirName - Nome do diretório
         * @param {string[]} excludePatterns - Padrões de exclusão
         * @returns {boolean} True se o diretório deve ser excluído
         */
        _shouldExcludeDirectory(dirPath, dirName, excludePatterns) {
            if (!excludePatterns || excludePatterns.length === 0) {
                return false;
            }

            // Usa o novo método otimizado do PatternUtils se disponível
            if (KC.PatternUtils && KC.PatternUtils.matchesDirectoryPattern) {
                return KC.PatternUtils.matchesDirectoryPattern(dirPath, dirName, excludePatterns);
            }

            // Fallback para verificação simples
            for (const pattern of excludePatterns) {
                // Padrões específicos para diretórios
                if (pattern === dirName) {
                    return true; // Match exato do nome
                }
                
                if (pattern.endsWith('/') && dirName === pattern.slice(0, -1)) {
                    return true; // Padrão de diretório
                }
                
                // Usa PatternUtils se disponível
                if (KC.PatternUtils) {
                    // Verifica match no nome do diretório
                    if (KC.PatternUtils.matchesWildcard(dirName, pattern)) {
                        return true;
                    }
                    
                    // Verifica match no caminho completo
                    if (KC.PatternUtils.matchesWildcard(dirPath, pattern)) {
                        return true;
                    }
                }
            }
            
            return false;
        }

        /**
         * Calcula confidence score durante a descoberta usando UnifiedConfidenceSystem
         * REFATORAÇÃO CRÍTICA: Integra cálculo de confiança no momento da descoberta
         * @private
         * @param {Object} metadata - Metadados do arquivo com conteúdo
         * @returns {number} Score de confiança (0-100)
         */
        async _calculateConfidenceDuringDiscovery(metadata) {
            try {
                // ETAPA 1: Inicialização lazy do UnifiedConfidenceSystem
                await this._ensureUnifiedConfidenceSystemReady();

                // ETAPA 2: Verifica se sistema está ativo e pronto
                if (!KC.UnifiedConfidenceControllerInstance?.initialized) {
                    KC.Logger?.debug('UnifiedConfidenceSystem não inicializado - usando fallback');
                    return this._calculateFallbackConfidence(metadata);
                }

                // ETAPA 3: Usa ConfidenceAggregator para processamento completo
                if (KC.ConfidenceAggregatorInstance?.processFile) {
                    // Cria objeto file temporário para processamento
                    const tempFile = {
                        id: metadata.id,
                        name: metadata.name,
                        content: metadata.content,
                        preview: metadata.preview,
                        smartPreview: metadata.smartPreview,
                        size: metadata.size,
                        path: metadata.path,
                        categories: metadata.categories || [],
                        lastModified: metadata.lastModified,
                        relevanceScore: metadata.relevanceScore || 0
                    };

                    const result = await KC.ConfidenceAggregatorInstance.processFile(tempFile, {
                        source: 'discovery_phase',
                        realTime: true,
                        skipCache: true // Evita problemas de cache durante descoberta
                    });

                    // Adiciona metadados de confidence ao arquivo
                    metadata.confidenceMetadata = {
                        breakdown: result.breakdown,
                        strategy: result.strategy,
                        processingTime: result.processingTime,
                        originalRelevance: result.originalRelevance,
                        timestamp: result.timestamp,
                        source: 'unified_confidence_system'
                    };

                    // Retorna score final em escala 0-100
                    const finalScore = Math.min(100, Math.max(0, result.finalScore || 0));
                    KC.Logger?.debug(`🎯 Unified confidence calculado: ${metadata.name} = ${Math.round(finalScore)}%`);
                    return finalScore;
                }

                // ETAPA 4: Fallback se aggregator não disponível
                KC.Logger?.warning('ConfidenceAggregator não disponível - usando fallback');
                return this._calculateFallbackConfidence(metadata);

            } catch (error) {
                KC.Logger?.warning(`Erro no cálculo de confidence para ${metadata.name}:`, error.message);
                return this._calculateFallbackConfidence(metadata);
            }
        }

        /**
         * Garante que o UnifiedConfidenceSystem está pronto para uso
         * @private
         */
        async _ensureUnifiedConfidenceSystemReady() {
            try {
                // Verifica se feature flag está ativa
                if (!KC.FeatureFlagManagerInstance?.isEnabled('unified_confidence_system')) {
                    KC.Logger?.debug('Feature flag unified_confidence_system não está ativa');
                    return false;
                }

                // Inicializa UnifiedConfidenceController se necessário
                if (!KC.UnifiedConfidenceControllerInstance?.initialized) {
                    KC.Logger?.info('🔧 Inicializando UnifiedConfidenceSystem durante descoberta...');
                    const initResult = await KC.UnifiedConfidenceControllerInstance?.init();
                    if (!initResult?.success) {
                        KC.Logger?.warning('Falha na inicialização do UnifiedConfidenceSystem:', initResult?.error);
                        return false;
                    }
                }

                // Inicializa componentes necessários
                if (KC.QdrantScoreBridgeInstance && !KC.QdrantScoreBridgeInstance.initialized) {
                    KC.Logger?.info('🔧 Inicializando QdrantScoreBridge durante descoberta...');
                    await KC.QdrantScoreBridgeInstance.initialize();
                }

                return true;

            } catch (error) {
                KC.Logger?.error('Erro na inicialização do UnifiedConfidenceSystem:', error);
                return false;
            }
        }

        /**
         * Calcula confidence usando método de fallback
         * @private
         */
        _calculateFallbackConfidence(metadata) {
            // Usa PreviewUtils como fallback
            if (KC.PreviewUtils && metadata.smartPreview) {
                const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
                const score = KC.PreviewUtils.calculatePreviewRelevance(metadata.smartPreview, keywords);
                KC.Logger?.debug(`📊 Fallback confidence: ${metadata.name} = ${Math.round(score)}%`);
                return score;
            }

            // Fallback básico baseado em tamanho e tipo de arquivo
            let baseScore = 30; // Base mínima

            // Boost por tamanho (arquivos maiores tendem a ter mais conteúdo)
            if (metadata.size > 1000) baseScore += 10;
            if (metadata.size > 5000) baseScore += 10;

            // Boost por extensão
            if (metadata.extension === '.md') baseScore += 15;
            if (metadata.extension === '.txt') baseScore += 10;

            // Boost por categorias existentes
            if (metadata.categories && metadata.categories.length > 0) {
                baseScore += Math.min(20, metadata.categories.length * 5);
            }

            return Math.min(95, baseScore);
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
                        
                        // UNIFIED CONFIDENCE SYSTEM: Calculate intelligent scores during discovery
                        // REFATORAÇÃO CRÍTICA: Scores calculados DURANTE descoberta, não DEPOIS
                        try {
                            const confidenceScore = await this._calculateConfidenceDuringDiscovery(metadata);
                            metadata.relevanceScore = confidenceScore;
                            
                            // Verifica se metadados de confidence foram adicionados
                            if (metadata.confidenceMetadata) {
                                metadata.confidenceSource = metadata.confidenceMetadata.source;
                                console.log(`🎯 Unified confidence calculado durante descoberta: ${file.name} = ${Math.round(confidenceScore)}%`);
                            } else {
                                metadata.confidenceSource = 'fallback_confidence';
                                console.log(`📊 Fallback confidence calculado durante descoberta: ${file.name} = ${Math.round(confidenceScore)}%`);
                            }
                            
                        } catch (error) {
                            // Fallback para cálculo básico se tudo falhar
                            const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
                            metadata.relevanceScore = KC.PreviewUtils.calculatePreviewRelevance(smartPreview, keywords);
                            metadata.confidenceSource = 'fallback_preview';
                            
                            console.warn(`⚠️ Fallback para preview relevance: ${file.name}`, error.message);
                        }
                        
                        console.log(`Preview extraído para ${file.name}:`, {
                            preview: typeof metadata.preview === 'string' 
                                ? metadata.preview.substring(0, 100) + '...'
                                : (metadata.preview?.segment1?.substring(0, 100) || 'Preview não disponível') + '...',
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

        /**
         * Importa exclusões do plugin file-explorer-plus do Obsidian
         * @public
         * @param {FileSystemDirectoryHandle} rootHandle - Handle do diretório raiz (opcional)
         * @returns {Promise<Object>} Resultado da importação
         */
        async importObsidianExclusions(rootHandle = null) {
            try {
                // Se não tiver handle, tenta usar o primeiro diretório configurado
                if (!rootHandle) {
                    const config = KC.AppState.get('configuration')?.discovery || {};
                    const directories = config.directories || [];
                    
                    if (directories.length === 0 || !directories[0].handle) {
                        return {
                            success: false,
                            message: 'Nenhum diretório configurado. Execute a descoberta primeiro.'
                        };
                    }
                    
                    rootHandle = directories[0].handle;
                }

                // Verifica se ObsidianPluginUtils está disponível
                if (!KC.ObsidianPluginUtils) {
                    KC.Logger.error('DiscoveryManager', 'ObsidianPluginUtils não está carregado');
                    return {
                        success: false,
                        message: 'ObsidianPluginUtils não está disponível'
                    };
                }

                // Importa as exclusões
                const result = await KC.ObsidianPluginUtils.importObsidianExclusions(rootHandle);
                
                if (result.success && result.exclusions.length > 0) {
                    // Atualiza a configuração com as novas exclusões
                    const config = KC.AppState.get('configuration') || {};
                    const discoveryConfig = config.discovery || {};
                    const currentExclusions = discoveryConfig.excludePatterns || [];
                    
                    // Adiciona novas exclusões
                    const updatedExclusions = [...new Set([...currentExclusions, ...result.exclusions])];
                    
                    // Salva a configuração atualizada
                    discoveryConfig.excludePatterns = updatedExclusions;
                    config.discovery = discoveryConfig;
                    KC.AppState.set('configuration', config);
                    
                    KC.Logger.info('DiscoveryManager', 'Exclusões importadas com sucesso', {
                        novas: result.exclusions.length,
                        total: updatedExclusions.length
                    });
                }
                
                return result;
                
            } catch (error) {
                KC.Logger.error('DiscoveryManager', 'Erro ao importar exclusões do Obsidian', error);
                return {
                    success: false,
                    message: `Erro: ${error.message}`
                };
            }
        }

        // REMOVIDO: _simulateObsidianJson - sem simulações

        /**
         * Faz merge de arquivos descobertos com arquivos existentes
         * Preserva campos personalizados como categories, approved, etc.
         * @private
         */
        _mergeWithExistingFiles(newFiles, existingFiles) {
            KC.Logger.info('Fazendo merge de arquivos descobertos com existentes', {
                newCount: newFiles.length,
                existingCount: existingFiles.length
            });
            
            // Cria um mapa dos arquivos existentes por path/name para lookup rápido
            const existingMap = new Map();
            existingFiles.forEach(file => {
                // Usa path como chave primária, name como fallback
                const key = file.path || file.name;
                if (key) {
                    existingMap.set(key, file);
                }
            });
            
            // Merge dos arquivos
            const mergedFiles = newFiles.map(newFile => {
                const key = newFile.path || newFile.name;
                const existingFile = existingMap.get(key);
                
                if (existingFile) {
                    // PRESERVA campos personalizados do arquivo existente
                    const merged = {
                        ...newFile, // Dados atualizados da descoberta
                        // Preserva campos que o usuário pode ter modificado
                        categories: existingFile.categories || [],
                        approved: existingFile.approved || false,
                        archived: existingFile.archived || false,
                        analyzed: existingFile.analyzed || false,
                        analysisType: existingFile.analysisType || null,
                        tags: existingFile.tags || [],
                        notes: existingFile.notes || '',
                        customFields: existingFile.customFields || {},
                        // Preserva datas importantes
                        categorizedDate: existingFile.categorizedDate,
                        approvedDate: existingFile.approvedDate,
                        archivedDate: existingFile.archivedDate,
                        analyzedDate: existingFile.analyzedDate
                    };
                    
                    // FASE 1.3: Aplicar boost de relevância por categorização
                    // AIDEV-NOTE: category-relevance-boost; categorias aumentam relevância (curadoria humana)
                    if (merged.categories && merged.categories.length > 0) {
                        const originalScore = merged.relevanceScore || 0;
                        // Usa fórmula logarítmica para boost mais equilibrado
                        merged.relevanceScore = KC.RelevanceUtils ? 
                            KC.RelevanceUtils.calculateCategoryBoost(merged.categories.length, originalScore) :
                            Math.min(95, originalScore * (1 + (Math.log(merged.categories.length + 1) * 0.05)));
                        
                        const boostPercentage = KC.RelevanceUtils ? 
                            KC.RelevanceUtils.getBoostPercentage(merged.categories.length) :
                            Math.round(Math.log(merged.categories.length + 1) * 5);
                        
                        KC.Logger.info('Boost de relevância aplicado', {
                            file: merged.name,
                            categories: merged.categories.length,
                            originalScore: originalScore,
                            boostedScore: merged.relevanceScore,
                            boost: `${boostPercentage}%`
                        });
                    }
                    
                    // AIDEV-NOTE: preserve-user-data; mantém dados do usuário ao re-descobrir
                    KC.Logger.debug(`Arquivo preservado: ${key}`, {
                        categories: merged.categories,
                        approved: merged.approved,
                        relevanceScore: merged.relevanceScore
                    });
                    
                    return merged;
                }
                
                // Arquivo novo, retorna com campos padrão
                return {
                    ...newFile,
                    categories: [],
                    approved: false,
                    archived: false,
                    tags: [],
                    notes: '',
                    customFields: {}
                };
            });
            
            KC.Logger.success('Merge concluído', {
                total: mergedFiles.length,
                preserved: Array.from(existingMap.keys()).filter(key => 
                    mergedFiles.some(f => (f.path || f.name) === key)
                ).length,
                new: mergedFiles.length - existingMap.size
            });
            
            return mergedFiles;
        }

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
        
        /**
         * AIDEV-NOTE: throttled-progress; emit progress updates without blocking UI (perf-critical)
         * @private
         */
        _emitProgressUpdate(phase, currentPath) {
            const now = Date.now();
            const timeSinceLastUpdate = now - this.lastProgressUpdate;
            
            // AIDEV-TODO: make throttle delay configurable for different file counts
            if (timeSinceLastUpdate < this.progressThrottleDelay) {
                // Schedule update for later
                if (this.pendingProgressUpdate) {
                    clearTimeout(this.pendingProgressUpdate);
                }
                
                this.pendingProgressUpdate = setTimeout(() => {
                    this._doEmitProgress(phase, currentPath);
                    this.pendingProgressUpdate = null;
                }, this.progressThrottleDelay - timeSinceLastUpdate);
                
                return;
            }
            
            this._doEmitProgress(phase, currentPath);
        }
        
        /**
         * AIDEV-NOTE: actual-progress-emit; calculates progress percentage and emits event
         * @private
         */
        _doEmitProgress(phase, currentPath) {
            this.lastProgressUpdate = Date.now();
            
            // AIDEV-NOTE: progress-calc; transparent percentage calculation
            let progress = 0;
            let progressDetail = '';
            
            if (this.stats.totalFiles > 0) {
                // AIDEV-NOTE: real-percentage; show actual % without artificial limits
                const actualPercentage = (this.stats.matchedFiles / this.stats.totalFiles) * 100;
                
                // AIDEV-NOTE: phase-logic; different progress calc per phase
                if (phase === 'scanning') {
                    // Durante escaneamento, limitamos a 95% para indicar que ainda está processando
                    progress = Math.min(95, actualPercentage);
                    progressDetail = `${this.stats.matchedFiles} de ${this.stats.totalFiles} arquivos válidos`;
                } else if (phase === 'complete') {
                    // Quando completo, sempre 100%
                    progress = 100;
                    progressDetail = `${this.stats.matchedFiles} arquivos válidos de ${this.stats.totalFiles} total`;
                } else {
                    // Outros casos, mostra porcentagem real
                    progress = actualPercentage;
                    progressDetail = `${Math.round(actualPercentage)}% real`;
                }
                
                // AIDEV-QUESTION: why-95-limit; qual o motivo do limite de 95% durante scanning?
            } else if (this.stats.scannedDirectories > 0) {
                // AIDEV-NOTE: directory-based-progress; fallback when file count unknown
                progress = Math.min(95, (this.stats.scannedDirectories / Math.max(this.stats.totalDirectories, 1)) * 100);
                progressDetail = `${this.stats.scannedDirectories} diretórios escaneados`;
            }
            
            // AIDEV-NOTE: current-file-name; extract filename from path for display
            const pathParts = currentPath.split('/');
            const currentFile = pathParts[pathParts.length - 1] || 'Raiz';
            
            // Emit progress event
            EventBus.emit(Events.DISCOVERY_PROGRESS, {
                phase: phase,
                progress: progress,
                message: `Escaneando: ${currentFile}`,
                currentFile: currentFile,
                currentPath: currentPath,
                progressDetail: progressDetail, // AIDEV-NOTE: detail-info; adiciona explicação do cálculo
                stats: {
                    directories: this.stats.scannedDirectories,
                    totalFiles: this.stats.totalFiles,
                    validFiles: this.stats.matchedFiles,
                    skipped: this.stats.skippedFiles,
                    elapsed: ((Date.now() - this.stats.startTime) / 1000).toFixed(1)
                },
                startTime: this.stats.startTime
            });
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