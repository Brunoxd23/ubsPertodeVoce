# Guia de Instalação e Execução no Windows (com VS Code e PowerShell)

Este guia orienta a inicialização completa da plataforma **UBS Perto de Você** em ambiente Windows utilizando o PowerShell e o Visual Studio Code.

---

## 1. Pré-requisitos no Windows

1. **Node.js**: Versão 20.x ou superior (testado e homologado no Node.js v24).
2. **NPM**: Versão 10.x ou superior.
3. **Git for Windows**.
4. *(Opcional)* **Docker Desktop para Windows** (caso deseje rodar a infraestrutura completa de contêineres PostGIS).

Para verificar os programas instalados, abra o PowerShell e execute:
```powershell
node -v
npm -v
git --version
```

---

## 2. Passo a Passo de Execução Local (Modo Standalone sem Docker)

O sistema conta com um **modo standalone imediato**, permitindo desenvolvimento e testes imediatos sem a obrigatoriedade do Docker estar instalado ou em execução.

### Passo 2.1 — Abrir o Projeto no VS Code
Abra a pasta do projeto no VS Code:
```powershell
code d:\Documentos\ubsPertoDeVoce
```

### Passo 2.2 — Configurar Variáveis de Ambiente
No diretório `backend`, verifique se o arquivo `.env` existe (ou copie a partir do `.env.example`):
```powershell
cd d:\Documentos\ubsPertoDeVoce\backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

### Passo 2.3 — Iniciar o Servidor Backend (Fastify)
Abra um terminal no PowerShell e execute:
```powershell
cd d:\Documentos\ubsPertoDeVoce\backend
npm run dev
```

Você verá a saída:
```
🏥 UBS Perto de Você - API REST v1.0.0 em execução!
🌐 Servidor: http://localhost:3333
📑 Documentação OpenAPI/Swagger: http://localhost:3333/docs
🩺 Health Check: http://localhost:3333/api/v1/health
📍 Endpoint UBS: http://localhost:3333/api/v1/ubs
```

### Passo 2.4 — Iniciar o Frontend (Vite + React)
Abra uma **segunda aba de terminal** no PowerShell do VS Code e execute:
```powershell
cd d:\Documentos\ubsPertoDeVoce\frontend
npm run dev
```

Acesse no navegador:
👉 **http://localhost:5173**

---

## 3. Execução dos Testes Automatizados

Para executar toda a bateria de testes automatizados com o Vitest:

### Testes do Backend
```powershell
cd d:\Documentos\ubsPertoDeVoce\backend
npm test
```

### Testes do Frontend
```powershell
cd d:\Documentos\ubsPertoDeVoce\frontend
npm test
```

### Executar rotina de importação de dados do CNES via CLI
```powershell
cd d:\Documentos\ubsPertoDeVoce\backend
npm run import:cnes
```

---

## 4. Execução Completa com Docker Compose (Ambiente de Produção Local)

Caso você possua o Docker Desktop instalado e deseje subir o banco de dados com PostGIS nativo:
```powershell
cd d:\Documentos\ubsPertoDeVoce
docker compose up -d --build
```

Serviços iniciados:
- Frontend Nginx: `http://localhost:80`
- Backend Fastify: `http://localhost:3333`
- PostgreSQL com PostGIS: `localhost:5432`
