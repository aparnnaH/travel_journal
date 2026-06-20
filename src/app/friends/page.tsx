// Travel Circle page.
// Lets signed-in users send friend requests, accept/block incoming requests, and
// manage relationships that journal sharing depends on.
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock3,
  Compass,
  MailPlus,
  Send,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Button, Card, Input } from '@/components/ui';
import { fetchFriends, removeFriendship, sendFriendRequest, updateFriendRequest } from '@/lib/friendService';
import { useAuthStore } from '@/store/authStore';
import type { FriendsResponse, Friendship } from '@/types/friends';

const emptyFriends: FriendsResponse = {
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
};

// Uses display name when available and falls back to email.
const getFriendLabel = (friendship: Friendship) =>
  friendship.profile.displayName || friendship.profile.email || 'Travel friend';

// Creates avatar initials for friends without profile images.
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

// Formats friendship dates without crashing on invalid values.
const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

// Protected page that loads grouped friendship data through the friends service.
export default function FriendsPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const [friendsData, setFriendsData] = useState<FriendsResponse>(emptyFriends);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect anonymous users and fetch Travel Circle data for signed-in users.
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    const loadFriends = async () => {
      setLoading(true);
      const response = await fetchFriends();
      setLoading(false);

      if (response.success && response.data) {
        setFriendsData(response.data);
        setError(null);
      } else {
        setError(response.error || 'Unable to load friends.');
      }
    };

    loadFriends();
  }, [router, user, isLoading]);

  const totalPending = friendsData.incoming.length + friendsData.outgoing.length;
  const heroLabel = user?.displayName || user?.email || 'Traveler';
  const stats = useMemo(
    () => [
      {
        label: 'Friends',
        value: friendsData.friends.length,
        detail: 'Accepted travel circle',
        icon: UsersRound,
        tone: 'bg-[#E8F1EA] text-[#315F43]',
      },
      {
        label: 'Incoming',
        value: friendsData.incoming.length,
        detail: 'Requests to review',
        icon: UserRoundPlus,
        tone: 'bg-[#F3E6D8] text-[#71481F]',
      },
      {
        label: 'Pending',
        value: totalPending,
        detail: 'Open friend requests',
        icon: Clock3,
        tone: 'bg-[#EAF0F6] text-[#27516F]',
      },
    ],
    [friendsData.friends.length, friendsData.incoming.length, totalPending]
  );

  if (isLoading || !user) {
    return null;
  }

  const refreshFriends = async () => {
    const response = await fetchFriends();

    if (response.success && response.data) {
      setFriendsData(response.data);
    }
  };

  const handleSendRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const response = await sendFriendRequest(email);
    setSubmitting(false);

    if (!response.success) {
      setError(response.error || 'Unable to send friend request.');
      return;
    }

    setEmail('');
    setMessage('Friend request sent.');
    await refreshFriends();
  };

  const handleAccept = async (friendshipId: string) => {
    setError(null);
    setMessage(null);
    const response = await updateFriendRequest(friendshipId, 'accept');

    if (!response.success) {
      setError(response.error || 'Unable to accept request.');
      return;
    }

    setMessage('Friend request accepted.');
    await refreshFriends();
  };

  const handleRemove = async (friendshipId: string, successCopy = 'Friendship updated.') => {
    setError(null);
    setMessage(null);
    const response = await removeFriendship(friendshipId);

    if (!response.success) {
      setError(response.error || 'Unable to update friendship.');
      return;
    }

    setMessage(successCopy);
    await refreshFriends();
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Friends"
        description="Build a private travel circle for requests now, and shared journals next."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.push('/dashboard')} className="gap-2">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Button>
            <Button onClick={() => router.push('/profile')} className="gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Profile
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <Card className="overflow-hidden border-gold/30 bg-[#fff8ea] p-0" variant="elevated">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="p-6 sm:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                    <UsersRound className="h-4 w-4" aria-hidden="true" />
                    Travel circle
                  </div>
                  <h2 className="mt-5 max-w-2xl text-4xl font-serif font-semibold leading-tight text-ink sm:text-5xl">
                    Invite friends into your travel archive, {heroLabel}.
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/72">
                    Friend requests are private for now. Once your circle is ready, shared journals and travel memories can
                    build on this list.
                  </p>
                </div>
                <div className="border-t border-gold/20 bg-[#21382B] p-6 text-cream lg:border-l lg:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream/64">Circle size</p>
                  <p className="mt-3 text-6xl font-serif font-semibold">{friendsData.friends.length}</p>
                  <p className="mt-4 text-sm leading-6 text-cream/74">
                    {friendsData.friends.length > 0
                      ? 'Accepted friends are ready for future sharing.'
                      : 'Start by sending one friend request.'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-white/90">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Add friend</p>
                <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Send an invite</h2>
              </div>
              <form onSubmit={handleSendRequest} className="space-y-4">
                <Input
                  label="Friend email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="friend@example.com"
                  helperText="Use the email attached to their Travel Journal profile."
                />
                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}
                {message ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {message}
                  </p>
                ) : null}
                <Button type="submit" isLoading={submitting} className="w-full gap-2">
                  <MailPlus className="h-4 w-4" aria-hidden="true" />
                  Send request
                </Button>
              </form>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-3xl border border-gold/20 bg-white p-5 shadow-soft">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink/52">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{loading ? '...' : stat.value}</p>
                  <p className="mt-1 text-sm text-ink/62">{stat.detail}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="bg-white/90">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Friends</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Your travel circle</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refreshFriends()} className="gap-2 self-start sm:self-auto">
                  Refresh
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {friendsData.friends.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {friendsData.friends.map((friendship) => (
                    <FriendCard
                      key={friendship.id}
                      friendship={friendship}
                      actionLabel="Remove"
                      actionIcon={UserMinus}
                      onAction={() => handleRemove(friendship.id, 'Friend removed.')}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={UsersRound}
                  title="No friends yet"
                  description="Send an invite by email to start building your travel circle."
                />
              )}
            </Card>

            <div className="space-y-6">
              <Card className="bg-[#F8F1E4]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Incoming</p>
                    <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Requests</h2>
                  </div>
                  <UserRoundPlus className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                </div>
                {friendsData.incoming.length > 0 ? (
                  <div className="space-y-3">
                    {friendsData.incoming.map((friendship) => (
                      <FriendCard
                        key={friendship.id}
                        friendship={friendship}
                        actionLabel="Accept"
                        actionIcon={UserCheck}
                        onAction={() => handleAccept(friendship.id)}
                        secondaryActionLabel="Decline"
                        secondaryActionIcon={X}
                        onSecondaryAction={() => handleRemove(friendship.id, 'Request declined.')}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={UserCheck} title="No requests" description="New friend requests will appear here." compact />
                )}
              </Card>

              <Card className="bg-white/90">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Outgoing</p>
                    <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Sent invites</h2>
                  </div>
                  <Send className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                </div>
                {friendsData.outgoing.length > 0 ? (
                  <div className="space-y-3">
                    {friendsData.outgoing.map((friendship) => (
                      <FriendCard
                        key={friendship.id}
                        friendship={friendship}
                        actionLabel="Cancel"
                        actionIcon={X}
                        onAction={() => handleRemove(friendship.id, 'Request canceled.')}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Clock3} title="No sent invites" description="Pending invites you send will appear here." compact />
                )}
              </Card>
            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
}

// Displays either a profile image or initials for a friendship row.
function FriendAvatar({ friendship }: { friendship: Friendship }) {
  const label = getFriendLabel(friendship);
  const avatarUrl = friendship.profile.avatar?.trim();

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold/20 bg-cream text-sm font-semibold text-gold-deep">
      {avatarUrl ? (
        <span
          role="img"
          aria-label={`${label} avatar`}
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${avatarUrl})` }}
        />
      ) : (
        <span aria-hidden="true">{getInitials(label)}</span>
      )}
    </span>
  );
}

// Reusable card for accepted, incoming, outgoing, and blocked friendships.
function FriendCard({
  actionIcon: ActionIcon,
  actionLabel,
  friendship,
  onAction,
  onSecondaryAction,
  secondaryActionIcon: SecondaryActionIcon,
  secondaryActionLabel,
}: {
  actionIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  actionLabel: string;
  friendship: Friendship;
  onAction: () => void;
  onSecondaryAction?: () => void;
  secondaryActionIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  secondaryActionLabel?: string;
}) {
  const label = getFriendLabel(friendship);

  return (
    <article className="rounded-lg border border-gold/16 bg-cream/36 p-3">
      <div className="flex items-start gap-3">
        <FriendAvatar friendship={friendship} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink">{label}</h3>
          <p className="truncate text-sm text-ink/62">{friendship.profile.email}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/42">
            {friendship.status} / {formatDate(friendship.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onAction} className="gap-2">
          <ActionIcon className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </Button>
        {onSecondaryAction && SecondaryActionIcon && secondaryActionLabel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onSecondaryAction} className="gap-2">
            <SecondaryActionIcon className="h-4 w-4" aria-hidden="true" />
            {secondaryActionLabel}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

// Shared empty state for friend-list sections.
function EmptyState({
  compact = false,
  description,
  icon: Icon,
  title,
}: {
  compact?: boolean;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
}) {
  return (
    <div className={`rounded-lg border border-dashed border-gold/30 bg-white/60 ${compact ? 'p-4' : 'p-6'} text-ink/65`}>
      <Icon className="h-5 w-5 text-gold-deep" aria-hidden="true" />
      <p className="mt-3 font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}
