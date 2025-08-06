# 04 - CategoryManager Rewrite Spec

## Status: ⚠️ MAIOR PROBLEMA V1 - REQUER REESCRITA COMPLETA

### Ordem de Implementação: 4/8

### Problemas Críticos da V1
1. **Múltiplas fontes de verdade**
   - defaultCategories no código
   - customCategories no localStorage
   - categories.jsonl como arquivo
   - AppState misturando tudo

2. **Sincronização falha entre componentes**
   - FileRenderer tem sua lista
   - StatsPanel tem outra
   - CategoryManager tem terceira

3. **Persistência problemática**
   - localStorage limitado e não confiável
   - Perde dados em reload/update
   - Não sincroniza entre abas

### SOLUÇÃO V2: Arquitetura Completamente Nova

#### Backend (Supabase/PostgreSQL)
```sql
-- Tabela de categorias
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  icon VARCHAR(10),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Relação M:N com arquivos
CREATE TABLE file_categories (
  file_id VARCHAR(255),
  category_id UUID REFERENCES categories(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (file_id, category_id)
);

-- Índices para performance
CREATE INDEX idx_file_categories_file ON file_categories(file_id);
CREATE INDEX idx_file_categories_category ON file_categories(category_id);
```

#### Frontend V2
```javascript
class CategoryService {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.cache = new Map(); // Cache local para performance
  }
  
  async getCategories() {
    // Sempre busca do servidor (fonte única)
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');
    
    if (!error) {
      this.updateCache(data);
    }
    
    return data;
  }
  
  async createCategory(category) {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    
    // Emitir evento para atualizar UI
    EventBus.emit('CATEGORY_CREATED', data);
    
    return data;
  }
  
  async assignToFile(fileId, categoryIds) {
    // Transação atômica
    const assignments = categoryIds.map(catId => ({
      file_id: fileId,
      category_id: catId
    }));
    
    return await this.supabase
      .from('file_categories')
      .upsert(assignments);
  }
}
```

### Migração de Dados
1. Exportar categorias existentes para JSON
2. Importar no Supabase como dados iniciais
3. Mapear file_categories existentes
4. Descartar localStorage completamente

### Benefícios
- ✅ Fonte única de verdade (banco de dados)
- ✅ Sincronização automática entre abas/dispositivos
- ✅ Backup automático no Supabase
- ✅ Escalável e performático
- ✅ API REST pronta para uso

### Integração V2
- Substituir CategoryManager por CategoryService
- Conectar à seção Categories da sidebar
- Implementar UI de CRUD inline
- Real-time updates via Supabase subscriptions

### Próximo: [05-unified-confidence.md](./05-unified-confidence.md)