# 📂 Valorização de Categorias Humanas

Esta pasta contém toda documentação relacionada à **valorização da curadoria humana** através do sistema de categorias.

## 🎯 Objetivo Principal
Transformar categorias manuais em valor semântico real, reconhecendo a importância da curadoria humana no processo de consolidação de conhecimento.

## 📄 Documentos Principais

### mudancas-criticas-implementadas.md
- **Fase 1** do plano de ação
- 3 mudanças críticas implementadas em 24/07/2025
- Ollama como padrão, zero threshold para categorizados, boost de relevância

## 🔧 Implementações Técnicas

1. **Boost de Relevância**
   - Fórmula: 1.5 + (0.1 × número_categorias)
   - Aplicado em 3 pontos do sistema

2. **Zero Threshold**
   - Arquivos categorizados sempre vão para Qdrant
   - Categorização = validação humana valiosa

## 🔍 Como Referenciar
```
@01-valorizacao-categorias-humanas/mudancas-criticas-implementadas.md
```