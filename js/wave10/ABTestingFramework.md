# ABTestingFramework - Wave 10

## Visão Geral

Framework robusto de testes A/B com foco em métricas ML e rigor estatístico para validação de features de confidence scoring em produção.

## Componentes Principais

### 1. Engines de Análise Estatística

- **StatisticalAnalysisEngine**: Análise frequentista (t-tests, chi-square, Mann-Whitney U)
- **BayesianInferenceEngine**: Inferência bayesiana com Monte Carlo
- **SequentialTestingEngine**: Testes sequenciais com O'Brien-Fleming boundaries

### 2. Estratégias de Assignment (5 tipos)

- **RandomAssignment**: Distribuição aleatória simples
- **DeterministicAssignment**: Hash determinístico por userId
- **StratifiedAssignment**: Estratificação por segmentos
- **MultiArmedBanditAssignment**: Epsilon-greedy com aprendizado
- **ContextualBanditAssignment**: Bandits contextuais com features

### 3. Coletores de Métricas ML

- **ConfidenceMetricCollector**: Scores de confiança e distribuições
- **ConvergenceMetricCollector**: Taxa de convergência e estabilidade
- **AccuracyMetricCollector**: Precisão, recall, F1-score
- **LatencyMetricCollector**: P95, P99, médias
- **EngagementMetricCollector**: Ações por usuário, duração de sessão

### 4. Componentes Core

- **PowerAnalysisCalculator**: Cálculo de tamanho amostral
- **ExperimentMonitor**: Monitoramento em tempo real
- **ShadowModeController**: Modo shadow para testes seguros

## Uso Rápido

```javascript
// Inicializar framework
const abTest = new ABTestingFramework({
    defaultConfidenceLevel: 0.95,
    defaultPower: 0.8,
    enableBayesian: true,
    enableSequentialTesting: true
});

await abTest.initialize();

// Criar experimento
const experiment = await abTest.createExperiment({
    name: 'ML Confidence Score Test',
    primaryMetric: 'confidence',
    secondaryMetrics: ['convergence', 'latency'],
    variants: [
        { name: 'control', weight: 0.5 },
        { name: 'treatment', weight: 0.5 }
    ],
    minimumDetectableEffect: 0.05,
    shadowMode: true // Teste seguro em produção
});

// Atribuir usuário
const variant = await abTest.assignUserToExperiment(
    userId, 
    experiment.id,
    { segment: 'power_user', confidence: 0.85 }
);

// Rastrear métrica
await abTest.trackMetric({
    userId,
    experimentId: experiment.id,
    metricName: 'confidence',
    value: 0.92
});

// Analisar resultados
const results = await abTest.analyzeExperiment(experiment.id);
```

## Integração com Sistema

O framework se integra automaticamente com o EventBus do KC:

```javascript
// Eventos ouvidos
KC.EventBus.on('ML_CONFIDENCE_UPDATED', handler);
KC.EventBus.on('USER_ACTION', handler);

// Eventos emitidos
'ab-testing-experiment-created'
'ab-testing-user-assigned'
'ab-testing-experiment-analyzed'
'ab-testing-experiment-stopped'
```

## Métricas e Análises

### Análise Frequentista
- Testes apropriados baseados no tipo de dados
- Correção para múltiplas comparações (Bonferroni/Holm)
- Detecção de Sample Ratio Mismatch

### Análise Bayesiana
- Probabilidade de ser melhor
- Expected loss calculations
- Intervalos de credibilidade

### Testes Sequenciais
- Early stopping sem inflação de erro tipo I
- O'Brien-Fleming boundaries
- 5 checkpoints de análise

## Produção e Escalabilidade

- **Shadow Mode**: Teste sem impactar usuários
- **SRM Detection**: Alerta automático de problemas
- **Auto-stop**: Parada automática por duração máxima
- **Performance Tracking**: Métricas de latência do próprio framework