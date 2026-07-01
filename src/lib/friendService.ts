// Client-side Travel Circle API wrapper.
// Pages use this service to avoid duplicating response parsing and error
// handling around the friends route handlers.
import type { FriendRequestAction, FriendsResponse, Friendship } from '@/types/friends';
import { demoFriends, isDemoMode } from '@/lib/demoMode';

type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Normalizes successful and failed HTTP responses into the app's API result
// shape so UI code can display route-provided errors consistently.
async function parseApiResponse<T>(response: Response): Promise<ApiResult<T>> {
  const payload = (await response.json()) as ApiResult<T>;

  if (!response.ok) {
    return {
      success: false,
      error: payload.error || 'Friend request failed.',
    };
  }

  return payload;
}

// Loads accepted, incoming, outgoing, and blocked friendship groups.
export async function fetchFriends() {
  if (isDemoMode()) {
    return { success: true, data: demoFriends };
  }

  const response = await fetch('/api/friends');
  return parseApiResponse<FriendsResponse>(response);
}

// Sends a friend request by email. The server prevents self-requests and
// duplicate relationships.
export async function sendFriendRequest(email: string) {
  if (isDemoMode()) {
    return { success: false, error: 'Friend requests are preview-only in demo mode.' };
  }

  const response = await fetch('/api/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return parseApiResponse<Friendship>(response);
}

// Accepts or blocks an existing request.
export async function updateFriendRequest(friendshipId: string, action: FriendRequestAction) {
  if (isDemoMode()) {
    return { success: false, error: 'Friend requests are preview-only in demo mode.' };
  }

  const response = await fetch('/api/friends/request', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendshipId, action }),
  });

  return parseApiResponse<Friendship>(response);
}

// Removes an existing friendship/request.
export async function removeFriendship(friendshipId: string) {
  if (isDemoMode()) {
    return { success: false, error: 'Friend changes are preview-only in demo mode.' };
  }

  const response = await fetch(`/api/friends/${encodeURIComponent(friendshipId)}`, {
    method: 'DELETE',
  });

  return parseApiResponse<{ id: string }>(response);
}
