# KC V2 - Setup PostgreSQL

## 🚀 OPÇÕES DE IMPLEMENTAÇÃO

### OPÇÃO 1: Desenvolvimento Local (Recomendado para começar)

1. **Instalar dependências da API:**
```bash
cd v2/api
npm install
```

2. **Criar banco de dados:**
```bash
# Conectar ao PostgreSQL
psql -h localhost -U postgres -p 5432

# No prompt do psql:
CREATE DATABASE kc_v2;
\q
```

3. **Inicializar schema:**
```bash
cd v2/api
npm run init-db
```

4. **Iniciar API:**
```bash
npm start
# API rodando em http://localhost:3333
```

### OPÇÃO 2: Deploy na VPS com Docker

1. **Copiar arquivos para VPS:**
```bash
scp -r v2/api user@vps:/path/to/kc/v2/
scp v2/kc-v2.yaml user@vps:/path/to/docker/
```

2. **Na VPS, adicionar ao docker-compose:**
```bash
docker-compose -f kc-v2.yaml up -d
```

3. **Inicializar banco:**
```bash
docker exec -it kc-v2-api npm run init-db
```

## 📋 ENDPOINTS DA API

- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria
- `PUT /api/categories/:id` - Atualizar categoria
- `DELETE /api/categories/:id` - Deletar categoria
- `GET /api/settings/:key` - Obter configuração
- `PUT /api/settings/:key` - Salvar configuração
- `GET /api/state/:key` - Obter estado
- `PUT /api/state/:key` - Salvar estado

## 🔧 CONFIGURAÇÃO DO FRONTEND

No frontend V2, configure a API:

```javascript
// v2/js/config.js
const API_CONFIG = {
  // Local development
  baseUrl: 'http://localhost:3333',
  
  // Production
  // baseUrl: 'https://api.kc.vcia.com.br'
};
```

## ✅ TESTE RÁPIDO

```bash
# Testar se API está rodando
curl http://localhost:3333/health

# Listar categorias
curl http://localhost:3333/api/categories

# Criar categoria
curl -X POST http://localhost:3333/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Teste", "color": "#FF0000"}'
```

## 🎯 PRÓXIMOS PASSOS

1. ✅ API REST funcionando com PostgreSQL
2. ⏳ Adaptar CategoryManager V2 para usar API
3. ⏳ Implementar PersistenceService
4. ⏳ Migrar dados do V1

## 📝 NOTAS

- PostgreSQL já está rodando na VPS
- Redis disponível mas opcional por enquanto
- Qdrant continua sendo o principal para busca
- Sem necessidade de Supabase!