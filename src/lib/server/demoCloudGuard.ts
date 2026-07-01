import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { demoUser } from '@/lib/demoMode';

export function isSeededDemoCloudUser(user: User) {
  return user.email?.toLowerCase() === demoUser.email.toLowerCase();
}

export function rejectSeededDemoCloudWrite(user: User) {
  if (!isSeededDemoCloudUser(user)) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: 'The seeded demo traveler is read-only. Demo changes stay local and are not written to Supabase.',
    },
    { status: 403 }
  );
}
