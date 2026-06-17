'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/lib/supabase';

export default function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gold/10 bg-cream/95 backdrop-blur-sm">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3 text-ink">
          <span className="text-2xl font-serif">✈️</span>
          <div>
            <p className="text-lg font-serif font-bold">Travel Journal</p>
            <p className="text-sm text-ink/70">Plan, track, and remember every journey</p>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm text-ink">
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

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-ink/70">{user.email}</span>
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
