# Instruções para o Agente de Desenvolvimento - Five Server

## Contexto do Servidor de Desenvolvimento

**IMPORTANTE**: O servidor da aplicação está sendo gerenciado pela extensão **Five Server** (https://github.com/yandeu/five-server) e está sob **auditoria manual contínua** pelo usuário para monitorar a evolução do desenvolvimento e identificar possíveis desvios.

## Funcionalidades do Five Server em Uso

### Recursos Ativos

- **Live Reload**: Recarregamento automático quando arquivos são modificados
- **Remote Logs**: Exibição dos logs do navegador no terminal
- **Instant Updates**: Atualizações de páginas HTML durante edição
- **Auto Navigation**: Navegação automática para arquivos .html em edição


### Tecnologias Suportadas

- Arquivos **.html** (principal)
- Arquivos **.php** (se necessário)
- Conteúdo renderizado pelo servidor (Express.js)
- Cache para recursos CDN
- Suporte HTTPS com certificado auto-assinado


## Configuração Atual do Projeto

### Substituição do Servidor Python

- **Antes**: `python -m http.server 8080`
- **Agora**: Five Server com Live Reload ativo
- **Porta**: **5500** (porta padrão do Five Server)


### Configuração Recomendada

```javascript
// fiveserver.config.js
module.exports = {
  port: 5500,
  root: '.',
  open: 'index.html',
  host: '0.0.0.0',
  watch: ['js', 'css', 'assets'],
  ignore: [/\.json$/i, /node_modules/],
  remoteLogs: true,
  useLocalIp: false
}
```


## Instruções para o Agente de Desenvolvimento

### 1. Gerenciamento do Servidor

- **NÃO** inicialize servidores alternativos
- **NÃO** modifique as configurações do Five Server sem autorização
- **MANTENHA** compatibilidade com a porta **5500**
- **RESPEITE** os diretórios sendo monitorados (`js`, `css`, `assets`)


### 2. Desenvolvimento com Live Reload

- **UTILIZE** o Live Reload para testes em tempo real
- **MONITORE** os logs remotos para debug
- **MANTENHA** arquivos organizados nos diretórios monitorados
- **EVITE** modificações que quebrem o live reload


### 3. Auditoria e Monitoramento

- **CIENTE** que todas as modificações são auditadas em tempo real
- **DOCUMENTE** mudanças significativas no servidor
- **NOTIFIQUE** sobre necessidades de configuração adicional
- **MANTENHA** transparência sobre modificações em arquivos monitorados


### 4. Arquivos Ignorados

- **NÃO** monitore arquivos `.json`
- **NÃO** monitore `node_modules`
- **CONCENTRE** desenvolvimento em `js`, `css`, `assets`


### 5. Integração com VSCode

- **APROVEITE** recursos de highlighting automático
- **UTILIZE** auto-navigation para arquivos HTML
- **MONITORE** instant updates durante desenvolvimento


## Benefícios para o Projeto Knowledge Consolidator

### Desenvolvimento Ágil

- Eliminação de recarregamentos manuais
- Debug remoto para dispositivos móveis
- Atualizações instantâneas durante codificação
- Melhor experiência de desenvolvimento


### Monitoramento de Qualidade

- Logs em tempo real para identificação de problemas
- Auditoria contínua das modificações
- Capacidade de interrupção imediata em caso de desvios
- Transparência total do processo de desenvolvimento


## Limitações e Restrições

### Não Modificar

- Configurações de porta (**5500**)
- Diretórios monitorados
- Arquivos de configuração do Five Server


### Reportar Imediatamente

- Problemas com live reload
- Necessidade de monitorar novos diretórios
- Conflitos com outras extensões
- Erros de conectividade


## Acesso ao Servidor

**URL Local**: `http://127.0.0.1:5500`
**URL de Rede**: `http://[IP_LOCAL]:5500` (quando `useLocalIp: true`)

## Comando de Execução

```bash
# Execução global
five-server

# Ou com configuração específica
five-server --config fiveserver.config.js
```

**ATENÇÃO**: O usuário está executando e monitorando manualmente o servidor na porta **5500** para auditoria contínua. Qualquer desvio identificado resultará em paralização imediata do desenvolvimento.

