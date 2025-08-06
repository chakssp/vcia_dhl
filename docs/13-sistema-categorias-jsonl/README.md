# Sistema de Categorias JSONL

## 📋 Visão Geral

O sistema de categorias agora usa um arquivo `categories.jsonl` como fonte única de verdade, permitindo:

1. **Persistência Independente**: Categorias sobrevivem a hard reset do navegador
2. **Configuração por Segmento**: Diferentes conjuntos de categorias para diferentes clientes
3. **Compartilhamento Fácil**: Arquivo pode ser versionado e compartilhado
4. **Backup Automático**: Sistema mantém backup no localStorage

## 🔧 Como Funciona

### Inicialização
1. Sistema tenta carregar `categories.jsonl` ao iniciar
2. Se arquivo existe, usa como fonte única de verdade
3. Se não existe, usa categorias padrão do código

### Auto-Save
Quando você adiciona ou remove categorias pela interface:
1. Sistema gera novo conteúdo JSONL
2. Exibe no console para você copiar
3. Salva backup no localStorage
4. **IMPORTANTE**: Você precisa atualizar manualmente o arquivo `categories.jsonl`

## 📁 Estrutura do Arquivo

```jsonl
{"id":"tecnico","name":"Técnico","color":"#4f46e5","icon":"🔧","segment":"default","active":true,"created":"2025-01-31T00:00:00Z"}
{"id":"juridico","name":"Jurídico","color":"#1e40af","icon":"⚖️","segment":"legal","active":false,"created":"2025-01-31T00:00:00Z"}
```

### Campos:
- `id`: Identificador único (gerado do nome)
- `name`: Nome de exibição
- `color`: Cor em hexadecimal
- `icon`: Emoji representativo
- `segment`: Segmento/cliente (default, legal, finance, etc.)
- `active`: Se está ativo no sistema
- `created`: Data de criação
- `custom`: (opcional) Se é categoria customizada

## 🎯 Segmentos Disponíveis

- `default`: Categorias padrão do sistema
- `legal`: Para clientes jurídicos
- `finance`: Para clientes financeiros
- `business`: Para clientes de negócios
- `academic`: Para clientes acadêmicos
- `custom`: Categorias criadas pelo usuário

## 💡 Casos de Uso

### 1. Cliente Jurídico
```javascript
// Ativar apenas categorias do segmento legal
KC.CategoryManager.activateSegment('legal', true);
```

### 2. Adicionar Nova Categoria
1. Use interface (+Nova Categoria)
2. Copie conteúdo do console
3. Atualize arquivo `categories.jsonl`

### 3. Remover Categoria
1. Clique no X na interface
2. Copie conteúdo atualizado do console
3. Substitua arquivo `categories.jsonl`

### 4. Backup Manual
```javascript
// Baixar arquivo atual
KC.CategoryManager.downloadJSONLFile('categories_backup_2025.jsonl');
```

## 🔄 Workflow Recomendado

1. **Desenvolvimento**: Use interface para criar/remover categorias
2. **Console**: Copie conteúdo JSONL gerado
3. **Arquivo**: Atualize `categories.jsonl` manualmente
4. **Commit**: Versione arquivo no Git
5. **Deploy**: Arquivo vai junto com aplicação

## ⚠️ Considerações

1. **Arquivo Local**: Por ser arquivo estático, precisa atualização manual
2. **Backup Automático**: localStorage mantém última versão como backup
3. **Versionamento**: Use Git para rastrear mudanças
4. **Segmentos**: Ative apenas o necessário para cada cliente

## 🚀 Próximas Melhorias (Futuras)

1. ~~**API de Persistência**~~: Basta apenas `Botão "EasterEgg" para acionar evento -> KC.CategoryManager.downloadJSONLFile('categories_backup_2025.jsonl');` Salvar arquivo local e substituir no backend em uso. Adicione `1 linha` para ativação por perfil exemplo:
```xml-like
<vcia.cat profile=2>
{
    1 {
        ["id":"contrato","name":"Contratos","color":"#1e40af","icon":"📄","segment":"legal","active":true],
        ["id":"processo","name":"Processos","color":"#dc2626","icon":"⚖️","segment":"legal","active":true]
    },
    2 {
        ["id":"contrato","name":"Contratos","color":"#1e40af","icon":"📄","segment":"legal","active":true],
        ["id":"processo","name":"Processos","color":"#dc2626","icon":"⚖️","segment":"legal","active":true]
    }
}
</vcia.cat>
```
    
2. **UI de Segmentos**: Interface para ativar/desativar segmentos
3. **Import/Export Visual**: Modal para gerenciar arquivos
4. **Sync Automático**: Sincronização com servidor

## 📝 Exemplo de Uso por Cliente

### Cliente A - Escritório de Advocacia
```jsonl
{"id":"contrato","name":"Contratos","color":"#1e40af","icon":"📄","segment":"legal","active":true}
{"id":"processo","name":"Processos","color":"#dc2626","icon":"⚖️","segment":"legal","active":true}
{"id":"parecer","name":"Pareceres","color":"#059669","icon":"📋","segment":"legal","active":true}
```

### Cliente B - Consultoria Financeira
```jsonl
{"id":"analise","name":"Análises","color":"#16a34a","icon":"📊","segment":"finance","active":true}
{"id":"relatorio","name":"Relatórios","color":"#0891b2","icon":"📈","segment":"finance","active":true}
{"id":"investimento","name":"Investimentos","color":"#f59e0b","icon":"💰","segment":"finance","active":true}
```

## 🔍 Debug

```javascript
// Ver categorias carregadas
KC.CategoryManager.getCategories()

// Ver segmentos disponíveis
KC.CategoryManager.getAvailableSegments()

// Ver backup no localStorage
localStorage.getItem('categories_jsonl_backup')
```