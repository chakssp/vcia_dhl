# GUIA DO USUÁRIO - DETECÇÃO OBSIDIAN

## 🎯 Como Usar a Detecção Automática do Obsidian

### 📋 Pré-requisitos
- Navegador Chrome 86+ ou Edge 86+ (File System Access API)
- Sistema operacional: Windows, macOS ou Linux
- Vaults do Obsidian instalados localmente

### 🚀 Passo a Passo

#### 1. Acesse a Aplicação
```
http://localhost:8000
```

#### 2. Navegue para Etapa 1
- Clique em **"Etapa 1: Descoberta Automática"**
- A interface de descoberta será exibida

#### 3. Localize a Seção Obsidian
Você verá uma seção destacada em azul com:
- 🎯 **Título**: "Detecção Automática do Obsidian"
- 🔵 **Botão grande**: "🔍 PERMITIR ACESSO - Detectar Vaults do Obsidian"
- ✅ **Texto explicativo**: "SOLUÇÃO: Clique no botão acima..."

#### 4. Clique no Botão
Ao clicar em **"🔍 PERMITIR ACESSO - Detectar Vaults do Obsidian"**:

1. **Modal aparece** com título "🔍 Detectar Vaults do Obsidian"
2. **Explicação** do que será feito:
   - ✅ Buscar pastas com estrutura do Obsidian (.obsidian/)
   - ✅ Contar arquivos .md em cada vault
   - ✅ Ler configurações básicas do vault
   - ❌ **Nunca** modificar seus arquivos
3. **Nota de privacidade**: "🔒 Todos os dados permanecem no seu navegador"

#### 5. Conceda Permissão
- Clique em **"Permitir Acesso"**
- O navegador abrirá o **seletor de diretório nativo**
- Navegue até onde seus vaults do Obsidian estão localizados

#### 6. Selecione o Diretório
**Exemplos de locais comuns:**
- **Windows**: `C:\Users\[seu-usuario]\Documents\ObsidianVaults\`
- **macOS**: `/Users/[seu-usuario]/Documents/ObsidianVaults/`
- **Linux**: `/home/[seu-usuario]/Documents/ObsidianVaults/`

#### 7. Aguarde a Busca
O sistema irá:
- 🔍 Escanear o diretório selecionado
- 📁 Procurar por pastas contendo `.obsidian/`
- 📊 Contar arquivos `.md` em cada vault
- ✅ Adicionar vaults encontrados automaticamente

### 📊 Resultados Esperados

#### ✅ Sucesso
- **Notificação verde**: "X vault(s) do Obsidian encontrado(s)"
- **Vaults adicionados** à lista de "Diretórios Configurados"
- **Pronto para descoberta** com "🔍 Iniciar Descoberta"

#### ⚠️ Nenhum Vault Encontrado
- **Notificação azul**: "Nenhum vault do Obsidian encontrado neste diretório"
- **Sugestão**: Tente selecionar um diretório pai ou outro local

#### ❌ Erro de Acesso
- **Notificação vermelha**: "Erro ao acessar diretório selecionado"
- **Solução**: Verifique permissões e tente novamente

### 🔧 Solução de Problemas

#### Problema: Modal não aparece
**Solução:**
1. Acesse `http://localhost:8000/debug-obsidian.html`
2. Execute os testes automáticos
3. Clique em "🔍 Detectar Obsidian (Direto)" para testar

#### Problema: Botão não encontrado
**Verifique:**
- ✅ Está na "Etapa 1: Descoberta"
- ✅ Navegador é Chrome/Edge 86+
- ✅ JavaScript está habilitado

#### Problema: Seletor de diretório não abre
**Causas possíveis:**
- ❌ Navegador não suporta File System Access API
- ❌ Permissões de segurança bloqueadas
- ❌ Executando em HTTP (não HTTPS) em produção

### 🛡️ Segurança e Privacidade

#### ✅ O que o Sistema FAZ:
- Lê apenas a estrutura de diretórios
- Identifica presença de `.obsidian/` folders
- Conta arquivos `.md` para estatísticas
- Processa dados localmente no navegador

#### ❌ O que o Sistema NÃO FAZ:
- Não modifica nenhum arquivo
- Não envia dados para servidores externos
- Não acessa conteúdo de arquivos pessoais
- Não salva senhas ou informações sensíveis

### 📱 Alternativas de Acesso

#### Teste Direto
```
http://localhost:8000/debug-obsidian.html
```
- Interface de debug específica
- Testes automáticos de componentes
- Logs detalhados para diagnóstico

#### Teste Completo
```
http://localhost:8000/test-discovery.html
```
- Interface completa de teste
- Configuração manual de diretórios
- Estatísticas detalhadas de descoberta

### 🎯 Próximos Passos

Após detectar os vaults:
1. **Configurar filtros** (Etapa 1)
2. **Iniciar descoberta** com "🔍 Iniciar Descoberta"
3. **Aguardar pré-análise** (Etapa 2)
4. **Proceder para análise IA** (Etapa 3)

### 📞 Suporte

**Para problemas técnicos:**
- Console do navegador (F12) para erros
- Comando `kcdiag()` para diagnóstico completo
- Páginas de debug para testes específicos

**Para feedback:**
- Issues no GitHub do projeto
- Documentação em `/docs/sprint/1.2/`

---

**Guia criado para SPRINT 1.2**  
**Funcionalidade validada e testada** ✅