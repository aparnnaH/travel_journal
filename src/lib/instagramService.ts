import type { InstagramMediaItem, InstagramStatus } from '@/types/instagram';
import { isDemoMode } from '@/lib/demoMode';

export async function fetchInstagramStatus() {
  if (isDemoMode()) {
    return {
      success: true,
      data: {
        configured: false,
        connected: false,
        paused: true,
        missing: ['demo-mode'],
      },
    };
  }

  const response = await fetch('/api/instagram/status');
  return response.json() as Promise<{ success: boolean; data?: InstagramStatus; error?: string }>;
}

export async function fetchInstagramMedia() {
  if (isDemoMode()) {
    return {
      success: false,
      error: 'Instagram media import is disabled in demo mode.',
    };
  }

  const response = await fetch('/api/instagram/media');
  return response.json() as Promise<{ success: boolean; data?: InstagramMediaItem[]; error?: string }>;
}
