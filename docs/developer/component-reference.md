# 📦 Component Reference

## Core Components

### EventBus
**Path**: `js/core/EventBus.js`  
**Purpose**: Central event management system for component communication

```javascript
class EventBus {
  // Register event listener
  on(event, callback, options = {})
  
  // Emit event to all listeners
  emit(event, data = {})
  
  // Remove specific listener
  off(event, callback)
  
  // One-time listener
  once(event, callback)
  
  // List all active events
  listEvents()
}

// Usage
KC.EventBus.on(KC.Events.FILES_UPDATED, (data) => {
  console.log('Files updated:', data.count)
})

KC.EventBus.emit(KC.Events.FILES_UPDATED, { 
  action: 'discovered', 
  count: 150 
})
```

**Key Events**:
- `FILES_UPDATED`: File list changes
- `CATEGORIES_CHANGED`: Category modifications
- `STATE_CHANGED`: AppState updates
- `CONFIDENCE_UPDATED`: ML confidence changes
- `ANALYSIS_COMPLETED`: AI analysis finished

### AppState
**Path**: `js/core/AppState.js`  
**Purpose**: Centralized state management with localStorage persistence

```javascript
class AppState {
  // Get state value
  get(key)
  
  // Set state value (triggers events)
  set(key, value)
  
  // Update nested properties
  update(key, updateFn)
  
  // Check if key exists
  has(key)
  
  // Clear specific key
  clear(key)
  
  // Compress data for storage
  compress()
  
  // Get storage statistics
  getStats()
}

// Usage
KC.AppState.set('files', filesArray)
const files = KC.AppState.get('files')

// Update with function
KC.AppState.update('configuration', (config) => ({
  ...config,
  apiKeys: { ...config.apiKeys, openai: 'new-key' }
}))
```

**State Schema**:
```javascript
{
  files: [],                    // Discovered files
  categories: [],               // Category definitions
  configuration: {              // User settings
    discovery: {},
    preAnalysis: {},
    aiAnalysis: {},
    organization: {}
  },
  currentStep: 1,               // Workflow step (1-4)
  stats: {},                    // System statistics
  timeline: [],                 // Action history (limited to 50)
  confidenceMetrics: {}         // ML performance metrics
}
```

### AppController
**Path**: `js/core/AppController.js`  
**Purpose**: Main application controller for navigation and component orchestration

```javascript
class AppController {
  // Initialize application
  initialize()
  
  // Navigate to workflow step
  navigateToStep(step)
  
  // Register component
  registerComponent(name, component)
  
  // Get component by name
  getComponent(name)
  
  // Get component health status
  getComponentStatus()
  
  // Handle errors globally
  handleError(error, context)
}

// Usage
KC.AppController.registerComponent('FileRenderer', FileRenderer)
KC.AppController.navigateToStep(2)
const fileRenderer = KC.AppController.getComponent('FileRenderer')
```

### Logger
**Path**: `js/utils/Logger.js`  
**Purpose**: Comprehensive logging system with levels and filtering

```javascript
class Logger {
  // Log methods
  debug(message, data = {})
  info(message, data = {})
  warn(message, data = {})
  error(message, data = {})
  
  // Set log level
  setLevel(level) // 'debug', 'info', 'warn', 'error'
  
  // Get recent logs
  getRecentLogs(level = 'all', limit = 100)
  
  // Export logs
  exportLogs(filename)
  
  // Flow tracking
  flow(component, method, data = {})
}

// Usage
KC.Logger.info('System initialized', { version: '1.0.0' })
KC.Logger.error('API request failed', { provider: 'openai', error })
KC.Logger.flow('FileRenderer', 'showFilesSection', { count: files.length })
```

## Discovery & Analysis

### DiscoveryManager
**Path**: `js/managers/DiscoveryManager.js`  
**Purpose**: File discovery with File System Access API and relevance scoring

```javascript
class DiscoveryManager {
  // Start discovery process
  async startDiscovery(directoryHandle, options = {})
  
  // Get discovery statistics
  getStats()
  
  // Configure discovery options
  configure(options)
  
  // Detect Obsidian vault
  async detectObsidianVault(directoryHandle)
  
  // Apply exclusion patterns
  shouldExcludeFile(filePath, fileName)
}

// Usage
const directoryHandle = await window.showDirectoryPicker()
const files = await KC.DiscoveryManager.startDiscovery(directoryHandle, {
  includeTypes: ['.md', '.txt'],
  exclusionPatterns: ['temp/', '.git/'],
  maxFiles: 1000
})
```

**Configuration Options**:
```javascript
{
  includeTypes: ['.md', '.txt', '.docx', '.pdf'],
  exclusionPatterns: ['temp/', 'cache/', 'backup/', '.git/'],
  maxFiles: 1000,
  calculateRelevance: true,
  generatePreview: true,
  detectObsidian: true
}
```

### FilterManager
**Path**: `js/managers/FilterManager.js`  
**Purpose**: Advanced filtering with real-time counters and multiple criteria

```javascript
class FilterManager {
  // Apply filters to file list
  applyFilters(files, filters = {})
  
  // Get current filter configuration
  getCurrentFilters()
  
  // Set filter configuration
  setFilters(filters)
  
  // Clear all filters
  clearAllFilters()
  
  // Get filter statistics
  getStats()
  
  // Update counters
  updateCounters(files)
}

// Usage
const filteredFiles = KC.FilterManager.applyFilters(files, {
  relevanceThreshold: 0.7,
  categories: ['IA/ML', 'Projetos'],
  dateRange: { start: '2024-01-01', end: '2025-08-02' },
  sizeRange: { min: 1000, max: 50000 },
  analyzed: false
})
```

### AnalysisManager
**Path**: `js/managers/AnalysisManager.js`  
**Purpose**: AI analysis coordination with multi-provider support

```javascript
class AnalysisManager {
  // Add files to analysis queue
  addToQueue(files, options = {})
  
  // Process analysis queue
  async processQueue()
  
  // Get queue status
  getQueueStatus()
  
  // Cancel analysis
  cancelAnalysis(jobId)
  
  // Get analysis results
  getResults(fileId)
}

// Usage
KC.AnalysisManager.addToQueue(selectedFiles, {
  template: 'decisiveMoments',
  provider: 'ollama',
  batchSize: 5,
  context: 'Focus on strategic decisions'
})

await KC.AnalysisManager.processQueue()
```

### CategoryManager
**Path**: `js/managers/CategoryManager.js`  
**Purpose**: Category system with hierarchy, colors, and synchronization

```javascript
class CategoryManager {
  // Get all categories
  getCategories()
  
  // Create new category
  createCategory(name, options = {})
  
  // Update category
  updateCategory(id, updates)
  
  // Delete category
  deleteCategory(id)
  
  // Add category to file
  addCategoryToFile(fileId, categoryId)
  
  // Remove category from file
  removeCategoryFromFile(fileId, categoryId)
  
  // Auto-suggest categories
  async suggestCategories(file)
  
  // Migrate from legacy format
  migrateFromLegacy()
}

// Usage
const category = KC.CategoryManager.createCategory('Blockchain', {
  color: '#F59E0B',
  parent: 'tecnologia',
  description: 'Blockchain and DeFi technologies'
})

// Auto-categorization
const suggestions = await KC.CategoryManager.suggestCategories(file)
```

## ML & Confidence System

### UnifiedConfidenceController
**Path**: `js/controllers/UnifiedConfidenceController.js`  
**Purpose**: Main orchestrator for ML confidence system

```javascript
class UnifiedConfidenceController {
  // Initialize confidence system
  async initialize()
  
  // Calculate confidence during discovery
  async _calculateConfidenceDuringDiscovery(file)
  
  // Update confidence for files
  async updateConfidence(fileIds)
  
  // Get confidence metrics
  getMetrics()
  
  // Configure weights and algorithms
  configure(options)
  
  // Health check
  async healthCheck()
}

// Usage
const confidence = await KC.UnifiedConfidenceController
  ._calculateConfidenceDuringDiscovery(file)

KC.UnifiedConfidenceController.configure({
  weights: {
    qdrantSimilarity: 0.4,
    localRelevance: 0.3,
    categoryBoost: 0.2,
    structuralFeatures: 0.1
  },
  algorithm: 'ensemble',
  updateInterval: 5000
})
```

### QdrantScoreBridge
**Path**: `js/services/QdrantScoreBridge.js`  
**Purpose**: Bridge between Qdrant similarity scores and confidence system

```javascript
class QdrantScoreBridge {
  // Calculate score for file
  async calculateScore(file, options = {})
  
  // Get Qdrant similarity
  async getQdrantSimilarity(content)
  
  // Map scores to confidence range
  mapToConfidenceRange(scores)
  
  // Validate score consistency
  validateScores(scores)
}

// Usage
const scores = await KC.QdrantScoreBridge.calculateScore(file, {
  includeQdrant: true,
  includeLocal: true,
  includeBoosts: true
})
```

### EmbeddingService
**Path**: `js/services/EmbeddingService.js`  
**Purpose**: Generate and manage embeddings via Ollama

```javascript
class EmbeddingService {
  // Generate embedding for text
  async generateEmbedding(text, options = {})
  
  // Batch generate embeddings
  async generateBatch(texts, batchSize = 10)
  
  // Calculate similarity between embeddings
  calculateSimilarity(embedding1, embedding2)
  
  // Check Ollama availability
  async checkOllamaAvailability()
  
  // Clear embedding cache
  clearCache()
}

// Usage
const embedding = await KC.EmbeddingService.generateEmbedding(
  'Machine learning implementation strategy'
)

const similarity = KC.EmbeddingService.calculateSimilarity(emb1, emb2)
```

### QdrantService
**Path**: `js/services/QdrantService.js`  
**Purpose**: Vector database operations and management

```javascript
class QdrantService {
  // Check connection to Qdrant
  async checkConnection()
  
  // Create collection
  async createCollection(name, config)
  
  // Insert points
  async insertPoints(points)
  
  // Search by vector
  async searchByVector(vector, options = {})
  
  // Search by text
  async searchByText(text, options = {})
  
  // Get collection stats
  async getCollectionStats()
  
  // Delete collection
  async deleteCollection(name)
}

// Usage
await KC.QdrantService.createCollection('knowledge_base', {
  vectors: { size: 768, distance: 'Cosine' }
})

const results = await KC.QdrantService.searchByText('automation', {
  limit: 10,
  threshold: 0.7
})
```

## AI Integration

### AIAPIManager
**Path**: `js/managers/AIAPIManager.js`  
**Purpose**: Multi-provider AI integration with fallback system

```javascript
class AIAPIManager {
  // Set API key for provider
  setApiKey(provider, key)
  
  // Get available providers
  getProviders()
  
  // Set active provider
  setActiveProvider(provider)
  
  // Check provider availability
  async checkProviderAvailability(provider)
  
  // Process content with active provider
  async processContent(content, template, options = {})
  
  // Process with specific provider
  async processWithProvider(provider, content, template)
  
  // Get provider health status
  getProvidersHealth()
}

// Usage
KC.AIAPIManager.setApiKey('openai', 'sk-your-key')
KC.AIAPIManager.setActiveProvider('ollama')

const result = await KC.AIAPIManager.processContent(
  fileContent,
  'decisiveMoments',
  { context: 'Strategic analysis focus' }
)
```

### PromptManager
**Path**: `js/managers/PromptManager.js`  
**Purpose**: Template management for AI prompts

```javascript
class PromptManager {
  // List available templates
  listTemplates()
  
  // Get template by ID
  getTemplate(templateId)
  
  // Create custom template
  createTemplate(config)
  
  // Update template
  updateTemplate(templateId, updates)
  
  // Delete template
  deleteTemplate(templateId)
  
  // Render template with variables
  renderTemplate(templateId, variables)
  
  // Export templates
  exportTemplates()
  
  // Import templates
  importTemplates(templates)
}

// Usage
const template = KC.PromptManager.createTemplate({
  id: 'opportunity_analysis',
  name: 'Opportunity Analysis',
  prompt: 'Analyze for opportunities: {content}',
  outputFormat: 'structured',
  variables: ['content', 'context']
})

const renderedPrompt = KC.PromptManager.renderTemplate('opportunity_analysis', {
  content: fileContent,
  context: 'Business opportunities'
})
```

## UI Components

### WorkflowPanel
**Path**: `js/components/WorkflowPanel.js`  
**Purpose**: Main 4-step workflow interface

```javascript
class WorkflowPanel {
  // Initialize workflow
  initialize()
  
  // Navigate to step
  navigateToStep(step)
  
  // Update step status
  updateStepStatus(step, status)
  
  // Show step content
  showStepContent(step)
  
  // Get current step
  getCurrentStep()
}

// Usage
KC.WorkflowPanel.navigateToStep(2)
KC.WorkflowPanel.updateStepStatus(1, 'completed')
```

### FileRenderer
**Path**: `js/components/FileRenderer.js`  
**Purpose**: File listing with actions and bulk operations

```javascript
class FileRenderer {
  // Show files section
  showFilesSection(files, containerId)
  
  // Render file list
  renderFileList(files, options = {})
  
  // Handle file selection
  handleFileSelection(fileId, selected)
  
  // Get selected files
  getSelectedFiles()
  
  // Apply bulk action
  applyBulkAction(action, fileIds)
  
  // Update file display
  updateFileDisplay(fileId, updates)
}

// Usage
KC.FileRenderer.showFilesSection(files, 'files-container')
const selected = KC.FileRenderer.getSelectedFiles()
KC.FileRenderer.applyBulkAction('analyze', selected)
```

### FilterPanel
**Path**: `js/components/FilterPanel.js`  
**Purpose**: Advanced filtering interface with real-time updates

```javascript
class FilterPanel {
  // Initialize filter panel
  initialize(containerId)
  
  // Update filters
  updateFilters(filters)
  
  // Clear all filters
  clearAllFilters()
  
  // Get active filters
  getActiveFilters()
  
  // Update counters
  updateCounters(files)
  
  // Show/hide panel
  toggle()
}

// Usage
KC.FilterPanel.initialize('filter-panel')
KC.FilterPanel.updateFilters({
  relevanceThreshold: 0.8,
  categories: ['IA/ML']
})
```

### OrganizationPanel
**Path**: `js/components/OrganizationPanel.js`  
**Purpose**: Step 4 organization and export interface

```javascript
class OrganizationPanel {
  // Initialize organization panel
  initialize()
  
  // Show organization options
  showOrganizationOptions()
  
  // Handle category management
  handleCategoryManagement()
  
  // Process approved files
  async processApprovedFiles()
  
  // Show export options
  showExportOptions()
  
  // Execute export
  async executeExport(format, options)
}

// Usage
KC.OrganizationPanel.initialize()
await KC.OrganizationPanel.processApprovedFiles()
await KC.OrganizationPanel.executeExport('rag', {
  includeEmbeddings: true
})
```

## Utility Components

### HandleManager
**Path**: `js/utils/HandleManager.js`  
**Purpose**: File System Access API management

```javascript
class HandleManager {
  // Register file handle
  register(id, handle)
  
  // Get handle by ID
  get(id)
  
  // List all handles
  list()
  
  // Remove handle
  remove(id)
  
  // Clear all handles
  clear()
  
  // Verify handle permissions
  async verifyPermission(handle, withWrite = false)
}

// Usage
KC.HandleManager.register('vault_root', directoryHandle)
const handle = KC.HandleManager.get('vault_root')
```

### PreviewUtils
**Path**: `js/utils/PreviewUtils.js`  
**Purpose**: Intelligent preview extraction with 70% token economy

```javascript
class PreviewUtils {
  // Extract intelligent preview
  static extractIntelligentPreview(content, options = {})
  
  // Get semantic segments
  static getSemanticSegments(content)
  
  // Calculate relevance score
  static calculateRelevanceScore(content, keywords = [])
  
  // Test relevance calculation
  static testRelevance(content)
}

// Usage
const preview = KC.PreviewUtils.extractIntelligentPreview(content, {
  maxLength: 300,
  includeStructure: true
})

const relevance = KC.PreviewUtils.calculateRelevanceScore(content, keywords)
```

### ChunkingUtils
**Path**: `js/utils/ChunkingUtils.js`  
**Purpose**: Semantic chunking for RAG pipeline

```javascript
class ChunkingUtils {
  // Get semantic chunks
  static getSemanticChunks(content, options = {})
  
  // Chunk by structure
  static chunkByStructure(content, chunkSize = 1000)
  
  // Chunk with overlap
  static chunkWithOverlap(content, chunkSize, overlapPercent = 10)
  
  // Validate chunk quality
  static validateChunks(chunks)
}

// Usage
const chunks = KC.ChunkingUtils.getSemanticChunks(content, {
  chunkSize: 1000,
  overlapPercent: 10,
  respectStructure: true
})
```

## Export & Integration

### RAGExportManager
**Path**: `js/managers/RAGExportManager.js`  
**Purpose**: Export pipeline for RAG integration

```javascript
class RAGExportManager {
  // Consolidate data for export
  async consolidateData(options = {})
  
  // Export to JSON format
  async exportToJSON(options = {})
  
  // Export to Qdrant format
  async exportToQdrant(options = {})
  
  // Process approved files
  async processApprovedFiles()
  
  // Get export statistics
  getExportStats()
}

// Usage
const consolidated = await KC.RAGExportManager.consolidateData({
  includeEmbeddings: true,
  filterByConfidence: 0.7
})

await KC.RAGExportManager.exportToJSON({
  filename: 'knowledge_export.json',
  compress: true
})
```

## Component Registration

### Registration Pattern
```javascript
// app.js - Component registration
function registerComponents() {
  const components = [
    // Core
    { name: 'EventBus', instance: EventBus },
    { name: 'AppState', instance: AppState },
    { name: 'Logger', instance: Logger },
    
    // Managers
    { name: 'DiscoveryManager', instance: DiscoveryManager },
    { name: 'FilterManager', instance: FilterManager },
    { name: 'CategoryManager', instance: CategoryManager },
    { name: 'AnalysisManager', instance: AnalysisManager },
    { name: 'AIAPIManager', instance: AIAPIManager },
    
    // ML & Confidence
    { name: 'UnifiedConfidenceController', instance: UnifiedConfidenceController },
    { name: 'QdrantScoreBridge', instance: QdrantScoreBridge },
    { name: 'EmbeddingService', instance: EmbeddingService },
    { name: 'QdrantService', instance: QdrantService },
    
    // UI Components
    { name: 'WorkflowPanel', instance: WorkflowPanel },
    { name: 'FileRenderer', instance: FileRenderer },
    { name: 'FilterPanel', instance: FilterPanel },
    { name: 'OrganizationPanel', instance: OrganizationPanel }
  ]
  
  components.forEach(comp => {
    KC[comp.name] = comp.instance
    KC.AppController.registerComponent(comp.name, comp.instance)
  })
}
```

## Debug Commands

### Available Commands
```javascript
// Global diagnostic
kcdiag()

// Component-specific debug
KC.AppController.getComponentStatus()
KC.UnifiedConfidenceController.getMetrics()
KC.MemoryOptimizer.getMemoryUsage()
KC.PerformanceMetrics.getStats()

// Data inspection
KC.AppState.getStats()
KC.Logger.getRecentLogs('error', 50)
KC.EventBus.listEvents()

// Cache management
KC.EmbeddingService.clearCache()
KC.QdrantService.clearCache()
KC.MemoryOptimizer.cleanup()
```

---

**Anterior**: [← Architecture Overview](architecture-overview.md) | **Próximo**: [Contributing →](contributing.md)