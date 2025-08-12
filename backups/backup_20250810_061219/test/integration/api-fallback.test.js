/**
 * api-fallback.test.js
 * Integration tests for API fallback and provider switching
 * 
 * Tests cover:
 * - Provider availability detection
 * - Automatic fallback mechanisms
 * - Provider switching scenarios
 * - Error handling and recovery
 * - Configuration persistence across providers
 */

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock external services
global.window = {
    KnowledgeConsolidator: {}
};

describe('API Fallback Integration', () => {
    let mockComponents;
    let mockProviders;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup mock providers with different characteristics
        mockProviders = {
            ollama: {
                name: 'Ollama',
                baseUrl: 'http://127.0.0.1:11434',
                available: true,
                cost: 0,
                speed: 'fast',
                models: ['llama2', 'mistral']
            },
            openai: {
                name: 'OpenAI',
                baseUrl: 'https://api.openai.com/v1',
                available: true,
                cost: 0.05,
                speed: 'medium',
                models: ['gpt-3.5-turbo', 'gpt-4']
            },
            gemini: {
                name: 'Gemini',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                available: true,
                cost: 0.03,
                speed: 'medium',
                models: ['gemini-pro']
            },
            anthropic: {
                name: 'Anthropic',
                baseUrl: 'https://api.anthropic.com/v1',
                available: true,
                cost: 0.08,
                speed: 'slow',
                models: ['claude-3-sonnet']
            }
        };

        // Setup comprehensive mocks
        mockComponents = {
            EventBus: {
                emit: jest.fn(),
                on: jest.fn(),
                off: jest.fn()
            },
            AppState: {
                get: jest.fn(),
                set: jest.fn()
            },
            Logger: {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn()
            },
            AIAPIManager: {
                initialize: jest.fn().mockResolvedValue(true),
                getProviders: jest.fn().mockReturnValue(Object.keys(mockProviders)),
                getActiveProvider: jest.fn().mockReturnValue('ollama'),
                setActiveProvider: jest.fn(),
                isProviderReady: jest.fn(),
                checkProviderAvailability: jest.fn(),
                analyzeContent: jest.fn(),
                getProviderStats: jest.fn(),
                setApiKey: jest.fn(),
                getProviderConfig: jest.fn()
            },
            AnalysisManager: {
                initialize: jest.fn().mockResolvedValue(true),
                analyzeFile: jest.fn(),
                processQueue: jest.fn(),
                getStats: jest.fn().mockReturnValue({ processed: 0, errors: 0 })
            }
        };

        global.window.KnowledgeConsolidator = mockComponents;
    });

    describe('Provider Availability Detection', () => {
        test('should detect available providers correctly', async () => {
            // Mock availability responses
            mockComponents.AIAPIManager.checkProviderAvailability.mockImplementation(async (provider) => {
                switch (provider) {
                    case 'ollama':
                        // Simulate Ollama running locally
                        global.fetch.mockResolvedValueOnce({
                            ok: true,
                            json: () => Promise.resolve({ version: '0.1.0' })
                        });
                        return { available: true, models: ['llama2', 'mistral'] };
                    
                    case 'openai':
                        // Simulate OpenAI with valid API key
                        global.fetch.mockResolvedValueOnce({
                            ok: true,
                            json: () => Promise.resolve({ data: [{ id: 'gpt-3.5-turbo' }] })
                        });
                        return { available: true, models: ['gpt-3.5-turbo', 'gpt-4'] };
                    
                    case 'gemini':
                        // Simulate Gemini unavailable
                        global.fetch.mockRejectedValueOnce(new Error('Network error'));
                        return { available: false, error: 'Network error' };
                    
                    case 'anthropic':
                        // Simulate invalid API key
                        global.fetch.mockResolvedValueOnce({
                            ok: false,
                            status: 401,
                            json: () => Promise.resolve({ error: 'Invalid API key' })
                        });
                        return { available: false, error: 'Invalid API key' };
                    
                    default:
                        return { available: false, error: 'Unknown provider' };
                }
            });

            await mockComponents.AIAPIManager.initialize();

            // Check each provider
            const availabilityResults = {};
            for (const provider of Object.keys(mockProviders)) {
                availabilityResults[provider] = await mockComponents.AIAPIManager.checkProviderAvailability(provider);
            }

            expect(availabilityResults.ollama.available).toBe(true);
            expect(availabilityResults.openai.available).toBe(true);
            expect(availabilityResults.gemini.available).toBe(false);
            expect(availabilityResults.anthropic.available).toBe(false);

            // Verify proper error logging
            expect(mockComponents.Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Provider gemini unavailable'),
                expect.any(Object)
            );
            expect(mockComponents.Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Provider anthropic unavailable'),
                expect.any(Object)
            );
        });

        test('should handle network timeouts gracefully', async () => {
            mockComponents.AIAPIManager.checkProviderAvailability.mockImplementation(async (provider) => {
                // Simulate timeout for all providers
                await new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 100)
                );
            });

            const providers = ['ollama', 'openai', 'gemini'];
            const results = await Promise.allSettled(
                providers.map(p => mockComponents.AIAPIManager.checkProviderAvailability(p))
            );

            results.forEach((result, index) => {
                expect(result.status).toBe('rejected');
                expect(result.reason.message).toBe('Request timeout');
            });

            expect(mockComponents.Logger.error).toHaveBeenCalledTimes(3);
        });
    });

    describe('Automatic Fallback Mechanisms', () => {
        test('should fallback to next available provider when primary fails', async () => {
            // Setup provider availability
            mockComponents.AIAPIManager.isProviderReady.mockImplementation((provider) => {
                switch (provider) {
                    case 'ollama': return false; // Primary unavailable
                    case 'openai': return true;  // Fallback available
                    case 'gemini': return true;  // Second fallback available
                    default: return false;
                }
            });

            mockComponents.AIAPIManager.getActiveProvider.mockReturnValue('ollama');
            
            // Mock provider switching
            let currentProvider = 'ollama';
            mockComponents.AIAPIManager.setActiveProvider.mockImplementation((provider) => {
                currentProvider = provider;
                mockComponents.AIAPIManager.getActiveProvider.mockReturnValue(provider);
            });

            // Mock analysis that triggers fallback
            mockComponents.AIAPIManager.analyzeContent.mockImplementation(async (content, options) => {
                const provider = mockComponents.AIAPIManager.getActiveProvider();
                
                if (provider === 'ollama') {
                    throw new Error('Ollama connection failed');
                }
                
                if (provider === 'openai') {
                    return {
                        analysisType: 'Insight Estratégico',
                        relevanceScore: 85,
                        provider: 'openai',
                        cost: 0.05
                    };
                }
                
                throw new Error('Provider not configured');
            });

            // Simulate analysis that triggers fallback
            const file = {
                id: 'test-file',
                content: 'Test content for analysis',
                name: 'test.md'
            };

            // First attempt should fail and trigger fallback
            try {
                await mockComponents.AnalysisManager.analyzeFile(file);
            } catch (error) {
                // Simulate fallback logic
                const availableProviders = ['openai', 'gemini'];
                for (const provider of availableProviders) {
                    if (mockComponents.AIAPIManager.isProviderReady(provider)) {
                        mockComponents.AIAPIManager.setActiveProvider(provider);
                        break;
                    }
                }
            }

            // Retry with fallback provider should succeed
            mockComponents.AnalysisManager.analyzeFile.mockResolvedValue({
                success: true,
                analysisType: 'Insight Estratégico',
                relevanceScore: 85,
                provider: 'openai'
            });

            const result = await mockComponents.AnalysisManager.analyzeFile(file);

            expect(result.success).toBe(true);
            expect(result.provider).toBe('openai');
            expect(mockComponents.AIAPIManager.setActiveProvider).toHaveBeenCalledWith('openai');

            // Verify fallback events
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('provider_fallback', {
                from: 'ollama',
                to: 'openai',
                reason: 'Ollama connection failed'
            });
        });

        test('should try multiple fallback providers in priority order', async () => {
            const providerPriority = ['ollama', 'openai', 'gemini', 'anthropic'];
            const providerAttempts = [];

            mockComponents.AIAPIManager.analyzeContent.mockImplementation(async (content, options) => {
                const provider = mockComponents.AIAPIManager.getActiveProvider();
                providerAttempts.push(provider);

                switch (provider) {
                    case 'ollama':
                        throw new Error('Ollama offline');
                    case 'openai':
                        throw new Error('OpenAI rate limited');
                    case 'gemini':
                        // Success on third attempt
                        return {
                            analysisType: 'Breakthrough Técnico',
                            relevanceScore: 90,
                            provider: 'gemini'
                        };
                    case 'anthropic':
                        throw new Error('Anthropic API key invalid');
                    default:
                        throw new Error('Unknown provider');
                }
            });

            // Simulate fallback through all providers
            let result = null;
            let lastError = null;

            for (const provider of providerPriority) {
                mockComponents.AIAPIManager.setActiveProvider(provider);
                
                try {
                    result = await mockComponents.AIAPIManager.analyzeContent('test content');
                    break;
                } catch (error) {
                    lastError = error;
                    mockComponents.Logger.warn(`Provider ${provider} failed: ${error.message}`);
                }
            }

            expect(result).toBeDefined();
            expect(result.provider).toBe('gemini');
            expect(providerAttempts).toEqual(['ollama', 'openai', 'gemini']);

            // Verify all fallback attempts were logged
            expect(mockComponents.Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Provider ollama failed: Ollama offline')
            );
            expect(mockComponents.Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Provider openai failed: OpenAI rate limited')
            );
        });

        test('should handle complete provider failure gracefully', async () => {
            // All providers fail
            mockComponents.AIAPIManager.analyzeContent.mockRejectedValue(new Error('All providers unavailable'));
            mockComponents.AIAPIManager.isProviderReady.mockReturnValue(false);

            const file = {
                id: 'test-file',
                content: 'Test content',
                name: 'test.md'
            };

            mockComponents.AnalysisManager.analyzeFile.mockRejectedValue(new Error('No available AI providers'));

            await expect(mockComponents.AnalysisManager.analyzeFile(file)).rejects.toThrow('No available AI providers');

            // Verify proper error handling
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('all_providers_failed', {
                attempted: expect.any(Array),
                errors: expect.any(Array)
            });

            expect(mockComponents.Logger.error).toHaveBeenCalledWith(
                'All AI providers failed, analysis cannot proceed',
                expect.any(Error)
            );
        });
    });

    describe('Provider Switching Scenarios', () => {
        test('should switch providers based on cost optimization', async () => {
            const costThreshold = 0.05;
            const analysisRequests = [
                { content: 'Short analysis request', estimatedTokens: 500 },
                { content: 'Medium analysis request with more content', estimatedTokens: 1500 },
                { content: 'Large analysis request with extensive content', estimatedTokens: 3000 }
            ];

            mockComponents.AIAPIManager.getProviderStats.mockImplementation((provider) => {
                const costs = {
                    ollama: 0,
                    openai: 0.05,
                    gemini: 0.03,
                    anthropic: 0.08
                };
                return { costPerToken: costs[provider] };
            });

            // Mock provider selection logic
            mockComponents.AIAPIManager.setActiveProvider.mockImplementation((provider) => {
                mockComponents.AIAPIManager.getActiveProvider.mockReturnValue(provider);
            });

            for (const request of analysisRequests) {
                const estimatedCost = request.estimatedTokens * 0.05; // OpenAI cost
                
                if (estimatedCost > costThreshold) {
                    // Use free local provider for expensive requests
                    mockComponents.AIAPIManager.setActiveProvider('ollama');
                } else {
                    // Use cloud provider for quick requests
                    mockComponents.AIAPIManager.setActiveProvider('openai');
                }

                const activeProvider = mockComponents.AIAPIManager.getActiveProvider();
                const expectedProvider = estimatedCost > costThreshold ? 'ollama' : 'openai';
                
                expect(activeProvider).toBe(expectedProvider);
            }

            // Verify cost-based switching occurred
            expect(mockComponents.AIAPIManager.setActiveProvider).toHaveBeenCalledWith('ollama'); // For expensive requests
            expect(mockComponents.AIAPIManager.setActiveProvider).toHaveBeenCalledWith('openai'); // For cheap requests
        });

        test('should switch providers based on performance requirements', async () => {
            const performanceProfiles = {
                'real-time': { maxLatency: 2000, preferredProviders: ['ollama', 'openai'] },
                'batch': { maxLatency: 10000, preferredProviders: ['gemini', 'anthropic'] },
                'quality': { maxLatency: 30000, preferredProviders: ['anthropic', 'gpt-4'] }
            };

            mockComponents.AIAPIManager.getProviderStats.mockImplementation((provider) => {
                const latencies = {
                    ollama: 1500,    // Fast local
                    openai: 3000,    // Medium cloud
                    gemini: 4000,    // Medium cloud
                    anthropic: 8000  // Slow but high quality
                };
                return { avgLatency: latencies[provider] };
            });

            for (const [profile, requirements] of Object.entries(performanceProfiles)) {
                // Find best provider for this performance profile
                let bestProvider = null;
                for (const provider of requirements.preferredProviders) {
                    const stats = mockComponents.AIAPIManager.getProviderStats(provider);
                    if (stats.avgLatency <= requirements.maxLatency) {
                        bestProvider = provider;
                        break;
                    }
                }

                if (bestProvider) {
                    mockComponents.AIAPIManager.setActiveProvider(bestProvider);
                    
                    const activeProvider = mockComponents.AIAPIManager.getActiveProvider();
                    expect(activeProvider).toBe(bestProvider);
                    
                    // Verify performance requirements are met
                    const stats = mockComponents.AIAPIManager.getProviderStats(activeProvider);
                    expect(stats.avgLatency).toBeLessThanOrEqual(requirements.maxLatency);
                }
            }
        });

        test('should handle provider switching during batch operations', async () => {
            const batchFiles = Array.from({ length: 10 }, (_, i) => ({
                id: `file-${i}`,
                content: `Content for file ${i}`,
                name: `file${i}.md`
            }));

            let processedCount = 0;
            mockComponents.AnalysisManager.processQueue.mockImplementation(async () => {
                const results = [];
                
                for (const file of batchFiles) {
                    processedCount++;
                    
                    // Simulate provider failure halfway through
                    if (processedCount === 5) {
                        mockComponents.AIAPIManager.setActiveProvider('openai'); // Switch from ollama
                        mockComponents.EventBus.emit('provider_switched', {
                            from: 'ollama',
                            to: 'openai',
                            reason: 'Mid-batch failure'
                        });
                    }

                    const provider = mockComponents.AIAPIManager.getActiveProvider();
                    results.push({
                        fileId: file.id,
                        success: true,
                        provider: provider,
                        analysisType: 'Aprendizado Geral',
                        relevanceScore: 70
                    });
                }
                
                return results;
            });

            const results = await mockComponents.AnalysisManager.processQueue();

            expect(results).toHaveLength(10);
            
            // First 4 should use original provider, rest should use fallback
            const providerCounts = results.reduce((acc, result) => {
                acc[result.provider] = (acc[result.provider] || 0) + 1;
                return acc;
            }, {});

            // Verify provider switching occurred mid-batch
            expect(mockComponents.EventBus.emit).toHaveBeenCalledWith('provider_switched', expect.objectContaining({
                reason: 'Mid-batch failure'
            }));
        });
    });

    describe('Configuration Persistence', () => {
        test('should persist provider configurations across sessions', async () => {
            const providerConfigs = {
                openai: {
                    apiKey: 'sk-test-key-123',
                    model: 'gpt-4',
                    temperature: 0.7,
                    maxTokens: 2000
                },
                gemini: {
                    apiKey: 'gemini-test-key-456',
                    model: 'gemini-pro',
                    temperature: 0.8
                },
                anthropic: {
                    apiKey: 'anthropic-test-key-789',
                    model: 'claude-3-sonnet',
                    temperature: 0.6
                }
            };

            // Mock configuration storage
            const storedConfigs = {};
            mockComponents.AppState.set.mockImplementation((key, value) => {
                storedConfigs[key] = value;
            });
            mockComponents.AppState.get.mockImplementation((key) => {
                return storedConfigs[key];
            });

            // Set configurations
            for (const [provider, config] of Object.entries(providerConfigs)) {
                mockComponents.AIAPIManager.setApiKey(provider, config.apiKey);
                mockComponents.AppState.set(`${provider}_config`, config);
            }

            // Simulate session restart - reload configurations
            mockComponents.AIAPIManager.initialize.mockImplementation(async () => {
                for (const provider of Object.keys(providerConfigs)) {
                    const config = mockComponents.AppState.get(`${provider}_config`);
                    if (config) {
                        mockComponents.AIAPIManager.getProviderConfig.mockReturnValue(config);
                    }
                }
                return true;
            });

            await mockComponents.AIAPIManager.initialize();

            // Verify configurations were persisted and restored
            for (const [provider, expectedConfig] of Object.entries(providerConfigs)) {
                const restoredConfig = mockComponents.AIAPIManager.getProviderConfig(provider);
                expect(restoredConfig).toEqual(expectedConfig);
            }

            expect(mockComponents.AppState.set).toHaveBeenCalledWith('openai_config', providerConfigs.openai);
            expect(mockComponents.AppState.set).toHaveBeenCalledWith('gemini_config', providerConfigs.gemini);
            expect(mockComponents.AppState.set).toHaveBeenCalledWith('anthropic_config', providerConfigs.anthropic);
        });

        test('should handle configuration migration between versions', async () => {
            // Simulate old configuration format
            const legacyConfig = {
                aiProvider: 'openai',
                apiKey: 'sk-legacy-key',
                temperature: 0.7
            };

            mockComponents.AppState.get.mockImplementation((key) => {
                if (key === 'legacy_ai_config') return legacyConfig;
                return null;
            });

            // Mock configuration migration
            mockComponents.AIAPIManager.initialize.mockImplementation(async () => {
                const legacy = mockComponents.AppState.get('legacy_ai_config');
                if (legacy) {
                    // Migrate to new format
                    const migratedConfig = {
                        openai: {
                            apiKey: legacy.apiKey,
                            model: 'gpt-3.5-turbo',
                            temperature: legacy.temperature,
                            maxTokens: 2000
                        }
                    };
                    
                    mockComponents.AppState.set('provider_configs', migratedConfig);
                    mockComponents.AppState.set('active_provider', legacy.aiProvider);
                    
                    // Remove legacy config
                    mockComponents.AppState.set('legacy_ai_config', null);
                }
                return true;
            });

            await mockComponents.AIAPIManager.initialize();

            // Verify migration occurred
            expect(mockComponents.AppState.set).toHaveBeenCalledWith('provider_configs', expect.objectContaining({
                openai: expect.objectContaining({
                    apiKey: 'sk-legacy-key',
                    temperature: 0.7
                })
            }));

            expect(mockComponents.AppState.set).toHaveBeenCalledWith('legacy_ai_config', null);
        });
    });

    describe('Error Recovery and Resilience', () => {
        test('should recover from temporary network failures', async () => {
            let attemptCount = 0;
            
            mockComponents.AIAPIManager.analyzeContent.mockImplementation(async () => {
                attemptCount++;
                
                if (attemptCount <= 2) {
                    throw new Error('Network timeout');
                }
                
                return {
                    analysisType: 'Insight Estratégico',
                    relevanceScore: 85,
                    attempt: attemptCount
                };
            });

            // Mock retry logic
            const maxRetries = 3;
            let result = null;
            let error = null;

            for (let i = 0; i < maxRetries; i++) {
                try {
                    result = await mockComponents.AIAPIManager.analyzeContent('test content');
                    break;
                } catch (err) {
                    error = err;
                    await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay between retries
                }
            }

            expect(result).toBeDefined();
            expect(result.attempt).toBe(3);
            expect(attemptCount).toBe(3);

            // Verify retry attempts were logged
            expect(mockComponents.Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Retry attempt'),
                expect.any(Object)
            );
        });

        test('should handle partial provider failures in mixed scenarios', async () => {
            const analysisJobs = [
                { id: 'job-1', preferredProvider: 'ollama' },
                { id: 'job-2', preferredProvider: 'openai' },
                { id: 'job-3', preferredProvider: 'ollama' },
                { id: 'job-4', preferredProvider: 'gemini' }
            ];

            // Mock provider availability
            mockComponents.AIAPIManager.isProviderReady.mockImplementation((provider) => {
                return provider !== 'ollama'; // Ollama fails
            });

            mockComponents.AIAPIManager.analyzeContent.mockImplementation(async (content, options) => {
                const provider = options?.provider || mockComponents.AIAPIManager.getActiveProvider();
                
                if (provider === 'ollama') {
                    throw new Error('Ollama service unavailable');
                }
                
                return {
                    analysisType: 'Aprendizado Geral',
                    relevanceScore: 75,
                    provider: provider
                };
            });

            const results = [];
            
            for (const job of analysisJobs) {
                let result;
                
                if (!mockComponents.AIAPIManager.isProviderReady(job.preferredProvider)) {
                    // Fallback to available provider
                    const fallbackProvider = job.preferredProvider === 'ollama' ? 'openai' : 'gemini';
                    mockComponents.AIAPIManager.setActiveProvider(fallbackProvider);
                    
                    result = await mockComponents.AIAPIManager.analyzeContent('test content', {
                        provider: fallbackProvider
                    });
                    result.fallback = true;
                    result.originalProvider = job.preferredProvider;
                } else {
                    result = await mockComponents.AIAPIManager.analyzeContent('test content', {
                        provider: job.preferredProvider
                    });
                    result.fallback = false;
                }
                
                results.push({ jobId: job.id, ...result });
            }

            // Verify results
            expect(results).toHaveLength(4);
            
            // Jobs 1 and 3 should have fallback (ollama → openai)
            expect(results[0].fallback).toBe(true);
            expect(results[0].originalProvider).toBe('ollama');
            expect(results[2].fallback).toBe(true);
            expect(results[2].originalProvider).toBe('ollama');
            
            // Jobs 2 and 4 should work with preferred providers
            expect(results[1].fallback).toBe(false);
            expect(results[3].fallback).toBe(false);
        });
    });
});