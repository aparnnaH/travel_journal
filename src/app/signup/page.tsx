// Signup page.
// Creates a Supabase Auth user from the browser and then relies on the shared
// auth provider/session cookie flow used by the rest of the app.
'use client';

import React, { useEffect, useState } from 'react';
import { Input, Button } from '@/components/ui';
import AppHeader from '@/components/layout/AppHeader';
import { signUpWithEmail, signInWithEmail } from '@/lib/supabase';
import { createOrUpdateProfile } from '@/lib/profileService';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// Prevents open redirects by only allowing local absolute paths.
const getSafeRedirectPath = (value: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
};

// Reads the redirect target from the URL in the browser.
const getRedirectPath = () => {
  if (typeof window === 'undefined') return '/';

  return getSafeRedirectPath(new URLSearchParams(window.location.search).get('from'));
};

// Renders the email/password signup form and handles account creation.
export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace(getRedirectPath());
    }
  }, [isAuthLoading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signUpWithEmail(email, password);
      if (error) {
        setError(error.message || 'Sign up failed');
        setLoading(false);
        return;
      }

      // After signup, attempt to sign in to obtain a session/user
      const signInResult = await signInWithEmail(email, password);
      const user = signInResult.data?.user;

      if (user) {
        const profile = {
          id: user.id,
          email: user.email || '',
          displayName: user.user_metadata?.full_name || undefined,
          avatar: user.user_metadata?.avatar_url || undefined,
          createdAt: (user.created_at as string) || new Date().toISOString(),
        };

        setUser(profile);
        await createOrUpdateProfile(profile);
      }

      setLoading(false);
      router.push(getRedirectPath());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md px-6">
          <h1 className="text-3xl font-serif text-ink mb-6">Create Account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between">
            <Button type="submit" isLoading={loading}>
              Create account
            </Button>
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}
