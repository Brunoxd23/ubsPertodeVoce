# Checklist de Segurança e Boas Práticas (OWASP ASVS / DevSecOps)

Este documento atesta a conformidade das defesas de segurança implementadas na plataforma **UBS Perto de Você**.

---

## 1. Controles de Aplicação e API

| Controle | Status | Implementação |
| :--- | :---: | :--- |
| **Proteção contra SQL Injection** | ✅ Aprovado | Todas as consultas utilizam queries parametrizadas (`$1`, `$2`, ...) ou funções espaciais PostGIS protegidas (`ST_MakePoint`, `ST_DWithin`). Nenhuma concatenação direta de SQL. |
| **Validação de Entrada Estrita** | ✅ Aprovado | Zod schemas aplicados em todas as rotas (Latitude [-90, 90], Longitude [-180, 180], raio máximo limitado a 100km, limites de paginação). |
| **Proteção contra DoS / Abuso** | ✅ Aprovado | `@fastify/rate-limit` com bloqueio e resposta amigável 429 após 100 requisições/minuto por IP. |
| **Prevenção contra SSRF** | ✅ Aprovado | A API não consome nem aceita URLs dinâmicas enviadas por clientes externos. |
| **Headers HTTP de Segurança** | ✅ Aprovado | `@fastify/helmet` ativado com `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` e Content Security Policy (CSP). |
| **CORS Restrito** | ✅ Aprovado | `@fastify/cors` restringindo as origens confiáveis configuradas na variável `CORS_ORIGIN`. |
| **Proteção de Segredos** | ✅ Aprovado | Nenhum segredo ou credencial de banco versionada. Uso estrito de `.env` incluído no `.gitignore`. |
| **Tratamento Seguro de Erros** | ✅ Aprovado | O tratador global de exceções mascara 500 para evitar vazamento de stack traces e detalhes de infraestrutura, registrando internamente com `reqId`. |

---

## 2. Controles de Infraestrutura e Contêineres

| Controle | Status | Implementação |
| :--- | :---: | :--- |
| **Execução Sem Root** | ✅ Aprovado | O `Dockerfile` do backend cria e utiliza o usuário sem privilégios `USER node`. |
| **Imagens Docker Otimizadas** | ✅ Aprovado | Uso de imagens multi-stage baseadas em `alpine` para reduzir superfície de ataque. |
| **Health Check Operacional** | ✅ Aprovado | Endpoint `GET /api/v1/health` sem expor detalhes confidenciais da infraestrutura. |
| **Pipeline de CI Automatizado** | ✅ Aprovado | GitHub Actions (.github/workflows/ci.yml) executa typecheck e testes automatizados a cada push. |
