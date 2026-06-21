import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Auth form fallback used before the signup client page hydrates.
export default function SignupLoading() {
  return <AppPageSkeleton variant="auth" />;
}
