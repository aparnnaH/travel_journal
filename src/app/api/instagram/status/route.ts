// Instagram OAuth media import is paused while the journal uses public post embeds.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      configured: false,
      connected: false,
      missing: [],
      paused: true,
    },
  });
}
