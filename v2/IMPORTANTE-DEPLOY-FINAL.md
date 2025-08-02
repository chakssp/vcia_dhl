# ⚠️ IMPORTANTE - DEPLOY FINAL NA VPS

## 🎯 OBJETIVO FINAL: APLICAÇÃO VAI RODAR NA MESMA VPS

### ARQUITETURA FINAL NA VPS:
```
┌─────────────────────────────────────────────────┐
│                    VPS                          │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         Rede Docker: inetd              │   │
│  │                                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────┐ │   │
│  │  │PostgreSQL│  │  Redis   │  │Qdrant│ │   │
│  │  └──────────┘  └──────────┘  └──────┘ │   │
│  │        ↑             ↑            ↑     │   │
│  │        └─────────────┴────────────┘     │   │
│  │                     ↓                   │   │
│  │              ┌──────────┐               │   │
│  │              │ KC V2 API│               │   │
│  │              └──────────┘               │   │
│  │                     ↓                   │   │
│  │              ┌──────────┐               │   │
│  │              │ KC V2 UI │               │   │
│  │              └──────────┘               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│                    Traefik                      │
│                      ↓                          │
│              kc.vcia.com.br                     │
└─────────────────────────────────────────────────┘
```

## 🚨 DECISÃO CRÍTICA DE ARQUITETURA

### ❌ NÃO EXPOR POSTGRESQL EXTERNAMENTE
- PostgreSQL deve permanecer APENAS na rede interna `inetd`
- Sem binding em IPs externos ou Tailscale
- Segurança em primeiro lugar

### ✅ DESENVOLVIMENTO COM DEPLOY EM MENTE
1. **Desenvolvimento Local**: Use mock data ou SQLite local
2. **Testes de Integração**: Deploy staging na VPS
3. **Produção**: Tudo rodando dentro da rede Docker

## 📋 PLANO DE DESENVOLVIMENTO CORRETO

### FASE 1: Desenvolvimento Local (AGORA)
```javascript
// v2/js/services/PostgreSQLService.js
class PostgreSQLService {
  constructor() {
    if (process.env.NODE_ENV === 'development') {
      // Usar SQLite local ou mock
      this.useLocalDB();
    } else {
      // Produção: PostgreSQL interno
      this.usePostgreSQL();
    }
  }
}
```

### FASE 2: Deploy de Teste na VPS
```bash
# Deploy temporário para testes
docker-compose -f kc-v2.yaml up -d
docker exec kc-v2-api npm run init-db
```

### FASE 3: Deploy Final
```yaml
# kc-v2.yaml final
services:
  kc-v2-api:
    networks:
      - inetd  # MESMA REDE DO POSTGRES
    environment:
      - PG_HOST=postgres  # Nome do serviço interno
      - REDIS_HOST=redis  # Nome do serviço interno
```

## 🛠️ ESTRATÉGIA DE DESENVOLVIMENTO RECOMENDADA

### 1. OPÇÃO A: SQLite para Dev Local
```bash
# Desenvolvimento local com SQLite
npm install sqlite3
# Banco local para desenvolvimento
# Deploy na VPS usa PostgreSQL
```

### 2. OPÇÃO B: Docker Compose Local
```yaml
# docker-compose.local.yml
version: '3.8'
services:
  postgres-local:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=localdev
```

### 3. OPÇÃO C: Deploy Direto na VPS (RECOMENDADO)
```bash
# Desenvolver direto na VPS via VS Code Remote
# ou
# Deploy contínuo com git push
```

## 🎯 CONFIGURAÇÃO FINAL NA VPS

### 1. API rodando na rede inetd:
```javascript
// Conexões internas apenas
const db = pgp({
  host: 'postgres',      // Nome do container
  port: 5432,           // Porta interna
  database: 'kc_v2',
  user: 'postgres',
  password: process.env.PG_PASSWORD
});
```

### 2. Sem exposição externa:
- ❌ Sem ports expostos no postgres.yaml
- ❌ Sem binding em IPs externos
- ✅ Comunicação apenas via rede Docker interna

### 3. Acesso via Traefik:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.kc.rule=Host(`kc.vcia.com.br`)"
```

## 📝 RESUMO EXECUTIVO

**POSTGRESQL NÃO DEVE SER EXPOSTO EXTERNAMENTE**

A aplicação KC V2 vai rodar NA MESMA VPS, NA MESMA REDE DOCKER.
Desenvolva com isso em mente:
- Use dados locais para desenvolvimento
- Faça deploy na VPS para testes reais
- Mantenha segurança como prioridade

## 🚀 PRÓXIMOS PASSOS CORRETOS

1. **Desenvolvimento Local**: 
   - Use SQLite ou PostgreSQL local
   - Não dependa da VPS para desenvolver

2. **Deploy de Teste**:
   - Suba a API na VPS quando precisar testar
   - Use a rede `inetd` desde o início

3. **Produção**:
   - Tudo interno, nada exposto
   - Acesso apenas via domínio com Traefik

---

**LEMBRE-SE**: A segurança da VPS é prioridade. PostgreSQL deve permanecer interno!