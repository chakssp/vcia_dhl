/**
 * Security Configuration
 * ML Confidence Workflow System
 * 
 * Comprehensive security settings for production deployment
 * following OWASP best practices and industry standards.
 */

export const securityConfig = {
    // Authentication & Authorization
    auth: {
        // JWT Configuration
        jwt: {
            algorithm: 'RS256',
            publicKey: process.env.JWT_PUBLIC_KEY,
            privateKey: process.env.JWT_PRIVATE_KEY,
            issuer: 'ml-confidence-workflow',
            audience: 'ml-confidence-api',
            expiresIn: '24h',
            notBefore: '0',
            clockTolerance: 30, // seconds
            
            // Refresh tokens
            refresh: {
                enabled: true,
                expiresIn: '7d',
                rotateOnUse: true,
                reuseWindow: 60 // seconds
            }
        },
        
        // Session management
        session: {
            name: 'mlconf_session',
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            rolling: true,
            cookie: {
                secure: true,
                httpOnly: true,
                maxAge: 86400000, // 24 hours
                sameSite: 'strict'
            }
        },
        
        // Multi-factor authentication
        mfa: {
            enabled: true,
            required: ['admin', 'analyst'],
            methods: ['totp', 'webauthn'],
            gracePeriod: 300 // 5 minutes
        },
        
        // Role-based access control
        rbac: {
            roles: {
                admin: {
                    permissions: ['*'],
                    description: 'Full system access'
                },
                analyst: {
                    permissions: [
                        'analysis:read',
                        'analysis:write',
                        'confidence:read',
                        'export:*'
                    ],
                    description: 'Analysis and export capabilities'
                },
                viewer: {
                    permissions: [
                        'analysis:read',
                        'confidence:read',
                        'dashboard:read'
                    ],
                    description: 'Read-only access'
                },
                api: {
                    permissions: [
                        'api:*',
                        'analysis:read',
                        'confidence:read'
                    ],
                    description: 'API access for integrations'
                }
            },
            
            // Permission inheritance
            inheritance: {
                analyst: ['viewer'],
                admin: ['analyst', 'viewer']
            }
        },
        
        // API key management
        apiKeys: {
            enabled: true,
            header: 'X-API-Key',
            prefix: 'mlconf_',
            rotation: {
                enabled: true,
                period: 2592000000, // 30 days
                overlap: 86400000 // 24 hours
            },
            
            // Rate limiting per API key
            rateLimit: {
                default: 1000, // per hour
                tiers: {
                    basic: 1000,
                    standard: 10000,
                    premium: 100000
                }
            }
        }
    },
    
    // Encryption Configuration
    encryption: {
        // Data at rest
        atRest: {
            enabled: true,
            algorithm: 'aes-256-gcm',
            keyDerivation: 'pbkdf2',
            iterations: 100000,
            
            // Key management
            keys: {
                master: process.env.MASTER_KEY,
                rotation: {
                    enabled: true,
                    period: 7776000000, // 90 days
                    versions: 3 // Keep 3 versions
                }
            },
            
            // Fields to encrypt
            fields: [
                'user.email',
                'user.personalData',
                'apiKeys.key',
                'analysis.sensitiveContent'
            ]
        },
        
        // Data in transit
        inTransit: {
            tls: {
                minVersion: 'TLSv1.2',
                ciphers: [
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES256-GCM-SHA384',
                    'ECDHE-RSA-AES128-SHA256',
                    'ECDHE-RSA-AES256-SHA384'
                ],
                preferServerCiphers: true,
                
                // Certificate management
                certificates: {
                    cert: process.env.TLS_CERT_PATH,
                    key: process.env.TLS_KEY_PATH,
                    ca: process.env.TLS_CA_PATH,
                    
                    // Certificate pinning
                    pinning: {
                        enabled: true,
                        pins: process.env.CERT_PINS?.split(',') || []
                    }
                }
            }
        }
    },
    
    // Security Headers
    headers: {
        // Strict Transport Security
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        
        // Content Security Policy
        csp: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                fontSrc: ["'self'"],
                connectSrc: ["'self'", 'wss:', 'https:'],
                mediaSrc: ["'none'"],
                objectSrc: ["'none'"],
                frameSrc: ["'none'"],
                workerSrc: ["'self'", 'blob:'],
                childSrc: ["'self'", 'blob:'],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                manifestSrc: ["'self'"],
                upgradeInsecureRequests: []
            },
            reportUri: '/api/csp-report'
        },
        
        // Additional security headers
        additional: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            'X-Permitted-Cross-Domain-Policies': 'none'
        }
    },
    
    // Input Validation & Sanitization
    validation: {
        // Request validation
        request: {
            maxPayloadSize: '10MB',
            maxUrlLength: 2048,
            maxHeaderSize: 8192,
            
            // Parameter validation
            parameters: {
                strict: true,
                coerceTypes: false,
                removeAdditional: true
            }
        },
        
        // Input sanitization
        sanitization: {
            enabled: true,
            
            // HTML sanitization
            html: {
                allowedTags: [],
                allowedAttributes: {},
                textOnly: true
            },
            
            // SQL injection prevention
            sql: {
                parameterized: true,
                escaping: true,
                validation: true
            },
            
            // Path traversal prevention
            paths: {
                normalize: true,
                jail: './data',
                blacklist: ['..', '~', '.git', '.env']
            },
            
            // Command injection prevention
            commands: {
                whitelist: [],
                escaping: true,
                sandboxed: true
            }
        },
        
        // File upload security
        fileUpload: {
            enabled: true,
            maxSize: '50MB',
            
            allowedTypes: [
                'text/plain',
                'text/markdown',
                'application/pdf',
                'application/json'
            ],
            
            // Virus scanning
            antivirus: {
                enabled: true,
                engine: 'clamav',
                quarantine: './quarantine'
            },
            
            // File type verification
            verification: {
                magicBytes: true,
                extension: true,
                mimeType: true
            }
        }
    },
    
    // Security Monitoring & Logging
    monitoring: {
        // Security event logging
        events: {
            login: { enabled: true, level: 'info' },
            logout: { enabled: true, level: 'info' },
            failedLogin: { enabled: true, level: 'warn' },
            authError: { enabled: true, level: 'error' },
            accessDenied: { enabled: true, level: 'warn' },
            suspiciousActivity: { enabled: true, level: 'error' },
            dataAccess: { enabled: true, level: 'info' },
            configChange: { enabled: true, level: 'warn' },
            privilegeEscalation: { enabled: true, level: 'error' }
        },
        
        // Intrusion detection
        ids: {
            enabled: true,
            
            rules: [
                {
                    name: 'brute-force',
                    pattern: 'failedLogin',
                    threshold: 5,
                    window: 300, // 5 minutes
                    action: 'block'
                },
                {
                    name: 'scanning',
                    pattern: '404',
                    threshold: 50,
                    window: 60, // 1 minute
                    action: 'throttle'
                },
                {
                    name: 'injection-attempt',
                    pattern: 'sql|xss|cmd',
                    threshold: 1,
                    action: 'block'
                }
            ],
            
            // Automated responses
            responses: {
                block: {
                    duration: 3600, // 1 hour
                    notify: true
                },
                throttle: {
                    limit: 10, // requests per minute
                    duration: 600 // 10 minutes
                }
            }
        },
        
        // Audit logging
        audit: {
            enabled: true,
            
            // What to audit
            targets: [
                'authentication',
                'authorization',
                'dataModification',
                'configurationChange',
                'apiAccess',
                'export'
            ],
            
            // Audit log protection
            protection: {
                signing: true,
                encryption: true,
                immutable: true,
                retention: 2592000 // 30 days
            }
        }
    },
    
    // Network Security
    network: {
        // IP filtering
        ipFilter: {
            enabled: true,
            
            whitelist: process.env.IP_WHITELIST?.split(',') || [],
            blacklist: process.env.IP_BLACKLIST?.split(',') || [],
            
            // Geo-blocking
            geoBlocking: {
                enabled: false,
                allowedCountries: ['US', 'CA', 'GB', 'AU'],
                blockedCountries: []
            }
        },
        
        // DDoS protection
        ddos: {
            enabled: true,
            
            limits: {
                requestsPerSecond: 100,
                requestsPerMinute: 1000,
                connectionsPerIP: 20,
                requestSize: '100MB'
            },
            
            // Cloudflare integration
            cloudflare: {
                enabled: true,
                zoneId: process.env.CLOUDFLARE_ZONE_ID,
                authEmail: process.env.CLOUDFLARE_EMAIL,
                authKey: process.env.CLOUDFLARE_API_KEY
            }
        },
        
        // CORS configuration
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
            exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
            maxAge: 86400 // 24 hours
        }
    },
    
    // Secrets Management
    secrets: {
        // Secret storage
        storage: {
            type: 'vault', // or 'aws-secrets-manager', 'azure-keyvault'
            
            vault: {
                url: process.env.VAULT_URL,
                token: process.env.VAULT_TOKEN,
                namespace: 'ml-confidence',
                
                // Secret paths
                paths: {
                    database: 'database/creds',
                    api: 'api/keys',
                    encryption: 'encryption/keys',
                    certificates: 'certificates'
                }
            }
        },
        
        // Secret rotation
        rotation: {
            enabled: true,
            
            schedule: {
                database: '0 0 * * 0', // Weekly
                apiKeys: '0 0 1 * *', // Monthly
                encryption: '0 0 1 */3 *' // Quarterly
            }
        }
    },
    
    // Compliance & Privacy
    compliance: {
        // GDPR compliance
        gdpr: {
            enabled: true,
            
            rights: {
                access: true,
                rectification: true,
                erasure: true,
                portability: true,
                restriction: true,
                objection: true
            },
            
            // Data retention
            retention: {
                userDat

: 2592000000, // 30 days
                logs: 7776000000, // 90 days
                analytics: 31536000000 // 1 year
            }
        },
        
        // Data anonymization
        anonymization: {
            enabled: true,
            
            fields: [
                'user.email',
                'user.name',
                'user.ip',
                'analysis.personalContent'
            ],
            
            techniques: {
                hashing: 'sha256',
                masking: 'partial',
                generalization: true
            }
        }
    },
    
    // Security Testing
    testing: {
        // Penetration testing
        pentest: {
            schedule: 'quarterly',
            scope: ['api', 'web', 'infrastructure'],
            provider: 'internal'
        },
        
        // Vulnerability scanning
        scanning: {
            enabled: true,
            schedule: 'daily',
            
            tools: {
                dependency: 'snyk',
                code: 'sonarqube',
                container: 'trivy',
                infrastructure: 'nessus'
            }
        }
    }
};

// Security utility functions
export const securityUtils = {
    // Validate security configuration
    validateConfig: (config) => {
        const errors = [];
        
        // Check required environment variables
        const requiredEnvVars = [
            'JWT_PUBLIC_KEY',
            'JWT_PRIVATE_KEY',
            'SESSION_SECRET',
            'MASTER_KEY'
        ];
        
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                errors.push(`Missing required environment variable: ${envVar}`);
            }
        }
        
        // Validate TLS configuration
        if (config.encryption.inTransit.tls.minVersion < 'TLSv1.2') {
            errors.push('TLS minimum version must be 1.2 or higher');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Generate secure random tokens
    generateToken: (length = 32) => {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    },
    
    // Hash sensitive data
    hashData: (data, salt) => {
        const crypto = require('crypto');
        return crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    },
    
    // Sanitize user input
    sanitizeInput: (input, type = 'text') => {
        // Implementation would depend on sanitization library
        return input; // Placeholder
    }
};

// Export configuration
export default securityConfig;