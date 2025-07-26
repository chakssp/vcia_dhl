/**
 * Pre-deployment Validation Script
 * ML Confidence Workflow System
 * 
 * Validates system readiness before deployment
 * Checks configurations, dependencies, and system requirements
 */

import { readFileSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

class PreDeploymentChecker {
    constructor() {
        this.checks = [];
        this.errors = [];
        this.warnings = [];
        this.environment = process.env.DEPLOY_ENV || 'production';
    }
    
    /**
     * Run all pre-deployment checks
     */
    async runChecks() {
        console.log('🔍 Running pre-deployment checks...\n');
        
        try {
            // Configuration checks
            await this.checkConfiguration();
            
            // Dependency checks
            await this.checkDependencies();
            
            // File integrity checks
            await this.checkFileIntegrity();
            
            // Environment checks
            await this.checkEnvironment();
            
            // Security checks
            await this.checkSecurity();
            
            // Performance baseline
            await this.checkPerformanceBaseline();
            
            // Integration checks
            await this.checkIntegrations();
            
            // Report results
            this.reportResults();
            
        } catch (error) {
            this.errors.push(`Fatal error during checks: ${error.message}`);
            this.reportResults();
            process.exit(1);
        }
    }
    
    /**
     * Check configuration files
     */
    async checkConfiguration() {
        this.addCheck('Configuration Files');
        
        // Check for required config files
        const configFiles = [
            `agents_output/wave4/deployment/config/${this.environment}.config.js`,
            'agents_output/wave4/deployment/config/security.config.js'
        ];
        
        for (const file of configFiles) {
            if (!existsSync(file)) {
                this.errors.push(`Missing configuration file: ${file}`);
            } else {
                try {
                    // Try to load and validate config
                    const config = await import(path.resolve(file));
                    
                    if (file.includes('security')) {
                        this.validateSecurityConfig(config.default);
                    } else {
                        this.validateEnvironmentConfig(config.default);
                    }
                } catch (error) {
                    this.errors.push(`Invalid configuration in ${file}: ${error.message}`);
                }
            }
        }
        
        // Check environment variables
        this.checkEnvironmentVariables();
    }
    
    /**
     * Validate environment configuration
     */
    validateEnvironmentConfig(config) {
        // Check ML weights sum to 1
        const weights = config.mlCalculator?.weights;
        if (weights) {
            const sum = Object.values(weights).reduce((a, b) => a + b, 0);
            if (Math.abs(sum - 1) > 0.001) {
                this.errors.push(`ML weights must sum to 1, got ${sum}`);
            }
        }
        
        // Check cache configuration
        if (config.cache?.segments) {
            const totalSize = config.cache.segments.reduce((sum, s) => sum + s.size, 0);
            if (totalSize > config.cache.maxSize) {
                this.errors.push(`Cache segments (${totalSize}) exceed max size (${config.cache.maxSize})`);
            }
        }
        
        // Validate worker configuration
        if (config.workers?.count > 16) {
            this.warnings.push('Worker count > 16 may cause performance issues');
        }
    }
    
    /**
     * Validate security configuration
     */
    validateSecurityConfig(config) {
        // Check for required security settings
        if (!config.auth?.jwt?.algorithm) {
            this.errors.push('JWT algorithm not configured');
        }
        
        if (!config.encryption?.atRest?.enabled && this.environment === 'production') {
            this.errors.push('Encryption at rest must be enabled in production');
        }
        
        if (!config.headers?.hsts && this.environment === 'production') {
            this.warnings.push('HSTS headers should be enabled in production');
        }
    }
    
    /**
     * Check environment variables
     */
    checkEnvironmentVariables() {
        const required = [
            'NODE_ENV',
            'QDRANT_URL',
            'JWT_PUBLIC_KEY',
            'JWT_PRIVATE_KEY',
            'SESSION_SECRET'
        ];
        
        const missing = required.filter(env => !process.env[env]);
        
        if (missing.length > 0) {
            this.errors.push(`Missing environment variables: ${missing.join(', ')}`);
        }
    }
    
    /**
     * Check dependencies
     */
    async checkDependencies() {
        this.addCheck('Dependencies');
        
        // Check package.json exists
        if (!existsSync('package.json')) {
            this.errors.push('package.json not found');
            return;
        }
        
        // Verify npm packages
        try {
            const { stdout } = await execAsync('npm ls --depth=0 --json');
            const deps = JSON.parse(stdout);
            
            if (deps.problems && deps.problems.length > 0) {
                this.errors.push('Dependency problems detected: ' + deps.problems.join(', '));
            }
        } catch (error) {
            this.errors.push('Failed to verify dependencies: ' + error.message);
        }
        
        // Check for security vulnerabilities
        try {
            const { stdout } = await execAsync('npm audit --json');
            const audit = JSON.parse(stdout);
            
            if (audit.metadata.vulnerabilities.high > 0) {
                this.errors.push(`${audit.metadata.vulnerabilities.high} high severity vulnerabilities found`);
            }
            
            if (audit.metadata.vulnerabilities.critical > 0) {
                this.errors.push(`${audit.metadata.vulnerabilities.critical} critical vulnerabilities found`);
            }
        } catch (error) {
            this.warnings.push('Could not run security audit');
        }
    }
    
    /**
     * Check file integrity
     */
    async checkFileIntegrity() {
        this.addCheck('File Integrity');
        
        // Critical files that must exist
        const criticalFiles = [
            'js/app.js',
            'index.html',
            'agents_output/wave1/calculator/ConfidenceCalculator.js',
            'agents_output/wave3/optimization/OptimizedCalculator.js',
            'agents_output/wave4/deployment/fine-tuning/weight-optimizer.js'
        ];
        
        for (const file of criticalFiles) {
            if (!existsSync(file)) {
                this.errors.push(`Critical file missing: ${file}`);
            }
        }
        
        // Check file permissions
        if (process.platform !== 'win32') {
            const scripts = [
                'agents_output/wave4/deployment/deployment/deploy.sh',
                'agents_output/wave4/deployment/deployment/rollback.sh'
            ];
            
            for (const script of scripts) {
                if (existsSync(script)) {
                    try {
                        const { stdout } = await execAsync(`ls -l ${script}`);
                        if (!stdout.includes('x')) {
                            this.warnings.push(`Script not executable: ${script}`);
                        }
                    } catch (error) {
                        // Ignore
                    }
                }
            }
        }
    }
    
    /**
     * Check environment requirements
     */
    async checkEnvironment() {
        this.addCheck('Environment');
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
        
        if (majorVersion < 16) {
            this.errors.push(`Node.js version ${nodeVersion} is below minimum requirement (v16)`);
        }
        
        // Check available memory
        const totalMemory = require('os').totalmem();
        const freeMemory = require('os').freemem();
        const usedPercent = ((totalMemory - freeMemory) / totalMemory) * 100;
        
        if (usedPercent > 90) {
            this.warnings.push(`High memory usage: ${usedPercent.toFixed(1)}%`);
        }
        
        // Check disk space (simplified)
        try {
            const { stdout } = await execAsync('df -h .');
            const lines = stdout.split('\n');
            const dataLine = lines[1];
            const usePercent = parseInt(dataLine.split(/\s+/)[4]);
            
            if (usePercent > 90) {
                this.errors.push(`Insufficient disk space: ${usePercent}% used`);
            }
        } catch (error) {
            // Platform-specific, ignore on Windows
        }
    }
    
    /**
     * Check security requirements
     */
    async checkSecurity() {
        this.addCheck('Security');
        
        // Check for .env files in repository
        if (existsSync('.env')) {
            this.warnings.push('.env file found in repository - ensure it\'s not committed');
        }
        
        // Check SSL certificates (if configured)
        const certPath = process.env.TLS_CERT_PATH;
        if (certPath && !existsSync(certPath)) {
            this.errors.push(`SSL certificate not found: ${certPath}`);
        }
        
        // Check file permissions on sensitive files
        const sensitiveFiles = [
            '.env',
            'agents_output/wave4/deployment/config/production.config.js'
        ];
        
        for (const file of sensitiveFiles) {
            if (existsSync(file) && process.platform !== 'win32') {
                try {
                    const { stdout } = await execAsync(`ls -l ${file}`);
                    if (stdout.includes('rw-rw-rw-') || stdout.includes('rwxrwxrwx')) {
                        this.warnings.push(`Insecure permissions on ${file}`);
                    }
                } catch (error) {
                    // Ignore
                }
            }
        }
    }
    
    /**
     * Check performance baseline
     */
    async checkPerformanceBaseline() {
        this.addCheck('Performance Baseline');
        
        // Simple performance test
        const startTime = Date.now();
        
        try {
            // Load and instantiate calculator
            const { default: Calculator } = await import('../../wave1/calculator/ConfidenceCalculator.js');
            const calculator = new Calculator();
            
            // Run test calculation
            const testData = {
                content: 'Performance test content',
                embeddings: new Array(768).fill(0.1),
                categories: ['test'],
                categoryConfidence: 0.8
            };
            
            await calculator.calculate(testData);
            
            const duration = Date.now() - startTime;
            
            if (duration > 2000) {
                this.warnings.push(`Slow initialization detected: ${duration}ms`);
            }
            
        } catch (error) {
            this.errors.push(`Performance baseline test failed: ${error.message}`);
        }
    }
    
    /**
     * Check external integrations
     */
    async checkIntegrations() {
        this.addCheck('External Integrations');
        
        // Check Qdrant connectivity
        const qdrantUrl = process.env.QDRANT_URL || 'http://qdr.vcia.com.br:6333';
        try {
            const response = await fetch(`${qdrantUrl}/health`);
            if (!response.ok) {
                this.errors.push(`Qdrant health check failed: ${response.status}`);
            }
        } catch (error) {
            this.errors.push(`Cannot connect to Qdrant: ${error.message}`);
        }
        
        // Check Ollama (warning only)
        try {
            const response = await fetch('http://127.0.0.1:11434/api/tags');
            if (!response.ok) {
                this.warnings.push('Ollama service not accessible - embeddings may fail');
            }
        } catch (error) {
            this.warnings.push('Ollama service not running locally');
        }
        
        // Check Redis if configured
        if (process.env.REDIS_URL) {
            // Simple connection test would go here
            this.warnings.push('Redis connection check not implemented');
        }
    }
    
    /**
     * Add check to results
     */
    addCheck(name) {
        this.checks.push({
            name,
            timestamp: new Date().toISOString()
        });
        console.log(`\n✓ Checking ${name}...`);
    }
    
    /**
     * Report results
     */
    reportResults() {
        console.log('\n' + '='.repeat(60));
        console.log('PRE-DEPLOYMENT CHECK RESULTS');
        console.log('='.repeat(60));
        
        console.log(`\nEnvironment: ${this.environment}`);
        console.log(`Checks performed: ${this.checks.length}`);
        
        if (this.errors.length > 0) {
            console.log(`\n❌ ERRORS (${this.errors.length}):`);
            this.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
            this.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        if (this.errors.length === 0) {
            console.log('\n✅ All critical checks passed!');
            console.log('   Deployment can proceed.\n');
            process.exit(0);
        } else {
            console.log('\n❌ Deployment blocked due to errors.');
            console.log('   Please fix the issues above and try again.\n');
            process.exit(1);
        }
    }
}

// Run checks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const checker = new PreDeploymentChecker();
    checker.runChecks().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export default PreDeploymentChecker;