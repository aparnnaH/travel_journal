import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Legacy companion alias uses the same shell before redirecting to /companion.
export default function AiCompanionLoading() {
  return <AppPageSkeleton variant="companion" />;
}
