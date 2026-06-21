// Instagram connection diagnostics for the journal workspace.
// This keeps Meta app setup problems visible without exposing client secrets.
import { NextRequest, NextResponse } from 'next/server';
import { getInstagramStatus } from '@/lib/server/instagram';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'Instagram import');

  if (isRouteError(context)) {
    return context;
  }

  return NextResponse.json({
    success: true,
    data: getInstagramStatus(request, context.user.id),
  });
}
