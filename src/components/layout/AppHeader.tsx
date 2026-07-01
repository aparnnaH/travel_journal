// App-wide navigation header.
// This client component reads auth state, renders route groups, supports mobile
// navigation, and owns the sign-out action shown in the Account menu.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  Compass,
  LogOut,
  MapPinned,
  Menu,
  Sparkles,
  Stamp,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { disableDemoMode, isDemoUserId } from '@/lib/demoMode';
import { signOut } from '@/lib/supabase';

type HeaderMenu = 'explore' | 'journal' | 'account' | null;

interface HeaderLink {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

const exploreLinks = [
  { label: 'Map', href: '/map', description: 'Mark countries, cities, and atlas progress.', icon: MapPinned },
  { label: 'Passport', href: '/passport', description: 'Browse unlocked stamps from your travels.', icon: Stamp },
  { label: 'Travel Audit', href: '/compare', description: 'Compare map visits with passport stamps.', icon: Compass },
  { label: 'Companion', href: '/companion', description: 'Draft and polish travel memories with AI.', icon: Sparkles },
] satisfies HeaderLink[];

const journalLinks = [
  { label: 'Journal Workspace', href: '/journal', description: 'Design new Canva pages and save travel stories.', icon: Sparkles },
  { label: 'All Entries', href: '/journal/entries', description: 'Browse, edit, share, and manage saved entries.', icon: BookOpen },
] satisfies HeaderLink[];

const accountLinks = [
  { label: 'Profile', href: '/profile', description: 'Update your identity, photo, and details.', icon: UserRound },
  { label: 'Friends / Travel Circle', href: '/friends', description: 'Manage friends and shared journal access.', icon: UsersRound },
] satisfies HeaderLink[];

// Creates a compact fallback avatar from the user's name or email.
const getInitials = (value: string) => {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'TJ';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
};

// The header groups routes into product areas so the top nav stays readable as
// the app grows.
export default function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<HeaderMenu>(null);
  const [pinnedMenu, setPinnedMenu] = useState<HeaderMenu>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountLabel = user?.displayName || user?.email || 'Signed in';
  const avatarUrl = user?.avatar?.trim();
  const isDemoUser = isDemoUserId(user?.id);

  // Dropdowns use a small close delay so moving the pointer from trigger to menu
  // does not immediately dismiss the menu.
  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const openHeaderMenu = (menu: Exclude<HeaderMenu, null>) => {
    clearCloseTimer();
    setOpenMenu(menu);
  };

  const pinHeaderMenu = (menu: Exclude<HeaderMenu, null>) => {
    clearCloseTimer();
    setOpenMenu(menu);
    setPinnedMenu((current) => (current === menu ? null : menu));
  };

  const scheduleMenuClose = (menu: Exclude<HeaderMenu, null>) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu((current) => (current === menu ? null : current));
    }, 180);
  };

  // Signs out from Supabase, clears local auth state, and returns to login.
  const handleSignOut = async () => {
    if (isDemoUser) {
      disableDemoMode();
    } else {
      await signOut();
    }
    logout();
    setOpenMenu(null);
    setPinnedMenu(null);
    setMobileOpen(false);
    router.push('/login');
  };

  const closeMenus = useCallback(() => {
    clearCloseTimer();
    setOpenMenu(null);
    setPinnedMenu(null);
    setMobileOpen(false);
  }, [clearCloseTimer]);

  const handleMenuLeave = (menu: Exclude<HeaderMenu, null>) => {
    if (pinnedMenu === menu) return;
    scheduleMenuClose(menu);
  };

  // Clicking outside a pinned desktop menu or pressing Escape closes all menus.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!pinnedMenu) return;
      const target = event.target;
      if (target instanceof Node && desktopNavRef.current?.contains(target)) return;
      closeMenus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearCloseTimer();
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearCloseTimer, closeMenus, pinnedMenu]);

  return (
    <header className="sticky top-0 z-40 border-b border-gold/10 bg-cream/90 backdrop-blur-xl">
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-ink" onClick={closeMenus}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/20 bg-white text-gold-deep shadow-sm">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">Travel Journal</span>
        </Link>

        <nav ref={desktopNavRef} className="hidden items-center gap-1 text-sm text-ink lg:flex">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-md px-4 py-2 font-medium text-ink/72 transition-colors hover:bg-white hover:text-ink"
            onClick={closeMenus}
          >
            Dashboard
          </Link>

          <div
            className="relative"
            onMouseEnter={() => openHeaderMenu('explore')}
            onMouseLeave={() => handleMenuLeave('explore')}
          >
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-1 rounded-md px-4 py-2 font-medium text-ink/72 transition-colors hover:bg-white hover:text-ink"
              onClick={() => pinHeaderMenu('explore')}
              aria-expanded={openMenu === 'explore'}
              aria-haspopup="menu"
            >
              Explore
              <ChevronDown className={`h-4 w-4 transition ${openMenu === 'explore' ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {openMenu === 'explore' ? (
              <div className="absolute left-0 top-full w-80 pt-3" role="menu">
                <div className="rounded-xl border border-gold/16 bg-white p-3 shadow-xl">
                  {exploreLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-cream hover:text-ink"
                      role="menuitem"
                      onClick={closeMenus}
                    >
                      <item.icon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="mt-1 block text-sm leading-snug text-ink/58">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div
            className="relative"
            onMouseEnter={() => openHeaderMenu('journal')}
            onMouseLeave={() => handleMenuLeave('journal')}
          >
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-1 rounded-md px-4 py-2 font-medium text-ink/72 transition-colors hover:bg-white hover:text-ink"
              onClick={() => pinHeaderMenu('journal')}
              aria-expanded={openMenu === 'journal'}
              aria-haspopup="menu"
            >
              Journal
              <ChevronDown className={`h-4 w-4 transition ${openMenu === 'journal' ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {openMenu === 'journal' ? (
              <div className="absolute left-0 top-full w-80 pt-3" role="menu">
                <div className="rounded-xl border border-gold/16 bg-white p-3 shadow-xl">
                  {journalLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-cream hover:text-ink"
                      role="menuitem"
                      onClick={closeMenus}
                    >
                      <item.icon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="mt-1 block text-sm leading-snug text-ink/58">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div
            className="relative"
            onMouseEnter={() => openHeaderMenu('account')}
            onMouseLeave={() => handleMenuLeave('account')}
          >
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-1 rounded-md px-4 py-2 font-medium text-ink/72 transition-colors hover:bg-white hover:text-ink"
              onClick={() => pinHeaderMenu('account')}
              aria-expanded={openMenu === 'account'}
              aria-haspopup="menu"
            >
              Account
              <ChevronDown className={`h-4 w-4 transition ${openMenu === 'account' ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {openMenu === 'account' ? (
              <div className="absolute right-0 top-full w-80 pt-3" role="menu">
                <div className="rounded-xl border border-gold/16 bg-white p-3 shadow-xl">
                  {user
                    ? accountLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-cream hover:text-ink"
                          role="menuitem"
                          onClick={closeMenus}
                        >
                          <item.icon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                          <span>
                            <span className="block text-sm font-semibold text-ink">{item.label}</span>
                            <span className="mt-1 block text-sm leading-snug text-ink/58">{item.description}</span>
                          </span>
                        </Link>
                      ))
                    : null}
                  {user ? (
                    <button
                      type="button"
                      className="mt-1 flex w-full select-none gap-4 rounded-md border-t border-gold/10 p-3 text-left leading-none no-underline outline-none transition-colors hover:bg-cream hover:text-ink"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">Sign out</span>
                        <span className="mt-1 block text-sm leading-snug text-ink/58">Leave this account on this device.</span>
                      </span>
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="block rounded-md px-3 py-2 font-medium text-ink transition hover:bg-cream"
                        role="menuitem"
                        onClick={closeMenus}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/signup"
                        className="block rounded-md px-3 py-2 font-medium text-ink transition hover:bg-cream"
                        role="menuitem"
                        onClick={closeMenus}
                      >
                        Get started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-32 rounded-lg bg-gold/10" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                href="/profile"
                className="flex min-w-0 items-center gap-2.5 rounded-full border border-gold/30 bg-white/70 py-1.5 pl-1.5 pr-3 text-left shadow-sm transition-colors hover:border-gold/60"
                aria-label={`Signed in as ${accountLabel}`}
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/25 bg-cream text-xs font-semibold text-gold-deep">
                  {avatarUrl ? (
                    <span
                      role="img"
                      aria-label={`${accountLabel} profile picture`}
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${avatarUrl})` }}
                    />
                  ) : (
                    <span aria-hidden="true">{getInitials(accountLabel)}</span>
                  )}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-green-600" aria-hidden="true" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
                    {isDemoUser ? 'Demo mode' : 'Signed in'}
                  </span>
                  <span className="hidden max-w-32 truncate text-xs font-semibold text-ink sm:block lg:max-w-40">
                    {accountLabel}
                  </span>
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup" className="hidden sm:block">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm lg:hidden" role="presentation" onClick={closeMenus}>
          <aside
            className="ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-gold/16 bg-cream p-5 shadow-xl"
            aria-label="Mobile navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2 text-ink" onClick={closeMenus}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/20 bg-white text-gold-deep shadow-sm">
                  <Compass className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-lg font-semibold">Travel Journal</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={closeMenus} aria-label="Close navigation menu">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <nav className="mt-8 flex flex-1 flex-col gap-6 text-sm text-ink">
              <Link href="/dashboard" className="font-semibold" onClick={closeMenus}>
                Dashboard
              </Link>

              <div>
                <p className="font-semibold text-ink">Explore</p>
                <div className="mt-2 grid gap-1">
                  {exploreLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-white"
                      onClick={closeMenus}
                    >
                      <item.icon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="mt-1 block text-sm leading-snug text-ink/58">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-ink">Journal</p>
                <div className="mt-2 grid gap-1">
                  {journalLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-white"
                      onClick={closeMenus}
                    >
                      <item.icon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="mt-1 block text-sm leading-snug text-ink/58">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-t border-gold/16 pt-5">
                <p className="font-semibold text-ink">Account</p>
                <div className="mt-2 grid gap-1">
                  {user ? (
                    <>
                      {accountLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-white"
                          onClick={closeMenus}
                        >
                          <item.icon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                          <span>
                            <span className="block text-sm font-semibold text-ink">{item.label}</span>
                            <span className="mt-1 block text-sm leading-snug text-ink/58">{item.description}</span>
                          </span>
                        </Link>
                      ))}
                      <button
                        type="button"
                        className="flex select-none gap-4 rounded-md p-3 text-left leading-none outline-none transition-colors hover:bg-white"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                        <span>
                          <span className="block text-sm font-semibold text-ink">Sign out</span>
                          <span className="mt-1 block text-sm leading-snug text-ink/58">Leave this account on this device.</span>
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="rounded-md px-3 py-2 font-medium transition-colors hover:bg-white"
                        onClick={closeMenus}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/signup"
                        className="rounded-md px-3 py-2 font-medium transition-colors hover:bg-white"
                        onClick={closeMenus}
                      >
                        Get started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </nav>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
