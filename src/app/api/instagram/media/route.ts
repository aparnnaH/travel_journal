import { NextRequest, NextResponse } from 'next/server';
import { instagramService } from '@/services/instagram';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

/**
 * Get Instagram media for the authenticated user.
 * GET /api/instagram/media?limit=20&after=cursor
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const requestedUserId = request.nextUrl.searchParams.get('userId');
    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);
    const after = request.nextUrl.searchParams.get('after') || undefined;

    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot fetch Instagram media for another user' },
        { status: 403 }
      );
    }

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('instagram_connections')
      .select('access_token, instagram_user_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (connectionError || !connection) {
      return NextResponse.json(
        { success: false, error: 'Instagram account not connected' },
        { status: 401 }
      );
    }

    const { media, nextCursor } = await instagramService.getUserMedia(
      connection.access_token,
      connection.instagram_user_id,
      Number.isFinite(limit) ? limit : 20,
      after
    );

    return NextResponse.json({
      success: true,
      data: media,
      nextCursor,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Instagram media';
    console.error('Error fetching Instagram media:', error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

