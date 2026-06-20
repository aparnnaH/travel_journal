// Client-side Canva API wrapper.
// The browser never talks to Canva directly; it calls our route handlers so
// OAuth tokens and client secrets stay on the server.
import type { CanvaDesign, CanvaExportJob } from '@/types/canva';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
  canvaFolderId?: string;
};

// Safely parses the standard API response envelope. Canva routes can fail from
// auth, config, OAuth, or remote API errors, so keeping parsing here simplifies UI code.
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

// Loads the user's Canva designs through the authenticated backend route.
export async function fetchCanvaDesigns(query?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set('query', query.trim());
  }

  const response = await fetch(`/api/canva/designs${params.toString() ? `?${params}` : ''}`);
  return readApiResponse<CanvaDesign[]>(response);
}

// Creates a new Canva design sized for a journal page.
export async function createCanvaDesign(title: string) {
  const response = await fetch('/api/canva/designs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  return readApiResponse<CanvaDesign>(response);
}

// Starts an async Canva export job. Canva exports are polled instead of returned
// immediately, so the UI follows this by calling fetchCanvaExport.
export async function createCanvaExport(designId: string, format: 'png' | 'jpg' | 'pdf' = 'png') {
  const response = await fetch('/api/canva/exports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designId, format }),
  });

  return readApiResponse<CanvaExportJob>(response);
}

// Polls an export job and can optionally ask the server to download image URLs
// into data URLs for journal persistence.
export async function fetchCanvaExport(exportId: string, includeDataUrls = false) {
  const params = new URLSearchParams();

  params.set('exportId', exportId);

  if (includeDataUrls) {
    params.set('includeDataUrls', 'true');
  }

  const response = await fetch(`/api/canva/exports?${params}`);
  return readApiResponse<CanvaExportJob & { dataUrls?: string[] }>(response);
}
