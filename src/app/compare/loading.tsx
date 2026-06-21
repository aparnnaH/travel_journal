import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Travel audit fallback while map/passport comparison data hydrates.
export default function CompareLoading() {
  return <AppPageSkeleton variant="compare" />;
}
