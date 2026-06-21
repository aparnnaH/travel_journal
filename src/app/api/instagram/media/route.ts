// Loads recent Instagram media through the server-held OAuth token.
// The journal UI turns selected posts into regular first-class journal entries.
import { NextRequest, NextResponse } from 'next/server';
import { getInstagramTokenCookie, fetchInstagramMediaItems } from '@/lib/server/instagram';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'Instagram import');

  if (isRouteError(context)) {
    return context;
  }

  const tokenCookie = getInstagramTokenCookie(request, context.user.id);

  if (!tokenCookie) {
    return NextResponse.json(
      { success: false, error: 'Connect Instagram before importing posts.' },
      { status: 401 }
    );
  }

  try {
    const media = await fetchInstagramMediaItems(tokenCookie.accessToken);

    return NextResponse.json({
      success: true,
      data: media,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Could not load Instagram media.' },
      { status: 502 }
    );
  }
}
