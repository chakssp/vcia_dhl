# Wave 8 Frontend Orchestration - Usage Guide

## Quick Start

### Execute Complete Wave 8 (All Sub-Waves)
```bash
# This will launch all 4 sub-waves in sequence with proper dependencies
# Sub-Wave 8.1: 3 parallel agents (ui-ux-dev-lead, senior-ux-designer, frontend-engineers-team)
# Sub-Wave 8.2: 2 sequential agents (review + dashboard)
# Sub-Wave 8.3: 2 parallel agents (curation + filters)
# Sub-Wave 8.4: 2 sequential agents (testing + optimization)

/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8 3
```

## Detailed Execution Patterns

### Example 1: Foundation Sub-Wave Only
```bash
# Execute just the foundation components (Sub-Wave 8.1)
# Useful for establishing the design system and core components first

/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8/sub1 3
```

Expected output structure:
```
agents_output/wave8/sub1/
├── agent_001_ui-ux-dev-lead/
│   ├── ConfidenceBadge.js
│   ├── BadgeTemplate.js
│   ├── BadgeAnimator.js
│   ├── AccessibilityHelper.js
│   ├── tests/
│   │   └── confidence-badge.test.js
│   └── docs/
│       └── accessibility-guide.md
│
├── agent_002_senior-ux-designer/
│   ├── design-tokens.json
│   ├── ml-confidence-colors.css
│   ├── animation-specs.md
│   ├── figma-exports/
│   │   ├── confidence-badge-states.svg
│   │   └── ml-dashboard-wireframe.png
│   └── design-system.md
│
└── agent_003_frontend-engineers/
    ├── gpu-acceleration.js
    ├── performance-monitor.js
    ├── css-containment.css
    ├── build-config/
    │   └── webpack.ml-ui.config.js
    └── benchmarks/
        └── baseline-metrics.json
```

### Example 2: Progressive Sub-Wave Execution
```bash
# Step 1: Run foundation
/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8 sub-wave:8.1

# Step 2: After foundation is validated, run integration
/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8 sub-wave:8.2

# Step 3: Advanced UI components
/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8 sub-wave:8.3

# Step 4: Final testing and optimization
/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8 sub-wave:8.4
```

### Example 3: Recovery from Failed Sub-Wave
```bash
# If Sub-Wave 8.2 fails code review, re-run with feedback
/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8 recover:8.2 \
  --feedback="Performance issues in badge rendering, accessibility violations in dashboard"

# This will re-execute Sub-Wave 8.2 with the review feedback integrated
```

## Sub-Agent Prompt Templates

### Sub-Wave 8.1 - UI/UX Dev Lead Prompt
```
TASK: Execute as ui-ux-dev-lead for Sub-Wave 8.1 Foundation Components

You are Sub Agent 1 implementing the ConfidenceBadge component with full accessibility support.

AGENT PROFILE:
- Role: Component architecture and accessibility specialist
- Capabilities: React/Vue/Vanilla JS, ARIA standards, component patterns
- Current Sub-Wave: 8.1 - Foundation

CONTEXT:
- Project: ML Confidence UI Components
- Sprint: Wave 8 - Frontend Implementation
- Parallel Peers: senior-ux-designer (Design System), frontend-engineers (Performance)
- KC System: Existing EventBus, AppState, and component patterns available

YOUR SPECIFIC ASSIGNMENT:
Implement the ConfidenceBadge component as specified in the Wave 8 spec with these requirements:

1. Core Implementation:
   - Create ConfidenceBadge class with options for size, tooltip, animation, interaction
   - Implement BadgeTemplate with SVG ring visualization
   - Create BadgeAnimator with GPU-accelerated animations
   - Build AccessibilityHelper for ARIA attributes

2. Accessibility Requirements:
   - Role="meter" with proper ARIA attributes
   - Keyboard navigation support (Tab, Enter, Space)
   - Screen reader friendly labels
   - High contrast mode support
   - Reduced motion preferences

3. Performance Targets:
   - Render time < 1ms per badge
   - Smooth 60fps animations
   - GPU acceleration via transform/opacity
   - CSS containment for performance isolation

INTERFACE COMMITMENTS:
You must provide these interfaces for other agents:
- ConfidenceBadge constructor API
- render() method returning HTMLElement
- update() method for smooth transitions
- Event emissions: 'ml:badge:clicked', 'ml:badge:updated'

DELIVERABLES:
Create in agents_output/wave8/sub1/confidence-badge/:
- ConfidenceBadge.js (main component)
- BadgeTemplate.js (HTML/SVG template)
- BadgeAnimator.js (animation utilities)
- AccessibilityHelper.js (ARIA utilities)
- tests/confidence-badge.test.js (unit tests)
- docs/accessibility-guide.md

COORDINATION:
- Use design tokens from senior-ux-designer when available
- Integrate performance utilities from frontend-engineers
- Ensure compatibility with existing KC EventBus
- Follow established KC coding patterns
```

### Sub-Wave 8.2 - Code Review Coordinator Prompt
```
TASK: Execute as code-review-coordinator for Sub-Wave 8.2 Integration Review

You are reviewing all Wave 8.1 foundation components before integration proceeds.

REVIEW CONTEXT:
- Components to Review: ConfidenceBadge, Design System, Performance Infrastructure
- Standards: KC coding conventions, accessibility WCAG 2.1 AA, performance budgets
- Previous Wave Outputs: All code from Sub-Wave 8.1

REVIEW CHECKLIST:
1. Code Quality
   - ES6+ standards compliance
   - DRY principles
   - Proper error handling
   - Memory leak prevention

2. Accessibility Audit
   - ARIA implementation correctness
   - Keyboard navigation completeness
   - Screen reader testing results
   - Color contrast ratios

3. Performance Analysis
   - Render time measurements
   - Bundle size impact
   - Runtime performance profiling
   - GPU acceleration verification

4. Security Review
   - XSS vulnerability check
   - Event handler safety
   - Data sanitization

5. Integration Readiness
   - API compatibility with KC system
   - Event bus integration
   - State management alignment

DELIVERABLES:
- Comprehensive review report
- Issue severity classification (Critical/Major/Minor)
- Specific fix recommendations
- Performance baseline measurements
- Go/No-Go recommendation for Sub-Wave 8.2

QUALITY GATES:
Must pass before proceeding:
- Zero critical issues
- All accessibility standards met
- Performance within budgets
- Security vulnerabilities addressed
```

## Integration with KC System

### Before Starting Wave 8
```javascript
// Verify KC system is ready
kcdiag()

// Check ML confidence data availability
KC.AppState.get('files').filter(f => f.mlConfidence).length

// Verify EventBus is operational
KC.EventBus.emit('test:wave8:ready')

// Backup existing UI components
cp -r js/components js/components_backup_wave8
```

### During Wave 8 Execution
```javascript
// Monitor agent outputs
ls -la agents_output/wave8/sub1/

// Verify design tokens are created
cat agents_output/wave8/sub1/agent_002_senior-ux-designer/design-tokens.json

// Test component in isolation
node agents_output/wave8/sub1/agent_001_ui-ux-dev-lead/tests/confidence-badge.test.js
```

### After Each Sub-Wave
```javascript
// Validate interfaces
grep -r "interface ConfidenceBadge" agents_output/wave8/

// Check performance metrics
cat agents_output/wave8/sub1/agent_003_frontend-engineers/benchmarks/baseline-metrics.json

// Run integration tests
npm test -- --testPathPattern="wave8"
```

## Monitoring and Validation

### Sub-Wave 8.1 Validation
```bash
# Check all parallel agents completed
ls agents_output/wave8/sub1/ | wc -l  # Should be 3

# Verify design system is complete
test -f agents_output/wave8/sub1/agent_002_senior-ux-designer/design-tokens.json

# Confirm performance utilities exist
test -f agents_output/wave8/sub1/agent_003_frontend-engineers/gpu-acceleration.js

# Run accessibility audit
npm run audit:a11y agents_output/wave8/sub1/agent_001_ui-ux-dev-lead/ConfidenceBadge.js
```

### Sub-Wave 8.2 Validation
```bash
# Check review passed
grep "RECOMMENDATION: Proceed" agents_output/wave8/sub2/agent_001_code-review/review-report.md

# Verify dashboard integration
test -f agents_output/wave8/sub2/agent_002_ui-ux-dev-lead/MLDashboard.js

# Test real-time updates
node -e "require('./agents_output/wave8/sub2/agent_002_ui-ux-dev-lead/tests/dashboard-performance.test.js')"
```

### Performance Monitoring
```javascript
// After Sub-Wave 8.4, verify all metrics
const metrics = require('./agents_output/wave8/sub4/optimization/performance-report.json');

console.assert(metrics.badgeRenderTime < 1, 'Badge render time exceeds 1ms');
console.assert(metrics.dashboardUpdateTime < 16.67, 'Dashboard breaks 60fps');
console.assert(metrics.bundleSize < 51200, 'Bundle exceeds 50KB limit');
console.assert(metrics.mobileScore > 90, 'Mobile performance below target');
```

## Troubleshooting

### Issue: Agents Not Finding Shared Resources
```bash
# Ensure coordination context is set
cat agents_output/wave8/.coordination-context.json

# Manually create if missing
echo '{
  "design_tokens": "agents_output/wave8/sub1/design-system/tokens.json",
  "performance_utils": "agents_output/wave8/sub1/performance/utils.js"
}' > agents_output/wave8/.coordination-context.json
```

### Issue: Design System Not Applied
```bash
# Verify design tokens were generated
find agents_output/wave8 -name "*.css" -o -name "design-tokens.json"

# Check CSS variables are defined
grep -r "--ml-confidence" agents_output/wave8/
```

### Issue: Performance Regression
```bash
# Run performance profiler
/project:infinite specs/wave8-frontend-spec-v2.md agents_output/wave8 \
  emergency:performance-optimization-coordinator

# This launches emergency optimization with specific focus on regression
```

## Best Practices

1. **Always run sub-waves in sequence** - Dependencies are critical
2. **Validate after each sub-wave** - Don't proceed with failures
3. **Monitor coordination context** - Shared resources must be accessible
4. **Use recovery mode for failures** - Don't restart from scratch
5. **Test incrementally** - Validate each component before integration

## A/B Test Configuration

After Wave 8 completion, configure A/B tests:

```javascript
// agents_output/wave8/sub4/testing/ab-test-config.js
const wave8ABTests = {
  confidenceBadges: {
    id: 'ml-confidence-badges-wave8',
    variants: {
      control: { 
        enabled: false 
      },
      treatment: { 
        enabled: true,
        config: require('../sub1/confidence-badge/config.json')
      }
    },
    allocation: 0.5,
    metrics: [
      'file_interaction_rate',
      'confidence_understanding',
      'curation_completion_rate'
    ],
    duration: '2 weeks'
  },
  
  mlDashboard: {
    id: 'ml-dashboard-wave8',
    variants: {
      control: { position: null },
      treatment: { position: 'header' }
    },
    allocation: 0.5,
    metrics: [
      'dashboard_engagement',
      'ml_feature_discovery',
      'settings_usage'
    ]
  }
};

// Register with KC's experimentation framework
KC.Experiments.register(wave8ABTests);
```

## Integration Checklist

### Pre-Integration
- [ ] All sub-waves completed successfully
- [ ] Quality gates passed
- [ ] Performance budgets met
- [ ] Tests achieving 90%+ coverage

### Integration Steps
```bash
# 1. Copy components to main codebase
cp -r agents_output/wave8/sub1/confidence-badge/*.js js/components/ml/
cp -r agents_output/wave8/sub2/dashboard/*.js js/components/ml/
cp -r agents_output/wave8/sub3/curation-design/CurationPanel.js js/components/ml/
cp -r agents_output/wave8/sub3/filters/FilterPanelML.js js/extensions/

# 2. Copy styles
cp agents_output/wave8/sub1/design-system/*.css css/components/

# 3. Update component registry
echo "KC.ML = { 
  ConfidenceBadge: require('./components/ml/ConfidenceBadge'),
  MLDashboard: require('./components/ml/MLDashboard'),
  CurationPanel: require('./components/ml/CurationPanel')
};" >> js/app.js

# 4. Run integration tests
npm test

# 5. Build and verify
npm run build
npm run verify:wave8
```

### Post-Integration
- [ ] No console errors in browser
- [ ] All ML UI components rendering
- [ ] Events properly connected
- [ ] A/B tests activated

## Next Steps

After successful Wave 8 completion:

1. **Monitor A/B test results** - 2 week duration
2. **Collect user feedback** - Through CurationPanel
3. **Iterate based on data** - Sub-wave 8.5 if needed
4. **Prepare Wave 9** - Performance optimization
5. **Document learnings** - Update orchestration patterns

## Success Celebration 🎉

When all metrics are green:
```bash
echo "Wave 8 Frontend Successfully Orchestrated!" | figlet
echo "Metrics Achieved:"
echo "- Badge render: <1ms ✓"
echo "- User approval: 80%+ ✓"
echo "- Engagement increase: 30%+ ✓"
echo "- Test coverage: 90%+ ✓"
```