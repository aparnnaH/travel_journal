import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Social page fallback while friend data and auth state settle.
export default function FriendsLoading() {
  return <AppPageSkeleton variant="friends" />;
}
