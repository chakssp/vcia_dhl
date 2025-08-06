# Problema de Indexação de Arquivos no Claude Code

## 📅 Identificado em: 28/01/2025

## 🔴 Descrição do Problema

Arquivos recém-criados no projeto não estão sendo indexados corretamente pelo Claude Code, impossibilitando o uso do símbolo @ para referenciá-los diretamente.

## 🔍 Sintomas

1. Arquivos criados durante a sessão não aparecem no autocomplete com @
2. Tentativas de referenciar com @ resultam em "arquivo não encontrado"
3. Os arquivos existem fisicamente (verificado com LS e Read)
4. O problema afeta principalmente arquivos em subpastas profundas

## 🛠️ Soluções Temporárias

### 1. Usar Caminho Completo
Em vez de:
```
@recursos-mcp-obrigatorios.md
```

Use:
```
F:\vcia-1307\vcia_dhl\docs\10-guias-operacionais\recursos-mcp-obrigatorios.md
```

### 2. Usar Comando Read
```javascript
Read({ file_path: "F:\\vcia-1307\\vcia_dhl\\docs\\10-guias-operacionais\\recursos-mcp-obrigatorios.md" })
```

### 3. Referenciar por Contexto
Mencione o arquivo no texto e peça para o Claude Code localizá-lo:
```
"No arquivo recursos-mcp-obrigatorios.md em docs/10-guias-operacionais/"
```

## 🔧 Possíveis Causas

1. **Cache do Claude Code**: O índice de arquivos pode não atualizar em tempo real
2. **Limitação de Profundidade**: Arquivos em subpastas muito profundas podem não ser indexados
3. **Tamanho do Projeto**: Com muitos arquivos, a indexação pode ser seletiva
4. **Sessão Longa**: Sessões muito longas podem ter problemas de sincronização

## 📋 Impacto no Desenvolvimento

- **Produtividade**: Reduz velocidade ao trabalhar com arquivos novos
- **Fluxo de Trabalho**: Interrompe o fluxo natural de desenvolvimento
- **Documentação**: Dificulta referências cruzadas em documentos

## 🚀 Recomendações

### Para Contornar:
1. Sempre verificar com LS se o arquivo foi criado
2. Usar caminhos completos quando @ não funcionar
3. Manter lista de arquivos importantes criados na sessão

### Para o Projeto:
1. Documentar arquivos criados em cada sessão
2. Criar índice manual de novos arquivos importantes
3. Usar os recursos MCP (Memory) para manter registro

## 📝 Exemplo de Workaround com MCP Memory

```javascript
// Registrar novo arquivo criado
await mcp__memory-serve__create_entities({
  entities: [{
    name: "recursos_mcp_obrigatorios_md",
    entityType: "Documentation",
    observations: [
      "Criado em 28/01/2025",
      "Path: /docs/10-guias-operacionais/recursos-mcp-obrigatorios.md",
      "Documenta Puppeteer, Memory e Sequential-Think",
      "Arquivo importante para consulta"
    ]
  }]
});

// Buscar depois
await mcp__memory-serve__search_nodes({ query: "recursos mcp" });
```

## ⚠️ Status

- **Severidade**: Média
- **Prioridade**: Baixa (existem workarounds)
- **Solução Definitiva**: Aguardando atualização do Claude Code

## 📌 Arquivos Afetados Nesta Sessão

1. `/docs/10-guias-operacionais/organizacao-arquivos-temporarios.md`
2. `/docs/10-guias-operacionais/estrutura-atualizada-projeto.md`
3. `/docs/10-guias-operacionais/validacao-rapida-sistema.md`
4. `/docs/10-guias-operacionais/recursos-mcp-obrigatorios.md`
5. `/docs/11-pendencias-revisao/problema-indexacao-arquivos.md` (este arquivo)