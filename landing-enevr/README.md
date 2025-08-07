# Landing Page - enevr Solutions

## 🎯 Visão Geral

Landing page profissional para apresentação das soluções de IA da **enevr**, com foco especial no setor de saúde pública e dedetização.

## 🚀 Como Visualizar

### Opção 1: Servidor Local Python
```bash
cd landing-enevr
python -m http.server 8080
```
Acesse: http://localhost:8080

### Opção 2: Live Server (VS Code)
- Instale a extensão "Live Server"
- Clique com botão direito em `index.html`
- Selecione "Open with Live Server"

### Opção 3: Abrir Diretamente
- Navegue até a pasta `landing-enevr`
- Abra `index.html` no navegador

## 📁 Estrutura

```
landing-enevr/
├── index.html           # Página principal
├── css/
│   └── landing.css      # Estilos com identidade enevr
├── js/
│   └── landing.js       # Interações e animações
├── assets/
│   └── logo/
│       └── enevr-logo.png  # Logo da empresa
└── README.md            # Esta documentação
```

## 🎨 Identidade Visual

- **Cores Principais**:
  - Azul enevr: #3B82F6
  - Laranja enevr: #FB923C
  - Verde sucesso: #10B981
  - Cinza escuro: #1F2937

- **Tipografia**: 
  - System fonts para melhor performance
  - Hierarquia clara com pesos variados

## 📱 Recursos

### Seções da Landing Page

1. **Hero Section**
   - Título impactante com gradiente
   - CTAs principais (Demo + WhatsApp)
   - Visualização do ecossistema

2. **Problemas do Cliente**
   - Cards visuais dos desafios
   - Foco em saúde pública/dedetização

3. **Nossa Solução**
   - 4 pilares principais
   - Knowledge Consolidator como base

4. **Caso de Uso Específico**
   - Workflow visual passo a passo
   - Métricas de impacto reais

5. **Ecossistema Tecnológico**
   - Diagrama SVG interativo
   - Conexões animadas

6. **Stack Tecnológico**
   - Grid de tecnologias utilizadas
   - Ícones e descrições

7. **Resultados Comprovados**
   - Métricas animadas on scroll
   - Background com gradiente

8. **Call to Action**
   - Formulário de contato
   - Integração WhatsApp
   - Múltiplas opções de contato

### Funcionalidades

- ✅ **Responsivo**: Mobile-first design
- ✅ **Animações**: Smooth scroll e fade-in
- ✅ **Performance**: < 3s load time
- ✅ **SEO**: Meta tags otimizadas
- ✅ **Acessibilidade**: Semântica HTML5
- ✅ **Interatividade**: Form validation
- ✅ **WhatsApp**: Integração direta

## 📊 Métricas Destacadas

- **80%** redução no tempo de descoberta
- **20h/mês** economizadas por usuário
- **10x** aumento no valor dos dados
- **3 meses** para ROI completo

## 🔧 Personalização

### Alterar Informações de Contato

No arquivo `index.html`, procure e substitua:
- WhatsApp: `5511999999999`
- E-mail: `contato@enevr.com.br`

### Adicionar Google Analytics

Adicione antes do `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Personalizar Cores

Edite as variáveis CSS em `css/landing.css`:
```css
:root {
    --color-primary: #3B82F6;
    --color-secondary: #FB923C;
    /* ... outras cores ... */
}
```

## 📝 Formulário de Contato

O formulário está preparado para integração com backend. Atualmente:
- Valida campos no frontend
- Simula envio com feedback visual
- Oferece redirecionamento para WhatsApp
- Loga dados no console

Para integração real, conecte o handler em `js/landing.js`:
```javascript
// Line 65 - substituir setTimeout por fetch real
fetch('/api/contact', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
})
```

## 🚀 Deploy

### Opções de Hospedagem

1. **GitHub Pages** (Grátis)
2. **Netlify** (Grátis com SSL)
3. **Vercel** (Grátis com analytics)
4. **VPS próprio** (Controle total)

### Checklist Pré-Deploy

- [ ] Substituir números de WhatsApp
- [ ] Atualizar e-mail de contato
- [ ] Adicionar Google Analytics
- [ ] Comprimir imagens
- [ ] Minificar CSS/JS
- [ ] Testar em múltiplos dispositivos
- [ ] Verificar links e CTAs

## 📱 Compatibilidade

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## 🎯 Público-Alvo

Empresas do setor de saúde pública e serviços que buscam:
- Automatizar processos documentais
- Melhorar atendimento ao cliente
- Reduzir tempo operacional
- Garantir conformidade regulatória

## 📈 Métricas de Sucesso

- Taxa de conversão do formulário
- Cliques no WhatsApp
- Tempo na página
- Taxa de rejeição < 40%
- Engajamento com conteúdo interativo

## 🤝 Suporte

Para dúvidas ou personalizações:
- WhatsApp: (11) 99999-9999
- E-mail: contato@enevr.com.br

---

**© 2025 enevr - Soluções em Inteligência Artificial**