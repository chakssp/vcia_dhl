/**
 * 🐛 ERROR AUTO-SAVE - Salva erros automaticamente como "Report Bug"
 * 
 * EXATAMENTE como sistema de report de bug - captura tudo automaticamente
 * e salva em arquivo no projeto, sem precisar copiar/colar nada!
 */

class ErrorAutoSave {
    constructor() {
        this.errorCount = 0;
        this.setupBugReportButton();
    }
    
    setupBugReportButton() {
        // Esperar navbar carregar
        const checkNavbar = setInterval(() => {
            const navbar = document.querySelector('.main-nav');
            if (navbar) {
                clearInterval(checkNavbar);
                this.addBugButton(navbar);
            }
        }, 500);
    }
    
    addBugButton(navbar) {
        // Botão REPORT BUG vermelho
        const bugButton = document.createElement('button');
        bugButton.id = 'bug-report-btn';
        bugButton.innerHTML = '🐛 REPORT BUG';
        bugButton.style.cssText = `
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-left: 10px;
            animation: pulse 2s infinite;
        `;
        
        // Adicionar animação pulse
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Click = salvar automaticamente
        bugButton.onclick = () => this.reportBug();
        
        navbar.appendChild(bugButton);
        console.log('🐛 Botão REPORT BUG adicionado');
    }
    
    async reportBug() {
        console.log('🐛 CAPTURANDO BUG REPORT...');
        
        // Capturar TUDO automaticamente
        const bugReport = {
            // Metadados
            id: `BUG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            
            // Erros do ClaudeReporter
            claudeReporter: this.getClaudeReporterData(),
            
            // Erros do console
            consoleErrors: this.captureConsoleErrors(),
            
            // Estado do sistema KC
            systemState: {
                kcLoaded: typeof KC !== 'undefined',
                currentStep: KC?.AppController?.currentStep || 'unknown',
                filesCount: KC?.AppState?.get('files')?.length || 0,
                services: {
                    qdrant: !!KC?.QdrantService,
                    embedding: !!KC?.EmbeddingService,
                    qdrantConnected: KC?.QdrantService?.initialized || false,
                    ollamaAvailable: KC?.EmbeddingService?.ollamaAvailable || false
                }
            },
            
            // Performance
            performance: {
                memory: performance.memory ? {
                    used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
                    total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
                } : null
            },
            
            // LocalStorage snapshot
            localStorage: {
                size: JSON.stringify(localStorage).length,
                keys: Object.keys(localStorage)
            }
        };
        
        // Salvar em arquivo JavaScript
        const filename = `bug-report-${Date.now()}.js`;
        const content = `/**
 * 🐛 BUG REPORT AUTOMÁTICO
 * Gerado: ${bugReport.timestamp}
 * ID: ${bugReport.id}
 */

const bugReport = ${JSON.stringify(bugReport, null, 2)};

// Resumo dos erros
console.log('🐛 BUG REPORT: ${bugReport.id}');
console.log('Timestamp:', '${bugReport.timestamp}');
console.log('Total de erros:', ${bugReport.claudeReporter?.errors?.length || 0});

// Para Claude analisar
export default bugReport;
`;
        
        // Download automático
        const blob = new Blob([content], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Feedback visual
        const button = document.getElementById('bug-report-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '✅ SALVO!';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '#dc3545';
        }, 2000);
        
        console.log(`✅ Bug report salvo: ${filename}`);
        console.log(`📁 Mova para: F:\\vcia-1307\\vcia_dhl\\erros\\`);
        
        return bugReport;
    }
    
    getClaudeReporterData() {
        // Pegar do localStorage se ClaudeReporter salvou
        const savedReport = localStorage.getItem('CLAUDE_LIVE_REPORT');
        if (savedReport) {
            const data = JSON.parse(savedReport);
            return {
                errors: data.allErrors || [],
                errorLogs: (data.allLogs || []).filter(log => log.type === 'error'),
                warnings: (data.allLogs || []).filter(log => log.type === 'warn'),
                apiErrors: (data.allAPICalls || []).filter(call => call.error)
            };
        }
        
        // Fallback: pegar direto do ClaudeReporter se estiver ativo
        if (window.ClaudeReporter) {
            return {
                errors: window.ClaudeReporter.errors || [],
                logs: window.ClaudeReporter.logs || [],
                enabled: window.ClaudeReporter.enabled
            };
        }
        
        return null;
    }
    
    captureConsoleErrors() {
        // Capturar erros recentes do console (se disponível)
        const errors = [];
        
        // Tentar pegar do ClaudeReporter
        if (window.ClaudeReporter?.errors) {
            return window.ClaudeReporter.errors;
        }
        
        return errors;
    }
}

// Inicializar automaticamente
window.ErrorAutoSave = new ErrorAutoSave();

// Atalho global
window.reportBug = () => window.ErrorAutoSave.reportBug();

console.log('🐛 ERROR AUTO-SAVE carregado!');
console.log('   Use o botão vermelho "REPORT BUG" na navbar');
console.log('   Ou execute: reportBug()');