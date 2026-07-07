// Travel Circle types.
// These shapes are shared by friends UI, client services, and server row mappers.
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type FriendProfile = {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
};

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  blockedBy?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  profile: FriendProfile;
  direction: 'incoming' | 'outgoing' | 'friend';
};

export type FriendsResponse = {
  friends: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
  blocked: Friendship[];
};

export type FriendCountry = {
  id: string;
  name: string;
};

export type FriendCountrySnapshot = {
  friendshipId: string;
  friend: FriendProfile;
  visitedCountries: FriendCountry[];
};

export type FriendCountrySnapshotsResponse = {
  friends: FriendCountrySnapshot[];
};

export type FriendRequestAction = 'accept' | 'block';
