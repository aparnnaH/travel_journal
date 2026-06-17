import type { FriendRequestAction, FriendsResponse, Friendship } from '@/types/friends';

type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

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

export async function fetchFriends() {
  const response = await fetch('/api/friends');
  return parseApiResponse<FriendsResponse>(response);
}

export async function sendFriendRequest(email: string) {
  const response = await fetch('/api/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return parseApiResponse<Friendship>(response);
}

export async function updateFriendRequest(friendshipId: string, action: FriendRequestAction) {
  const response = await fetch('/api/friends/request', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendshipId, action }),
  });

  return parseApiResponse<Friendship>(response);
}

export async function removeFriendship(friendshipId: string) {
  const response = await fetch(`/api/friends/${encodeURIComponent(friendshipId)}`, {
    method: 'DELETE',
  });

  return parseApiResponse<{ id: string }>(response);
}
