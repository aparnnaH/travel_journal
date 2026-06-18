import type { CanvaDesign, CanvaExportJob } from '@/types/canva';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const readApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const data = (await response.json()) as ApiResponse<T>;

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

  if (includeDataUrls) {
    params.set('includeDataUrls', 'true');
  }

  const response = await fetch(`/api/canva/exports/${encodeURIComponent(exportId)}${params.toString() ? `?${params}` : ''}`);
  return readApiResponse<CanvaExportJob & { dataUrls?: string[] }>(response);
}

