import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Mirrors the Canva-first workspace so journal navigation never opens blank.
export default function JournalLoading() {
  return <AppPageSkeleton variant="journal" />;
}
