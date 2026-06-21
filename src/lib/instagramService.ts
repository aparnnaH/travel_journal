import type { InstagramMediaItem, InstagramStatus } from '@/types/instagram';

export async function fetchInstagramStatus() {
  const response = await fetch('/api/instagram/status');
  return response.json() as Promise<{ success: boolean; data?: InstagramStatus; error?: string }>;
}

export async function fetchInstagramMedia() {
  const response = await fetch('/api/instagram/media');
  return response.json() as Promise<{ success: boolean; data?: InstagramMediaItem[]; error?: string }>;
}
