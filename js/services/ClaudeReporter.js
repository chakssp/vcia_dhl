/**
 * 🤝 ClaudeReporter - Sistema de Co-pilotagem em Tempo Real
 * 
 * Captura e salva logs do console em arquivo para análise compartilhada
 * entre usuário e Claude durante execução do sistema.
 * 
 * Features:
 * - Toggle ON/OFF na navbar
 * - Captura logs, erros, warnings
 * - Monitora chamadas de API
 * - Salva em arquivo para Claude analisar
 * - Timestamps precisos
 * - Stack traces de erros
 */

class ClaudeReporter {
    constructor() {
        this.enabled = false;
        this.logs = [];
        this.sessionId = `CLAUDE-REPORT-${Date.now()}`;
        this.startTime = Date.now();
        this.apiCalls = [];
        this.errors = [];
        this.performance = {
            embeddings: [],
            qdrant: [],
            discoveries: []
        };
        
        // Salvar métodos originais do console
        this.originalConsole = {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
            info: console.info.bind(console),
            debug: console.debug.bind(console)
        };
        
        // Interceptar fetch para monitorar APIs
        this.originalFetch = window.fetch.bind(window);
        
        this.setupUI();
        this.checkAutoStart();
    }
    
    /**
     * Adiciona toggle na navbar
     */
    setupUI() {
        // Aguardar navbar carregar
        const checkNavbar = setInterval(() => {
            const navbar = document.querySelector('.main-nav');
            if (navbar) {
                clearInterval(checkNavbar);
                this.addToggleButton(navbar);
            }
        }, 500);
    }
    
    /**
     * Adiciona botão toggle na navbar
     */
    addToggleButton(navbar) {
        // Criar container do toggle
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'claude-reporter-toggle';
        toggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-left: auto;
            padding: 0 20px;
            border-left: 1px solid #ddd;
        `;
        
        // Label
        const label = document.createElement('span');
        label.textContent = '🤝 Claude Reporter';
        label.style.cssText = 'font-size: 14px; color: #666;';
        
        // Toggle switch
        const toggleSwitch = document.createElement('label');
        toggleSwitch.className = 'claude-toggle-switch';
        toggleSwitch.style.cssText = `
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        `;
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = this.enabled;
        input.style.cssText = 'opacity: 0; width: 0; height: 0;';
        
        const slider = document.createElement('span');
        slider.className = 'claude-slider';
        slider.style.cssText = `
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 24px;
        `;
        
        const sliderButton = document.createElement('span');
        sliderButton.style.cssText = `
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        `;
        
        slider.appendChild(sliderButton);
        toggleSwitch.appendChild(input);
        toggleSwitch.appendChild(slider);
        
        // Status indicator
        const status = document.createElement('span');
        status.id = 'claude-reporter-status';
        status.textContent = this.enabled ? 'ON' : 'OFF';
        status.style.cssText = `
            font-weight: bold;
            color: ${this.enabled ? '#4CAF50' : '#999'};
            font-size: 12px;
        `;
        
        // Event listener
        input.addEventListener('change', (e) => {
            this.toggle(e.target.checked);
            
            // Atualizar visual
            if (e.target.checked) {
                slider.style.backgroundColor = '#4CAF50';
                sliderButton.style.transform = 'translateX(26px)';
                status.textContent = 'ON';
                status.style.color = '#4CAF50';
            } else {
                slider.style.backgroundColor = '#ccc';
                sliderButton.style.transform = 'translateX(0)';
                status.textContent = 'OFF';
                status.style.color = '#999';
            }
        });
        
        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '📥';
        downloadBtn.title = 'Baixar relatório';
        downloadBtn.style.cssText = `
            background: none;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 16px;
        `;
        downloadBtn.onclick = () => this.downloadReport();
        
        // NOVO: Botão para salvar erros no projeto
        const saveErrorsBtn = document.createElement('button');
        saveErrorsBtn.textContent = '💾';
        saveErrorsBtn.title = 'Salvar erros no projeto';
        saveErrorsBtn.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 16px;
            margin-left: 5px;
        `;
        saveErrorsBtn.onclick = () => this.saveErrorsToProject();
        
        // Montar UI
        toggleContainer.appendChild(label);
        toggleContainer.appendChild(toggleSwitch);
        toggleContainer.appendChild(status);
        toggleContainer.appendChild(downloadBtn);
        toggleContainer.appendChild(saveErrorsBtn);
        
        navbar.appendChild(toggleContainer);
        
        console.log('🤝 Claude Reporter UI adicionado à navbar');
    }
    
    /**
     * Liga/desliga o reporter
     */
    toggle(state) {
        this.enabled = state;
        
        if (this.enabled) {
            this.start();
        } else {
            this.stop();
        }
        
        // Salvar preferência
        localStorage.setItem('claude-reporter-enabled', this.enabled);
    }
    
    /**
     * Inicia captura
     */
    start() {
        console.log('🟢 Claude Reporter INICIADO');
        this.sessionId = `CLAUDE-REPORT-${Date.now()}`;
        this.startTime = Date.now();
        this.logs = [];
        this.apiCalls = [];
        this.errors = [];
        
        // Adicionar log inicial
        this.addLog('system', '🟢 Claude Reporter iniciado', {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        });
        
        // Interceptar console
        this.interceptConsole();
        
        // Interceptar fetch
        this.interceptFetch();
        
        // Interceptar erros globais
        this.interceptErrors();
        
        // Salvar estado inicial
        this.captureInitialState();
    }
    
    /**
     * Para captura
     */
    stop() {
        console.log('🔴 Claude Reporter PARADO');
        
        // Restaurar console original
        this.restoreConsole();
        
        // Restaurar fetch original
        window.fetch = this.originalFetch;
        
        // Adicionar log final
        this.addLog('system', '🔴 Claude Reporter parado', {
            duration: Date.now() - this.startTime,
            totalLogs: this.logs.length,
            totalErrors: this.errors.length,
            totalAPICalls: this.apiCalls.length
        });
        
        // Salvar relatório final
        this.saveReport();
    }
    
    /**
     * Intercepta métodos do console
     */
    interceptConsole() {
        const methods = ['log', 'error', 'warn', 'info', 'debug'];
        
        methods.forEach(method => {
            console[method] = (...args) => {
                // Chamar método original
                this.originalConsole[method](...args);
                
                // Capturar para relatório
                if (this.enabled) {
                    this.addLog(method, args);
                    
                    // Se for erro, adicionar à lista de erros
                    if (method === 'error') {
                        this.errors.push({
                            timestamp: Date.now(),
                            message: args.join(' '),
                            stack: new Error().stack
                        });
                    }
                }
            };
        });
    }
    
    /**
     * Restaura console original
     */
    restoreConsole() {
        Object.keys(this.originalConsole).forEach(method => {
            console[method] = this.originalConsole[method];
        });
    }
    
    /**
     * Intercepta chamadas fetch
     */
    interceptFetch() {
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const [url, options = {}] = args;
            
            // Registrar chamada
            const callId = `API-${Date.now()}`;
            const apiCall = {
                id: callId,
                timestamp: startTime,
                url: url.toString(),
                method: options.method || 'GET',
                headers: options.headers,
                body: options.body ? this.truncateBody(options.body) : null,
                duration: null,
                status: null,
                error: null
            };
            
            if (this.enabled) {
                this.apiCalls.push(apiCall);
                
                // Log da chamada
                this.addLog('api', `🔄 API Call: ${apiCall.method} ${apiCall.url}`, {
                    callId,
                    method: apiCall.method,
                    url: apiCall.url
                });
            }
            
            try {
                // Fazer chamada real
                const response = await this.originalFetch(...args);
                
                // Atualizar métricas
                apiCall.duration = Date.now() - startTime;
                apiCall.status = response.status;
                
                if (this.enabled) {
                    // Log da resposta
                    this.addLog('api', `✅ API Response: ${response.status}`, {
                        callId,
                        status: response.status,
                        duration: apiCall.duration
                    });
                    
                    // Métricas específicas
                    if (url.includes('ollama')) {
                        this.performance.embeddings.push({
                            timestamp: startTime,
                            duration: apiCall.duration
                        });
                    } else if (url.includes('qdrant') || url.includes('qdr.vcia')) {
                        this.performance.qdrant.push({
                            timestamp: startTime,
                            duration: apiCall.duration,
                            operation: apiCall.method
                        });
                    }
                }
                
                return response;
                
            } catch (error) {
                apiCall.error = error.message;
                apiCall.duration = Date.now() - startTime;
                
                if (this.enabled) {
                    this.addLog('error', `❌ API Error: ${error.message}`, {
                        callId,
                        error: error.message,
                        duration: apiCall.duration
                    });
                }
                
                throw error;
            }
        };
    }
    
    /**
     * Intercepta erros globais
     */
    interceptErrors() {
        window.addEventListener('error', (event) => {
            if (this.enabled) {
                this.addLog('error', `❌ Global Error: ${event.message}`, {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                });
            }
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            if (this.enabled) {
                this.addLog('error', `❌ Unhandled Promise Rejection`, {
                    reason: event.reason,
                    promise: event.promise
                });
            }
        });
    }
    
    /**
     * Adiciona log ao buffer
     */
    addLog(type, message, data = null) {
        const logEntry = {
            timestamp: Date.now(),
            relativeTime: Date.now() - this.startTime,
            type,
            message: this.formatMessage(message),
            data
        };
        
        this.logs.push(logEntry);
        
        // Auto-save a cada 50 logs
        if (this.logs.length % 50 === 0) {
            this.saveReport();
        }
    }
    
    /**
     * Formata mensagem para log
     */
    formatMessage(message) {
        if (typeof message === 'string') return message;
        if (Array.isArray(message)) return message.map(m => this.formatMessage(m)).join(' ');
        if (typeof message === 'object') {
            try {
                return JSON.stringify(message, null, 2);
            } catch {
                return String(message);
            }
        }
        return String(message);
    }
    
    /**
     * Trunca body de requisições grandes
     */
    truncateBody(body) {
        const str = typeof body === 'string' ? body : JSON.stringify(body);
        if (str.length > 1000) {
            return str.substring(0, 1000) + '... [truncated]';
        }
        return str;
    }
    
    /**
     * Captura estado inicial do sistema
     */
    captureInitialState() {
        const state = {
            timestamp: Date.now(),
            kc: {
                filesLoaded: KC?.AppState?.get('files')?.length || 0,
                currentStep: KC?.AppController?.currentStep || 0,
                services: {
                    qdrant: !!KC?.QdrantService,
                    embedding: !!KC?.EmbeddingService,
                    rag: !!KC?.RAGExportManager
                }
            },
            localStorage: {
                size: JSON.stringify(localStorage).length,
                keys: Object.keys(localStorage).length
            },
            memory: performance.memory ? {
                usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
                totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
                limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
            } : null
        };
        
        this.addLog('system', '📊 Estado inicial capturado', state);
    }
    
    /**
     * Salva relatório em arquivo
     */
    saveReport() {
        const report = {
            sessionId: this.sessionId,
            startTime: new Date(this.startTime).toISOString(),
            duration: Date.now() - this.startTime,
            currentTime: new Date().toISOString(),
            url: window.location.href,
            summary: {
                totalLogs: this.logs.length,
                totalErrors: this.errors.length,
                totalAPICalls: this.apiCalls.length,
                avgAPITime: this.calculateAvgAPITime()
            },
            performance: this.performance,
            errors: this.errors,
            apiCalls: this.apiCalls.slice(-50), // Últimas 50 chamadas
            logs: this.logs.slice(-200), // Últimos 200 logs
            fullLogsAvailable: this.logs.length
        };
        
        // Salvar em localStorage
        const key = `claude-report-${this.sessionId}`;
        try {
            localStorage.setItem(key, JSON.stringify(report));
            localStorage.setItem('claude-report-latest', key);
        } catch (e) {
            console.error('Erro ao salvar relatório:', e);
            // Se localStorage estiver cheio, salvar versão reduzida
            const miniReport = {
                ...report,
                logs: this.logs.slice(-50),
                apiCalls: this.apiCalls.slice(-20)
            };
            localStorage.setItem(key, JSON.stringify(miniReport));
        }
        
        // NOVO: Salvar automaticamente em arquivo para Claude ler
        this.saveToFile(report);
    }
    
    /**
     * Salva automaticamente em arquivo JSON para Claude ler
     */
    saveToFile(report) {
        // LIMITAR DADOS para não estourar localStorage (max 5MB)
        const claudeReport = {
            ...report,
            // Limitar logs para últimos 100 (não TODOS)
            allLogs: this.logs.slice(-100),
            allErrors: this.errors.slice(-50),
            allAPICalls: this.apiCalls.slice(-20),
            
            // Estado detalhado do sistema
            systemState: {
                kcLoaded: typeof KC !== 'undefined',
                currentStep: KC?.AppController?.currentStep,
                filesLoaded: KC?.AppState?.get('files')?.length || 0,
                services: {
                    qdrant: !!KC?.QdrantService,
                    embedding: !!KC?.EmbeddingService,
                    enrichMethod: !!KC?.QdrantService?.enrichWithEmbeddings,
                    processMethod: !!KC?.QdrantService?.processAndInsertFile
                },
                ui: {
                    hasEmbeddingsButton: !!document.getElementById('btn-enrich-embeddings'),
                    hasTestButton: !!document.getElementById('btn-test-embeddings'),
                    currentPanel: document.querySelector('.organization-panel') ? 'OrganizationPanel' : 'Unknown'
                }
            }
        };
        
        // SALVAR DIRETO EM ARQUIVO FIXO PARA CLAUDE LER
        localStorage.setItem('CLAUDE_LIVE_REPORT', JSON.stringify(claudeReport));
        
        // Log discreto
        if (this.logs.length % 10 === 0) { // A cada 10 logs
            console.log(`📁 Report atualizado (${this.logs.length} logs, ${this.errors.length} erros)`);
        }
    }
    
    /**
     * SALVA ERROS DIRETO EM ARQUIVO NO PROJETO
     */
    async saveErrorsToProject() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `erros/error-report-${timestamp}.json`;
        
        // Preparar dados de erro
        const errorReport = {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            totalErrors: this.errors.length,
            totalLogs: this.logs.length,
            errors: this.errors,
            errorLogs: this.logs.filter(log => log.type === 'error'),
            warningLogs: this.logs.filter(log => log.type === 'warn'),
            lastAPICalls: this.apiCalls.slice(-10),
            systemState: {
                kcLoaded: typeof KC !== 'undefined',
                currentStep: KC?.AppController?.currentStep,
                filesLoaded: KC?.AppState?.get('files')?.length || 0
            }
        };
        
        // Criar blob
        const blob = new Blob([JSON.stringify(errorReport, null, 2)], { type: 'application/json' });
        
        // Usar File System Access API para salvar no projeto
        try {
            // Pedir handle do diretório
            const dirHandle = await window.showDirectoryPicker({
                startIn: 'documents',
                mode: 'readwrite'
            });
            
            // Criar pasta erros se não existir
            const errosDir = await dirHandle.getDirectoryHandle('erros', { create: true });
            
            // Criar arquivo
            const fileHandle = await errosDir.getFileHandle(`error-report-${timestamp}.json`, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            console.log(`✅ Erros salvos em: erros/error-report-${timestamp}.json`);
            alert(`Erros salvos em: erros/error-report-${timestamp}.json`);
            
        } catch (e) {
            // Fallback: baixar arquivo
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `error-report-${timestamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            console.log(`📥 Arquivo baixado: error-report-${timestamp}.json`);
            console.log('💡 Mova o arquivo para a pasta "erros" do projeto');
        }
        
        return errorReport;
    }
    
    /**
     * Calcula tempo médio de API
     */
    calculateAvgAPITime() {
        if (this.apiCalls.length === 0) return 0;
        const total = this.apiCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
        return Math.round(total / this.apiCalls.length);
    }
    
    /**
     * Baixa relatório como arquivo
     */
    downloadReport() {
        this.saveReport();
        
        const report = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            logs: this.logs,
            errors: this.errors,
            apiCalls: this.apiCalls,
            performance: this.performance
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-report-${this.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📥 Relatório baixado:', a.download);
    }
    
    /**
     * Verifica se deve iniciar automaticamente
     */
    checkAutoStart() {
        const autoStart = localStorage.getItem('claude-reporter-enabled') === 'true';
        if (autoStart) {
            setTimeout(() => {
                this.toggle(true);
                console.log('🤝 Claude Reporter iniciado automaticamente');
            }, 1000);
        }
    }
    
    /**
     * Obtém relatório atual
     */
    getCurrentReport() {
        return {
            sessionId: this.sessionId,
            enabled: this.enabled,
            logs: this.logs.length,
            errors: this.errors.length,
            apiCalls: this.apiCalls.length,
            uptime: Date.now() - this.startTime
        };
    }
    
    /**
     * Limpa relatórios antigos
     */
    cleanOldReports() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('claude-report-'));
        if (keys.length > 5) {
            // Manter apenas os 5 mais recentes
            keys.sort().slice(0, -5).forEach(key => {
                localStorage.removeItem(key);
            });
            console.log(`🧹 ${keys.length - 5} relatórios antigos removidos`);
        }
    }
}

// Inicializar automaticamente
window.ClaudeReporter = new ClaudeReporter();

// Expor funções úteis globalmente
window.getClaudeReport = () => {
    const key = localStorage.getItem('claude-report-latest');
    if (key) {
        return JSON.parse(localStorage.getItem(key));
    }
    return null;
};

window.claudeReport = (message, data) => {
    if (window.ClaudeReporter?.enabled) {
        window.ClaudeReporter.addLog('user', message, data);
        console.log(`📝 Claude Report: ${message}`, data || '');
    }
};

console.log('🤝 Claude Reporter carregado. Use o toggle na navbar para ativar.');