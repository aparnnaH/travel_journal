// Client-side profile API wrapper.
// UI components use this small service instead of repeating fetch details for
// the authenticated profile route.
import type { UserProfile } from '@/types';
import { demoProfile, isDemoMode } from '@/lib/demoMode';

// Creates or updates the current user's profile row via /api/profile.
export async function createOrUpdateProfile(profile: UserProfile) {
  if (isDemoMode()) {
    return {
      success: true,
      data: [
        {
          ...demoProfile,
          displayName: profile.displayName || demoProfile.displayName,
          display_name: profile.displayName || demoProfile.displayName,
          avatar: profile.avatar || '',
          avatar_url: profile.avatar || '',
        },
      ],
    };
  }

  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  return response.json();
}

// Loads the current user's profile through the server route, which validates the
// session cookie before reading Supabase.
export async function fetchProfile() {
  if (isDemoMode()) {
    return {
      success: true,
      data: [
        {
          ...demoProfile,
          display_name: demoProfile.displayName,
          avatar_url: demoProfile.avatar,
          created_at: demoProfile.createdAt,
        },
      ],
    };
  }

  const response = await fetch('/api/profile');
  return response.json();
}
