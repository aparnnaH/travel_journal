import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Account page fallback while profile stats and auth state load.
export default function ProfileLoading() {
  return <AppPageSkeleton variant="profile" />;
}
