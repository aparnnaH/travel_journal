'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Input, Button, Card } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { createOrUpdateProfile, fetchProfile } from '@/lib/profileService';
import { updateUserMetadata } from '@/lib/supabase';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    const loadProfile = async () => {
      const response = await fetchProfile(user.id);
      if (response.success && response.data?.[0]) {
        const profile = response.data[0];
        setDisplayName(profile.displayName ?? '');
        setAvatar(profile.avatar ?? '');
        return;
      }

      setDisplayName(user.displayName ?? '');
      setAvatar(user.avatar ?? '');
    };

    loadProfile();
  }, [router, user, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const profile = {
        id: user.id,
        email: user.email,
        displayName: displayName || undefined,
        avatar: avatar || undefined,
        createdAt: user.createdAt,
      };

      const profileResult = await createOrUpdateProfile(profile);
      if (!profileResult.success) {
        setError(profileResult.error || 'Unable to save profile.');
        setLoading(false);
        return;
      }

      await updateUserMetadata({ full_name: displayName || null, avatar_url: avatar || null });
      setUser(profile);
      setSuccessMessage('Profile updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error updating profile.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Profile"
        description="Update your travel persona and avatar for the vintage Travel Journal dashboard."
      >
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Email</label>
              <p className="rounded-2xl border border-gold/30 bg-white px-4 py-3 text-ink">{user.email}</p>
            </div>

            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              label="Avatar URL"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              helperText="Optional image URL used in your profile summary."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-700">{successMessage}</p>}
            <Button type="submit" isLoading={loading}>
              Save Profile
            </Button>
          </form>
        </Card>
      </PageShell>
    </div>
  );
}
