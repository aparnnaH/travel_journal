# Travel Journal Learning Roadmap

Use this roadmap to learn the codebase in a practical order. Start at the top and move downward: each group builds on the concepts from the previous one.

## 1. App Foundation

### 1. `src/app/layout.tsx`

The root wrapper for the whole app. It sets global metadata, fonts, viewport behavior, Google Tag Manager, global styles, and wraps every route in `AuthProvider`.

Learn this first because every page passes through it.

### 2. `src/components/AuthProvider.tsx`

The client-side auth bootstrapper. It checks the current Supabase session, syncs the access token into the app HTTP-only cookie, fetches the user profile, updates `useAuthStore`, listens for auth changes, and mounts `MapCloudSync`.

Learn this to understand how the app knows who is signed in.

### 3. `src/lib/supabase.ts`

The browser Supabase client and client auth helper file. It handles sign up, sign in, sign out, current-user lookup, metadata updates, and session cookie sync.

Learn this to understand the client-side doorway into Supabase.

## 2. Server Auth

### 4. `src/lib/server/auth.ts`

The server-side auth gate for protected API routes. It reads the `sb-access-token` cookie or bearer token, validates it with Supabase admin, and returns either an authenticated context or a JSON error.

Learn this before editing authenticated API routes.

### 5. `src/lib/supabaseAdmin.ts`

Creates the Supabase service-role client lazily. This is server-only and can bypass RLS, so it must only be used after auth and ownership checks.

Learn this to understand privileged database access.

### 6. `src/app/api/auth/session/route.ts`

Writes and clears the HTTP-only auth cookie used by server route handlers.

Learn this to understand how browser Supabase auth connects to server APIs.

## 3. Shared Layout and Auth State

### 7. `src/store/authStore.ts`

Small Zustand store for normalized auth user, loading state, and auth errors.

Learn this to understand how pages read signed-in state.

### 8. `src/components/layout/AppHeader.tsx`

The shared navigation header. It renders route groups, mobile nav, account display, and sign-out behavior.

Learn this to understand the current app surface.

### 9. `src/components/layout/PageShell.tsx`

Common product-page wrapper for consistent page chrome, titles, descriptions, and actions.

Learn this before building new authenticated pages.

## 4. Map System

### 10. `src/store/mapStore.ts`

The core client state for the scratch map: visited countries, colors, labels, city pins, scratch percentage, and timestamps. It persists to `localStorage`.

Learn this because map state powers passport, journal country linking, Travel Audit, and companion context.

### 11. `src/components/MapCloudSync.tsx`

Syncs local map state to Supabase for signed-in users. It handles hydration, local-vs-remote precedence, and debounced saves.

Learn this before changing map persistence.

### 12. `src/lib/mapStateService.ts`

Service wrapper for the `map_states` Supabase table.

Learn this to understand the boundary between Zustand state and database rows.

## 5. Map UI

### 13. `src/app/map/page.tsx`

The main map orchestration page. It handles visited country selection/removal, color assignment, labels, atlas reset, passport reveal banners, search/sort, and Country Explorer.

Learn this for map product behavior.

### 14. `src/components/maps/world/WorldAtlas.tsx`

Renders the interactive world atlas, hover/click states, zoom controls, visited coloring, and country neighbor metadata.

Learn this for atlas rendering and interaction.

### 15. `src/components/maps/city/CityExplorer.tsx`

Renders the country-level explorer modal with focused map previews and city/region context.

Learn this for country detail views and city exploration.

## 6. Passport System

### 16. `src/app/passport/page.tsx`

The passport route wrapper. It checks auth, reads visited countries, computes unlocked stamps, handles `?stamp=` deep links, and lazy-loads the heavy passport UI.

Learn this as the map-to-passport connection point.

### 17. `src/components/passport/PassportPage.tsx`

Main passport UI. It computes stats, selected regions, target stamp highlighting, rare collected stamps, and renders the archive.

Learn this for passport behavior and layout.

### 18. `src/components/stamps/StampGrid.tsx`

Renders the stamp grid and decides collected vs locked state and highlight behavior.

Learn this when changing stamp list behavior.

## 7. Stamp Rendering

### 19. `src/components/stamps/StampRenderer.tsx`

Main visual renderer for collected country stamps.

Learn this when changing how passport stamps look.

### 20. `src/data/stamps/countries.ts`

The country stamp catalog: stamp IDs, names, regions, aliases, atlas IDs, rarity, colors, landmarks, and metadata.

Learn this to understand how map countries unlock passport stamps.

### 21. `src/lib/stamps/matching.ts`

Stamp-matching helpers for normalizing country names and IDs.

Learn this before writing any new map/passport matching logic.

## 8. Journal System

### 22. `src/app/journal/page.tsx`

The main journal workspace. It coordinates Canva import/export, story fields, visited-country linking, scrapbook tools, trip import, saved entry opening, editing, renaming, deleting, sharing, and comments.

Learn this as the central journal orchestration file.

### 23. `src/lib/journalService.ts`

Client-side service wrapper for journal API calls.

Learn this before calling journal APIs from UI code.

### 24. `src/app/api/journal/route.ts`

Main backend endpoint for journal entries. It handles listing, searching, summary mode, single-entry lookup, create, patch, rename, and delete.

Learn this for journal persistence, ownership checks, validation, and migration fallbacks.

## 9. Canva and Scrapbook Journal Layer

### 25. `src/lib/journalCanvaPayload.ts`

Encodes/decodes fallback Canva metadata inside journal content.

Learn this because entries may store Canva metadata in both columns and fallback content payloads.

### 26. `src/lib/canvas/scrapbook.ts`

Defines the scrapbook canvas data model and creation helpers.

Learn this before changing scrapbook item types or saved canvas data.

### 27. `src/components/journal/canvas/ScrapbookCanvas.tsx`

Renders scrapbook pages and items from state owned by the journal page.

Learn this for scrapbook presentation.

## 10. Canva Integration

### 28. `src/lib/canvaService.ts`

Client-side wrapper for Canva app API routes.

Learn this before using Canva from UI code.

### 29. `src/lib/server/canva.ts`

Server-side Canva integration core: OAuth PKCE, token exchange/refresh, encryption, design listing/creation, exports, downloads, and folder organization.

Learn this for sensitive Canva behavior.

### 30. `src/app/api/canva/oauth/callback/route.ts`

Handles Canva OAuth return, validates state and auth, saves tokens, clears the temporary cookie, and redirects back to journal.

Learn this when debugging Canva connection issues.

## 11. Trip Import and Journal Sharing

### 31. `src/services/import/tripImportService.ts`

Parses imported itinerary/trip text into structured trip data.

Learn this when imported text parses incorrectly.

### 32. `src/components/import/ImportTripModal.tsx`

User-facing trip import UI.

Learn this to understand how raw trip text becomes a journal draft.

### 33. `src/lib/server/journalSharing.ts`

Server-side sharing and comments helper. It checks entry ownership/access, validates accepted friends, replaces share recipients, loads shared entries, maps rows, and creates/loads comments.

Learn this as the core access-control layer for shared journals.

## 12. Friends / Travel Circle

### 34. `src/app/friends/page.tsx`

Travel Circle UI for friends, incoming requests, outgoing requests, blocked users, and friend actions.

Learn this for the social graph UI.

### 35. `src/lib/friendService.ts`

Client-side friends API wrapper.

Learn this before calling friend APIs from UI code.

### 36. `src/lib/server/friendships.ts`

Server-side friendship helper for auth, profile lookup, existing friendship checks, row mapping, and grouped summaries.

Learn this for Travel Circle server logic.

## 13. Profile, Dashboard, and Travel Audit

### 37. `src/app/dashboard/page.tsx`

Signed-in command center and shortcut hub.

Learn this to understand the post-login product journey.

### 38. `src/app/profile/page.tsx`

Profile management page for display name, avatar, auth metadata, profile rows, and account shortcuts.

Learn this because profile data appears across header, friends, sharing, and comments.

### 39. `src/app/compare/page.tsx`

Travel Audit page that compares map visits with passport stamp coverage.

Learn this as an example of composing existing domains into a new feature.

## 14. AI Companion

### 40. `src/components/ai/TravelCompanionPage.tsx`

Main AI companion page. It gathers journal, scrapbook, import, map, atlas, and passport context.

Learn this to understand how companion context is assembled.

### 41. `src/hooks/chat/useTravelCompanionChat.ts`

Chat behavior hook. It owns messages, prompt sending, fallback vs server replies, active journal drafts, polishing, clearing chat, and saving drafts to journal.

Learn this for companion behavior.

### 42. `src/components/chat/ChatPanel.tsx`

Reusable chat UI for message feed, input composer, prompt buttons, thinking state, clear action, and save-draft action.

Learn this for chat presentation.

## 15. AI Service Layer

### 43. `src/lib/ai/companionChatService.ts`

Client service for `/api/ai/companion`.

Learn this as the boundary between the chat hook and server AI route.

### 44. `src/app/api/ai/companion/route.ts`

Server route for archive-grounded AI companion replies.

Learn this when tuning companion tone, grounding, or model behavior.

### 45. `src/app/api/ai/polish/route.ts`

Server route for polishing journal drafts and writing responses.

Learn this when changing draft refinement behavior.

## 16. Memory Keeper and Shared Types

### 46. `src/app/api/ai/memory-keeper/route.ts`

Specialized AI endpoint for memory-focused writing support.

Learn this as a separate AI path from general companion chat.

### 47. `src/services/memoryKeeperService.ts`

Client service wrapper for Memory Keeper.

Learn this before calling the memory-keeper route from UI code.

### 48. `src/types/index.ts`

Broad shared type file for auth users, journal entries, photos, passport stamps, countries, scratch map state, friends, shared journals, and generic API responses.

Learn this to understand the app vocabulary.

## 17. Focused Types and Sharing Schema

### 49. `src/types/friends.ts`

Travel Circle types: friendship statuses, profile summaries, friendship direction, grouped response, and request actions.

Learn this for friends-related UI and server mapping.

### 50. `src/types/journalSharing.ts`

Journal sharing types: share permissions, recipients, and shared journal entries with owner metadata.

Learn this for shared-entry behavior.

### 51. `supabase/friends.sql`

Creates `friendships`, `journal_shares`, and `journal_share_comments`, plus indexes and RLS policies.

Learn this for the database backbone of Travel Circle and sharing.

## 18. Remaining Supabase Migrations

### 52. `supabase/map_states.sql`

Creates the `map_states` table.

Learn this for cloud-synced map progress.

### 53. `supabase/canva_connections.sql`

Creates `canva_connections` for encrypted Canva OAuth tokens and metadata.

Learn this for Canva account persistence.

### 54. `supabase/canva_journal_entries.sql`

Adds Canva-specific columns to `journal_entries`.

Learn this for structured Canva-backed journal entries.

## 19. Final Migrations and Config

### 55. `supabase/canva_folders.sql`

Adds the remembered Travel Journal Canva folder ID.

Learn this for Canva design organization.

### 56. `supabase/journal_trip_dates.sql`

Adds trip date columns and validation to `journal_entries`.

Learn this for multi-day journal entries.

### 57. `package.json`

Shows runtime constraints, scripts, and the dependency stack.

Learn this before changing framework APIs, adding dependencies, or debugging builds.

## Recommended Learning Path

1. Read app foundation and auth first.
2. Follow map state from `mapStore` to `MapCloudSync` to `/map`.
3. Learn passport through the map-to-stamp unlock flow.
4. Learn journal through the Canva-first workspace and `/api/journal`.
5. Learn friends/sharing after journal basics.
6. Learn AI companion last, because it composes data from many other domains.
