// Client-side profile API wrapper.
// UI components use this small service instead of repeating fetch details for
// the authenticated profile route.
import type { UserProfile } from '@/types';

// Creates or updates the current user's profile row via /api/profile.
export async function createOrUpdateProfile(profile: UserProfile) {
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
  const response = await fetch('/api/profile');
  return response.json();
}
