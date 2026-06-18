import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext, isRouteError, jsonError } from '@/lib/server/auth';
import {
  createCanvaExportJob,
  downloadExportUrlsAsDataUrls,
  getCanvaExportJob,
  getValidCanvaAccessToken,
} from '@/lib/server/canva';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(context)) {
      return context;
    }

    const exportId = request.nextUrl.searchParams.get('exportId');

    if (!exportId) {
      return jsonError('Missing Canva export id.');
    }

    const accessToken = await getValidCanvaAccessToken(context.supabaseAdmin, context.user.id);
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

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(context)) {
      return context;
    }

    const body = await request.json();
    const designId = typeof body.designId === 'string' ? body.designId : '';
    const format = body.format === 'jpg' || body.format === 'pdf' ? body.format : 'png';

    if (!designId) {
      return jsonError('Missing Canva design id.');
    }

    const accessToken = await getValidCanvaAccessToken(context.supabaseAdmin, context.user.id);
    const data = await createCanvaExportJob(accessToken, designId, format);

    return NextResponse.json({ success: true, data: data.job });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start Canva export.';
    const status = message.includes('not connected') ? 409 : 500;
    return jsonError(message, status);
  }
}
