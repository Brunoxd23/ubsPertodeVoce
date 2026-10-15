# UBS Perto de Você — Plataforma Nacional de Localização de Unidades Básicas de Saúde

[![CI](https://github.com/governo-aberto/ubs-perto-de-voce/actions/workflows/ci.yml/badge.svg)](https://github.com/governo-aberto/ubs-perto-de-voce/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-emerald.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-strict%20mode-blue.svg)](https://www.typescriptlang.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4%20(SRID%204326)-0064a5.svg)](https://postgis.net/)
[![Fastify](https://img.shields.io/badge/Fastify-v4-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38bdf8.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-OpenStreetMap-199900.svg)](https://leafletjs.com/)
[![LGPD](https://img.shields.io/badge/LGPD-Compliant-success.svg)](docs/PRIVACIDADE_LGPD.md)

---

## 🎯 Sobre a Plataforma

O **UBS Perto de Você** é uma aplicação web completa, moderna, acessível e segura, projetada para conectar os cidadãos brasileiros à rede de Atenção Básica de Saúde do SUS.

A plataforma combina **geolocalização espacial de alta precisão (PostGIS SRID 4326 e Leaflet)** com dados abertos oficiais do **Cadastro Nacional de Estabelecimentos de Saúde (CNES / DATASUS / Ministério da Saúde)**.

### ✨ Principais Recursos
* 📍 **Geolocalização Voluntária com Consentimento Explícito**: localize UBS próximas com um clique, sem exigir GPS para uso da plataforma.
* 🔍 **Pesquisa Manual Multifiltro**: consulte unidades por Município, UF, Bairro, Endereço ou CEP.
* 🗺️ **Mapa Interativo com Leaflet e OpenStreetMap**: marcadores estilizados, visualização clara em dispositivos móveis e desktops.
* 📏 **Cálculo Geodésico de Distância**: ordenação decrescente por proximidade real em quilômetros.
* 🚗 **Integração com Serviços Externos de Rotas**: botões diretos para Google Maps, Waze e OpenStreetMap.
* 🌓 **Modo Escuro / Claro Automático**: alternância dinâmica com paleta verde SUS profissional.
* ♿ **Acessibilidade WCAG 2.2 AA**: contrastes adequados, navegação por teclado e suporte a leitores de tela.
* 🔒 **Segurança & LGPD (Secure by Design)**:
  * Sanitização de logs operacionais com redação automática de coordenadas geográficas (`lat=[REDACTED_LGPD]`).
  * Rate Limiting por IP para prevenção contra DoS e abuso.
  * Headers HTTP de proteção (Helmet, CSP, CORS restrito).
  * Consultas parametrizadas contra injeção SQL.

---

## 🏛️ Arquitetura da Solução

```
+-------------------------------------------------------------+
|                      Camada de Apresentação                 |
|             (React 18 + Vite + Tailwind + Leaflet)          |
+------------------------------+------------------------------+
                               | HTTPS / REST (JSON)
+------------------------------v------------------------------+
|                     API Gateway & Segurança                  |
|          (Fastify + Helmet + CORS + RateLimit + Zod)        |
+------------------------------+------------------------------+
                               | Injeção de Dependência
+------------------------------v------------------------------+
|                     Camada de Negócio e Domínio             |
|              (UbsService + CnesValidator + Importer)        |
+------------------------------+------------------------------+
                               | Abstração de Repositório
+------------------------------v------------------------------+
|                  Camada de Persistência Geoespacial         |
|     +-------------------------------------------------+     |
|     |  PostgreSQL 16 + PostGIS 3.4 (SRID 4326 / GiST) |     |
|     |  Fallback Standalone em Memória / Haversine     |     |
|     +-------------------------------------------------+     |
+-------------------------------------------------------------+
```

Documentação arquitetural detalhada em: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

---

## 🚀 Como Executar Localmente

### Opção 1: Execução Imediata no Windows (com Node.js, sem Docker obrigatório)

1. **Instalar dependências**:
   ```powershell
   cd d:\Documentos\ubsPertoDeVoce\backend
   npm install
   
   cd d:\Documentos\ubsPertoDeVoce\frontend
   npm install
   ```

2. **Iniciar o Backend**:
   ```powershell
   cd d:\Documentos\ubsPertoDeVoce\backend
   npm run dev
   ```
   *Servidor rodando em: `http://localhost:3333`*
   *Documentação Swagger UI interativa: `http://localhost:3333/docs`*

3. **Iniciar o Frontend**:
   ```powershell
   cd d:\Documentos\ubsPertoDeVoce\frontend
   npm run dev
   ```
   *Acesse no navegador: `http://localhost:5173`*

Consulte o passo a passo completo no Windows com PowerShell em: [docs/GUIA_EXECUCAO_WINDOWS.md](docs/GUIA_EXECUCAO_WINDOWS.md).

---

### Opção 2: Execução com Docker Compose (PostgreSQL com PostGIS)

```bash
docker compose up -d --build
```
* **Frontend**: [http://localhost:80](http://localhost:80)
* **API Backend**: [http://localhost:3333](http://localhost:3333)
* **Swagger OpenAPI**: [http://localhost:3333/docs](http://localhost:3333/docs)
* **PostgreSQL + PostGIS**: `localhost:5432`

---

## 🧪 Testes Automatizados

O projeto conta com baterias completas de testes unitários e de integração:

```powershell
# Executar testes do backend
cd backend
npm test

# Executar testes do frontend
cd frontend
npm test
```

---

## 📑 Endpoints da API REST

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Verificação de integridade operacional (uptime, conectividade do banco) |
| `GET` | `/api/v1/ubs` | Consulta de UBS por proximidade (`lat`, `lon`, `raioKm`) ou texto (`municipio`, `uf`, `bairro`, `cep`) |
| `GET` | `/api/v1/ubs/:idOrCnes` | Detalhes de uma UBS pelo ID ou código CNES com rotas externas |
| `GET` | `/api/v1/municipios` | Lista municípios com unidades cadastradas por UF |
| `GET` | `/docs` | Documentação interativa OpenAPI / Swagger |

---

## 📚 Documentações Técnicas e Entregáveis

* 📐 [Arquitetura do Sistema](docs/ARQUITETURA.md)
* 🪟 [Guia de Execução no Windows com VS Code](docs/GUIA_EXECUCAO_WINDOWS.md)
* 🛡️ [Minuta de Política de Privacidade e LGPD](docs/PRIVACIDADE_LGPD.md)
* 🔐 [Checklist de Segurança (OWASP ASVS / DevSecOps)](docs/SEGURANCA_CHECKLIST.md)
* 📊 [Fontes de Dados do CNES e Limitações Cartográficas](docs/FONTES_DE_DADOS_E_LIMITACOES.md)
* 💾 [Guia de Backup, Restauração e Atualização do CNES](docs/BACKUP_RESTAURACAO_E_ATUALIZACAO.md)

---

## ⚖️ Licença e Responsabilidade Pública
Distribuído sob a Licença MIT. As informações exibidas são de domínio público, providas pelo Ministério da Saúde. Horários de funcionamento e escalas devem ser confirmados com a unidade antes do comparecimento.
