Leia primeiro @CLAUDE.md para entender as LEIS do projeto, depois leia @RESUME-STATUS.md para entender o estado atual. O servidor Five Server já está rodando na porta 5500 (gerenciado pelo usuário conforme @docs/servidor.md). Acesse http://127.0.0.1:5500 e execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir.

# Complete Development Workflow

## Command Categories

### 🏗️ **Architecture & Design**
- `@ask.md` - Strategic architectural consultation and technical guidance

### 💻 **Development**
- `@code.md` - Feature implementation and code generation
- `@debug.md` - Bug analysis and problem solving
- `@refactor.md` - Code improvement and restructuring

### 🔍 **Quality Assurance**
- `@test.md` - Testing strategy and test generation
- `@review.md` - Code quality and security review
- `@optimize.md` - Performance analysis and optimization

### 🚀 **Operations**
- `@deploy-check.md` - Deployment readiness and validation

### Development Workflow

```bash
#### 1. Architecture consultation
 - @ask.md How to design a microservices architecture for an e-commerce platform handling 10M+ users
 - @ask.md Planejar a arquitetura da Fase 3 para integração com LLMs externos, considerando o AnalysisManager.js, o sistema de 'Tipo de Análise' já existente em @src/classifier.js e o painel de stats em @src/StatsPanel.js

#### 2. Implement new feature
 - @code.md Implement user authentication system with login, registration, and password reset
 - @code.md Implementar o AnalysisManager para se conectar com LLMs externos
 - @code.md Com base no plano arquitetural, implementar a estrutura inicial do AnalysisManager.js, incluindo a lógica para receber uma lista de arquivos, interagir com um APIManager (ainda a ser criado) e gerenciar estados de processamento (pendente, em andamento, concluído)

#### 3. Code review
 - @review.md user authentication module
@test.md Gerar testes unitários para o @src/managers/AnalysisManager.js, focando em verificar o gerenciamento de estados e o tratamento de listas de arquivos vazias ou inválidas
 - @review.md O módulo de classificação em @src/classifier.js

#### 4. Generate tests
 - @test.md user authentication functionality

#### 5. Performance optimization
 - @optimize.md login API response time

#### 6. Deployment check
 - @deploy-check.md production environment
```

### Bug Fix Workflow

```bash
#### 1. Debug analysis
 - @debug.md User login returns intermittent 500 errors

#### 2. Implement fix
 - @code.md Fix login service concurrency issues

#### 3. Test verification
 - @test.md login concurrent scenarios
 - @test.md Gerar testes unitários para o @src/managers/AnalysisManager.js, focando em verificar o gerenciamento de estados e o tratamento de listas de arquivos vazias ou inválidas

#### 4. Deployment preparation
 - @deploy-check.md hotfix branch
```

### Architecture Consultation Workflow

```bash
#### 1. Architecture guidance
 - @ask.md Should we use event sourcing or traditional CRUD for our order management system

#### 2. System design consultation
 - @ask.md How to handle data consistency across microservices in a distributed transaction

#### 3. Technology strategy
@test.md Gerar testes unitários para o @src/managers/AnalysisManager.js, focando em verificar o gerenciamento de estados e o tratamento de listas de arquivos vazias ou inválidas
 - @ask.md Comparing GraphQL vs REST API for our mobile-first application

#### 4. Implementation planning
 - @code.md Implement API gateway pattern with rate limiting and circuit breaker
```

### Refactoring Workflow

```bash
#### 1. Refactoring analysis
 - @refactor.md user service module with high complexity

#### 2. Code review
 - @review.md refactored user service

#### 3. Performance validation
 - @optimize.md refactored service performance

#### 4. Test supplementation
 - @test.md refactored user service
```

---

## Command Categories

### 🏗️ **Architecture & Design**
- `@ask.md` - Strategic architectural consultation and technical guidance

### 💻 **Development**
- `@code.md` - Feature implementation and code generation
- `@debug.md` - Bug analysis and problem solving
- `@refactor.md` - Code improvement and restructuring

### 🔍 **Quality Assurance**
- `@test.md` - Testing strategy and test generation
- `@review.md` - Code quality and security review
- `@optimize.md` - Performance analysis and optimization

### 🚀 **Operations**
- `@deploy-check.md` - Deployment readiness and validation
