'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';

interface HeaderProps {
  isScrolled?: boolean;
}

export function Header({ isScrolled = false }: HeaderProps) {
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
        isScrolled ? 'bg-cream/95 backdrop-blur shadow-soft' : 'bg-transparent'
      )}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="text-2xl font-serif font-bold text-gold-deep">✈️</div>
          <span className="text-lg font-serif font-bold text-ink">Travel Journal</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            href="#features"
            className="text-ink hover:text-gold transition-colors"
          >
            Features
          </Link>
          <Link
            href="/map"
            className="text-ink hover:text-gold transition-colors"
          >
            Map
          </Link>
          <Link
            href="/journal"
            className="text-ink hover:text-gold transition-colors"
          >
            Journal
          </Link>
          <Link
            href="/companion"
            className="text-ink hover:text-gold transition-colors"
          >
            Companion
          </Link>
          <Link
            href="/passport"
            className="text-ink hover:text-gold transition-colors"
          >
            Passport
          </Link>
          <Link
            href="/dashboard"
            className="text-ink hover:text-gold transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="#showcase"
            className="text-ink hover:text-gold transition-colors"
          >
            Showcase
          </Link>
          <Link
            href="#faq"
            className="text-ink hover:text-gold transition-colors"
          >
            FAQ
          </Link>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center space-x-3">
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
        </div>
      </nav>
    </header>
  );
}
