# Minuta de Política de Privacidade e Governança LGPD

> **Aviso Importante**: Este documento constitui a base técnica e de conformidade do projeto para revisão e homologação pela assessoria jurídica do órgão ou entidade responsável pelo tratamento.

---

## 1. Princípios de Privacidade Aplicados (Privacy by Design)

A plataforma **UBS Perto de Você** foi projetada estritamente segundo as diretrizes da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD).

### 1.1 Minimização e Finalidade Estrita (Art. 6º, I e III da LGPD)
* **Coleta Limitada ao Estritamente Necessário**: O sistema não requer cadastro prévio, criação de senha, número de CPF, prontuário médico, histórico de saúde ou qualquer informação de caráter clínico do cidadão.
* **Geolocalização Voluntária**: As coordenadas do usuário (`latitude` e `longitude`) só são transmitidas quando o usuário clica expressamente no botão *"Usar minha localização"*.
* **Alternativa Manual Universal**: O cidadão pode localizar qualquer UBS pesquisando pelo nome do Município, UF, Bairro ou CEP sem autorizar o GPS do seu dispositivo.

### 1.2 Não Rastreamento e Ausência de Histórico de Trajetos
* O backend **não armazena nem cria histórico** das posições dos usuários.
* A geolocalização é processada de forma volátil apenas em memória no ciclo de vida da requisição HTTP (`request-response`) para calcular a distância euclidiana/geodésica das UBS mais próximas.

### 1.3 Redação de Dados em Logs Operacionais (Log Sanitization)
* Os logs do servidor (Fastify/Pino) utilizam a diretiva de redação nativa:
  ```json
  "url": "/api/v1/ubs?lat=[REDACTED_LGPD]&lon=[REDACTED_LGPD]&raioKm=5"
  ```
  Isso impede que dados de geolocalização fiquem armazenados em arquivos de log de acesso, sistemas de auditoria ou ferramentas analíticas.

### 1.4 Transparência na Navegação Externa
* A abertura de trajetos em serviços externos (Google Maps, Waze, OpenStreetMap) ocorre exclusivamente no lado do cliente (navegador do usuário) através de links diretos, sem intermediação do servidor backend e sem envio de metadados do cidadão.

---

## 2. Direitos dos Titulares (Art. 18 da LGPD)
Como o sistema não vincula a navegação a uma pessoa natural identificada nem armazena identificadores persistentes do usuário, não há armazenamento de banco de dados pessoais a ser excluído ou retificado. Quaisquer consultas ou solicitações operacionais podem ser encaminhadas aos canais oficiais da entidade mantenedora.
