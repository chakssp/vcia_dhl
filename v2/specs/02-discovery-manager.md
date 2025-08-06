# 02 - DiscoveryManager Enhanced Spec

## Status: ✅ APROVADO COM EXPANSÃO

### Ordem de Implementação: 2/8

### Componentes
- **DE:** `/js/managers/DiscoveryManager.js`
- **PARA:** `/v2/js/managers/DiscoveryManager.js`

### Nova Arquitetura: 2 Campos Únicos

#### ➕ INCLUIR (Patterns de Inclusão)
```
/.claude/
/.vscode/
/.obsidian/
*.eml
*.md, *.txt, *.docx, *.pdf, *.gdoc
```

#### ➖ EXCLUIR (Patterns de Exclusão)
```
*/node/*
*/npm/*
*/node_modules/*README*
*/node_modules/*txt*
*/node_modules/*md*
*/node_modules/*docx*
*/node_modules/*pdf*
temp, cache, backup, .git, .trash
```

### Features Novas
1. **Interface com Caminho Absoluto**
   - Checkbox para seleção múltipla
   - Caminho completo clicável
   - Botão "Copiar Caminho"
   - Context menu para adicionar aos patterns

2. **Content Parsers**
   - PDF: PDF.js ou Docling API
   - DOCX: mammoth.js
   - EML: emailjs-mime-parser
   - Diretórios especiais (.claude/, .vscode/)

3. **Pattern Matcher Avançado**
   - Suporte a glob patterns (*, **, ?)
   - Prioridade: Exclusões > Inclusões
   - UI para edição visual dos patterns

### Integração V2
- Conectar ao botão "Discover" do PowerApp
- Emitir eventos para atualizar lista
- Salvar patterns no novo sistema de persistência

### Roadmap Futuro
- Gmail API, Outlook/Exchange
- Google Drive, OneDrive
- Notion API, Slack exports
- Apache Tika para multi-formato

### Próximo: [03-filter-manager.md](./03-filter-manager.md)