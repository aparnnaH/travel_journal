# Instagram Import Flow Documentation

## Overview

This document outlines the complete Instagram import flow for the Travel Journal application. Users can connect their Instagram accounts and import their posts directly into journal entries.

## Architecture

```
services/instagram/
├── instagramService.ts       # Core Instagram API integration
└── index.ts                  # Exports

hooks/instagram/
├── useInstagramAuth.ts       # OAuth authentication hook
├── useInstagramMedia.ts      # Media fetching hook
├── useInstagramImport.ts     # Import to journal hook
└── index.ts                  # Exports

components/
├── social/
│   ├── InstagramAuthButton.tsx      # OAuth trigger button
│   ├── InstagramMediaCard.tsx       # Individual media card with selection
│   ├── InstagramMediaGrid.tsx       # Grid with infinite scroll
│   └── index.ts
└── journal/imports/
    ├── InstagramImportModal.tsx      # Full import flow modal
    └── index.ts

app/api/
├── auth/instagram/
│   └── callback/route.ts     # OAuth callback handler
└── instagram/
    ├── media/route.ts        # Fetch user's Instagram media
    └── import/route.ts       # Import media to journal entry
```

## Setup & Configuration

### 1. Instagram App Registration

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Create a new app (Business type)
3. Add "Instagram Graph API" product
4. Configure OAuth Redirect URIs:
   - Development: `http://localhost:3000/api/auth/instagram/callback`
   - Production: `https://yourdomain.com/api/auth/instagram/callback`

### 2. Environment Variables

Add these to `.env.local`:

```env
# Instagram App Credentials
NEXT_PUBLIC_INSTAGRAM_APP_ID=your_app_id_here
INSTAGRAM_APP_SECRET=your_app_secret_here
NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback

# App Base URL (used for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Schema

You need to create an `instagram_connections` table in Supabase:

```sql
CREATE TABLE instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  instagram_user_id TEXT NOT NULL,
  instagram_username TEXT NOT NULL,
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, instagram_user_id)
);
```

### 4. Update Journal Entries Table

Update the `journal_entries` table to support external media:

```sql
ALTER TABLE journal_entries
ADD COLUMN external_media JSONB DEFAULT '[]'::jsonb;
```

## Data Models

### ExternalMedia (Core Type)

```typescript
interface ExternalMedia {
  id: string;                    // Internal ID (e.g., ig_12345)
  externalMediaId: string;       // Instagram media ID
  sourcePlatform: 'instagram' | 'facebook' | 'twitter';
  mediaUrl: string;              // Full resolution image/video URL
  permalink: string;             // Instagram post link
  caption?: string;              // Original Instagram caption
  timestamp: string;             // When posted (ISO 8601)
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  importedAt: string;            // When imported (ISO 8601)
}
```

### InstagramMedia (API Response Type)

```typescript
interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl?: string;
  permalink: string;
  timestamp: string;
  thumbnailUrl?: string;
}
```

## Usage

### 1. Basic Import Button in Journal Page

```tsx
'use client';

import { useState } from 'react';
import { InstagramImportModal } from '@/components/journal/imports';
import { useAuthStore } from '@/store/authStore';

export function JournalPage() {
  const user = useAuthStore((state) => state.user);
  const [showImportModal, setShowImportModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowImportModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          {/* Instagram icon SVG */}
        </svg>
        Import from Instagram
      </button>

      <InstagramImportModal
        userId={user?.id || ''}
        journalEntryId="entry-id"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          // Refresh journal entries
        }}
        isConnected={true}
      />
    </>
  );
}
```

### 2. Using Individual Components

```tsx
import { InstagramAuthButton, InstagramMediaGrid } from '@/components/social';
import { useInstagramMedia } from '@/hooks/instagram';

export function CustomImportFlow() {
  const user = useAuthStore((state) => state.user);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <div>
      <InstagramAuthButton variant="primary" size="lg" />
      
      <InstagramMediaGrid
        userId={user?.id || ''}
        selectedMediaIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
```

### 3. Programmatic Media Import

```tsx
import { useInstagramImport } from '@/hooks/instagram';

export function ImportButton() {
  const { importing, error, importMedia } = useInstagramImport({
    userId: 'user-123',
    journalEntryId: 'entry-456'
  });

  const handleImport = async (media) => {
    try {
      const updatedEntry = await importMedia(media);
      console.log('Import successful:', updatedEntry);
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  return <button onClick={() => handleImport(selectedMedia)}>Import</button>;
}
```

## API Endpoints

### OAuth Callback
- **URL**: `/api/auth/instagram/callback`
- **Method**: GET
- **Params**: `code`, `state`, `error`, `error_reason`
- **Response**: Redirects to `/journal?instagram_connected=true`
- **Storage**: Stores encrypted access token in `instagram_connections` table

### Fetch Media
- **URL**: `/api/instagram/media`
- **Method**: GET
- **Params**: `userId`, `limit` (default 20), `after` (cursor for pagination)
- **Response**:
  ```json
  {
    "success": true,
    "data": [InstagramMedia[], ...],
    "nextCursor": "string or null"
  }
  ```

### Import to Journal
- **URL**: `/api/instagram/import`
- **Method**: POST
- **Body**:
  ```json
  {
    "userId": "string",
    "journalEntryId": "string",
    "media": [ExternalMedia[], ...]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {JournalEntry}
  }
  ```

## Hooks Reference

### useInstagramAuth()

Handles Instagram OAuth flow initiation.

```typescript
const { loading, error, initiateLogin } = useInstagramAuth();

// Usage
<button onClick={initiateLogin}>
  {loading ? 'Connecting...' : 'Connect Instagram'}
</button>
```

### useInstagramMedia({ userId, limit })

Fetches paginated Instagram media.

```typescript
const { 
  media, 
  loading, 
  error, 
  hasMore, 
  fetchMedia, 
  loadMore 
} = useInstagramMedia({ userId, limit: 20 });

// Fetch initial batch
useEffect(() => {
  fetchMedia();
}, [userId, fetchMedia]);

// Load more
if (hasMore) {
  <button onClick={loadMore}>Load More</button>
}
```

### useInstagramImport({ userId, journalEntryId })

Imports selected media to a journal entry.

```typescript
const { importing, error, importMedia } = useInstagramImport({
  userId,
  journalEntryId
});

const result = await importMedia(selectedMedia);
```

## Components Reference

### InstagramAuthButton

OAuth trigger button with loading state.

**Props:**
- `variant`: 'primary' | 'secondary' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `className`: Additional CSS classes

### InstagramMediaCard

Individual media card with selection checkbox.

**Props:**
- `media`: InstagramMedia
- `isSelected`: boolean
- `onSelect`: (selected: boolean) => void
- `className`: Additional CSS classes

### InstagramMediaGrid

Responsive grid of media with infinite scroll.

**Props:**
- `userId`: string (required)
- `selectedMediaIds`: Set<string>
- `onSelectionChange`: (selectedIds: Set<string>) => void
- `limit`: number (default: 20)
- `className`: Additional CSS classes

### InstagramImportModal

Full-featured import modal with auth flow.

**Props:**
- `userId`: string (required)
- `journalEntryId`: string (required)
- `isOpen`: boolean (required)
- `onClose`: () => void (required)
- `onSuccess`: () => void (optional)
- `isConnected`: boolean (default: false)

## Security Considerations

1. **Token Storage**: Access tokens are stored in Supabase (encrypted at rest)
2. **Token Refresh**: Tokens are automatically refreshed before expiry
3. **User Verification**: All imports are verified to belong to the authenticated user
4. **Data Validation**: All external media URLs are validated before storage
5. **Rate Limiting**: Instagram API rate limits are respected

## Error Handling

All hooks and API endpoints follow a consistent error pattern:

```typescript
interface Response {
  success: boolean;
  data?: any;
  error?: string;
}
```

**Common Errors:**
- "Instagram account not connected" (401)
- "Missing userId parameter" (400)
- "Failed to fetch Instagram media" (500)
- "Failed to import media" (500)

## Roadmap

Future enhancements:

- [ ] Support for Instagram Stories
- [ ] Support for Instagram Reels
- [ ] Batch import across multiple entries
- [ ] Instagram hashtag search
- [ ] Media tagging and organization
- [ ] Automatic location detection from EXIF
- [ ] Facebook integration
- [ ] Twitter integration

## Troubleshooting

### "Instagram account not connected" Error

**Solution**: User needs to click "Connect Instagram" and complete OAuth flow.

### Media Not Appearing

**Check:**
1. User is authenticated
2. Instagram connection token is valid
3. Instagram account has public or semi-public posts
4. Media wasn't deleted from Instagram after import

### OAuth Callback Issues

**Check:**
1. Redirect URI matches exactly in Instagram app settings
2. App ID and secret are correct
3. User didn't deny permissions
4. Cookies are enabled in browser

## Performance Optimization

- Media grid uses React virtualization for large lists
- Lazy loading with "Load More" button
- Framer Motion animations optimized for 60fps
- API responses cached for 5 minutes

## Testing

### Manual Testing Checklist

- [ ] Connect Instagram account via OAuth
- [ ] View Instagram media grid
- [ ] Select/deselect multiple media
- [ ] Load more media pagination
- [ ] Import media to journal entry
- [ ] Verify media appears in entry
- [ ] Test error states (invalid token, network error)
- [ ] Test responsive design on mobile

### Environment Variables for Testing

```env
# Use a test Instagram app with sandbox mode enabled
NEXT_PUBLIC_INSTAGRAM_APP_ID=test_app_id
INSTAGRAM_APP_SECRET=test_app_secret
```

## Support & Debugging

For debugging, enable Instagram service logs:

```typescript
// In instagramService.ts
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Instagram API call:', url);
}
```

## References

- [Meta Graph API Docs](https://developers.facebook.com/docs/instagram-graph-api)
- [Instagram Business Account Setup](https://developers.facebook.com/docs/instagram/getting-started)
- [OAuth 2.0 Flow](https://developers.facebook.com/docs/instagram-api/authentication)
