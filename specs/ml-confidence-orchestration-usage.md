# ML Confidence Orchestration - Usage Guide

## Quick Start

### Execute Wave 1 (Foundation Sprint)
```bash
# This will launch 3 parallel agents:
# - dev-coordinator-quad (AppState)
# - senior-architect-team-lead (ConfidenceTracker)  
# - ml-confidence-specialist (ConfidenceCalculator)

/project:infinite specs/ml-confidence-orchestration.md agents_output/sprint1 3
```

## Detailed Usage Examples

### Example 1: Running Sprint 1 Foundation
```bash
# The command will interpret "3" as 3 parallel specialized agents, not iterations
/project:infinite specs/ml-confidence-orchestration.md agents_output/sprint1 3
```

Expected output structure:
```
agents_output/sprint1/
├── agent_001_dev-coordinator/
│   ├── AppState.js
│   ├── migrations/
│   │   └── v1-to-v2.js
│   ├── tests/
│   │   └── appstate.test.js
│   └── README.md
│
├── agent_002_senior-architect/
│   ├── ConfidenceTracker.js
│   ├── events/
│   │   └── confidence-events.js
│   ├── docs/
│   │   └── architecture.md
│   └── examples/
│
└── agent_003_ml-specialist/
    ├── ConfidenceCalculator.js
    ├── algorithms/
    │   ├── convergence.js
    │   └── dimensions.js
    ├── models/
    └── metrics.json
```

### Example 2: Sequential Waves with Dependencies
```bash
# First, run Wave 1
/project:infinite specs/ml-confidence-orchestration.md agents_output/wave1 3

# After Wave 1 completes, run Wave 2 (Review + UI)
/project:infinite specs/ml-confidence-orchestration.md agents_output/wave2 2

# Wave 2 agents will automatically receive Wave 1 outputs as context
```

### Example 3: Full Sprint Execution (All Waves)
```bash
# Execute all waves in sequence with proper dependencies
/project:infinite specs/ml-confidence-orchestration.md agents_output/full-sprint infinite
```

The system will:
1. Execute Wave 1 (3 parallel agents)
2. Wait for completion and validation
3. Execute Wave 2 (2 agents, 1 sequential)
4. Continue through all defined waves
5. Stop when all sprints are complete

### Example 4: Targeted Agent Execution
```bash
# Run only the ML specialist to update algorithms
/project:infinite specs/ml-confidence-orchestration.md agents_output/ml-update 1

# The spec will be modified to run only:
# - ml-confidence-specialist with specific algorithm update task
```

## Prompt Adaptation for Sub-Agents

### How the Infinite Command Interprets Our Spec

When you run:
```bash
/project:infinite specs/ml-confidence-orchestration.md agents_output/sprint1 3
```

The infinite command will:

1. **Read the orchestration spec** instead of a content generation spec
2. **Identify agent profiles** as "iteration types"
3. **Create Sub-Agent tasks** with specialized prompts

### Sub-Agent Prompt Example
```
TASK: Execute as dev-coordinator-quad for Wave 1 Foundation Sprint

You are Sub Agent 1 implementing the AppState versioning system.

CONTEXT:
- Specification: ML Confidence Orchestration 
- Agent Role: dev-coordinator-quad
- Sprint: 1 - Foundation
- Parallel Peers: senior-architect (ConfidenceTracker), ml-specialist (ConfidenceCalculator)

YOUR SPECIFIC ASSIGNMENT:
Como dev-coordinator, implemente a extensão do AppState para suportar versionamento de análises conforme especificado em /docs/workflow/01-technical-details-by-phase.md#fase-1.

Tarefas:
1. Estender AppState.js para incluir sistema de versionamento
2. Implementar migração de dados existentes
3. Criar testes unitários para nova funcionalidade
4. Documentar mudanças no AppState

INTERFACE COMMITMENTS:
You must provide these interfaces for other agents:
- VersionedAnalysis interface for all services
- Migration utilities for existing data
- Event emissions for state changes

DELIVERABLES:
Create in agents_output/sprint1/agent_001_dev-coordinator/:
- Updated AppState.js with versioning
- Migration script (migrations/v1-to-v2.js)
- Test suite with 90%+ coverage
- Updated documentation

COORDINATION:
- Your VersionedAnalysis interface will be consumed by ConfidenceTracker
- Ensure backward compatibility for existing code
- Emit 'appstate:version:updated' events
```

## Advanced Usage Patterns

### Pattern 1: Conditional Wave Execution
```javascript
// In your spec, define conditional waves
conditionalWaves: {
  "performance-critical": {
    condition: "latency > 100ms",
    agents: ["performance-optimization-coordinator"],
    priority: "immediate"
  }
}
```

### Pattern 2: Feedback-Driven Re-execution
```javascript
// After Wave 2, if code review fails:
reexecutionStrategy: {
  trigger: "review-score < 0.8",
  action: "rerun-wave-1-with-feedback",
  agents: ["dev-coordinator-quad", "senior-architect-team-lead"]
}
```

### Pattern 3: Progressive Enhancement
```bash
# Start with minimal viable team
/project:infinite specs/ml-confidence-orchestration.md agents_output/mvp 2

# Add specialist when needed
/project:infinite specs/ml-confidence-orchestration.md agents_output/enhance 1
```

## Monitoring and Validation

### Check Wave 1 Completion
```bash
# List all agent outputs
ls -la agents_output/sprint1/

# Verify interfaces are properly defined
grep -r "interface ConfidenceMetrics" agents_output/sprint1/

# Check test coverage
find agents_output/sprint1 -name "*.test.js" -exec npm test {} \;
```

### Integration Validation
```javascript
// Run this after each wave to verify integration points
validateIntegration({
  wave: 1,
  requiredInterfaces: [
    'ConfidenceMetrics',
    'VersionedAnalysis',
    'ConvergencePrediction'
  ],
  requiredEvents: [
    'confidence:calculated',
    'analysis:versioned',
    'tracker:updated'
  ]
});
```

## Troubleshooting

### Issue: Agents Not Coordinating
```bash
# Check coordination context
cat agents_output/sprint1/.coordination-context.json

# Verify shared interfaces
diff agent_001_dev-coordinator/interfaces.ts agent_002_senior-architect/interfaces.ts
```

### Issue: Dependencies Not Met
```bash
# Manually specify dependencies
/project:infinite specs/ml-confidence-orchestration.md agents_output/sprint1 3 \
  --context="wave1-outputs.json"
```

### Issue: Performance Bottlenecks
```bash
# Run performance-focused wave
/project:infinite specs/ml-confidence-orchestration.md agents_output/optimize 2

# This launches:
# - performance-optimization-coordinator
# - systems-architect (for architectural optimization)
```

## Best Practices

1. **Always run waves in sequence** for complex dependencies
2. **Monitor coordination contexts** between parallel agents
3. **Validate interfaces** after each wave
4. **Use conditional waves** for adaptive execution
5. **Keep agent outputs isolated** but interfaces shared

## Integration with Existing Workflow

### Before Starting Orchestration
```bash
# Ensure current state is stable
kcdiag()

# Backup current implementation
cp -r js/ js_backup_before_orchestration/

# Clear any pending work
git stash
```

### After Orchestration Completes
```bash
# Integrate agent outputs into main codebase
./scripts/integrate-agent-outputs.sh agents_output/sprint1

# Run full test suite
npm test

# Verify integration
kcdiag()
```

## Next Steps

1. **Sprint 1**: Execute foundation wave (this guide)
2. **Sprint 2**: Run UI and review waves
3. **Sprint 3**: Deploy orchestration layer
4. **Sprint 4**: Add Schema.org validation
5. **Sprint 5**: Final integration and deployment

Each sprint builds on previous outputs, creating a sophisticated ML-powered confidence system through coordinated multi-agent execution.