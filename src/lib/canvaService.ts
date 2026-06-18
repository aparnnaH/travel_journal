import type { CanvaDesign, CanvaExportJob } from '@/types/canva';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const readApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  let data: ApiResponse<T> | null = null;

  try {
    data = (await response.json()) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: response.ok ? 'Canva returned an empty response.' : `Canva request failed (${response.status}).`,
    };
  }

  if (!response.ok && !data.error) {
    return { success: false, error: 'Canva request failed.' };
  }

  return data;
};

export async function fetchCanvaDesigns(query?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set('query', query.trim());
  }

  const response = await fetch(`/api/canva/designs${params.toString() ? `?${params}` : ''}`);
  return readApiResponse<CanvaDesign[]>(response);
}

export async function createCanvaDesign(title: string) {
  const response = await fetch('/api/canva/designs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  return readApiResponse<CanvaDesign>(response);
}

export async function createCanvaExport(designId: string, format: 'png' | 'jpg' | 'pdf' = 'png') {
  const response = await fetch('/api/canva/exports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designId, format }),
  });

  return readApiResponse<CanvaExportJob>(response);
}

export async function fetchCanvaExport(exportId: string, includeDataUrls = false) {
  const params = new URLSearchParams();

  params.set('exportId', exportId);

  if (includeDataUrls) {
    params.set('includeDataUrls', 'true');
  }

  const response = await fetch(`/api/canva/exports?${params}`);
  return readApiResponse<CanvaExportJob & { dataUrls?: string[] }>(response);
}
