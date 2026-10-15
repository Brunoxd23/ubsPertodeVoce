# Arquitetura do Sistema — UBS Perto de Você

## 1. Visão Geral da Arquitetura

O sistema **UBS Perto de Você** foi concebido em uma arquitetura em camadas desacopladas, orientada a microserviços e componentes de alta performance com persistência espacial georreferenciada.

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

---

## 2. Componentes e Responsabilidades

### 2.1 Frontend (SPA Web Responsivo)
* **Framework**: React 18 com TypeScript em modo estrito (`strict: true`).
* **Estilização**: Tailwind CSS com tema verde institucional do SUS, suporte a Dark Mode e conformidade com WCAG 2.2 AA.
* **Cartografia**: Leaflet & React Leaflet com camada oficial de mapas do OpenStreetMap.
* **Gerenciamento de Estado de Rede**: TanStack Query (cache, deduplicação de chamadas e revalidação transparente).
* **Navegação Externa**: Integração direta com Google Maps, OpenStreetMap e Waze para cálculo de rotas sem expor telemetria do usuário.

### 2.2 Backend (API REST Segura)
* **Framework**: Fastify (ultra-rápido, baixo consumo de memória e modular).
* **Validação de Entrada**: Zod via `fastify-type-provider-zod`.
* **Documentação**: OpenAPI 3.0 interativa via Swagger UI acessível em `/docs`.
* **Segurança**:
  * Helmet com Content Security Policy restritivo.
  * Rate Limiting por IP (prevenção contra força bruta e DoS).
  * Sanitização de Logs e Redação de coordenadas geográficas (`REDACT_GEOLOCATION_LOGS`).
  * Correlation ID (`x-request-id`) para rastreabilidade de requisições.

### 2.3 Camada de Banco de Dados e Geoprocessamento
* **SGBD Primário**: PostgreSQL com extensão espacial PostGIS ativada (`postgis/postgis:16-3.4`).
* **SRID**: 4326 (WGS 84, padrão mundial para GPS e Leaflet).
* **Indexação**: Índice espacial GiST (`idx_ubs_geom_gist`) sobre o campo `geom GEOMETRY(Point, 4326)` para permitir filtragem espacial rápida com operador `ST_DWithin` e ordenação por `ST_DistanceSphere`.
* **Adaptador Híbrido**: Arquitetura orientada a interfaces (`IUbsRepository`) permitindo execução em contêineres PostGIS ou em modo Standalone imediato (usando fórmula de Haversine para cálculo geodésico).

---

## 3. Esquema de Banco de Dados

```sql
CREATE TABLE ubs (
    id VARCHAR(36) PRIMARY KEY,
    cnes VARCHAR(20) UNIQUE,
    nome_oficial VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    tipo_estabelecimento VARCHAR(100) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    numero VARCHAR(50),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    municipio VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    cep VARCHAR(10),
    telefone VARCHAR(50),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geom GEOMETRY(Point, 4326),
    fonte_dados VARCHAR(100) NOT NULL,
    data_atualizacao_fonte TIMESTAMP WITH TIME ZONE,
    data_ultima_importacao TIMESTAMP WITH TIME ZONE NOT NULL,
    status_validacao VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```
