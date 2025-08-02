# 🚀 GUIA DE DESENVOLVIMENTO KC V2

## 📋 ESTRATÉGIA: Local → VPS

### 1️⃣ DESENVOLVIMENTO LOCAL (Sua máquina)

#### Setup Inicial
```bash
cd v2/api
npm install
npm run init-local  # Cria banco SQLite local
```

#### Rodar em modo desenvolvimento
```bash
npm run dev
# API rodando em http://localhost:3333
# Usando SQLite local (sem dependência da VPS)
```

#### Estrutura de dados local
```
v2/api/data/
└── kc_v2.sqlite  # Banco local com todas as tabelas
```

### 2️⃣ TESTES DE INTEGRAÇÃO (Deploy na VPS)

#### Preparar para deploy
```bash
# Criar arquivo .env.production
cat > .env.production << EOF
NODE_ENV=production
PG_HOST=postgres
REDIS_HOST=redis
EOF
```

#### Deploy via Docker
```bash
# Na VPS
cd /path/to/services
docker-compose -f kc-v2.yaml up -d
```

### 3️⃣ PRODUÇÃO FINAL

#### Configuração final na VPS
```yaml
# kc-v2.yaml
services:
  kc-v2-api:
    environment:
      - NODE_ENV=production
      - PG_HOST=postgres    # Container name
      - REDIS_HOST=redis    # Container name
    networks:
      - inetd  # MESMA REDE INTERNA
```

## 🔄 FLUXO DE TRABALHO

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Dev Local    │ --> │ 2. Test na VPS  │ --> │ 3. Produção     │
│   SQLite        │     │   PostgreSQL    │     │   PostgreSQL    │
│   localhost     │     │   Staging       │     │   Production    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🎯 COMANDOS ESSENCIAIS

### Desenvolvimento
```bash
npm run dev          # Inicia com SQLite local
npm test            # Roda testes
npm run lint        # Verifica código
```

### Deploy
```bash
npm run build       # Prepara para produção
npm run deploy      # Deploy na VPS
```

## ⚠️ IMPORTANTE

1. **NUNCA** exponha PostgreSQL externamente
2. **SEMPRE** desenvolva com SQLite local
3. **TESTE** na VPS antes de ir para produção
4. **MANTENHA** configurações separadas (dev/prod)

## 📝 CHECKLIST PRÉ-DEPLOY

- [ ] Testes passando localmente
- [ ] `.env.production` configurado
- [ ] Docker image buildada
- [ ] Backup do banco atual
- [ ] Rollback plan preparado

## 🚀 PRÓXIMOS PASSOS

1. Execute `npm run init-local`
2. Rode `npm run dev`
3. Acesse http://localhost:3333
4. Comece a desenvolver!

---

**LEMBRE-SE**: Desenvolva local, deploy na VPS!