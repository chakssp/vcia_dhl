# 08 - Persistence Layer Rewrite Spec

## Status: 🚨 CRÍTICO - LOCALSTORAGE NÃO CONFIÁVEL

### Ordem de Implementação: 8/8

### Problemas do LocalStorage
1. **Limite pequeno** (5-10MB)
2. **Perde dados** em modo privado
3. **Não sincroniza** entre abas
4. **"Persistente até atualizar a página"** 😤

### SOLUÇÃO RECOMENDADA: Supabase

#### Por que Supabase?
- ✅ PostgreSQL gerenciado
- ✅ 500MB grátis
- ✅ Auth integrado
- ✅ Realtime sync
- ✅ Backup automático
- ✅ API REST pronta

#### Schema Proposto
```sql
-- Estado da aplicação
CREATE TABLE app_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Para multi-usuário futuro
  key VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Arquivos descobertos
CREATE TABLE discovered_files (
  id VARCHAR(255) PRIMARY KEY, -- Hash do path
  path TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  size BIGINT,
  relevance_score INTEGER,
  last_modified TIMESTAMP,
  content_preview TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Resultados de análise
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id VARCHAR(255) REFERENCES discovered_files(id),
  analysis_type VARCHAR(100),
  result JSONB,
  provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Configurações do usuário
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  settings JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Implementação V2

```javascript
// Persistence Service
class PersistenceService {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.cache = new Map(); // Cache em memória
    this.syncInterval = 5000; // 5 segundos
  }
  
  async get(key, defaultValue = null) {
    // Tenta cache primeiro
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Busca do Supabase
    const { data, error } = await this.supabase
      .from('app_state')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      return defaultValue;
    }
    
    this.cache.set(key, data.value);
    return data.value;
  }
  
  async set(key, value) {
    // Atualiza cache imediatamente
    this.cache.set(key, value);
    
    // Salva no Supabase (async)
    const { error } = await this.supabase
      .from('app_state')
      .upsert({
        key,
        value,
        updated_at: new Date()
      });
    
    if (error) {
      console.error('Persistence error:', error);
    }
  }
  
  // Sincronização em tempo real
  subscribeToChanges() {
    this.supabase
      .channel('app_state_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_state'
      }, (payload) => {
        // Atualiza cache local
        if (payload.new) {
          this.cache.set(payload.new.key, payload.new.value);
          EventBus.emit('STATE_SYNC', payload.new);
        }
      })
      .subscribe();
  }
}
```

### Fallback: IndexedDB (Opção Local)

```javascript
// Para quem não quer/pode usar Supabase
class IndexedDBService {
  constructor() {
    this.dbName = 'KnowledgeConsolidatorV2';
    this.version = 1;
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Object stores
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('files')) {
          const files = db.createObjectStore('files', { keyPath: 'id' });
          files.createIndex('path', 'path', { unique: true });
          files.createIndex('relevance', 'relevanceScore');
        }
      };
    });
  }
  
  async get(storeName, key) {
    const tx = this.db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async set(storeName, data) {
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

### Migração de Dados

```javascript
// Script de migração única
async function migrateFromLocalStorage() {
  const oldData = {};
  
  // Coleta todos os dados do localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('KC_')) {
      try {
        oldData[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        oldData[key] = localStorage.getItem(key);
      }
    }
  }
  
  // Salva no novo sistema
  const persistence = new PersistenceService();
  
  for (const [key, value] of Object.entries(oldData)) {
    await persistence.set(key, value);
  }
  
  console.log('Migração completa:', Object.keys(oldData).length, 'itens');
}
```

### Configuração no V2

```javascript
// PowerApp inicialização
class PowerApp {
  async init() {
    // Escolhe sistema de persistência
    if (CONFIG.USE_SUPABASE) {
      this.persistence = new PersistenceService();
      await this.persistence.subscribeToChanges();
    } else {
      this.persistence = new IndexedDBService();
      await this.persistence.init();
    }
    
    // Migra dados antigos se necessário
    if (this.shouldMigrate()) {
      await migrateFromLocalStorage();
    }
    
    // Carrega estado
    this.state = await this.persistence.get('app_state', {});
  }
}
```

### Benefícios
- ✅ Dados realmente persistentes
- ✅ Sincronização entre dispositivos
- ✅ Backup automático
- ✅ Escalável (500MB+)
- ✅ Multi-usuário ready

### Próximo: [09-migration-execution-plan.md](./09-migration-execution-plan.md)