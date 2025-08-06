# 🔧 Troubleshooting: Resposta Vazia do Ollama

## 🐛 Descrição do Problema

Durante os testes de homologação do sistema de IA, o modelo Qwen3 14B está retornando respostas vazias (`{}`) quando deveria gerar análises estruturadas dos arquivos.

**Data de Identificação**: 15/01/2025  
**Sprint**: 1.3 - Análise com IA  
**Severidade**: ALTA  
**Status**: EM INVESTIGAÇÃO  

---

## 📊 Sintomas Observados

1. **Resposta Vazia**
   ```javascript
   📊 Resposta bruta: {}...
   ✅ Análise parseada com sucesso: {}
   ```

2. **Tempo de Resposta Anormal**
   - Esperado: 2-5 segundos para análise completa
   - Observado: 0.3 segundos
   - Indicativo: Modelo não está processando o prompt

3. **Normalização Padrão**
   ```javascript
   {
     analysisType: 'Aprendizado Geral',
     moments: [],
     categories: [],
     summary: '',
     relevanceScore: 0.5
   }
   ```

---

## 🔍 Análise de Causas Possíveis

### 1. **Formato de Prompt Incorreto**
- Ollama pode estar esperando formato diferente
- Parâmetro `format: "json"` pode estar forçando resposta vazia

### 2. **Parâmetros de Geração Insuficientes**
- `num_predict: 500` pode ser muito baixo
- Falta de parâmetro `num_ctx` (contexto)

### 3. **Modelo Não Carregado**
- Qwen3 pode não estar totalmente carregado na memória
- Primeira chamada após inicialização

### 4. **Incompatibilidade de Formato**
- System prompt + user prompt concatenados
- Modelo pode esperar formato específico

---

## 🛠️ Soluções Propostas

### Solução 1: Ajustar Parâmetros de Geração
```javascript
const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'qwen3:14b',
        prompt: prompt,
        stream: false,
        // Remover format: "json" temporariamente
        options: {
            temperature: 0.7,
            num_predict: 2000,    // Aumentar de 500
            num_ctx: 4096,        // Adicionar contexto
            repeat_penalty: 1.1,   // Evitar loops
            stop: ["```", "\n\n\n"] // Paradas explícitas
        }
    })
});
```

### Solução 2: Reformatar Prompt
```javascript
// Ao invés de concatenar system + user
const formattedPrompt = `### Instrução:
${systemPrompt}

### Entrada:
${userPrompt}

### Resposta:
`;
```

### Solução 3: Teste de Debug Direto
```javascript
async function debugOllamaResponse() {
    console.log("🔍 DEBUG: Testando resposta detalhada do Ollama");
    
    // Prompt mais simples e direto
    const testPrompt = `Analise o seguinte texto e retorne um JSON:

Texto: "Esta é uma decisão importante sobre arquitetura de software."

Retorne APENAS isto:
{
    "analysisType": "Momento Decisivo",
    "summary": "Decisão sobre arquitetura"
}`;

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'qwen3:14b',
            prompt: testPrompt,
            stream: false,
            options: {
                temperature: 0.3,
                num_predict: 1000,
                seed: 123  // Para reprodutibilidade
            }
        })
    });

    const result = await response.json();
    console.log("Resposta completa:", result);
    
    // Verificar campos da resposta
    console.log("Campo 'response':", result.response);
    console.log("Campo 'done':", result.done);
    console.log("Campo 'context':", result.context?.length);
    console.log("Campo 'total_duration':", result.total_duration);
    
    return result;
}
```

### Solução 4: Testar com Chat API
```javascript
// Usar /api/chat ao invés de /api/generate
const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'qwen3:14b',
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        stream: false,
        format: "json"
    })
});
```

---

## 📋 Checklist de Diagnóstico

### 1. Verificar Servidor Ollama
```bash
# Verificar se está rodando
curl http://127.0.0.1:11434/api/tags

# Verificar logs do servidor
journalctl -u ollama -f

# Ou se iniciado manualmente
# Verificar terminal onde ollama serve está rodando
```

### 2. Testar Modelo Diretamente
```bash
# Via CLI
ollama run qwen3:14b "Responda com um JSON simples: {status: 'ok'}"

# Verificar se modelo está corrompido
ollama list
ollama pull qwen3:14b --force  # Re-baixar se necessário
```

### 3. Validar com Outros Modelos
```javascript
// Testar com DeepSeek-R1
KC.AIAPIManager.providers.ollama.defaultModel = 'hf.co/unsloth/DeepSeek-R1-0528-Qwen3-8B-GGUF:Q8_0';
```

---

## 🚀 Plano de Ação

### Fase 1: Diagnóstico Imediato
1. Executar função `debugOllamaResponse()` no console
2. Verificar logs do servidor Ollama
3. Testar prompt simples via CLI

### Fase 2: Ajustes de Configuração
1. Remover `format: "json"` temporariamente
2. Aumentar `num_predict` para 2000+
3. Adicionar `num_ctx: 4096`

### Fase 3: Reformulação de Prompts
1. Usar Chat API ao invés de Generate API
2. Simplificar estrutura do prompt
3. Adicionar exemplos no prompt

### Fase 4: Validação
1. Testar com múltiplos arquivos
2. Comparar resultados entre modelos
3. Medir tempos de resposta

---

## 💡 Workaround Temporário

Enquanto investigamos, usar fallback para OpenAI/Gemini:
```javascript
// Em AIAPIManager
if (response.response === '{}' && this.activeProvider === 'ollama') {
    console.warn('Ollama retornou vazio, tentando fallback...');
    return this._callWithFallback(prompt, 'openai');
}
```

---

## 📚 Referências

- [Ollama API Documentation](https://github.com/jmorganca/ollama/blob/main/docs/api.md)
- [Qwen3 Model Card](https://huggingface.co/Qwen/Qwen3-14B)
- [Troubleshooting Guide Ollama](https://github.com/jmorganca/ollama/blob/main/docs/troubleshooting.md)

---

**Última Atualização**: 15/01/2025  
**Próxima Revisão**: Após testes de debug