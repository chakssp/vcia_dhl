# 📐 UI Specifications v1.0 - Intelligence Lab
## Documentação de Especificações de Interface

**Data de Criação**: 29/07/2025  
**Versão**: 1.0  
**Objetivo**: Maximizar espaço para dados estratégicos, reduzindo elementos de navegação

---

## 🎯 Princípios de Design

### Problema Original
- Elementos de navegação ocupavam ~30% do espaço útil
- Botões e menus com tamanho desproporcional
- Foco desviado dos dados estratégicos

### Solução Implementada
- **Redução Geral**: 25-40% em todos os elementos de UI
- **Priorização**: Dados > Navegação > Decoração
- **Densidade**: Interface mais compacta sem sacrificar legibilidade

---

## 📏 Especificações Detalhadas

### 1. Layout Principal

#### Container
```css
/* ANTES */
.container {
    max-width: 1400px;
    padding: 0 20px;
}

/* DEPOIS - v1.0 */
.container {
    max-width: 1600px;  /* +200px para mais conteúdo */
    padding: 0 10px;    /* -50% padding lateral */
}
```

#### Grid Principal
```css
/* ANTES */
.main-layout {
    grid-template-columns: 250px 1fr;  /* Sidebar larga */
    gap: 1rem;
    margin-top: 1rem;
}

/* DEPOIS - v1.0 */
.main-layout {
    grid-template-columns: 180px 1fr;  /* -28% largura sidebar */
    gap: 0.5rem;                       /* -50% espaçamento */
    margin-top: 0.5rem;
}
```

### 2. Header

```css
/* ANTES */
.header {
    padding: 1rem 0;
}
.logo {
    font-size: 1.5rem;
}

/* DEPOIS - v1.0 */
.header {
    padding: 0.5rem 0;    /* -50% padding */
}
.logo {
    font-size: 1.125rem;  /* -25% tamanho */
}
```

### 3. Sidebar

#### Dimensões
```css
/* ANTES */
.sidebar {
    width: 250px;
    padding: 1.5rem;
}

/* DEPOIS - v1.0 */
.sidebar {
    width: 180px;    /* -28% largura */
    padding: 1rem;   /* -33% padding */
}
```

#### Elementos de Navegação
```css
/* ANTES */
.nav-item {
    padding: 0.75rem 1rem;
    font-size: 1rem;
}
.sidebar h3 {
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
}

/* DEPOIS - v1.0 */
.nav-item {
    padding: 0.5rem 0.75rem;  /* -33% padding */
    font-size: 0.875rem;      /* -12.5% fonte */
}
.sidebar h3 {
    font-size: 0.625rem;      /* -28% fonte */
    margin-bottom: 0.375rem;  /* -50% margem */
}
```

### 4. Área de Conteúdo

#### Content Container
```css
/* ANTES */
.content {
    padding: 2rem;
}
.content-header {
    margin-bottom: 1.5rem;
}
.content-header h2 {
    font-size: 1.75rem;
}

/* DEPOIS - v1.0 */
.content {
    padding: 1.5rem;          /* -25% padding */
}
.content-header {
    margin-bottom: 0.75rem;   /* -50% margem */
}
.content-header h2 {
    font-size: 1.125rem;      /* -36% fonte */
}
```

### 5. Cards e Métricas

#### Cards
```css
/* ANTES */
.card {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
}
.card h3 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
}

/* DEPOIS - v1.0 */
.card {
    padding: 0.75rem;         /* -40% padding */
    margin-bottom: 0.75rem;   /* -40% margem */
}
.card h3 {
    font-size: 0.875rem;      /* -30% fonte */
    margin-bottom: 0.5rem;    /* -50% margem */
}
```

#### Metric Cards
```css
/* ANTES */
.metrics-grid {
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.metric-card {
    padding: 1.25rem;
}
.metric-value {
    font-size: 2rem;
}

/* DEPOIS - v1.0 */
.metrics-grid {
    gap: 0.5rem;              /* -50% gap */
    margin-bottom: 0.875rem;  /* -42% margem */
}
.metric-card {
    padding: 0.625rem;        /* -50% padding */
}
.metric-value {
    font-size: 1.25rem;       /* -37.5% fonte */
}
```

### 6. Botões

```css
/* ANTES */
.btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
}

/* DEPOIS - v1.0 */
.btn {
    padding: 0.5rem 0.875rem;  /* -33% vertical, -42% horizontal */
    font-size: 0.8125rem;      /* -7% fonte */
}
```

### 7. Modais

```css
/* ANTES */
.modal-content {
    margin: 5% auto;
    padding: 2rem;
    max-width: 600px;
    max-height: 80vh;
}

/* DEPOIS - v1.0 */
.modal-content {
    margin: 2% auto;          /* Mais espaço vertical */
    padding: 1rem;            /* -50% padding */
    max-width: 700px;         /* +100px largura */
    max-height: 90vh;         /* +10% altura */
}
```

### 8. Filtros

```css
/* ANTES */
.filters {
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.filter-group input {
    padding: 0.625rem;
    font-size: 0.875rem;
}

/* DEPOIS - v1.0 */
.filters {
    gap: 0.75rem;             /* -25% gap */
    margin-bottom: 1rem;      /* -33% margem */
}
.filter-group input {
    padding: 0.375rem 0.5rem; /* -40% padding */
    font-size: 0.75rem;       /* -14% fonte */
}
```

### 9. Visualização

```css
/* ANTES */
#visualization-container {
    height: 600px;
    margin-top: 1.5rem;
}

/* DEPOIS - v1.0 */
#visualization-container {
    height: 700px;            /* +100px altura */
    margin-top: 0.5rem;       /* -67% margem */
}
```

---

## 🎨 Sistema de Cores (Dark Mode)

### Paleta Base
```css
:root {
    /* Base - Cinza suave para fotossensibilidade */
    --bg-base: #2a2d33;        /* Fundo principal */
    --bg-elevated: #33373f;    /* Cards e elementos */
    --bg-hover: #3d424b;       /* Estados hover */
    --bg-modal: #373b44;       /* Modais */
    
    /* Bordas com espessura 2.5px */
    --border-default: #484d58;
    --border-light: #3d424b;
    --border-focus: #5b8def;
}
```

### Cores por Categoria (2.5px borders)
```css
/* Análise semântica com cores específicas */
--cat-breakthrough: #7c3aed;    /* Roxo - Breakthrough Técnico */
--cat-evolution: #2563eb;       /* Azul - Evolução Conceitual */
--cat-moment: #dc2626;          /* Vermelho - Momento Decisivo */
--cat-insight: #059669;         /* Verde - Insight Estratégico */
--cat-learning: #d97706;        /* Laranja - Aprendizado Geral */
```

---

## 📊 Comparação de Economia de Espaço

### Antes vs Depois
| Elemento | Antes | Depois | Redução |
|----------|-------|--------|---------|
| Sidebar | 250px | 180px | 28% |
| Header Height | ~80px | ~50px | 37.5% |
| Content Padding | 2rem | 1.5rem | 25% |
| Button Padding | 0.75rem 1.5rem | 0.5rem 0.875rem | 38% |
| Card Padding | 1.25rem | 0.75rem | 40% |
| Modal Padding | 2rem | 1rem | 50% |

### Ganho de Espaço Útil
- **Horizontal**: +70px (sidebar) + 20px (padding) = **90px extras**
- **Vertical**: +30px (header) + 100px (visualization) = **130px extras**
- **Total**: Aproximadamente **+25% mais espaço** para dados

---

## 🔧 Guia de Personalização

### Para Aumentar Densidade
```css
/* Reduza estes valores em 10-20% */
--spacing-unit: 0.25rem;  /* Use múltiplos deste valor */
--font-scale: 0.875;      /* Multiplique tamanhos de fonte */
--padding-scale: 0.75;    /* Multiplique paddings */
```

### Para Reduzir Densidade
```css
/* Aumente estes valores em 10-20% */
--spacing-unit: 0.5rem;
--font-scale: 1.125;
--padding-scale: 1.25;
```

### Modo Compacto Extremo
```css
/* Para displays de alta resolução */
.compact-mode {
    --sidebar-width: 150px;
    --base-padding: 0.375rem;
    --base-font: 0.625rem;
}
```

---

## 📝 Notas de Implementação

### Decisões Importantes
1. **Sidebar fixa em 180px**: Compromisso entre navegação e espaço
2. **Fontes mínimas de 0.625rem**: Limite de legibilidade
3. **Padding mínimo de 0.375rem**: Necessário para cliques precisos
4. **Bordas de 2.5px**: Visibilidade em categorias coloridas

### Compatibilidade
- Testado em resoluções: 1366x768 até 4K
- Suporte para zoom do navegador: 75% - 125%
- Acessibilidade: Mantém contraste WCAG AA

### Performance
- CSS Variables para mudanças dinâmicas
- Sem JavaScript para layout básico
- Transições limitadas a 0.2s

---

## 🚀 Próximas Versões

### v1.1 (Planejado)
- [ ] Modo ultra-compacto toggle
- [ ] Sidebar colapsável
- [ ] Densidade adaptativa por viewport

### v2.0 (Futuro)
- [ ] Temas personalizáveis
- [ ] Grid system responsivo
- [ ] Componentes modulares

---

## 📚 Referências Rápidas

### Classes de Espaçamento
```css
.p-xs { padding: 0.375rem; }    /* Extra small */
.p-sm { padding: 0.5rem; }       /* Small */
.p-md { padding: 0.75rem; }      /* Medium */
.p-lg { padding: 1rem; }         /* Large */
```

### Breakpoints Sugeridos
```css
@media (max-width: 1366px) { /* Laptops */ }
@media (max-width: 1024px) { /* Tablets */ }
@media (max-width: 768px)  { /* Mobile */ }
```

---

**Mantido por**: Intelligence Lab Team  
**Última Atualização**: 29/07/2025