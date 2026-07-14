// Client-side Travel Circle API wrapper.
// Pages use this service to avoid duplicating response parsing and error
// handling around the friends route handlers.
import type { FriendRequestAction, FriendsResponse, Friendship } from '@/types/friends';
import type { FriendCountrySnapshotsResponse } from '@/types/friends';
import {
  DEMO_SHARE_RECIPIENT_ID,
  DEMO_OUTGOING_FRIEND_ID,
  DEMO_USER_ID,
  isDemoMode,
  readDemoFriends,
  readDemoSharedJournalEntriesLarge,
  writeDemoFriends,
  writeDemoSharedJournalEntriesLarge,
} from '@/lib/demoMode';

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

function cloneDemoFriends() {
  return JSON.parse(JSON.stringify(readDemoFriends())) as FriendsResponse;
}

function getDemoFriendCountrySnapshots(): FriendCountrySnapshotsResponse {
  const friends = readDemoFriends().friends;
  const countrySnapshots: Record<string, FriendCountrySnapshotsResponse['friends'][number]['visitedCountries']> = {
    [DEMO_SHARE_RECIPIENT_ID]: [
      { id: 'CA', name: 'Canada' },
      { id: 'DO', name: 'Dominican Republic' },
      { id: 'JP', name: 'Japan' },
      { id: 'KR', name: 'South Korea' },
      { id: 'PT', name: 'Portugal' },
      { id: 'UY', name: 'Uruguay' },
      { id: 'US', name: 'United States' },
    ],
    'demo-friend-sofia-rivera': [
      { id: 'AZ', name: 'Azerbaijan' },
      { id: 'BA', name: 'Bosnia and Herzegovina' },
      { id: 'CM', name: 'Cameroon' },
      { id: 'CO', name: 'Colombia' },
      { id: 'ET', name: 'Ethiopia' },
      { id: 'FJ', name: 'Fiji' },
      { id: 'IQ', name: 'Iraq' },
      { id: 'JO', name: 'Jordan' },
      { id: 'QA', name: 'Qatar' },
      { id: 'RW', name: 'Rwanda' },
      { id: 'ZW', name: 'Zimbabwe' },
    ],
    'demo-friend-mary-chen': [
      { id: 'AU', name: 'Australia' },
      { id: 'CA', name: 'Canada' },
      { id: 'CN', name: 'China' },
      { id: 'DE', name: 'Germany' },
      { id: 'FR', name: 'France' },
      { id: 'ID', name: 'Indonesia' },
      { id: 'JP', name: 'Japan' },
      { id: 'MY', name: 'Malaysia' },
      { id: 'SG', name: 'Singapore' },
      { id: 'TW', name: 'Taiwan' },
      { id: 'US', name: 'United States' },
      { id: 'VN', name: 'Vietnam' },
    ],
    [DEMO_OUTGOING_FRIEND_ID]: [
      { id: 'CA', name: 'Canada' },
      { id: 'FR', name: 'France' },
      { id: 'IT', name: 'Italy' },
      { id: 'JP', name: 'Japan' },
      { id: 'KR', name: 'South Korea' },
      { id: 'TH', name: 'Thailand' },
      { id: 'US', name: 'United States' },
    ],
  };

  return {
    friends: friends.map((friendship) => ({
      friendshipId: friendship.id,
      friend: friendship.profile,
      visitedCountries: countrySnapshots[friendship.profile.id] ?? [],
    })),
  };
}

function findDemoFriendship(friends: FriendsResponse, friendshipId: string) {
  const groups: Array<keyof FriendsResponse> = ['friends', 'incoming', 'outgoing', 'blocked'];

  for (const group of groups) {
    const index = friends[group].findIndex((friendship) => friendship.id === friendshipId);
    if (index !== -1) return { group, index, friendship: friends[group][index] };
  }

  return null;
}

function acceptDemoFriendship(friendship: Friendship): Friendship {
  return {
    ...friendship,
    status: 'accepted',
    respondedAt: new Date().toISOString(),
    blockedBy: null,
    direction: 'friend',
  };
}

function blockDemoFriendship(friendship: Friendship): Friendship {
  return {
    ...friendship,
    status: 'blocked',
    respondedAt: new Date().toISOString(),
    blockedBy: DEMO_USER_ID,
    direction: friendship.direction === 'outgoing' ? 'outgoing' : 'incoming',
  };
}

// Loads accepted, incoming, outgoing, and blocked friendship groups.
export async function fetchFriends() {
  if (isDemoMode()) {
    return { success: true, data: readDemoFriends() };
  }

  const response = await fetch('/api/friends');
  return parseApiResponse<FriendsResponse>(response);
}

// Loads country-only snapshots for accepted friends. The route deliberately
// does not return journals, photos, city pins, stamps, colors, or timestamps.
export async function fetchFriendCountrySnapshots() {
  if (isDemoMode()) {
    return { success: true, data: getDemoFriendCountrySnapshots() };
  }

  const response = await fetch('/api/friends/countries');
  return parseApiResponse<FriendCountrySnapshotsResponse>(response);
}

// Sends a friend request by email. The server prevents self-requests and
// duplicate relationships.
export async function sendFriendRequest(email: string) {
  if (isDemoMode()) {
    const friends = cloneDemoFriends();
    const normalizedEmail = email.trim().toLowerCase();
    const incomingMary = friends.incoming.find(
      (friendship) =>
        friendship.profile.email.toLowerCase() === normalizedEmail ||
        friendship.profile.displayName?.toLowerCase() === normalizedEmail ||
        normalizedEmail === 'mary chen'
    );

    if (incomingMary) {
      const acceptedFriendship = acceptDemoFriendship(incomingMary);
      friends.incoming = friends.incoming.filter((friendship) => friendship.id !== incomingMary.id);
      friends.friends = [acceptedFriendship, ...friends.friends.filter((friendship) => friendship.id !== incomingMary.id)];
      writeDemoFriends(friends);
      return { success: true, data: acceptedFriendship };
    }

    return { success: false, error: 'Demo mode only includes Mary Chen as a sample friend request.' };
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
    const friends = cloneDemoFriends();
    const match = findDemoFriendship(friends, friendshipId);

    if (!match) {
      return { success: false, error: 'That demo friend request is no longer available.' };
    }

    friends[match.group].splice(match.index, 1);

    const updatedFriendship = action === 'accept' ? acceptDemoFriendship(match.friendship) : blockDemoFriendship(match.friendship);
    const nextGroup: keyof FriendsResponse = action === 'accept' ? 'friends' : 'blocked';
    friends[nextGroup] = [updatedFriendship, ...friends[nextGroup].filter((friendship) => friendship.id !== updatedFriendship.id)];
    writeDemoFriends(friends);

    return { success: true, data: updatedFriendship };
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
    const friends = cloneDemoFriends();
    const match = findDemoFriendship(friends, friendshipId);

    if (!match) {
      return { success: false, error: 'That demo friendship is no longer available.' };
    }

    if (match.friendship.profile.id === DEMO_SHARE_RECIPIENT_ID) {
      return { success: false, error: 'This demo friend is part of the seeded sharing walkthrough.' };
    }

    friends[match.group].splice(match.index, 1);
    writeDemoFriends(friends);

    if (match.group === 'friends') {
      const sharedEntries = await readDemoSharedJournalEntriesLarge();
      const nextSharedEntries = sharedEntries.filter((entry) => entry.userId !== match.friendship.profile.id);

      if (nextSharedEntries.length !== sharedEntries.length) {
        await writeDemoSharedJournalEntriesLarge(nextSharedEntries);
      }
    }

    return { success: true, data: { id: friendshipId } };
  }

  const response = await fetch(`/api/friends/${encodeURIComponent(friendshipId)}`, {
    method: 'DELETE',
  });

  return parseApiResponse<{ id: string }>(response);
}
