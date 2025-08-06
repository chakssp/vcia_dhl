# 🚀 Guia de Início Rápido - Knowledge Consolidator

## Bem-vindo ao Consolidador de Conhecimento Pessoal

O Knowledge Consolidator é um sistema inteligente que transforma conhecimento disperso em insights acionáveis através de uma pipeline de descoberta automatizada, análise com IA e organização semântica.

## 📋 Pré-requisitos

### Navegador Compatível
- **Chrome/Edge**: Versão 86+ (recomendado)
- **Firefox**: Versão 72+
- **Safari**: Versão 14+

### APIs Locais (Opcionais mas Recomendadas)
- **Ollama**: Para análise IA local e embeddings
  - Download: https://ollama.ai
  - Modelos recomendados: `llama2`, `nomic-embed-text`
- **Qdrant**: Para busca semântica avançada
  - Configuração automática ou VPS própria

### Estrutura de Arquivos Suportada
- **Obsidian Vault**: Detecção automática
- **Pastas locais**: Markdown, texto, documentos
- **Formatos**: `.md`, `.txt`, `.docx`, `.pdf`

## 🎯 Primeiros Passos

### 1. Acesso ao Sistema
```
URL Local: http://127.0.0.1:5500
Diagnóstico: kcdiag() no console do navegador
```

### 2. Verificação de Saúde do Sistema
No console do navegador (F12), execute:
```javascript
kcdiag()
```

✅ **Status Esperado:**
- ✅ EventBus funcionando
- ✅ AppState carregado
- ✅ Componentes registrados
- ✅ APIs disponíveis (Ollama, Qdrant)

### 3. Configuração Inicial Rápida

#### Etapa 1: Configurar APIs (Opcional)
1. Clique em **🔧 Configurar APIs** no cabeçalho
2. Configure Ollama se disponível localmente
3. Adicione API keys para OpenAI/Gemini/Claude (opcional)

#### Etapa 2: Primeira Descoberta
1. Navegue até **Etapa 1: Descoberta**
2. Clique em **📁 Selecionar Pasta**
3. Escolha sua pasta de conhecimento
4. Aguarde a análise automática

## 🔧 Configuração de APIs de IA

### Ollama (Recomendado - Local)
```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixar modelos
ollama pull llama2
ollama pull nomic-embed-text

# Verificar funcionamento
curl http://localhost:11434/api/tags
```

### APIs em Nuvem (Opcional)
- **OpenAI**: API Key obrigatória
- **Google Gemini**: API Key obrigatória  
- **Anthropic Claude**: API Key obrigatória

## 📊 Workflow de 4 Etapas

### Etapa 1: 🔍 Descoberta Automatizada
- Seleção de pasta/diretório
- Análise de relevância em tempo real
- Filtros avançados por data, tamanho, tipo
- Detecção de Obsidian Vault

### Etapa 2: 📝 Pré-Análise Local
- Preview inteligente (economia de 70% tokens)
- Scoring de relevância por palavras-chave
- Categorização inicial
- Filtros de qualidade

### Etapa 3: 🤖 Análise com IA
- Processamento por lotes
- Detecção de tipos de insights:
  - Breakthrough Técnico
  - Momento Decisivo
  - Evolução Conceitual
  - Insight Estratégico
- Templates personalizáveis

### Etapa 4: 📚 Organização Inteligente
- Sistema de categorias inteligente
- Exportação multi-formato
- Integração com Qdrant
- Pipeline RAG para automação

## 🚀 Uso Básico em 5 Minutos

1. **Abra o navegador**: http://127.0.0.1:5500
2. **Execute diagnóstico**: `kcdiag()` no console
3. **Selecione pasta**: Etapa 1 → Descoberta
4. **Configure filtros**: Ajuste relevância mínima
5. **Inicie análise**: Etapa 3 → Processar com IA

## 🔧 Solução de Problemas Comuns

### Problema: Arquivos não aparecem
**Solução:**
```javascript
// Verificar handles de arquivo
KC.HandleManager.list()

// Verificar AppState
KC.AppState.get('files')
```

### Problema: API não responde
**Solução:**
```javascript
// Verificar Ollama
KC.AIAPIManager.checkOllamaAvailability()

// Verificar Qdrant
KC.QdrantService.checkConnection()
```

### Problema: Navegação não funciona
**Solução:**
```javascript
// Recarregar componentes
location.reload()

// Verificar eventos
KC.EventBus.listEvents()
```

## 📚 Próximos Passos

1. **Leia**: `02-workflow-tutorial.md` para tutorial completo
2. **Configure**: `03-api-configuration.md` para APIs avançadas
3. **Explore**: `04-advanced-features.md` para recursos avançados
4. **Suporte**: `05-troubleshooting.md` para problemas

## 💡 Dicas de Produtividade

- **Use Ollama local** para análise rápida e privada
- **Configure categorias** antes da análise IA
- **Ajuste filtros** para reduzir ruído
- **Exporte regularmente** para backup
- **Monitore performance** com métricas integradas

---

**Próximo**: [Tutorial Completo do Workflow →](02-workflow-tutorial.md)