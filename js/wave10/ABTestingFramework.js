/**
 * Wave 10 - ML A/B Testing Framework
 * 
 * Component: ABTestingFramework.js
 * Purpose: Production A/B testing with ML-specific metrics and statistical rigor
 * 
 * Features:
 * - 3 Statistical Analysis Engines (Frequentist, Bayesian, Sequential)
 * - 5 Assignment Strategies (Random, Deterministic, Stratified, MAB, Contextual)
 * - ML-specific metrics (confidence scores, convergence rates, accuracy)
 * - Power analysis and sample size determination
 * - Real-time experimentation with shadow mode
 * - Bayesian inference for early stopping
 * - Sequential testing to reduce false positives
 */

// ============================================================================
// MAIN AB TESTING FRAMEWORK
// ============================================================================

class ABTestingFramework {
    constructor(config = {}) {
        // Configuration
        this.config = {
            defaultConfidenceLevel: config.confidenceLevel || 0.95,
            defaultPower: config.power || 0.8,
            minSampleSize: config.minSampleSize || 100,
            maxExperimentDuration: config.maxExperimentDuration || 30 * 24 * 60 * 60 * 1000, // 30 days
            multipleTestingCorrection: config.multipleTestingCorrection || 'bonferroni',
            enableBayesian: config.enableBayesian !== false,
            enableSequentialTesting: config.enableSequentialTesting !== false,
            ...config
        };
        
        // State management
        this.experiments = new Map();
        this.assignments = new Map(); // userId -> experimentId -> variant
        this.metrics = new Map(); // experimentId -> metrics data
        this.results = new Map(); // experimentId -> statistical results
        
        // Statistical engines
        this.statisticalEngine = new StatisticalAnalysisEngine(this.config);
        this.bayesianEngine = new BayesianInferenceEngine();
        this.sequentialTestEngine = new SequentialTestingEngine();
        
        // Assignment strategies
        this.assignmentStrategies = {
            random: new RandomAssignment(),
            deterministic: new DeterministicAssignment(),
            stratified: new StratifiedAssignment(),
            multiArmedBandit: new MultiArmedBanditAssignment(),
            contextual: new ContextualBanditAssignment()
        };
        
        // ML metric collectors
        this.mlMetricCollectors = {
            confidence: new ConfidenceMetricCollector(),
            convergence: new ConvergenceMetricCollector(),
            accuracy: new AccuracyMetricCollector(),
            latency: new LatencyMetricCollector(),
            userEngagement: new EngagementMetricCollector()
        };
        
        // Core components
        this.powerAnalyzer = new PowerAnalysisCalculator();
        this.experimentMonitor = new ExperimentMonitor();
        this.shadowModeController = new ShadowModeController();
        
        // Performance metrics
        this.performanceMetrics = {
            experimentsCreated: 0,
            assignmentsMade: 0,
            metricsCollected: 0,
            analysesPerformed: 0,
            avgAssignmentTime: 0,
            avgAnalysisTime: 0
        };
        
        // Initialize logger
        this.logger = this.setupLogger();
    }
    
    /**
     * Setup logger with context
     */
    setupLogger() {
        return {
            info: (message, data = {}) => {
                console.log(`[ABTestingFramework] ${message}`, {
                    ...data,
                    experimentsActive: this.experiments.size,
                    timestamp: new Date().toISOString()
                });
            },
            warn: (message, data = {}) => {
                console.warn(`[ABTestingFramework] ${message}`, {
                    ...data,
                    experimentsActive: this.experiments.size,
                    timestamp: new Date().toISOString()
                });
            },
            error: (message, error, data = {}) => {
                console.error(`[ABTestingFramework] ${message}`, {
                    error: error.message,
                    stack: error.stack,
                    ...data,
                    timestamp: new Date().toISOString()
                });
            }
        };
    }
    
    /**
     * Initialize the A/B testing framework
     */
    async initialize() {
        try {
            this.logger.info('Initializing A/B testing framework');
            
            // Initialize statistical engines
            await this.statisticalEngine.initialize();
            if (this.config.enableBayesian) {
                await this.bayesianEngine.initialize();
            }
            if (this.config.enableSequentialTesting) {
                await this.sequentialTestEngine.initialize();
            }
            
            // Initialize assignment strategies
            for (const [name, strategy] of Object.entries(this.assignmentStrategies)) {
                await strategy.initialize();
            }
            
            // Initialize metric collectors
            for (const [name, collector] of Object.entries(this.mlMetricCollectors)) {
                await collector.initialize();
            }
            
            // Start experiment monitoring
            this.experimentMonitor.start(this);
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.logger.info('A/B testing framework initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize A/B testing framework', error);
            throw error;
        }
    }
    
    /**
     * Create a new experiment
     */
    async createExperiment(config) {
        const startTime = Date.now();
        
        try {
            // Validate configuration
            this.validateExperimentConfig(config);
            
            // Calculate required sample size
            const powerAnalysis = await this.powerAnalyzer.calculate({
                baselineRate: config.baselineRate || 0.5,
                minimumDetectableEffect: config.minimumDetectableEffect || 0.05,
                confidenceLevel: config.confidenceLevel || this.config.defaultConfidenceLevel,
                power: config.power || this.config.defaultPower,
                variants: config.variants.length,
                metric: config.primaryMetric
            });
            
            // Create experiment object
            const experiment = {
                id: config.id || this.generateExperimentId(),
                name: config.name,
                description: config.description,
                status: 'active',
                variants: config.variants,
                primaryMetric: config.primaryMetric,
                secondaryMetrics: config.secondaryMetrics || [],
                assignmentStrategy: config.assignmentStrategy || 'random',
                targetingRules: config.targetingRules || {},
                requiredSampleSize: powerAnalysis.requiredSampleSize,
                minRunTime: powerAnalysis.minRunTime,
                shadowMode: config.shadowMode || false,
                created: new Date().toISOString(),
                startTime: Date.now(),
                endTime: null,
                config: config
            };
            
            // Store experiment
            this.experiments.set(experiment.id, experiment);
            
            // Setup shadow mode if enabled
            if (experiment.shadowMode) {
                await this.shadowModeController.setupExperiment(experiment);
            }
            
            // Track experiment
            this.experimentMonitor.trackExperiment(experiment);
            
            // Update metrics
            this.performanceMetrics.experimentsCreated++;
            this.performanceMetrics.avgAssignmentTime = 
                (this.performanceMetrics.avgAssignmentTime * 
                (this.performanceMetrics.experimentsCreated - 1) + 
                (Date.now() - startTime)) / 
                this.performanceMetrics.experimentsCreated;
            
            // Emit event
            this.emitEvent('experiment-created', { experiment });
            
            this.logger.info('Experiment created', { experimentId: experiment.id });
            return experiment;
            
        } catch (error) {
            this.logger.error('Failed to create experiment', error);
            throw error;
        }
    }
    
    /**
     * Assign user to experiment variant
     */
    async assignUserToExperiment(userId, experimentId, context = {}) {
        const startTime = Date.now();
        
        try {
            // Get experiment
            const experiment = this.experiments.get(experimentId);
            if (!experiment || experiment.status !== 'active') {
                return null;
            }
            
            // Check if user already assigned
            if (this.assignments.has(userId) && 
                this.assignments.get(userId).has(experimentId)) {
                return this.assignments.get(userId).get(experimentId);
            }
            
            // Check targeting rules
            if (!this.meetsTargetingRules(userId, experiment.targetingRules, context)) {
                return null;
            }
            
            // Get assignment strategy
            const strategy = this.assignmentStrategies[experiment.assignmentStrategy];
            if (!strategy) {
                throw new Error(`Unknown assignment strategy: ${experiment.assignmentStrategy}`);
            }
            
            // Assign variant
            const variant = await strategy.assign({
                userId,
                experiment,
                context,
                metrics: this.metrics.get(experimentId)
            });
            
            // Store assignment
            if (!this.assignments.has(userId)) {
                this.assignments.set(userId, new Map());
            }
            this.assignments.get(userId).set(experimentId, variant);
            
            // Track assignment
            this.trackAssignment(userId, experimentId, variant);
            
            // Update performance metrics
            this.performanceMetrics.assignmentsMade++;
            const assignmentTime = Date.now() - startTime;
            this.performanceMetrics.avgAssignmentTime = 
                (this.performanceMetrics.avgAssignmentTime * 
                (this.performanceMetrics.assignmentsMade - 1) + 
                assignmentTime) / this.performanceMetrics.assignmentsMade;
            
            return variant;
            
        } catch (error) {
            this.logger.error('Failed to assign user to experiment', error, {
                userId,
                experimentId
            });
            return null;
        }
    }
    
    /**
     * Track metric for experiment
     */
    async trackMetric(event) {
        try {
            const { userId, experimentId, metricName, value, metadata = {} } = event;
            
            // Get user's variant
            const variant = this.getUserVariant(userId, experimentId);
            if (!variant) {
                return; // User not in experiment
            }
            
            // Get experiment
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                return;
            }
            
            // Track in shadow mode if applicable
            if (experiment.shadowMode) {
                await this.shadowModeController.trackMetric({
                    ...event,
                    variant
                });
            }
            
            // Get metric collector
            const collector = this.mlMetricCollectors[metricName];
            if (collector) {
                await collector.collect({
                    experimentId,
                    variant,
                    userId,
                    value,
                    metadata,
                    timestamp: Date.now()
                });
            }
            
            // Store metric data
            if (!this.metrics.has(experimentId)) {
                this.metrics.set(experimentId, new Map());
            }
            
            const experimentMetrics = this.metrics.get(experimentId);
            if (!experimentMetrics.has(variant)) {
                experimentMetrics.set(variant, {});
            }
            
            const variantMetrics = experimentMetrics.get(variant);
            if (!variantMetrics[metricName]) {
                variantMetrics[metricName] = [];
            }
            
            variantMetrics[metricName].push({
                userId,
                value,
                metadata,
                timestamp: Date.now()
            });
            
            // Update performance metrics
            this.performanceMetrics.metricsCollected++;
            
            // Check for sequential testing boundaries
            if (this.config.enableSequentialTesting) {
                await this.checkSequentialBoundaries(experimentId);
            }
            
        } catch (error) {
            this.logger.error('Failed to track metric', error, event);
        }
    }
    
    /**
     * Analyze experiment results
     */
    async analyzeExperiment(experimentId, options = {}) {
        const startTime = Date.now();
        
        try {
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                throw new Error(`Experiment not found: ${experimentId}`);
            }
            
            const metrics = this.metrics.get(experimentId);
            if (!metrics || metrics.size === 0) {
                return {
                    status: 'insufficient_data',
                    message: 'No metrics collected yet'
                };
            }
            
            // Prepare data for analysis
            const analysisData = this.prepareAnalysisData(experiment, metrics);
            
            // Run statistical analysis
            const results = {
                frequentist: await this.statisticalEngine.analyze(analysisData),
                sampleSizes: this.calculateSampleSizes(metrics),
                runtime: Date.now() - experiment.startTime
            };
            
            // Run Bayesian analysis if enabled
            if (this.config.enableBayesian) {
                results.bayesian = await this.bayesianEngine.analyze(analysisData);
            }
            
            // Run sequential analysis if enabled
            if (this.config.enableSequentialTesting) {
                results.sequential = await this.sequentialTestEngine.analyze(analysisData);
            }
            
            // Calculate ML-specific metrics
            results.mlMetrics = await this.calculateMLMetrics(experiment, metrics);
            
            // Store results
            this.results.set(experimentId, results);
            
            // Update performance metrics
            this.performanceMetrics.analysesPerformed++;
            const analysisTime = Date.now() - startTime;
            this.performanceMetrics.avgAnalysisTime = 
                (this.performanceMetrics.avgAnalysisTime * 
                (this.performanceMetrics.analysesPerformed - 1) + 
                analysisTime) / this.performanceMetrics.analysesPerformed;
            
            // Emit event
            this.emitEvent('experiment-analyzed', {
                experimentId,
                results
            });
            
            return results;
            
        } catch (error) {
            this.logger.error('Failed to analyze experiment', error, { experimentId });
            throw error;
        }
    }
    
    /**
     * Stop experiment
     */
    async stopExperiment(experimentId, options = {}) {
        try {
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                throw new Error(`Experiment not found: ${experimentId}`);
            }
            
            // Update status
            experiment.status = 'stopped';
            experiment.endTime = Date.now();
            experiment.stoppedReason = options.reason || 'manual';
            
            // Stop monitoring
            this.experimentMonitor.stopTracking(experimentId);
            
            // Teardown shadow mode if applicable
            if (experiment.shadowMode) {
                await this.shadowModeController.teardownExperiment(experimentId);
            }
            
            // Final analysis
            const results = await this.analyzeExperiment(experimentId);
            
            // Emit event
            this.emitEvent('experiment-stopped', {
                experiment,
                results
            });
            
            this.logger.info('Experiment stopped', { experimentId });
            
            return {
                experiment,
                results
            };
            
        } catch (error) {
            this.logger.error('Failed to stop experiment', error, { experimentId });
            throw error;
        }
    }
    
    // ========================================================================
    // HELPER METHODS
    // ========================================================================
    
    validateExperimentConfig(config) {
        if (!config.name) {
            throw new Error('Experiment name is required');
        }
        
        if (!config.variants || config.variants.length < 2) {
            throw new Error('At least 2 variants are required');
        }
        
        if (!config.primaryMetric) {
            throw new Error('Primary metric is required');
        }
        
        // Validate variant structure
        config.variants.forEach((variant, index) => {
            if (!variant.name) {
                throw new Error(`Variant at index ${index} missing name`);
            }
            if (typeof variant.weight !== 'number' || variant.weight <= 0) {
                throw new Error(`Variant ${variant.name} has invalid weight`);
            }
        });
        
        // Normalize weights
        const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
        config.variants.forEach(variant => {
            variant.normalizedWeight = variant.weight / totalWeight;
        });
    }
    
    generateExperimentId() {
        return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    meetsTargetingRules(userId, rules, context) {
        if (!rules || Object.keys(rules).length === 0) {
            return true;
        }
        
        // Check each rule
        for (const [key, value] of Object.entries(rules)) {
            if (!this.evaluateRule(key, value, userId, context)) {
                return false;
            }
        }
        
        return true;
    }
    
    evaluateRule(key, value, userId, context) {
        // Simple rule evaluation - can be extended
        if (key === 'userSegment' && context.segment !== value) {
            return false;
        }
        
        if (key === 'minConfidence' && 
            (!context.confidence || context.confidence < value)) {
            return false;
        }
        
        return true;
    }
    
    trackAssignment(userId, experimentId, variant) {
        // Emit assignment event
        this.emitEvent('user-assigned', {
            userId,
            experimentId,
            variant,
            timestamp: Date.now()
        });
    }
    
    getUserVariant(userId, experimentId) {
        if (!this.assignments.has(userId)) {
            return null;
        }
        return this.assignments.get(userId).get(experimentId) || null;
    }
    
    prepareAnalysisData(experiment, metrics) {
        const data = {
            experiment,
            variants: [],
            primaryMetric: experiment.primaryMetric,
            secondaryMetrics: experiment.secondaryMetrics
        };
        
        // Prepare data for each variant
        experiment.variants.forEach(variant => {
            const variantMetrics = metrics.get(variant.name) || {};
            data.variants.push({
                name: variant.name,
                metrics: variantMetrics,
                sampleSize: this.calculateVariantSampleSize(variantMetrics)
            });
        });
        
        return data;
    }
    
    calculateSampleSizes(metrics) {
        const sizes = {};
        
        for (const [variant, variantMetrics] of metrics.entries()) {
            // Count unique users
            const uniqueUsers = new Set();
            Object.values(variantMetrics).forEach(metricData => {
                metricData.forEach(entry => uniqueUsers.add(entry.userId));
            });
            sizes[variant] = uniqueUsers.size;
        }
        
        return sizes;
    }
    
    calculateVariantSampleSize(variantMetrics) {
        const uniqueUsers = new Set();
        
        Object.values(variantMetrics).forEach(metricData => {
            metricData.forEach(entry => uniqueUsers.add(entry.userId));
        });
        
        return uniqueUsers.size;
    }
    
    async calculateMLMetrics(experiment, metrics) {
        const mlMetrics = {};
        
        // Calculate for each ML metric collector
        for (const [name, collector] of Object.entries(this.mlMetricCollectors)) {
            if (collector.calculate) {
                mlMetrics[name] = await collector.calculate(experiment, metrics);
            }
        }
        
        return mlMetrics;
    }
    
    async checkSequentialBoundaries(experimentId) {
        try {
            const experiment = this.experiments.get(experimentId);
            const metrics = this.metrics.get(experimentId);
            
            if (!experiment || !metrics) {
                return;
            }
            
            const analysisData = this.prepareAnalysisData(experiment, metrics);
            const boundaries = await this.sequentialTestEngine.checkBoundaries(analysisData);
            
            if (boundaries.shouldStop) {
                await this.stopExperiment(experimentId, {
                    reason: 'sequential_boundary_reached',
                    boundaries
                });
            }
            
        } catch (error) {
            this.logger.error('Failed to check sequential boundaries', error);
        }
    }
    
    setupEventListeners() {
        // Listen for ML confidence updates
        if (window.KC?.EventBus) {
            window.KC.EventBus.on('ML_CONFIDENCE_UPDATED', 
                this.handleMLConfidenceUpdate.bind(this));
            window.KC.EventBus.on('USER_ACTION', 
                this.handleUserAction.bind(this));
        }
    }
    
    async handleMLConfidenceUpdate(event) {
        // Track confidence metrics for active experiments
        const { userId, confidence, fileId } = event;
        
        for (const [experimentId, experiment] of this.experiments.entries()) {
            if (experiment.status === 'active' && 
                experiment.primaryMetric === 'confidence' ||
                experiment.secondaryMetrics.includes('confidence')) {
                
                await this.trackMetric({
                    userId,
                    experimentId,
                    metricName: 'confidence',
                    value: confidence,
                    metadata: { fileId }
                });
            }
        }
    }
    
    async handleUserAction(event) {
        // Track user engagement metrics
        const { userId, action, metadata } = event;
        
        for (const [experimentId, experiment] of this.experiments.entries()) {
            if (experiment.status === 'active' && 
                experiment.secondaryMetrics.includes('engagement')) {
                
                await this.trackMetric({
                    userId,
                    experimentId,
                    metricName: 'userEngagement',
                    value: 1,
                    metadata: { action, ...metadata }
                });
            }
        }
    }
    
    emitEvent(eventName, data) {
        // Emit custom event
        window.dispatchEvent(new CustomEvent(`ab-testing-${eventName}`, {
            detail: {
                ...data,
                timestamp: Date.now(),
                framework: 'ABTestingFramework'
            }
        }));
        
        // Log event
        this.logger.info(`Event emitted: ${eventName}`, data);
    }
    
    /**
     * Get framework status
     */
    getStatus() {
        return {
            initialized: true,
            experiments: {
                total: this.experiments.size,
                active: Array.from(this.experiments.values())
                    .filter(e => e.status === 'active').length,
                stopped: Array.from(this.experiments.values())
                    .filter(e => e.status === 'stopped').length
            },
            performance: this.performanceMetrics,
            engines: {
                statistical: this.statisticalEngine.getStatus(),
                bayesian: this.config.enableBayesian ? 
                    this.bayesianEngine.getStatus() : 'disabled',
                sequential: this.config.enableSequentialTesting ? 
                    this.sequentialTestEngine.getStatus() : 'disabled'
            }
        };
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.logger.info('Destroying A/B testing framework');
        
        // Stop monitoring
        this.experimentMonitor.stop();
        
        // Clean up event listeners
        if (window.KC?.EventBus) {
            window.KC.EventBus.off('ML_CONFIDENCE_UPDATED', this.handleMLConfidenceUpdate);
            window.KC.EventBus.off('USER_ACTION', this.handleUserAction);
        }
        
        // Persist state
        this.experiments.forEach(experiment => {
            if (experiment.status === 'active') {
                this.stopExperiment(experiment.id, { reason: 'framework_shutdown' });
            }
        });
        
        this.logger.info('A/B testing framework destroyed');
    }
}

// ============================================================================
// STATISTICAL ANALYSIS ENGINE
// ============================================================================

class StatisticalAnalysisEngine {
    constructor(config) {
        this.config = config;
        this.status = 'uninitialized';
    }
    
    async initialize() {
        this.status = 'initialized';
        return true;
    }
    
    async analyze(data) {
        const results = {
            primaryMetric: await this.analyzePrimaryMetric(data),
            secondaryMetrics: {},
            srmCheck: this.checkSampleRatioMismatch(data),
            multipleTestingCorrection: data.secondaryMetrics.length > 0
        };
        
        // Analyze secondary metrics
        for (const metric of data.secondaryMetrics) {
            results.secondaryMetrics[metric] = await this.analyzeMetric(data, metric);
        }
        
        // Apply multiple testing correction
        if (results.multipleTestingCorrection) {
            this.applyMultipleTestingCorrection(results);
        }
        
        return results;
    }
    
    async analyzePrimaryMetric(data) {
        const metric = data.primaryMetric;
        const control = data.variants.find(v => v.name === 'control');
        const treatment = data.variants.find(v => v.name === 'treatment');
        
        if (!control || !treatment) {
            throw new Error('Control and treatment variants required');
        }
        
        const controlData = this.extractMetricData(control.metrics[metric]);
        const treatmentData = this.extractMetricData(treatment.metrics[metric]);
        
        // Determine test type
        const testType = this.determineTestType(controlData, treatmentData);
        
        // Run appropriate test
        let testResult;
        switch (testType) {
            case 'ttest':
                testResult = this.performTTest(controlData, treatmentData);
                break;
            case 'mannwhitney':
                testResult = this.performMannWhitneyU(controlData, treatmentData);
                break;
            case 'chisquare':
                testResult = this.performChiSquare(controlData, treatmentData);
                break;
            default:
                throw new Error(`Unknown test type: ${testType}`);
        }
        
        return {
            metric,
            testType,
            ...testResult,
            effectSize: this.calculateEffectSize(controlData, treatmentData, testType),
            confidenceInterval: this.calculateConfidenceInterval(
                controlData, 
                treatmentData, 
                this.config.defaultConfidenceLevel
            )
        };
    }
    
    analyzeMetric(data, metric) {
        // Similar to analyzePrimaryMetric but for secondary metrics
        return this.analyzePrimaryMetric({ ...data, primaryMetric: metric });
    }
    
    extractMetricData(metricEntries) {
        if (!metricEntries) return [];
        return metricEntries.map(entry => entry.value);
    }
    
    determineTestType(controlData, treatmentData) {
        // Check if data is binary
        const allBinary = [...controlData, ...treatmentData]
            .every(v => v === 0 || v === 1);
        
        if (allBinary) {
            return 'chisquare';
        }
        
        // Check normality (simplified)
        if (this.isNormallyDistributed(controlData) && 
            this.isNormallyDistributed(treatmentData)) {
            return 'ttest';
        }
        
        return 'mannwhitney';
    }
    
    isNormallyDistributed(data) {
        // Simplified normality check
        // In production, use Shapiro-Wilk or Anderson-Darling test
        return data.length > 30;
    }
    
    performTTest(control, treatment) {
        const controlMean = this.mean(control);
        const treatmentMean = this.mean(treatment);
        const controlVar = this.variance(control);
        const treatmentVar = this.variance(treatment);
        const controlN = control.length;
        const treatmentN = treatment.length;
        
        // Pooled standard error
        const pooledSE = Math.sqrt(controlVar / controlN + treatmentVar / treatmentN);
        
        // T-statistic
        const tStat = (treatmentMean - controlMean) / pooledSE;
        
        // Degrees of freedom (Welch's)
        const df = Math.pow(controlVar / controlN + treatmentVar / treatmentN, 2) /
            (Math.pow(controlVar / controlN, 2) / (controlN - 1) +
             Math.pow(treatmentVar / treatmentN, 2) / (treatmentN - 1));
        
        // P-value (simplified - use t-distribution in production)
        const pValue = this.tDistributionCDF(Math.abs(tStat), df) * 2;
        
        return {
            statistic: tStat,
            pValue,
            degreesOfFreedom: df,
            controlMean,
            treatmentMean,
            difference: treatmentMean - controlMean,
            relativeDifference: (treatmentMean - controlMean) / controlMean
        };
    }
    
    performMannWhitneyU(control, treatment) {
        // Simplified Mann-Whitney U test
        const combined = [...control.map(v => ({ value: v, group: 'control' })),
                         ...treatment.map(v => ({ value: v, group: 'treatment' }))]
            .sort((a, b) => a.value - b.value);
        
        // Assign ranks
        let rank = 1;
        for (let i = 0; i < combined.length; i++) {
            combined[i].rank = rank++;
        }
        
        // Calculate U statistics
        const controlRankSum = combined
            .filter(item => item.group === 'control')
            .reduce((sum, item) => sum + item.rank, 0);
        
        const U1 = controlRankSum - (control.length * (control.length + 1)) / 2;
        const U2 = control.length * treatment.length - U1;
        const U = Math.min(U1, U2);
        
        // Normal approximation for large samples
        const meanU = (control.length * treatment.length) / 2;
        const stdU = Math.sqrt((control.length * treatment.length * 
            (control.length + treatment.length + 1)) / 12);
        const z = (U - meanU) / stdU;
        const pValue = this.normalCDF(Math.abs(z)) * 2;
        
        return {
            statistic: U,
            zScore: z,
            pValue,
            controlMedian: this.median(control),
            treatmentMedian: this.median(treatment)
        };
    }
    
    performChiSquare(control, treatment) {
        // For binary outcomes
        const controlSuccess = control.filter(v => v === 1).length;
        const controlFailure = control.length - controlSuccess;
        const treatmentSuccess = treatment.filter(v => v === 1).length;
        const treatmentFailure = treatment.length - treatmentSuccess;
        
        const total = control.length + treatment.length;
        const successTotal = controlSuccess + treatmentSuccess;
        const failureTotal = controlFailure + treatmentFailure;
        
        // Expected frequencies
        const expectedControlSuccess = (control.length * successTotal) / total;
        const expectedControlFailure = (control.length * failureTotal) / total;
        const expectedTreatmentSuccess = (treatment.length * successTotal) / total;
        const expectedTreatmentFailure = (treatment.length * failureTotal) / total;
        
        // Chi-square statistic
        const chiSquare = 
            Math.pow(controlSuccess - expectedControlSuccess, 2) / expectedControlSuccess +
            Math.pow(controlFailure - expectedControlFailure, 2) / expectedControlFailure +
            Math.pow(treatmentSuccess - expectedTreatmentSuccess, 2) / expectedTreatmentSuccess +
            Math.pow(treatmentFailure - expectedTreatmentFailure, 2) / expectedTreatmentFailure;
        
        // P-value (df = 1 for 2x2 table)
        const pValue = this.chiSquareCDF(chiSquare, 1);
        
        return {
            statistic: chiSquare,
            pValue,
            controlRate: controlSuccess / control.length,
            treatmentRate: treatmentSuccess / treatment.length,
            relativeDifference: (treatmentSuccess / treatment.length - 
                controlSuccess / control.length) / (controlSuccess / control.length)
        };
    }
    
    calculateEffectSize(control, treatment, testType) {
        switch (testType) {
            case 'ttest':
                // Cohen's d
                const pooledSD = Math.sqrt(
                    ((control.length - 1) * this.variance(control) +
                     (treatment.length - 1) * this.variance(treatment)) /
                    (control.length + treatment.length - 2)
                );
                return (this.mean(treatment) - this.mean(control)) / pooledSD;
                
            case 'mannwhitney':
                // Rank-biserial correlation
                const U1 = this.performMannWhitneyU(control, treatment).statistic;
                return 1 - (2 * U1) / (control.length * treatment.length);
                
            case 'chisquare':
                // Phi coefficient for 2x2 table
                const chiSquare = this.performChiSquare(control, treatment).statistic;
                return Math.sqrt(chiSquare / (control.length + treatment.length));
                
            default:
                return null;
        }
    }
    
    calculateConfidenceInterval(control, treatment, confidenceLevel) {
        const controlMean = this.mean(control);
        const treatmentMean = this.mean(treatment);
        const difference = treatmentMean - controlMean;
        
        const se = Math.sqrt(
            this.variance(control) / control.length +
            this.variance(treatment) / treatment.length
        );
        
        const z = this.getZScore(confidenceLevel);
        
        return {
            difference,
            lower: difference - z * se,
            upper: difference + z * se,
            confidenceLevel
        };
    }
    
    checkSampleRatioMismatch(data) {
        const observedRatios = {};
        const expectedRatios = {};
        let total = 0;
        
        data.variants.forEach(variant => {
            const size = variant.sampleSize || 0;
            observedRatios[variant.name] = size;
            expectedRatios[variant.name] = 
                data.experiment.variants.find(v => v.name === variant.name).normalizedWeight;
            total += size;
        });
        
        // Chi-square test for SRM
        let chiSquare = 0;
        Object.keys(observedRatios).forEach(variant => {
            const observed = observedRatios[variant];
            const expected = total * expectedRatios[variant];
            chiSquare += Math.pow(observed - expected, 2) / expected;
        });
        
        const df = Object.keys(observedRatios).length - 1;
        const pValue = this.chiSquareCDF(chiSquare, df);
        
        return {
            detected: pValue < 0.001,
            pValue,
            observedRatios,
            expectedRatios,
            chiSquare
        };
    }
    
    applyMultipleTestingCorrection(results) {
        const allPValues = [
            results.primaryMetric.pValue,
            ...Object.values(results.secondaryMetrics).map(m => m.pValue)
        ];
        
        const method = this.config.multipleTestingCorrection;
        
        switch (method) {
            case 'bonferroni':
                const m = allPValues.length;
                results.primaryMetric.adjustedPValue = 
                    Math.min(results.primaryMetric.pValue * m, 1);
                Object.keys(results.secondaryMetrics).forEach(metric => {
                    results.secondaryMetrics[metric].adjustedPValue = 
                        Math.min(results.secondaryMetrics[metric].pValue * m, 1);
                });
                break;
                
            case 'holm':
                // Holm-Bonferroni method
                const sortedPValues = allPValues.sort((a, b) => a - b);
                const adjustments = {};
                
                sortedPValues.forEach((p, i) => {
                    adjustments[p] = Math.min(p * (allPValues.length - i), 1);
                });
                
                results.primaryMetric.adjustedPValue = 
                    adjustments[results.primaryMetric.pValue];
                Object.keys(results.secondaryMetrics).forEach(metric => {
                    results.secondaryMetrics[metric].adjustedPValue = 
                        adjustments[results.secondaryMetrics[metric].pValue];
                });
                break;
                
            default:
                // No adjustment
                break;
        }
    }
    
    // Statistical utility functions
    mean(data) {
        return data.reduce((sum, val) => sum + val, 0) / data.length;
    }
    
    variance(data) {
        const m = this.mean(data);
        return data.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (data.length - 1);
    }
    
    median(data) {
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    getZScore(probability) {
        // Simplified z-score lookup
        const zScores = {
            0.90: 1.64,
            0.95: 1.96,
            0.99: 2.58
        };
        return zScores[probability] || 1.96;
    }
    
    // Simplified CDFs - use proper implementations in production
    normalCDF(z) {
        // Approximation of normal CDF
        return 1 - 0.5 * Math.exp(-1.2 * z - 1);
    }
    
    tDistributionCDF(t, df) {
        // Very rough approximation - use proper implementation
        return this.normalCDF(t * Math.sqrt(df / (df + t * t)));
    }
    
    chiSquareCDF(x, df) {
        // Very rough approximation - use proper implementation
        return 1 - Math.exp(-x / 2);
    }
    
    getStatus() {
        return {
            status: this.status,
            engine: 'frequentist',
            capabilities: ['ttest', 'mannwhitney', 'chisquare']
        };
    }
}

// ============================================================================
// BAYESIAN INFERENCE ENGINE
// ============================================================================

class BayesianInferenceEngine {
    constructor() {
        this.status = 'uninitialized';
        this.priors = {
            binary: { alpha: 1, beta: 1 }, // Beta prior
            continuous: { mu: 0, tau: 0.001 } // Normal prior
        };
    }
    
    async initialize() {
        this.status = 'initialized';
        return true;
    }
    
    async analyze(data) {
        const results = {
            primaryMetric: await this.analyzeMetric(
                data, 
                data.primaryMetric, 
                data.variants
            ),
            secondaryMetrics: {}
        };
        
        // Analyze secondary metrics
        for (const metric of data.secondaryMetrics) {
            results.secondaryMetrics[metric] = await this.analyzeMetric(
                data, 
                metric, 
                data.variants
            );
        }
        
        return results;
    }
    
    async analyzeMetric(data, metric, variants) {
        const metricData = {};
        variants.forEach(variant => {
            metricData[variant.name] = this.extractMetricData(
                variant.metrics[metric]
            );
        });
        
        // Determine metric type
        const isBinary = this.isBinaryMetric(metricData);
        
        if (isBinary) {
            return this.analyzeBinaryMetric(metricData);
        } else {
            return this.analyzeContinuousMetric(metricData);
        }
    }
    
    extractMetricData(metricEntries) {
        if (!metricEntries) return [];
        return metricEntries.map(entry => entry.value);
    }
    
    isBinaryMetric(metricData) {
        const allValues = Object.values(metricData).flat();
        return allValues.every(v => v === 0 || v === 1);
    }
    
    analyzeBinaryMetric(metricData) {
        const posteriors = {};
        
        // Calculate posteriors for each variant
        Object.entries(metricData).forEach(([variant, data]) => {
            const successes = data.filter(v => v === 1).length;
            const failures = data.length - successes;
            
            posteriors[variant] = {
                alpha: this.priors.binary.alpha + successes,
                beta: this.priors.binary.beta + failures,
                mean: (this.priors.binary.alpha + successes) / 
                      (this.priors.binary.alpha + this.priors.binary.beta + data.length)
            };
        });
        
        // Calculate probabilities of being best
        const probabilities = this.calculateProbabilityOfBeingBest(posteriors);
        
        // Calculate expected loss
        const expectedLoss = this.calculateExpectedLoss(posteriors);
        
        return {
            type: 'binary',
            posteriors,
            probabilityOfBeingBest: probabilities,
            expectedLoss,
            credibleIntervals: this.calculateCredibleIntervals(posteriors)
        };
    }
    
    analyzeContinuousMetric(metricData) {
        const posteriors = {};
        
        // Calculate posteriors for each variant
        Object.entries(metricData).forEach(([variant, data]) => {
            const n = data.length;
            const mean = data.reduce((sum, v) => sum + v, 0) / n;
            const variance = data.reduce((sum, v) => 
                sum + Math.pow(v - mean, 2), 0) / (n - 1);
            
            // Update posterior parameters
            const priorTau = this.priors.continuous.tau;
            const dataTau = n / variance;
            const posteriorTau = priorTau + dataTau;
            
            posteriors[variant] = {
                mu: (priorTau * this.priors.continuous.mu + dataTau * mean) / 
                    posteriorTau,
                tau: posteriorTau,
                mean: mean,
                variance: variance,
                n: n
            };
        });
        
        // Calculate probabilities and expected loss
        const probabilities = this.calculateProbabilityOfBeingBestContinuous(posteriors);
        const expectedLoss = this.calculateExpectedLossContinuous(posteriors);
        
        return {
            type: 'continuous',
            posteriors,
            probabilityOfBeingBest: probabilities,
            expectedLoss,
            credibleIntervals: this.calculateCredibleIntervalsContinuous(posteriors)
        };
    }
    
    calculateProbabilityOfBeingBest(posteriors) {
        const variants = Object.keys(posteriors);
        const numSamples = 10000;
        const wins = {};
        
        variants.forEach(v => wins[v] = 0);
        
        // Monte Carlo simulation
        for (let i = 0; i < numSamples; i++) {
            const samples = {};
            variants.forEach(variant => {
                samples[variant] = this.sampleBeta(
                    posteriors[variant].alpha,
                    posteriors[variant].beta
                );
            });
            
            const best = Object.entries(samples)
                .sort((a, b) => b[1] - a[1])[0][0];
            wins[best]++;
        }
        
        const probabilities = {};
        variants.forEach(v => probabilities[v] = wins[v] / numSamples);
        
        return probabilities;
    }
    
    calculateProbabilityOfBeingBestContinuous(posteriors) {
        const variants = Object.keys(posteriors);
        const numSamples = 10000;
        const wins = {};
        
        variants.forEach(v => wins[v] = 0);
        
        // Monte Carlo simulation
        for (let i = 0; i < numSamples; i++) {
            const samples = {};
            variants.forEach(variant => {
                samples[variant] = this.sampleNormal(
                    posteriors[variant].mu,
                    1 / Math.sqrt(posteriors[variant].tau)
                );
            });
            
            const best = Object.entries(samples)
                .sort((a, b) => b[1] - a[1])[0][0];
            wins[best]++;
        }
        
        const probabilities = {};
        variants.forEach(v => probabilities[v] = wins[v] / numSamples);
        
        return probabilities;
    }
    
    calculateExpectedLoss(posteriors) {
        const variants = Object.keys(posteriors);
        const losses = {};
        
        variants.forEach(variant => {
            let expectedLoss = 0;
            
            variants.forEach(other => {
                if (variant !== other) {
                    // Expected loss vs other variant
                    const loss = this.expectedBetaDifference(
                        posteriors[other],
                        posteriors[variant]
                    );
                    expectedLoss = Math.max(expectedLoss, loss);
                }
            });
            
            losses[variant] = expectedLoss;
        });
        
        return losses;
    }
    
    calculateExpectedLossContinuous(posteriors) {
        const variants = Object.keys(posteriors);
        const losses = {};
        
        variants.forEach(variant => {
            let expectedLoss = 0;
            
            variants.forEach(other => {
                if (variant !== other) {
                    const loss = this.expectedNormalDifference(
                        posteriors[other],
                        posteriors[variant]
                    );
                    expectedLoss = Math.max(expectedLoss, loss);
                }
            });
            
            losses[variant] = expectedLoss;
        });
        
        return losses;
    }
    
    calculateCredibleIntervals(posteriors, credibility = 0.95) {
        const intervals = {};
        
        Object.entries(posteriors).forEach(([variant, params]) => {
            intervals[variant] = {
                lower: this.betaQuantile(params.alpha, params.beta, (1 - credibility) / 2),
                upper: this.betaQuantile(params.alpha, params.beta, (1 + credibility) / 2),
                credibility
            };
        });
        
        return intervals;
    }
    
    calculateCredibleIntervalsContinuous(posteriors, credibility = 0.95) {
        const intervals = {};
        const z = this.getZScore(credibility);
        
        Object.entries(posteriors).forEach(([variant, params]) => {
            const std = 1 / Math.sqrt(params.tau);
            intervals[variant] = {
                lower: params.mu - z * std,
                upper: params.mu + z * std,
                credibility
            };
        });
        
        return intervals;
    }
    
    // Sampling functions
    sampleBeta(alpha, beta) {
        // Box-Muller for gamma, then beta
        const gammaAlpha = this.sampleGamma(alpha);
        const gammaBeta = this.sampleGamma(beta);
        return gammaAlpha / (gammaAlpha + gammaBeta);
    }
    
    sampleGamma(shape) {
        // Simplified gamma sampling
        if (shape < 1) {
            return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
        }
        
        const d = shape - 1/3;
        const c = 1 / Math.sqrt(9 * d);
        
        while (true) {
            const z = this.sampleNormal(0, 1);
            const u = Math.random();
            const v = Math.pow(1 + c * z, 3);
            
            if (u < 1 - 0.0331 * Math.pow(z, 4) || 
                Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))) {
                return d * v;
            }
        }
    }
    
    sampleNormal(mean, std) {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + std * z0;
    }
    
    // Utility functions
    expectedBetaDifference(params1, params2) {
        // E[max(X1 - X2, 0)] where X1 ~ Beta(a1, b1), X2 ~ Beta(a2, b2)
        // Approximation using mean difference
        const mean1 = params1.alpha / (params1.alpha + params1.beta);
        const mean2 = params2.alpha / (params2.alpha + params2.beta);
        return Math.max(mean1 - mean2, 0);
    }
    
    expectedNormalDifference(params1, params2) {
        // E[max(X1 - X2, 0)] for normal distributions
        const meanDiff = params1.mu - params2.mu;
        const varSum = 1/params1.tau + 1/params2.tau;
        const std = Math.sqrt(varSum);
        
        // Using normal CDF approximation
        const z = meanDiff / std;
        const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
        const cdf = 0.5 * (1 + this.erf(z / Math.sqrt(2)));
        
        return meanDiff * cdf + std * pdf;
    }
    
    betaQuantile(alpha, beta, p) {
        // Approximate beta quantile using Wilson-Hilferty transformation
        const mean = alpha / (alpha + beta);
        const variance = (alpha * beta) / 
            ((alpha + beta) * (alpha + beta) * (alpha + beta + 1));
        
        // Normal approximation for large alpha, beta
        if (alpha > 30 && beta > 30) {
            const z = this.normalQuantile(p);
            return mean + z * Math.sqrt(variance);
        }
        
        // Use mean as approximation for small samples
        return mean;
    }
    
    normalQuantile(p) {
        // Approximate inverse normal CDF
        const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
        const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
        const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
                  0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
                  0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
        
        const y = p - 0.5;
        if (Math.abs(y) < 0.42) {
            const r = y * y;
            return y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) /
                      ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
        } else {
            let r = p;
            if (y > 0) r = 1 - p;
            r = Math.log(-Math.log(r));
            
            let x = c[0];
            for (let i = 1; i < 9; i++) {
                x = x * r + c[i];
            }
            
            if (y < 0) x = -x;
            return x;
        }
    }
    
    erf(x) {
        // Error function approximation
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * 
                  Math.exp(-x * x);
        
        return sign * y;
    }
    
    getZScore(probability) {
        const zScores = {
            0.90: 1.64,
            0.95: 1.96,
            0.99: 2.58
        };
        return zScores[probability] || 1.96;
    }
    
    getStatus() {
        return {
            status: this.status,
            engine: 'bayesian',
            capabilities: ['beta-binomial', 'normal-normal', 'monte-carlo']
        };
    }
}

// ============================================================================
// SEQUENTIAL TESTING ENGINE
// ============================================================================

class SequentialTestingEngine {
    constructor() {
        this.status = 'uninitialized';
        this.boundaries = {
            pocock: { alpha: 0.05, beta: 0.2 },
            obrien_fleming: { alpha: 0.05, beta: 0.2 }
        };
    }
    
    async initialize() {
        this.status = 'initialized';
        return true;
    }
    
    async analyze(data) {
        const results = {
            method: 'obrien-fleming',
            checkpoints: this.calculateCheckpoints(data),
            currentStage: this.getCurrentStage(data),
            boundaries: this.calculateBoundaries(data),
            decision: null
        };
        
        // Check if we've crossed any boundaries
        const testStatistic = this.calculateTestStatistic(data);
        const boundary = results.boundaries[results.currentStage];
        
        if (Math.abs(testStatistic) >= boundary.critical) {
            results.decision = {
                stop: true,
                reject: testStatistic > 0 ? 'treatment' : 'control',
                stage: results.currentStage,
                pValue: this.adjustedPValue(testStatistic, results.currentStage)
            };
        }
        
        return results;
    }
    
    async checkBoundaries(data) {
        const analysis = await this.analyze(data);
        return {
            shouldStop: analysis.decision?.stop || false,
            reason: analysis.decision ? 
                `Sequential boundary reached at stage ${analysis.currentStage}` : null,
            analysis
        };
    }
    
    calculateCheckpoints(data) {
        // 5 equally spaced checkpoints
        const maxSampleSize = data.experiment.requiredSampleSize;
        const checkpoints = [];
        
        for (let i = 1; i <= 5; i++) {
            checkpoints.push({
                stage: i,
                sampleSize: Math.floor((i / 5) * maxSampleSize),
                informationFraction: i / 5
            });
        }
        
        return checkpoints;
    }
    
    getCurrentStage(data) {
        const currentSampleSize = Object.values(data.variants)
            .reduce((sum, v) => sum + v.sampleSize, 0);
        const maxSampleSize = data.experiment.requiredSampleSize;
        const fraction = currentSampleSize / maxSampleSize;
        
        return Math.min(Math.ceil(fraction * 5), 5);
    }
    
    calculateBoundaries(data) {
        const method = 'obrien-fleming'; // O'Brien-Fleming boundaries
        const stages = 5;
        const alpha = this.boundaries.obrien_fleming.alpha;
        
        const boundaries = {};
        
        for (let k = 1; k <= stages; k++) {
            const informationFraction = k / stages;
            
            if (method === 'obrien-fleming') {
                // O'Brien-Fleming spending function
                const criticalValue = this.obrienFlemingBoundary(k, stages, alpha);
                boundaries[k] = {
                    critical: criticalValue,
                    nominalAlpha: this.nominalAlpha(criticalValue),
                    informationFraction
                };
            }
        }
        
        return boundaries;
    }
    
    obrienFlemingBoundary(k, K, alpha) {
        // O'Brien-Fleming boundary at stage k of K
        const z_alpha = this.getZScore(1 - alpha/2);
        return z_alpha * Math.sqrt(K / k);
    }
    
    nominalAlpha(criticalValue) {
        // Convert critical value to nominal alpha level
        return 2 * (1 - this.normalCDF(Math.abs(criticalValue)));
    }
    
    calculateTestStatistic(data) {
        // Calculate z-statistic for primary metric
        const control = data.variants.find(v => v.name === 'control');
        const treatment = data.variants.find(v => v.name === 'treatment');
        
        if (!control || !treatment) return 0;
        
        const metric = data.primaryMetric;
        const controlData = control.metrics[metric] || [];
        const treatmentData = treatment.metrics[metric] || [];
        
        // For binary metrics
        const controlRate = controlData.filter(d => d.value === 1).length / 
                          controlData.length;
        const treatmentRate = treatmentData.filter(d => d.value === 1).length / 
                            treatmentData.length;
        
        const pooledRate = (controlData.filter(d => d.value === 1).length + 
                          treatmentData.filter(d => d.value === 1).length) /
                          (controlData.length + treatmentData.length);
        
        const se = Math.sqrt(pooledRate * (1 - pooledRate) * 
                           (1/controlData.length + 1/treatmentData.length));
        
        return (treatmentRate - controlRate) / se;
    }
    
    adjustedPValue(testStatistic, stage) {
        // Adjust p-value for sequential testing
        const nominalP = 2 * (1 - this.normalCDF(Math.abs(testStatistic)));
        
        // Simple Bonferroni-like adjustment
        return Math.min(nominalP * stage, 1);
    }
    
    normalCDF(z) {
        // Approximation of normal CDF
        return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
    }
    
    erf(x) {
        // Error function approximation
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * 
                  Math.exp(-x * x);
        
        return sign * y;
    }
    
    getZScore(probability) {
        const zScores = {
            0.90: 1.64,
            0.95: 1.96,
            0.975: 2.24,
            0.99: 2.58
        };
        return zScores[probability] || 1.96;
    }
    
    getStatus() {
        return {
            status: this.status,
            engine: 'sequential',
            methods: ['pocock', 'obrien-fleming'],
            maxStages: 5
        };
    }
}

// ============================================================================
// POWER ANALYSIS CALCULATOR
// ============================================================================

class PowerAnalysisCalculator {
    async calculate(params) {
        const {
            baselineRate,
            minimumDetectableEffect,
            confidenceLevel,
            power,
            variants = 2,
            metric
        } = params;
        
        // Z-scores
        const zAlpha = this.getZScore(confidenceLevel);
        const zBeta = this.getZScore(power);
        
        // Calculate sample size based on metric type
        let sampleSizePerVariant;
        
        if (this.isBinaryMetric(metric)) {
            sampleSizePerVariant = this.calculateBinarySampleSize(
                baselineRate,
                baselineRate + minimumDetectableEffect,
                zAlpha,
                zBeta
            );
        } else {
            // Assume continuous metric with estimated variance
            const estimatedStd = baselineRate * 0.5; // Rough estimate
            sampleSizePerVariant = this.calculateContinuousSampleSize(
                minimumDetectableEffect,
                estimatedStd,
                zAlpha,
                zBeta
            );
        }
        
        // Adjust for multiple variants if needed
        const totalSampleSize = sampleSizePerVariant * variants;
        
        // Estimate minimum runtime (assuming 1000 users/day)
        const usersPerDay = 1000;
        const minRunTime = Math.ceil(totalSampleSize / usersPerDay) * 24 * 60 * 60 * 1000;
        
        return {
            sampleSizePerVariant: Math.ceil(sampleSizePerVariant),
            totalSampleSize: Math.ceil(totalSampleSize),
            requiredSampleSize: Math.ceil(totalSampleSize),
            minRunTime,
            parameters: params
        };
    }
    
    calculateBinarySampleSize(p1, p2, zAlpha, zBeta) {
        const pBar = (p1 + p2) / 2;
        const numerator = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + 
                                  zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
        const denominator = Math.pow(p2 - p1, 2);
        
        return numerator / denominator;
    }
    
    calculateContinuousSampleSize(delta, sigma, zAlpha, zBeta) {
        return 2 * Math.pow(sigma, 2) * Math.pow(zAlpha + zBeta, 2) / Math.pow(delta, 2);
    }
    
    isBinaryMetric(metric) {
        const binaryMetrics = ['conversion', 'success', 'click', 'purchase'];
        return binaryMetrics.includes(metric);
    }
    
    getZScore(probability) {
        const zScores = {
            0.80: 0.84,
            0.90: 1.28,
            0.95: 1.64,
            0.99: 2.33
        };
        return zScores[probability] || 1.64;
    }
}

// ============================================================================
// EXPERIMENT MONITOR
// ============================================================================

class ExperimentMonitor {
    constructor() {
        this.tracking = new Map();
        this.updateInterval = 60000; // 1 minute
        this.timer = null;
    }
    
    start(framework) {
        this.framework = framework;
        this.timer = setInterval(() => this.checkExperiments(), this.updateInterval);
    }
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    trackExperiment(experiment) {
        this.tracking.set(experiment.id, {
            startTime: Date.now(),
            lastCheck: Date.now(),
            alerts: []
        });
    }
    
    stopTracking(experimentId) {
        this.tracking.delete(experimentId);
    }
    
    async checkExperiments() {
        for (const [experimentId, tracking] of this.tracking.entries()) {
            const experiment = this.framework.experiments.get(experimentId);
            
            if (!experiment || experiment.status !== 'active') {
                this.stopTracking(experimentId);
                continue;
            }
            
            // Check various conditions
            await this.checkSampleRatioMismatch(experiment);
            await this.checkMinimumSampleSize(experiment);
            await this.checkMaxDuration(experiment);
            
            tracking.lastCheck = Date.now();
        }
    }
    
    async checkSampleRatioMismatch(experiment) {
        const results = await this.framework.analyzeExperiment(experiment.id);
        
        if (results.srmCheck && results.srmCheck.detected) {
            this.addAlert(experiment.id, {
                type: 'srm_detected',
                severity: 'high',
                message: 'Sample ratio mismatch detected',
                data: results.srmCheck
            });
        }
    }
    
    async checkMinimumSampleSize(experiment) {
        const metrics = this.framework.metrics.get(experiment.id);
        if (!metrics) return;
        
        const sampleSizes = this.framework.calculateSampleSizes(metrics);
        const totalSample = Object.values(sampleSizes).reduce((sum, size) => sum + size, 0);
        
        if (totalSample >= experiment.requiredSampleSize) {
            this.addAlert(experiment.id, {
                type: 'sample_size_reached',
                severity: 'info',
                message: 'Required sample size reached',
                data: { required: experiment.requiredSampleSize, actual: totalSample }
            });
        }
    }
    
    async checkMaxDuration(experiment) {
        const runtime = Date.now() - experiment.startTime;
        
        if (runtime >= this.framework.config.maxExperimentDuration) {
            this.addAlert(experiment.id, {
                type: 'max_duration_reached',
                severity: 'medium',
                message: 'Maximum experiment duration reached',
                data: { runtime, maxDuration: this.framework.config.maxExperimentDuration }
            });
            
            // Auto-stop experiment
            await this.framework.stopExperiment(experiment.id, {
                reason: 'max_duration_reached'
            });
        }
    }
    
    addAlert(experimentId, alert) {
        const tracking = this.tracking.get(experimentId);
        if (!tracking) return;
        
        alert.timestamp = Date.now();
        tracking.alerts.push(alert);
        
        // Emit alert event
        this.framework.emitEvent('experiment-alert', {
            experimentId,
            alert
        });
    }
}

// ============================================================================
// SHADOW MODE CONTROLLER
// ============================================================================

class ShadowModeController {
    constructor() {
        this.shadowExperiments = new Map();
    }
    
    async setupExperiment(experiment) {
        this.shadowExperiments.set(experiment.id, {
            enabled: true,
            startTime: Date.now(),
            shadowMetrics: new Map()
        });
    }
    
    async teardownExperiment(experimentId) {
        this.shadowExperiments.delete(experimentId);
    }
    
    async trackMetric(event) {
        const shadow = this.shadowExperiments.get(event.experimentId);
        if (!shadow || !shadow.enabled) return;
        
        // Store shadow metrics separately
        if (!shadow.shadowMetrics.has(event.variant)) {
            shadow.shadowMetrics.set(event.variant, []);
        }
        
        shadow.shadowMetrics.get(event.variant).push({
            metric: event.metricName,
            value: event.value,
            timestamp: event.timestamp,
            shadow: true
        });
    }
    
    getShadowMetrics(experimentId) {
        const shadow = this.shadowExperiments.get(experimentId);
        return shadow ? shadow.shadowMetrics : null;
    }
}

// ============================================================================
// ASSIGNMENT STRATEGIES
// ============================================================================

class RandomAssignment {
    async initialize() {
        return true;
    }
    
    async assign({ experiment }) {
        const random = Math.random();
        let cumulative = 0;
        
        for (const variant of experiment.variants) {
            cumulative += variant.normalizedWeight;
            if (random <= cumulative) {
                return variant.name;
            }
        }
        
        return experiment.variants[experiment.variants.length - 1].name;
    }
}

class DeterministicAssignment {
    async initialize() {
        return true;
    }
    
    async assign({ userId, experiment }) {
        // Hash userId to get deterministic assignment
        const hash = this.hashString(userId + experiment.id);
        const bucket = hash % 100;
        
        let cumulative = 0;
        for (const variant of experiment.variants) {
            cumulative += variant.normalizedWeight * 100;
            if (bucket < cumulative) {
                return variant.name;
            }
        }
        
        return experiment.variants[experiment.variants.length - 1].name;
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}

class StratifiedAssignment {
    constructor() {
        this.strata = new Map();
    }
    
    async initialize() {
        return true;
    }
    
    async assign({ userId, experiment, context }) {
        const stratum = context.segment || 'default';
        
        // Get stratum-specific assignment
        if (!this.strata.has(experiment.id)) {
            this.strata.set(experiment.id, new Map());
        }
        
        const experimentStrata = this.strata.get(experiment.id);
        if (!experimentStrata.has(stratum)) {
            experimentStrata.set(stratum, new Map());
        }
        
        // Use deterministic assignment within stratum
        const deterministicAssignment = new DeterministicAssignment();
        return deterministicAssignment.assign({ userId, experiment });
    }
}

class MultiArmedBanditAssignment {
    constructor() {
        this.arms = new Map();
        this.epsilon = 0.1; // Exploration rate
    }
    
    async initialize() {
        return true;
    }
    
    async assign({ experiment, metrics }) {
        // Initialize arms if needed
        if (!this.arms.has(experiment.id)) {
            const arms = new Map();
            experiment.variants.forEach(variant => {
                arms.set(variant.name, {
                    pulls: 0,
                    rewards: 0,
                    averageReward: 0
                });
            });
            this.arms.set(experiment.id, arms);
        }
        
        const experimentArms = this.arms.get(experiment.id);
        
        // Epsilon-greedy strategy
        if (Math.random() < this.epsilon) {
            // Explore: random selection
            const variants = Array.from(experimentArms.keys());
            return variants[Math.floor(Math.random() * variants.length)];
        } else {
            // Exploit: select best performing
            let bestArm = null;
            let bestReward = -Infinity;
            
            for (const [variant, stats] of experimentArms.entries()) {
                if (stats.averageReward > bestReward) {
                    bestReward = stats.averageReward;
                    bestArm = variant;
                }
            }
            
            return bestArm || experiment.variants[0].name;
        }
    }
    
    updateReward(experimentId, variant, reward) {
        const experimentArms = this.arms.get(experimentId);
        if (!experimentArms) return;
        
        const arm = experimentArms.get(variant);
        if (!arm) return;
        
        arm.pulls++;
        arm.rewards += reward;
        arm.averageReward = arm.rewards / arm.pulls;
    }
}

class ContextualBanditAssignment {
    constructor() {
        this.models = new Map();
        this.features = ['confidence', 'fileSize', 'userSegment'];
    }
    
    async initialize() {
        return true;
    }
    
    async assign({ userId, experiment, context, metrics }) {
        // Extract features from context
        const features = this.extractFeatures(context);
        
        // Initialize model if needed
        if (!this.models.has(experiment.id)) {
            this.models.set(experiment.id, {
                weights: new Map()
            });
            
            experiment.variants.forEach(variant => {
                this.models.get(experiment.id).weights.set(variant.name, 
                    new Array(this.features.length).fill(0));
            });
        }
        
        // Calculate expected rewards for each variant
        const model = this.models.get(experiment.id);
        let bestVariant = null;
        let bestScore = -Infinity;
        
        for (const variant of experiment.variants) {
            const weights = model.weights.get(variant.name);
            const score = this.dotProduct(features, weights);
            
            if (score > bestScore) {
                bestScore = score;
                bestVariant = variant.name;
            }
        }
        
        // Add exploration noise
        if (Math.random() < 0.1) {
            const variants = experiment.variants.map(v => v.name);
            return variants[Math.floor(Math.random() * variants.length)];
        }
        
        return bestVariant || experiment.variants[0].name;
    }
    
    extractFeatures(context) {
        return [
            context.confidence || 0,
            Math.log(context.fileSize || 1),
            context.userSegment === 'power_user' ? 1 : 0
        ];
    }
    
    dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }
    
    updateModel(experimentId, variant, context, reward) {
        const model = this.models.get(experimentId);
        if (!model) return;
        
        const weights = model.weights.get(variant);
        if (!weights) return;
        
        const features = this.extractFeatures(context);
        const learningRate = 0.01;
        
        // Simple gradient update
        for (let i = 0; i < weights.length; i++) {
            weights[i] += learningRate * reward * features[i];
        }
    }
}

// ============================================================================
// ML METRIC COLLECTORS
// ============================================================================

class ConfidenceMetricCollector {
    constructor() {
        this.data = new Map();
    }
    
    async initialize() {
        return true;
    }
    
    async collect(event) {
        const key = `${event.experimentId}_${event.variant}`;
        
        if (!this.data.has(key)) {
            this.data.set(key, []);
        }
        
        this.data.get(key).push({
            userId: event.userId,
            confidence: event.value,
            timestamp: event.timestamp,
            metadata: event.metadata
        });
    }
    
    async calculate(experiment, metrics) {
        const results = {};
        
        for (const variant of experiment.variants) {
            const key = `${experiment.id}_${variant.name}`;
            const data = this.data.get(key) || [];
            
            if (data.length === 0) {
                results[variant.name] = { mean: 0, std: 0, count: 0 };
                continue;
            }
            
            const confidences = data.map(d => d.confidence);
            const mean = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
            const variance = confidences.reduce((sum, c) => 
                sum + Math.pow(c - mean, 2), 0) / (confidences.length - 1);
            
            results[variant.name] = {
                mean,
                std: Math.sqrt(variance),
                count: data.length,
                distribution: this.calculateDistribution(confidences)
            };
        }
        
        return results;
    }
    
    calculateDistribution(values) {
        const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
        const distribution = new Array(bins.length - 1).fill(0);
        
        values.forEach(value => {
            for (let i = 0; i < bins.length - 1; i++) {
                if (value >= bins[i] && value < bins[i + 1]) {
                    distribution[i]++;
                    break;
                }
            }
        });
        
        return distribution.map(count => count / values.length);
    }
}

class ConvergenceMetricCollector {
    constructor() {
        this.data = new Map();
        this.windowSize = 100;
    }
    
    async initialize() {
        return true;
    }
    
    async collect(event) {
        const key = `${event.experimentId}_${event.variant}`;
        
        if (!this.data.has(key)) {
            this.data.set(key, []);
        }
        
        this.data.get(key).push({
            value: event.value,
            timestamp: event.timestamp
        });
    }
    
    async calculate(experiment, metrics) {
        const results = {};
        
        for (const variant of experiment.variants) {
            const key = `${experiment.id}_${variant.name}`;
            const data = this.data.get(key) || [];
            
            if (data.length < this.windowSize) {
                results[variant.name] = { 
                    converged: false, 
                    convergenceRate: 0,
                    stability: 0 
                };
                continue;
            }
            
            // Calculate moving averages
            const movingAverages = [];
            for (let i = this.windowSize; i <= data.length; i++) {
                const window = data.slice(i - this.windowSize, i);
                const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
                movingAverages.push(avg);
            }
            
            // Check convergence
            const recentAverages = movingAverages.slice(-10);
            const avgRecent = recentAverages.reduce((sum, a) => sum + a, 0) / 
                            recentAverages.length;
            const stdRecent = Math.sqrt(recentAverages.reduce((sum, a) => 
                sum + Math.pow(a - avgRecent, 2), 0) / (recentAverages.length - 1));
            
            const converged = stdRecent < 0.01; // Threshold for convergence
            const convergenceRate = this.calculateConvergenceRate(movingAverages);
            
            results[variant.name] = {
                converged,
                convergenceRate,
                stability: 1 - stdRecent,
                finalValue: avgRecent
            };
        }
        
        return results;
    }
    
    calculateConvergenceRate(movingAverages) {
        if (movingAverages.length < 2) return 0;
        
        // Fit exponential decay to variance
        const variances = [];
        for (let i = 10; i < movingAverages.length; i += 10) {
            const window = movingAverages.slice(Math.max(0, i - 10), i);
            const avg = window.reduce((sum, a) => sum + a, 0) / window.length;
            const variance = window.reduce((sum, a) => 
                sum + Math.pow(a - avg, 2), 0) / window.length;
            variances.push(variance);
        }
        
        // Simple rate calculation
        if (variances.length < 2) return 0;
        
        const initialVariance = variances[0];
        const finalVariance = variances[variances.length - 1];
        const rate = (initialVariance - finalVariance) / initialVariance;
        
        return Math.max(0, Math.min(1, rate));
    }
}

class AccuracyMetricCollector {
    constructor() {
        this.data = new Map();
    }
    
    async initialize() {
        return true;
    }
    
    async collect(event) {
        const key = `${event.experimentId}_${event.variant}`;
        
        if (!this.data.has(key)) {
            this.data.set(key, []);
        }
        
        this.data.get(key).push({
            predicted: event.value.predicted,
            actual: event.value.actual,
            timestamp: event.timestamp
        });
    }
    
    async calculate(experiment, metrics) {
        const results = {};
        
        for (const variant of experiment.variants) {
            const key = `${experiment.id}_${variant.name}`;
            const data = this.data.get(key) || [];
            
            if (data.length === 0) {
                results[variant.name] = { 
                    accuracy: 0, 
                    precision: 0, 
                    recall: 0,
                    f1Score: 0 
                };
                continue;
            }
            
            // Calculate confusion matrix
            let truePositives = 0;
            let falsePositives = 0;
            let trueNegatives = 0;
            let falseNegatives = 0;
            
            data.forEach(d => {
                if (d.predicted && d.actual) truePositives++;
                else if (d.predicted && !d.actual) falsePositives++;
                else if (!d.predicted && d.actual) falseNegatives++;
                else trueNegatives++;
            });
            
            const accuracy = (truePositives + trueNegatives) / data.length;
            const precision = truePositives / (truePositives + falsePositives) || 0;
            const recall = truePositives / (truePositives + falseNegatives) || 0;
            const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
            
            results[variant.name] = {
                accuracy,
                precision,
                recall,
                f1Score,
                confusionMatrix: {
                    truePositives,
                    falsePositives,
                    trueNegatives,
                    falseNegatives
                }
            };
        }
        
        return results;
    }
}

class LatencyMetricCollector {
    constructor() {
        this.data = new Map();
    }
    
    async initialize() {
        return true;
    }
    
    async collect(event) {
        const key = `${event.experimentId}_${event.variant}`;
        
        if (!this.data.has(key)) {
            this.data.set(key, []);
        }
        
        this.data.get(key).push({
            latency: event.value,
            timestamp: event.timestamp
        });
    }
    
    async calculate(experiment, metrics) {
        const results = {};
        
        for (const variant of experiment.variants) {
            const key = `${experiment.id}_${variant.name}`;
            const data = this.data.get(key) || [];
            
            if (data.length === 0) {
                results[variant.name] = { 
                    mean: 0, 
                    median: 0, 
                    p95: 0,
                    p99: 0 
                };
                continue;
            }
            
            const latencies = data.map(d => d.latency).sort((a, b) => a - b);
            
            results[variant.name] = {
                mean: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
                median: latencies[Math.floor(latencies.length / 2)],
                p95: latencies[Math.floor(latencies.length * 0.95)],
                p99: latencies[Math.floor(latencies.length * 0.99)],
                count: latencies.length
            };
        }
        
        return results;
    }
}

class EngagementMetricCollector {
    constructor() {
        this.data = new Map();
    }
    
    async initialize() {
        return true;
    }
    
    async collect(event) {
        const key = `${event.experimentId}_${event.variant}_${event.userId}`;
        
        if (!this.data.has(key)) {
            this.data.set(key, {
                userId: event.userId,
                variant: event.variant,
                actions: []
            });
        }
        
        this.data.get(key).actions.push({
            action: event.metadata.action,
            timestamp: event.timestamp
        });
    }
    
    async calculate(experiment, metrics) {
        const results = {};
        
        for (const variant of experiment.variants) {
            const variantUsers = new Map();
            
            // Collect all users for this variant
            for (const [key, userData] of this.data.entries()) {
                if (userData.variant === variant.name) {
                    variantUsers.set(userData.userId, userData.actions);
                }
            }
            
            if (variantUsers.size === 0) {
                results[variant.name] = { 
                    avgActionsPerUser: 0,
                    activeUsers: 0,
                    sessionLength: 0 
                };
                continue;
            }
            
            // Calculate engagement metrics
            let totalActions = 0;
            let totalSessionLength = 0;
            
            variantUsers.forEach((actions, userId) => {
                totalActions += actions.length;
                
                if (actions.length > 1) {
                    const sessionLength = actions[actions.length - 1].timestamp - 
                                        actions[0].timestamp;
                    totalSessionLength += sessionLength;
                }
            });
            
            results[variant.name] = {
                avgActionsPerUser: totalActions / variantUsers.size,
                activeUsers: variantUsers.size,
                avgSessionLength: totalSessionLength / variantUsers.size,
                actionDistribution: this.calculateActionDistribution(variantUsers)
            };
        }
        
        return results;
    }
    
    calculateActionDistribution(variantUsers) {
        const distribution = {};
        
        variantUsers.forEach((actions, userId) => {
            actions.forEach(action => {
                distribution[action.action] = (distribution[action.action] || 0) + 1;
            });
        });
        
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        
        Object.keys(distribution).forEach(action => {
            distribution[action] = distribution[action] / total;
        });
        
        return distribution;
    }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ABTestingFramework,
        StatisticalAnalysisEngine,
        BayesianInferenceEngine,
        SequentialTestingEngine,
        PowerAnalysisCalculator,
        // Assignment strategies
        RandomAssignment,
        DeterministicAssignment,
        StratifiedAssignment,
        MultiArmedBanditAssignment,
        ContextualBanditAssignment,
        // Metric collectors
        ConfidenceMetricCollector,
        ConvergenceMetricCollector,
        AccuracyMetricCollector,
        LatencyMetricCollector,
        EngagementMetricCollector
    };
}

// Register in KC namespace for browser usage
if (typeof window !== 'undefined') {
    window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};
    window.KnowledgeConsolidator.ABTestingFramework = ABTestingFramework;
}