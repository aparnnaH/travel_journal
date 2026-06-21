// Canva export route.
// Canva exports are asynchronous jobs, so this route can either create a job or
// poll one by id and optionally download the finished assets as data URLs.
import { NextRequest, NextResponse } from 'next/server';
import { clampText, isApiError, readJsonBody } from '@/lib/server/apiSafety';
import { getAuthenticatedRouteContext, isRouteError, jsonError } from '@/lib/server/auth';
import {
  createCanvaExportJob,
  downloadExportUrlsAsDataUrls,
  getCanvaExportJob,
  getValidCanvaAccessToken,
} from '@/lib/server/canva';

export const runtime = 'nodejs';

// Polls an export job and optionally embeds completed export URLs as data URLs.
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
        ? await downloadExportUrlsAsDataUrls(data.job.urls, {
            maxUrls: 8,
            maxTotalBytes: 12 * 1024 * 1024,
          })
        : undefined;

    return NextResponse.json({ success: true, data: { ...data.job, dataUrls } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load Canva export.';
    const status = message.includes('not connected') ? 409 : 500;
    return jsonError(message, status);
  }
}

// Starts a new export job for a Canva design.
export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(context)) {
      return context;
    }

    const body = await readJsonBody<{ designId?: string; format?: string }>(request, {
      maxBytes: 4 * 1024,
      errorMessage: 'Canva export request is too large.',
    });

    if (isApiError(body)) {
      return body;
    }

    const designId = clampText(body.designId, 200);
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
