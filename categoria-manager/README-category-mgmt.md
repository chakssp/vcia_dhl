# 🎯 Gerenciador de Categorias JSONL

Interface web moderna para importar, editar, criar e exportar categorias no formato JSONL.

## 📁 Estrutura do Projeto
```
categoria-manager/
├── index.html                   # Página principal
├── style.css                    # Estilos da aplicação
├── script.js                    # Lógica da aplicação
├── categories-exemplo.jsonl     # Arquivo de exemplo 1
├── categories-cliente2.jsonl    # Arquivo de exemplo 2 (para testar importação cumulativa)
└── README.md                    # Este arquivo
```

## 🚀 Como Usar

### 1. Configuração
1. Baixe todos os arquivos em uma pasta
2. Abra `index.html` no Chrome/Edge/Firefox
3. A aplicação carregará automaticamente

### 2. Importar Categorias
- **Arraste e solte** seu arquivo `.jsonl` na área de upload
- **OU** clique na área de upload para selecionar o arquivo
- **Importação cumulativa**: Múltiplos arquivos são somados (não substituídos)
- **Tratamento de duplicatas**: Escolha manter existentes ou sobrescrever
- **Para testar**: Use `categories-exemplo.jsonl` e depois `categories-cliente2.jsonl`

### 🔄 Importação Cumulativa
- **Primeira importação**: Carrega as categorias normalmente
- **Importações seguintes**: Adiciona às categorias existentes
- **Duplicatas detectadas**: Sistema pergunta o que fazer
- **Botão "Limpar"** (🗑️): Remove todas para começar do zero

### 3. Editar Categorias
- Clique em qualquer categoria da lista direita
- Os campos do formulário serão preenchidos automaticamente
- Modifique os valores e clique "Atualizar"

### 4. Criar Novas Categorias
- Clique no botão "Nova" para limpar o formulário
- Preencha os campos
- Clique "Salvar"

### 5. Exportar
- Clique "Exportar categories.jsonl" quando terminar
- O arquivo será baixado automaticamente

## 📝 Formato JSONL Suportado

Cada linha deve ser um objeto JSON válido:
```json
{"id":"exemplo","name":"exemplo","color":"#1e40af","icon":"🎯","segment":"default","active":true,"created":"2025-01-31T00:00:00Z"}
```

### Campos Obrigatórios:
- `id`: Identificador único (gerado automaticamente se não fornecido)
- `name`: Nome da categoria (normalizado automaticamente)

### Campos Opcionais:
- `color`: Cor hexadecimal (padrão: #1e40af)
- `icon`: Emoji do ícone (padrão: 🎯)
- `segment`: Segmento organizacional (padrão: default)
- `active`: Status ativo/inativo (padrão: true)
- `created`: Data de criação ISO (gerado automaticamente)

## ✨ Funcionalidades

### 🎨 Interface Moderna
- **Dark Mode** completo e acessível
- **Tipografia otimizada** para dislexia (fonte Inter)
- **Cores anti-fotosensibilidade** (contraste otimizado)
- **Interface responsiva** sem necessidade de scroll

### 🔧 Normalização Automática
- **Texto normalizado**: Remove acentos e converte para lowercase
- **IDs automáticos**: Gerados a partir do nome se não fornecido
- **Datas automáticas**: Timestamps ISO gerados automaticamente

### 🎯 Editor Visual Completo
- **Paleta de cores escura** otimizada para ícones
- **48 emojis populares** sempre visíveis
- **Campo segmento dinâmico** com autocomplete
- **Validação em tempo real**

### 💾 Import/Export Robusto
- **Drag & Drop** funcional
- **Importação cumulativa** - unifique categorias de múltiplos clientes
- **Detecção de duplicatas** com opções de tratamento
- **Validação de arquivo** com tratamento de erros
- **Limpeza automática** de caracteres problemáticos
- **Feedback detalhado** de erros de parsing

### 🔄 Unificação de Múltiplos Clientes
- **Importe o primeiro cliente** normalmente
- **Importe clientes adicionais** - categorias são somadas
- **Duplicatas inteligentes** - sistema detecta IDs iguais
- **Escolha flexível** - manter existentes ou sobrescrever
- **Botão limpar** - recomeçar quando necessário

## 🧪 Testando a Importação Cumulativa

1. **Primeira importação**:
   - Importe `categories-exemplo.jsonl`
   - Verá 9 categorias carregadas

2. **Segunda importação (cumulativa)**:
   - Importe `categories-cliente2.jsonl`  
   - Sistema pergunta sobre importação cumulativa
   - Clique **OK** para continuar
   - Sistema detecta 1 duplicata (`tecnico`)
   - Escolha **manter existente** ou **sobrescrever**

3. **Resultado**:
   - Total: ~15 categorias (dependendo da escolha de duplicatas)
   - Segmentos: Combinados dos dois arquivos
   - Botão 🗑️ aparece para limpar tudo

4. **Limpeza**:
   - Clique no botão 🗑️ para começar do zero
   - Confirme a ação
   - Lista volta ao estado inicial

## 🐛 Solução de Problemas

### Clique na área de upload não funciona
- Abra o Console (F12) e veja se há erros
- Verifique se todos os arquivos estão na mesma pasta
- Teste em outro navegador

### Erro de parsing JSON
- Verifique se cada linha é um JSON válido
- Use o arquivo `categories-exemplo.jsonl` para testar
- Certifique-se que não há linhas vazias no meio do arquivo

### Ícones não aparecem
- Os ícones agora são SVGs nativos (sem dependências)
- Se ainda não aparecem, verifique o Console (F12)

### Importação cumulativa não funcionando
- Verifique se aparece o aviso sobre categorias existentes
- Se não aparecer, abra o Console (F12) e veja erros
- Teste com arquivos pequenos primeiro

### Muitas duplicatas detectadas
- **IDs únicos**: Cada categoria precisa de um ID único
- **Manter existentes**: Escolha se quer preservar dados atuais  
- **Sobrescrever**: Use quando quiser atualizar categorias existentes

### Botão limpar não aparece
- O botão 🗑️ só aparece quando há categorias carregadas
- Se não aparecer, verifique se a lista está vazia

### Acentos não são removidos
- A normalização é automática durante a digitação
- Arquivos importados também são normalizados

## 🎨 Paleta de Cores Disponível

Cores escuras otimizadas para visibilidade dos ícones:
- `#1e40af` - Azul escuro
- `#4E1963` - Roxo escuro  
- `#875F2C` - Marrom escuro
- `#08728F` - Teal escuro
- `#7c2d12` - Vermelho terroso
- E mais 13 cores harmônicas

## 🔧 Desenvolvimento

### Tecnologias Utilizadas
- **HTML5** com semântica moderna
- **CSS3** com Grid e Flexbox
- **JavaScript ES6+** vanilla (sem frameworks)
- **SVGs inline** para ícones (zero dependências)

### Compatibilidade
- ✅ Chrome 80+
- ✅ Firefox 75+  
- ✅ Safari 13+
- ✅ Edge 80+

### Estrutura do Código
- **Separação clara** de responsabilidades
- **Event listeners robustos** com tratamento de erro
- **Logging detalhado** para debug
- **Validação consistente** em todas as operações

## 📄 Licença

Código livre para uso pessoal e comercial.

---

**💡 Nova Funcionalidade:** Importação cumulativa para unificar categorias de múltiplos clientes! Ideal para consolidar bases de dados e criar categorias unificadas.

**Dúvidas?** Abra o Console do navegador (F12) para ver logs detalhados de debug!