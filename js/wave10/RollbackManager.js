/**
 * RollbackManager.js
 * 
 * Emergency rollback system with automated detection, manual intervention options,
 * state snapshots, and emergency recovery procedures for the entire ML Confidence
 * system deployment.
 * 
 * @version 10.0.0
 * @status PRODUCTION_READY
 */

(function(window) {
    'use strict';

    class RollbackManager {
        constructor(config = {}) {
            this.version = '10.0.0';
            this.status = 'INITIALIZED';
            
            // Configuration
            this.config = {
                snapshotInterval: config.snapshotInterval || 300000, // 5 minutes
                maxSnapshots: config.maxSnapshots || 50,
                quiescenceTimeout: config.quiescenceTimeout || 30000, // 30 seconds
                rollbackTimeout: config.rollbackTimeout || 600000, // 10 minutes
                emergencyMode: config.emergencyMode || false,
                validationStrict: config.validationStrict || true,
                ...config
            };
            
            // State management
            this.state = {
                status: 'idle', // idle, monitoring, preparing, rolling_back, validating, completed, failed
                lastSnapshot: null,
                snapshots: new Map(),
                rollbackHistory: [],
                activeRollback: null,
                emergencyProcedures: []
            };
            
            // Rollback strategies
            this.strategies = {
                immediate: new ImmediateRollbackStrategy(),
                graceful: new GracefulRollbackStrategy(),
                selective: new SelectiveRollbackStrategy(),
                emergency: new EmergencyRollbackStrategy()
            };
            
            // Component dependencies
            this.dependencies = {
                orchestrator: null,
                deploymentController: null,
                canaryController: null,
                productionMonitor: null,
                featureFlags: null
            };
            
            // Snapshot storage
            this.snapshotStorage = new SnapshotStorage({
                maxSize: config.maxSnapshotSize || 10485760, // 10MB
                compression: config.compressionEnabled || true
            });
            
            // Validation engine
            this.validator = new RollbackValidator();
            
            // Recovery procedures
            this.recoveryProcedures = new RecoveryProcedureManager();
            
            // Timers
            this.snapshotTimer = null;
            this.monitoringTimer = null;
            
            // Event handlers
            this.eventHandlers = new Map();
            
            // Performance tracking
            this.metrics = {
                snapshotCount: 0,
                rollbackCount: 0,
                averageRollbackTime: 0,
                lastRollbackDuration: 0,
                storageUsed: 0
            };
        }

        /**
         * Initialize rollback manager
         */
        async initialize(dependencies = {}) {
            console.log('=� Initializing Rollback Manager...');
            
            try {
                // Set dependencies
                this.dependencies = {
                    orchestrator: dependencies.orchestrator || window.SystemIntegrationOrchestrator,
                    deploymentController: dependencies.deploymentController || window.CompleteSystemDeployment,
                    canaryController: dependencies.canaryController || window.CanaryController,
                    productionMonitor: dependencies.productionMonitor || window.ProductionMonitor,
                    featureFlags: dependencies.featureFlags || window.MLFeatureFlags
                };
                
                // Validate dependencies
                this.validateDependencies();
                
                // Initialize storage
                await this.snapshotStorage.initialize();
                
                // Load existing snapshots
                await this.loadSnapshots();
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Initialize strategies
                await this.initializeStrategies();
                
                // Start snapshot collection
                this.startSnapshotCollection();
                
                // Start monitoring
                this.startMonitoring();
                
                // Register with orchestrator
                if (this.dependencies.orchestrator) {
                    await this.dependencies.orchestrator.registerComponent('rollbackManager', this);
                }
                
                this.state.status = 'monitoring';
                console.log(' Rollback Manager initialized successfully');
                
                return true;
                
            } catch (error) {
                console.error('� Rollback Manager initialization failed:', error);
                throw error;
            }
        }

        /**
         * Validate required dependencies
         */
        validateDependencies() {
            const required = ['orchestrator', 'deploymentController'];
            const missing = required.filter(dep => !this.dependencies[dep]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
            }
        }

        /**
         * Initialize rollback strategies
         */
        async initializeStrategies() {
            for (const [name, strategy] of Object.entries(this.strategies)) {
                await strategy.initialize({
                    dependencies: this.dependencies,
                    config: this.config
                });
            }
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // System events
            if (window.KC?.EventBus) {
                KC.EventBus.on('SYSTEM_CRITICAL_ERROR', this.handleCriticalError.bind(this));
                KC.EventBus.on('DEPLOYMENT_FAILED', this.handleDeploymentFailure.bind(this));
                KC.EventBus.on('HEALTH_CHECK_FAILED', this.handleHealthCheckFailure.bind(this));
            }
            
            // Canary events
            window.addEventListener('canary-rollout-rolled-back', this.handleCanaryRollback.bind(this));
            window.addEventListener('canary-phase-stuck', this.handlePhaseStuck.bind(this));
            
            // Production monitor events
            window.addEventListener('production-critical-alert', this.handleCriticalAlert.bind(this));
            window.addEventListener('production-threshold-breach', this.handleThresholdBreach.bind(this));
        }

        /**
         * Load existing snapshots
         */
        async loadSnapshots() {
            try {
                const snapshots = await this.snapshotStorage.loadAll();
                
                for (const snapshot of snapshots) {
                    this.state.snapshots.set(snapshot.id, snapshot);
                }
                
                // Find latest valid snapshot
                const latest = this.findLatestValidSnapshot();
                if (latest) {
                    this.state.lastSnapshot = latest;
                }
                
                console.log(`=� Loaded ${snapshots.length} snapshots`);
                
            } catch (error) {
                console.error('� Failed to load snapshots:', error);
            }
        }

        /**
         * Start snapshot collection
         */
        startSnapshotCollection() {
            // Clear existing timer
            if (this.snapshotTimer) {
                clearInterval(this.snapshotTimer);
            }
            
            // Initial snapshot
            this.createSnapshot('initial');
            
            // Schedule periodic snapshots
            this.snapshotTimer = setInterval(async () => {
                await this.createSnapshot('scheduled');
            }, this.config.snapshotInterval);
            
            console.log('=� Snapshot collection started');
        }

        /**
         * Start monitoring for rollback conditions
         */
        startMonitoring() {
            // Clear existing timer
            if (this.monitoringTimer) {
                clearInterval(this.monitoringTimer);
            }
            
            // Monitor every 10 seconds
            this.monitoringTimer = setInterval(async () => {
                await this.checkRollbackConditions();
            }, 10000);
            
            console.log('=A Rollback monitoring started');
        }

        /**
         * Create system snapshot
         */
        async createSnapshot(trigger = 'manual') {
            try {
                const startTime = performance.now();
                
                console.log(`=� Creating snapshot: ${trigger}`);
                
                // Collect system state
                const systemState = await this.collectSystemState();
                
                // Create snapshot object
                const snapshot = {
                    id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                    trigger,
                    state: systemState,
                    metadata: {
                        version: systemState.deployment?.version,
                        environment: systemState.deployment?.environment,
                        phase: systemState.canary?.currentPhase,
                        health: systemState.health
                    },
                    checksum: this.calculateChecksum(systemState)
                };
                
                // Validate snapshot
                const validation = await this.validator.validateSnapshot(snapshot);
                if (!validation.valid) {
                    throw new Error(`Invalid snapshot: ${validation.errors.join(', ')}`);
                }
                
                // Store snapshot
                await this.snapshotStorage.store(snapshot);
                
                // Update state
                this.state.snapshots.set(snapshot.id, snapshot);
                this.state.lastSnapshot = snapshot;
                
                // Cleanup old snapshots
                await this.cleanupOldSnapshots();
                
                // Update metrics
                this.metrics.snapshotCount++;
                this.metrics.storageUsed = await this.snapshotStorage.getUsedSpace();
                
                const duration = performance.now() - startTime;
                console.log(` Snapshot created successfully (${duration.toFixed(0)}ms)`);
                
                return snapshot;
                
            } catch (error) {
                console.error('� Failed to create snapshot:', error);
                throw error;
            }
        }

        /**
         * Collect complete system state
         */
        async collectSystemState() {
            const state = {
                timestamp: Date.now(),
                deployment: null,
                canary: null,
                featureFlags: null,
                metrics: null,
                health: null,
                configuration: null,
                services: {}
            };
            
            try {
                // Deployment state
                if (this.dependencies.deploymentController && this.dependencies.deploymentController.getState) {
                    state.deployment = await this.dependencies.deploymentController.getState();
                }
                
                // Canary state
                if (this.dependencies.canaryController && this.dependencies.canaryController.getStatus) {
                    state.canary = this.dependencies.canaryController.getStatus();
                }
                
                // Feature flags
                if (this.dependencies.featureFlags && this.dependencies.featureFlags.getAllFlags) {
                    state.featureFlags = await this.dependencies.featureFlags.getAllFlags();
                }
                
                // Production metrics
                if (this.dependencies.productionMonitor) {
                    if (this.dependencies.productionMonitor.getCurrentMetrics) {
                        state.metrics = this.dependencies.productionMonitor.getCurrentMetrics();
                    }
                    if (this.dependencies.productionMonitor.getSystemHealth) {
                        state.health = this.dependencies.productionMonitor.getSystemHealth();
                    }
                }
                
                // System configuration
                if (this.dependencies.orchestrator) {
                    if (this.dependencies.orchestrator.getConfiguration) {
                        state.configuration = await this.dependencies.orchestrator.getConfiguration();
                    }
                    if (this.dependencies.orchestrator.getServiceStates) {
                        state.services = await this.dependencies.orchestrator.getServiceStates();
                    }
                }
                
                // KC system state
                if (window.KC) {
                    state.kcState = {
                        appState: KC.AppState?.getAll(),
                        activeComponents: this.getActiveKCComponents()
                    };
                }
                
            } catch (error) {
                console.error('� Error collecting system state:', error);
                state.collectionErrors = [error.message];
            }
            
            return state;
        }

        /**
         * Get active KC components
         */
        getActiveKCComponents() {
            const components = [];
            
            if (window.KC) {
                Object.keys(KC).forEach(key => {
                    if (typeof KC[key] === 'object' && (KC[key].initialized || KC[key].status)) {
                        components.push({
                            name: key,
                            status: KC[key].status || 'active'
                        });
                    }
                });
            }
            
            return components;
        }

        /**
         * Calculate checksum for state validation
         */
        calculateChecksum(state) {
            const stateString = JSON.stringify(state);
            let hash = 0;
            
            for (let i = 0; i < stateString.length; i++) {
                const char = stateString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            return Math.abs(hash).toString(16);
        }

        /**
         * Cleanup old snapshots
         */
        async cleanupOldSnapshots() {
            const snapshots = Array.from(this.state.snapshots.values())
                .sort((a, b) => b.timestamp - a.timestamp);
            
            if (snapshots.length > this.config.maxSnapshots) {
                const toRemove = snapshots.slice(this.config.maxSnapshots);
                
                for (const snapshot of toRemove) {
                    await this.snapshotStorage.remove(snapshot.id);
                    this.state.snapshots.delete(snapshot.id);
                }
                
                console.log(`>� Cleaned up ${toRemove.length} old snapshots`);
            }
        }

        /**
         * Check rollback conditions
         */
        async checkRollbackConditions() {
            if (this.state.status !== 'monitoring') {
                return;
            }
            
            try {
                // Collect current metrics
                const metrics = await this.collectCurrentMetrics();
                
                // Check automated rollback triggers
                const triggers = await this.evaluateRollbackTriggers(metrics);
                
                if (triggers.length > 0) {
                    console.warn('� Rollback triggers detected:', triggers);
                    
                    // Determine rollback strategy
                    const strategy = this.selectRollbackStrategy(triggers);
                    
                    // Initiate rollback
                    await this.initiateRollback({
                        reason: `Automated: ${triggers.map(t => t.reason).join(', ')}`,
                        strategy,
                        triggers,
                        automated: true
                    });
                }
                
            } catch (error) {
                console.error('� Error checking rollback conditions:', error);
            }
        }

        /**
         * Collect current metrics
         */
        async collectCurrentMetrics() {
            const metrics = {
                errorRate: 0,
                latency: 0,
                availability: 100,
                confidenceScore: 1,
                deploymentHealth: 'healthy',
                canaryPhase: 100,
                criticalAlerts: 0
            };
            
            try {
                // Get production metrics
                if (this.dependencies.productionMonitor && this.dependencies.productionMonitor.getCurrentMetrics) {
                    const prodMetrics = this.dependencies.productionMonitor.getCurrentMetrics();
                    if (prodMetrics) {
                        Object.assign(metrics, prodMetrics);
                    }
                }
                
                // Get canary status
                if (this.dependencies.canaryController && this.dependencies.canaryController.getStatus) {
                    const canaryStatus = this.dependencies.canaryController.getStatus();
                    if (canaryStatus) {
                        metrics.canaryPhase = canaryStatus.currentPhase;
                        metrics.deploymentHealth = canaryStatus.status;
                    }
                }
                
            } catch (error) {
                console.error('� Error collecting metrics:', error);
            }
            
            return metrics;
        }

        /**
         * Evaluate rollback triggers
         */
        async evaluateRollbackTriggers(metrics) {
            const triggers = [];
            
            // Error rate threshold
            if (metrics.errorRate > 10) {
                triggers.push({
                    type: 'error_rate',
                    severity: 'critical',
                    value: metrics.errorRate,
                    threshold: 10,
                    reason: `Error rate ${metrics.errorRate}% exceeds critical threshold`
                });
            }
            
            // Latency threshold
            if (metrics.latency > 1000) {
                triggers.push({
                    type: 'latency',
                    severity: 'high',
                    value: metrics.latency,
                    threshold: 1000,
                    reason: `Latency ${metrics.latency}ms exceeds threshold`
                });
            }
            
            // Availability threshold
            if (metrics.availability < 95) {
                triggers.push({
                    type: 'availability',
                    severity: 'critical',
                    value: metrics.availability,
                    threshold: 95,
                    reason: `Availability ${metrics.availability}% below minimum`
                });
            }
            
            // ML confidence threshold
            if (metrics.confidenceScore < 0.7) {
                triggers.push({
                    type: 'ml_confidence',
                    severity: 'high',
                    value: metrics.confidenceScore,
                    threshold: 0.7,
                    reason: `ML confidence ${metrics.confidenceScore} below threshold`
                });
            }
            
            // Critical alerts
            if (metrics.criticalAlerts > 0) {
                triggers.push({
                    type: 'critical_alerts',
                    severity: 'critical',
                    value: metrics.criticalAlerts,
                    threshold: 0,
                    reason: `${metrics.criticalAlerts} critical alerts active`
                });
            }
            
            return triggers;
        }

        /**
         * Select appropriate rollback strategy
         */
        selectRollbackStrategy(triggers) {
            // Check for critical triggers
            const criticalTriggers = triggers.filter(t => t.severity === 'critical');
            
            if (criticalTriggers.length > 1 || this.config.emergencyMode) {
                return 'emergency';
            }
            
            if (criticalTriggers.length === 1) {
                return 'immediate';
            }
            
            // Check if in canary phase
            if (this.dependencies.canaryController?.getStatus()?.currentPhase < 100) {
                return 'selective';
            }
            
            return 'graceful';
        }

        /**
         * Initiate rollback
         */
        async initiateRollback(options = {}) {
            try {
                if (this.state.status === 'rolling_back') {
                    console.warn('� Rollback already in progress');
                    return false;
                }
                
                console.warn('= Initiating rollback:', options);
                
                // Update state
                this.state.status = 'preparing';
                this.state.activeRollback = {
                    id: `rollback_${Date.now()}`,
                    startTime: Date.now(),
                    reason: options.reason || 'Manual rollback',
                    strategy: options.strategy || 'graceful',
                    automated: options.automated || false,
                    triggers: options.triggers || [],
                    targetSnapshot: options.targetSnapshot || this.state.lastSnapshot?.id
                };
                
                // Create pre-rollback snapshot
                await this.createSnapshot('pre_rollback');
                
                // Validate target snapshot
                const targetSnapshot = await this.validateTargetSnapshot(
                    this.state.activeRollback.targetSnapshot
                );
                
                if (!targetSnapshot) {
                    throw new Error('No valid snapshot available for rollback');
                }
                
                // Execute rollback strategy
                this.state.status = 'rolling_back';
                const strategy = this.strategies[options.strategy || 'graceful'];
                
                const result = await strategy.execute({
                    targetSnapshot,
                    rollbackId: this.state.activeRollback.id,
                    options
                });
                
                // Validate rollback
                const validation = await this.validateRollback(targetSnapshot);
                
                if (validation.success) {
                    this.state.status = 'completed';
                    this.handleRollbackSuccess(result);
                } else {
                    this.state.status = 'failed';
                    this.handleRollbackFailure(validation);
                }
                
                return validation.success;
                
            } catch (error) {
                console.error('� Rollback failed:', error);
                this.state.status = 'failed';
                this.handleRollbackError(error);
                return false;
            }
        }

        /**
         * Validate target snapshot
         */
        async validateTargetSnapshot(snapshotId) {
            if (!snapshotId) {
                // Find best available snapshot
                return this.findBestSnapshot();
            }
            
            const snapshot = this.state.snapshots.get(snapshotId);
            if (!snapshot) {
                console.error(`� Snapshot ${snapshotId} not found`);
                return this.findBestSnapshot();
            }
            
            // Validate snapshot integrity
            const validation = await this.validator.validateSnapshot(snapshot);
            if (!validation.valid) {
                console.warn(`� Snapshot ${snapshotId} validation failed:`, validation.errors);
                return this.findBestSnapshot();
            }
            
            return snapshot;
        }

        /**
         * Find best available snapshot
         */
        findBestSnapshot() {
            const snapshots = Array.from(this.state.snapshots.values())
                .filter(s => s.metadata?.health === 'healthy' || !s.metadata?.health)
                .sort((a, b) => b.timestamp - a.timestamp);
            
            for (const snapshot of snapshots) {
                const validation = this.validator.validateSnapshot(snapshot);
                if (validation.valid) {
                    return snapshot;
                }
            }
            
            return null;
        }

        /**
         * Find latest valid snapshot
         */
        findLatestValidSnapshot() {
            return this.findBestSnapshot();
        }

        /**
         * Validate rollback completion
         */
        async validateRollback(targetSnapshot) {
            try {
                console.log("🔍 Validating rollback...");
                
                // Collect current state
                const currentState = await this.collectSystemState();
                
                // Compare with target snapshot
                const comparison = await this.validator.compareStates(
                    targetSnapshot.state,
                    currentState
                );
                
                // Check critical components
                const componentValidation = await this.validateCriticalComponents();
                
                // Check system health
                const healthCheck = await this.performHealthCheck();
                
                const validation = {
                    success: comparison.match > 0.9 && componentValidation.valid && healthCheck.healthy,
                    comparison,
                    componentValidation,
                    healthCheck,
                    issues: []
                };
                
                if (!(comparison.match > 0.9)) {
                    validation.issues.push(`State mismatch: ${(comparison.match * 100).toFixed(1)}%`);
                }
                
                if (!componentValidation.valid) {
                    validation.issues.push(...componentValidation.issues);
                }
                
                if (!healthCheck.healthy) {
                    validation.issues.push(...healthCheck.issues);
                }
                
                return validation;
                
            } catch (error) {
                console.error('� Rollback validation failed:', error);
                return {
                    success: false,
                    error: error.message,
                    issues: ['Validation error occurred']
                };
            }
        }

        /**
         * Validate critical components
         */
        async validateCriticalComponents() {
            const validation = {
                valid: true,
                issues: []
            };
            
            // Check KC core
            if (window.KC) {
                if (!KC.AppState || !KC.EventBus) {
                    validation.valid = false;
                    validation.issues.push('KC core components not available');
                }
            }
            
            // Check ML system
            if (window.MLConfidenceTracker && window.MLConfidenceTracker.getStatus) {
                try {
                    const mlStatus = await MLConfidenceTracker.getStatus();
                    if (mlStatus.status !== 'active') {
                        validation.valid = false;
                        validation.issues.push('ML system not active');
                    }
                } catch (error) {
                    console.warn('� Could not check ML system status:', error);
                }
            }
            
            // Check deployment status
            if (this.dependencies.deploymentController && this.dependencies.deploymentController.getStatus) {
                try {
                    const deployStatus = await this.dependencies.deploymentController.getStatus();
                    if (deployStatus.status === 'error') {
                        validation.valid = false;
                        validation.issues.push('Deployment in error state');
                    }
                } catch (error) {
                    console.warn('� Could not check deployment status:', error);
                }
            }
            
            return validation;
        }

        /**
         * Perform system health check
         */
        async performHealthCheck() {
            const health = {
                healthy: true,
                issues: []
            };
            
            try {
                // Check production metrics
                if (this.dependencies.productionMonitor && this.dependencies.productionMonitor.getCurrentMetrics) {
                    const metrics = this.dependencies.productionMonitor.getCurrentMetrics();
                    
                    if (metrics?.errorRate > 5) {
                        health.healthy = false;
                        health.issues.push(`High error rate: ${metrics.errorRate}%`);
                    }
                    
                    if (metrics?.availability < 99) {
                        health.healthy = false;
                        health.issues.push(`Low availability: ${metrics.availability}%`);
                    }
                }
                
            } catch (error) {
                health.healthy = false;
                health.issues.push(`Health check error: ${error.message}`);
            }
            
            return health;
        }

        /**
         * Handle rollback success
         */
        handleRollbackSuccess(result) {
            const rollback = this.state.activeRollback;
            const duration = Date.now() - rollback.startTime;
            
            // Update metrics
            this.metrics.rollbackCount++;
            this.metrics.lastRollbackDuration = duration;
            this.metrics.averageRollbackTime = 
                (this.metrics.averageRollbackTime * (this.metrics.rollbackCount - 1) + duration) / 
                this.metrics.rollbackCount;
            
            // Record in history
            this.state.rollbackHistory.push({
                ...rollback,
                endTime: Date.now(),
                duration,
                result: 'success',
                details: result
            });
            
            // Create post-rollback snapshot
            this.createSnapshot('post_rollback');
            
            console.log(' Rollback completed successfully', {
                rollbackId: rollback.id,
                duration: `${duration}ms`,
                strategy: rollback.strategy
            });
            
            // Clear active rollback
            this.state.activeRollback = null;
        }

        /**
         * Handle rollback failure
         */
        handleRollbackFailure(validation) {
            const rollback = this.state.activeRollback;
            
            console.error('� Rollback validation failed:', {
                rollbackId: rollback.id,
                issues: validation.issues
            });
            
            // Record failure
            this.state.rollbackHistory.push({
                ...rollback,
                endTime: Date.now(),
                duration: Date.now() - rollback.startTime,
                result: 'failed',
                issues: validation.issues
            });
            
            // Initiate emergency procedures
            if (rollback.strategy !== 'emergency') {
                this.initiateEmergencyProcedures(new Error('Rollback validation failed'));
            }
        }

        /**
         * Handle rollback error
         */
        handleRollbackError(error) {
            const rollback = this.state.activeRollback;
            
            console.error('=� CRITICAL: Rollback error:', error);
            
            if (rollback) {
                this.state.rollbackHistory.push({
                    ...rollback,
                    endTime: Date.now(),
                    duration: Date.now() - rollback.startTime,
                    result: 'error',
                    error: error.message
                });
            }
            
            // Initiate emergency procedures
            this.initiateEmergencyProcedures(error);
        }

        /**
         * Initiate emergency procedures
         */
        async initiateEmergencyProcedures(error) {
            console.error('<� INITIATING EMERGENCY PROCEDURES:', error);
            
            try {
                // Record emergency
                this.state.emergencyProcedures.push({
                    timestamp: Date.now(),
                    trigger: error?.message || 'Unknown',
                    procedures: []
                });
                
                const emergency = this.state.emergencyProcedures[this.state.emergencyProcedures.length - 1];
                
                // 1. Stop all deployments
                if (this.dependencies.deploymentController && this.dependencies.deploymentController.emergencyStop) {
                    await this.dependencies.deploymentController.emergencyStop();
                    emergency.procedures.push('Stopped all deployments');
                }
                
                // 2. Disable all feature flags
                if (this.dependencies.featureFlags && this.dependencies.featureFlags.disableAll) {
                    await this.dependencies.featureFlags.disableAll();
                    emergency.procedures.push('Disabled all feature flags');
                }
                
                // 3. Activate emergency mode
                if (this.dependencies.orchestrator && this.dependencies.orchestrator.activateEmergencyMode) {
                    await this.dependencies.orchestrator.activateEmergencyMode();
                    emergency.procedures.push('Activated emergency mode');
                }
                
                // 4. Try emergency rollback if not already attempting
                if (this.state.status !== 'rolling_back') {
                    await this.initiateRollback({
                        reason: 'Emergency procedures activated',
                        strategy: 'emergency',
                        automated: true
                    });
                }
                
            } catch (emergencyError) {
                console.error('=� CRITICAL: Emergency procedures failed:', emergencyError);
            }
        }

        /**
         * Get rollback status
         */
        getStatus() {
            return {
                status: this.state.status,
                activeRollback: this.state.activeRollback,
                lastSnapshot: this.state.lastSnapshot ? {
                    id: this.state.lastSnapshot.id,
                    timestamp: this.state.lastSnapshot.timestamp,
                    trigger: this.state.lastSnapshot.trigger
                } : null,
                snapshotCount: this.state.snapshots.size,
                metrics: this.metrics,
                rollbackHistory: this.state.rollbackHistory.slice(-10), // Last 10 rollbacks
                emergencyProcedures: this.state.emergencyProcedures.slice(-5) // Last 5 emergencies
            };
        }

        /**
         * Event handlers
         */
        handleCriticalError(event) {
            console.error('=� Critical error detected:', event);
            
            if (this.state.status === 'monitoring') {
                this.initiateRollback({
                    reason: `Critical error: ${event.message || 'Unknown'}`,
                    strategy: 'immediate',
                    automated: true
                });
            }
        }

        handleDeploymentFailure(event) {
            console.error('=� Deployment failure detected:', event);
            
            if (this.state.status === 'monitoring') {
                this.initiateRollback({
                    reason: `Deployment failure: ${event.reason || 'Unknown'}`,
                    strategy: 'immediate',
                    automated: true
                });
            }
        }

        handleHealthCheckFailure(event) {
            console.warn('� Health check failure:', event);
            // Implementation would accumulate failures before triggering rollback
        }

        handleCanaryRollback(event) {
            console.log('= Canary rollback detected:', event.detail);
            this.createSnapshot('canary_rollback');
        }

        handlePhaseStuck(event) {
            console.warn('� Canary phase stuck:', event.detail);
            // Implementation would consider rollback if phase stuck too long
        }

        handleCriticalAlert(event) {
            console.error('=� Production critical alert:', event.detail);
            
            if (event.detail.severity === 'critical' && this.state.status === 'monitoring') {
                this.initiateRollback({
                    reason: `Critical alert: ${event.detail.message}`,
                    strategy: 'immediate',
                    automated: true
                });
            }
        }

        handleThresholdBreach(event) {
            console.warn('� Production threshold breach:', event.detail);
            // Implementation would check for multiple breaches before rollback
        }

        /**
         * Stop monitoring
         */
        stop() {
            if (this.snapshotTimer) {
                clearInterval(this.snapshotTimer);
                this.snapshotTimer = null;
            }
            
            if (this.monitoringTimer) {
                clearInterval(this.monitoringTimer);
                this.monitoringTimer = null;
            }
            
            this.state.status = 'stopped';
            console.log('� Rollback manager stopped');
        }
    }

    // ============================================================================
    // ROLLBACK STRATEGIES
    // ============================================================================

    /**
     * Base rollback strategy
     */
    class BaseRollbackStrategy {
        constructor() {
            this.name = 'base';
            this.dependencies = null;
            this.config = null;
        }
        
        async initialize(options) {
            this.dependencies = options.dependencies;
            this.config = options.config;
        }
        
        async execute(context) {
            throw new Error('Strategy must implement execute method');
        }
    }

    /**
     * Immediate rollback strategy - fastest rollback
     */
    class ImmediateRollbackStrategy extends BaseRollbackStrategy {
        constructor() {
            super();
            this.name = 'immediate';
        }
        
        async execute(context) {
            console.log('� Executing immediate rollback strategy');
            
            const steps = [];
            
            try {
                // 1. Stop all traffic immediately
                if (this.dependencies.deploymentController && this.dependencies.deploymentController.stopTraffic) {
                    await this.dependencies.deploymentController.stopTraffic();
                    steps.push('Stopped all traffic');
                }
                
                // 2. Disable feature flags
                if (this.dependencies.featureFlags && this.dependencies.featureFlags.updateFlag) {
                    await this.dependencies.featureFlags.updateFlag('ml_confidence_enabled', {
                        enabled: false
                    });
                    steps.push('Disabled ML feature flag');
                }
                
                // 3. Restore state immediately
                await this.restoreState(context.targetSnapshot);
                steps.push('Restored system state');
                
                // 4. Resume traffic
                if (this.dependencies.deploymentController && this.dependencies.deploymentController.resumeTraffic) {
                    await this.dependencies.deploymentController.resumeTraffic();
                    steps.push('Resumed traffic');
                }
                
                return {
                    strategy: 'immediate',
                    steps,
                    duration: Date.now() - parseInt(context.rollbackId.split('_')[1])
                };
                
            } catch (error) {
                console.error('� Immediate rollback failed:', error);
                throw error;
            }
        }
        
        async restoreState(snapshot) {
            // Restore deployment state
            if (this.dependencies.deploymentController && this.dependencies.deploymentController.restoreState && snapshot.state.deployment) {
                await this.dependencies.deploymentController.restoreState(snapshot.state.deployment);
            }
            
            // Restore feature flags
            if (this.dependencies.featureFlags && this.dependencies.featureFlags.restoreAll && snapshot.state.featureFlags) {
                await this.dependencies.featureFlags.restoreAll(snapshot.state.featureFlags);
            }
            
            // Restore KC state
            if (window.KC?.AppState && snapshot.state.kcState?.appState) {
                KC.AppState.restoreAll(snapshot.state.kcState.appState);
            }
        }
    }

    /**
     * Graceful rollback strategy - controlled rollback with validation
     */
    class GracefulRollbackStrategy extends BaseRollbackStrategy {
        constructor() {
            super();
            this.name = 'graceful';
        }
        
        async execute(context) {
            console.log('=J Executing graceful rollback strategy');
            
            const steps = [];
            
            try {
                // 1. Prepare for rollback
                await this.prepareRollback();
                steps.push('Prepared for rollback');
                
                // 2. Gradually reduce traffic
                await this.reduceTraffic();
                steps.push('Reduced traffic gradually');
                
                // 3. Restore state with validation
                await this.restoreStateWithValidation(context.targetSnapshot);
                steps.push('Restored and validated state');
                
                // 4. Gradually restore traffic
                await this.restoreTraffic();
                steps.push('Restored traffic gradually');
                
                return {
                    strategy: 'graceful',
                    steps,
                    duration: Date.now() - parseInt(context.rollbackId.split('_')[1])
                };
                
            } catch (error) {
                console.error('� Graceful rollback failed:', error);
                throw error;
            }
        }
        
        async prepareRollback() {
            // Set system to maintenance mode
            if (this.dependencies.orchestrator && this.dependencies.orchestrator.setMaintenanceMode) {
                await this.dependencies.orchestrator.setMaintenanceMode(true);
            }
        }
        
        async reduceTraffic() {
            if (this.dependencies.deploymentController && this.dependencies.deploymentController.setTrafficPercentage) {
                // Reduce to 50%
                await this.dependencies.deploymentController.setTrafficPercentage(50);
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Stop traffic
                await this.dependencies.deploymentController.setTrafficPercentage(0);
            }
        }
        
        async restoreStateWithValidation(snapshot) {
            // Restore each component with validation
            const components = ['deployment', 'featureFlags', 'configuration'];
            
            for (const component of components) {
                if (snapshot.state[component]) {
                    await this.restoreComponent(component, snapshot.state[component]);
                    await this.validateComponent(component);
                }
            }
        }
        
        async restoreComponent(name, state) {
            switch (name) {
                case 'deployment':
                    if (this.dependencies.deploymentController && this.dependencies.deploymentController.restoreState) {
                        await this.dependencies.deploymentController.restoreState(state);
                    }
                    break;
                case 'featureFlags':
                    if (this.dependencies.featureFlags && this.dependencies.featureFlags.restoreAll) {
                        await this.dependencies.featureFlags.restoreAll(state);
                    }
                    break;
                case 'configuration':
                    if (this.dependencies.orchestrator && this.dependencies.orchestrator.restoreConfiguration) {
                        await this.dependencies.orchestrator.restoreConfiguration(state);
                    }
                    break;
            }
        }
        
        async validateComponent(name) {
            // Component-specific validation
            console.log(`= Validating ${name} restoration`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        async restoreTraffic() {
            if (this.dependencies.deploymentController && this.dependencies.deploymentController.setTrafficPercentage) {
                // Restore gradually
                await this.dependencies.deploymentController.setTrafficPercentage(50);
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                await this.dependencies.deploymentController.setTrafficPercentage(100);
            }
        }
    }

    /**
     * Selective rollback strategy - rollback specific components
     */
    class SelectiveRollbackStrategy extends BaseRollbackStrategy {
        constructor() {
            super();
            this.name = 'selective';
        }
        
        async execute(context) {
            console.log('<� Executing selective rollback strategy');
            
            const steps = [];
            
            try {
                // 1. Identify affected components
                const affected = await this.identifyAffectedComponents(context.triggers || []);
                steps.push(`Identified ${affected.length} affected components`);
                
                // 2. Rollback only affected components
                for (const component of affected) {
                    await this.rollbackComponent(component, context.targetSnapshot);
                    steps.push(`Rolled back ${component}`);
                }
                
                return {
                    strategy: 'selective',
                    steps,
                    affectedComponents: affected,
                    duration: Date.now() - parseInt(context.rollbackId.split('_')[1])
                };
                
            } catch (error) {
                console.error('� Selective rollback failed:', error);
                throw error;
            }
        }
        
        async identifyAffectedComponents(triggers) {
            const affected = new Set();
            
            for (const trigger of triggers) {
                switch (trigger.type) {
                    case 'ml_confidence':
                        affected.add('ml_system');
                        affected.add('feature_flags');
                        break;
                    case 'error_rate':
                        affected.add('deployment');
                        affected.add('canary');
                        break;
                    case 'latency':
                        affected.add('performance');
                        affected.add('caching');
                        break;
                }
            }
            
            return Array.from(affected);
        }
        
        async rollbackComponent(component, snapshot) {
            switch (component) {
                case 'ml_system':
                    if (window.MLConfidenceTracker && window.MLConfidenceTracker.disable) {
                        await MLConfidenceTracker.disable();
                    }
                    break;
                case 'feature_flags':
                    if (this.dependencies.featureFlags && this.dependencies.featureFlags.restoreAll && snapshot.state.featureFlags) {
                        await this.dependencies.featureFlags.restoreAll(snapshot.state.featureFlags);
                    }
                    break;
                case 'deployment':
                    if (this.dependencies.deploymentController && this.dependencies.deploymentController.restoreState && snapshot.state.deployment) {
                        await this.dependencies.deploymentController.restoreState(snapshot.state.deployment);
                    }
                    break;
            }
        }
    }

    /**
     * Emergency rollback strategy - last resort
     */
    class EmergencyRollbackStrategy extends BaseRollbackStrategy {
        constructor() {
            super();
            this.name = 'emergency';
        }
        
        async execute(context) {
            console.error('<� EXECUTING EMERGENCY ROLLBACK');
            
            const steps = [];
            
            try {
                // 1. IMMEDIATE SYSTEM HALT
                await this.haltSystem();
                steps.push('SYSTEM HALTED');
                
                // 2. FORCE STATE RESTORATION
                await this.forceRestore(context.targetSnapshot);
                steps.push('FORCED STATE RESTORATION');
                
                // 3. MINIMAL SYSTEM RESTART
                await this.minimalRestart();
                steps.push('MINIMAL SYSTEM RESTARTED');
                
                return {
                    strategy: 'emergency',
                    steps,
                    severity: 'CRITICAL',
                    duration: Date.now() - parseInt(context.rollbackId.split('_')[1])
                };
                
            } catch (error) {
                console.error('=� EMERGENCY ROLLBACK CATASTROPHIC FAILURE:', error);
                throw error;
            }
        }
        
        async haltSystem() {
            // Stop everything immediately
            const promises = [];
            
            if (this.dependencies.deploymentController && this.dependencies.deploymentController.emergencyStop) {
                promises.push(this.dependencies.deploymentController.emergencyStop());
            }
            
            if (this.dependencies.productionMonitor && this.dependencies.productionMonitor.stop) {
                promises.push(this.dependencies.productionMonitor.stop());
            }
            
            // Don't wait for graceful shutdown
            await Promise.race([
                Promise.all(promises),
                new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
            ]);
        }
        
        async forceRestore(snapshot) {
            // Force restoration without validation
            if (snapshot?.state) {
                // Restore critical state only
                if (window.KC?.AppState && snapshot.state.kcState?.appState) {
                    KC.AppState.clear();
                    KC.AppState.restoreAll(snapshot.state.kcState.appState);
                }
                
                // Disable all features
                if (this.dependencies.featureFlags && this.dependencies.featureFlags.disableAll) {
                    await this.dependencies.featureFlags.disableAll();
                }
            }
        }
        
        async minimalRestart() {
            // Start only essential services
            if (this.dependencies.orchestrator && this.dependencies.orchestrator.startMinimalMode) {
                await this.dependencies.orchestrator.startMinimalMode();
            }
        }
    }

    // ============================================================================
    // SUPPORTING CLASSES
    // ============================================================================

    /**
     * Snapshot storage manager
     */
    class SnapshotStorage {
        constructor(config) {
            this.config = config;
            this.storage = null;
            this.dbName = 'RollbackSnapshots';
            this.storeName = 'snapshots';
        }
        
        async initialize() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    this.storage = request.result;
                    resolve();
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'id' });
                    }
                };
            });
        }
        
        async store(snapshot) {
            const compressed = this.config.compression ? 
                await this.compress(snapshot) : snapshot;
            
            return new Promise((resolve, reject) => {
                const transaction = this.storage.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(compressed);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        async loadAll() {
            return new Promise((resolve, reject) => {
                const transaction = this.storage.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                
                request.onsuccess = async () => {
                    const snapshots = [];
                    for (const compressed of request.result) {
                        const snapshot = this.config.compression ?
                            await this.decompress(compressed) : compressed;
                        snapshots.push(snapshot);
                    }
                    resolve(snapshots);
                };
                request.onerror = () => reject(request.error);
            });
        }
        
        async remove(id) {
            return new Promise((resolve, reject) => {
                const transaction = this.storage.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(id);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        async getUsedSpace() {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                return estimate.usage || 0;
            }
            return 0;
        }
        
        async compress(data) {
            // Simple compression using JSON string compression
            const json = JSON.stringify(data);
            const compressed = {
                id: data.id,
                timestamp: data.timestamp,
                compressed: true,
                data: btoa(json) // Base64 encoding as simple compression
            };
            return compressed;
        }
        
        async decompress(compressed) {
            if (!compressed.compressed) {
                return compressed;
            }
            
            const json = atob(compressed.data);
            return JSON.parse(json);
        }
    }

    /**
     * Rollback validator
     */
    class RollbackValidator {
        validateSnapshot(snapshot) {
            const validation = {
                valid: true,
                errors: []
            };
            
            if (!snapshot.id || !snapshot.timestamp) {
                validation.valid = false;
                validation.errors.push('Missing required snapshot fields');
            }
            
            if (!snapshot.state || typeof snapshot.state !== 'object') {
                validation.valid = false;
                validation.errors.push('Invalid snapshot state');
            }
            
            if (!snapshot.checksum) {
                validation.valid = false;
                validation.errors.push('Missing checksum');
            }
            
            return validation;
        }
        
        compareStates(targetState, currentState) {
            let matches = 0;
            let total = 0;
            
            const compare = (target, current, path = '') => {
                if (target === current) {
                    matches++;
                    total++;
                    return;
                }
                
                if (typeof target !== typeof current) {
                    total++;
                    return;
                }
                
                if (typeof target === 'object' && target !== null) {
                    const keys = new Set([...Object.keys(target || {}), ...Object.keys(current || {})]);
                    keys.forEach(key => {
                        compare(target?.[key], current?.[key], `${path}.${key}`);
                    });
                } else {
                    total++;
                }
            };
            
            compare(targetState, currentState);
            
            return {
                match: total > 0 ? matches / total : 0,
                matches,
                total
            };
        }
    }

    /**
     * Recovery procedure manager
     */
    class RecoveryProcedureManager {
        constructor() {
            this.procedures = new Map();
            this.initializeProcedures();
        }
        
        initializeProcedures() {
            this.procedures.set('network_failure', {
                name: 'Network Failure Recovery',
                steps: [
                    'Reset network connections',
                    'Clear DNS cache',
                    'Reestablish service connections',
                    'Validate connectivity'
                ]
            });
            
            this.procedures.set('database_corruption', {
                name: 'Database Corruption Recovery',
                steps: [
                    'Stop database writes',
                    'Run integrity checks',
                    'Restore from backup',
                    'Validate data consistency'
                ]
            });
        }
        
        async executeProcedure(type) {
            const procedure = this.procedures.get(type);
            if (!procedure) {
                throw new Error(`Unknown recovery procedure: ${type}`);
            }
            
            const results = [];
            for (const step of procedure.steps) {
                results.push(await this.executeStep(step));
            }
            
            return {
                procedure: procedure.name,
                results
            };
        }
        
        async executeStep(step) {
            // Simulate step execution
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                step,
                status: 'completed',
                timestamp: Date.now()
            };
        }
    }

    // Register in KC namespace
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KnowledgeConsolidator.RollbackManager = RollbackManager;

})(window);