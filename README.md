# Travel Journal

A Next.js travel archive for mapping visited countries, building scrapbook-style journals, collecting passport stamps, sharing entries with friends, and auditing map progress against passport coverage.

## Current App Surface

### Main pages

- `/` - public landing page with feature sections and visual previews
- `/login` and `/signup` - Supabase-backed authentication
- `/dashboard` - signed-in command center with map, journal, passport, profile, and Travel Circle shortcuts
- `/profile` - editable profile details, avatar display, profile completeness, and account shortcuts
- `/map` - scratch-map experience with visited countries, country explorer, city pins, and atlas controls
- `/journal` - journal entries, scrapbook canvas, trip import, entry sharing, shared entries, and comments
- `/passport` - passport stamp collection, locked/unlocked stamp states, and map-to-stamp reveal links
- `/compare` - user-facing **Travel Audit** page that compares map visits with passport stamp coverage
- `/friends` - **Travel Circle** friend requests, accepted friends, blocked users, and friend discovery by email
- `/companion` and `/ai-companion` - AI travel-memory assistant and journal draft workflow

### Recent product additions

- Organized app header with `Dashboard`, `Explore`, `Journal`, and `Account` groups.
- `Explore` dropdown includes Map, Passport, Travel Audit, and Companion.
- `Account` dropdown includes Profile, Friends / Travel Circle, and Sign out.
- Dashboard and Profile now surface Travel Circle without keeping Friends in the main header nav.
- Journal sharing prompts users to open Travel Circle when no friends exist.
- Travel Audit compares visited countries with passport stamp matches, missing map-stamp links, and still-locked stamp goals.
- Signed-in header shows the profile image or initials beside the account label.
- Profile completeness is hidden once the profile is complete.

## Feature Overview

### Map and Country Explorer

- Interactive world atlas built around visited countries and country labels.
- Country Explorer modal with city data and OpenStreetMap tile previews.
- City pins are stored with the map state.
- Map state persists locally with Zustand persistence.

### Journal and Scrapbook

- Journal entry creation and listing.
- Scrapbook canvas with draggable memories, rotatable photos, decorations, and page themes.
- Trip import components for parsing itinerary-like content into draft journal material.
- Shared journal section for entries shared with the current user.
- Comments on accessible shared journal entries.

### Passport Stamps

- Digital passport collection driven by country stamp metadata.
- Locked and unlocked stamp states.
- Asset-ready stamp rendering with SVG/PNG artwork and texture layers.
- Deep links such as `/passport?stamp=...` can highlight a specific stamp.

### Travel Audit

- Compares `visitedCountries` from the map store with the passport stamp catalog.
- Shows matched countries, mapped countries without stamp matches, and passport stamps not yet unlocked by the map.
- Links back to Map, Passport, and Journal for follow-up work.

### Friends / Travel Circle

- Friend request flow with pending, accepted, and blocked states.
- Journal sharing to accepted friends.
- View/comment access for shared entries.
- Supabase RLS policies for friendships, journal shares, and comments.

### AI Companion

- Travel-memory-aware companion page.
- Can use journal entries, scrapbook notes/photos, imported trips, map context, and passport context.
- Optional server-side OpenAI polishing endpoint for draft refinement.
- Drafts can be saved back to the journal flow.

## Tech Stack

- **Next.js 16.2.6** with App Router
- **React 19.2.4**
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** for auth, database access, and server-side admin operations
- **Zustand** for client state and persisted map state
- **TanStack React Query** for server state patterns
- **Framer Motion**, `react-pageflip`, `react-simple-maps`, `react-moveable`, `react-konva`, and `lucide-react`

## Project Structure

```text
src/
├── app/
│   ├── api/                  # Next route handlers
│   ├── dashboard/            # Signed-in dashboard
│   ├── map/                  # Scratch map route
│   ├── journal/              # Journal, scrapbook, sharing, comments
│   ├── passport/             # Passport route
│   ├── compare/              # Travel Audit route
│   ├── friends/              # Travel Circle route
│   ├── profile/              # Profile route
│   └── companion/            # AI companion route
├── components/
│   ├── ai/                   # Companion cards and page composition
│   ├── chat/                 # Companion chat panel
│   ├── import/               # Trip import UI
│   ├── journal/              # Scrapbook/canvas components
│   ├── layout/               # AppHeader and PageShell
│   ├── maps/                 # World atlas and city explorer
│   ├── passport/             # Passport page UI
│   ├── stamps/               # Stamp renderers and locked states
│   └── ui/                   # Button, Card, Input, Badge
├── data/
│   └── stamps/               # Country stamp and atlas data
├── hooks/
├── lib/
│   ├── ai/                   # Companion context, storage, polishing
│   ├── canvas/               # Scrapbook data model
│   ├── server/               # Server helpers for friends/sharing
│   ├── stamps/               # Stamp matching and map comparison
│   └── trip-parser/          # Trip import parsing
├── store/                    # Zustand auth/map stores
├── types/                    # Shared TypeScript types
└── utils/                    # Shared utilities

supabase/
└── friends.sql               # Friendships, journal shares, comments, and RLS policies
```

## Getting Started

### Prerequisites

- Node.js 20.9+ LTS. Node 20, 22, or 24 is recommended; Node 26 currently emits a tooling deprecation warning during `next build`.
- npm 11+
- Supabase project

### Install

```bash
npm install
```

### Environment

Copy the example file and fill in the values:

```bash
cp .env.local.example .env.local
```

Required for the app:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional for AI journal polishing:

```env
OPENAI_API_KEY=
OPENAI_POLISH_MODEL=gpt-5.2
```

Optional for Canva journal design import/export:

```env
CANVA_CLIENT_ID=
CANVA_CLIENT_SECRET=
CANVA_REDIRECT_URI=
CANVA_RETURN_URL=
CANVA_TOKEN_ENCRYPTION_KEY=
```

The example file still includes Instagram variables, but the current active app routes do not require them for the core map, journal, passport, friends, profile, dashboard, or companion flows.

### Supabase setup

The app expects Supabase auth plus base `profiles` and `journal_entries` tables used by the existing services.

For cloud-synced map state, run:

```bash
supabase/map_states.sql
```

For the friend and sharing feature, run:

```bash
supabase/friends.sql
```

That SQL adds:

- `friendships`
- `journal_shares`
- `journal_share_comments`
- indexes for friend/share/comment lookups
- row-level security policies for user-owned access

Run it after the base `profiles` and `journal_entries` tables exist, because the script references both.

For Canva import/export support, run:

```bash
supabase/canva_connections.sql
supabase/canva_folders.sql
supabase/canva_journal_entries.sql
```

Those SQL files add encrypted Canva token storage, remember the Travel Journal Canva folder, and add Canva metadata/page fields to journal entries.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If another dev server is already using port 3000, Next.js may choose the next available port.

### Production

```bash
npm run build
npm run start
```

## Scripts

```bash
npm run dev      # Start the Next.js dev server
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run start    # Start the production server
```

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional AI companion polish endpoint
OPENAI_API_KEY=
OPENAI_POLISH_MODEL=gpt-5.2

# Optional Canva journal design import/export
CANVA_CLIENT_ID=
CANVA_CLIENT_SECRET=
CANVA_REDIRECT_URI=
CANVA_RETURN_URL=
CANVA_TOKEN_ENCRYPTION_KEY=

# Present in .env.local.example, not required by current core routes
NEXT_PUBLIC_INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI=
NEXT_PUBLIC_APP_URL=
```

## API Routes

- `/api/profile` - profile read/update flow
- `/api/journal` - journal persistence
- `/api/journal/share` - replace/load journal share recipients
- `/api/journal/shared` - shared journal entries accessible to the current user
- `/api/journal/comments` - comments on accessible journal entries
- `/api/friends` - friendship summary
- `/api/friends/request` - create friend requests
- `/api/friends/[friendshipId]` - accept, block, or remove friendships
- `/api/ai/polish` - optional AI polish endpoint for companion drafts

## Notes for Future Work

- The user-facing Travel Audit page currently lives at `/compare`; only the label has been renamed.
- The app header intentionally groups secondary pages under dropdowns instead of placing every route in the main nav.
- Map and passport systems are connected through country/stamp matching but should remain loosely coupled.
- Friend sharing depends on accepted friendships and the `supabase/friends.sql` schema.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

---

Built for travelers who want their map, memories, friends, and passport stamps in one place.
