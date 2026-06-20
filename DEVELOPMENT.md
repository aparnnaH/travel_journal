# Travel Journal Developer Guide

This guide explains how the current system fits together. It is meant for orientation and feature work, not as a line-by-line code walkthrough.

## Overall Architecture

Travel Journal is a Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS, Supabase, and Zustand. The app is organized around a public landing page plus authenticated product routes for the dashboard, map, journal, passport, friends, profile, travel audit, and AI companion.

Most product pages are client components because they coordinate local UI state, Supabase-backed data, browser storage, drag/drop, maps, and authenticated navigation. Server-side behavior lives primarily in App Router route handlers under `src/app/api`, with shared server helpers in `src/lib/server`.

The main persistence model is split:

- Supabase Auth handles identity.
- Supabase tables store profiles, journal entries, friend relationships, journal sharing, comments, Canva OAuth tokens, Canva journal metadata, and cloud-synced map state.
- Zustand plus `localStorage` keeps the scratch-map state responsive on the client, with `MapCloudSync` syncing it to Supabase for signed-in users.
- Browser storage also supports some scrapbook/import companion context.

## Folder Structure

`src/app` contains App Router pages, layouts, loading states, and route handlers. User-facing pages include `/`, `/dashboard`, `/profile`, `/map`, `/journal`, `/journal/entries`, `/passport`, `/compare`, `/friends`, `/companion`, `/ai-companion`, `/login`, and `/signup`. API routes live below `src/app/api`.

`src/components` contains reusable UI and feature components. Important subfolders are `layout` for `AppHeader` and `PageShell`, `maps` for atlas and city explorer UI, `journal` for scrapbook canvas pieces, `passport` and `stamps` for passport rendering, `ai` and `chat` for the companion experience, `import` for trip import UI, and `ui` for primitives.

`src/features` currently holds landing-page composition, including the public hero, feature section, footer, and landing map preview.

`src/lib` holds shared application logic: Supabase clients, profile/journal/friends/map services, AI helpers, Canva payload utilities, scrapbook data models, stamp matching, trip parsing, and server-only helper modules.

`src/store` contains Zustand stores for auth state and map state. `src/hooks` contains feature hooks, including the companion chat hook and journal layout store. `src/types` contains shared TypeScript domain types.

`src/data` contains stamp and atlas reference data. `public` contains static assets, especially stamp artwork and textures. `supabase` contains migration-style SQL files for optional feature tables and columns.

## Main User Flows

Authentication starts on `/login` or `/signup`. Users authenticate through Supabase client helpers, then the client syncs the access token into an HTTP-only app cookie through `/api/auth/session`. `AuthProvider` initializes the user, loads profile details, subscribes to auth state changes, and renders `MapCloudSync`.

The landing page at `/` uses `AppHeader`, `HeroSection`, and `FeaturesSection`. The primary journey leads signed-in users toward the authenticated map experience.

The dashboard at `/dashboard` is the signed-in command center. It links to map progress, journal work, passport stamps, profile, friends, and companion features.

The map flow at `/map` lets a user mark countries visited, assign stable colors, open Country Explorer, add/remove city-level context, reset atlas progress, and jump to a newly revealed passport stamp. The map writes immediately to Zustand and is cloud-synced when a user is signed in.

The journal flow is split between `/journal` and `/journal/entries`. `/journal` is the main Canva-first workspace with Canva design creation/import, story and metadata editing, scrapbook canvas tools, trip import, sharing controls, comments, and delete/rename flows. `/journal/entries` is the focused saved-entry browsing surface.

The Canva flow starts with `/api/canva/oauth/start`, returns through `/api/canva/oauth/callback`, stores encrypted tokens in Supabase, then uses `/api/canva/designs` and `/api/canva/exports` to list/create/export designs. Saved journal entries can store Canva design IDs, edit URLs, page images, cover selection, and fallback payload data.

The passport flow at `/passport` reads visited countries from the map store, matches them to `COUNTRY_STAMPS`, and renders unlocked/locked stamp states. Query links such as `/passport?stamp=...` highlight a specific stamp after a map reveal.

The friends flow at `/friends` loads the friendship summary, sends requests by email, accepts/blocks requests, removes friendships, and supports journal sharing to accepted friends.

The AI companion flow at `/companion` and `/ai-companion` builds a travel context from journal entries, scrapbook/import storage, visited countries, and passport data. It uses local fallback generation plus optional server-backed OpenAI endpoints for companion replies, memory-keeper output, and journal polishing.

## Database Structure

Supabase Auth owns users. The app also expects a `profiles` table keyed by the auth user ID and containing at least email, display name, avatar URL, and created timestamp fields.

`journal_entries` stores each private journal entry by `user_id`, `country_id`, title, content, mood, tags, timestamps, and optional trip date columns. Canva migrations add design ID, title, edit URL, page image JSON, and page count columns. Some Canva and trip metadata can also be encoded into the entry content as a fallback for older schemas.

`map_states` stores one row per auth user. It mirrors the persisted map store: scratch percentage, visited country IDs, country colors, country labels, country cities, and last-updated timestamps.

`friendships` links two profiles with `requester_id`, `addressee_id`, status, optional `blocked_by`, and timestamps. Statuses are `pending`, `accepted`, and `blocked`.

`journal_shares` links a journal entry owner to accepted friends. It references `journal_entries`, `profiles` for `shared_by`, and `profiles` for `shared_with`, with a permission such as `view` or `comment`.

`journal_share_comments` stores comments on accessible shared entries. It references the journal entry and author profile.

`canva_connections` stores one encrypted Canva token set per user, plus Canva user/team IDs, expiry, scopes, and an optional Travel Journal folder ID.

The SQL files in `supabase/` enable RLS for the feature tables they define. Because route handlers use the Supabase service role after validating the app session token, they enforce user ownership and access rules in server code as well.

## Authentication Flow

Client auth helpers in `src/lib/supabase.ts` create a browser Supabase client lazily and expose email sign-up, sign-in, sign-out, metadata update, current-user lookup, and cookie sync.

`AuthProvider` runs on the client for the whole app. On mount it gets the Supabase session, syncs the access token to `/api/auth/session`, fetches the user, loads the profile via `/api/profile`, stores a normalized `AuthUser` in `useAuthStore`, and subscribes to Supabase auth changes.

`/api/auth/session` validates the Supabase token with the admin client, then writes or clears the HTTP-only `sb-access-token` cookie. Server route handlers read this cookie, or a bearer token, through `getAuthenticatedRouteContext`.

Protected client pages generally read `useAuthStore`. If auth finishes and no user exists, they redirect to `/login`. Protected route handlers validate the cookie before reading or mutating Supabase data.

## Public Repository Safety

Documentation should show environment variable names and placeholder values only. Do not paste live Supabase keys, service-role credentials, OpenAI keys, Canva OAuth secrets, Instagram app secrets, bearer tokens, cookies, JWTs, database URLs with embedded passwords, private keys, or real user data into markdown examples.

Use `.env.local.example` for non-secret variable names and safe defaults. Keep real values in `.env.local`, Supabase/Vercel project settings, or another secret manager. Treat `NEXT_PUBLIC_*` values as browser-visible configuration and keep privileged behavior behind server route handlers.

When documenting auth or data flows, describe cookie names, route names, table names, and ownership checks at a high level. Avoid committing request logs, response bodies, screenshots, or copied vendor console output if they contain identifiers that could grant access or identify real users.

## API Routes

`/api/auth/session` writes and clears the HTTP-only session cookie used by server route handlers.

`/api/profile` gets or upserts the current user's profile row.

`/api/journal` lists, searches, summarizes, fetches, creates, updates, renames, and deletes the current user's journal entries. It validates required fields, trip dates, Canva image payloads, and ownership.

`/api/journal/share` loads or replaces share recipients for an owned journal entry. Replacement is constrained to accepted friends.

`/api/journal/shared` lists or fetches entries shared with the current user.

`/api/journal/comments` lists and creates comments on entries the current user can access.

`/api/friends` returns the current user's friendship summary grouped into friends, incoming, outgoing, and blocked lists.

`/api/friends/request` sends friend requests, accepts incoming requests, and blocks friendships.

`/api/friends/[friendshipId]` removes a friendship.

`/api/canva/oauth/start` starts Canva OAuth with PKCE and a short-lived state cookie. `/api/canva/oauth/callback` validates the callback, exchanges the code, and stores encrypted tokens.

`/api/canva/designs` lists Canva designs and creates new journal-sized Canva designs, with best-effort organization into a Travel Journal folder.

`/api/canva/exports` and `/api/canva/exports/[exportId]` create or poll Canva export jobs and can return exported images as data URLs for journal saving.

`/api/canva/return` is a Canva return endpoint that redirects users back into the journal experience.

`/api/ai/companion`, `/api/ai/polish`, and `/api/ai/memory-keeper` are optional Node runtime AI endpoints. They require `OPENAI_API_KEY` and fall back gracefully in client flows when unavailable.

## State Management

Global app state is intentionally small. `useAuthStore` keeps the normalized auth user, auth loading state, and auth error state.

`useMapStore` is the largest shared state store. It persists scratch percentage, visited countries, country colors, country labels, city pins, and timestamps to `localStorage`. `MapCloudSync` hydrates it, resolves local-vs-remote precedence, and debounces saves to Supabase.

Most complex screen state is local to the route component. `/journal` owns many modal, form, Canva, scrapbook, sharing, editing, and comment states. `/map` owns atlas selection, sorting/searching, reveal banners, reset/remove confirmations, and map-derived lookup tables.

Server data is usually accessed through small service wrappers in `src/lib/*Service.ts`. TanStack Query is installed, but the current code mostly uses direct `fetch` calls plus local React state.

## Key Components

`AuthProvider` initializes auth, keeps the auth store current, syncs the session cookie, and mounts map cloud sync.

`AppHeader` provides the app-wide navigation, signed-in account display, dropdown grouping, mobile menu, and sign-out behavior.

`PageShell` gives authenticated product pages a consistent header, title, description, and action area.

`MapCloudSync` bridges the local map store and Supabase `map_states`, including conflict handling and visible sync warnings.

`WorldAtlas` renders the interactive country atlas, hover/click behavior, zoom controls, and country-neighbor metadata used by color assignment.

`CityExplorer` renders country-level city exploration and OpenStreetMap tile previews for a selected country.

`JournalPage` in `src/app/journal/page.tsx` is the main journal orchestration surface. It coordinates Canva import/export, journal entry save/edit/delete, country linking, trip import, scrapbook canvas state, sharing, and comments.

`ScrapbookCanvas` and related journal canvas components render draggable/rotatable/resizable scrapbook content.

`ImportTripModal`, `ParsedTimelineView`, and import services parse itinerary-like text into journal-ready trip material.

`PassportPage` and `StampGrid` render the passport archive, stats, filtering, deep-link targeting, and locked/unlocked stamp states.

`StampRenderer`, `PassportStamp`, and `LockedStamp` own the visual stamp rendering system.

`TravelCompanionPage`, `ChatPanel`, and `useTravelCompanionChat` build the AI companion context, chat interaction, draft generation, polishing, and save-to-journal flow.

## Adding a Feature

Start by locating the owning route or domain. Page-level workflows usually begin in `src/app/<route>/page.tsx`; reusable UI belongs in `src/components/<domain>`; shared client API calls belong in `src/lib/*Service.ts`; server-only data access belongs in `src/lib/server`.

Follow App Router conventions. Add a `page.tsx` for a new UI route, a `loading.tsx` for route-level loading UI when useful, and a `route.ts` under `src/app/api` for backend-for-frontend endpoints. Route handlers should use `NextRequest`/`NextResponse` and should not be placed beside a `page.tsx` at the same segment.

For authenticated API work, use `getAuthenticatedRouteContext` or the friend-specific route context helper, validate ownership/access in the handler or server helper, and return `{ success, data, error }` shapes consistently.

For database work, add or update a SQL file in `supabase/`, document required ordering if it depends on base tables, enable RLS where appropriate, and update TypeScript mapping code rather than leaking raw rows through UI code.

For state, prefer local component state unless multiple distant surfaces need the data. Use Zustand when a domain state must be shared across routes or persisted, as with auth and map state.

For UI, reuse `AppHeader`, `PageShell`, and primitives in `src/components/ui`. Keep feature logic near its domain and avoid broad rewrites of the map, journal, scrapbook, passport, or Canva systems when extending one area.

Before opening a PR or handing off, run targeted lint for touched files when possible and run `npm run build` for route/API changes. The repo has historically preferred targeted lint plus build when unrelated lint noise appears.

## Known Technical Debt

`DEVELOPMENT.md` had drifted behind the app before this guide; keep docs updated when routes, migrations, or feature ownership change.

The journal page is a very large orchestration component. Canva workspace, entry management, sharing/comments, country picker, scrapbook tools, and trip import would be easier to maintain as smaller hooks and child components.

The app mixes raw Supabase row shapes and normalized camelCase types in several places. More generated database types or centralized mappers would reduce fallback logic and duplicated field aliases.

Search for journal entries and shared entries is partly in-memory after fetching rows. This is workable for small datasets but should move to indexed database search for larger accounts.

Canva payloads have backward-compatible fallbacks encoded into journal content. That helps migration safety but increases read/write complexity.

Map state has both local and cloud sources of truth. `MapCloudSync` handles this carefully, but future map changes should preserve its hydration and ownership logic.

AI companion behavior uses a mix of local heuristics, browser storage, service wrappers, and optional server endpoints. It may benefit from a clearer durable memory model if the companion becomes central.

There is no full test suite in the current scripts. Verification is mostly ESLint and production build, with manual checks for interactive flows.
