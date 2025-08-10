# 🎨 STATUSLINE CUSTOMIZATION GUIDE - WINDOWS 11
## Possibilidades Expandidas para Claude Code

---

## 📊 VARIÁVEIS DISPONÍVEIS DO CLAUDE CODE

```bash
# Do JSON de entrada (via jq):
$input | jq -r '.workspace.current_dir'     # Diretório atual
$input | jq -r '.workspace.project_dir'     # Diretório do projeto
$input | jq -r '.model.display_name'        # Nome do modelo (Opus, Sonnet, etc)
$input | jq -r '.model.id'                  # ID completo do modelo
$input | jq -r '.session.id'                # ID da sessão (se disponível)
$input | jq -r '.user.name'                 # Nome do usuário (se disponível)
```

---

## 🚀 CONFIGURAÇÕES POR TIPO DE WORKFLOW

### 1️⃣ **Developer Produtivo** (Foco em Git + Performance)
```json
{
  "statusLine": {
    "type": "command",
    "command": "input=$(cat); dir=$(echo \"$input\" | jq -r '.workspace.current_dir' | sed 's|.*[/\\\\]||'); model=$(echo \"$input\" | jq -r '.model.display_name'); branch=$(cd \"$(echo \"$input\" | jq -r '.workspace.project_dir')\" 2>/dev/null && git branch --show-current 2>/dev/null || echo 'main'); changes=$(cd \"$(echo \"$input\" | jq -r '.workspace.project_dir')\" 2>/dev/null && git status --porcelain 2>/dev/null | wc -l || echo '0'); mem=$(wmic OS get FreePhysicalMemory /value 2>/dev/null | grep -o '[0-9]*' | awk '{print int($1/1024)}' || echo 'N/A'); printf \"\\033[36m📂 %s\\033[0m \\033[33m[%s]\\033[0m \\033[32mgit:%s\\033[0m \\033[31m✏️ %s\\033[0m \\033[35m💾 %sMB\\033[0m \\033[90m%s\\033[0m\" \"$dir\" \"$model\" \"$branch\" \"$changes\" \"$mem\" \"$(date '+%H:%M')\""
  }
}
```
**Mostra**: 📂 vcia_dhl [Opus] git:main ✏️ 5 💾 4096MB 14:30

### 2️⃣ **Data Scientist** (Foco em Ambiente + Recursos)
```json
{
  "statusLine": {
    "type": "command",
    "command": "input=$(cat); dir=$(echo \"$input\" | jq -r '.workspace.current_dir' | sed 's|.*[/\\\\]||'); model=$(echo \"$input\" | jq -r '.model.display_name'); python_ver=$(python --version 2>&1 | grep -o '[0-9]\\.[0-9]*' || echo 'N/A'); conda_env=$(echo $CONDA_DEFAULT_ENV || echo 'base'); notebooks=$(find . -name '*.ipynb' 2>/dev/null | wc -l || echo '0'); datasets=$(find . -name '*.csv' -o -name '*.parquet' 2>/dev/null | wc -l || echo '0'); printf \"\\033[36m📊 %s\\033[0m \\033[33m[%s]\\033[0m \\033[32m🐍 py%s\\033[0m \\033[34m🔬 %s\\033[0m \\033[35m📓 %s\\033[0m \\033[31m💾 %s\\033[0m\" \"$dir\" \"$model\" \"$python_ver\" \"$conda_env\" \"$notebooks\" \"$datasets\""
  }
}
```
**Mostra**: 📊 ml_project [Opus] 🐍 py3.11 🔬 base 📓 12 💾 45

### 3️⃣ **DevOps Engineer** (Foco em Containers + Services)
```json
{
  "statusLine": {
    "type": "command",
    "command": "input=$(cat); dir=$(echo \"$input\" | jq -r '.workspace.current_dir' | sed 's|.*[/\\\\]||'); model=$(echo \"$input\" | jq -r '.model.display_name'); docker_running=$(docker ps -q 2>/dev/null | wc -l || echo '0'); docker_images=$(docker images -q 2>/dev/null | wc -l || echo '0'); k8s_context=$(kubectl config current-context 2>/dev/null || echo 'none'); services=$(netstat -an | grep LISTENING | wc -l || echo '0'); printf \"\\033[36m🔧 %s\\033[0m \\033[33m[%s]\\033[0m \\033[34m🐳 %s/%s\\033[0m \\033[32m☸️  %s\\033[0m \\033[35m🌐 %s\\033[0m\" \"$dir\" \"$model\" \"$docker_running\" \"$docker_images\" \"$k8s_context\" \"$services\""
  }
}
```
**Mostra**: 🔧 infra [Opus] 🐳 3/12 ☸️ prod-cluster 🌐 8

### 4️⃣ **Full-Stack com Testes** (Foco em Coverage + Build)
```json
{
  "statusLine": {
    "type": "command",
    "command": "input=$(cat); dir=$(echo \"$input\" | jq -r '.workspace.current_dir' | sed 's|.*[/\\\\]||'); model=$(echo \"$input\" | jq -r '.model.display_name'); branch=$(cd \"$(echo \"$input\" | jq -r '.workspace.project_dir')\" 2>/dev/null && git branch --show-current 2>/dev/null); npm_test=$(if [ -f package.json ]; then echo '✅'; else echo '❌'; fi); build_status=$(if [ -d dist ] || [ -d build ]; then echo '🏗️'; else echo '📦'; fi); node_ver=$(node -v 2>/dev/null | grep -o '[0-9]*' | head -1 || echo 'N/A'); coverage=$(if [ -f coverage/coverage-summary.json ]; then grep -o '\"pct\":[0-9]*' coverage/coverage-summary.json | head -1 | cut -d: -f2 || echo '0'; else echo '0'; fi); printf \"\\033[36m💻 %s\\033[0m \\033[33m[%s]\\033[0m \\033[32m⚡ node%s\\033[0m %s %s \\033[35m☂️ %s%%\\033[0m \\033[31mgit:%s\\033[0m\" \"$dir\" \"$model\" \"$node_ver\" \"$npm_test\" \"$build_status\" \"$coverage\" \"$branch\""
  }
}
```
**Mostra**: 💻 frontend [Opus] ⚡ node20 ✅ 🏗️ ☂️ 87% git:feature-123

### 5️⃣ **Security Focused** (Foco em Vulnerabilidades + Compliance)
```json
{
  "statusLine": {
    "type": "command",
    "command": "input=$(cat); dir=$(echo \"$input\" | jq -r '.workspace.current_dir' | sed 's|.*[/\\\\]||'); model=$(echo \"$input\" | jq -r '.model.display_name'); vulns=$(npm audit 2>/dev/null | grep -o '[0-9]* vulnerabilities' | cut -d' ' -f1 || echo '0'); secrets=$(git secrets --scan 2>/dev/null | wc -l || echo '0'); ssl_days=$(echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%j | awk -v today=$(date +%j) '{print $1-today}' || echo 'N/A'); firewall=$(netsh advfirewall show currentprofile | grep -o 'State.*ON' | wc -l || echo '0'); printf \"\\033[36m🔒 %s\\033[0m \\033[33m[%s]\\033[0m \\033[31m⚠️  %s\\033[0m \\033[35m🔑 %s\\033[0m \\033[32m📜 %sd\\033[0m \\033[34m🛡️ %s\\033[0m\" \"$dir\" \"$model\" \"$vulns\" \"$secrets\" \"$ssl_days\" \"$firewall\""
  }
}
```
**Mostra**: 🔒 secure-app [Opus] ⚠️ 3 🔑 0 📜 45d 🛡️ 1

---

## 🎯 INDICADORES VISUAIS DINÂMICOS

### 📈 **Status com Cores Condicionais**
```bash
# Muda cor baseado em condições
changes=$(git status --porcelain | wc -l)
if [ $changes -gt 10 ]; then 
  color="\\033[31m"  # Vermelho se > 10 mudanças
elif [ $changes -gt 5 ]; then 
  color="\\033[33m"  # Amarelo se > 5
else 
  color="\\033[32m"  # Verde se <= 5
fi
printf "${color}✏️ %s\\033[0m" "$changes"
```

### 🔔 **Alertas Visuais**
```bash
# Adiciona ícones baseados em estado
if [ -f .env ]; then env_icon="🔐"; else env_icon="⚠️"; fi
if [ -f docker-compose.yml ]; then docker_icon="🐳"; else docker_icon=""; fi
if [ -d node_modules ]; then npm_icon="📦"; else npm_icon="⬇️"; fi
```

### 📊 **Barras de Progresso ASCII**
```bash
# CPU usage bar
cpu=$(wmic cpu get loadpercentage /value | grep -o '[0-9]*' | head -1)
bar_length=$((cpu/10))
bar=$(printf '█%.0s' $(seq 1 $bar_length))
empty=$(printf '░%.0s' $(seq 1 $((10-bar_length))))
printf "CPU[%s%s]" "$bar" "$empty"
```

---

## 🔥 CONFIGURAÇÕES AVANÇADAS

### 🎨 **Multi-linha com Context**
```json
{
  "statusLine": {
    "type": "command",
    "command": "input=$(cat); dir=$(echo \"$input\" | jq -r '.workspace.current_dir' | sed 's|.*[/\\\\]||'); model=$(echo \"$input\" | jq -r '.model.display_name'); printf \"\\n╭─ \\033[36m%s\\033[0m @ \\033[33m%s\\033[0m\\n╰─➤ \" \"$dir\" \"$model\""
  }
}
```
**Mostra**:
```
╭─ vcia_dhl @ Opus
╰─➤
```

### 🌈 **Rainbow Progressive**
```bash
# Cores diferentes para cada seção
printf "\\033[31m●\\033[33m●\\033[32m●\\033[36m●\\033[34m●\\033[35m●\\033[0m %s [%s]" "$dir" "$model"
```

### 📱 **Responsive (ajusta por largura)**
```bash
cols=$(tput cols 2>/dev/null || echo 80)
if [ $cols -gt 120 ]; then
  # Formato completo
  format="FULL: %s | %s | %s | %s"
elif [ $cols -gt 80 ]; then
  # Formato médio
  format="MED: %s | %s | %s"
else
  # Formato compacto
  format="%s|%s"
fi
```

---

## 💡 DICAS DE IMPLEMENTAÇÃO

### ✅ **Como Testar**
```bash
# Teste local no PowerShell antes de aplicar:
$input = '{"workspace":{"current_dir":"F:\\vcia-1307\\vcia_dhl"},"model":{"display_name":"Opus"}}'
echo $input | seu_comando_aqui
```

### 🔧 **Debug de Problemas**
```bash
# Adicione 2>/dev/null para suprimir erros
comando_que_pode_falhar 2>/dev/null || echo 'fallback'

# Log para debug
echo "DEBUG: $variavel" >> C:\\temp\\statusline.log
```

### 🚀 **Performance**
```bash
# Cache valores pesados
if [ ! -f /tmp/cache_value ] || [ $(find /tmp/cache_value -mmin +5) ]; then
  heavy_command > /tmp/cache_value
fi
value=$(cat /tmp/cache_value)
```

---

## 📝 TEMPLATE PARA CRIAR O SEU

```json
{
  "statusLine": {
    "type": "command", 
    "command": "input=$(cat); \
      # Extraia variáveis
      dir=$(echo \"$input\" | jq -r '.workspace.current_dir' | sed 's|.*[/\\\\]||'); \
      model=$(echo \"$input\" | jq -r '.model.display_name'); \
      # Adicione suas métricas
      metric1=$(seu_comando); \
      metric2=$(outro_comando); \
      # Formate output
      printf \"FORMATO %s %s %s %s\" \"$dir\" \"$model\" \"$metric1\" \"$metric2\""
  }
}
```

---

## 🎯 EXEMPLOS ESPECÍFICOS PARA SEU PROJETO (vcia_dhl)

### **Knowledge Consolidator Status**
```json
{
  "statusLine": {
    "type": "command",
    "command": "input=$(cat); dir='KC'; model=$(echo \"$input\" | jq -r '.model.display_name'); files=$(find . -name '*.md' 2>/dev/null | wc -l); qdrant=$(curl -s http://qdr.vcia.com.br:6333/health | grep -o 'ok' || echo '❌'); chunks=$(grep -r 'chunk' . 2>/dev/null | wc -l); printf \"\\033[36m🧠 %s\\033[0m \\033[33m[%s]\\033[0m \\033[32m📄 %s\\033[0m \\033[34mQdrant:%s\\033[0m \\033[35m🔗 %s\\033[0m\" \"$dir\" \"$model\" \"$files\" \"$qdrant\" \"$chunks\""
  }
}
```
**Mostra**: 🧠 KC [Opus] 📄 156 Qdrant:ok 🔗 1847

---

**ESCOLHA** uma configuração acima ou **COMBINE** elementos para criar sua própria!