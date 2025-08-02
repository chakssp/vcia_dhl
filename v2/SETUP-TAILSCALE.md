# Setup KC V2 com Tailscale

## 🎯 Com Tailscale é MUITO mais simples!

### 1. Descobrir IP Tailscale da VPS
```bash
# Na VPS
tailscale ip

# Ou na sua máquina
tailscale status
# Procure pelo hostname da VPS
```

### 2. Expor PostgreSQL no Tailscale (na VPS)
```bash
# Editar postgres.yaml
nano postgres.yaml

# Adicionar binding no Tailscale IP:
ports:
  - "100.x.x.x:5432:5432"  # IP Tailscale da VPS
  
# Ou mais seguro, bind em todas as interfaces internas:
ports:
  - "0.0.0.0:5432:5432"
  
# Aplicar mudanças
docker-compose -f postgres.yaml up -d
```

### 3. Configurar .env local
```env
# v2/api/.env
PG_HOST=100.x.x.x      # IP Tailscale da VPS
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=d14172577127a87c06df94de6047d7b6
```

### 4. Testar conexão
```bash
# Testar com psql
psql -h 100.x.x.x -U postgres -p 5432

# Ou com a API
cd v2/api
npm install
npm run init-db
```

## 🔒 VANTAGENS DO TAILSCALE

- ✅ Conexão criptografada automaticamente
- ✅ Sem expor portas na internet pública
- ✅ Funciona como se fosse rede local
- ✅ Sem necessidade de VPN complexa
- ✅ Zero configuração de firewall

## 🚀 DESENVOLVIMENTO LOCAL COMPLETO

Com Tailscale, você pode:

1. **Desenvolver localmente** com banco na VPS
2. **API local** conectando no PostgreSQL remoto
3. **Frontend local** conectando na API local
4. **Deploy fácil** quando pronto

## 📝 CHECKLIST

- [ ] Pegar IP Tailscale da VPS
- [ ] Expor PostgreSQL no IP Tailscale
- [ ] Atualizar .env com IP correto
- [ ] Testar conexão
- [ ] Criar banco kc_v2
- [ ] Iniciar desenvolvimento!

Agora sim está muito mais simples! 🎉