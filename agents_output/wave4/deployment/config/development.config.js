/**
 * Development Configuration
 * ML Confidence Workflow System
 * 
 * Local development environment with maximum debugging capabilities
 * and minimal resource constraints.
 */

export const developmentConfig = {
    // Environment identifier
    environment: 'development',
    version: '4.0.0-dev',
    
    // ML Confidence Calculator Settings
    mlCalculator: {
        // Use baseline weights for comparison
        weights: {
            semantic: 0.35,
            categorical: 0.25,
            structural: 0.25,
            temporal: 0.15
        },
        
        // Lower thresholds for testing
        thresholds: {
            minimum: 0.60,
            target: 0.85,
            high: 0.90
        },
        
        // Enable all debugging
        debug: {
            logCalculations: true,
            saveIntermediateResults: true,
            traceDimensions: true
        }
    },
    
    // Fast convergence for development
    convergence: {
        plateauThreshold: 0.03,
        minIterations: 2,
        maxIterations: 5,
        earlyStoppingPatience: 2,
        smoothingFactor: 0.3,
        
        // Disable adaptive in dev
        adaptive: {
            enabled: false
        }
    },
    
    // Minimal cache for development
    cache: {
        maxSize: 100,
        ttl: 300000, // 5 minutes
        
        segments: [
            {
                name: 'dev',
                size: 100,
                evictionPolicy: 'lru',
                ttl: 300000
            }
        ],
        
        // Simple warming for testing
        warming: {
            enabled: false
        },
        
        // Basic eviction
        eviction: {
            policy: 'lru'
        }
    },
    
    // Single worker for debugging
    workers: {
        count: 1,
        maxConcurrent: 10,
        timeout: 60000, // 1 minute for debugging
        retries: 0, // No retries in dev
        
        resources: {
            maxMemoryPerWorker: 256 * 1024 * 1024, // 256MB
            maxExecutionTime: 60000, // 1 minute
            cpuThreshold: 1.0 // No limit
        }
    },
    
    // Small batches for testing
    batch: {
        defaultSize: 5,
        maxSize: 10,
        timeout: 120000, // 2 minutes
        
        adaptive: {
            enabled: false
        }
    },
    
    // Detailed monitoring for development
    monitoring: {
        enabled: true,
        
        metrics: {
            interval: 5000, // 5 seconds
            retention: 3600000, // 1 hour
            aggregation: ['avg', 'min', 'max'],
            
            // Maximum debug output
            debug: {
                enabled: true,
                detailed: true,
                includeRawData: true,
                includeStackTraces: true
            }
        },
        
        // No alerts in development
        alerts: {
            enabled: false
        },
        
        // Simple console dashboard
        dashboard: {
            type: 'console',
            refreshInterval: 1000,
            format: 'table'
        }
    },
    
    // Verbose logging for development
    logging: {
        level: 'trace',
        
        targets: [
            {
                type: 'console',
                level: 'trace',
                format: 'dev',
                colorize: true,
                prettyPrint: true
            },
            {
                type: 'file',
                level: 'debug',
                path: './logs/development.log',
                rotation: {
                    maxSize: '10MB',
                    maxFiles: 3
                }
            }
        ],
        
        // No filtering in development
        filtering: {
            enabled: false
        }
    },
    
    // No API restrictions in development
    api: {
        rateLimit: {
            enabled: false
        },
        
        cors: {
            origin: '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        },
        
        validation: {
            maxPayloadSize: '100MB',
            timeout: 120000, // 2 minutes
            sanitization: false
        }
    },
    
    // Minimal security in development
    security: {
        auth: {
            type: 'none', // No auth in dev
            bypass: true
        },
        
        encryption: {
            enabled: false
        },
        
        headers: {
            enabled: false
        }
    },
    
    // Local database configuration
    database: {
        qdrant: {
            url: 'http://localhost:6333',
            collectionName: 'ml-confidence-dev',
            timeout: 30000,
            retries: 0,
            
            // Development helpers
            dev: {
                autoCreate: true,
                seedData: true,
                resetOnStart: true
            }
        },
        
        state: {
            type: 'memory', // In-memory for development
            keyPrefix: 'mlconf:dev:',
            ttl: 300 // 5 minutes
        }
    },
    
    // All features enabled for testing
    features: {
        weightOptimization: true,
        convergenceTuning: true,
        cacheOptimization: true,
        predictiveWarming: true,
        adaptiveWeights: true,
        neuralConvergence: true,
        
        // Feature development flags
        experimental: {
            newAlgorithm: true,
            debugPanel: true,
            performanceProfiler: true
        },
        
        // 100% rollout in dev
        rollout: Object.fromEntries(
            Object.keys(developmentConfig?.features || {})
                .filter(k => k !== 'rollout')
                .map(k => [k, 100])
        )
    },
    
    // Simple health check
    healthCheck: {
        endpoint: '/health',
        
        checks: [
            {
                name: 'basic',
                type: 'ping',
                critical: false
            }
        ],
        
        thresholds: {
            healthy: 0.5,
            degraded: 0.3,
            unhealthy: 0.0
        }
    },
    
    // Local deployment
    deployment: {
        strategy: 'direct',
        
        canary: {
            enabled: false
        },
        
        rollback: {
            automatic: false
        }
    },
    
    // Development tools
    devTools: {
        enabled: true,
        
        // Hot reload
        hotReload: {
            enabled: true,
            watch: ['./js/**/*.js', './config/**/*.js'],
            ignore: ['node_modules', 'logs', 'cache']
        },
        
        // REPL access
        repl: {
            enabled: true,
            port: 9229,
            history: './.repl_history'
        },
        
        // Mock data generator
        mockData: {
            enabled: true,
            generators: {
                files: true,
                embeddings: true,
                categories: true,
                analysis: true
            }
        },
        
        // Performance profiler
        profiler: {
            enabled: true,
            autoStart: false,
            outputDir: './profiles/'
        },
        
        // Debug UI
        debugUI: {
            enabled: true,
            port: 8080,
            features: [
                'config-editor',
                'metric-viewer',
                'cache-inspector',
                'worker-monitor',
                'log-viewer'
            ]
        }
    },
    
    // Development shortcuts
    shortcuts: {
        // Quick test data
        testData: {
            small: 10,
            medium: 100,
            large: 1000
        },
        
        // Preset configurations
        presets: {
            'fast-test': {
                convergence: { maxIterations: 3 },
                cache: { maxSize: 50 },
                workers: { count: 1 }
            },
            'stress-test': {
                batch: { maxSize: 100 },
                workers: { count: 4 },
                cache: { maxSize: 1000 }
            },
            'debug-mode': {
                logging: { level: 'trace' },
                monitoring: { metrics: { interval: 1000 } }
            }
        }
    },
    
    // Local file paths
    paths: {
        data: './data/',
        logs: './logs/',
        cache: './cache/',
        temp: './temp/',
        tests: './tests/'
    }
};

// Development-specific utilities
export const devUtils = {
    // Reset all data
    reset: async () => {
        console.log('Resetting development environment...');
        // Implementation would clear cache, database, logs, etc.
    },
    
    // Generate test data
    generateTestData: (count = 100) => {
        console.log(`Generating ${count} test items...`);
        // Implementation would create mock data
    },
    
    // Toggle feature flags
    toggleFeature: (feature) => {
        developmentConfig.features[feature] = !developmentConfig.features[feature];
        console.log(`Feature '${feature}' is now ${developmentConfig.features[feature] ? 'ON' : 'OFF'}`);
    },
    
    // Load preset
    loadPreset: (presetName) => {
        const preset = developmentConfig.shortcuts.presets[presetName];
        if (preset) {
            Object.assign(developmentConfig, preset);
            console.log(`Loaded preset: ${presetName}`);
        }
    }
};

// Auto-apply development overrides from environment
if (process.env.NODE_ENV === 'development') {
    // Override with any DEV_ prefixed environment variables
    Object.keys(process.env)
        .filter(key => key.startsWith('DEV_'))
        .forEach(key => {
            const configPath = key.substring(4).toLowerCase().split('_');
            let target = developmentConfig;
            
            for (let i = 0; i < configPath.length - 1; i++) {
                target = target[configPath[i]] = target[configPath[i]] || {};
            }
            
            target[configPath[configPath.length - 1]] = process.env[key];
        });
}

// Export configuration
export default developmentConfig;