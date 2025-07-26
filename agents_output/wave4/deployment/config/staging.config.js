/**
 * Staging Configuration
 * ML Confidence Workflow System
 * 
 * Staging environment for testing Wave 4 optimizations before production.
 * More verbose logging and relaxed thresholds for testing.
 */

import { productionConfig } from './production.config.js';

export const stagingConfig = {
    ...productionConfig,
    
    // Environment identifier
    environment: 'staging',
    
    // Override specific settings for staging
    mlCalculator: {
        ...productionConfig.mlCalculator,
        
        // Enable all experimental features for testing
        experimental: {
            adaptiveWeights: true,
            multiModelEnsemble: true,
            confidenceBoost: true
        }
    },
    
    // More aggressive convergence for faster testing
    convergence: {
        ...productionConfig.convergence,
        plateauThreshold: 0.02, // Less sensitive for testing
        minIterations: 2,
        maxIterations: 8, // Faster testing cycles
    },
    
    // Smaller cache for staging environment
    cache: {
        ...productionConfig.cache,
        maxSize: 500,
        
        segments: [
            {
                name: 'hot',
                size: 150,
                evictionPolicy: 'lfu',
                ttl: Infinity
            },
            {
                name: 'warm',
                size: 250,
                evictionPolicy: 'lru',
                ttl: 3600000 // 1 hour
            },
            {
                name: 'predictive',
                size: 100,
                evictionPolicy: 'fifo',
                ttl: 300000
            }
        ],
        
        // More aggressive warming for testing
        warming: {
            ...productionConfig.cache.warming,
            confidenceThreshold: 0.6 // Lower threshold for testing
        }
    },
    
    // Fewer workers in staging
    workers: {
        ...productionConfig.workers,
        count: 4,
        maxConcurrent: 100,
        
        resources: {
            maxMemoryPerWorker: 64 * 1024 * 1024, // 64MB
            maxExecutionTime: 15000, // 15s (more lenient)
            cpuThreshold: 0.9
        }
    },
    
    // More detailed monitoring for debugging
    monitoring: {
        ...productionConfig.monitoring,
        
        metrics: {
            interval: 30000, // 30 seconds
            retention: 172800000, // 2 days
            aggregation: ['avg', 'min', 'max', 'p50', 'p75', 'p90', 'p95', 'p99'],
            
            // Additional debug metrics
            debug: {
                enabled: true,
                detailed: true,
                includeRawData: true
            }
        },
        
        // Lower alert thresholds for early warning
        alerts: {
            confidence: {
                low: 0.82,
                critical: 0.78
            },
            performance: {
                latency: 1500, // 1.5s
                errorRate: 0.02 // 2%
            },
            resources: {
                memory: 0.75, // 75% usage
                cpu: 0.70 // 70% usage
            }
        }
    },
    
    // More verbose logging in staging
    logging: {
        level: 'debug',
        
        targets: [
            {
                type: 'console',
                level: 'debug',
                format: 'pretty',
                colorize: true
            },
            {
                type: 'file',
                level: 'debug',
                path: '/var/log/ml-confidence/staging.log',
                rotation: {
                    maxSize: '50MB',
                    maxFiles: 5
                }
            }
        ],
        
        // Log more details in staging
        filtering: {
            enabled: true,
            patterns: ['password', 'secret'],
            // Don't filter API keys in staging for debugging
            excludePatterns: ['apiKey', 'token']
        }
    },
    
    // Relaxed API limits for testing
    api: {
        ...productionConfig.api,
        
        rateLimit: {
            windowMs: 60000,
            max: 10000, // 10x production limit
            keyGenerator: 'ip'
        },
        
        validation: {
            maxPayloadSize: '50MB', // Larger for test data
            timeout: 60000, // 1 minute
            sanitization: false // Disable for testing edge cases
        }
    },
    
    // Test database configuration
    database: {
        qdrant: {
            url: process.env.QDRANT_STAGING_URL || 'http://staging.qdr.vcia.com.br:6333',
            collectionName: 'ml-confidence-staging',
            timeout: 15000,
            retries: 5,
            
            // Test collection settings
            testMode: {
                enabled: true,
                autoCleanup: true,
                seedData: true
            }
        },
        
        state: {
            type: 'redis',
            url: process.env.REDIS_STAGING_URL,
            keyPrefix: 'mlconf:staging:',
            ttl: 3600 // 1 hour
        }
    },
    
    // Feature flags for testing
    features: {
        ...productionConfig.features,
        
        // Enable all features in staging
        adaptiveWeights: true,
        neuralConvergence: true,
        
        // A/B testing configuration
        abTesting: {
            enabled: true,
            experiments: [
                {
                    name: 'weight-optimization-v2',
                    percentage: 50,
                    variants: ['control', 'optimized']
                },
                {
                    name: 'cache-warming-strategies',
                    percentage: 100,
                    variants: ['sequential', 'temporal', 'semantic', 'hybrid']
                }
            ]
        },
        
        // 100% rollout in staging
        rollout: {
            weightOptimization: 100,
            convergenceTuning: 100,
            cacheOptimization: 100,
            predictiveWarming: 100
        }
    },
    
    // Extended health checks for staging
    healthCheck: {
        ...productionConfig.healthCheck,
        
        checks: [
            ...productionConfig.healthCheck.checks,
            {
                name: 'test-data',
                type: 'data-integrity',
                critical: false
            },
            {
                name: 'feature-flags',
                type: 'configuration',
                critical: false
            }
        ],
        
        // More lenient thresholds
        thresholds: {
            healthy: 0.90,
            degraded: 0.70,
            unhealthy: 0.40
        }
    },
    
    // Test deployment settings
    deployment: {
        strategy: 'rolling',
        
        canary: {
            enabled: true,
            percentage: 25, // More aggressive canary
            duration: 1800000, // 30 minutes
            metrics: ['confidence', 'latency', 'errors', 'cache-hits']
        },
        
        rollback: {
            automatic: false, // Manual rollback in staging
            threshold: {
                errors: 0.10,
                confidence: 0.75,
                latency: 5000
            }
        }
    },
    
    // Debug endpoints enabled
    debug: {
        enabled: true,
        endpoints: {
            '/debug/config': true,
            '/debug/metrics': true,
            '/debug/cache': true,
            '/debug/workers': true
        },
        
        // Test data generation
        testData: {
            enabled: true,
            seed: 12345,
            volume: {
                small: 100,
                medium: 1000,
                large: 10000
            }
        }
    },
    
    // Staging-specific utilities
    testing: {
        // Automated test runs
        automated: {
            enabled: true,
            schedule: '0 */6 * * *', // Every 6 hours
            suites: ['unit', 'integration', 'performance', 'e2e']
        },
        
        // Chaos engineering
        chaos: {
            enabled: true,
            experiments: [
                {
                    name: 'cache-failure',
                    probability: 0.01,
                    duration: 60000
                },
                {
                    name: 'worker-crash',
                    probability: 0.005,
                    recovery: 'automatic'
                }
            ]
        },
        
        // Performance profiling
        profiling: {
            enabled: true,
            samplingRate: 0.1,
            output: '/var/log/ml-confidence/profiles/'
        }
    }
};

// Staging-specific validation
export function validateStagingConfig(config) {
    const errors = [];
    
    // Ensure debug mode is enabled
    if (!config.debug.enabled) {
        errors.push('Debug mode must be enabled in staging');
    }
    
    // Ensure test database is configured
    if (!config.database.qdrant.testMode.enabled) {
        errors.push('Test mode must be enabled for staging database');
    }
    
    // Validate worker count for staging resources
    if (config.workers.count > 8) {
        errors.push('Staging worker count should not exceed 8');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Export configuration
export default stagingConfig;