# Consolidador de Conhecimento Pessoal

Sistema inteligente para descoberta, análise e estruturação automatizada de momentos decisivos em bases de conhecimento pessoal.

## 🎯 Objetivo

Transformar conhecimento disperso em insights acionáveis, estabelecendo uma base pré-estruturada que alimentará fluxos de automação IA para proposição de projetos internos e tomada de decisões estratégicas.

## 🚀 Características Principais

- **Descoberta Automática**: Varre diretórios em busca de arquivos relevantes
- **Preview Inteligente**: Economia de 70% em tokens através de extração otimizada
- **Análise IA Seletiva**: Identificação de momentos decisivos e insights
- **Exportação RAG-Ready**: Preparado para integração com Qdrant, PostgreSQL e Redis

## 📋 Pré-requisitos

- Navegador moderno com suporte a ES6+
- Python 3 (para servidor de desenvolvimento) ou Node.js
- Sem dependências externas em produção

## 🛠️ Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/knowledge-consolidator.git
cd knowledge-consolidator
```

2. Instale as dependências de desenvolvimento (opcional)
```bash
npm install
```

3. Inicie o servidor de desenvolvimento
```bash
npm run serve
# ou
python3 -m http.server 8080
```

4. Acesse http://localhost:8080

## 🏗️ Arquitetura

O sistema utiliza arquitetura modular com vanilla JavaScript:

```
window.KnowledgeConsolidator = {
  AppState: {},        // Estado global
  AppController: {},   // Controle principal
  ConfigManager: {},   // Configurações
  DiscoveryManager: {},// Descoberta de arquivos
  AnalysisManager: {}, // Análise IA
  ExportManager: {},   // Exportação
  // ... outros módulos
};
```

## 📱 Workflow de 4 Etapas

1. **Descoberta Automática**: Configure padrões e diretórios
2. **Pré-Análise Local**: Filtros e relevância com preview
3. **Análise IA Seletiva**: Processamento inteligente
4. **Organização e Exportação**: Categorização e formatos múltiplos

## 🔧 Desenvolvimento

### Scripts Disponíveis

- `npm run serve`: Inicia servidor de desenvolvimento
- `npm run lint`: Verifica código com ESLint
- `npm run format`: Formata código com Prettier

### Estrutura de Pastas

```
├── css/         # Estilos organizados por componente
├── js/          # Código JavaScript modular
│   ├── core/    # Núcleo da aplicação
│   ├── managers/# Gerenciadores funcionais
│   └── utils/   # Utilitários
├── assets/      # Recursos estáticos
└── config/      # Configurações
```

## 📊 Performance

- Carregamento inicial: < 2s
- Resposta de filtros: < 500ms
- Suporte para 1000+ arquivos

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: Nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🔮 Roadmap

- **SPRINT 1** ✅: Sistema base com exportação RAG
- **SPRINT 2** 🔄: Integração com stack RAG (Ollama + N8N + Qdrant)
- **SPRINT 3** 📅: Inteligência avançada e predições