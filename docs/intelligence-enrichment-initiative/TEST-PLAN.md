# Plano de Testes - Intelligence Enrichment Initiative

**Versão**: 1.0  
**Data**: 30/01/2025  
**Cobertura Alvo**: > 85%  

---

## 🎯 Objetivos dos Testes

1. **Validar Funcionalidade**: Garantir que todas as features funcionam conforme especificado
2. **Verificar Qualidade**: Confirmar que convergências e insights são semanticamente válidos
3. **Testar Performance**: Assegurar que o sistema escala adequadamente
4. **Garantir Integração**: Verificar compatibilidade com sistema existente
5. **Prevenir Regressões**: Manter funcionalidades existentes intactas

---

## 📊 Matriz de Testes

### Níveis de Teste

```
┌─────────────────┐
│   E2E Tests     │ ← Cenários completos do usuário
├─────────────────┤
│Integration Tests│ ← Integração entre componentes
├─────────────────┤
│  Unit Tests     │ ← Funções e métodos isolados
└─────────────────┘
```

### Cobertura por Componente

| Componente | Unit | Integration | E2E | Total |
|------------|------|-------------|-----|-------|
| ConvergenceAnalysisService | 85% | 80% | 70% | 78% |
| IntelligenceEnrichmentPipeline | 80% | 85% | 75% | 80% |
| RAGExportManager (modificado) | 70% | 90% | 85% | 82% |
| Algoritmos de convergência | 95% | - | - | 95% |
| Cache e performance | 90% | 70% | - | 80% |

---

## 🧪 Casos de Teste Detalhados

### 1. Testes Unitários

#### 1.1 ConvergenceAnalysisService

**TC-CAS-001: Inicialização do Serviço**
```javascript
describe('ConvergenceAnalysisService - Initialization', () => {
    it('deve inicializar com sucesso quando Ollama está disponível', async () => {
        // Arrange
        mockOllamaAvailable(true);
        
        // Act
        const result = await service.initialize();
        
        // Assert
        expect(result).toBe(true);
        expect(service.initialized).toBe(true);
    });
    
    it('deve falhar quando Ollama não está disponível', async () => {
        // Arrange
        mockOllamaAvailable(false);
        
        // Act & Assert
        await expect(service.initialize()).rejects.toThrow('Ollama não está disponível');
    });
});
```

**TC-CAS-002: Detecção de Convergência**
```javascript
describe('Detecção de Convergência', () => {
    it('deve detectar convergência entre documentos similares', async () => {
        // Arrange
        const docs = [
            createTestDoc('ML breakthrough in neural networks'),
            createTestDoc('Neural network advancement in ML')
        ];
        
        // Act
        const result = await service.analyzeConvergence(docs);
        
        // Assert
        expect(result.convergenceChains).toHaveLength(1);
        expect(result.convergenceChains[0].strength).toBeGreaterThan(0.7);
    });
    
    it('não deve detectar convergência entre documentos dissimilares', async () => {
        // Arrange
        const docs = [
            createTestDoc('Cooking recipes for beginners'),
            createTestDoc('Quantum physics equations')
        ];
        
        // Act
        const result = await service.analyzeConvergence(docs);
        
        // Assert
        expect(result.convergenceChains).toHaveLength(0);
    });
    
    it('deve respeitar minChainLength', async () => {
        // Arrange
        const docs = [
            createTestDoc('Topic A'),
            createTestDoc('Topic A related')
        ];
        service.minChainLength = 3;
        
        // Act
        const result = await service.analyzeConvergence(docs);
        
        // Assert
        expect(result.convergenceChains).toHaveLength(0);
    });
});
```

**TC-CAS-003: Identificação de Temas**
```javascript
describe('Identificação de Temas', () => {
    it('deve identificar temas emergentes em micro-clusters', async () => {
        // Arrange
        const docs = createThemedDocuments([
            { theme: 'AI', count: 3 },
            { theme: 'Blockchain', count: 2 }
        ]);
        
        // Act
        const result = await service.analyzeConvergence(docs);
        
        // Assert
        expect(result.emergentThemes).toHaveLength(2);
        expect(result.emergentThemes.map(t => t.name)).toContain('AI');
        expect(result.emergentThemes.map(t => t.name)).toContain('Blockchain');
    });
    
    it('deve detectar temas cross-chain', async () => {
        // Arrange
        const docs = createCrossChainDocuments();
        
        // Act
        const result = await service.analyzeConvergence(docs);
        
        // Assert
        const crossThemes = result.emergentThemes.filter(t => t.type === 'cross-chain');
        expect(crossThemes.length).toBeGreaterThan(0);
    });
});
```

**TC-CAS-004: Cálculo de Scores**
```javascript
describe('Cálculo de Scores', () => {
    it('deve calcular convergenceScore corretamente', () => {
        // Arrange
        const file = {
            relevanceScore: 50,
            categories: ['AI', 'ML'],
            analysisType: 'Breakthrough Técnico'
        };
        
        // Act
        const score = service.calculateConvergenceScore(file);
        
        // Assert
        expect(score).toBe(70); // 50 + (2*5) + 10
    });
    
    it('deve limitar score a 100', () => {
        // Arrange
        const file = {
            relevanceScore: 90,
            categories: ['A', 'B', 'C', 'D'],
            analysisType: 'Momento Decisivo'
        };
        
        // Act
        const score = service.calculateConvergenceScore(file);
        
        // Assert
        expect(score).toBe(100); // Capped at 100
    });
});
```

#### 1.2 IntelligenceEnrichmentPipeline

**TC-IEP-001: Pipeline de Enriquecimento**
```javascript
describe('Pipeline de Enriquecimento', () => {
    it('deve enriquecer documentos com todos os campos esperados', async () => {
        // Arrange
        const docs = createTestDocuments(5);
        
        // Act
        const result = await pipeline.enrichDocuments(docs);
        
        // Assert
        result.documents.forEach(doc => {
            expect(doc).toHaveProperty('convergenceScore');
            expect(doc).toHaveProperty('impactScore');
            expect(doc).toHaveProperty('intelligenceScore');
            expect(doc).toHaveProperty('intelligenceType');
            expect(doc).toHaveProperty('breakthroughs');
            expect(doc).toHaveProperty('convergenceChains');
            expect(doc).toHaveProperty('insights');
            expect(doc).toHaveProperty('enrichmentMetadata');
        });
    });
    
    it('deve gerar metadados globais corretos', async () => {
        // Arrange
        const docs = createTestDocuments(10);
        
        // Act
        const result = await pipeline.enrichDocuments(docs);
        
        // Assert
        expect(result.metadata).toHaveProperty('summary');
        expect(result.metadata).toHaveProperty('distribution');
        expect(result.metadata).toHaveProperty('keyFindings');
        expect(result.metadata).toHaveProperty('knowledgeGraph');
        expect(result.metadata).toHaveProperty('temporalAnalysis');
        expect(result.metadata).toHaveProperty('recommendations');
    });
});
```

**TC-IEP-002: Detecção de Breakthroughs**
```javascript
describe('Detecção de Breakthroughs', () => {
    it('deve detectar paradigm shifts', async () => {
        // Arrange
        const docs = createParadigmShiftScenario();
        
        // Act
        const result = await pipeline.enrichDocuments(docs);
        
        // Assert
        const paradigmShifts = result.analysis.breakthroughs
            .filter(b => b.type === 'paradigm_shift');
        expect(paradigmShifts.length).toBeGreaterThan(0);
    });
    
    it('deve identificar knowledge hubs', async () => {
        // Arrange
        const docs = createHubScenario();
        
        // Act
        const result = await pipeline.enrichDocuments(docs);
        
        // Assert
        const hubs = result.analysis.breakthroughs
            .filter(b => b.type === 'convergence_center');
        expect(hubs.length).toBeGreaterThan(0);
    });
});
```

**TC-IEP-003: Processamento em Lotes**
```javascript
describe('Processamento em Lotes', () => {
    it('deve processar grandes volumes em lotes', async () => {
        // Arrange
        const docs = createTestDocuments(150);
        let progressCalls = 0;
        
        // Act
        const result = await pipeline.processBatch(docs, {
            batchSize: 50,
            onProgress: () => progressCalls++
        });
        
        // Assert
        expect(result.documents).toHaveLength(150);
        expect(progressCalls).toBe(3); // 3 batches
    });
    
    it('deve consolidar resultados de múltiplos lotes', async () => {
        // Arrange
        const docs = createTestDocuments(100);
        
        // Act
        const result = await pipeline.processBatch(docs, { batchSize: 25 });
        
        // Assert
        expect(result.stats.processed).toBe(100);
        expect(result.metadata).toBeDefined();
    });
});
```

### 2. Testes de Integração

#### 2.1 Integração com RAGExportManager

**TC-INT-001: Pipeline Completo de Exportação**
```javascript
describe('Integração RAGExportManager', () => {
    beforeEach(async () => {
        await setupTestEnvironment();
        await mockServices();
    });
    
    it('deve processar arquivos aprovados com enriquecimento', async () => {
        // Arrange
        const approvedFiles = createApprovedFiles(10);
        KC.AppState.set('files', approvedFiles);
        
        // Act
        const result = await KC.RAGExportManager.processApprovedFiles();
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.stats.enrichment).toBeDefined();
        expect(result.stats.enrichment.chainsFound).toBeGreaterThan(0);
    });
    
    it('deve salvar metadados globais no AppState', async () => {
        // Arrange
        const files = createApprovedFiles(5);
        
        // Act
        await KC.RAGExportManager.processApprovedFiles();
        
        // Assert
        const metadata = KC.AppState.get('knowledgeMetadata');
        expect(metadata).toBeDefined();
        expect(metadata.summary.totalDocuments).toBe(5);
    });
});
```

#### 2.2 Integração com QdrantService

**TC-INT-002: Persistência de Dados Enriquecidos**
```javascript
describe('Integração com Qdrant', () => {
    it('deve salvar campos de convergência no Qdrant', async () => {
        // Arrange
        const enrichedDoc = createEnrichedDocument();
        
        // Act
        const point = KC.QdrantUnifiedSchema.generatePayload(enrichedDoc, chunk, 0);
        const uploadResult = await KC.QdrantService.uploadPoints([point]);
        
        // Assert
        expect(uploadResult.success).toBe(true);
        
        // Verificar se campos foram salvos
        const retrieved = await KC.QdrantService.getPoint(point.id);
        expect(retrieved.payload.convergenceScore).toBe(enrichedDoc.convergenceScore);
        expect(retrieved.payload.intelligenceType).toBe(enrichedDoc.intelligenceType);
    });
});
```

### 3. Testes End-to-End

#### 3.1 Cenário Completo de Processamento

**TC-E2E-001: Fluxo Completo do Usuário**
```javascript
describe('E2E - Fluxo Completo', () => {
    it('deve processar documentos do início ao fim', async () => {
        // 1. Descoberta de arquivos
        const files = await discoverTestFiles();
        
        // 2. Aprovação
        files.forEach(f => f.approved = true);
        KC.AppState.set('files', files);
        
        // 3. Processamento com enriquecimento
        const processResult = await KC.RAGExportManager.processApprovedFiles({
            enableEnrichment: true
        });
        
        // 4. Verificar no Qdrant
        const collection = await KC.QdrantService.getCollectionInfo();
        
        // 5. Verificar visualizações
        const intelligenceLab = await loadIntelligenceLab();
        
        // Assertions
        expect(processResult.success).toBe(true);
        expect(collection.points_count).toBeGreaterThan(0);
        expect(intelligenceLab.hasConvergenceData).toBe(true);
    });
});
```

---

## 🏃 Testes de Performance

### 4.1 Benchmarks de Velocidade

**TC-PERF-001: Tempo de Processamento**
```javascript
describe('Performance - Tempo de Processamento', () => {
    it('deve processar 100 documentos em menos de 60 segundos', async () => {
        // Arrange
        const docs = createTestDocuments(100);
        const startTime = Date.now();
        
        // Act
        await pipeline.enrichDocuments(docs);
        const elapsedTime = Date.now() - startTime;
        
        // Assert
        expect(elapsedTime).toBeLessThan(60000);
    });
    
    it('deve manter tempo linear com aumento de documentos', async () => {
        // Test with different sizes
        const times = [];
        
        for (const size of [10, 20, 40, 80]) {
            const docs = createTestDocuments(size);
            const start = Date.now();
            await pipeline.enrichDocuments(docs);
            times.push((Date.now() - start) / size);
        }
        
        // Tempo por documento não deve aumentar drasticamente
        const variance = Math.max(...times) / Math.min(...times);
        expect(variance).toBeLessThan(1.5);
    });
});
```

### 4.2 Testes de Memória

**TC-PERF-002: Uso de Memória**
```javascript
describe('Performance - Memória', () => {
    it('deve liberar memória após processamento', async () => {
        // Arrange
        const initialMemory = process.memoryUsage().heapUsed;
        const docs = createTestDocuments(200);
        
        // Act
        await pipeline.enrichDocuments(docs);
        global.gc(); // Force garbage collection
        
        // Assert
        const finalMemory = process.memoryUsage().heapUsed;
        const increase = (finalMemory - initialMemory) / 1024 / 1024; // MB
        expect(increase).toBeLessThan(100); // Max 100MB increase
    });
});
```

### 4.3 Testes de Cache

**TC-PERF-003: Eficiência do Cache**
```javascript
describe('Performance - Cache', () => {
    it('deve ter hit rate > 70% em reprocessamento', async () => {
        // Arrange
        const docs = createTestDocuments(50);
        
        // Act - Primeiro processamento
        await service.analyzeConvergence(docs);
        service.clearCache();
        
        // Act - Segundo processamento
        await service.analyzeConvergence(docs);
        const stats = service.getStats();
        
        // Assert
        const hitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses);
        expect(hitRate).toBeGreaterThan(0.7);
    });
});
```

---

## 🔍 Testes de Qualidade

### 5.1 Validação Semântica

**TC-QUAL-001: Qualidade de Convergências**
```javascript
describe('Qualidade - Convergências', () => {
    it('deve formar cadeias semanticamente coerentes', async () => {
        // Arrange
        const docs = [
            { content: 'Machine learning algorithms for prediction' },
            { content: 'Predictive models using ML techniques' },
            { content: 'AI-based prediction systems' }
        ];
        
        // Act
        const result = await service.analyzeConvergence(docs);
        
        // Assert
        expect(result.convergenceChains).toHaveLength(1);
        const chain = result.convergenceChains[0];
        expect(chain.theme).toMatch(/prediction|ML|machine learning/i);
        expect(chain.strength).toBeGreaterThan(0.8);
    });
});
```

### 5.2 Validação de Insights

**TC-QUAL-002: Relevância dos Insights**
```javascript
describe('Qualidade - Insights', () => {
    it('deve gerar insights relevantes e acionáveis', async () => {
        // Arrange
        const scenario = createInsightScenario();
        
        // Act
        const result = await pipeline.enrichDocuments(scenario.docs);
        
        // Assert
        const insights = result.analysis.insights;
        expect(insights.length).toBeGreaterThan(0);
        
        insights.forEach(insight => {
            expect(insight.confidence).toBeGreaterThan(0.7);
            expect(insight.content).not.toBeEmpty();
            expect(insight.relatedFiles.length).toBeGreaterThan(0);
        });
    });
});
```

---

## 🛡️ Testes de Segurança e Privacidade

### 6.1 Proteção de Dados

**TC-SEC-001: Não Vazamento de Dados**
```javascript
describe('Segurança - Proteção de Dados', () => {
    it('não deve incluir conteúdo sensível em logs', async () => {
        // Arrange
        const sensitiveDoc = {
            content: 'Password: secret123, API_KEY: xyz789'
        };
        const logSpy = jest.spyOn(console, 'log');
        
        // Act
        await service.analyzeConvergence([sensitiveDoc]);
        
        // Assert
        const logs = logSpy.mock.calls.flat().join(' ');
        expect(logs).not.toContain('secret123');
        expect(logs).not.toContain('xyz789');
    });
});
```

---

## 📝 Plano de Execução dos Testes

### Fase 1: Testes Unitários (1 dia)
1. Configurar ambiente de testes (Jest, mocks)
2. Implementar testes unitários core
3. Executar e corrigir falhas
4. Atingir cobertura de 85%

### Fase 2: Testes de Integração (1 dia)
1. Configurar mocks de serviços externos
2. Implementar testes de integração
3. Validar fluxos entre componentes
4. Documentar dependências

### Fase 3: Testes E2E (0.5 dia)
1. Preparar ambiente E2E
2. Executar cenários completos
3. Validar resultados no Qdrant
4. Verificar Intelligence Lab

### Fase 4: Testes de Performance (0.5 dia)
1. Executar benchmarks
2. Identificar gargalos
3. Otimizar pontos críticos
4. Documentar limites

---

## 🔧 Ferramentas e Configuração

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
    testEnvironment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85
        }
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/js/$1'
    }
};
```

### Test Utilities
```javascript
// test/utils/test-helpers.js
export function createTestDoc(content, overrides = {}) {
    return {
        id: Math.random().toString(36),
        name: 'test-doc.md',
        content,
        analysisType: 'Aprendizado Geral',
        categories: [],
        relevanceScore: 50,
        ...overrides
    };
}

export function mockOllamaEmbedding() {
    return Array(768).fill(0).map(() => Math.random());
}

export async function setupTestEnvironment() {
    // Reset state
    KC.AppState.clear();
    KC.ConvergenceAnalysisService.clearCache();
    
    // Mock external services
    global.fetch = jest.fn();
}
```

---

## 📊 Métricas de Sucesso dos Testes

1. **Cobertura de Código**: > 85%
2. **Taxa de Sucesso**: 100% dos testes passando
3. **Performance**: Todos os benchmarks dentro dos limites
4. **Qualidade**: Score de convergência médio > 0.75
5. **Estabilidade**: Zero flaky tests

---

## 🚨 Critérios de Falha

O pipeline de CI/CD deve falhar se:
- Cobertura de código < 80%
- Qualquer teste E2E falhar
- Performance degradar > 20%
- Testes de segurança falharem
- Memória vazar > 50MB

---

**Fim do Plano de Testes**