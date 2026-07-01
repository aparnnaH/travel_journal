// Instagram OAuth media import is paused while the journal uses public post embeds.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Instagram OAuth import is paused. Add a public Instagram post URL in the journal instead.',
    },
    { status: 410 }
  );
}
