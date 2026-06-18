import { NextRequest, NextResponse } from 'next/server';
import { verifyCanvaReturnJwt } from '@/lib/server/canva';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const correlationJwt = request.nextUrl.searchParams.get('correlation_jwt');

    if (!correlationJwt) {
      throw new Error('Missing Canva return token.');
    }

    const payload = await verifyCanvaReturnJwt(correlationJwt);
    const url = new URL('/journal', request.url);
    url.searchParams.set('canva', 'returned');

    if (payload.design_id) {
      url.searchParams.set('canvaDesignId', payload.design_id);
    }

    if (payload.correlation_state) {
      url.searchParams.set('canvaState', payload.correlation_state);
    }

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not verify the Canva return.';
    return NextResponse.redirect(new URL(`/journal?canva=error&message=${encodeURIComponent(message)}`, request.url));
  }
}

