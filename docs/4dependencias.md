🔧 DEPENDÊNCIAS E CONFIGURAÇÕES

  Dependências de Desenvolvimento

  {
    "name": "knowledge-consolidator",
    "version": "1.0.0",
    "description": "Consolidador de Conhecimento Pessoal - SPRINT 1",
    "scripts": {
      "serve": "python -m http.server 8080",
      "build": "echo 'No build required - vanilla JS'",
      "lint": "eslint js/**/*.js",
      "format": "prettier --write '**/*.{js,css,html}'"
    },
    "devDependencies": {
      "eslint": "^8.45.0",
      "prettier": "^3.0.0"
    }
  }

  Configuração ESLint (.eslintrc.json)

  {
    "env": {
      "browser": true,
      "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
      "ecmaVersion": "latest",
      "sourceType": "module"
    },
    "rules": {
      "no-unused-vars": "warn",
      "no-console": "off"
    }
  }

  Configuração Git (.gitignore)

  node_modules/
  *.log
  .DS_Store
  .env
  dist/
  temp/
  *.tmp
  config/local.json