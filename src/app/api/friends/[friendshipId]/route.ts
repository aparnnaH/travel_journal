import { NextRequest, NextResponse } from 'next/server';
import { getFriendRouteContext, getFriendshipById, isRouteError, jsonError } from '@/lib/server/friendships';

export async function DELETE(_request: NextRequest, context: RouteContext<'/api/friends/[friendshipId]'>) {
  const routeContext = await getFriendRouteContext(_request);

  if (isRouteError(routeContext)) {
    return routeContext;
  }

  try {
    const { friendshipId } = await context.params;
    const friendship = await getFriendshipById(routeContext.supabaseAdmin, friendshipId);

    if (!friendship) {
      return jsonError('Friendship not found.', 404);
    }

    const isParticipant =
      friendship.requester_id === routeContext.user.id || friendship.addressee_id === routeContext.user.id;

    if (!isParticipant) {
      return jsonError('You cannot change this friendship.', 403);
    }

    const { error } = await routeContext.supabaseAdmin.from('friendships').delete().eq('id', friendshipId);

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ success: true, data: { id: friendshipId } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to remove friendship.', 500);
  }
}
