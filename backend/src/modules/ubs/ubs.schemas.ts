import { z } from 'zod';

export const ubsQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(-90, 'Latitude deve ser maior ou igual a -90')
    .max(90, 'Latitude deve ser menor ou igual a 90')
    .optional(),
  lon: z.coerce
    .number()
    .min(-180, 'Longitude deve ser maior ou igual a -180')
    .max(180, 'Longitude deve ser menor ou igual a 180')
    .optional(),
  raioKm: z.coerce
    .number()
    .min(0.5, 'Raio mínimo é de 0.5 km')
    .max(100, 'Raio máximo permitido é de 100 km para prevenir sobrecarga')
    .default(5),
  municipio: z.string().trim().min(2, 'Município deve ter ao menos 2 caracteres').max(100).optional(),
  uf: z.string().trim().length(2, 'UF deve possuir 2 caracteres').toUpperCase().optional(),
  bairro: z.string().trim().min(2).max(100).optional(),
  cep: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .pipe(z.string().length(8, 'CEP deve conter 8 dígitos'))
    .optional(),
  termo: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (data) => {
    // Se informar latitude, deve obrigatoriamente informar longitude e vice-versa
    if ((data.lat !== undefined && data.lon === undefined) || (data.lat === undefined && data.lon !== undefined)) {
      return false;
    }
    return true;
  },
  {
    message: 'Latitude e Longitude devem ser fornecidas em conjunto.',
    path: ['lat'],
  }
);

export type UbsQueryInput = z.infer<typeof ubsQuerySchema>;

export const ubsParamSchema = z.object({
  idOrCnes: z.string().trim().min(1, 'Identificador não pode ser vazio'),
});

export type UbsParamInput = z.infer<typeof ubsParamSchema>;

export const ubsResponseItemSchema = z.object({
  id: z.string(),
  cnes: z.string().nullable(),
  nomeOficial: z.string(),
  nomeFantasia: z.string().nullable(),
  tipoEstabelecimento: z.string(),
  endereco: z.string(),
  numero: z.string().nullable(),
  complemento: z.string().nullable(),
  bairro: z.string().nullable(),
  municipio: z.string(),
  uf: z.string(),
  cep: z.string().nullable(),
  telefone: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  fonteDados: z.string(),
  dataAtualizacaoFonte: z.string().nullable(),
  dataUltimaImportacao: z.string(),
  statusValidacao: z.enum(['VALIDA', 'INVERTIDA_CORRIGIDA', 'FORA_DO_BRASIL', 'AUSENTE']),
  distanciaKm: z.number().optional(),
  rotasExternas: z
    .object({
      googleMaps: z.string(),
      openStreetMap: z.string(),
      waze: z.string(),
    })
    .optional(),
});

export const ubsListResponseSchema = z.object({
  sucesso: z.literal(true),
  metadados: z.object({
    total: z.number(),
    pagina: z.number(),
    limite: z.number(),
    totalPaginas: z.number(),
    raioKm: z.number().optional(),
    filtrosAplicados: z.record(z.unknown()),
    fonteOficial: z.string(),
    avisoLegal: z.string(),
  }),
  dados: z.array(ubsResponseItemSchema),
});

export const ubsSingleResponseSchema = z.object({
  sucesso: z.literal(true),
  dados: ubsResponseItemSchema,
});

export const ubsMapQuerySchema = z.object({
  minLat: z.coerce.number().min(-90).max(90).optional(),
  maxLat: z.coerce.number().min(-90).max(90).optional(),
  minLon: z.coerce.number().min(-180).max(180).optional(),
  maxLon: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  raioKm: z.coerce.number().min(0.5).max(100).default(5),
  municipio: z.string().trim().optional(),
  uf: z.string().trim().length(2).toUpperCase().optional(),
  bairro: z.string().trim().optional(),
  termo: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(300).default(150),
});

export type UbsMapQueryInput = z.infer<typeof ubsMapQuerySchema>;

export const ubsMapResponseSchema = z.object({
  sucesso: z.literal(true),
  metadados: z.object({
    total: z.number(),
    modo: z.enum(['NACIONAL_DISTRIBUIDO', 'BOUNDING_BOX', 'PROXIMIDADE', 'FILTRO_TEXTUAL']),
  }),
  dados: z.array(ubsResponseItemSchema),
});

