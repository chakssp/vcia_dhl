# 09 - Plano de Execução da Migração V2

## 🎯 ORDEM DE IMPLEMENTAÇÃO

### Fase 1: Base (Dia 1)
1. ✅ **AppState + EventBus** → Copiar direto
2. 🔧 **Persistence Layer** → Implementar Supabase/IndexedDB
3. 🔧 **Logger System** → Implementar para todos os serviços

### Fase 2: Dados (Dia 2-3)
4. 🔧 **CategoryManager V2** → Reescrever com Supabase
5. 🔧 **DiscoveryManager Enhanced** → Patterns + Parsers
6. 🔧 **FilterManager** → Integrar com V2 UI

### Fase 3: Inteligência (Dia 4-5)
7. 🔧 **UnifiedConfidence V2** → Desacoplado
8. 🔧 **QdrantService** → Com logs limpos
9. 🔧 **EmbeddingService** → Com logs limpos
10. 🔧 **AnalysisManager** → Integrar com Command Palette

### Fase 4: Integração (Dia 6-7)
11. 🔧 **PowerApp Adapters** → Conectar tudo
12. 🔧 **Data Migration** → Migrar dados existentes
13. 🔧 **Testing** → Validar com dados reais
14. 🔧 **UI Polish** → Ajustes finais

## 📋 CHECKLIST PRÉ-MIGRAÇÃO

### Infraestrutura
- [ ] Criar conta Supabase
- [ ] Configurar schema do banco
- [ ] Gerar API keys
- [ ] Testar conexão

### Dependências
- [ ] mammoth.js (DOCX parser)
- [ ] pdf.js (PDF parser)
- [ ] emailjs-mime-parser (EML parser)
- [ ] @supabase/supabase-js

### Backup
- [ ] Exportar dados atuais do KC
- [ ] Backup do localStorage
- [ ] Documentar configurações atuais

## 🚀 SCRIPTS DE MIGRAÇÃO

```bash
# 1. Instalar dependências
npm install @supabase/supabase-js mammoth pdf.js emailjs-mime-parser

# 2. Criar estrutura V2
mkdir -p v2/js/{core,services,managers,adapters}

# 3. Copiar base
cp js/core/AppState.js v2/js/core/
cp js/core/EventBus.js v2/js/core/

# 4. Executar migração
node scripts/migrate-to-v2.js
```

## 🔧 CONFIGURAÇÃO INICIAL

```javascript
// v2/config.js
export const V2_CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://xxx.supabase.co',
  SUPABASE_ANON_KEY: 'xxx',
  
  // Features
  USE_SUPABASE: true, // false para IndexedDB
  
  // Logging
  LOG_LEVELS: {
    QdrantService: 'ERROR',
    EmbeddingService: 'ERROR',
    DiscoveryManager: 'INFO',
    CategoryService: 'INFO'
  },
  
  // Parsers
  ENABLE_PDF_PARSER: true,
  ENABLE_DOCX_PARSER: true,
  ENABLE_EML_PARSER: true
};
```

## 📊 MÉTRICAS DE SUCESSO

### Performance
- [ ] Descoberta de 1000+ arquivos < 5s
- [ ] Filtros aplicados < 100ms
- [ ] Análise IA sem bloquear UI
- [ ] Zero logs desnecessários

### Funcionalidade
- [ ] Todos os parsers funcionando
- [ ] Categorias sincronizadas
- [ ] Dados persistindo corretamente
- [ ] Command Palette responsivo

### UX
- [ ] Interface fluida
- [ ] Feedback visual claro
- [ ] Atalhos funcionando
- [ ] Mobile responsivo

## 🚨 ROLLBACK PLAN

Se algo der errado:
1. V1 continua disponível em `/index.html`
2. V2 em `/v2/index.html`
3. Dados sincronizados entre versões
4. Script de rollback: `scripts/rollback-v2.js`

## 📝 NOTAS FINAIS

- **SEM MOCK DATA** - Testar sempre com dados reais
- **SEM AMBIENTES DE TESTE** - Direto produção
- **MIGRAÇÃO INCREMENTAL** - Um componente por vez
- **VALIDAÇÃO CONTÍNUA** - Testar após cada fase

---

**PRONTO PARA EXECUTAR?** 

Responda "EXECUTAR" para começar a migração ou indique ajustes necessários.