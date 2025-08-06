# 🤝 Contributing Guide

## Welcome Contributors!

Obrigado pelo seu interesse em contribuir para o Knowledge Consolidator! Este guia fornece todas as informações necessárias para contribuir efetivamente com o projeto.

## 🚀 Quick Start

### 1. Setup de Desenvolvimento
```bash
# Clone do repositório
git clone https://github.com/your-org/knowledge-consolidator.git
cd knowledge-consolidator

# Instalar dependências
npm install

# Configurar ambiente local
cp .env.example .env
# Editar .env com suas configurações

# Iniciar servidor de desenvolvimento
npm run dev
# ou
python -m http.server 5500
```

### 2. Verificação de Saúde
```bash
# Abrir navegador
open http://localhost:5500

# No console do navegador
kcdiag()  // Deve mostrar todos os componentes OK
```

### 3. Executar Testes
```bash
# Testes unitários
npm test

# Testes de integração
npm run test:integration

# Testes E2E com Playwright
npm run test:e2e
```

## 📋 Diretrizes de Desenvolvimento

### Code Style

#### JavaScript
```javascript
// ✅ Bom: Usar ES6+ features
const files = await KC.DiscoveryManager.startDiscovery(handle)

// ✅ Bom: Destructuring
const { confidence, relevance } = await calculateScores(file)

// ✅ Bom: Template literals
const message = `Processed ${count} files with ${confidence}% confidence`

// ❌ Evitar: var e function clássicas
var files = []  // Use const/let
function process() {}  // Use arrow functions ou class methods
```

#### Naming Conventions
```javascript
// Classes: PascalCase
class UnifiedConfidenceController {}

// Métodos e variáveis: camelCase
const calculateConfidence = () => {}
const fileCount = 150

// Constantes: UPPER_SNAKE_CASE
const MAX_FILES = 1000
const API_ENDPOINTS = {}

// Componentes UI: PascalCase
class FileRenderer {}

// Arquivos: kebab-case
// unified-confidence-controller.js
// file-renderer.component.js
```

#### Error Handling
```javascript
// ✅ Bom: Try-catch com logging específico
try {
  const result = await someOperation()
  return result
} catch (error) {
  KC.Logger.error('Operation failed', {
    operation: 'someOperation',
    error: error.message,
    context: { file: file.id }
  })
  throw new CustomError('Operation failed', { cause: error })
}

// ✅ Bom: Fallbacks robustos
const confidence = await calculateConfidence(file) || 
                   await fallbackConfidence(file) || 
                   0.5  // Default
```

### Component Development

#### Estrutura Base
```javascript
/**
 * ComponentName - Brief description
 * 
 * @purpose Detailed purpose and responsibilities
 * @dependencies List of dependencies
 * @events Events emitted and consumed
 */
class ComponentName {
  constructor() {
    this.initialized = false
    this.logger = KC.Logger
    this.eventListeners = new Map()
    
    // Setup event listeners
    this.setupEventListeners()
  }
  
  /**
   * Initialize component (lazy loading pattern)
   */
  async initialize() {
    if (this.initialized) return
    
    try {
      await this.setupDependencies()
      await this.loadConfiguration()
      this.initialized = true
      
      this.logger.info('Component initialized', { 
        component: this.constructor.name 
      })
    } catch (error) {
      this.logger.error('Component initialization failed', {
        component: this.constructor.name,
        error: error.message
      })
      throw error
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const listeners = [
      [KC.Events.FILES_UPDATED, this.handleFilesUpdated.bind(this)],
      [KC.Events.STATE_CHANGED, this.handleStateChanged.bind(this)]
    ]
    
    listeners.forEach(([event, handler]) => {
      KC.EventBus.on(event, handler)
      this.eventListeners.set(event, handler)
    })
  }
  
  /**
   * Cleanup method
   */
  destroy() {
    // Remove event listeners
    this.eventListeners.forEach((handler, event) => {
      KC.EventBus.off(event, handler)
    })
    
    this.eventListeners.clear()
    this.initialized = false
  }
  
  /**
   * Health check for diagnostics
   */
  healthCheck() {
    return {
      initialized: this.initialized,
      dependencies: this.checkDependencies(),
      memory: this.getMemoryUsage(),
      events: this.eventListeners.size
    }
  }
}
```

#### Event-Driven Patterns
```javascript
// ✅ SEMPRE emitir ambos eventos após mudanças de estado
updateFiles(files) {
  // 1. Atualizar AppState
  KC.AppState.set('files', files)
  
  // 2. Emitir evento de estado
  KC.EventBus.emit(KC.Events.STATE_CHANGED, {
    key: 'files',
    newValue: files,
    oldValue: this.previousFiles
  })
  
  // 3. Emitir evento específico
  KC.EventBus.emit(KC.Events.FILES_UPDATED, {
    action: 'updated',
    count: files.length,
    component: this.constructor.name
  })
}

// ✅ Reagir a eventos de forma robusta
handleFilesUpdated(data) {
  try {
    // Validation
    if (!data || !Array.isArray(data.files)) {
      this.logger.warn('Invalid files data received', data)
      return
    }
    
    // Process update
    this.processFilesUpdate(data)
    
  } catch (error) {
    this.logger.error('Error handling files update', {
      error: error.message,
      data
    })
  }
}
```

### ML Component Guidelines

#### Confidence Calculation
```javascript
// ✅ Implementar cálculo DURANTE descoberta
async _calculateConfidenceDuringDiscovery(file) {
  // 1. Ensure lazy initialization
  await this._ensureSystemReady()
  
  // 2. Calculate scores with fallbacks
  const scores = await this._calculateScoresWithFallbacks(file)
  
  // 3. Apply ML algorithms
  const confidence = await this._applyMLAlgorithms(scores)
  
  // 4. Validate and normalize
  return this._validateAndNormalize(confidence) || this._fallbackConfidence(file)
}

// ✅ Múltiplas camadas de fallback
_calculateFallbackConfidence(file) {
  const strategies = [
    () => this._categoryBasedFallback(file),
    () => this._keywordBasedFallback(file),
    () => this._structuralFallback(file),
    () => 0.5  // Default final
  ]
  
  for (const strategy of strategies) {
    try {
      const score = strategy()
      if (score !== null && score >= 0) return score
    } catch (error) {
      continue
    }
  }
  
  return 0.5
}
```

#### Performance Optimization
```javascript
// ✅ Lazy initialization pattern
async ensureInitialized() {
  if (this.initialized) return
  
  if (!this.initPromise) {
    this.initPromise = this._initialize()
  }
  
  await this.initPromise
}

// ✅ Caching inteligente
async calculateWithCache(key, calculator) {
  if (this.cache.has(key)) {
    return this.cache.get(key)
  }
  
  const result = await calculator()
  this.cache.set(key, result)
  
  // Cleanup old entries
  if (this.cache.size > this.maxCacheSize) {
    this.cache.delete(this.cache.keys().next().value)
  }
  
  return result
}
```

## 🧪 Testing Guidelines

### Unit Tests
```javascript
// test/components/unified-confidence-controller.test.js
describe('UnifiedConfidenceController', () => {
  let controller
  
  beforeEach(() => {
    // Setup fresh instance
    controller = new KC.UnifiedConfidenceController()
    
    // Mock dependencies
    jest.spyOn(KC.QdrantService, 'checkConnection')
      .mockResolvedValue(true)
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
    controller.destroy()
  })
  
  describe('confidence calculation', () => {
    test('should calculate confidence during discovery', async () => {
      const mockFile = {
        id: 'test_file',
        content: 'Machine learning implementation',
        categories: ['IA/ML']
      }
      
      const confidence = await controller
        ._calculateConfidenceDuringDiscovery(mockFile)
      
      expect(confidence).toBeGreaterThan(0)
      expect(confidence).toBeLessThanOrEqual(1)
    })
    
    test('should use fallback when ML fails', async () => {
      // Mock ML failure
      jest.spyOn(controller.components.calculator, 'calculate')
        .mockRejectedValue(new Error('ML failure'))
      
      const mockFile = { 
        id: 'test', 
        content: 'test', 
        categories: ['test'] 
      }
      
      const confidence = await controller
        ._calculateConfidenceDuringDiscovery(mockFile)
      
      expect(confidence).toBe(0.5) // Fallback value
    })
  })
  
  describe('system health', () => {
    test('should report healthy status when initialized', async () => {
      await controller.initialize()
      
      const health = controller.healthCheck()
      
      expect(health.initialized).toBe(true)
      expect(health.dependencies).toBeDefined()
    })
  })
})
```

### Integration Tests
```javascript
// test/integration/workflow-complete.test.js
describe('Complete Workflow Integration', () => {
  let mockDirectoryHandle
  
  beforeAll(async () => {
    // Setup test environment
    await setupTestEnvironment()
    mockDirectoryHandle = createMockDirectoryHandle()
  })
  
  test('complete discovery to analysis workflow', async () => {
    // Step 1: Discovery
    const files = await KC.DiscoveryManager.startDiscovery(mockDirectoryHandle)
    expect(files.length).toBeGreaterThan(0)
    
    // Step 2: Filtering
    const filtered = KC.FilterManager.applyFilters(files, {
      relevanceThreshold: 0.7
    })
    expect(filtered.length).toBeLessThanOrEqual(files.length)
    
    // Step 3: Analysis
    KC.AnalysisManager.addToQueue(filtered.slice(0, 5))
    await KC.AnalysisManager.processQueue()
    
    // Step 4: Organization
    const organized = await KC.RAGExportManager.consolidateData()
    expect(organized.points.length).toBeGreaterThan(0)
  })
})
```

### E2E Tests (Playwright)
```javascript
// test/e2e/user-workflow.spec.js
const { test, expect } = require('@playwright/test')

test('user can complete full analysis workflow', async ({ page }) => {
  await page.goto('http://localhost:5500')
  
  // Check system health
  const health = await page.evaluate(() => kcdiag())
  expect(health.status).toBe('healthy')
  
  // Step 1: Discovery
  await page.click('[data-step="1"]')
  await page.click('[data-action="select-directory"]')
  
  // Mock file selection (in real test, use actual files)
  await page.evaluate(() => {
    KC.DiscoveryManager.mockDiscovery([
      { name: 'test1.md', content: 'AI implementation strategy' },
      { name: 'test2.md', content: 'Machine learning automation' }
    ])
  })
  
  // Verify files discovered
  await expect(page.locator('.files-count')).toContainText('2 files')
  
  // Step 3: Analysis
  await page.click('[data-step="3"]')
  await page.click('[data-action="start-analysis"]')
  
  // Wait for analysis completion
  await expect(page.locator('.analysis-status')).toContainText('completed')
  
  // Verify results
  const results = await page.locator('.analysis-results').count()
  expect(results).toBeGreaterThan(0)
})
```

## 🐛 Bug Reports

### Bug Report Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Navigate to...
2. Click on...
3. Observe...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: Chrome 118.0.0.0
- OS: Windows 11
- Version: 1.0.0

## Diagnostic Output
```javascript
// Result of kcdiag()
{
  "status": "error",
  "components": {...}
}
```

## Console Errors
```
Error: UnifiedConfidenceController initialization failed
    at ...
```

## Additional Context
Screenshots, logs, or other relevant information
```

### Critical Bug Criteria
- **System Crash**: Application becomes unusable
- **Data Loss**: User data is lost or corrupted
- **Security Issue**: Potential security vulnerability
- **Core Feature Broken**: Main workflow doesn't work

## ✨ Feature Requests

### Feature Request Template
```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
Detailed description of how it should work

## Alternative Solutions
Other ways to solve the same problem

## Implementation Notes
Technical considerations, if any

## Priority
- [ ] Critical (blocks main functionality)
- [ ] High (significantly improves UX)
- [ ] Medium (nice to have)
- [ ] Low (future enhancement)
```

## 🔄 Pull Request Process

### 1. Before Starting
- Check existing issues and PRs
- Discuss major changes in GitHub Issues
- Fork the repository
- Create feature branch

### 2. Development
```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes following guidelines
# Write tests
# Update documentation

# Test thoroughly
npm test
npm run test:integration

# Check diagnostic
# Open browser, run kcdiag()
```

### 3. Commit Guidelines
```bash
# Commit message format
type(scope): description

# Examples
feat(confidence): implement lazy initialization for UnifiedConfidenceSystem
fix(filters): resolve date range filter not updating counters
docs(api): add REST API examples for N8N integration
refactor(events): standardize event naming convention
test(analysis): add unit tests for AnalysisManager queue processing
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### 4. Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- Implemented lazy initialization for UnifiedConfidenceSystem
- Added fallback strategies for confidence calculation
- Updated tests to cover new functionality

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] kcdiag() shows healthy status

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### 5. Review Process
1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Maintainer reviews code
3. **Testing**: Feature tested in isolation
4. **Integration**: Merged after approval

## 📚 Documentation

### Documentation Standards
- **User-facing**: Clear, example-rich, step-by-step
- **Developer-facing**: Technical, comprehensive, with code examples
- **API docs**: Complete with request/response examples
- **Architecture**: High-level design and decisions

### Documentation Updates Required
- New features → User guide + API docs
- Bug fixes → Update troubleshooting if needed
- Architecture changes → Update developer docs
- New APIs → Complete API documentation

## 🚀 Release Process

### Versioning (SemVer)
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

### Release Checklist
1. ✅ All tests pass
2. ✅ Documentation updated
3. ✅ CHANGELOG.md updated
4. ✅ Version bumped in package.json
5. ✅ Git tag created
6. ✅ Release notes written

### Deployment
```bash
# Create release branch
git checkout -b release/v1.1.0

# Update version
npm version minor

# Update CHANGELOG.md
# Create PR to main
# After merge, create GitHub release
```

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn
- Report unacceptable behavior

### Communication Channels
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **PR Comments**: Code-specific feedback
- **Email**: Security issues (security@yourorg.com)

### Getting Help
1. Check existing documentation
2. Search GitHub Issues
3. Create new issue with detailed information
4. Be patient and respectful

## 🏆 Recognition

### Contributors
All contributors are recognized in:
- README.md Contributors section
- CHANGELOG.md for each release
- GitHub Contributors page

### Types of Contributions
- Code contributions
- Bug reports
- Documentation improvements
- Testing and QA
- Design and UX feedback
- Community support

## 📋 Development Setup Advanced

### IDE Configuration

#### VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

#### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  globals: {
    KC: 'readonly',
    kcdiag: 'readonly'
  }
}
```

### Performance Monitoring
```javascript
// Add to your components for performance tracking
class PerformanceAwareComponent {
  async performOperation() {
    const startTime = performance.now()
    
    try {
      const result = await this.actualOperation()
      
      const duration = performance.now() - startTime
      KC.PerformanceMetrics.record('operation_name', duration)
      
      return result
    } catch (error) {
      KC.PerformanceMetrics.recordError('operation_name', error)
      throw error
    }
  }
}
```

---

Obrigado por contribuir para o Knowledge Consolidator! Sua ajuda torna este projeto melhor para todos. 🚀