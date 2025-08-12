/**
 * MetricsMonitor.js - Sistema de Monitoramento de Métricas em Produção
 * 
 * Framework EU-VOCÊ - Monitoramento contínuo
 * Data: 11/08/2025
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const EventBus = KC.EventBus;

    class MetricsMonitor {
        constructor() {
            this.metrics = {
                // Métricas de Sistema
                system: {
                    startTime: Date.now(),
                    uptime: 0,
                    lastCheck: null,
                    errors: 0,
                    warnings: 0
                },
                
                // Métricas de Performance
                performance: {
                    avgResponseTime: 0,
                    requests: 0,
                    successRate: 100,
                    lastMeasurement: null
                },
                
                // Métricas de Convergência
                convergence: {
                    documentsProcessed: 0,
                    avgConvergenceScore: 0,
                    patternsDetected: 0,
                    strongestPattern: null
                },
                
                // Métricas de Embeddings
                embeddings: {
                    generated: 0,
                    cached: 0,
                    avgGenerationTime: 0,
                    totalTokens: 0
                },
                
                // Métricas de Gates
                gates: {
                    gate1Passes: 0,
                    gate1Fails: 0,
                    gate2Passes: 0,
                    gate2Fails: 0,
                    gate3Passes: 0,
                    gate3Fails: 0,
                    lastValidation: null
                },
                
                // Métricas de Qualidade
                quality: {
                    utf8Preserved: 100,
                    mockDataDetected: 0,
                    realDataProcessed: 0,
                    validationErrors: 0
                }
            };
            
            this.thresholds = {
                minConvergence: 15,
                maxResponseTime: 5000,
                minSuccessRate: 95,
                maxErrors: 10
            };
            
            this.alerts = [];
            this.history = [];
            this.isMonitoring = false;
            this.monitoringInterval = null;
        }

        /**
         * Inicia monitoramento contínuo
         */
        startMonitoring(intervalMs = 60000) {
            if (this.isMonitoring) {
                console.warn('Monitoramento já está ativo');
                return;
            }
            
            this.isMonitoring = true;
            console.log('🔍 Monitoramento iniciado (intervalo: ' + intervalMs + 'ms)');
            
            // Executar primeira coleta
            this.collectMetrics();
            
            // Configurar intervalo
            this.monitoringInterval = setInterval(() => {
                this.collectMetrics();
                this.checkThresholds();
                this.saveSnapshot();
            }, intervalMs);
            
            // Registrar listeners de eventos
            this.registerEventListeners();
        }

        /**
         * Para monitoramento
         */
        stopMonitoring() {
            if (!this.isMonitoring) return;
            
            this.isMonitoring = false;
            clearInterval(this.monitoringInterval);
            console.log('🛑 Monitoramento parado');
        }

        /**
         * Coleta métricas atuais
         */
        collectMetrics() {
            const now = Date.now();
            
            // Atualizar uptime
            this.metrics.system.uptime = now - this.metrics.system.startTime;
            this.metrics.system.lastCheck = new Date().toISOString();
            
            // Coletar métricas de convergência se disponível
            if (KC.ConvergencePatternService) {
                const stats = KC.ConvergencePatternService.getStats();
                this.metrics.convergence.documentsProcessed = stats.totalAnalyzed;
                this.metrics.convergence.avgConvergenceScore = stats.avgConvergence;
                this.metrics.convergence.patternsDetected = stats.patternsFound;
            }
            
            // Coletar métricas de embeddings se disponível
            if (KC.EmbeddingService && KC.EmbeddingService.getStats) {
                const stats = KC.EmbeddingService.getStats();
                this.metrics.embeddings.generated = stats.generated || 0;
                this.metrics.embeddings.cached = stats.cached || 0;
            }
            
            // Verificar estado dos gates
            this.checkGatesStatus();
            
            console.log('📊 Métricas coletadas:', new Date().toLocaleTimeString());
        }

        /**
         * Verifica status dos gates
         */
        checkGatesStatus() {
            // Gate 1: Baseline
            try {
                const hasComponents = document.querySelectorAll('[data-component]').length > 0;
                if (hasComponents) {
                    this.metrics.gates.gate1Passes++;
                } else {
                    this.metrics.gates.gate1Fails++;
                }
            } catch (e) {
                this.metrics.gates.gate1Fails++;
            }
            
            // Gate 2: Dados Reais
            const realDataIndicator = !window.KC?.mockDataEnabled;
            if (realDataIndicator) {
                this.metrics.gates.gate2Passes++;
            } else {
                this.metrics.gates.gate2Fails++;
                this.createAlert('warning', 'Mock data detectado - Gate 2 falhou');
            }
            
            // Gate 3: Produção
            const noErrors = this.metrics.system.errors === 0;
            if (noErrors) {
                this.metrics.gates.gate3Passes++;
            } else {
                this.metrics.gates.gate3Fails++;
            }
            
            this.metrics.gates.lastValidation = new Date().toISOString();
        }

        /**
         * Verifica thresholds e cria alertas
         */
        checkThresholds() {
            // Convergência baixa
            if (this.metrics.convergence.avgConvergenceScore < this.thresholds.minConvergence) {
                this.createAlert('warning', 
                    `Convergência baixa: ${this.metrics.convergence.avgConvergenceScore.toFixed(1)}%`);
            }
            
            // Taxa de sucesso baixa
            if (this.metrics.performance.successRate < this.thresholds.minSuccessRate) {
                this.createAlert('error', 
                    `Taxa de sucesso baixa: ${this.metrics.performance.successRate.toFixed(1)}%`);
            }
            
            // Muitos erros
            if (this.metrics.system.errors > this.thresholds.maxErrors) {
                this.createAlert('critical', 
                    `Limite de erros excedido: ${this.metrics.system.errors}`);
            }
            
            // Response time alto
            if (this.metrics.performance.avgResponseTime > this.thresholds.maxResponseTime) {
                this.createAlert('warning', 
                    `Tempo de resposta alto: ${this.metrics.performance.avgResponseTime}ms`);
            }
        }

        /**
         * Cria alerta
         */
        createAlert(level, message) {
            const alert = {
                id: Date.now(),
                level: level,
                message: message,
                timestamp: new Date().toISOString(),
                resolved: false
            };
            
            this.alerts.push(alert);
            
            // Manter apenas últimos 100 alertas
            if (this.alerts.length > 100) {
                this.alerts = this.alerts.slice(-100);
            }
            
            // Emitir evento
            EventBus.emit('METRICS_ALERT', alert);
            
            // Log baseado no nível
            switch(level) {
                case 'critical':
                    console.error('🔴 ALERTA CRÍTICO:', message);
                    break;
                case 'error':
                    console.error('❌ ERRO:', message);
                    break;
                case 'warning':
                    console.warn('⚠️ AVISO:', message);
                    break;
                default:
                    console.log('ℹ️ INFO:', message);
            }
        }

        /**
         * Salva snapshot das métricas
         */
        saveSnapshot() {
            const snapshot = {
                timestamp: new Date().toISOString(),
                metrics: JSON.parse(JSON.stringify(this.metrics)),
                alerts: this.alerts.filter(a => !a.resolved).length
            };
            
            this.history.push(snapshot);
            
            // Manter apenas últimas 1000 entradas
            if (this.history.length > 1000) {
                this.history = this.history.slice(-1000);
            }
            
            // Salvar no localStorage
            try {
                localStorage.setItem('kc_metrics_history', JSON.stringify(this.history.slice(-100)));
            } catch (e) {
                console.warn('Não foi possível salvar histórico de métricas');
            }
        }

        /**
         * Registra listeners de eventos
         */
        registerEventListeners() {
            // Monitorar erros
            window.addEventListener('error', (e) => {
                this.metrics.system.errors++;
                this.metrics.performance.successRate = 
                    (this.metrics.performance.requests - this.metrics.system.errors) / 
                    this.metrics.performance.requests * 100;
            });
            
            // Monitorar performance de requisições
            if (window.performance && window.performance.getEntriesByType) {
                setInterval(() => {
                    const entries = performance.getEntriesByType('resource');
                    if (entries.length > 0) {
                        const avgTime = entries.reduce((sum, e) => sum + e.duration, 0) / entries.length;
                        this.metrics.performance.avgResponseTime = Math.round(avgTime);
                        this.metrics.performance.requests = entries.length;
                    }
                }, 10000);
            }
            
            // Monitorar eventos customizados
            EventBus.on('CONVERGENCE_ANALYZED', (data) => {
                this.metrics.convergence.documentsProcessed++;
                if (data.score) {
                    const current = this.metrics.convergence.avgConvergenceScore;
                    const count = this.metrics.convergence.documentsProcessed;
                    this.metrics.convergence.avgConvergenceScore = 
                        (current * (count - 1) + data.score) / count;
                }
            });
            
            EventBus.on('EMBEDDING_GENERATED', () => {
                this.metrics.embeddings.generated++;
            });
            
            EventBus.on('EMBEDDING_CACHED', () => {
                this.metrics.embeddings.cached++;
            });
        }

        /**
         * Gera relatório de métricas
         */
        generateReport() {
            const uptime = this.formatUptime(this.metrics.system.uptime);
            const gateSuccessRate = this.calculateGateSuccessRate();
            
            return {
                summary: {
                    uptime: uptime,
                    health: this.getSystemHealth(),
                    alerts: this.alerts.filter(a => !a.resolved).length,
                    lastCheck: this.metrics.system.lastCheck
                },
                performance: {
                    avgResponseTime: this.metrics.performance.avgResponseTime + 'ms',
                    successRate: this.metrics.performance.successRate.toFixed(1) + '%',
                    totalRequests: this.metrics.performance.requests
                },
                convergence: {
                    documentsProcessed: this.metrics.convergence.documentsProcessed,
                    avgScore: this.metrics.convergence.avgConvergenceScore.toFixed(1) + '%',
                    patternsDetected: this.metrics.convergence.patternsDetected
                },
                gates: {
                    successRate: gateSuccessRate.toFixed(1) + '%',
                    gate1: this.getGateStatus(1),
                    gate2: this.getGateStatus(2),
                    gate3: this.getGateStatus(3)
                },
                quality: {
                    utf8Preserved: this.metrics.quality.utf8Preserved + '%',
                    mockDataDetected: this.metrics.quality.mockDataDetected,
                    realDataProcessed: this.metrics.quality.realDataProcessed
                }
            };
        }

        /**
         * Calcula taxa de sucesso dos gates
         */
        calculateGateSuccessRate() {
            const totalPasses = this.metrics.gates.gate1Passes + 
                              this.metrics.gates.gate2Passes + 
                              this.metrics.gates.gate3Passes;
            const totalAttempts = totalPasses + 
                                this.metrics.gates.gate1Fails + 
                                this.metrics.gates.gate2Fails + 
                                this.metrics.gates.gate3Fails;
            
            return totalAttempts > 0 ? (totalPasses / totalAttempts) * 100 : 0;
        }

        /**
         * Obtém status de um gate
         */
        getGateStatus(gateNumber) {
            const passes = this.metrics.gates[`gate${gateNumber}Passes`];
            const fails = this.metrics.gates[`gate${gateNumber}Fails`];
            const total = passes + fails;
            
            if (total === 0) return 'N/A';
            
            const successRate = (passes / total) * 100;
            return {
                status: successRate >= 90 ? '✅' : successRate >= 70 ? '⚠️' : '❌',
                rate: successRate.toFixed(1) + '%',
                passes: passes,
                fails: fails
            };
        }

        /**
         * Calcula saúde do sistema
         */
        getSystemHealth() {
            let score = 100;
            
            // Penalizar por erros
            score -= this.metrics.system.errors * 2;
            
            // Penalizar por convergência baixa
            if (this.metrics.convergence.avgConvergenceScore < this.thresholds.minConvergence) {
                score -= 10;
            }
            
            // Penalizar por performance ruim
            if (this.metrics.performance.avgResponseTime > this.thresholds.maxResponseTime) {
                score -= 15;
            }
            
            // Penalizar por gates falhando
            const gateSuccess = this.calculateGateSuccessRate();
            if (gateSuccess < 80) {
                score -= 20;
            }
            
            score = Math.max(0, Math.min(100, score));
            
            if (score >= 90) return '🟢 Excelente';
            if (score >= 70) return '🟡 Bom';
            if (score >= 50) return '🟠 Regular';
            return '🔴 Crítico';
        }

        /**
         * Formata uptime
         */
        formatUptime(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days}d ${hours % 24}h`;
            if (hours > 0) return `${hours}h ${minutes % 60}m`;
            if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
            return `${seconds}s`;
        }

        /**
         * Exporta métricas para análise
         */
        exportMetrics() {
            const data = {
                timestamp: new Date().toISOString(),
                metrics: this.metrics,
                alerts: this.alerts,
                history: this.history.slice(-100),
                report: this.generateReport()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], 
                                 { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `metrics_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            console.log('📊 Métricas exportadas');
        }

        /**
         * Dashboard no console
         */
        showDashboard() {
            const report = this.generateReport();
            
            console.group('📊 DASHBOARD DE MÉTRICAS');
            console.log('🏥 Saúde:', report.summary.health);
            console.log('⏱️ Uptime:', report.summary.uptime);
            console.log('🚨 Alertas:', report.summary.alerts);
            
            console.group('Performance');
            console.table(report.performance);
            console.groupEnd();
            
            console.group('Convergência');
            console.table(report.convergence);
            console.groupEnd();
            
            console.group('Gates');
            console.log('Taxa de Sucesso:', report.gates.successRate);
            console.table({
                'Gate 1': report.gates.gate1,
                'Gate 2': report.gates.gate2,
                'Gate 3': report.gates.gate3
            });
            console.groupEnd();
            
            console.group('Qualidade');
            console.table(report.quality);
            console.groupEnd();
            
            console.groupEnd();
        }
    }

    // Registrar e iniciar
    KC.MetricsMonitor = new MetricsMonitor();
    
    // Adicionar comando global
    window.kcmetrics = function() {
        KC.MetricsMonitor.showDashboard();
    };
    
    console.log('✅ MetricsMonitor carregado');
    console.log('💡 Use kcmetrics() para ver o dashboard');

})(window);