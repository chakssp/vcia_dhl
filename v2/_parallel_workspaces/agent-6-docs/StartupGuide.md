# Knowledge Consolidator V2 - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- 4GB RAM minimum
- For local AI: [Ollama](https://ollama.ai) installed

### Step 1: Access KC V2

1. Open your browser
2. Navigate to: `http://localhost:3000` (local) or `https://app.knowledgeconsolidator.com` (cloud)
3. You'll see the terminal-style interface

### Step 2: Quick Discovery

1. Press `Ctrl+K` to open command palette
2. Type "discover" and press Enter
3. Select a folder with your documents
4. Click "Run Discovery"

### Step 3: Analyze Files

1. Files with 70%+ relevance are auto-selected
2. Click "Analyze Selected" or press `Ctrl+A`
3. Watch real-time progress in the terminal

### Step 4: Export Results

1. Press `Ctrl+E` for export options
2. Choose format (JSON, Markdown, PDF)
3. Download your consolidated knowledge

## 🎯 First-Time Setup

### 1. Configure AI Provider (Required)

#### Option A: Ollama (Recommended - Local & Free)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download recommended model
ollama pull llama2

# Start Ollama (runs automatically after install)
ollama serve
```

In KC V2:
1. Press `Ctrl+,` for settings
2. Select "AI Providers"
3. Choose "Ollama"
4. Verify connection (green indicator)

#### Option B: OpenAI

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. In KC V2 settings, select "OpenAI"
3. Paste your API key
4. Choose model (GPT-3.5 or GPT-4)

### 2. Set Your Preferences

```javascript
// Access settings with Ctrl+,
{
  "theme": "dark",              // dark, light, midnight, solarized
  "autoSave": true,             // Auto-save every 60 seconds
  "relevanceThreshold": 70,     // Default relevance filter
  "batchSize": 10,              // Files processed at once
  "defaultExportFormat": "json" // Default export format
}
```

### 3. Create Your First Category

1. Go to Organization tab (Step 4)
2. Click "Add Category"
3. Enter name and choose color
4. Categories help organize your insights

## 📚 Essential Commands

### Command Palette (`Ctrl+K`)

| Command | Action |
|---------|--------|
| `discover` | Start file discovery |
| `analyze` | Analyze selected files |
| `export` | Export results |
| `settings` | Open settings |
| `help` | Show help guide |
| `clear` | Clear current results |
| `stats` | View statistics |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+D` | Start discovery |
| `Ctrl+A` | Analyze files |
| `Ctrl+E` | Export |
| `Ctrl+S` | Save state |
| `Ctrl+/` | Show all shortcuts |
| `Esc` | Cancel/Close |

## 🔥 Power User Tips

### 1. Batch Processing

```bash
# Select multiple files
- Click first file
- Shift+Click last file
- Or Ctrl+Click individual files

# Batch actions
- Analyze all at once
- Assign same category
- Export together
```

### 2. Advanced Filtering

```bash
# In command palette
@category:Technical     # Filter by category
@type:md               # Filter by file type
@relevance:>80         # High relevance only
@modified:<30d         # Modified in last 30 days
```

### 3. Custom Analysis Templates

1. Go to Settings → Analysis Templates
2. Click "Create Template"
3. Define your prompts:

```javascript
{
  "name": "Meeting Notes Analyzer",
  "prompts": [
    "Extract all action items and decisions",
    "Identify key participants and their contributions",
    "Summarize main topics discussed"
  ],
  "outputFormat": "structured"
}
```

## 🛠️ Troubleshooting

### Common Issues

#### "No files discovered"
- Check folder permissions
- Ensure file types are selected
- Try a different directory
- Look for exclude patterns

#### "Ollama not responding"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

#### "Analysis stuck"
- Check API provider status
- Verify API key is valid
- Try smaller batch size
- Check browser console (F12)

### Quick Fixes

1. **Clear cache**: `Ctrl+Shift+R`
2. **Reset state**: Settings → Advanced → Reset
3. **Check logs**: Press `Ctrl+L`
4. **Update browser**: Ensure latest version

## 🎨 Customization

### Theme Switching

Press `Ctrl+Shift+T` to cycle through themes:
- Dark (default)
- Light
- Midnight
- Solarized

### Custom Categories

Create meaningful categories:
- "🎯 Action Items"
- "💡 Ideas"
- "📊 Data Insights"
- "🔧 Technical Debt"
- "📝 Documentation"

### Workflow Automation

Save common workflows:
1. Create workflow in Settings
2. Name it (e.g., "Weekly Review")
3. Access via command palette

## 📊 Sample Workflows

### Research Project

```bash
1. Discover: /research/papers
2. Filter: relevance > 80%, type: pdf
3. Analyze: with "Academic Analysis" template
4. Categorize: by topic
5. Export: as structured JSON for citations
```

### Meeting Notes Processing

```bash
1. Discover: /meetings/2024
2. Filter: last 30 days
3. Analyze: extract action items
4. Categorize: by project
5. Export: as Markdown for wiki
```

### Code Documentation

```bash
1. Discover: /src
2. Filter: type: js, py
3. Analyze: with "Technical Docs" template
4. Categorize: by module
5. Export: as PDF documentation
```

## 🔗 Next Steps

1. **Read Full User Guide**: Comprehensive features and workflows
2. **Join Community**: Share templates and workflows
3. **Watch Video Tutorials**: Visual learning resources
4. **Explore Integrations**: Connect with your tools

## 💡 Pro Tips

1. **Use Ollama for privacy**: All processing stays local
2. **Create template library**: Save time with reusable templates
3. **Keyboard navigation**: Much faster than mouse
4. **Export regularly**: Backup your consolidated knowledge
5. **Share categories**: Export/import category sets with team

## 🆘 Get Help

- **In-app help**: Press `F1`
- **Documentation**: [docs.knowledgeconsolidator.com](https://docs.knowledgeconsolidator.com)
- **Community**: [forum.knowledgeconsolidator.com](https://forum.knowledgeconsolidator.com)
- **Support**: support@knowledgeconsolidator.com

---

**Remember**: KC V2 is designed for power users. Master the keyboard shortcuts and command palette for maximum efficiency!

*Happy Knowledge Consolidating! 🚀*