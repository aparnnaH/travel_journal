// Dynamic Canva export polling route.
// Kept for callers that prefer /api/canva/exports/:id over the query-param
// variant used by the client service.
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_COOKIE_NAME, isDemoRequestCookie } from '@/lib/demoMode';
import { checkApiRateLimitForRequest } from '@/lib/server/apiSafety';
import { getAuthenticatedRouteContext, isRouteError, jsonError } from '@/lib/server/auth';
import {
  downloadExportUrlsAsDataUrls,
  getCanvaExportJob,
  getLocalCanvaAccessToken,
  getValidCanvaAccessToken,
  setCanvaLocalConnectionCookie,
} from '@/lib/server/canva';

export const runtime = 'nodejs';

// Polls a specific export job id from the dynamic route segment.
export async function GET(request: NextRequest, context: RouteContext<'/api/canva/exports/[exportId]'>) {
  try {
    const { exportId } = await context.params;
    const isLocalDemoConnection = isDemoRequestCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value);
    if (isLocalDemoConnection) {
      const rateLimitError = checkApiRateLimitForRequest('canva-local-read', request);

      if (rateLimitError) {
        return rateLimitError;
      }
    }

    const localConnection = isLocalDemoConnection ? await getLocalCanvaAccessToken(request) : null;
    let accessToken = localConnection?.accessToken ?? '';

    if (!localConnection) {
      const authContext = await getAuthenticatedRouteContext(request, 'Canva');

      if (isRouteError(authContext)) {
        return authContext;
      }

      accessToken = await getValidCanvaAccessToken(authContext.supabaseAdmin, authContext.user.id);
    }
    const data = await getCanvaExportJob(accessToken, exportId);
    const includeDataUrls = request.nextUrl.searchParams.get('includeDataUrls') === 'true';
    const dataUrls =
      includeDataUrls && data.job.status === 'success' && data.job.urls?.length
        ? await downloadExportUrlsAsDataUrls(data.job.urls, {
            maxUrls: 8,
            maxTotalBytes: 12 * 1024 * 1024,
          })
        : undefined;

    const response = NextResponse.json({ success: true, data: { ...data.job, dataUrls } });

    if (localConnection) {
      setCanvaLocalConnectionCookie(response, request, localConnection.cookie);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load Canva export.';
    const status = message.includes('not connected') ? 409 : 500;
    return jsonError(message, status);
  }
}
