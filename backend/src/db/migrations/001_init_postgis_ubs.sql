-- Habilita extensão PostGIS para operações geoespaciais
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum para status de validação de coordenadas
DO $$ BEGIN
    CREATE TYPE status_validacao_coordenada AS ENUM (
        'VALIDA',
        'INVERTIDA_CORRIGIDA',
        'FORA_DO_BRASIL',
        'AUSENTE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela principal de Unidades Básicas de Saúde
CREATE TABLE IF NOT EXISTS ubs (
    id VARCHAR(36) PRIMARY KEY,
    cnes VARCHAR(20) UNIQUE,
    nome_oficial VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    tipo_estabelecimento VARCHAR(100) NOT NULL DEFAULT 'CENTRO DE SAUDE/UNIDADE BASICA',
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
    fonte_dados VARCHAR(100) NOT NULL DEFAULT 'CNES/DATASUS - Ministério da Saúde',
    data_atualizacao_fonte TIMESTAMP WITH TIME ZONE,
    data_ultima_importacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status_validacao status_validacao_coordenada NOT NULL DEFAULT 'AUSENTE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices B-Tree para buscas textuais e administrativas
CREATE INDEX IF NOT EXISTS idx_ubs_cnes ON ubs(cnes);
CREATE INDEX IF NOT EXISTS idx_ubs_uf_municipio ON ubs(uf, municipio);
CREATE INDEX IF NOT EXISTS idx_ubs_cep ON ubs(cep);
CREATE INDEX IF NOT EXISTS idx_ubs_bairro ON ubs(bairro);
CREATE INDEX IF NOT EXISTS idx_ubs_status_validacao ON ubs(status_validacao);

-- Índice Espacial GiST para consultas geográficas ultrarrápidas com PostGIS
CREATE INDEX IF NOT EXISTS idx_ubs_geom_gist ON ubs USING GIST (geom);

-- Comentários da tabela e colunas (Documentação de Banco)
COMMENT ON TABLE ubs IS 'Armazena estabelecimentos de saúde públicos classificados como Unidades Básicas de Saúde (UBS/Centro de Saúde) com suporte a PostGIS';
COMMENT ON COLUMN ubs.cnes IS 'Código identificador único no Cadastro Nacional de Estabelecimentos de Saúde (CNES)';
COMMENT ON COLUMN ubs.geom IS 'Ponto geográfico em SRID 4326 (WGS 84)';
COMMENT ON COLUMN ubs.status_validacao IS 'Status do pipeline de validação geográfica (VALIDA, INVERTIDA_CORRIGIDA, FORA_DO_BRASIL, AUSENTE)';
