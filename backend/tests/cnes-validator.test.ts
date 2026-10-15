import { describe, it, expect } from 'vitest';
import { CnesValidator } from '../src/modules/importer/cnes-validator.js';

describe('CnesValidator - Validação Geográfica e Regras de Negócio', () => {
  it('deve validar coordenadas corretas dentro do território brasileiro', () => {
    // Praça da Sé, São Paulo
    const res = CnesValidator.validarCoordenadas(-23.5505, -46.6333);
    expect(res.status).toBe('VALIDA');
    expect(res.latitude).toBeCloseTo(-23.5505, 4);
    expect(res.longitude).toBeCloseTo(-46.6333, 4);
  });

  it('deve aceitar coordenadas em formato de string com vírgula ou ponto', () => {
    const res1 = CnesValidator.validarCoordenadas('-15.7938', '-47.8827');
    expect(res1.status).toBe('VALIDA');

    const res2 = CnesValidator.validarCoordenadas('-15,7938', '-47,8827');
    expect(res2.status).toBe('VALIDA');
    expect(res2.latitude).toBeCloseTo(-15.7938, 4);
  });

  it('deve identificar e corrigir automaticamente eixos lat/lon invertidos', () => {
    // Longitude (-43.18) no lugar de Latitude e Latitude (-22.90) no lugar de Longitude
    const res = CnesValidator.validarCoordenadas(-43.18, -22.90);
    expect(res.status).toBe('INVERTIDA_CORRIGIDA');
    expect(res.latitude).toBeCloseTo(-22.90, 2);
    expect(res.longitude).toBeCloseTo(-43.18, 2);
  });

  it('deve marcar como AUSENTE coordenadas nulas, vazias ou (0, 0)', () => {
    expect(CnesValidator.validarCoordenadas(null, null).status).toBe('AUSENTE');
    expect(CnesValidator.validarCoordenadas('', '').status).toBe('AUSENTE');
    expect(CnesValidator.validarCoordenadas(0, 0).status).toBe('AUSENTE');
    expect(CnesValidator.validarCoordenadas('abc', 'def').status).toBe('AUSENTE');
  });

  it('deve marcar como FORA_DO_BRASIL coordenadas nitidamente fora do país', () => {
    // Coordenada em Paris (França)
    const res = CnesValidator.validarCoordenadas(48.8566, 2.3522);
    expect(res.status).toBe('FORA_DO_BRASIL');
  });

  it('deve classificar corretamente estabelecimentos como UBS ou Atenção Básica', () => {
    expect(CnesValidator.isUbsOuAtencaoBasica('CENTRO DE SAUDE/UNIDADE BASICA', 'UBS BELA VISTA')).toBe(true);
    expect(CnesValidator.isUbsOuAtencaoBasica('POSTO DE SAUDE', 'POSTO 1')).toBe(true);
    expect(CnesValidator.isUbsOuAtencaoBasica('UNIDADE DE SAUDE DA FAMILIA', 'USF BOA ESPERANCA')).toBe(true);
    expect(CnesValidator.isUbsOuAtencaoBasica('CLINICA DA FAMILIA', 'CLINICA SAO PEDRO')).toBe(true);

    // Estabelecimentos que NÃO são UBS
    expect(CnesValidator.isUbsOuAtencaoBasica('HOSPITAL GERAL', 'HOSPITAL MUNICIPAL DE ALTA COMPLEXIDADE')).toBe(false);
    expect(CnesValidator.isUbsOuAtencaoBasica('LABORATORIO', 'LABORATORIO CENTRAL DE ANALISES CLINICAS')).toBe(false);
  });

  it('deve sanitizar CEP e telefones', () => {
    expect(CnesValidator.sanitizarCep('01310-100')).toBe('01310100');
    expect(CnesValidator.sanitizarCep('01310100')).toBe('01310100');
    expect(CnesValidator.sanitizarCep('123')).toBeNull(); // inválido
    expect(CnesValidator.sanitizarCep(null)).toBeNull();

    expect(CnesValidator.sanitizarTelefone('  (11) 98765-4321  ')).toBe('(11) 98765-4321');
    expect(CnesValidator.sanitizarTelefone('123')).toBeNull();
  });
});
