/**
 * ServiceFactory.js
 * 
 * Factory Pattern para criação e gerenciamento de serviços
 * Garante inicialização correta e evita múltiplas instâncias
 * 
 * @pattern Factory Pattern
 * @priority P1
 */

class ServiceFactory {
    // Cache de serviços singleton
    static services = new Map();
    
    // Configurações padrão para cada serviço
    static defaultConfigs = {
        embedding: {
            ollama: {
                url: 'http://localhost:11434',
                model: 'nomic-embed-text',
                enabled: true
            },
            cache: {
                enabled: true,
                maxSize: 1000,
                ttl: 7 * 24 * 60 * 60 * 1000
            },
            dimensions: 768
        },
        qdrant: {
            baseUrl: 'http://qdr.vcia.com.br:6333',
            collectionName: 'knowledge_consolidator',
            vectorSize: 768,
            distance: 'Cosine',
            defaultLimit: 10,
            scoreThreshold: 0.7,
            timeout: 30000
        },
        similarity: {
            defaultLimit: 10,
            scoreThreshold: 0.7,
            cacheTimeout: 5 * 60 * 1000,
            weights: {
                semantic: 0.7,
                category: 0.2,
                relevance: 0.1
            }
        }
    };
    
    /**
     * Cria ou retorna instância singleton do EmbeddingService
     * @param {Object} config - Configuração personalizada (opcional)
     * @returns {Promise<EmbeddingService>} Serviço inicializado
     */
    static async createEmbeddingService(config = {}) {
        const serviceName = 'embedding';
        
        // Se já existe e está inicializado, retorna
        if (this.services.has(serviceName)) {
            const existing = this.services.get(serviceName);
            if (existing.initialized) {
                console.log('✅ EmbeddingService já inicializado, retornando instância existente');
                return existing;
            }
        }
        
        try {
            console.log('🔄 Criando novo EmbeddingService...');
            
            // Merge configuração customizada com padrão
            const mergedConfig = this.mergeConfig(this.defaultConfigs.embedding, config);
            
            // Usar classe do namespace KC
            const EmbeddingServiceClass = KC.EmbeddingServiceClass || window.EmbeddingService;
            
            if (!EmbeddingServiceClass) {
                throw new Error('EmbeddingService não está disponível');
            }
            
            // Criar nova instância
            const service = new EmbeddingServiceClass();
            
            // Aplicar configuração
            if (mergedConfig) {
                Object.assign(service.config, mergedConfig);
            }
            
            // Inicializar
            await service.initialize();
            
            // Cachear
            this.services.set(serviceName, service);
            
            console.log('✅ EmbeddingService criado e inicializado com sucesso');
            console.log('   - Ollama disponível:', service.ollamaAvailable);
            console.log('   - Dimensões:', service.config.dimensions);
            
            return service;
            
        } catch (error) {
            console.error('❌ Erro ao criar EmbeddingService:', error);
            throw error;
        }
    }
    
    /**
     * Cria ou retorna instância singleton do QdrantService
     * @param {Object} config - Configuração personalizada (opcional)
     * @returns {Promise<QdrantService>} Serviço inicializado
     */
    static async createQdrantService(config = {}) {
        const serviceName = 'qdrant';
        
        // Se já existe e está inicializado, retorna
        if (this.services.has(serviceName)) {
            const existing = this.services.get(serviceName);
            if (existing.initialized) {
                console.log('✅ QdrantService já inicializado, retornando instância existente');
                return existing;
            }
        }
        
        try {
            console.log('🔄 Criando novo QdrantService...');
            
            // Merge configuração customizada com padrão
            const mergedConfig = this.mergeConfig(this.defaultConfigs.qdrant, config);
            
            // Usar classe do namespace KC
            const QdrantServiceClass = KC.QdrantServiceClass || window.QdrantService;
            
            if (!QdrantServiceClass) {
                throw new Error('QdrantService não está disponível');
            }
            
            // Criar nova instância
            const service = new QdrantServiceClass();
            
            // Aplicar configuração
            if (mergedConfig) {
                Object.assign(service.config, mergedConfig);
            }
            
            // Inicializar
            await service.initialize();
            
            // Cachear
            this.services.set(serviceName, service);
            
            console.log('✅ QdrantService criado e inicializado com sucesso');
            console.log('   - Collection:', service.config.collectionName);
            console.log('   - URL:', service.config.baseUrl);
            
            return service;
            
        } catch (error) {
            console.error('❌ Erro ao criar QdrantService:', error);
            throw error;
        }
    }
    
    /**
     * Cria ou retorna instância singleton do SimilaritySearchService
     * @param {Object} config - Configuração personalizada (opcional)
     * @returns {Promise<SimilaritySearchService>} Serviço inicializado
     */
    static async createSimilaritySearchService(config = {}) {
        const serviceName = 'similarity';
        
        if (this.services.has(serviceName)) {
            const existing = this.services.get(serviceName);
            console.log('✅ SimilaritySearchService já existe, retornando instância');
            return existing;
        }
        
        try {
            console.log('🔄 Criando novo SimilaritySearchService...');
            
            // Não criar dependências aqui - elas devem ser criadas antes
            // Verificar se já existem
            if (!KC.EmbeddingService) {
                console.warn('⚠️ EmbeddingService não disponível, SimilaritySearchService terá funcionalidade limitada');
            }
            
            if (!KC.QdrantService) {
                console.warn('⚠️ QdrantService não disponível, SimilaritySearchService terá funcionalidade limitada');
            }
            
            // Usar classe do namespace KC
            const SimilaritySearchServiceClass = KC.SimilaritySearchServiceClass || window.SimilaritySearchService;
            
            if (!SimilaritySearchServiceClass) {
                throw new Error('SimilaritySearchService não está disponível');
            }
            
            // Criar nova instância
            const service = new SimilaritySearchServiceClass();
            
            // Merge configuração
            const mergedConfig = this.mergeConfig(this.defaultConfigs.similarity, config);
            if (mergedConfig) {
                Object.assign(service.config, mergedConfig);
            }
            
            // Inicializar se tiver método
            if (service.initialize) {
                await service.initialize();
            }
            
            // Cachear
            this.services.set(serviceName, service);
            
            console.log('✅ SimilaritySearchService criado com sucesso');
            
            return service;
            
        } catch (error) {
            console.error('❌ Erro ao criar SimilaritySearchService:', error);
            throw error;
        }
    }
    
    /**
     * Inicializa todos os serviços essenciais
     * @returns {Promise<Object>} Mapa de serviços inicializados
     */
    static async initializeAll() {
        console.log('🚀 Inicializando todos os serviços...');
        
        const results = {
            embedding: null,
            qdrant: null,
            similarity: null,
            errors: []
        };
        
        // EmbeddingService (essencial)
        try {
            results.embedding = await this.createEmbeddingService();
            // Registrar IMEDIATAMENTE no KC para que outros serviços possam usar
            if (results.embedding) {
                KC.EmbeddingService = results.embedding;
                console.log('   ✅ EmbeddingService registrado em KC.EmbeddingService');
            }
        } catch (error) {
            console.error('Erro ao inicializar EmbeddingService:', error);
            results.errors.push({ service: 'embedding', error: error.message });
        }
        
        // QdrantService (importante mas não crítico)
        try {
            results.qdrant = await this.createQdrantService();
            // Registrar IMEDIATAMENTE no KC
            if (results.qdrant) {
                KC.QdrantService = results.qdrant;
                console.log('   ✅ QdrantService registrado em KC.QdrantService');
            }
        } catch (error) {
            console.error('Erro ao inicializar QdrantService:', error);
            results.errors.push({ service: 'qdrant', error: error.message });
        }
        
        // SimilaritySearchService (opcional) - agora as dependências já estão em KC
        if (results.embedding && results.qdrant) {
            try {
                results.similarity = await this.createSimilaritySearchService();
                if (results.similarity) {
                    KC.SimilaritySearchService = results.similarity;
                    console.log('   ✅ SimilaritySearchService registrado em KC.SimilaritySearchService');
                }
            } catch (error) {
                console.error('Erro ao inicializar SimilaritySearchService:', error);
                results.errors.push({ service: 'similarity', error: error.message });
            }
        }
        
        console.log('📊 Resumo da inicialização:');
        console.log('   - EmbeddingService:', results.embedding ? '✅' : '❌');
        console.log('   - QdrantService:', results.qdrant ? '✅' : '❌');
        console.log('   - SimilaritySearchService:', results.similarity ? '✅' : '❌');
        
        if (results.errors.length > 0) {
            console.warn('⚠️ Alguns serviços falharam:', results.errors);
        }
        
        return results;
    }
    
    /**
     * Obtém serviço já inicializado
     * @param {string} serviceName - Nome do serviço
     * @returns {Object|null} Serviço ou null se não existir
     */
    static getService(serviceName) {
        return this.services.get(serviceName) || null;
    }
    
    /**
     * Verifica se serviço está disponível e inicializado
     * @param {string} serviceName - Nome do serviço
     * @returns {boolean} True se disponível e inicializado
     */
    static isServiceAvailable(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) return false;
        
        // Verificar se tem propriedade initialized
        if ('initialized' in service) {
            return service.initialized === true;
        }
        
        // Se não tem a propriedade, assumir que está ok
        return true;
    }
    
    /**
     * Reseta todos os serviços (útil para testes)
     */
    static reset() {
        console.log('🔄 Resetando todos os serviços...');
        this.services.clear();
    }
    
    /**
     * Merge configuração customizada com padrão
     * @private
     */
    static mergeConfig(defaultConfig, customConfig) {
        if (!customConfig || Object.keys(customConfig).length === 0) {
            return defaultConfig;
        }
        
        // Deep merge simples
        const merged = { ...defaultConfig };
        
        for (const key in customConfig) {
            if (typeof customConfig[key] === 'object' && !Array.isArray(customConfig[key])) {
                merged[key] = { ...merged[key], ...customConfig[key] };
            } else {
                merged[key] = customConfig[key];
            }
        }
        
        return merged;
    }
    
    /**
     * Obtém estatísticas dos serviços
     * @returns {Object} Estatísticas consolidadas
     */
    static getStats() {
        const stats = {
            services: {},
            total: this.services.size
        };
        
        for (const [name, service] of this.services) {
            stats.services[name] = {
                initialized: service.initialized || false,
                available: this.isServiceAvailable(name)
            };
            
            // Adicionar stats específicas se disponíveis
            if (service.getStats) {
                stats.services[name].details = service.getStats();
            }
        }
        
        return stats;
    }
}

// Registrar no namespace KC
if (typeof window !== 'undefined') {
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KC = window.KnowledgeConsolidator;
    
    KC.ServiceFactory = ServiceFactory;
    
    console.log('ServiceFactory registrado em KC.ServiceFactory');
    
    // Adicionar helper global para debug
    window.kcservices = () => {
        const stats = ServiceFactory.getStats();
        console.log('📊 Status dos Serviços:');
        console.log('   Total de serviços:', stats.total);
        
        for (const [name, info] of Object.entries(stats.services)) {
            console.log(`   ${name}:`, info.initialized ? '✅ Inicializado' : '❌ Não inicializado');
            if (info.details) {
                console.log(`      - Detalhes:`, info.details);
            }
        }
        
        return stats;
    };
}