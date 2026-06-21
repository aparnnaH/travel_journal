import AppPageSkeleton from '@/components/loading/PageSkeletons';

// App Router fallback for the public home route while the page streams in.
export default function Loading() {
  return <AppPageSkeleton variant="landing" />;
}
