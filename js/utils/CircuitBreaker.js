/**
 * CircuitBreaker.js
 * 
 * Implementação do padrão Circuit Breaker para resiliência
 * Evita chamadas repetidas a serviços que estão falhando
 * 
 * Estados:
 * - CLOSED: Operação normal, requisições passam
 * - OPEN: Muitas falhas, bloqueia requisições
 * - HALF_OPEN: Testando se serviço voltou
 * 
 * @pattern Circuit Breaker
 * @priority P1
 */

class CircuitBreaker {
    constructor(options = {}) {
        // Configurações
        this.name = options.name || 'CircuitBreaker';
        this.failureThreshold = options.failureThreshold || 5;
        this.successThreshold = options.successThreshold || 2;
        this.timeout = options.timeout || 60000; // 60 segundos
        this.resetTimeout = options.resetTimeout || 30000; // 30 segundos
        
        // Estado
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = Date.now();
        this.lastFailureTime = null;
        
        // Estatísticas
        this.stats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            rejectedCalls: 0,
            stateChanges: []
        };
        
        // Callbacks opcionais
        this.onStateChange = options.onStateChange || null;
        this.onSuccess = options.onSuccess || null;
        this.onFailure = options.onFailure || null;
    }
    
    /**
     * Executa função protegida pelo circuit breaker
     * @param {Function} fn - Função async a executar
     * @returns {Promise<any>} Resultado da função
     * @throws {Error} Se circuit está aberto ou função falha
     */
    async execute(fn) {
        this.stats.totalCalls++;
        
        // Verificar estado do circuit
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                this.stats.rejectedCalls++;
                const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
                throw new Error(`Circuit breaker ${this.name} is OPEN. Retry in ${waitTime} seconds`);
            }
            
            // Tempo de espera passou, tentar half-open
            this.changeState('HALF_OPEN');
        }
        
        try {
            // Executar função com timeout
            const result = await this.executeWithTimeout(fn);
            
            this.recordSuccess();
            return result;
            
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }
    
    /**
     * Executa função com timeout
     * @private
     */
    async executeWithTimeout(fn) {
        return new Promise(async (resolve, reject) => {
            // Timer de timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${this.timeout}ms`));
            }, this.timeout);
            
            try {
                const result = await fn();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
    
    /**
     * Registra sucesso e atualiza estado
     * @private
     */
    recordSuccess() {
        this.stats.successfulCalls++;
        this.failures = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successes++;
            
            if (this.successes >= this.successThreshold) {
                this.changeState('CLOSED');
            }
        } else if (this.state === 'CLOSED') {
            // Reset contador de sucessos em estado fechado
            this.successes = 0;
        }
        
        // Callback opcional
        if (this.onSuccess) {
            this.onSuccess();
        }
    }
    
    /**
     * Registra falha e atualiza estado
     * @private
     */
    recordFailure() {
        this.stats.failedCalls++;
        this.failures++;
        this.lastFailureTime = Date.now();
        
        if (this.state === 'HALF_OPEN') {
            // Qualquer falha em half-open volta para open
            this.changeState('OPEN');
        } else if (this.state === 'CLOSED') {
            if (this.failures >= this.failureThreshold) {
                this.changeState('OPEN');
            }
        }
        
        // Callback opcional
        if (this.onFailure) {
            this.onFailure();
        }
    }
    
    /**
     * Muda estado do circuit breaker
     * @private
     */
    changeState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        // Registrar mudança
        this.stats.stateChanges.push({
            from: oldState,
            to: newState,
            timestamp: Date.now()
        });
        
        // Ações específicas por estado
        switch (newState) {
            case 'OPEN':
                this.nextAttempt = Date.now() + this.resetTimeout;
                this.successes = 0;
                console.warn(`⚠️ Circuit breaker ${this.name}: ${oldState} → OPEN`);
                console.warn(`   Próxima tentativa em ${this.resetTimeout/1000} segundos`);
                break;
                
            case 'HALF_OPEN':
                this.successes = 0;
                this.failures = 0;
                console.info(`🔄 Circuit breaker ${this.name}: ${oldState} → HALF_OPEN`);
                break;
                
            case 'CLOSED':
                this.failures = 0;
                this.successes = 0;
                console.log(`✅ Circuit breaker ${this.name}: ${oldState} → CLOSED`);
                break;
        }
        
        // Callback opcional
        if (this.onStateChange) {
            this.onStateChange(oldState, newState);
        }
    }
    
    /**
     * Força abertura do circuit (útil para manutenção)
     */
    trip() {
        if (this.state !== 'OPEN') {
            this.changeState('OPEN');
        }
    }
    
    /**
     * Força reset do circuit
     */
    reset() {
        if (this.state !== 'CLOSED') {
            this.changeState('CLOSED');
        }
        
        this.failures = 0;
        this.successes = 0;
    }
    
    /**
     * Obtém estado atual
     * @returns {Object} Estado e estatísticas
     */
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            nextAttempt: this.state === 'OPEN' ? this.nextAttempt : null,
            waitTime: this.state === 'OPEN' ? Math.max(0, this.nextAttempt - Date.now()) : 0
        };
    }
    
    /**
     * Obtém estatísticas
     * @returns {Object} Estatísticas completas
     */
    getStats() {
        return {
            ...this.stats,
            currentState: this.state,
            successRate: this.stats.totalCalls > 0 
                ? (this.stats.successfulCalls / this.stats.totalCalls * 100).toFixed(2) + '%'
                : '0%',
            config: {
                failureThreshold: this.failureThreshold,
                successThreshold: this.successThreshold,
                timeout: this.timeout,
                resetTimeout: this.resetTimeout
            }
        };
    }
    
    /**
     * Verifica se circuit está saudável
     * @returns {boolean} True se CLOSED ou pode tentar
     */
    isHealthy() {
        if (this.state === 'CLOSED') return true;
        if (this.state === 'HALF_OPEN') return true;
        if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) return true;
        return false;
    }
    
    /**
     * Calcula tempo de espera em segundos
     * @returns {number} Segundos até próxima tentativa
     */
    getWaitTime() {
        if (this.state !== 'OPEN') return 0;
        return Math.max(0, Math.ceil((this.nextAttempt - Date.now()) / 1000));
    }
}

// Classe helper para gerenciar múltiplos circuit breakers
class CircuitBreakerManager {
    constructor() {
        this.breakers = new Map();
    }
    
    /**
     * Cria ou obtém circuit breaker
     * @param {string} name - Nome do circuit
     * @param {Object} options - Opções de configuração
     * @returns {CircuitBreaker} Circuit breaker
     */
    getBreaker(name, options = {}) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker({
                ...options,
                name
            }));
        }
        return this.breakers.get(name);
    }
    
    /**
     * Obtém estatísticas de todos os breakers
     * @returns {Object} Mapa de estatísticas
     */
    getAllStats() {
        const stats = {};
        
        for (const [name, breaker] of this.breakers) {
            stats[name] = breaker.getStats();
        }
        
        return stats;
    }
    
    /**
     * Reseta todos os breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
    
    /**
     * Remove um breaker
     * @param {string} name - Nome do breaker
     */
    remove(name) {
        return this.breakers.delete(name);
    }
    
    /**
     * Limpa todos os breakers
     */
    clear() {
        this.breakers.clear();
    }
}

// Registrar no namespace KC
if (typeof window !== 'undefined') {
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KC = window.KnowledgeConsolidator;
    
    KC.CircuitBreaker = CircuitBreaker;
    KC.CircuitBreakerManager = CircuitBreakerManager;
    
    // Instância global do manager
    KC.breakers = new CircuitBreakerManager();
    
    console.log('CircuitBreaker registrado em KC.CircuitBreaker');
    console.log('CircuitBreakerManager registrado em KC.breakers');
    
    // Helper para debug
    window.kcbreakers = () => {
        const stats = KC.breakers.getAllStats();
        console.log('🔌 Circuit Breakers Status:');
        
        if (Object.keys(stats).length === 0) {
            console.log('   Nenhum circuit breaker ativo');
            return;
        }
        
        for (const [name, info] of Object.entries(stats)) {
            const emoji = info.currentState === 'CLOSED' ? '✅' : 
                         info.currentState === 'OPEN' ? '❌' : '🔄';
            console.log(`   ${emoji} ${name}: ${info.currentState}`);
            console.log(`      - Taxa de sucesso: ${info.successRate}`);
            console.log(`      - Chamadas: ${info.totalCalls} (${info.successfulCalls} ok, ${info.failedCalls} erro)`);
            
            if (info.currentState === 'OPEN') {
                const breaker = KC.breakers.getBreaker(name);
                console.log(`      - Próxima tentativa em: ${breaker.getWaitTime()}s`);
            }
        }
        
        return stats;
    };
}