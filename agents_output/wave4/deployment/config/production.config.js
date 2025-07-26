/**
 * Production Configuration
 * ML Confidence Workflow System
 * 
 * This configuration applies all Wave 4 optimizations for achieving
 * 85%+ confidence in production environment.
 */

export const productionConfig = {
    // Environment identifier
    environment: 'production',
    version: '4.0.0',
    
    // ML Confidence Calculator Settings
    mlCalculator: {
        // Optimized weights from fine-tuning
        weights: {
            semantic: 0.38,
            categorical: 0.27,
            structural: 0.23,
            temporal: 0.12
        },
        
        // Confidence thresholds
        thresholds: {
            minimum: 0.65,
            target: 0.85,
            high: 0.90
        },
        
        // Algorithm settings
        algorithms: {
            ensemble: true,
            voting: 'weighted',
            normalization: 'minmax'
        }
    },
    
    // Convergence Settings
    convergence: {
        plateauThreshold: 0.015,
        minIterations: 2,
        maxIterations: 12,
        earlyStoppingPatience: 3,
        smoothingFactor: 0.4,
        
        // Adaptive settings
        adaptive: {
            enabled: true,
            confidenceBands: {
                low: { threshold: 0.02, patience: 2 },
                medium: { threshold: 0.015, patience: 3 },
                high: { threshold: 0.01, patience: 4 }
            }
        }
    },
    
    // Cache Configuration
    cache: {
        // Total cache size (items)
        maxSize: 1000,
        
        // TTL in milliseconds (90 minutes)
        ttl: 5400000,
        
        // Cache segments
        segments: [
            {
                name: 'hot',
                size: 300,
                evictionPolicy: 'lfu',
                ttl: Infinity
            },
            {
                name: 'warm',
                size: 500,
                evictionPolicy: 'lru',
                ttl: 5400000
            },
            {
                name: 'predictive',
                size: 200,
                evictionPolicy: 'fifo',
                ttl: 300000
            }
        ],
        
        // Predictive warming
        warming: {
            enabled: true,
            batchSize: 50,
            triggers: ['sequential', 'temporal', 'semantic', 'burst'],
            confidenceThreshold: 0.7
        },
        
        // Eviction policy
        eviction: {
            scoreFactors: {
                frequency: 0.3,
                recency: 0.3,
                size: 0.1,
                cost: 0.2,
                prediction: 0.1
            },
            protectedRatio: 0.1,
            threshold: 0.3
        }
    },
    
    // Worker Pool Configuration
    workers: {
        count: 8,
        maxConcurrent: 200,
        timeout: 30000,
        retries: 3,
        
        // Resource limits
        resources: {
            maxMemoryPerWorker: 128 * 1024 * 1024, // 128MB
            maxExecutionTime: 10000, // 10s
            cpuThreshold: 0.8
        }
    },
    
    // Batch Processing
    batch: {
        defaultSize: 50,
        maxSize: 100,
        timeout: 60000,
        
        // Adaptive batching
        adaptive: {
            enabled: true,
            minSize: 10,
            maxSize: 100,
            targetLatency: 1000 // 1s
        }
    },
    
    // Performance Monitoring
    monitoring: {
        enabled: true,
        
        // Metrics collection
        metrics: {
            interval: 60000, // 1 minute
            retention: 604800000, // 7 days
            aggregation: ['avg', 'min', 'max', 'p50', 'p95', 'p99']
        },
        
        // Alert thresholds
        alerts: {
            confidence: {
                low: 0.80,
                critical: 0.75
            },
            performance: {
                latency: 2000, // 2s
                errorRate: 0.01 // 1%
            },
            resources: {
                memory: 0.85, // 85% usage
                cpu: 0.80 // 80% usage
            }
        },
        
        // Dashboard configuration
        dashboard: {
            refreshInterval: 5000, // 5s
            timeWindows: ['5m', '1h', '24h', '7d'],
            defaultView: '1h'
        }
    },
    
    // Error Handling
    errorHandling: {
        gracefulDegradation: true,
        
        fallbacks: {
            mlCalculation: 'baseline',
            cacheFailure: 'bypass',
            workerFailure: 'sequential'
        },
        
        retryPolicy: {
            attempts: 3,
            backoff: 'exponential',
            baseDelay: 1000,
            maxDelay: 30000
        }
    },
    
    // Logging Configuration
    logging: {
        level: 'info',
        
        targets: [
            {
                type: 'console',
                level: 'error',
                format: 'json'
            },
            {
                type: 'file',
                level: 'info',
                path: '/var/log/ml-confidence/app.log',
                rotation: {
                    maxSize: '100MB',
                    maxFiles: 10
                }
            },
            {
                type: 'remote',
                level: 'warn',
                endpoint: process.env.LOG_ENDPOINT,
                batchSize: 100,
                flushInterval: 10000
            }
        ],
        
        // Sensitive data filtering
        filtering: {
            enabled: true,
            patterns: ['apiKey', 'password', 'token', 'secret']
        }
    },
    
    // API Configuration
    api: {
        // Rate limiting
        rateLimit: {
            windowMs: 60000, // 1 minute
            max: 1000, // requests per window
            keyGenerator: 'ip+user'
        },
        
        // CORS settings
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        },
        
        // Request validation
        validation: {
            maxPayloadSize: '10MB',
            timeout: 30000,
            sanitization: true
        }
    },
    
    // Security Configuration
    security: {
        // Authentication
        auth: {
            type: 'jwt',
            expiresIn: '24h',
            refreshTokenExpiry: '7d'
        },
        
        // Encryption
        encryption: {
            algorithm: 'aes-256-gcm',
            keyRotation: 2592000000 // 30 days
        },
        
        // Headers
        headers: {
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            csp: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'"]
                }
            }
        }
    },
    
    // Database Configuration
    database: {
        // Qdrant vector database
        qdrant: {
            url: process.env.QDRANT_URL || 'http://qdr.vcia.com.br:6333',
            collectionName: 'ml-confidence-prod',
            timeout: 10000,
            retries: 3
        },
        
        // State persistence
        state: {
            type: 'redis',
            url: process.env.REDIS_URL,
            keyPrefix: 'mlconf:',
            ttl: 86400 // 24 hours
        }
    },
    
    // Feature Flags
    features: {
        // Optimization features
        weightOptimization: true,
        convergenceTuning: true,
        cacheOptimization: true,
        predictiveWarming: true,
        
        // Experimental features
        adaptiveWeights: false,
        neuralConvergence: false,
        quantumCache: false, // Just kidding!
        
        // Rollout percentages
        rollout: {
            weightOptimization: 100,
            convergenceTuning: 100,
            cacheOptimization: 100,
            predictiveWarming: 50 // Gradual rollout
        }
    },
    
    // Health Check Configuration
    healthCheck: {
        endpoint: '/health',
        
        checks: [
            {
                name: 'ml-calculator',
                type: 'functional',
                critical: true
            },
            {
                name: 'cache',
                type: 'performance',
                critical: false
            },
            {
                name: 'database',
                type: 'connectivity',
                critical: true
            },
            {
                name: 'workers',
                type: 'resource',
                critical: false
            }
        ],
        
        thresholds: {
            healthy: 0.95,
            degraded: 0.80,
            unhealthy: 0.50
        }
    },
    
    // Deployment Configuration
    deployment: {
        strategy: 'blue-green',
        
        canary: {
            enabled: true,
            percentage: 10,
            duration: 3600000, // 1 hour
            metrics: ['confidence', 'latency', 'errors']
        },
        
        rollback: {
            automatic: true,
            threshold: {
                errors: 0.05,
                confidence: 0.80,
                latency: 3000
            }
        }
    },
    
    // Maintenance Mode
    maintenance: {
        enabled: false,
        message: 'System under maintenance. Please try again later.',
        allowedIPs: process.env.MAINTENANCE_ALLOWED_IPS?.split(',') || []
    }
};

// Environment variable overrides
export function applyEnvironmentOverrides(config) {
    // Override with environment variables where applicable
    if (process.env.ML_WEIGHTS) {
        config.mlCalculator.weights = JSON.parse(process.env.ML_WEIGHTS);
    }
    
    if (process.env.CACHE_SIZE) {
        config.cache.maxSize = parseInt(process.env.CACHE_SIZE);
    }
    
    if (process.env.WORKER_COUNT) {
        config.workers.count = parseInt(process.env.WORKER_COUNT);
    }
    
    if (process.env.LOG_LEVEL) {
        config.logging.level = process.env.LOG_LEVEL;
    }
    
    return config;
}

// Validate configuration
export function validateConfig(config) {
    const errors = [];
    
    // Validate weights sum to 1
    const weightSum = Object.values(config.mlCalculator.weights)
        .reduce((sum, w) => sum + w, 0);
    
    if (Math.abs(weightSum - 1) > 0.001) {
        errors.push(`ML weights must sum to 1, got ${weightSum}`);
    }
    
    // Validate cache segments
    const segmentSum = config.cache.segments
        .reduce((sum, s) => sum + s.size, 0);
    
    if (segmentSum > config.cache.maxSize) {
        errors.push(`Cache segments (${segmentSum}) exceed max size (${config.cache.maxSize})`);
    }
    
    // Validate worker count
    if (config.workers.count > 16) {
        errors.push('Worker count should not exceed 16 for optimal performance');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Export configuration
export default applyEnvironmentOverrides(productionConfig);