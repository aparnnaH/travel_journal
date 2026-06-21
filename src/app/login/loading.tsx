import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Auth form fallback used before the login client page hydrates.
export default function LoginLoading() {
  return <AppPageSkeleton variant="auth" />;
}
