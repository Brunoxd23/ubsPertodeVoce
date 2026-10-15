import { getUbsRepository } from '../../db/client.js';
import { CnesImporterService, RawCnesRecord } from './cnes-importer.service.js';

async function runCliImport() {
  console.log('🚀 Iniciando rotina de importação de dados do CNES...');
  const repo = await getUbsRepository();
  const importer = new CnesImporterService(repo);

  // Amostra de validação de carga
  const registrosAmostra: RawCnesRecord[] = [
    {
      CO_CNES: '9900112',
      NO_ESTABELECIMENTO: 'UBS VILA MARIANA DR JOSE DE ARRUDA',
      DS_TIPO_UNIDADE: 'CENTRO DE SAUDE/UNIDADE BASICA',
      NO_LOGRADOURO: 'RUA DOUTOR DIOGO DE FARIA',
      NU_ENDERECO: '1201',
      NO_BAIRRO: 'VILA CLEMENTINO',
      NO_MUNICIPIO: 'SÃO PAULO',
      SG_UF: 'SP',
      CO_CEP: '04037004',
      NU_TELEFONE: '1155738899',
      NU_LATITUDE: -23.5982,
      NU_LONGITUDE: -46.6473,
    },
    {
      // Exemplo de registro com coordenadas invertidas (deve ser corrigido automaticamente pelo validador)
      CO_CNES: '9900223',
      NO_ESTABELECIMENTO: 'POSTO DE SAUDE DA FAMILIA BOTAFOGO',
      DS_TIPO_UNIDADE: 'POSTO DE SAUDE',
      NO_LOGRADOURO: 'RUA VOLUNTARIOS DA PATRIA',
      NU_ENDERECO: '445',
      NO_BAIRRO: 'BOTAFOGO',
      NO_MUNICIPIO: 'RIO DE JANEIRO',
      SG_UF: 'RJ',
      CO_CEP: '22270000',
      NU_TELEFONE: '2125381122',
      NU_LATITUDE: -43.1895, // Longitude colocada como latitude
      NU_LONGITUDE: -22.9511, // Latitude colocada como longitude
    },
    {
      // Exemplo de estabelecimento não-UBS (Hospital terciário) para testar rejeição pela regra de negócio
      CO_CNES: '9900334',
      NO_ESTABELECIMENTO: 'HOSPITAL GERAL ESPECIALIZADO DE CIRURGIAS COMPLEXAS',
      DS_TIPO_UNIDADE: 'HOSPITAL GERAL',
      NO_LOGRADOURO: 'AVENIDA PAULISTA',
      NU_ENDERECO: '2000',
      NO_MUNICIPIO: 'SÃO PAULO',
      SG_UF: 'SP',
    },
  ];

  const stats = await importer.processarLote(registrosAmostra);
  console.log('✅ Importação concluída com sucesso!');
  console.table(stats);
}

runCliImport().catch((err) => {
  console.error('❌ Erro na execução da importação:', err);
  process.exit(1);
});
