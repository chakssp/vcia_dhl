/**
 * EvolutionQueue.js
 * 
 * Sistema de fila evolutiva para processamento incremental de arquivos
 * Gerencia prioridades e reprocessamento baseado em novas capacidades
 * 
 * @author Brito & Claude
 * @date 10/08/2025
 * @principle EVER - Enhance Validation & Extensive Recording
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class EvolutionQueue {
        constructor() {
            // Filas por prioridade
            this.queues = {
                critical: [],    // P0 - Arquivos críticos identificados
                high: [],        // P1 - Alto potencial (PST, DOCX grandes)
                medium: [],      // P2 - Potencial médio (PDFs, XLSX)
                low: [],         // P3 - Baixo potencial
                reprocess: []    // Fila especial para reprocessamento
            };

            // Registro de processamento
            this.processingHistory = new Map();
            
            // Capacidades atuais vs futuras
            this.currentCapabilities = new Set(['md', 'txt', 'html', 'json']);
            this.futureCapabilities = new Map([
                ['pdf', { priority: 'high', estimatedDate: '2025-09', technology: 'pdf.js + OCR' }],
                ['docx', { priority: 'high', estimatedDate: '2025-09', technology: 'mammoth.js' }],
                ['xlsx', { priority: 'medium', estimatedDate: '2025-10', technology: 'sheetjs' }],
                ['pst', { priority: 'critical', estimatedDate: '2025-11', technology: 'libpst-js' }],
                ['pptx', { priority: 'medium', estimatedDate: '2025-10', technology: 'pptx-parser' }]
            ]);

            // Estatísticas
            this.stats = {
                totalQueued: 0,
                totalProcessed: 0,
                totalFailed: 0,
                totalPending: 0,
                byType: {},
                byPriority: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                }
            };

            // Configurações
            this.config = {
                maxBatchSize: 50,
                processingInterval: 5000, // 5 segundos
                retryAttempts: 3,
                priorityBoostAge: 30, // dias para aumentar prioridade
                autoRequeueOnCapability: true
            };

            this.initializeQueue();
        }

        /**
         * Adiciona arquivo à fila com análise de prioridade
         */
        async enqueue(file, options = {}) {
            // Analisar arquivo usando o Orchestrator
            const analysis = await KC.ContentAnalysisOrchestrator.analyzeFile(file);
            
            // Determinar prioridade
            const priority = this.determinePriority(file, analysis);
            
            // Criar item da fila
            const queueItem = {
                id: file.id || this.generateId(file),
                file: file,
                analysis: analysis,
                priority: priority,
                priorityScore: this.calculatePriorityScore(file, analysis),
                enqueuedAt: new Date().toISOString(),
                attempts: 0,
                status: 'queued',
                lastAttempt: null,
                nextAttempt: null,
                errors: [],
                metadata: {
                    originalPriority: priority,
                    boostCount: 0,
                    reprocessCount: 0,
                    ...options
                }
            };

            // Adicionar à fila apropriada
            this.queues[priority].push(queueItem);
            
            // Ordenar fila por priorityScore
            this.queues[priority].sort((a, b) => b.priorityScore - a.priorityScore);
            
            // Atualizar estatísticas
            this.updateStats('enqueue', queueItem);
            
            // Registrar no histórico
            this.processingHistory.set(queueItem.id, {
                status: 'queued',
                history: [{
                    timestamp: new Date().toISOString(),
                    action: 'enqueued',
                    priority: priority,
                    score: queueItem.priorityScore
                }]
            });

            // Log
            KC.Logger?.info('EvolutionQueue', `Arquivo enfileirado: ${file.name}`, {
                priority: priority,
                score: queueItem.priorityScore,
                type: analysis.fileType
            });

            return queueItem;
        }

        /**
         * Determina prioridade baseada na análise
         */
        determinePriority(file, analysis) {
            const scores = analysis.scores;
            const potential = analysis.convergencePotential;
            
            // Critérios para prioridade crítica
            if (
                potential.overall > 85 ||
                analysis.metadata.processingPriority > 90 ||
                file.name.toLowerCase().includes('critical') ||
                file.name.toLowerCase().includes('urgent')
            ) {
                return 'critical';
            }
            
            // Alta prioridade
            if (
                potential.overall > 60 ||
                scores.potential > 80 ||
                analysis.metadata.processingPriority > 70 ||
                analysis.fileType === '.pst' ||
                analysis.fileType === '.docx'
            ) {
                return 'high';
            }
            
            // Média prioridade
            if (
                potential.overall > 30 ||
                scores.potential > 50 ||
                analysis.metadata.processingPriority > 40
            ) {
                return 'medium';
            }
            
            // Baixa prioridade
            return 'low';
        }

        /**
         * Calcula score numérico de prioridade
         */
        calculatePriorityScore(file, analysis) {
            let score = 0;
            
            // Componentes do score
            score += analysis.convergencePotential.overall * 2; // Peso 2x
            score += analysis.metadata.processingPriority;
            score += analysis.scores.potential;
            score += analysis.scores.temporal * 0.5;
            score += analysis.scores.context * 0.5;
            
            // Boost por tipo de arquivo
            const typeBoost = {
                '.pst': 50,
                '.docx': 40,
                '.pdf': 35,
                '.xlsx': 30,
                '.pptx': 25
            };
            score += typeBoost[analysis.fileType] || 0;
            
            // Boost por tamanho
            if (file.size > 10 * 1024 * 1024) score += 20; // > 10MB
            if (file.size > 50 * 1024 * 1024) score += 30; // > 50MB
            
            // Boost por idade (arquivos esquecidos)
            const ageInDays = analysis.metadata.ageInDays;
            if (ageInDays > this.config.priorityBoostAge) {
                score += Math.min(ageInDays / 10, 50); // Máximo 50 pontos
            }
            
            return Math.round(score);
        }

        /**
         * Processa próximo item da fila
         */
        async processNext() {
            // Buscar próximo item por prioridade
            const item = this.getNextItem();
            if (!item) {
                return null;
            }

            // Marcar como processando
            item.status = 'processing';
            item.lastAttempt = new Date().toISOString();
            item.attempts++;

            try {
                // Verificar se temos capacidade para processar
                const canProcess = this.checkProcessingCapability(item);
                
                if (!canProcess.capable) {
                    // Não temos capacidade ainda
                    item.status = 'pending_capability';
                    item.metadata.pendingReason = canProcess.reason;
                    item.nextAttempt = canProcess.estimatedDate;
                    
                    // Adicionar à fila de reprocessamento futuro
                    if (this.config.autoRequeueOnCapability) {
                        this.scheduleForReprocessing(item, canProcess.estimatedDate);
                    }
                    
                    return {
                        success: false,
                        reason: 'capability_pending',
                        item: item
                    };
                }

                // Processar arquivo
                const result = await this.processFile(item);
                
                if (result.success) {
                    item.status = 'completed';
                    item.completedAt = new Date().toISOString();
                    item.result = result.data;
                    
                    // Atualizar arquivo no AppState
                    this.updateFileInAppState(item.file, result.data);
                    
                    // Estatísticas
                    this.updateStats('complete', item);
                    
                    return {
                        success: true,
                        item: item,
                        data: result.data
                    };
                } else {
                    // Falha no processamento
                    item.errors.push({
                        timestamp: new Date().toISOString(),
                        error: result.error,
                        attempt: item.attempts
                    });
                    
                    if (item.attempts < this.config.retryAttempts) {
                        // Retentar
                        item.status = 'retry_scheduled';
                        item.nextAttempt = new Date(Date.now() + 60000 * item.attempts).toISOString();
                        this.requeueItem(item);
                    } else {
                        // Máximo de tentativas
                        item.status = 'failed';
                        item.failedAt = new Date().toISOString();
                        this.updateStats('fail', item);
                    }
                    
                    return {
                        success: false,
                        reason: 'processing_error',
                        item: item,
                        error: result.error
                    };
                }
            } catch (error) {
                KC.Logger?.error('EvolutionQueue', 'Erro no processamento', error);
                
                item.status = 'error';
                item.errors.push({
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    stack: error.stack
                });
                
                return {
                    success: false,
                    reason: 'exception',
                    item: item,
                    error: error
                };
            }
        }

        /**
         * Obtém próximo item respeitando prioridades
         */
        getNextItem() {
            // Ordem de prioridade
            const priorityOrder = ['critical', 'high', 'medium', 'low', 'reprocess'];
            
            for (const priority of priorityOrder) {
                const queue = this.queues[priority];
                if (queue.length > 0) {
                    // Pegar primeiro item que não está processando
                    const index = queue.findIndex(item => 
                        item.status === 'queued' || 
                        item.status === 'retry_scheduled' && new Date(item.nextAttempt) <= new Date()
                    );
                    
                    if (index >= 0) {
                        return queue.splice(index, 1)[0];
                    }
                }
            }
            
            return null;
        }

        /**
         * Verifica capacidade de processamento
         */
        checkProcessingCapability(item) {
            const extension = item.analysis.fileType.substring(1); // Remove o ponto
            
            // Verificar capacidade atual
            if (this.currentCapabilities.has(extension)) {
                return { capable: true };
            }
            
            // Verificar capacidade futura
            if (this.futureCapabilities.has(extension)) {
                const future = this.futureCapabilities.get(extension);
                return {
                    capable: false,
                    reason: `Aguardando implementação de ${future.technology}`,
                    estimatedDate: future.estimatedDate,
                    technology: future.technology
                };
            }
            
            // Tipo desconhecido
            return {
                capable: false,
                reason: 'Tipo de arquivo não suportado',
                estimatedDate: null
            };
        }

        /**
         * Processa arquivo efetivamente
         */
        async processFile(item) {
            try {
                const file = item.file;
                const analysis = item.analysis;
                
                // Se já tem conteúdo extraído
                if (analysis.extraction.extractedContent) {
                    return {
                        success: true,
                        data: {
                            content: analysis.extraction.extractedContent,
                            analysis: analysis,
                            processedAt: new Date().toISOString()
                        }
                    };
                }
                
                // Tentar extrair conteúdo
                const extension = analysis.fileType.substring(1);
                if (KC.ContentAnalysisOrchestrator.extractors.has(extension)) {
                    const extractor = KC.ContentAnalysisOrchestrator.extractors.get(extension);
                    const content = await extractor(file);
                    
                    if (content) {
                        return {
                            success: true,
                            data: {
                                content: content,
                                analysis: analysis,
                                processedAt: new Date().toISOString()
                            }
                        };
                    }
                }
                
                // Usar placeholder se não conseguir extrair
                return {
                    success: true,
                    data: {
                        content: analysis.placeholderContent,
                        analysis: analysis,
                        isPlaceholder: true,
                        processedAt: new Date().toISOString()
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Atualiza arquivo no AppState
         */
        updateFileInAppState(file, processedData) {
            const files = KC.AppState?.get('files') || [];
            const index = files.findIndex(f => f.id === file.id || f.path === file.path);
            
            if (index >= 0) {
                files[index] = {
                    ...files[index],
                    ...processedData,
                    evolutionProcessed: true,
                    evolutionTimestamp: new Date().toISOString()
                };
                
                KC.AppState?.set('files', files);
                KC.EventBus?.emit(KC.Events?.FILES_UPDATED, { files });
            }
        }

        /**
         * Reagenda item para reprocessamento
         */
        scheduleForReprocessing(item, estimatedDate) {
            item.metadata.reprocessScheduled = true;
            item.metadata.reprocessDate = estimatedDate;
            
            // Adicionar à fila de reprocessamento
            this.queues.reprocess.push({
                ...item,
                originalPriority: item.priority,
                priority: 'reprocess',
                scheduledFor: estimatedDate
            });
            
            KC.Logger?.info('EvolutionQueue', `Agendado para reprocessamento: ${item.file.name}`, {
                date: estimatedDate,
                reason: item.metadata.pendingReason
            });
        }

        /**
         * Recoloca item na fila
         */
        requeueItem(item) {
            const priority = item.priority;
            this.queues[priority].push(item);
            
            // Reordenar
            this.queues[priority].sort((a, b) => b.priorityScore - a.priorityScore);
        }

        /**
         * Atualiza estatísticas
         */
        updateStats(action, item) {
            const type = item.analysis?.fileType || 'unknown';
            
            switch (action) {
                case 'enqueue':
                    this.stats.totalQueued++;
                    this.stats.byPriority[item.priority]++;
                    this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
                    break;
                    
                case 'complete':
                    this.stats.totalProcessed++;
                    break;
                    
                case 'fail':
                    this.stats.totalFailed++;
                    break;
                    
                case 'pending':
                    this.stats.totalPending++;
                    break;
            }
        }

        /**
         * Obtém estatísticas da fila
         */
        getStats() {
            const queueSizes = {};
            Object.keys(this.queues).forEach(priority => {
                queueSizes[priority] = this.queues[priority].length;
            });
            
            return {
                ...this.stats,
                queueSizes: queueSizes,
                totalInQueue: Object.values(queueSizes).reduce((sum, size) => sum + size, 0),
                processingRate: this.calculateProcessingRate(),
                estimatedTimeToComplete: this.estimateCompletionTime()
            };
        }

        /**
         * Calcula taxa de processamento
         */
        calculateProcessingRate() {
            // Implementar cálculo baseado em histórico
            const recentHistory = Array.from(this.processingHistory.values())
                .filter(h => h.status === 'completed')
                .slice(-100); // Últimos 100 processados
            
            if (recentHistory.length < 2) return 0;
            
            const times = recentHistory.map(h => 
                new Date(h.history.find(e => e.action === 'completed')?.timestamp).getTime()
            );
            
            const duration = times[times.length - 1] - times[0];
            const rate = recentHistory.length / (duration / 1000 / 60); // Items por minuto
            
            return Math.round(rate * 100) / 100;
        }

        /**
         * Estima tempo para completar fila
         */
        estimateCompletionTime() {
            const totalItems = Object.values(this.queues)
                .reduce((sum, queue) => sum + queue.length, 0);
            
            const rate = this.calculateProcessingRate();
            if (rate === 0) return Infinity;
            
            return Math.round(totalItems / rate); // Minutos
        }

        /**
         * Processa fila em batch
         */
        async processBatch(size = null) {
            const batchSize = size || this.config.maxBatchSize;
            const results = [];
            
            for (let i = 0; i < batchSize; i++) {
                const result = await this.processNext();
                if (!result) break; // Fila vazia
                results.push(result);
            }
            
            return results;
        }

        /**
         * Inicia processamento automático
         */
        startAutoProcessing() {
            if (this.processingInterval) {
                KC.Logger?.warn('EvolutionQueue', 'Processamento automático já está ativo');
                return;
            }
            
            this.processingInterval = setInterval(async () => {
                const result = await this.processNext();
                if (result) {
                    KC.Logger?.info('EvolutionQueue', 'Item processado automaticamente', result);
                }
            }, this.config.processingInterval);
            
            KC.Logger?.info('EvolutionQueue', 'Processamento automático iniciado');
        }

        /**
         * Para processamento automático
         */
        stopAutoProcessing() {
            if (this.processingInterval) {
                clearInterval(this.processingInterval);
                this.processingInterval = null;
                KC.Logger?.info('EvolutionQueue', 'Processamento automático parado');
            }
        }

        /**
         * Boost de prioridade para arquivos antigos na fila
         */
        boostAgedItems() {
            const now = Date.now();
            let boosted = 0;
            
            ['low', 'medium'].forEach(priority => {
                const queue = this.queues[priority];
                const toBoost = [];
                
                queue.forEach((item, index) => {
                    const age = (now - new Date(item.enqueuedAt).getTime()) / (1000 * 60 * 60 * 24);
                    
                    if (age > this.config.priorityBoostAge) {
                        toBoost.push(index);
                        item.metadata.boostCount++;
                        item.priorityScore += 20;
                    }
                });
                
                // Mover items para prioridade superior
                toBoost.reverse().forEach(index => {
                    const item = queue.splice(index, 1)[0];
                    const newPriority = priority === 'low' ? 'medium' : 'high';
                    item.priority = newPriority;
                    this.queues[newPriority].push(item);
                    boosted++;
                });
            });
            
            if (boosted > 0) {
                KC.Logger?.info('EvolutionQueue', `${boosted} items tiveram prioridade aumentada por idade`);
            }
            
            return boosted;
        }

        /**
         * Limpa items completados ou falhados
         */
        cleanup() {
            let removed = 0;
            
            Object.keys(this.queues).forEach(priority => {
                const queue = this.queues[priority];
                const toRemove = [];
                
                queue.forEach((item, index) => {
                    if (item.status === 'completed' || item.status === 'failed') {
                        toRemove.push(index);
                    }
                });
                
                toRemove.reverse().forEach(index => {
                    queue.splice(index, 1);
                    removed++;
                });
            });
            
            KC.Logger?.info('EvolutionQueue', `${removed} items removidos na limpeza`);
            return removed;
        }

        /**
         * Exporta estado da fila
         */
        exportQueueState() {
            return {
                queues: this.queues,
                stats: this.getStats(),
                history: Array.from(this.processingHistory.entries()),
                capabilities: {
                    current: Array.from(this.currentCapabilities),
                    future: Array.from(this.futureCapabilities.entries())
                },
                config: this.config,
                exportedAt: new Date().toISOString()
            };
        }

        /**
         * Importa estado da fila
         */
        importQueueState(state) {
            if (state.queues) this.queues = state.queues;
            if (state.history) {
                this.processingHistory.clear();
                state.history.forEach(([key, value]) => {
                    this.processingHistory.set(key, value);
                });
            }
            if (state.config) this.config = { ...this.config, ...state.config };
            
            KC.Logger?.info('EvolutionQueue', 'Estado da fila importado');
        }

        /**
         * Gera ID único
         */
        generateId(file) {
            const hash = str => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return Math.abs(hash).toString(36);
            };
            
            return `queue-${hash(file.path || file.name)}-${Date.now()}`;
        }

        /**
         * Inicializa fila
         */
        initializeQueue() {
            // Verificar se há estado salvo
            const savedState = localStorage.getItem('KC_EvolutionQueue_State');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    this.importQueueState(state);
                    KC.Logger?.info('EvolutionQueue', 'Estado restaurado do localStorage');
                } catch (error) {
                    KC.Logger?.error('EvolutionQueue', 'Erro ao restaurar estado', error);
                }
            }

            // Salvar estado periodicamente
            setInterval(() => {
                this.saveState();
            }, 30000); // A cada 30 segundos

            // Boost automático de prioridade
            setInterval(() => {
                this.boostAgedItems();
            }, 3600000); // A cada hora

            KC.Logger?.info('EvolutionQueue', 'Fila de evolução inicializada');
        }

        /**
         * Salva estado no localStorage
         */
        saveState() {
            try {
                const state = this.exportQueueState();
                localStorage.setItem('KC_EvolutionQueue_State', JSON.stringify(state));
            } catch (error) {
                KC.Logger?.error('EvolutionQueue', 'Erro ao salvar estado', error);
            }
        }
    }

    // Registrar no KC
    KC.EvolutionQueue = new EvolutionQueue();
    KC.Logger?.info('EvolutionQueue', 'Sistema de fila evolutiva inicializado com EVER');

})(window);