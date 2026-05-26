'use client';

import Image from 'next/image';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui';
import type { PhotoAsset } from '@/lib/canvas/scrapbook';

type PhotoTrayProps = {
  assets: PhotoAsset[];
  onUpload: () => void;
  onPlacePhoto: (asset: PhotoAsset) => void;
};

type PhotoTrayItemProps = {
  asset: PhotoAsset;
  onPlacePhoto: (asset: PhotoAsset) => void;
};

function PhotoTrayItem({ asset, onPlacePhoto }: PhotoTrayItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `photo-tray-${asset.id}`,
    data: { assetId: asset.id },
  });

  return (
    <div
      ref={setNodeRef}
      draggable
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.68 : 1 }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/scrapbook-photo', asset.id);
        event.dataTransfer.effectAllowed = 'copy';
      }}
      className="rounded-lg border border-gold/20 bg-cream/60 p-2 transition-shadow hover:shadow-md-soft"
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <Image
          src={asset.src}
          alt={asset.alt}
          width={140}
          height={92}
          unoptimized
          className="h-20 w-full rounded bg-white object-cover"
        />
        <p className="mt-2 truncate text-sm text-ink/70">{asset.caption}</p>
      </div>
      <Button type="button" size="sm" variant="ghost" className="mt-2 w-full" onClick={() => onPlacePhoto(asset)}>
        Place
      </Button>
    </div>
  );
}

export default function PhotoTray({ assets, onUpload, onPlacePhoto }: PhotoTrayProps) {
  return (
    <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-ink">Photo Tray</h3>
        <Button type="button" size="sm" variant="outline" onClick={onUpload}>
          Upload
        </Button>
      </div>
      {assets.length ? (
        <div className="grid grid-cols-2 gap-3">
          {assets.map((asset) => (
            <PhotoTrayItem key={asset.id} asset={asset} onPlacePhoto={onPlacePhoto} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink/60">No photos uploaded.</p>
      )}
    </section>
  );
}
