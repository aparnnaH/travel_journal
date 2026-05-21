# Travel Journal - Development Setup Guide

## Quick Start After Clone

```bash
# Install dependencies (if not already done)
npm install

# Set up environment variables
cp .env.local.example .env.local

# Add your Supabase credentials to .env.local
# Get these from: https://app.supabase.com

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Folder Structure Guide

### `/src/app`
Next.js App Router pages and layouts.
- `layout.tsx` - Root layout with font configuration
- `page.tsx` - Landing page
- `globals.css` - Global styles and design system

### `/src/components`
Reusable UI components organized by type.

**ui/** - Base components used throughout the app:
- `Button.tsx` - Styled button with variants (primary, secondary, outline, ghost)
- `Card.tsx` - Container component with elevation variants
- `Input.tsx` - Form input with label, error, and helper text support

**layout/** - Layout-specific components:
- `Header.tsx` - Navigation header with sticky scroll behavior
- `Footer.tsx` - Site footer with links and social

### `/src/features`
Feature-specific components and logic grouped by domain.

**landing/** - Landing page feature:
- `Header.tsx` - Navigation
- `HeroSection.tsx` - Hero with animations
- `FeaturesSection.tsx` - Features grid
- `Footer.tsx` - Footer

**auth/** - (Scaffolded, to be implemented)
- Login/Signup components
- OAuth integration

**map/** - (Scaffolded, to be implemented)
- Interactive SVG world map
- Scratch canvas overlay

**journal/** - (Scaffolded, to be implemented)
- Journal entry creation
- Memory cards
- Photo uploads

**passport/** - (Scaffolded, to be implemented)
- Stamp grid display
- Collection management

**friends/** - (Scaffolded, to be implemented)
- Friend requests
- Shared journals
- Realtime updates

### `/src/lib`
Shared utility libraries and integrations.
- `supabase.ts` - Supabase client initialization

### `/src/hooks`
Custom React hooks for reusable logic.

### `/src/services`
API calls and external service integrations.

### `/src/store`
Zustand state management stores.
- `authStore.ts` - User authentication state
- `mapStore.ts` - Scratch map state (visited countries, scratch percentage)

### `/src/types`
TypeScript interfaces and types.
- `index.ts` - Core domain types (User, Journal, Passport, etc.)

### `/src/utils`
Utility functions and helpers.
- `cn.ts` - Class name merging (combines clsx + tailwind-merge)

## Design System

### Colors (CSS Variables)
```css
--color-cream: #F5EDD8       /* Primary background */
--color-gold: #C9A96E        /* Primary accent */
--color-gold-deep: #8B6035   /* Secondary accent */
--color-ink: #3D2B0E         /* Primary text */
```

### Typography
```css
--font-serif: "Playfair Display"   /* Headings */
--font-sans: "Crimson Pro"         /* Body */
--font-script: "Caveat"            /* Handwriting */
```

### Custom Utilities
```css
.shadow-soft      /* Light shadow */
.shadow-md-soft   /* Medium shadow */
.shadow-lg-soft   /* Large shadow */
```

## Common Tasks

### Add a New Component

1. Create file in appropriate folder:
   ```bash
   src/components/ui/MyComponent.tsx
   ```

2. Use the template:
   ```tsx
   'use client';

   import React from 'react';
   import { cn } from '@/utils/cn';

   interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
     variant?: 'default' | 'secondary';
     children: React.ReactNode;
   }

   const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
     ({ className, variant = 'default', children, ...props }, ref) => {
       return (
         <div ref={ref} className={cn('base-styles', className)} {...props}>
           {children}
         </div>
       );
     }
   );

   MyComponent.displayName = 'MyComponent';

   export default MyComponent;
   ```

3. Export from `index.ts` in the folder

### Add a New Page

1. Create folder structure in app directory:
   ```bash
   src/app/(group)/route-name/page.tsx
   ```

2. Create the page component:
   ```tsx
   export default function Page() {
     return <div>Page content</div>;
   }
   ```

### Add to Zustand Store

```tsx
import { create } from 'zustand';

interface MyStore {
  data: string;
  setData: (data: string) => void;
}

export const useMyStore = create<MyStore>((set) => ({
  data: '',
  setData: (data) => set({ data }),
}));
```

Usage in component:
```tsx
const data = useMyStore((state) => state.data);
const setData = useMyStore((state) => state.setData);
```

### Add Tailwind Utility

In `src/app/globals.css`:
```css
@layer utilities {
  .my-utility {
    /* CSS here */
  }
}
```

## Testing the Build

```bash
# Build for production
npm run build

# Start production server
npm run start

# Run type checking
npm run lint
```

## Supabase Setup

1. Create project at https://app.supabase.com
2. Go to Project Settings → API
3. Copy:
   - URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Add to `.env.local`

### Database Schema (To Be Implemented)

```sql
-- Users (handled by Supabase Auth)

-- Journal Entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  country_id VARCHAR,
  title VARCHAR,
  content TEXT,
  mood VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Passport Stamps
CREATE TABLE passport_stamps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  country_id VARCHAR,
  visited_at TIMESTAMP
);

-- Row Level Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
```

## Performance Tips

1. **Use Image Optimization**: Next.js `next/image` for all images
2. **Code Splitting**: Components are automatically code-split
3. **Lazy Loading**: Use React.lazy() for non-critical components
4. **Optimize Fonts**: Google Fonts are pre-connected in layout
5. **Data Fetching**: Use React Query for efficient caching

## Debugging

### Browser DevTools
- Check Network tab for API calls
- Use React DevTools for component state
- Check Console for errors

### VS Code
- TypeScript errors show inline
- ESLint warnings appear
- Hover over variables for type info

## Common Issues

### Build fails with Tailwind error
- Clear `.next` folder: `rm -rf .next`
- Reinstall: `npm install`

### Supabase not connecting
- Check `.env.local` has correct values
- Verify API key hasn't expired
- Check browser console for errors

### Fonts not loading
- Clear browser cache
- Check Network tab in DevTools
- Verify font names in layout.tsx

## Next Development Steps

1. Set up Supabase authentication
2. Create auth pages (login/signup)
3. Build interactive scratch map
4. Implement journal entry system
5. Add real-time collaboration features

---

For more details, see [README.md](../README.md)
