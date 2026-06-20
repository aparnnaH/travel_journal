// Server-side helpers for Travel Circle route handlers.
// These functions centralize friendship auth, profile lookup, row mapping, and
// grouped summary building so route files stay small.
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { authCookieName } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { FriendsResponse, Friendship, FriendshipStatus, FriendProfile } from '@/types/friends';

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  blocked_by?: string | null;
  created_at: string;
  responded_at?: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type FriendRouteContext = {
  supabaseAdmin: SupabaseClient;
  user: User;
};

// Standard JSON error shape for friend-related routes.
export function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

// Friend routes use the same cookie/bearer-token pattern as other protected
// APIs, but keep a friend-specific message for auth failures.
export async function getFriendRouteContext(request: NextRequest): Promise<FriendRouteContext | NextResponse> {
  const token = request.cookies.get(authCookieName)?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return jsonError('You need to be signed in to use friends.', 401);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return jsonError('Your session expired. Please sign in again.', 401);
  }

  return { supabaseAdmin, user: data.user };
}

// Type guard for early returns when auth failed.
export function isRouteError(context: FriendRouteContext | NextResponse): context is NextResponse {
  return context instanceof NextResponse;
}

// Converts a raw profile row into the small public profile shape shown in UI.
function toProfile(row?: ProfileRow): FriendProfile {
  return {
    id: row?.id ?? '',
    email: row?.email ?? 'Unknown traveler',
    displayName: row?.display_name ?? undefined,
    avatar: row?.avatar_url ?? undefined,
  };
}

// Adds direction information relative to the current user so the UI can group
// incoming/outgoing/friend relationships without re-deriving it.
export function mapFriendship(row: FriendshipRow, currentUserId: string, profiles: Map<string, ProfileRow>): Friendship {
  const otherUserId = row.requester_id === currentUserId ? row.addressee_id : row.requester_id;
  const direction =
    row.status === 'accepted'
      ? 'friend'
      : row.addressee_id === currentUserId
        ? 'incoming'
        : 'outgoing';

  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    blockedBy: row.blocked_by ?? null,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? null,
    profile: toProfile(profiles.get(otherUserId)),
    direction,
  };
}

// Loads a friendship by primary key for routes that operate on one relationship.
export async function getFriendshipById(supabaseAdmin: SupabaseClient, friendshipId: string) {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as FriendshipRow | null;
}

// Loads all relationships touching the current user and groups them by status
// and direction for the Travel Circle page.
export async function loadFriendshipSummary(supabaseAdmin: SupabaseClient, currentUserId: string): Promise<FriendsResponse> {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as FriendshipRow[];
  const profileIds = [
    ...new Set(rows.map((row) => (row.requester_id === currentUserId ? row.addressee_id : row.requester_id))),
  ];

  let profiles = new Map<string, ProfileRow>();

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id,email,display_name,avatar_url')
      .in('id', profileIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    profiles = new Map((profileData ?? []).map((profile) => [String(profile.id), profile as ProfileRow]));
  }

  const friendships = rows.map((row) => mapFriendship(row, currentUserId, profiles));

  return {
    friends: friendships.filter((friendship) => friendship.status === 'accepted'),
    incoming: friendships.filter((friendship) => friendship.status === 'pending' && friendship.direction === 'incoming'),
    outgoing: friendships.filter((friendship) => friendship.status === 'pending' && friendship.direction === 'outgoing'),
    blocked: friendships.filter((friendship) => friendship.status === 'blocked'),
  };
}

// Finds a profile by email when sending a friend request.
export async function loadProfileByEmail(supabaseAdmin: SupabaseClient, email: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,email,display_name,avatar_url')
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProfileRow | null;
}

// Checks both requester/addressee directions to prevent duplicate friendships.
export async function findExistingFriendship(supabaseAdmin: SupabaseClient, firstUserId: string, secondUserId: string) {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${firstUserId},addressee_id.eq.${secondUserId}),and(requester_id.eq.${secondUserId},addressee_id.eq.${firstUserId})`
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as FriendshipRow | null;
}

// Loads the other user's profile so a newly changed friendship can be returned
// in the same UI-friendly shape as the summary endpoint.
export async function loadProfilesForFriendship(supabaseAdmin: SupabaseClient, row: FriendshipRow, currentUserId: string) {
  const otherUserId = row.requester_id === currentUserId ? row.addressee_id : row.requester_id;
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,email,display_name,avatar_url')
    .eq('id', otherUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return new Map([[otherUserId, data as ProfileRow]]);
}
