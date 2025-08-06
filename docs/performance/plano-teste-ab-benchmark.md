# 🧪 Plano de Teste A/B e Benchmark: Regex vs Schema.org

## 📋 Visão Geral

Este documento detalha o plano completo de testes A/B para comparar empiricamente o desempenho dos sistemas de query baseados em regex versus Schema.org + embeddings, incluindo código de benchmark, métricas e análise estatística.

---

## 🎯 1. Objetivos do Teste

### 1.1 Métricas Primárias
- **Precisão (P@K)**: Relevância dos resultados retornados
- **Recall (R@K)**: Cobertura de documentos relevantes
- **Latência**: Tempo de resposta end-to-end
- **Satisfação do Usuário**: Feedback qualitativo

### 1.2 Métricas Secundárias
- **Uso de Recursos**: CPU, memória, I/O
- **Taxa de Cache**: Hit rate e eficiência
- **Custo Computacional**: Tokens/embeddings processados
- **Capacidade de Query**: Tipos de busca suportados

---

## 🔬 2. Design do Experimento

### 2.1 Configuração do Teste A/B

```javascript
/**
 * ABTestConfig.js
 * Configuração do experimento A/B
 */
class ABTestConfig {
    constructor() {
        this.config = {
            // Duração do teste
            duration: {
                start: '2025-08-01',
                end: '2025-08-31',
                warmupDays: 3
            },
            
            // Distribuição de tráfego
            traffic: {
                control: 0.5,      // 50% regex (controle)
                treatment: 0.5,    // 50% Schema.org (tratamento)
                
                // Estratificação por tipo de usuário
                stratification: {
                    powerUsers: { control: 0.3, treatment: 0.7 },
                    regularUsers: { control: 0.5, treatment: 0.5 },
                    newUsers: { control: 0.7, treatment: 0.3 }
                }
            },
            
            // Critérios de sucesso
            successCriteria: {
                precision: {
                    metric: 'P@10',
                    minimumImprovement: 0.15, // 15%
                    confidenceLevel: 0.95
                },
                latency: {
                    metric: 'p95',
                    maximumDegradation: 0.5, // 50% max
                    confidenceLevel: 0.95
                },
                userSatisfaction: {
                    metric: 'CSAT',
                    minimumImprovement: 0.1,
                    confidenceLevel: 0.90
                }
            },
            
            // Guardrails (métricas de segurança)
            guardrails: {
                errorRate: { max: 0.02 },      // 2% max
                timeoutRate: { max: 0.01 },    // 1% max
                p99Latency: { max: 1000 }      // 1s max
            }
        };
    }
    
    /**
     * Determina grupo do usuário
     */
    assignUserToGroup(userId, userType = 'regular') {
        // Hash consistente para garantir mesmo grupo sempre
        const hash = this.hashUserId(userId);
        const threshold = this.config.traffic.stratification[userType + 'Users'];
        
        return hash < threshold.control ? 'control' : 'treatment';
    }
    
    hashUserId(userId) {
        // Simples hash para distribuição uniforme
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) / 2147483647; // Normalize to 0-1
    }
}
```

### 2.2 Dataset de Teste

```javascript
/**
 * TestDataset.js
 * Dataset padronizado para benchmarks
 */
class TestDataset {
    constructor() {
        this.queries = {
            // Queries simples (favorece regex)
            simple: [
                { query: "redis", expectedType: "keyword_match" },
                { query: "breakthrough técnico", expectedType: "type_match" },
                { query: "decisão 2024", expectedType: "temporal_match" }
            ],
            
            // Queries complexas (favorece Schema.org)
            complex: [
                { 
                    query: "soluções similares ao problema de cache distribuído",
                    expectedType: "semantic_similarity"
                },
                {
                    query: "evolução conceitual de microserviços nos últimos 6 meses",
                    expectedType: "temporal_semantic"
                },
                {
                    query: "insights técnicos relacionados a Kafka mas não a RabbitMQ",
                    expectedType: "boolean_semantic"
                }
            ],
            
            // Queries mistas
            mixed: [
                {
                    query: "implementações de Redis com alta performance",
                    expectedType: "keyword_semantic"
                },
                {
                    query: "decisões arquiteturais sobre cloud em 2024",
                    expectedType: "type_temporal_semantic"
                }
            ]
        };
        
        // Ground truth (arquivos relevantes conhecidos)
        this.groundTruth = {
            "redis": ["file1", "file3", "file7", "file12", "file23"],
            "soluções similares ao problema de cache distribuído": [
                "file3", "file8", "file15", "file19", "file27", "file31"
            ],
            // ... mais ground truth
        };
        
        // Arquivos de teste com metadados completos
        this.testFiles = this.generateTestFiles();
    }
    
    generateTestFiles() {
        const files = [];
        const types = Object.keys(KC.AnalysisTypes);
        const languages = ['JavaScript', 'Python', 'Java', 'Go'];
        
        // Gerar 500 arquivos de teste
        for (let i = 1; i <= 500; i++) {
            files.push({
                id: `file${i}`,
                name: this.generateFileName(i),
                content: this.generateContent(i),
                analysisType: types[i % types.length],
                createdAt: this.generateDate(i),
                relevanceScore: Math.random(),
                categories: this.generateCategories(i),
                size: Math.floor(Math.random() * 100000),
                extension: ['.js', '.md', '.txt', '.py'][i % 4]
            });
        }
        
        return files;
    }
    
    generateFileName(index) {
        const topics = ['redis', 'kafka', 'docker', 'kubernetes', 'react'];
        const types = ['implementation', 'guide', 'analysis', 'decision', 'insight'];
        return `${topics[index % 5]}-${types[index % 5]}-${index}.md`;
    }
    
    generateContent(index) {
        // Conteúdo realista baseado no índice
        const templates = [
            `This document describes a breakthrough technical solution for distributed caching using Redis Cluster...`,
            `After careful analysis, we decided to migrate our infrastructure to Kubernetes...`,
            `The conceptual evolution of microservices architecture has led to new insights...`,
            `Strategic insight: By implementing event-driven architecture with Kafka...`,
            `General learning from this project: Always consider scalability from day one...`
        ];
        
        return templates[index % 5] + ` [Content ${index}]`.repeat(50);
    }
}
```

---

## 📊 3. Framework de Benchmark

### 3.1 Benchmark Runner

```javascript
/**
 * BenchmarkRunner.js
 * Executa benchmarks comparativos
 */
class BenchmarkRunner {
    constructor() {
        this.results = {
            control: { queries: [], metrics: {} },
            treatment: { queries: [], metrics: {} }
        };
        
        this.dataset = new TestDataset();
        this.regexSystem = new RegexQuerySystem();
        this.schemaSystem = new SchemaOrgQuerySystem();
    }
    
    /**
     * Executa benchmark completo
     */
    async runBenchmark(options = {}) {
        console.log('🚀 Iniciando benchmark...');
        
        // 1. Preparar sistemas
        await this.prepareSystems();
        
        // 2. Aquecer caches
        if (!options.coldStart) {
            await this.warmupCaches();
        }
        
        // 3. Executar queries
        const queryTypes = ['simple', 'complex', 'mixed'];
        
        for (const type of queryTypes) {
            console.log(`\n📋 Testando queries ${type}...`);
            
            for (const queryData of this.dataset.queries[type]) {
                // Teste sistema regex (controle)
                const regexResult = await this.benchmarkQuery(
                    'control',
                    this.regexSystem,
                    queryData
                );
                
                // Teste sistema Schema.org (tratamento)
                const schemaResult = await this.benchmarkQuery(
                    'treatment',
                    this.schemaSystem,
                    queryData
                );
                
                // Comparar resultados
                this.compareResults(queryData, regexResult, schemaResult);
            }
        }
        
        // 4. Calcular métricas agregadas
        this.calculateAggregateMetrics();
        
        // 5. Gerar relatório
        return this.generateReport();
    }
    
    /**
     * Benchmark individual de query
     */
    async benchmarkQuery(group, system, queryData) {
        const { query } = queryData;
        const groundTruth = this.dataset.groundTruth[query] || [];
        
        // Métricas de performance
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        let results, error;
        try {
            results = await system.search(query, { limit: 10 });
        } catch (e) {
            error = e;
            results = [];
        }
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        // Calcular métricas
        const metrics = {
            query,
            group,
            latency: endTime - startTime,
            memoryDelta: endMemory - startMemory,
            resultCount: results.length,
            error: error?.message,
            
            // Métricas de qualidade
            precision: this.calculatePrecision(results, groundTruth),
            recall: this.calculateRecall(results, groundTruth),
            ndcg: this.calculateNDCG(results, groundTruth),
            
            // Detalhes dos resultados
            topResults: results.slice(0, 5).map(r => ({
                id: r.id,
                score: r.score,
                relevant: groundTruth.includes(r.id)
            }))
        };
        
        // Armazenar resultado
        this.results[group].queries.push(metrics);
        
        return metrics;
    }
    
    /**
     * Calcula precisão P@K
     */
    calculatePrecision(results, groundTruth, k = 10) {
        const topK = results.slice(0, k);
        const relevant = topK.filter(r => groundTruth.includes(r.id)).length;
        return topK.length > 0 ? relevant / topK.length : 0;
    }
    
    /**
     * Calcula recall R@K
     */
    calculateRecall(results, groundTruth, k = 10) {
        const topK = results.slice(0, k);
        const found = topK.filter(r => groundTruth.includes(r.id)).length;
        return groundTruth.length > 0 ? found / groundTruth.length : 0;
    }
    
    /**
     * Calcula NDCG (Normalized Discounted Cumulative Gain)
     */
    calculateNDCG(results, groundTruth, k = 10) {
        const dcg = results.slice(0, k).reduce((sum, result, index) => {
            const relevance = groundTruth.includes(result.id) ? 1 : 0;
            return sum + relevance / Math.log2(index + 2);
        }, 0);
        
        // IDCG (Ideal DCG)
        const idcg = groundTruth.slice(0, k).reduce((sum, _, index) => {
            return sum + 1 / Math.log2(index + 2);
        }, 0);
        
        return idcg > 0 ? dcg / idcg : 0;
    }
    
    /**
     * Compara resultados side-by-side
     */
    compareResults(queryData, regexResult, schemaResult) {
        const comparison = {
            query: queryData.query,
            expectedType: queryData.expectedType,
            
            regex: {
                latency: regexResult.latency,
                precision: regexResult.precision,
                recall: regexResult.recall,
                topResult: regexResult.topResults[0]
            },
            
            schema: {
                latency: schemaResult.latency,
                precision: schemaResult.precision,
                recall: schemaResult.recall,
                topResult: schemaResult.topResults[0]
            },
            
            improvements: {
                latency: ((schemaResult.latency - regexResult.latency) / regexResult.latency * 100).toFixed(1) + '%',
                precision: ((schemaResult.precision - regexResult.precision) / regexResult.precision * 100).toFixed(1) + '%',
                recall: ((schemaResult.recall - regexResult.recall) / regexResult.recall * 100).toFixed(1) + '%'
            }
        };
        
        console.log('\n📊 Comparação:');
        console.table(comparison);
    }
    
    /**
     * Calcula métricas agregadas
     */
    calculateAggregateMetrics() {
        for (const group of ['control', 'treatment']) {
            const queries = this.results[group].queries;
            
            this.results[group].metrics = {
                // Latência
                latency: {
                    mean: this.mean(queries.map(q => q.latency)),
                    median: this.median(queries.map(q => q.latency)),
                    p95: this.percentile(queries.map(q => q.latency), 0.95),
                    p99: this.percentile(queries.map(q => q.latency), 0.99)
                },
                
                // Qualidade
                quality: {
                    precision: {
                        mean: this.mean(queries.map(q => q.precision)),
                        std: this.std(queries.map(q => q.precision))
                    },
                    recall: {
                        mean: this.mean(queries.map(q => q.recall)),
                        std: this.std(queries.map(q => q.recall))
                    },
                    ndcg: {
                        mean: this.mean(queries.map(q => q.ndcg)),
                        std: this.std(queries.map(q => q.ndcg))
                    }
                },
                
                // Erros
                errors: {
                    count: queries.filter(q => q.error).length,
                    rate: queries.filter(q => q.error).length / queries.length
                },
                
                // Recursos
                resources: {
                    memoryMean: this.mean(queries.map(q => q.memoryDelta)),
                    memoryMax: Math.max(...queries.map(q => q.memoryDelta))
                }
            };
        }
    }
    
    /**
     * Gera relatório final
     */
    generateReport() {
        const report = {
            summary: {
                totalQueries: this.results.control.queries.length,
                timestamp: new Date().toISOString(),
                
                winner: this.determineWinner(),
                
                improvements: {
                    precision: this.calculateImprovement('quality.precision.mean'),
                    recall: this.calculateImprovement('quality.recall.mean'),
                    latency: this.calculateImprovement('latency.median')
                }
            },
            
            detailed: {
                control: this.results.control.metrics,
                treatment: this.results.treatment.metrics
            },
            
            statistical: {
                precision: this.tTest(
                    this.results.control.queries.map(q => q.precision),
                    this.results.treatment.queries.map(q => q.precision)
                ),
                latency: this.tTest(
                    this.results.control.queries.map(q => q.latency),
                    this.results.treatment.queries.map(q => q.latency)
                )
            },
            
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    /**
     * Teste t de Student para significância estatística
     */
    tTest(sample1, sample2) {
        const n1 = sample1.length;
        const n2 = sample2.length;
        const mean1 = this.mean(sample1);
        const mean2 = this.mean(sample2);
        const var1 = this.variance(sample1);
        const var2 = this.variance(sample2);
        
        const pooledSE = Math.sqrt(var1/n1 + var2/n2);
        const tStat = (mean1 - mean2) / pooledSE;
        const df = n1 + n2 - 2;
        
        // Valor p aproximado (simplificado)
        const pValue = this.calculatePValue(tStat, df);
        
        return {
            tStatistic: tStat,
            pValue: pValue,
            significant: pValue < 0.05,
            effectSize: (mean2 - mean1) / Math.sqrt((var1 + var2) / 2) // Cohen's d
        };
    }
    
    /**
     * Helpers estatísticos
     */
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    
    median(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    percentile(arr, p) {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[index];
    }
    
    variance(arr) {
        const m = this.mean(arr);
        return this.mean(arr.map(x => Math.pow(x - m, 2)));
    }
    
    std(arr) {
        return Math.sqrt(this.variance(arr));
    }
}
```

### 3.2 Sistema de Monitoramento em Tempo Real

```javascript
/**
 * ABTestMonitor.js
 * Monitora teste A/B em produção
 */
class ABTestMonitor {
    constructor() {
        this.metrics = new Map();
        this.alerts = [];
        this.startTime = Date.now();
    }
    
    /**
     * Registra métrica de query
     */
    recordQuery(userId, group, query, results, latency) {
        const metric = {
            timestamp: Date.now(),
            userId,
            group,
            query,
            resultCount: results.length,
            latency,
            topScore: results[0]?.score || 0,
            
            // Feedback implícito
            clicked: false,
            dwellTime: 0,
            refinedQuery: false
        };
        
        this.metrics.set(`${userId}_${Date.now()}`, metric);
        
        // Verificar guardrails
        this.checkGuardrails(metric);
        
        // Atualizar dashboards
        this.updateDashboards();
    }
    
    /**
     * Verifica guardrails e dispara alertas
     */
    checkGuardrails(metric) {
        // Latência excessiva
        if (metric.latency > 1000) {
            this.alert('HIGH_LATENCY', {
                group: metric.group,
                latency: metric.latency,
                query: metric.query
            });
        }
        
        // Sem resultados
        if (metric.resultCount === 0) {
            this.alert('NO_RESULTS', {
                group: metric.group,
                query: metric.query
            });
        }
    }
    
    /**
     * Dashboard em tempo real
     */
    getDashboard() {
        const now = Date.now();
        const last5min = now - 5 * 60 * 1000;
        
        const recentMetrics = Array.from(this.metrics.values())
            .filter(m => m.timestamp > last5min);
        
        const byGroup = {
            control: recentMetrics.filter(m => m.group === 'control'),
            treatment: recentMetrics.filter(m => m.group === 'treatment')
        };
        
        return {
            overview: {
                uptime: (now - this.startTime) / 1000 / 60, // minutos
                totalQueries: this.metrics.size,
                queriesLast5min: recentMetrics.length,
                activeUsers: new Set(recentMetrics.map(m => m.userId)).size
            },
            
            performance: {
                control: {
                    avgLatency: this.avgLatency(byGroup.control),
                    p95Latency: this.p95Latency(byGroup.control),
                    errorRate: this.errorRate(byGroup.control)
                },
                treatment: {
                    avgLatency: this.avgLatency(byGroup.treatment),
                    p95Latency: this.p95Latency(byGroup.treatment),
                    errorRate: this.errorRate(byGroup.treatment)
                }
            },
            
            quality: {
                control: {
                    avgResultCount: this.avgResultCount(byGroup.control),
                    zeroResultRate: this.zeroResultRate(byGroup.control),
                    avgTopScore: this.avgTopScore(byGroup.control)
                },
                treatment: {
                    avgResultCount: this.avgResultCount(byGroup.treatment),
                    zeroResultRate: this.zeroResultRate(byGroup.treatment),
                    avgTopScore: this.avgTopScore(byGroup.treatment)
                }
            },
            
            alerts: this.alerts.slice(-10), // Últimos 10 alertas
            
            recommendation: this.getRecommendation()
        };
    }
    
    /**
     * Recomendação baseada em dados em tempo real
     */
    getRecommendation() {
        const dashboard = this.getDashboard();
        const perf = dashboard.performance;
        const qual = dashboard.quality;
        
        // Schema.org está performando melhor?
        const latencyImprovement = (perf.control.avgLatency - perf.treatment.avgLatency) / perf.control.avgLatency;
        const qualityImprovement = (qual.treatment.avgTopScore - qual.control.avgTopScore) / qual.control.avgTopScore;
        
        if (latencyImprovement < -0.5) {
            return {
                status: 'WARNING',
                message: 'Schema.org com latência 50% maior. Verificar cache.',
                action: 'INVESTIGATE'
            };
        }
        
        if (qualityImprovement > 0.2 && latencyImprovement > -0.2) {
            return {
                status: 'SUCCESS',
                message: 'Schema.org mostrando +20% qualidade com latência aceitável.',
                action: 'CONTINUE'
            };
        }
        
        return {
            status: 'MONITORING',
            message: 'Coletando mais dados para análise estatística.',
            action: 'WAIT'
        };
    }
}
```

---

## 📈 4. Visualização de Resultados

### 4.1 Gerador de Gráficos

```javascript
/**
 * ResultsVisualizer.js
 * Gera visualizações dos resultados do benchmark
 */
class ResultsVisualizer {
    /**
     * Gera gráfico comparativo de latência
     */
    generateLatencyChart(results) {
        return {
            type: 'box',
            data: {
                labels: ['Regex (Control)', 'Schema.org (Treatment)'],
                datasets: [{
                    label: 'Latência (ms)',
                    data: [
                        results.control.queries.map(q => q.latency),
                        results.treatment.queries.map(q => q.latency)
                    ],
                    backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)']
                }]
            },
            options: {
                title: { text: 'Distribuição de Latência' },
                scales: {
                    y: { 
                        title: { text: 'Latência (ms)' },
                        type: 'logarithmic'
                    }
                }
            }
        };
    }
    
    /**
     * Gera gráfico de precisão vs recall
     */
    generatePrecisionRecallChart(results) {
        return {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Regex',
                        data: results.control.queries.map(q => ({
                            x: q.recall,
                            y: q.precision
                        })),
                        backgroundColor: 'rgba(255, 99, 132, 0.5)'
                    },
                    {
                        label: 'Schema.org',
                        data: results.treatment.queries.map(q => ({
                            x: q.recall,
                            y: q.precision
                        })),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                    }
                ]
            },
            options: {
                title: { text: 'Precision vs Recall' },
                scales: {
                    x: { title: { text: 'Recall' }, min: 0, max: 1 },
                    y: { title: { text: 'Precision' }, min: 0, max: 1 }
                }
            }
        };
    }
    
    /**
     * Gera relatório HTML completo
     */
    generateHTMLReport(benchmarkResults, monitoringData) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Benchmark Results: Regex vs Schema.org</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric-card { 
            background: #f5f5f5; 
            padding: 20px; 
            margin: 10px;
            border-radius: 8px;
            display: inline-block;
        }
        .improvement { color: green; font-weight: bold; }
        .degradation { color: red; font-weight: bold; }
        .chart-container { width: 45%; display: inline-block; margin: 2%; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🧪 Benchmark Results: Regex vs Schema.org</h1>
    
    <h2>📊 Summary</h2>
    <div class="metric-card">
        <h3>Precision Improvement</h3>
        <p class="improvement">+${benchmarkResults.summary.improvements.precision}%</p>
    </div>
    
    <div class="metric-card">
        <h3>Recall Improvement</h3>
        <p class="improvement">+${benchmarkResults.summary.improvements.recall}%</p>
    </div>
    
    <div class="metric-card">
        <h3>Latency Impact</h3>
        <p class="${benchmarkResults.summary.improvements.latency > 0 ? 'degradation' : 'improvement'}">
            ${benchmarkResults.summary.improvements.latency}%
        </p>
    </div>
    
    <h2>📈 Detailed Analysis</h2>
    
    <div class="chart-container">
        <canvas id="latencyChart"></canvas>
    </div>
    
    <div class="chart-container">
        <canvas id="precisionRecallChart"></canvas>
    </div>
    
    <h2>🔬 Statistical Significance</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>t-Statistic</th>
            <th>p-Value</th>
            <th>Effect Size</th>
            <th>Significant?</th>
        </tr>
        <tr>
            <td>Precision</td>
            <td>${benchmarkResults.statistical.precision.tStatistic.toFixed(3)}</td>
            <td>${benchmarkResults.statistical.precision.pValue.toFixed(4)}</td>
            <td>${benchmarkResults.statistical.precision.effectSize.toFixed(3)}</td>
            <td>${benchmarkResults.statistical.precision.significant ? '✅' : '❌'}</td>
        </tr>
        <tr>
            <td>Latency</td>
            <td>${benchmarkResults.statistical.latency.tStatistic.toFixed(3)}</td>
            <td>${benchmarkResults.statistical.latency.pValue.toFixed(4)}</td>
            <td>${benchmarkResults.statistical.latency.effectSize.toFixed(3)}</td>
            <td>${benchmarkResults.statistical.latency.significant ? '✅' : '❌'}</td>
        </tr>
    </table>
    
    <h2>🎯 Recommendations</h2>
    <ul>
        ${benchmarkResults.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
    
    <h2>📊 Live Monitoring Data</h2>
    <div class="metric-card">
        <h3>Uptime</h3>
        <p>${monitoringData.overview.uptime.toFixed(1)} minutes</p>
    </div>
    
    <div class="metric-card">
        <h3>Total Queries</h3>
        <p>${monitoringData.overview.totalQueries}</p>
    </div>
    
    <div class="metric-card">
        <h3>Active Users</h3>
        <p>${monitoringData.overview.activeUsers}</p>
    </div>
    
    <script>
        // Renderizar gráficos
        const latencyCtx = document.getElementById('latencyChart').getContext('2d');
        const precisionRecallCtx = document.getElementById('precisionRecallChart').getContext('2d');
        
        // Dados seriam injetados aqui
        new Chart(latencyCtx, ${JSON.stringify(this.generateLatencyChart(benchmarkResults))});
        new Chart(precisionRecallCtx, ${JSON.stringify(this.generatePrecisionRecallChart(benchmarkResults))});
    </script>
</body>
</html>
        `;
    }
}
```

---

## 🚀 5. Execução do Teste

### 5.1 Script de Execução

```javascript
/**
 * run-benchmark.js
 * Script principal para executar o benchmark
 */
async function runCompleteBenchmark() {
    console.log('🚀 Iniciando Benchmark Completo: Regex vs Schema.org\n');
    
    // 1. Configurar teste
    const abTest = new ABTestConfig();
    const runner = new BenchmarkRunner();
    const monitor = new ABTestMonitor();
    const visualizer = new ResultsVisualizer();
    
    // 2. Executar benchmark offline
    console.log('📊 Fase 1: Benchmark Offline');
    const benchmarkResults = await runner.runBenchmark({
        coldStart: false,
        iterations: 3
    });
    
    // 3. Simular teste A/B em produção
    console.log('\n📊 Fase 2: Simulação A/B');
    await simulateProduction(abTest, monitor, 1000); // 1000 queries
    
    // 4. Coletar dados de monitoramento
    const monitoringData = monitor.getDashboard();
    
    // 5. Gerar relatório
    console.log('\n📊 Fase 3: Gerando Relatório');
    const htmlReport = visualizer.generateHTMLReport(
        benchmarkResults,
        monitoringData
    );
    
    // 6. Salvar resultados
    await saveResults({
        benchmark: benchmarkResults,
        monitoring: monitoringData,
        report: htmlReport
    });
    
    // 7. Exibir resumo
    displaySummary(benchmarkResults, monitoringData);
}

/**
 * Simula queries em produção
 */
async function simulateProduction(abTest, monitor, numQueries) {
    const users = Array.from({length: 100}, (_, i) => `user_${i}`);
    const queries = [
        "redis cache",
        "breakthrough técnico kubernetes",
        "decisões arquiteturais 2024",
        "soluções similares ao Kafka",
        "evolução de microserviços"
    ];
    
    for (let i = 0; i < numQueries; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const query = queries[Math.floor(Math.random() * queries.length)];
        const group = abTest.assignUserToGroup(user);
        
        // Simular latência realista
        const baseLatency = group === 'control' ? 30 : 150;
        const latency = baseLatency + Math.random() * 50;
        
        // Simular resultados
        const results = generateMockResults(group, query);
        
        // Registrar no monitor
        monitor.recordQuery(user, group, query, results, latency);
        
        // Delay entre queries
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

/**
 * Exibe resumo no console
 */
function displaySummary(benchmark, monitoring) {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   RESUMO EXECUTIVO                     ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`
📊 Métricas de Qualidade:
   Precision: ${benchmark.summary.improvements.precision > 0 ? '✅' : '❌'} ${benchmark.summary.improvements.precision}%
   Recall:    ${benchmark.summary.improvements.recall > 0 ? '✅' : '❌'} ${benchmark.summary.improvements.recall}%
   
⚡ Métricas de Performance:
   Latência:  ${benchmark.summary.improvements.latency < 50 ? '✅' : '❌'} ${benchmark.summary.improvements.latency}%
   
🔬 Significância Estatística:
   Precision: ${benchmark.statistical.precision.significant ? '✅ Significante' : '❌ Não significante'} (p=${benchmark.statistical.precision.pValue.toFixed(4)})
   Latency:   ${benchmark.statistical.latency.significant ? '✅ Significante' : '❌ Não significante'} (p=${benchmark.statistical.latency.pValue.toFixed(4)})
   
📈 Recomendação Final:
   ${monitoring.recommendation.message}
   Ação: ${monitoring.recommendation.action}
    `);
    console.log('═══════════════════════════════════════════════════════');
}

// Executar benchmark
runCompleteBenchmark().catch(console.error);
```

---

## 📊 6. Análise de Resultados Esperados

### 6.1 Cenários de Resultado

**Cenário A: Schema.org Vence Claramente**
- Precision: +35-40%
- Recall: +30-35%
- Latência: +100-200ms (mitigado por cache)
- Recomendação: Deploy completo

**Cenário B: Vitória Parcial**
- Precision: +15-20%
- Recall: +10-15%
- Latência: +200-300ms
- Recomendação: Deploy híbrido com otimizações

**Cenário C: Performance Inadequada**
- Precision: +5-10%
- Recall: +5-10%
- Latência: +300ms+
- Recomendação: Reengenharia necessária

### 6.2 Decisão Final

O teste A/B fornecerá dados empíricos para tomar a decisão correta:

1. **Se Cenário A**: Migração completa para Schema.org
2. **Se Cenário B**: Sistema híbrido com roteamento inteligente
3. **Se Cenário C**: Manter regex e investir em otimizações alternativas

---

## 🎯 Conclusão

Este plano de teste A/B fornece uma abordagem científica e baseada em dados para validar a migração para Schema.org. Com métricas claras, testes estatísticos robustos e monitoramento em tempo real, a decisão final será baseada em evidências concretas ao invés de suposições.

O investimento em um teste A/B bem estruturado minimiza riscos e maximiza as chances de sucesso da migração, garantindo que os usuários recebam a melhor experiência possível.

---

*Documento preparado por: Performance Optimization Team*  
*Data: 2025-07-25*  
*Versão: 1.0*