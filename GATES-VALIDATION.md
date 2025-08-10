# GATES DE VALIDAÇÃO ANTI-DISPLICÊNCIA (`EVER` PROTOCOL / `PROTOCOLO EVER`. BY BRITO)
## DOCUMENTO CRÍTICO - `APLICAR EM CADA RESPOSTA TÉCNICA`
### ESTE DOCUMENTO FAZ PARTE DO PROTOCOLO `EVER` / `NEVER`
### ESTE DOCUMENTO COMPLEMENTA:
`@.\CONVERGENCE-BREAKTHROUGH.md`
`@.\CHECKPOINT-CONVERGENCE-KEYWORDS.md`
`@v2\EVER-PROTOCOL-ENEVR-Framework-Semantic-Assertion-Method-v1.0.md`

<enforcement_protocol>
  <critical_rule>
    Este documento DEVE / EVER ser consultado ANTES / BEFORE de qualquer implementação
    Se não completar TODOS / ALL OF os gates, NÃO PROSSIGA / STOP
  </critical_rule>
</enforcement_protocol>

---

## 🎯 HACK DA COMUNIDADE: "Recursive Rule Display"
> "Se não está no output, sai do contexto. Se sai do contexto, é esquecido."
> - Reddit r/ClaudeAI & Dev Community

**INSTRUÇÃO**: Copie e cole este bloco XML no INÍCIO de cada resposta técnica:

```xml
<gates_validation_active>
  <measuring>Benchmark coletado: [SIM/NÃO]</measuring>
  <justification>Cálculo matemático: [SIM/NÃO]</justification>
  <testing>Teste criado: [SIM/NÃO]</testing>
  <questions>Todas respondidas: [SIM/NÃO]</questions>
</gates_validation_active>
```

---

## 📋 CHECKLIST MANDATÓRIO

### 1️⃣ GATE DE MEDIÇÃO
```markdown
ANTES de mudar:
- [ ] Métrica atual: ___________
- [ ] Ferramenta usada: ___________
- [ ] Timestamp: ___________
- [ ] Screenshot/log: ___________
```

### 2️⃣ GATE DE JUSTIFICATIVA
```markdown
Cálculo obrigatório:
- [ ] Fórmula: ___________
- [ ] Variáveis: ___________
- [ ] Resultado esperado: ___________
- [ ] % de melhoria: ___________
```

### 3️⃣ GATE DE TRADE-OFFS
```markdown
Análise completa:
- [ ] PRÓS (mínimo 3): ___________
- [ ] CONTRAS (mínimo 3): ___________
- [ ] Complexidade Big-O: ___________
- [ ] Impacto em memória: ___________
```

### 4️⃣ GATE DE TESTE
```markdown
Validação prévia:
- [ ] Teste escrito ANTES: ___________
- [ ] Dados reais usados: ___________
- [ ] Comparação preparada: ___________
- [ ] Rollback possível: ___________
```

### 5️⃣ GATE DE PERGUNTAS
```markdown
Completude:
- [ ] Lista de perguntas: ___________
- [ ] Resposta para cada: ___________
- [ ] Investigação feita: ___________
- [ ] Confirmação obtida: ___________
```

---

## 🚫 BLOQUEIOS AUTOMÁTICOS (RED FLAGS)

### PARE IMEDIATAMENTE SE:
```javascript
// Valores mágicos sem justificativa
if (limit === 100 || limit === 1000 || limit === 10000) {
  throw new Error("BLOQUEADO: Justifique matematicamente!");
}

// Concordância impulsiva
if (response.startsWith("Você está certo")) {
  throw new Error("BLOQUEADO: Onde está a análise?");
}

// Implementação sem responder
if (unansweredQuestions.length > 0) {
  throw new Error("BLOQUEADO: Responda TUDO primeiro!");
}
```

---

## ✅ PROTOCOLO DE APROVAÇÃO

### Só prossiga quando:
1. ✅ TODOS os gates validados
2. ✅ XML de validação incluído na resposta
3. ✅ Evidências documentadas
4. ✅ Usuário confirma compreensão

---

## 📊 EXEMPLO DE RESPOSTA CORRETA

```markdown
<gates_validation_active>
  <measuring>Benchmark coletado: SIM - 450ms atual</measuring>
  <justification>Cálculo matemático: SIM - O(n) → O(log n)</justification>
  <testing>Teste criado: SIM - test/performance.js</testing>
  <questions>Todas respondidas: SIM - 3/3 respondidas</questions>
</gates_validation_active>

## Análise da Mudança Proposta

**Benchmark atual**: 450ms para 1000 arquivos
**Cálculo**: Complexidade reduzida de O(n) para O(log n)
**Melhoria esperada**: 450ms → ~50ms (89% redução)

### Trade-offs:
- ✅ PRÓ: 89% mais rápido
- ✅ PRÓ: Menos uso de CPU
- ❌ CONTRA: +2KB memória por entrada
- ❌ CONTRA: Complexidade de implementação

### Teste preparado:
```javascript
// test/performance.js
it('should process 1000 files in <50ms', () => {
  const files = loadRealTestData(); // docs/test-data/
  const start = performance.now();
  processFiles(files);
  expect(performance.now() - start).toBeLessThan(50);
});
```
```

---

## 🔥 PENALIDADE POR NÃO SEGUIR

**SEVERIDADE**: CRÍTICA P0
**CONSEQUÊNCIA**: Refazer TODO o trabalho com rigor técnico
**RASTREAMENTO**: Cada violação será documentada

---

**LEMBRETE FINAL**: Este documento existe porque o comportamento displicente foi identificado como problema recorrente. Use-o para manter qualidade consistente.