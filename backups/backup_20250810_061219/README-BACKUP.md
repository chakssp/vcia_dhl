# 📚 ESTRATÉGIA DE BACKUP E VERSIONAMENTO - Knowledge Consolidator

## 🎯 Objetivo
Criar múltiplas camadas de proteção para nunca perder código funcional, com visibilidade tanto para o usuário quanto para o Claude através da memória persistente.

## 🛡️ Sistema de 4 Camadas de Proteção

### 🔷 Camada 1: Git Local + Tags
```bash
# Após cada funcionalidade funcionando
git add -A
git commit -m "✅ FUNCIONAL: [descrição]"
git tag -a funcional-YYYYMMDD -m "Sistema funcionando"

# Listar todas as versões funcionais
git tag -l "*funcional*"

# Voltar para versão funcional
git checkout funcional-06082025-sistema-estavel
```

### 🔷 Camada 2: Backup Local Automatizado
```batch
# Windows - Executar backup-local.bat
backup-local.bat

# Cria backup completo em F:\backups-vcia\
# Mantém link para último funcional em F:\backups-vcia\ultimo-funcional\
```

### 🔷 Camada 3: Branch de Proteção
```bash
# Branch sempre com código estável
git checkout stable-backup-06082025

# Atualizar branch estável quando sistema funcionar
git checkout -b stable-backup-YYYYMMDD
git push origin stable-backup-YYYYMMDD
```

### 🔷 Camada 4: Memória MCP (Para Claude)
```javascript
// IMPORTANTE: Salvar checkpoints na memória persistente
mcp__memory-serve__create_entities([{
    name: "CHECKPOINT-FUNCIONAL-06082025",
    entityType: "backup_checkpoint",
    observations: [
        "Sistema 100% funcional",
        "Commit: f2252ae",
        "Branch: stable-backup-06082025",
        "Tag: funcional-06082025-sistema-estavel",
        "Menu Quick Access funcionando",
        "Zoom correto 1.0",
        "Backup local em: F:\\backups-vcia\\backup_20250806_003000"
    ]
}]);

// Criar relações entre checkpoints
mcp__memory-serve__create_relations([{
    from: "CHECKPOINT-FUNCIONAL-06082025",
    to: "CHECKPOINT-FUNCIONAL-05082025",
    relationType: "evolved_from"
}]);

// Buscar histórico de checkpoints
mcp__memory-serve__search_nodes("CHECKPOINT-FUNCIONAL backup");
```

## 📋 PROTOCOLO COMPLETO DE BACKUP

### ANTES de Mudanças Grandes:

#### 1. Executar Backup Local
```batch
backup-local.bat
```

#### 2. Criar Checkpoint no Git
```bash
git add -A
git commit -m "🔄 Checkpoint antes de mudanças"
git tag -a pre-mudanca-$(date +%Y%m%d) -m "Antes de [descrição]"
```

#### 3. Salvar na Memória MCP (Claude)
```javascript
// No console ou via Claude
mcp__memory-serve__create_entities([{
    name: "CHECKPOINT-" + new Date().toISOString().split('T')[0],
    entityType: "backup_checkpoint",
    observations: [
        "Estado antes de: [descrição da mudança]",
        "Commit: " + git_commit_hash,
        "Arquivos funcionando: index.html, QuickAccessMenu.js",
        "Testes passando: sim/não",
        "Notas: [qualquer observação importante]"
    ]
}]);
```

#### 4. Atualizar CHECKPOINT.md
```markdown
# Editar arquivo CHECKPOINT.md com:
- Data/hora atual
- Commit hash
- Estado do sistema
- Como restaurar
```

#### 5. Push para GitHub (se aplicável)
```bash
git push --all --tags
```

## 🔄 PROTOCOLO DE RESTAURAÇÃO

### Se Algo Quebrar:

#### Opção 1: Via Git Tag
```bash
# Listar tags funcionais
git tag -l "*funcional*"

# Voltar para última funcional
git checkout funcional-06082025-sistema-estavel
```

#### Opção 2: Via Branch Estável
```bash
git checkout stable-backup-06082025
```

#### Opção 3: Via Backup Local
```batch
REM Windows - Restaurar último backup funcional
xcopy "F:\backups-vcia\ultimo-funcional\*" "F:\vcia-1307\vcia_dhl\" /E /I /Y
```

#### Opção 4: Via Memória MCP (Claude consulta)
```javascript
// Claude busca último checkpoint funcional
mcp__memory-serve__search_nodes("CHECKPOINT-FUNCIONAL");

// Recupera informações de como restaurar
mcp__memory-serve__read_graph({
    nodeNames: ["CHECKPOINT-FUNCIONAL-06082025"]
});
```

## 🗓️ ROTINA DIÁRIA RECOMENDADA

### Início do Dia:
1. **Backup preventivo**: `backup-local.bat`
2. **Verificar estado**: `git status`
3. **Salvar checkpoint MCP**: Via Claude com estado inicial

### Durante Desenvolvimento:
- Commit a cada 30 minutos: `git add -A && git commit -m "WIP: [descrição]"`
- Salvar na memória MCP após cada funcionalidade completa

### Final do Dia:
1. **Backup completo**: `backup-local.bat`
2. **Tag se funcional**: `git tag -a funcional-YYYYMMDD -m "EOD - Sistema funcional"`
3. **Checkpoint MCP final**: Salvar estado final na memória
4. **Push remoto**: `git push --all --tags`

## 📍 LOCAIS IMPORTANTES

### Backups Locais:
```
F:\backups-vcia\                    # Raiz dos backups
F:\backups-vcia\backup_YYYYMMDD_HHMMSS\  # Backups timestamped
F:\backups-vcia\ultimo-funcional\   # Link para último backup
```

### Branches de Proteção:
```
stable-backup-06082025   # Branch estável atual
main                     # Produção
qdrant-try1             # Desenvolvimento ativo
```

### Tags Funcionais:
```
funcional-06082025-sistema-estavel  # Sistema após rollback bem-sucedido
```

### Memória MCP (Claude):
```
Entidades: CHECKPOINT-FUNCIONAL-*
Tipo: backup_checkpoint
Buscar com: mcp__memory-serve__search_nodes("CHECKPOINT-FUNCIONAL")
```

## 🚨 AVISOS IMPORTANTES

### ⚠️ NUNCA:
- Trabalhar direto na main sem backup
- Deletar branches stable-backup-*
- Ignorar avisos de "working tree dirty"
- Fazer mudanças grandes sem checkpoint MCP

### ✅ SEMPRE:
- Executar `backup-local.bat` antes de mudanças
- Criar tag quando sistema estiver funcional
- Salvar checkpoints na memória MCP
- Manter CHECKPOINT.md atualizado
- Documentar no Git o que funciona

## 📊 Scripts Disponíveis

### Windows:
- `backup-local.bat` - Backup completo local
- `restore-backup.bat` - Restaurar de backup (a criar)

### Linux/Mac:
- `scripts/guardian-backup.sh` - Backup no formato Unix
- `scripts/restore-from-backup.sh` - Restauração
- `scripts/rollback-stable.sh` - Volta para stable

## 💡 Dicas para o Usuário

1. **Não tenha medo de commitar**: Commits frequentes = mais pontos de restauração
2. **Use tags descritivas**: `funcional-06082025-menu-corrigido` é melhor que `v1`
3. **Backup local é seu amigo**: Git pode falhar, backup local não
4. **Documente estados funcionais**: CHECKPOINT.md é sua referência rápida

## 💬 Para o Claude

### Como Buscar Histórico:
```javascript
// Buscar todos os checkpoints
mcp__memory-serve__search_nodes("CHECKPOINT backup funcional");

// Ver evolução do projeto
mcp__memory-serve__read_graph({
    nodeNames: ["CHECKPOINT-FUNCIONAL-06082025"],
    includeRelated: true
});
```

### Como Registrar Novo Checkpoint:
```javascript
// Sempre que sistema estiver funcional
mcp__memory-serve__create_entities([{
    name: "CHECKPOINT-FUNCIONAL-" + Date.now(),
    entityType: "backup_checkpoint",
    observations: [/* detalhes do estado */]
}]);
```

---

**ÚLTIMA ATUALIZAÇÃO**: 06/08/2025 01:30 BRT  
**SISTEMA ATUAL**: ✅ Funcional (f2252ae)  
**PRÓXIMO BACKUP**: Antes da próxima sessão de desenvolvimento