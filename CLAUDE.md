# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the specification for "Consolidador de Conhecimento Pessoal" (Personal Knowledge Consolidator) - an intelligent system for automated discovery, analysis, and structuring of decisive moments in personal knowledge bases.

**Vision:** Transform scattered knowledge into actionable insights, establishing a pre-structured foundation that will feed IA automation flows for internal project proposition and strategic decision-making.

## 🚨 PROTOCOLO DE INÍCIO DE SESSÃO OBRIGATÓRIO

**ATENÇÃO**: Existe um protocolo formal para início de sessão em `/INICIO-SESSAO.md`

Para evitar retrabalho (que já causou 3+ horas de perda), SEMPRE:
1. Leia este arquivo (CLAUDE.md) primeiro para entender as LEIS
2. Leia RESUME-STATUS.md para entender o estado atual
3. Siga as instruções em INICIO-SESSAO.md

**Comando padrão de início**:
```
Leia primeiro @CLAUDE.md para entender as LEIS do projeto, depois leia @RESUME-STATUS.md para entender o estado atual. O servidor Five Server já está rodando na porta 5500 (gerenciado pelo usuário conforme @docs/servidor.md). Acesse http://127.0.0.1:5500 e execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir.
```

# Estilo de Código
- Use ES modules (import/export)
- Destructuring quando possível
- Prefira const/let sobre var

# Workflow
- Sempre executar typechecking após mudanças
- Usar single tests para performance
- Criar feature branches do develop

## Server Maintenance Guidelines

### Procedimentos para Início de Sessão
- Ao iniciar a sessão Leia primeiro @CLAUDE.md para entender as LEIS do projeto
- Depois leia @RESUME-STATUS.md para entender o estado atual 
- O servidor Five Server já está rodando na porta 5500 (gerenciado pelo usuário conforme @docs/servidor.md)
- Acesse http://127.0.0.1:5500 
- Execute kcdiag() no console para verificar a saúde do sistema antes de prosseguir

<LEIS>
### LEIS do projeto

 0. Principios Básicos e Boas Práticas de Arquitetura de Software
    - Single Responsibility (Responsabilidade Única)
    - SSO - Single Source of Truth (FONTE ÚNICA DA VERDADE - Fontes de Dados Devem ser Centralizadas - Principios de Exemplo: LEI 11)
    - DRY - DONT REPEAT YOURSELF
    - KISS - KEEP SIMPLE, STUPID
    - YAGNI - You Aren't Gonna Need It
 1. NÃO MODIFICAR código que está funcionando
    - NUNCA utilizar dados STUB/MOCK. SEGUIR dados DE FONTES REAIS (Lei 0). CASO seja uma nova FUNÇÃO/COMPONENTE PARTE E PEÇA ORIENTAÇÃO.
 2. APENAS REMOVER as adições problemáticas identificadas
 3. ADICIONAR MINIMAMENTE apenas o listener necessário
 4. PRESERVAR todas as funcionalidades já homologadas
 5. PARA TESTAR Solicite feedback do usuário que esta com o Five Server em aberto paralelamente para Auditar o processo
 6. DOCUMENTAR cada mudança para auditoria e backlog das atividades, REGISTRAR SEMPRE utilizando a estrutura pré-existente criada para esta finalidade em /doc/sprint/
 7. SOLICITAR APROVAÇÃO do usuário antes de prosseguir COM QUALQUER ALTERAÇÃO no Código Original
 8. TODA ALTERAÇÃO APROVADA PARA ALTERAÇÃO DO CODIGO ORIGINAL CASO NECESSARIO DEVE SER CLONADO COMO COMENTÁRIO, ACIONAVEL para rollback caso seja identificado qualquer desvio ou QUEBRA DA APLICAÇÃO COMO MEDIDA PREVENTIVA SEGURA.
 9. COMPONENTIZAÇÃO MÁXIMA EXIGIDA para qualquer nova função criada como forma de ESTABELECER PADRAO PARA REUTILIZAÇÃO OBRIGATÓRIA DE COMPONENTES PRÉ EXISTENTES que ja estejam em produção como base para novo desenvolvimento.
 10. ANTES DE PLANEJAR QUALQUER NOVA ADIÇÃO OU REMOÇÃO é VITAL QUE SEJA FEITA A REVISÃO dos COMPONENTES ATUAIS. para Verificar se a funcionalidade planejada já não existe no sistema ou se pode ser utilizada como base para GARANTIR a estabilidade do sitema em FUNCIONAMENTO.
 11. CORELACIONAMENTO entre os componentes de BUSCA, ANALISE, CATEGORIZAÇÃO SÃO DE PRIORIDADE CRITICA PARA CONSISTENCIA DOS DADOS A PARTIR DA ETAPA 1. ITERE SEMPRE A IMPORTANCIA DE CORELACIONAR AS SUAS ACOES E EVENTOS DE FORMA RELACIONADA AOS EVENTOS PRE-EXISTENTES A PARTIR DE UMA FONTE UNICA CENTRALIZADA, Principios de Exemplo: @RESUME-STATUS.md sobre: Categorias.
 12. TRANSPARÊNCIA DE DADOS: Toda filtragem ou exclusão de arquivos DEVE ser:
     - Visível ao usuário (mostrar quantos foram excluídos e por quê)
     - Controlável (permitir desativar filtros/exclusões)
     - Reversível (permitir ver arquivos excluídos
     - NUNCA remover dados silenciosamente sem conhecimento do usuário

### 🚀 SPRINT FASE 2 - NOVOS SERVIÇOS IMPLEMENTADOS (17/01/2025)

#### ✅ EmbeddingService.js
- **Função**: Gera embeddings semânticos usando Ollama local
- **Modelo**: nomic-embed-text (768 dimensões)
- **Features**: Cache em IndexedDB, cálculo de similaridade, fallback para OpenAI
- **Localização**: `/js/services/EmbeddingService.js`

#### ✅ QdrantService.js
- **Função**: Integração com Qdrant Vector Database na VPS
- **Conexão**: http://qdr.vcia.com.br:6333 (via Tailscale)
- **Features**: CRUD completo, busca semântica, cache de resultados
- **Localização**: `/js/services/QdrantService.js`

### 💡 LIÇÕES APRENDIDAS - EVITANDO RETRABALHO ler /RESUME-STATUS.md

#### 🔴 Problema Recorrente #1: Criar código sem verificar existente
**Impacto**: 3+ horas de retrabalho na sessão de 15/01/2025  
**Causa**: FileRenderer já existia e funcionava, mas foi recriado  
**Solução**: SEMPRE ler código existente antes de criar novo  

#### 🔴 Problema Recorrente #2: Não emitir FILES_UPDATED
**Impacto**: Interface não atualiza, usuário pensa que está quebrado  
**Causa**: Apenas STATE_CHANGED era emitido  
**Solução**: SEMPRE emitir ambos eventos após modificar arquivos  

#### 🔴 Problema Recorrente #3: Modificar sem preservar original
**Impacto**: Quebra funcionalidades existentes  
**Causa**: Código original sobrescrito sem backup  
**Solução**: SEMPRE comentar original antes de modificar  

#### 🔴 Problema Recorrente #4: Dupla filtragem sem transparência
**Impacto**: 95 arquivos "desaparecem" sem explicação ao usuário  
**Causa**: FileRenderer aplica exclusões automáticas + FilterPanel pode ter filtros ativos  
**Solução**: SEMPRE dar controle e visibilidade ao usuário sobre filtros  

#### 🔴 Problema Recorrente #5: Sincronização entre componentes
**Impacto**: Categorias criadas em um componente não aparecem em outros  
**Causa**: Múltiplas fontes de verdade e falta de listeners de eventos  
**Solução**: Usar Manager centralizado + Event-Driven Architecture  
**Documentação**: `/docs/sprint/1.3/plano-acao-sincronizacao-categorias.md`

#### 🔴 Problema Recorrente #6: Construir "do telhado" sem fundação
**Impacto**: Sistema de triplas extraindo apenas metadados superficiais  
**Causa**: Tentativa de extração semântica sem embeddings/vetorização  
**Solução**: SEMPRE construir da fundação: Dados → Embeddings → Similaridade → Extração  
**Documentação**: `/docs/sprint/fase2/analise-arquitetural-bottomup.md`

### ✅ Padrão de Sucesso

```javascript
// 1. Verificar se existe
// 1.1 Revisar Leis aplicáveis 0 a 12
if (KC.ComponenteX) {
    // 2. Ler e entender
    // 3. Preservar original em comentário
    // 4. Modificar com cuidado
    // 5. Testar incrementalmente
    // 
}
```

### 📊 Métricas de Retrabalho

- **Tempo perdido médio por erro**: 1-3 horas
- **Principais causas**: Falta de contexto, não seguir LEIS
- **Solução**: Protocolo de início em INICIO-SESSAO.md

# Estilo de Código
- Use ES modules (import/export)
- Destructuring quando possível
- Prefira const/let sobre var
- Lei 0

# Workflow
- Sempre executar typechecking após mudanças
- Usar single tests para performance
- Criar feature branches do develop (CASO INDISPONIVEL, CRIE E COPIE TODA A ESTRUTURA ORIGINAL PARA UMA NOVA PASTA PARA HOMOLOGAÇÃO PARA MITIGAR QUEBRA DA APLICACAO/ROLLBACK)
- Lei 0
</LEIS>