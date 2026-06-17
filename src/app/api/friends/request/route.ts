import { NextRequest, NextResponse } from 'next/server';
import {
  findExistingFriendship,
  getFriendRouteContext,
  isRouteError,
  jsonError,
  loadProfileByEmail,
  loadProfilesForFriendship,
  mapFriendship,
} from '@/lib/server/friendships';
import type { FriendRequestAction } from '@/types/friends';

type RequestBody = {
  email?: string;
  friendshipId?: string;
  action?: FriendRequestAction;
};

export async function POST(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return jsonError('Enter an email address to send a friend request.');
    }

    const profile = await loadProfileByEmail(context.supabaseAdmin, email);

    if (!profile) {
      return jsonError('No traveler profile was found for that email.', 404);
    }

    if (profile.id === context.user.id) {
      return jsonError('You cannot send a friend request to yourself.');
    }

    const existing = await findExistingFriendship(context.supabaseAdmin, context.user.id, profile.id);

    if (existing) {
      if (existing.status === 'pending' && existing.addressee_id === context.user.id) {
        const { data, error } = await context.supabaseAdmin
          .from('friendships')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) {
          return jsonError(error.message, 500);
        }

        const profiles = await loadProfilesForFriendship(context.supabaseAdmin, data, context.user.id);
        return NextResponse.json({ success: true, data: mapFriendship(data, context.user.id, profiles) });
      }

      const message =
        existing.status === 'accepted'
          ? 'You are already friends with this traveler.'
          : existing.status === 'blocked'
            ? 'This friendship is blocked.'
            : 'A friend request is already pending.';
      return jsonError(message, 409);
    }

    const { data, error } = await context.supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: context.user.id,
        addressee_id: profile.id,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    const profiles = await loadProfilesForFriendship(context.supabaseAdmin, data, context.user.id);
    return NextResponse.json({ success: true, data: mapFriendship(data, context.user.id, profiles) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to send friend request.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const body = (await request.json()) as RequestBody;

    if (!body.friendshipId || !body.action) {
      return jsonError('Missing friendship action details.');
    }

    const nextStatus = body.action === 'accept' ? 'accepted' : 'blocked';
    const updateBody =
      body.action === 'accept'
        ? { status: nextStatus, responded_at: new Date().toISOString(), blocked_by: null }
        : { status: nextStatus, responded_at: new Date().toISOString(), blocked_by: context.user.id };

    const query = context.supabaseAdmin
      .from('friendships')
      .update(updateBody)
      .eq('id', body.friendshipId);

    const guardedQuery =
      body.action === 'accept'
        ? query.eq('addressee_id', context.user.id).eq('status', 'pending')
        : query.or(`requester_id.eq.${context.user.id},addressee_id.eq.${context.user.id}`);

    const { data, error } = await guardedQuery.select('*').maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError('That friend request is no longer available.', 404);
    }

    const profiles = await loadProfilesForFriendship(context.supabaseAdmin, data, context.user.id);
    return NextResponse.json({ success: true, data: mapFriendship(data, context.user.id, profiles) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to update friend request.', 500);
  }
}
