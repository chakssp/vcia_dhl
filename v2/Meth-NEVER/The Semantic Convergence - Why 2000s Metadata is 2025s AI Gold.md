_How SBOM, Schema.org, and controlled vocabularies from the past are the missing key to AI's intention problem_

---

Everyone's talking about AI agents, automation, and the "death of RPA." But they're missing the elephant in the room.

The solution to AI's intention capture problem isn't in the future - it's in the metadata standards we built 20 years ago.

![[Captura de tela 2025-08-02 144421.png]]
## The Hidden Connection

Let me connect some dots that seem unrelated:

### 2000: Opalis (→ Microsoft Orchestrator)

- **What we built**: Workflow automation with structured data
- **What we learned**: Metadata matters more than logic

### 2011: Schema.org Launches

- **What we built**: Universal vocabulary for the web
- **What we learned**: Shared semantics enable understanding

### 2018: SBOM Becomes Critical

- **What we built**: Software transparency through structured manifests
- **What we learned**: Controlled vocabularies prevent chaos

### 2025: AI Can't Capture Intent

- **What we're missing**: All of the above
- **What we need**: Semantic structure, not more parameters

## The Convergence Point

Here's what nobody's talking about:

```python
# What everyone's doing (2025)
agent = Agent("Do complex task with vague instructions")
# Result: 60% success, high hallucination

# What we should be doing
agent = Agent(
    intent=SchemaDefinedAction,
    vocabulary=ControlledTerms,
    constraints=SBOMStyleManifest,
    validation=BinaryRules  # NEVER/EVER
)
# Result: 95% success, predictable behavior
```

## The Uncomfortable Truth

**Automation didn't die.** It evolved.

- 2000: Opalis orchestrated systems
- 2010: Schema.org orchestrated meaning
- 2020: SBOM orchestrated dependencies
- 2025: We need to orchestrate intention

## Why This Matters Now

The most valuable asset isn't:

- ❌ More training data
- ❌ Bigger models
- ❌ Faster inference

It's:

- ✅ **Structured Semantic Layers**

Think about it:

1. **SBOM** gives us dependency graphs → AI needs relationship graphs
2. **Schema.org** gives us shared vocabulary → AI needs controlled terms
3. **Old orchestrators** gave us deterministic flows → AI needs guardrails

## The Practical Path Forward

### Step 1: Vocabulary First

Before building agents, define your domain vocabulary:

```yaml
domain_terms:
  actions: [create, update, delete, validate]
  entities: [user, document, process, system]
  constraints: [security, compliance, performance]
```

### Step 2: Intent Schemas

Structure intentions like SBOM structures dependencies:

```json
{
  "intent": "DataProcessing",
  "requires": ["validation", "authorization"],
  "produces": ["audit_log", "processed_data"],
  "never": ["expose_raw_data", "skip_validation"],
  "ever": ["maintain_audit_trail", "validate_input"]
}
```

### Step 3: Semantic Validation

Use 20-year-old patterns for modern problems:

- XML schemas → LLM output validation
- SOAP contracts → Agent interaction protocols
- REST principles → Stateless agent design

## The Next Asset

Everyone's betting on:

- Vertical agents
- Specialized models
- Custom training

But the real gold is:

- **Semantic Infrastructure**
- **Controlled Vocabularies**
- **Intent Schemas**
- **Validation Frameworks**

## Call to Action

Stop trying to make AI "understand" through brute force. Start giving it the semantic structure it needs.

The tools exist. They're just wearing 20-year-old clothes.

Who else sees this convergence?

---

_About the author: 15 years bridging security, automation, and now semantic AI. Currently building the vocabulary layer that connects past wisdom to future capability._

#SemanticAI #SBOM #SchemaOrg #IntentionCapture #AIInfrastructure #FutureOfAI