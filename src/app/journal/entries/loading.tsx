import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Archive route fallback with card-shaped placeholders for owned/shared lists.
export default function JournalEntriesLoading() {
  return <AppPageSkeleton variant="journalEntries" />;
}
