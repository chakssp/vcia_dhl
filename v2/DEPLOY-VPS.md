# Deploy KC V2 API na VPS

## 📋 PASSOS PARA DEPLOY NA VPS

### 1. Copiar arquivos para VPS
```bash
# Na sua máquina local
cd F:\vcia-1307\vcia_dhl

# Criar arquivo ZIP com a API
tar -czf kc-v2-api.tar.gz v2/api v2/js/services/PostgreSQLService.js v2/kc-v2.yaml

# Copiar para VPS
scp kc-v2-api.tar.gz user@qdr.vcia.com.br:/tmp/
```

### 2. Na VPS, extrair e configurar
```bash
# SSH na VPS
ssh user@qdr.vcia.com.br

# Extrair arquivos
cd /path/to/your/services
tar -xzf /tmp/kc-v2-api.tar.gz

# Ajustar .env para usar rede interna
cd v2/api
nano .env
```

### 3. Editar .env na VPS para rede Docker interna:
```env
# PostgreSQL dentro da rede Docker
PG_HOST=postgres
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=d14172577127a87c06df94de6047d7b6
PG_DATABASE=kc_v2

# Redis dentro da rede Docker
REDIS_HOST=redis
REDIS_PORT=6379
```

### 4. Build e Deploy com Docker Compose
```bash
# Na pasta dos serviços
docker-compose -f kc-v2.yaml up -d

# Verificar se subiu
docker ps | grep kc-v2-api

# Ver logs
docker logs kc-v2-api

# Inicializar banco de dados
docker exec -it kc-v2-api npm run init-db
```

### 5. Testar API
```bash
# Dentro da VPS
curl http://localhost:3333/health

# Se configurou Traefik
curl https://api.kc.vcia.com.br/health
```

## 🎯 ALTERNATIVA: Expor PostgreSQL temporariamente

Se preferir desenvolver localmente primeiro:

### Na VPS, editar postgres.yaml:
```yaml
    ## Descomente as linhas abaixo para uso externo
    ports:
      - 127.0.0.1:5432:5432  # Só localhost por segurança
```

### Fazer tunnel SSH:
```bash
# Na sua máquina local
ssh -L 5432:localhost:5432 user@qdr.vcia.com.br

# Manter aberto e em outro terminal:
cd v2/api
npm run init-db  # Agora funciona!
```

## 📝 RESUMO

O PostgreSQL está **dentro da rede Docker** e não é acessível externamente. Você precisa:

1. **Deploy na VPS** (recomendado) - API roda dentro da mesma rede
2. **Tunnel SSH** - Para desenvolvimento local
3. **Expor porta** - Menos seguro, não recomendado

Qual opção prefere?