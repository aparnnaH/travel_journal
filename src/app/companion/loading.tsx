import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Companion fallback keeps the chat/side-rail layout visible during navigation.
export default function CompanionLoading() {
  return <AppPageSkeleton variant="companion" />;
}
