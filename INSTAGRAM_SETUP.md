# Instagram Import - Quick Setup Guide

## 5-Minute Setup

### Step 1: Create Instagram App

1. Visit [Meta Developers Dashboard](https://developers.facebook.com)
2. Create App → Select Business type
3. Add "Instagram Graph API" product
4. Go to Settings → Basic, copy your App ID and App Secret

### Step 2: Configure Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Setup Supabase Tables

Run in Supabase SQL Editor:

```sql
-- Instagram connections table
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

-- Add external media to journal entries
ALTER TABLE journal_entries
ADD COLUMN external_media JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance
CREATE INDEX idx_instagram_connections_user_id 
  ON instagram_connections(user_id);
```

### Step 4: Use in Your App

```tsx
import { InstagramImportModal } from '@/components/journal/imports';

export function JournalPage() {
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <button onClick={() => setShowImport(true)}>
        Import from Instagram
      </button>
      
      <InstagramImportModal
        userId={user.id}
        journalEntryId={entryId}
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        isConnected={hasInstagramConnection}
      />
    </>
  );
}
```

## File Structure Created

```
✅ services/instagram/
  ✅ instagramService.ts
  ✅ index.ts

✅ hooks/instagram/
  ✅ useInstagramAuth.ts
  ✅ useInstagramMedia.ts
  ✅ useInstagramImport.ts
  ✅ index.ts

✅ components/social/
  ✅ InstagramAuthButton.tsx
  ✅ InstagramMediaCard.tsx
  ✅ InstagramMediaGrid.tsx
  ✅ index.ts

✅ components/journal/imports/
  ✅ InstagramImportModal.tsx
  ✅ index.ts

✅ app/api/auth/instagram/
  ✅ callback/route.ts

✅ app/api/instagram/
  ✅ media/route.ts
  ✅ import/route.ts

✅ Updated types/index.ts
✅ Updated lib/journalService.ts
```

## Features Implemented

- ✅ OAuth authentication flow
- ✅ Secure token storage
- ✅ Media fetching with pagination
- ✅ Multi-select media grid
- ✅ Responsive UI with Framer Motion
- ✅ Error handling and loading states
- ✅ Type-safe TypeScript
- ✅ Modular architecture
- ✅ Reusable components and hooks

## Testing the Flow

1. Start dev server: `npm run dev`
2. Navigate to `/journal` page
3. Click "Import from Instagram"
4. Authorize with Instagram (uses test app)
5. Select media from grid
6. Click "Import" to add to journal entry
7. Verify media appears in entry

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Verify `NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI` matches Instagram app settings |
| No media appearing | Check if Instagram account has public posts |
| "Invalid app" error | Verify App ID and App Secret are correct |
| CORS errors | Ensure API calls use relative paths (`/api/...`) |
| Token expired | Refresh token is handled automatically |

## Next Steps

1. **Customize UI**: Edit component styles in individual component files
2. **Add Animations**: Extend Framer Motion variants
3. **Error Tracking**: Add Sentry or your preferred error monitoring
4. **Analytics**: Track Instagram import events
5. **Webhooks**: Setup Instagram webhooks for real-time updates

## API Documentation

Full API docs in [INSTAGRAM_IMPORT_GUIDE.md](./INSTAGRAM_IMPORT_GUIDE.md)

## Key Files to Know

| File | Purpose |
|------|---------|
| `instagramService.ts` | Core Instagram API interactions |
| `useInstagramMedia.ts` | Hook for fetching media |
| `InstagramImportModal.tsx` | Main import UI component |
| `/api/auth/instagram/callback/route.ts` | OAuth callback handler |
| `/api/instagram/media/route.ts` | Media fetching endpoint |
| `/api/instagram/import/route.ts` | Import to journal endpoint |

## Support

Refer to the full documentation in `INSTAGRAM_IMPORT_GUIDE.md` for:
- Complete API reference
- Advanced usage patterns
- Security considerations
- Performance optimization
- Testing strategies
