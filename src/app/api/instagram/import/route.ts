import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import type { ExternalMedia, InstagramMedia } from '@/types';

/**
 * Add external Instagram media to a journal entry.
 * POST /api/instagram/import
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, journalEntryId, media } = body as {
      userId?: string;
      journalEntryId?: string;
      media?: InstagramMedia[];
    };

    if (userId && userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot import Instagram media for another user' },
        { status: 403 }
      );
    }

    if (!journalEntryId || !media || !Array.isArray(media)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: entry, error: entryError } = await supabaseAdmin
      .from('journal_entries')
      .select('id, user_id')
      .eq('id', journalEntryId)
      .single();

    if (entryError || !entry || entry.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or journal entry not found' },
        { status: 403 }
      );
    }

    const importedAt = new Date().toISOString();
    const externalMediaData: ExternalMedia[] = media.map((item) => ({
      id: `ig_${item.id}`,
      externalMediaId: item.id,
      sourcePlatform: 'instagram',
      mediaUrl: item.mediaUrl || item.thumbnailUrl || '',
      permalink: item.permalink,
      caption: item.caption,
      timestamp: item.timestamp,
      mediaType: item.mediaType,
      importedAt,
    }));

    const { data: currentEntry, error: currentEntryError } = await supabaseAdmin
      .from('journal_entries')
      .select('external_media')
      .eq('id', journalEntryId)
      .single();

    if (currentEntryError) {
      throw new Error(`Failed to load journal media: ${currentEntryError.message}`);
    }

    const existingMedia = Array.isArray(currentEntry?.external_media)
      ? currentEntry.external_media
      : [];
    const existingIds = new Set(
      existingMedia.map((item: ExternalMedia) => item.externalMediaId)
    );
    const updatedMedia = [
      ...existingMedia,
      ...externalMediaData.filter((item) => !existingIds.has(item.externalMediaId)),
    ];

    const { data: updatedEntry, error: updateError } = await supabaseAdmin
      .from('journal_entries')
      .update({
        external_media: updatedMedia,
        updated_at: new Date().toISOString(),
      })
      .eq('id', journalEntryId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to update journal entry: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedEntry,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to import media';
    console.error('Error importing Instagram media:', error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

