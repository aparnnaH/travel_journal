// Starts Instagram OAuth from the server so the callback can verify state.
import { NextRequest, NextResponse } from 'next/server';
import {
  buildInstagramAuthorizationUrl,
  createInstagramState,
  getInstagramStatus,
  setInstagramStateCookie,
} from '@/lib/server/instagram';
import { resolveSameOriginPath } from '@/lib/server/apiSafety';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'Instagram import');

  if (isRouteError(context)) {
    return context;
  }

  const status = getInstagramStatus(request, context.user.id);

  if (!status.configured) {
    return NextResponse.redirect(
      new URL(
        `/journal?instagram=error&message=${encodeURIComponent(
          `Instagram is missing ${status.missing.join(', ')}.`
        )}`,
        request.url
      )
    );
  }

  const returnTo = resolveSameOriginPath(request.nextUrl.searchParams.get('returnTo'), '/journal');
  const state = createInstagramState(context.user.id, returnTo);
  const response = NextResponse.redirect(buildInstagramAuthorizationUrl({ request, state: state.payload }));
  setInstagramStateCookie(response, state.nonce);
  return response;
}
