'use client';

import React, { useState } from 'react';
import { Input, Button } from '@/components/ui';
import AppHeader from '@/components/layout/AppHeader';
import { signUpWithEmail, signInWithEmail } from '@/lib/supabase';
import { createOrUpdateProfile } from '@/lib/profileService';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await signUpWithEmail(email, password);
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
      router.push('/map');
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
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
