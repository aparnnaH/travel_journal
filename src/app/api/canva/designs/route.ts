import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext, isRouteError, jsonError } from '@/lib/server/auth';
import { getValidCanvaAccessToken, listCanvaDesigns } from '@/lib/server/canva';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(context)) {
      return context;
    }

    const accessToken = await getValidCanvaAccessToken(context.supabaseAdmin, context.user.id);
    const data = await listCanvaDesigns(accessToken, request.nextUrl.searchParams.get('query') || undefined);

    return NextResponse.json({ success: true, data: data.items, continuation: data.continuation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load Canva designs.';
    const status = message.includes('not connected') ? 409 : 500;
    return jsonError(message, status);
  }
}

