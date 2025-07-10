/# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the specification for "Consolidador de Conhecimento Pessoal" (Personal Knowledge Consolidator) - an intelligent system for automated discovery, analysis, and structuring of decisive moments in personal knowledge bases.

## Key Architecture

The system is designed as a modular single-page application with the following structure:

```javascript
window.KnowledgeConsolidator = {
  AppState: {},           // Central state management
  AppController: {},      // Navigation and general control
  ConfigManager: {},      // Configuration management
  DiscoveryManager: {},   // File discovery process
  FileRenderer: {},       // Visual interface
  AnalysisManager: {},    // AI analysis
  ExportManager: {},      // Export and RAG preparation
  CategoryManager: {},    // Category system
  FilterManager: {},      // Filters and sorting
  StatsManager: {},       // Real-time statistics
  ModalManager: {}        // Modal controls
};
```

## Core Functionality

### 4-Step Workflow
1. **Automated Discovery**: Configure file patterns, directories, and temporal filters
2. **Local Pre-Analysis**: Keyword relevance scoring with smart preview (70% token economy)
3. **Selective AI Analysis**: Contextual analysis with configurable models
4. **Intelligent Organization**: Categorization and multi-format export with RAG preparation

### Smart Preview System
The system uses an intelligent preview to reduce token usage by 70%:
- First 30 words
- Complete second paragraph
- Last paragraph before ':'
- Phrase starting with ':'
- First paragraph after ':' (30 words)

### Export Formats
- **Markdown (.md)**: For Obsidian compatibility
- **JSON**: For RAG integration (Qdrant-compatible)
- **PDF**: For documentation
- **HTML**: For visualization

## Technical Requirements

### Frontend Stack
- HTML5 + CSS3 (CSS variables)
- Vanilla JavaScript ES6+ (modules)
- Component architecture
- Mobile-first responsive design
- No external dependencies

### Performance Targets
- < 2s initial loading
- < 500ms filter response
- Support for 1000+ files

## Development Patterns

### State Management
All state is centralized in `AppState` object with the following structure:
```javascript
const AppState = {
  currentStep: 1,
  configuration: {
    discovery: {},
    preAnalysis: {},
    aiAnalysis: {},
    organization: {}
  },
  files: [],
  categories: [],
  stats: {},
  timeline: [],
  currentFilter: 'all',
  currentSort: 'relevance'
};
```

### File Status Flow
- **Pending**: Ready for AI analysis
- **Analyzed**: Processing complete
- **Archived**: Stored for reference

### Export Schema
The system prepares data for SPRINT 2 RAG integration with:
- Qdrant vector database (384-dimension embeddings)
- PostgreSQL for metadata
- Redis for caching
- N8N workflow automation

## Future Integration (SPRINT 2)

The system is designed to integrate with a RAG stack:
- **Ollama**: Local embeddings and LLM
- **N8N**: Workflow automation
- **Langchain**: LLM framework
- **Qdrant**: Vector database
- **Redis**: Cache and sessions
- **PostgreSQL**: Structured metadata

## File Structure

This is a single-file application contained in `vcia_dhl.txt` which contains the complete PRD (Product Requirements Document) for the system.

## Testing and Validation

When implementing, ensure:
- All JavaScript modules are properly namespaced
- Error handling is robust throughout
- Mobile responsiveness is maintained
- Performance targets are met
- Export formats are valid and compatible with target systems