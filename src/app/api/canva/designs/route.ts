// Canva designs route.
// Proxies design listing/creation through the server so Canva access tokens and
// organization logic stay out of the browser.
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_COOKIE_NAME, isDemoRequestCookie } from '@/lib/demoMode';
import { checkApiRateLimitForRequest, clampText, isApiError, readJsonBody } from '@/lib/server/apiSafety';
import { getAuthenticatedRouteContext, isRouteError, jsonError } from '@/lib/server/auth';
import {
  createCanvaDesign,
  getLocalCanvaAccessToken,
  getValidCanvaAccessToken,
  listCanvaDesigns,
  organizeCanvaDesignInTravelJournalFolder,
  setCanvaLocalConnectionCookie,
} from '@/lib/server/canva';

export const runtime = 'nodejs';

// Lists recent Canva designs for the connected user.
export async function GET(request: NextRequest) {
  try {
    if (isDemoRequestCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value)) {
      const rateLimitError = checkApiRateLimitForRequest('canva-local-read', request);

      if (rateLimitError) {
        return rateLimitError;
      }

      const localConnection = await getLocalCanvaAccessToken(request);
      const data = await listCanvaDesigns(localConnection.accessToken, request.nextUrl.searchParams.get('query') || undefined);
      const response = NextResponse.json({ success: true, data: data.items, continuation: data.continuation });
      setCanvaLocalConnectionCookie(response, request, localConnection.cookie);
      return response;
    }

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

// Creates a journal-sized Canva design and best-effort moves it into the user's
// Travel Journal folder when folder scopes are available.
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<{ title?: string }>(request, {
      maxBytes: 4 * 1024,
      errorMessage: 'Canva design request is too large.',
    });

    if (isApiError(body)) {
      return body;
    }

    const cleanTitle = clampText(body.title, 255);
    const title = cleanTitle || 'Travel Journal Page';

    if (isDemoRequestCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value)) {
      const rateLimitError = checkApiRateLimitForRequest('canva-local-write', request);

      if (rateLimitError) {
        return rateLimitError;
      }

      const localConnection = await getLocalCanvaAccessToken(request);
      const data = await createCanvaDesign(localConnection.accessToken, title.slice(0, 255));
      const response = NextResponse.json({
        success: true,
        data: data.design,
        warning: 'This Canva connection is stored only on this browser for the portfolio demo.',
      });
      setCanvaLocalConnectionCookie(response, request, localConnection.cookie);
      return response;
    }

    const context = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(context)) {
      return context;
    }

    const accessToken = await getValidCanvaAccessToken(context.supabaseAdmin, context.user.id);
    const data = await createCanvaDesign(accessToken, title.slice(0, 255));
    const organization: { folderId?: string; warning?: string } = await organizeCanvaDesignInTravelJournalFolder(
      context.supabaseAdmin,
      context.user.id,
      accessToken,
      data.design.id
    ).catch((error) => ({
      warning: error instanceof Error ? error.message : 'Could not organize this design in Canva.',
    }));

    return NextResponse.json({
      success: true,
      data: data.design,
      warning: organization.warning,
      canvaFolderId: organization.folderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create Canva design.';
    const status = message.includes('not connected') ? 409 : 500;
    return jsonError(message, status);
  }
}
