# Travel Journal

A production-quality, cross-platform travel journaling app with interactive scratch-off world map, scrapbook-style journals, passport stamp collection, and friend collaboration features.

## 🌍 Features

### Core Features
- **Interactive Scratch Map**: Scratch off countries as you visit them, tracking your global adventures
- **Scrapbook Journals**: Document memories with polaroid-style photos, mood tags, and handwritten notes
- **Passport Stamp Collection**: Collect digital stamps for every country visited
- **Friend Collaboration**: Share adventures with friends in real-time with live updates
- **Offline-First Support**: Access your journal and map without internet, syncs automatically when reconnected

### Technical Features
- TypeScript for strong typing across the entire codebase
- Responsive mobile-first design
- Real-time updates with Supabase
- Row-level security for privacy
- Accessibility support
- Production-ready architecture

## 🎨 Design System

### Color Palette
- **Cream**: `#F5EDD8` - Primary background
- **Gold**: `#C9A96E` - Primary accent
- **Deep Gold**: `#8B6035` - Secondary accent
- **Ink**: `#3D2B0E` - Primary text

### Typography
- **Playfair Display**: Headings (serif)
- **Crimson Pro**: Body text (serif)
- **Caveat**: Handwritten notes (script)

## 📁 Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── layout.tsx      # Root layout with fonts
│   ├── page.tsx        # Landing page
│   └── globals.css     # Global styles and Tailwind config
├── components/         # Reusable components
│   ├── ui/            # Base UI components (Button, Card, Input, etc.)
│   └── layout/        # Layout components (Header, Footer, Navigation)
├── features/          # Feature-specific components and logic
│   ├── landing/       # Landing page components
│   ├── auth/          # Authentication features
│   ├── map/           # Scratch map feature
│   ├── journal/       # Journal entries and entries list
│   ├── passport/      # Passport stamp collection
│   └── friends/       # Friend collaboration
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
│   └── supabase.ts    # Supabase client setup
├── services/          # API and external services
├── store/             # Zustand state management
│   ├── authStore.ts   # Authentication state
│   └── mapStore.ts    # Scratch map state
├── types/             # TypeScript type definitions
│   └── index.ts       # Core types and interfaces
└── utils/             # Utility functions
    └── cn.ts          # Class name merging utility
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (installed via Homebrew on macOS)
- npm 11+
- Supabase account

### Installation

1. **Environment Configuration**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials:
     ```bash
     NEXT_PUBLIC_SUPABASE_URL=your_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
     ```

   To get Supabase credentials:
   1. Visit [app.supabase.com](https://app.supabase.com)
   2. Create a new project
   3. Go to Project Settings → API
   4. Copy the URL and anon key

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Build for Production
```bash
npm run build
npm run start
```

## 📦 Installed Dependencies

### Core Framework
- **next** (16.2.6) - React framework
- **react** & **react-dom** - React library

### State Management & Data
- **zustand** - Lightweight state management
- **@tanstack/react-query** - Server state management
- **@supabase/supabase-js** - Supabase client

### Styling & UI
- **tailwindcss** (4.x) - Utility-first CSS framework
- **@tailwindcss/postcss** - PostCSS plugin for Tailwind 4

### Animations
- **framer-motion** - Animation library for React

### Utilities
- **clsx** - Utility for constructing classNames
- **tailwind-merge** - Merge Tailwind CSS classes

### Development
- **typescript** - TypeScript compiler
- **eslint** - Code quality
- **sass** - SCSS support

## 🏗️ Architecture Decisions

### Component Organization
- **UI Components**: Reusable, style-focused components (Button, Card, Input)
- **Feature Components**: Feature-specific components grouped by domain
- **Layout Components**: Shared layout structure (Header, Footer)

### State Management
- **Zustand**: Lightweight stores for auth and map state
- **React Query**: Server state with Supabase
- **Local State**: React useState for component-level state

### Styling
- **Tailwind CSS 4**: Utility-first CSS with new inline @theme syntax
- **Custom Utilities**: Soft shadows defined in @layer utilities
- **CSS Variables**: Design tokens for colors

### API & Backend
- **Supabase**: PostgreSQL database + auth + realtime
- **Row-Level Security**: User data isolation
- **Realtime Subscriptions**: Live updates for collaboration

## 🔧 Available Scripts

```bash
# Development
npm run dev        # Start dev server with hot reload

# Production
npm run build      # Build for production
npm run start      # Start production server

# Code Quality
npm run lint       # Run ESLint
```

## 📝 Next Steps

### Phase 1: Foundation (Current)
- ✅ Project setup and folder structure
- ✅ Design system and Tailwind configuration
- ✅ Base UI components (Button, Card, Input)
- ✅ Zustand stores (auth, map)
- ✅ Supabase client setup
- ✅ Landing page with features showcase

### Phase 2: Authentication
- [ ] Auth UI components
- [ ] Login/Signup pages
- [ ] Email verification
- [ ] Google OAuth integration
- [ ] Protected routes

### Phase 3: Scratch Map
- [ ] SVG world map component
- [ ] Canvas scratch animation
- [ ] Country data and paths
- [ ] Scratch persistence

### Phase 4: Journal System
- [ ] Journal entry pages
- [ ] Memory cards UI
- [ ] Photo upload integration
- [ ] Mood tags and notes

### Phase 5: Passport & Friends
- [ ] Passport stamp grid
- [ ] Friend collaboration
- [ ] Realtime updates
- [ ] Sharing features

## 🔐 Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Your Supabase anonymous key

# Optional (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=         # For server-side operations
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Query Documentation](https://tanstack.com/query/latest)

## 🎯 Project Goals

1. **Production-Ready**: Enterprise-grade code quality
2. **Scalable**: Easy to add new features and maintain
3. **Type-Safe**: Full TypeScript coverage
4. **Performant**: Optimized bundle and runtime performance
5. **Accessible**: WCAG compliant UI
6. **Offline-First**: Works without internet connection
7. **Privacy-Focused**: User data is user's alone

---

**Built with ❤️ for travelers**
