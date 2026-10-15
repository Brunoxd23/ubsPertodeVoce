import { UbsListResponse, UbsFilterState, IUbs, UbsMapParams, UbsMapResponse, CepProximityResponse } from '../types/ubs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchUbs(filters: UbsFilterState): Promise<UbsListResponse> {
  const params = new URLSearchParams();

  if (filters.userLat !== null && filters.userLon !== null) {
    params.append('lat', filters.userLat.toString());
    params.append('lon', filters.userLon.toString());
    params.append('raioKm', filters.raioKm.toString());
  }

  if (filters.uf) {
    params.append('uf', filters.uf);
  }

  if (filters.municipio) {
    params.append('municipio', filters.municipio);
  }

  if (filters.termo) {
    params.append('termo', filters.termo);
  }

  params.append('page', filters.page.toString());
  params.append('limit', filters.limit.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(`${API_BASE_URL}/ubs?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const msg = errorData?.mensagem || `Erro ${res.status}: Não foi possível carregar as UBS`;
      throw new Error(msg);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchUbsMap(filters: UbsMapParams): Promise<UbsMapResponse> {
  const params = new URLSearchParams();

  if (filters.lat !== undefined && filters.lat !== null && filters.lon !== undefined && filters.lon !== null) {
    params.append('lat', filters.lat.toString());
    params.append('lon', filters.lon.toString());
    if (filters.raioKm) {
      params.append('raioKm', filters.raioKm.toString());
    }
  } else if (
    filters.minLat !== undefined &&
    filters.maxLat !== undefined &&
    filters.minLon !== undefined &&
    filters.maxLon !== undefined
  ) {
    params.append('minLat', filters.minLat.toString());
    params.append('maxLat', filters.maxLat.toString());
    params.append('minLon', filters.minLon.toString());
    params.append('maxLon', filters.maxLon.toString());
  }

  if (filters.uf) params.append('uf', filters.uf);
  if (filters.municipio) params.append('municipio', filters.municipio);
  if (filters.termo) params.append('termo', filters.termo);
  if (filters.limit) params.append('limit', filters.limit.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_BASE_URL}/ubs/map?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const msg = errorData?.mensagem || `Erro ${res.status}: Não foi possível carregar os pontos do mapa`;
      throw new Error(msg);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchUbsById(idOrCnes: string): Promise<IUbs> {
  const res = await fetch(`${API_BASE_URL}/ubs/${encodeURIComponent(idOrCnes)}`);
  if (!res.ok) {
    throw new Error('Unidade de Saúde não encontrada');
  }
  const body = await res.json();
  return body.dados;
}

export async function fetchHealth(): Promise<{ status: string; uptimeSegundos: number }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) {
    throw new Error('Falha no health check');
  }
  return await res.json();
}

export async function fetchUbsByCep(
  cep: string,
  raioKm: number = 10,
  limit: number = 10
): Promise<CepProximityResponse> {
  const cleanCep = cep.replace(/\D/g, '');
  const params = new URLSearchParams({
    raioKm: raioKm.toString(),
    limit: limit.toString(),
  });

  const res = await fetch(`${API_BASE_URL}/cep/${encodeURIComponent(cleanCep)}?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.mensagem || 'Não foi possível localizar o CEP informado.');
  }

  return await res.json();
}


