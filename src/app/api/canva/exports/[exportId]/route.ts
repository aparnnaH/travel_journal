import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext, isRouteError, jsonError } from '@/lib/server/auth';
import { downloadExportUrlsAsDataUrls, getCanvaExportJob, getValidCanvaAccessToken } from '@/lib/server/canva';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: RouteContext<'/api/canva/exports/[exportId]'>) {
  try {
    const authContext = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(authContext)) {
      return authContext;
    }

    const { exportId } = await context.params;
    const accessToken = await getValidCanvaAccessToken(authContext.supabaseAdmin, authContext.user.id);
    const data = await getCanvaExportJob(accessToken, exportId);
    const includeDataUrls = request.nextUrl.searchParams.get('includeDataUrls') === 'true';
    const dataUrls =
      includeDataUrls && data.job.status === 'success' && data.job.urls?.length
        ? await downloadExportUrlsAsDataUrls(data.job.urls)
        : undefined;

    return NextResponse.json({ success: true, data: { ...data.job, dataUrls } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load Canva export.';
    const status = message.includes('not connected') ? 409 : 500;
    return jsonError(message, status);
  }
}

