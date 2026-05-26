"""
INSTAGRAM IMPORT FLOW - COMPLETE ARCHITECTURE DIAGRAM
======================================================

This document provides a visual representation of the entire Instagram
import flow implementation for the Travel Journal application.

```

FRONTEND (React/Next.js Components)
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│                         InstagramImportModal                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Phase 1: Not Connected              Phase 2: Connected         │   │
│  │  ─────────────────────────          ─────────────────────       │   │
│  │                                                                   │   │
│  │  ┌────────────────────────┐        ┌──────────────────────────┐ │   │
│  │  │  📱 Connect Your      │        │  Select Media to Import  │ │   │
│  │  │  Instagram            │        │                          │ │   │
│  │  │                       │        │ ┌────────────────────────┐│ │   │
│  │  │ ┌──────────────────┐  │        │ │ InstagramMediaGrid     ││ │   │
│  │  │ │ InstagramAuthBtn │  │        │ │ ┌────┬────┬────┬────┐ ││ │   │
│  │  │ │ (OAuth trigger)  │  │        │ │ │ 🖼️ │ 🎥 │ 📚 │ ✓  │ ││ │   │
│  │  │ │                  │  │        │ │ │ ┌──┬──┬──┬──┐ ││ │   │
│  │  │ │ Connect Button   │  │        │ │ │ │  │  │  │  │ ││ │   │
│  │  │ └──────────────────┘  │        │ │ │ └──┴──┴──┴──┘ ││ │   │
│  │  │                       │        │ │ │ (multi-select) ││ │   │
│  │  └────────────────────────┘        │ │ │ Load More btn  ││ │   │
│  │                                    │ │ └────────────────┘│ │   │
│  │                                    │ │ Selection Counter ││ │   │
│  │                                    │ └──────────────────────┘ │   │
│  │                                    │ [Cancel] [Import] buttons │   │
│  │                                    └──────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘


HOOKS (State Management)
═══════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│ useInstagramAuth()      useInstagramMedia()      useInstagramImport()   │
│ ├─ initiateLogin()      ├─ fetchMedia()         ├─ importMedia()       │
│ └─ loading, error       ├─ loadMore()           └─ importing, error    │
│                         ├─ media[]                                       │
│                         ├─ hasMore                                       │
│                         └─ loading, error                                │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘


SERVICES (Business Logic)
═══════════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────────────────┐
│                        InstagramService                                   │
│                                                                            │
│  OAuth Methods                Media Methods         Utility Methods       │
│  ├─ getAuthorizationUrl()    ├─ getUserMedia()     ├─ validateToken()   │
│  ├─ exchangeCodeForToken()   ├─ getUserProfile()   └─ convertToExternal │
│  └─ getLongLivedToken()      └─ [pagination]         Media()            │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘


API LAYER (Next.js Routes)
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────┐    ┌──────────────────────────────┐
│  /api/auth/instagram/callback       │    │  /api/instagram/media        │
│                                     │    │                              │
│  GET Request (from Instagram OAuth) │    │  GET Request                 │
│  Query: code, state, error          │    │  Params: userId, limit, after│
│           ↓                         │    │           ↓                  │
│  Exchange code for token ─────────────→  │  Fetch media from service    │
│           ↓                         │    │           ↓                  │
│  Store token in Supabase ──────────────→ │  Return paginated results    │
│           ↓                         │    │                              │
│  Redirect to /journal?success       │    │  Response: {media, cursor}   │
│                                     │    │                              │
└─────────────────────────────────────┘    └──────────────────────────────┘

                              ↓
                    
┌──────────────────────────────────────────────────────────────┐
│  /api/instagram/import                                       │
│                                                              │
│  POST Request                                                │
│  Body: {userId, journalEntryId, media[]}                    │
│           ↓                                                  │
│  Verify user owns entry                                      │
│           ↓                                                  │
│  Convert media to ExternalMedia format                       │
│           ↓                                                  │
│  Update journal_entries.external_media in Supabase           │
│           ↓                                                  │
│  Return updated entry                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘


DATABASE (Supabase)
═══════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────┐
│                    instagram_connections                                 │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ id              │ UUID (Primary Key)                            │    │
│  │ user_id         │ UUID (references auth.users)                  │    │
│  │ access_token    │ TEXT (encrypted at rest)                      │    │
│  │ instagram_user_id │ TEXT (Instagram's user ID)                  │    │
│  │ instagram_username│ TEXT (Instagram username)                   │    │
│  │ connected_at    │ TIMESTAMP                                      │    │
│  │ updated_at      │ TIMESTAMP                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Indexes: user_id, instagram_user_id                                     │
│  RLS: Users can only access their own connections                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                      journal_entries (UPDATED)                          │
│                                                                          │
│  ... existing columns ...                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ external_media  │ JSONB ARRAY                                   │    │
│  │                 │ [                                             │    │
│  │                 │   {                                           │    │
│  │                 │     id: "ig_123",                             │    │
│  │                 │     externalMediaId: "123",                   │    │
│  │                 │     sourcePlatform: "instagram",              │    │
│  │                 │     mediaUrl: "...",                          │    │
│  │                 │     permalink: "...",                         │    │
│  │                 │     caption: "...",                           │    │
│  │                 │     timestamp: "ISO string",                  │    │
│  │                 │     mediaType: "IMAGE|VIDEO|CAROUSEL_ALBUM",  │    │
│  │                 │     importedAt: "ISO string"                  │    │
│  │                 │   }                                           │    │
│  │                 │ ]                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Index: GIN index on external_media for JSON queries                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


DATA FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════════════

User Interaction                API Calls            Database Ops
──────────────────              ────────────         ─────────────

1. Click "Import"
        ↓
2. Modal opens
        ├──→ useInstagramAuth()
        ├──→ initiateLogin()
        ├──→ Opens Instagram OAuth
        
3. User authorizes
        ↓
4. Instagram redirects to callback
        │
        ├─ [Backend] /api/auth/instagram/callback
        │  ├─ Exchange code
        │  ├─ Get long-lived token
        │  └──→ Store in instagram_connections
        │
        └─ Redirect back to /journal?success

5. Media grid loads
        ├──→ useInstagramMedia()
        ├──→ /api/instagram/media
        ├──→ [Backend] Fetch from Instagram API
        └─ Display in grid

6. User selects media
        └──→ Local state updates (Set<string>)

7. Click "Import"
        ├──→ useInstagramImport()
        ├──→ /api/instagram/import
        ├──→ [Backend] Verify user + entry
        ├──→ Convert to ExternalMedia
        ├──→ Update journal_entries
        │
        └──→ Success: Modal closes, entry refreshes


SECURITY FLOW
═════════════════════════════════════════════════════════════════════════════

User Registration
        ↓
Instagram OAuth
        │
        ├─ User directed to Instagram login
        ├─ User grants permission to read media
        ├─ Instagram returns authorization code
        ├─ [Server] Exchange code for SHORT-LIVED token
        ├─ [Server] Exchange SHORT for LONG-LIVED token (expires in 60 days)
        └─ [Server] Store encrypted in Supabase
        
Access to Media
        ├─ User requests media
        ├─ [Server] Retrieves long-lived token from DB
        ├─ [Server] Validates token is still valid
        ├─ [Server] Calls Instagram API with token
        ├─ [Server] Returns media to client
        └─ [DB] Logs import audit trail

Row Level Security (RLS)
        ├─ Users can ONLY see their own instagram_connections
        ├─ Users can ONLY import to their own journal entries
        ├─ Database enforces these at SQL level
        └─ No trust in frontend logic


MEDIA TYPE SUPPORT
════════════════════════════════════════════════════════════════════════════

┌─────────────────────┐
│ IMAGE               │
│ 🖼️ Single photo      │
│ Full resolution     │
│ mediaUrl available  │
└─────────────────────┘

┌─────────────────────┐
│ VIDEO               │
│ 🎥 Single video      │
│ Thumbnail shown     │
│ Link to Instagram   │
└─────────────────────┘

┌─────────────────────┐
│ CAROUSEL_ALBUM      │
│ 📚 Multiple photos   │
│ First photo shown   │
│ Link to full album  │
└─────────────────────┘


ERROR HANDLING PATHS
═════════════════════════════════════════════════════════════════════════════

Not Connected
    └─ Show "Connect Instagram" button
    └─ Clicking redirects to OAuth

Invalid Token
    └─ Attempt refresh
    └─ If fails, clear and show "Connect Instagram"

Network Error
    └─ Show error message
    └─ Provide "Retry" button

Permission Denied
    └─ Show friendly message
    └─ Offer "Try Again" option

Unauthorized User
    └─ API returns 403
    └─ Show "You don't have permission"

Rate Limited
    └─ Instagram returns 429
    └─ Show "Please wait before trying again"

Database Error
    └─ Log error
    └─ Show "Something went wrong, try again"


AUTHENTICATION STATES
═════════════════════════════════════════════════════════════════════════════

State 1: Not Logged In
    └─ User not authenticated to journal
    └─ Can't access import feature

State 2: Logged In, No Instagram
    └─ User authenticated
    └─ "Connect Instagram" button shown
    └─ No media available

State 3: Logged In, Instagram Connected
    └─ Token stored and valid
    └─ Media grid displays
    └─ Can import posts

State 4: Logged In, Instagram Expired
    └─ Token expired (60+ days)
    └─ Automatic refresh fails
    └─ "Reconnect Instagram" prompt


PERFORMANCE CONSIDERATIONS
════════════════════════════════════════════════════════════════════════════

Component Rendering
    ├─ InstagramMediaGrid: Renders visible items only
    ├─ InstagramMediaCard: Memoized for performance
    └─ Modal: Uses Portal to prevent re-renders

Data Fetching
    ├─ Initial: 20 items
    ├─ Load More: +20 items (pagination)
    ├─ Total supported: 1000+ items
    └─ Cursor-based pagination (efficient)

Caching
    ├─ API responses cached 5 minutes
    ├─ Media thumbs cached in browser
    └─ Token cached in Supabase

Database
    ├─ Indexes on user_id for fast lookups
    ├─ JSONB allows nested queries
    └─ RLS reduces data exposure


This architecture provides:
✅ Security (OAuth 2.0 + RLS)
✅ Performance (pagination + caching)
✅ Reliability (error handling + retry)
✅ Scalability (modular design)
✅ Maintainability (well-documented)

"""
