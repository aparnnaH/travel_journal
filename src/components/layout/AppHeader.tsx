'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/lib/supabase';

export default function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const accountLabel = user?.displayName || user?.email || 'Signed in';

  const handleSignOut = async () => {
    await signOut();
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-gold/10 bg-cream/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-ink">
          <span className="text-2xl font-serif text-gold-deep">✈️</span>
          <span className="text-lg font-serif font-bold">Travel Journal</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-ink md:flex lg:gap-6">
          <Link href="/" className="hover:text-gold transition-colors">
            Home
          </Link>
          <Link href="/map" className="hover:text-gold transition-colors">
            Map
          </Link>
          <Link href="/journal" className="hover:text-gold transition-colors">
            Journal
          </Link>
          <Link href="/companion" className="hover:text-gold transition-colors">
            Companion
          </Link>
          <Link href="/passport" className="hover:text-gold transition-colors">
            Passport
          </Link>
          <Link href="/dashboard" className="hover:text-gold transition-colors">
            Dashboard
          </Link>
          <Link href="/profile" className="hover:text-gold transition-colors">
            Profile
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-32 rounded-lg bg-gold/10" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                href="/profile"
                className="flex min-w-0 items-center gap-2 rounded-full border border-gold/30 bg-white/70 px-3 py-1.5 text-left shadow-sm transition-colors hover:border-gold/60"
                aria-label={`Signed in as ${accountLabel}`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-green-600" aria-hidden="true" />
                <span className="min-w-0 leading-tight">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
                    Signed in
                  </span>
                  <span className="hidden max-w-32 truncate text-xs font-semibold text-ink sm:block lg:max-w-40">
                    {accountLabel}
                  </span>
                </span>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
