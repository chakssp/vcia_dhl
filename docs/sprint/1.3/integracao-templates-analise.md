# 📝 Integração dos Templates de Análise com IA

## 🎯 Objetivo no Contexto do Projeto

O sistema de templates de análise é parte fundamental da **SPRINT 1.3 - Análise com IA**, permitindo que o usuário:

1. **Customize como a IA analisa seus arquivos** de conhecimento pessoal
2. **Direcione a análise** para aspectos específicos (decisões, insights técnicos, projetos)
3. **Mantenha controle total** sobre os prompts enviados para as APIs de IA

## 🔄 Fluxo de Uso no Sistema

### 1. **Etapa 3 - Pré-Análise Local**
- Usuário filtra arquivos por relevância, data, tipo
- Sistema mostra preview inteligente economizando tokens
- Arquivos são marcados para análise

### 2. **Etapa 4 - Análise com IA**
- Usuário acessa **"🔧 Configurar APIs"**
- Seleciona template de análise apropriado
- Pode expandir detalhes para ver/editar prompts
- Templates disponíveis:
  - **Momentos Decisivos**: Identifica decisões críticas e pontos de inflexão
  - **Insights Técnicos**: Foco em soluções e arquiteturas
  - **Análise de Projetos**: Avalia potencial para novos projetos
  - **Mapeamento de Conhecimento**: Estrutura para base RAG
  - **Evolução Conceitual**: Rastreia evolução de ideias
  - **Personalizado**: Template totalmente customizável

### 3. **Processamento com IA**
- Sistema usa o template selecionado para gerar prompts
- Envia para API configurada (Ollama, OpenAI, Gemini, Anthropic)
- Recebe análise estruturada em JSON
- Atualiza arquivos com:
  - Tipo de análise detectado
  - Relevância recalculada
  - Categorias sugeridas
  - Insights extraídos

### 4. **Resultados e Exportação**
- Arquivos analisados mostram badges com tipo detectado
- Relevância é ajustada baseada na análise
- Dados prontos para exportação para RAG (SPRINT 2.0)

## 🛠️ Capacidades de Customização

### Templates 100% Editáveis
Todos os templates podem ser modificados:
- **Nome e Descrição**: Para identificação
- **Objetivos**: Lista do que o template busca identificar
- **System Prompt**: Instrução base para a IA
- **User Template**: Template do prompt com variáveis
- **Temperature**: Controla criatividade (0-1)
- **Max Tokens**: Limite de resposta

### Variáveis Disponíveis
- `{{fileName}}`: Nome do arquivo sendo analisado
- `{{fileDate}}`: Data do arquivo
- `{{preview}}`: Preview inteligente do conteúdo
- `{{content}}`: Conteúdo completo (quando disponível)

## 🎨 Interface Expandível

### Modo Compacto
- Dropdown de seleção de template
- Preview dos objetivos
- Configurações básicas de análise

### Modo Expandido
- Modal expande para 90% da largura
- Layout em duas colunas:
  - **Esquerda**: Configurações do template
  - **Direita**: Prompts editáveis
- Edição em tempo real
- Salvamento com validação

## 🔗 Integração com Managers

### PromptManager
- Gerencia todos os templates
- Valida configurações
- Gera prompts finais
- Persiste customizações

### AnalysisManager
- Usa template selecionado
- Processa fila de arquivos
- Integra com AIAPIManager
- Atualiza resultados

### AIAPIManager
- Envia prompts para APIs
- Gerencia rate limiting
- Fallback entre providers
- Normaliza respostas

## 📊 Impacto no Projeto

### Economia de Tokens
- Preview inteligente reduz 70% dos tokens
- Templates focados evitam análises genéricas
- Batch processing otimiza chamadas

### Qualidade da Análise
- Prompts especializados geram melhores insights
- Customização permite ajuste fino
- Múltiplos templates para diferentes necessidades

### Preparação para RAG
- Análises estruturadas em JSON
- Categorização consistente
- Metadados ricos para indexação
- Base pronta para SPRINT 2.0

## 🚀 Próximos Passos

1. **Testar com dados reais** usando Ollama local
2. **Otimizar prompts** baseado em feedback
3. **Criar biblioteca** de templates compartilhados
4. **Implementar cache** de análises
5. **Preparar exportação** para formato Qdrant (SPRINT 2.0)

---

**Última atualização**: 15/01/2025  
**Sprint**: 1.3 - Análise com IA  
**Status**: ✅ Implementado e Funcional