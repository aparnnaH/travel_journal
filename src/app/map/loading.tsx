import AppPageSkeleton from '@/components/loading/PageSkeletons';

// Keeps the atlas area occupied while the protected map route hydrates.
export default function MapLoading() {
  return <AppPageSkeleton variant="map" />;
}
