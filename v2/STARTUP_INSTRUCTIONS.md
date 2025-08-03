# 🚀 KNOWLEDGE CONSOLIDATOR V2 - STARTUP INSTRUCTIONS

## ✅ Quick Start (Windows)

### Option 1: Automatic Startup (Recommended)
```batch
START_KC_V2.bat
```
This will:
- Integrate all multi-agent files (if first time)
- Install dependencies (if needed)
- Start the server
- Open your browser automatically

### Option 2: Manual Steps
1. **Run Integration** (first time only):
   ```batch
   integrate_agents.bat
   ```

2. **Install Dependencies** (optional):
   ```batch
   npm install
   ```

3. **Start the Server**:
   ```batch
   npm run dev
   ```
   Or without npm:
   ```batch
   python -m http.server 3000
   ```

4. **Open Browser**:
   Navigate to `http://localhost:3000`

---

## 🎮 Using KC V2

### Essential Keyboard Shortcuts
- **Ctrl+K** - Open Command Palette (fuzzy search everything)
- **Ctrl+1** - Discovery View
- **Ctrl+2** - Analysis View  
- **Ctrl+3** - Organization View
- **Ctrl+4** - Export View
- **Ctrl+,** - Settings
- **Ctrl+`** - Toggle Terminal
- **Ctrl+L** - View Logs
- **Ctrl+S** - Statistics

### Power User Features
1. **Command Palette**: Type to search files, commands, or navigate
2. **Terminal**: Execute commands directly in the interface
3. **Multi-Theme**: Switch between dark, light, midnight, and solarized
4. **V1 Compatibility**: Automatically loads V1 data if available

---

## 🔧 Troubleshooting

### Server won't start?
1. Make sure you're in the `v2` directory
2. Try Python server: `python -m http.server 3000`
3. Check if port 3000 is available

### Missing components?
1. Run `integrate_agents.bat` again
2. Check if `_parallel_workspaces` folder exists

### V1 data not loading?
1. Ensure V1 is accessible at parent directory
2. Check browser console for errors
3. Use manual import in Settings view

---

## 📊 System Status Check

Once running, check these indicators:
- **Status Bar** (top) - Should show "API: Online"
- **Terminal** (bottom) - Should be responsive to commands
- **Navigation** (left) - All views should be clickable

---

## 🎯 First Steps in V2

1. **Discovery**: Click "Select Directory" to choose files
2. **Analysis**: Process files with AI analysis
3. **Organization**: Categorize and tag results
4. **Export**: Generate outputs in multiple formats

---

## 💡 Pro Tips

- Use **Tab** to navigate between UI elements
- Press **Esc** to close modals and palettes
- Type `/` in terminal for command help
- Hold **Shift** while clicking for multi-select

---

**Ready to go!** Run `START_KC_V2.bat` and enjoy the power user experience! 🚀