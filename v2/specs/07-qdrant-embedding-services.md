# 07 - QdrantService + EmbeddingService Cleanup Spec

## Status: ⚠️ FUNCIONANDO MAS COM LOGS EXCESSIVOS

### Ordem de Implementação: 7/8

### Problema Principal: "MILHÕES DE LOGS DE LIXO"

#### Exemplo de Logs Atuais (RUIM)
```javascript
console.log('[QdrantService] Checking connection...');
console.log('[QdrantService] Response:', response);
console.log('[QdrantService] Creating point:', point);
console.log('[EmbeddingService] Generating embedding for:', text);
console.log('[EmbeddingService] Embedding result:', embedding);
// ... centenas de logs por operação
```

### SOLUÇÃO: Sistema de Log Levels

```javascript
class LogLevel {
  static ERROR = 0;    // Apenas erros críticos
  static WARN = 1;     // Avisos importantes
  static INFO = 2;     // Informações gerais
  static DEBUG = 3;    // Debug detalhado
  static TRACE = 4;    // Tudo (atual)
}

class Logger {
  constructor(service, level = LogLevel.ERROR) {
    this.service = service;
    this.level = level;
  }
  
  error(...args) {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[${this.service}]`, ...args);
    }
  }
  
  warn(...args) {
    if (this.level >= LogLevel.WARN) {
      console.warn(`[${this.service}]`, ...args);
    }
  }
  
  info(...args) {
    if (this.level >= LogLevel.INFO) {
      console.info(`[${this.service}]`, ...args);
    }
  }
  
  debug(...args) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`[${this.service}]`, ...args);
    }
  }
}
```

### Implementação nos Serviços

```javascript
// QdrantService V2
class QdrantService {
  constructor() {
    this.logger = new Logger('QdrantService', LogLevel.ERROR);
    this.endpoint = 'http://qdr.vcia.com.br:6333';
  }
  
  async checkConnection() {
    try {
      const response = await fetch(`${this.endpoint}/collections`);
      this.logger.debug('Connection check response:', response.status);
      
      if (!response.ok) {
        this.logger.error('Connection failed:', response.statusText);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error('Connection error:', error);
      return false;
    }
  }
  
  async upsert(collectionName, points) {
    this.logger.debug(`Upserting ${points.length} points`);
    
    try {
      const response = await fetch(`${this.endpoint}/collections/${collectionName}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points })
      });
      
      if (!response.ok) {
        this.logger.error('Upsert failed:', await response.text());
        throw new Error('Upsert failed');
      }
      
      this.logger.info(`Successfully upserted ${points.length} points`);
      return await response.json();
      
    } catch (error) {
      this.logger.error('Upsert error:', error);
      throw error;
    }
  }
}
```

### Configuração Global de Logs

```javascript
// No settings panel ou via console
window.KC_LOG_LEVELS = {
  QdrantService: LogLevel.ERROR,
  EmbeddingService: LogLevel.ERROR,
  AnalysisManager: LogLevel.INFO,
  DiscoveryManager: LogLevel.WARN
};

// Debug temporário via console
KC.QdrantService.logger.level = LogLevel.DEBUG;
```

### Métricas sem Spam

```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      qdrant: {
        totalUpserts: 0,
        failedUpserts: 0,
        avgResponseTime: 0
      },
      embeddings: {
        totalGenerated: 0,
        cacheHits: 0,
        avgGenerationTime: 0
      }
    };
  }
  
  // Coleta silenciosa, exibe sob demanda
  record(service, metric, value) {
    // Atualiza métricas sem logar
  }
  
  // Comando para ver métricas
  displayStats() {
    console.table(this.metrics);
  }
}

// No console: KC.Metrics.displayStats()
```

### Benefícios
- ✅ Console limpo por padrão
- ✅ Debug ativável quando necessário
- ✅ Métricas disponíveis sob demanda
- ✅ Performance melhorada (menos I/O)
- ✅ Facilita troubleshooting direcionado

### Configuração Recomendada V2
```javascript
// Produção
QdrantService: LogLevel.ERROR
EmbeddingService: LogLevel.ERROR

// Desenvolvimento
QdrantService: LogLevel.INFO
EmbeddingService: LogLevel.INFO

// Debug específico
QdrantService: LogLevel.DEBUG
```

### Próximo: [08-persistence-layer.md](./08-persistence-layer.md)