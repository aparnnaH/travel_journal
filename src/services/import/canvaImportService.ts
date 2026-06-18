import {
  BOARD_FALLBACK_WIDTH,
  BOARD_HEIGHT,
  PHOTO_WIDTH,
  clamp,
  createId,
  createScrapbookPage,
  getPhotoHeight,
} from '@/lib/canvas/scrapbook';
import type { ScrapbookPageData, ScrapbookPhotoItem } from '@/lib/canvas/scrapbook';
import type { CanvaDesign } from '@/types/canva';

type CreateCanvaImportPagesInput = {
  design: CanvaDesign;
  dataUrls: string[];
  startPageNumber: number;
  boardWidth?: number;
};

export type CanvaImportResult = {
  title: string;
  scrapbookPages: ScrapbookPageData[];
};

export function createCanvaImportPages({
  design,
  dataUrls,
  startPageNumber,
  boardWidth = BOARD_FALLBACK_WIDTH,
}: CreateCanvaImportPagesInput): CanvaImportResult {
  const title = design.title?.trim() || 'Canva design';
  const pageWidth = Math.max(boardWidth, BOARD_FALLBACK_WIDTH);
  const photoWidth = clamp(Math.round(pageWidth * 0.82), PHOTO_WIDTH, pageWidth - 64);
  const photoHeight = Math.min(getPhotoHeight(photoWidth), BOARD_HEIGHT - 96);
  const x = Math.round((pageWidth - photoWidth) / 2);
  const y = Math.round((BOARD_HEIGHT - photoHeight) / 2);

  const scrapbookPages: ScrapbookPageData[] = dataUrls.map((src, index) => {
    const page = createScrapbookPage(startPageNumber + index);
    const photoItem: ScrapbookPhotoItem = {
      id: createId(),
      type: 'photo',
      src,
      alt: `${title} page ${index + 1}`,
      caption: index === 0 ? title : `${title} page ${index + 1}`,
      x,
      y,
      width: photoWidth,
      height: photoHeight,
      rotation: index % 2 === 0 ? -1.2 : 1.2,
      zIndex: 1,
    };

    return {
      ...page,
      id: `canva-${design.id}-${index + 1}-${createId()}`,
      title: dataUrls.length === 1 ? title : `${title} ${index + 1}`,
      theme: 'grid',
      template: 'collage',
      items: [photoItem],
    };
  });

  return { title, scrapbookPages };
}
