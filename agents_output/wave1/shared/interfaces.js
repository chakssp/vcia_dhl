/**
 * Shared Interfaces for ML Confidence Multi-Agent System
 * Wave 1: Foundation Components
 */

/**
 * Interface para análise versionada
 * Consumida por todos os componentes
 */
export const VersionedAnalysisInterface = {
    fileId: 'string',
    versions: [{
        versionId: 'string',
        timestamp: 'Date',
        confidenceMetrics: 'ConfidenceMetrics',
        changes: 'ChangeSet',
        metadata: 'object'
    }],
    currentVersion: 'number',
    convergenceHistory: 'array'
};

/**
 * Interface de métricas de confiança
 * Produzida por ConfidenceCalculator, consumida por ConfidenceTracker
 */
export const ConfidenceMetricsInterface = {
    fileId: 'string',
    dimensions: {
        semantic: 'number (0-1)',
        categorical: 'number (0-1)', 
        structural: 'number (0-1)',
        temporal: 'number (0-1)'
    },
    overall: 'number (0-1)',
    convergencePrediction: {
        willConverge: 'boolean',
        estimatedIterations: 'number',
        confidence: 'number (0-1)'
    },
    calculatedAt: 'Date'
};

/**
 * Interface de eventos de coordenação
 */
export const CoordinationEvents = {
    AGENT_READY: 'coordination:agent:ready',
    INTERFACE_PUBLISHED: 'coordination:interface:published',
    DEPENDENCY_RESOLVED: 'coordination:dependency:resolved',
    CHECKPOINT_SAVED: 'coordination:checkpoint:saved',
    INTEGRATION_REQUIRED: 'coordination:integration:required'
};

/**
 * Interface para mudanças entre versões
 */
export const ChangeSetInterface = {
    additions: [{
        path: 'string',
        value: 'any',
        reason: 'string'
    }],
    modifications: [{
        path: 'string',
        oldValue: 'any',
        newValue: 'any',
        reason: 'string'
    }],
    deletions: [{
        path: 'string',
        oldValue: 'any',
        reason: 'string'
    }],
    summary: 'string'
};

/**
 * Interface de metadata de versão
 */
export const VersionMetadataInterface = {
    agent: 'string',
    model: 'string',
    processingTime: 'number',
    inputTokens: 'number',
    outputTokens: 'number',
    cost: 'number',
    flags: 'array'
};

/**
 * Interface para AppState versionado
 */
export class VersionedAppState {
    constructor(fileId) {
        this.fileId = fileId;
        this.versions = [];
        this.currentVersion = -1;
        this.maxVersions = 10;
    }

    /**
     * Cria snapshot do estado atual
     * @returns {string} versionId
     */
    createSnapshot(metadata) {
        // Implementado pelo dev-coordinator-quad
    }

    /**
     * Restaura versão específica
     * @param {string} versionId 
     */
    restoreVersion(versionId) {
        // Implementado pelo dev-coordinator-quad
    }

    /**
     * Compara duas versões
     * @returns {ChangeSet}
     */
    compareVersions(versionA, versionB) {
        // Implementado pelo dev-coordinator-quad
    }
}

/**
 * Interface para ConfidenceTracker
 */
export class ConfidenceTrackerInterface {
    constructor() {
        this.trackedFiles = new Map();
    }

    /**
     * Inicia rastreamento de arquivo
     * @param {string} fileId 
     * @param {object} initialData 
     */
    startTracking(fileId, initialData) {
        // Implementado pelo senior-architect-team-lead
    }

    /**
     * Atualiza métricas de confiança
     * @param {string} fileId 
     * @param {ConfidenceMetrics} metrics 
     */
    updateMetrics(fileId, metrics) {
        // Implementado pelo senior-architect-team-lead
    }

    /**
     * Obtém histórico de convergência
     * @param {string} fileId 
     * @returns {array}
     */
    getConvergenceHistory(fileId) {
        // Implementado pelo senior-architect-team-lead
    }

    /**
     * Prevê necessidade de re-análise
     * @param {string} fileId 
     * @returns {boolean}
     */
    needsReanalysis(fileId) {
        // Implementado pelo senior-architect-team-lead
    }
}

/**
 * Interface para ConfidenceCalculator
 */
export class ConfidenceCalculatorInterface {
    constructor() {
        this.algorithms = new Map();
        this.weights = {
            semantic: 0.4,
            categorical: 0.2,
            structural: 0.2,
            temporal: 0.2
        };
    }

    /**
     * Calcula métricas de confiança
     * @param {object} analysisData 
     * @returns {ConfidenceMetrics}
     */
    calculate(analysisData) {
        // Implementado pelo ml-confidence-specialist
    }

    /**
     * Prevê convergência
     * @param {array} historyData 
     * @returns {object}
     */
    predictConvergence(historyData) {
        // Implementado pelo ml-confidence-specialist
    }

    /**
     * Otimiza pesos das dimensões
     * @param {array} feedbackData 
     */
    optimizeWeights(feedbackData) {
        // Implementado pelo ml-confidence-specialist
    }

    /**
     * Registra novo algoritmo
     * @param {string} name 
     * @param {function} algorithm 
     */
    registerAlgorithm(name, algorithm) {
        // Implementado pelo ml-confidence-specialist
    }
}

/**
 * Estrutura de coordenação entre agentes
 */
export const CoordinationContext = {
    wave: 'wave1',
    agents: {
        'dev-coordinator-quad': {
            status: 'pending',
            progress: 0,
            lastCheckpoint: null,
            interfaces: ['VersionedAnalysis'],
            blockers: [],
            outputs: []
        },
        'senior-architect-team-lead': {
            status: 'pending',
            progress: 0,
            dependencies: ['VersionedAnalysis'],
            interfaces: ['ConfidenceTracker'],
            outputs: []
        },
        'ml-confidence-specialist': {
            status: 'pending',
            progress: 0,
            interfaces: ['ConfidenceMetrics', 'ConfidenceCalculator'],
            outputs: []
        }
    },
    synchronizationPoints: [
        {
            name: 'interfaces_ready',
            required: ['VersionedAnalysis', 'ConfidenceMetrics'],
            status: 'pending'
        }
    ]
};

// Export all interfaces
export default {
    VersionedAnalysisInterface,
    ConfidenceMetricsInterface,
    CoordinationEvents,
    ChangeSetInterface,
    VersionMetadataInterface,
    VersionedAppState,
    ConfidenceTrackerInterface,
    ConfidenceCalculatorInterface,
    CoordinationContext
};