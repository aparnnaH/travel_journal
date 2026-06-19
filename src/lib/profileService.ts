import type { UserProfile } from '@/types';

export async function createOrUpdateProfile(profile: UserProfile) {
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  return response.json();
}

export async function fetchProfile() {
  const response = await fetch('/api/profile');
  return response.json();
}
