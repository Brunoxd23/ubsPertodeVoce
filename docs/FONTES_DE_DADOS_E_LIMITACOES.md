# Fontes de Dados Públicas, Estrutura e Limitações Cartográficas

## 1. Fonte Oficial de Estabelecimentos de Saúde

Os dados das Unidades Básicas de Saúde são providos pelo **Ministério da Saúde do Brasil** e pelo **Cadastro Nacional de Estabelecimentos de Saúde (CNES / DATASUS)**.

* **Portal de Dados Abertos**: [https://dadosabertos.saude.gov.br/](https://dadosabertos.saude.gov.br/)
* **Conjunto de Dados de UBS**: [https://dadosabertos.saude.gov.br/dataset/unidades-basicas-de-saude-ubs](https://dadosabertos.saude.gov.br/dataset/unidades-basicas-de-saude-ubs)
* **API de Dados Abertos do Ministério**: [https://apidadosabertos.saude.gov.br/](https://apidadosabertos.saude.gov.br/)
* **Arquivo Direto de Exportação CSV**: `https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/Unidades_Basicas_Saude-UBS_csv.zip`

---

## 2. Estrutura de Campos e Mapeamento

| Campo DATASUS | Campo da Plataforma | Tipo | Descrição |
| :--- | :--- | :--- | :--- |
| `CO_CNES` | `cnes` | String | Código identificador único do CNES (7 a 15 dígitos) |
| `NO_ESTABELECIMENTO` | `nomeOficial` | String | Razão social ou denominação oficial da unidade |
| `NO_FANTASIA` | `nomeFantasia` | String | Nome popular ou de fachada do estabelecimento |
| `DS_TIPO_UNIDADE` | `tipoEstabelecimento`| String | Tipologia (ex: "CENTRO DE SAUDE/UNIDADE BASICA") |
| `NO_LOGRADOURO` | `endereco` | String | Logradouro (rua, avenida, praça) |
| `NU_ENDERECO` | `numero` | String | Número predial |
| `NO_BAIRRO` | `bairro` | String | Bairro ou distrito |
| `NO_MUNICIPIO` | `municipio` | String | Município do estabelecimento |
| `SG_UF` | `uf` | String | Sigla do Estado com 2 caracteres |
| `CO_CEP` | `cep` | String | Código de Endereçamento Postal sanitizado |
| `NU_TELEFONE` | `telefone` | String | Telefone de contato da unidade |
| `NU_LATITUDE` | `latitude` | Float | Coordenada geográfica de latitude |
| `NU_LONGITUDE` | `longitude` | Float | Coordenada geográfica de longitude |

---

## 3. Limitações Conhecidas e Estratégia de Mitigação

1. **Inversão de Eixos (Latitude / Longitude)**:
   * Em alguns municípios, os operadores municipais invertem latitude e longitude durante a digitação no sistema CNES local.
   * *Mitigação*: A classe `CnesValidator` detecta se a latitude se enquadra na faixa de longitude do Brasil e vice-versa, efetuando a inversão e marcando o status como `INVERTIDA_CORRIGIDA`.
2. **Coordenadas Fora do Território Brasileiro**:
   * Alguns estabelecimentos constam com coordenadas em alto mar ou no Meridiano de Greenwich `(0, 0)`.
   * *Mitigação*: Registros com coordenadas fora dos limites geográficos do Brasil (`lat: [-33.75, 5.27]`, `lon: [-73.99, -34.79]`) são marcados como `FORA_DO_BRASIL` ou `AUSENTE`. Eles continuam disponíveis para busca textual (por município/bairro), mas não quebram a renderização do mapa.
3. **Dinâmica Operacional em Tempo Real**:
   * O CNES não provê status instantâneo de fila de espera ou disponibilidade imediata de lotes de vacinas.
   * *Mitigação*: A plataforma exibe aviso legal permanente em conformidade com o princípio de transparência, orientando o usuário a contatar a unidade por telefone antes do deslocamento.
