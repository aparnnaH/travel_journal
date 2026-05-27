'use client';

import React, { useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { CountryStamp } from '@/types/stamps';
import { sortStampsByRegion } from '@/lib/stamps/utils';
import PassportStamp from './PassportStamp';
import LockedStamp from './LockedStamp';
import styles from './StampGrid.module.css';

interface StampGridProps {
  stamps: CountryStamp[];
  unlockedStamps?: string[];
  selectedRegion?: string | null;
}

const REGION_ORDER = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Antarctica',
  'Global Archive',
];

const STAMPS_PER_PAGE = 4;

type PageFlipOrientation = 'portrait' | 'landscape';

interface PageFlipApi {
  flipNext: (corner?: 'top' | 'bottom') => void;
  flipPrev: (corner?: 'top' | 'bottom') => void;
  getCurrentPageIndex: () => number;
  getPageCount: () => number;
}

interface PageFlipBookRef {
  pageFlip: () => PageFlipApi;
}

interface PageFlipEvent {
  data?: number | PageFlipOrientation | {
    page?: number;
    mode?: PageFlipOrientation;
  };
}

const chunkStampsForPages = (stamps: CountryStamp[]) => {
  const pages: CountryStamp[][] = [];

  for (let index = 0; index < stamps.length; index += STAMPS_PER_PAGE) {
    pages.push(stamps.slice(index, index + STAMPS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  if (pages.length % 2 !== 0) {
    pages.push([]);
  }

  return pages;
};

const getRegionId = (region: string) => region.toLowerCase().replace(/\s+/g, '-');

interface PassportBookPageProps {
  region: string;
  pageNumber: number;
  stamps: CountryStamp[];
  stampIndexOffset: number;
  unlockedStamps: string[];
  side: 'left' | 'right';
}

const PassportBookPage = React.forwardRef<HTMLDivElement, PassportBookPageProps>(
  ({ region, pageNumber, stamps, stampIndexOffset, unlockedStamps, side }, ref) => (
    <div
      ref={ref}
      className={`${styles.passportPage} ${side === 'left' ? styles.leftPage : styles.rightPage} ${
        stamps.length === 0 ? styles.blankPage : ''
      }`}
    >
      <div className={styles.pageInner}>
        <div className={styles.pageMark}>
          <span>{region}</span>
          <small>{String(pageNumber).padStart(2, '0')}</small>
        </div>
        <div className={styles.pageGrid}>
          {stamps.map((stamp, index) => {
            const isUnlocked = unlockedStamps.includes(stamp.id);
            const stampIndex = stampIndexOffset + index;

            return (
              <div key={stamp.id} className={styles.stampWrapper}>
                {isUnlocked ? (
                  <PassportStamp stamp={stamp} isLocked={false} index={stampIndex} />
                ) : (
                  <LockedStamp stamp={stamp} index={stampIndex} />
                )}
              </div>
            );
          })}
          {stamps.length === 0 && <div className={styles.emptyPagePattern} aria-hidden="true" />}
        </div>
      </div>
    </div>
  ),
);

PassportBookPage.displayName = 'PassportBookPage';

interface RegionFlipBookProps {
  region: string;
  regionStamps: CountryStamp[];
  unlockedStamps: string[];
}

const getEventPage = (event: PageFlipEvent) => {
  if (typeof event.data === 'number') {
    return event.data;
  }

  if (typeof event.data === 'object' && typeof event.data?.page === 'number') {
    return event.data.page;
  }

  return 0;
};

const getEventOrientation = (event: PageFlipEvent): PageFlipOrientation | null => {
  if (event.data === 'portrait' || event.data === 'landscape') {
    return event.data;
  }

  if (
    typeof event.data === 'object' &&
    (event.data?.mode === 'portrait' || event.data?.mode === 'landscape')
  ) {
    return event.data.mode;
  }

  return null;
};

const RegionFlipBook: React.FC<RegionFlipBookProps> = ({
  region,
  regionStamps,
  unlockedStamps,
}) => {
  const bookRef = useRef<PageFlipBookRef | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [orientation, setOrientation] = useState<PageFlipOrientation>('landscape');

  const pages = useMemo(() => chunkStampsForPages(regionStamps), [regionStamps]);
  const unlockedInRegion = regionStamps.filter((stamp) => unlockedStamps.includes(stamp.id)).length;
  const totalPages = pages.length;
  const regionId = getRegionId(region);
  const isPortrait = orientation === 'portrait';
  const spreadStartPage = isPortrait ? currentPage + 1 : Math.floor(currentPage / 2) * 2 + 1;
  const spreadEndPage = isPortrait ? spreadStartPage : Math.min(spreadStartPage + 1, totalPages);
  const isFirstPage = currentPage <= 0;
  const isLastPage = isPortrait ? currentPage >= totalPages - 1 : currentPage >= totalPages - 2;

  const handleFlip = (event: PageFlipEvent) => {
    setCurrentPage(Math.min(getEventPage(event), Math.max(totalPages - 1, 0)));
  };

  const handleOrientation = (event: PageFlipEvent) => {
    const nextOrientation = getEventOrientation(event);

    if (nextOrientation) {
      setOrientation(nextOrientation);
    }
  };

  const handleInit = (event: PageFlipEvent) => {
    setCurrentPage(getEventPage(event));
    handleOrientation(event);
  };

  const flipPrevious = () => {
    bookRef.current?.pageFlip().flipPrev('top');
  };

  const flipNext = () => {
    bookRef.current?.pageFlip().flipNext('top');
  };

  return (
    <section className={styles.regionSection} aria-labelledby={`${regionId}-stamps`}>
      <div className={styles.regionHeader}>
        <div>
          <p className={styles.regionEyebrow}>Regional folio</p>
          <h2 id={`${regionId}-stamps`} className={styles.regionTitle}>
            {region}
          </h2>
        </div>
        <div className={styles.regionActions}>
          <div
            className={styles.regionStats}
            aria-label={`${unlockedInRegion} of ${regionStamps.length} collected`}
          >
            <span>{unlockedInRegion}</span>
            <small>of</small>
            <span>{regionStamps.length}</span>
          </div>
          <div className={styles.pageControls} aria-label={`${region} passport page controls`}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={flipPrevious}
              disabled={isFirstPage}
              aria-label={`Previous ${region} passport page`}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <span className={styles.pageIndicator} aria-live="polite">
              {String(spreadStartPage).padStart(2, '0')}
              {spreadEndPage !== spreadStartPage ? `-${String(spreadEndPage).padStart(2, '0')}` : ''}
              <small>/ {String(totalPages).padStart(2, '0')}</small>
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={flipNext}
              disabled={isLastPage}
              aria-label={`Next ${region} passport page`}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.bookStack} aria-label={`${region} passport book`}>
        <HTMLFlipBook
          ref={bookRef}
          className={styles.flipBook}
          style={{}}
          startPage={0}
          size="stretch"
          width={500}
          height={620}
          minWidth={320}
          maxWidth={520}
          minHeight={500}
          maxHeight={660}
          drawShadow
          flippingTime={760}
          usePortrait
          startZIndex={4}
          autoSize
          maxShadowOpacity={0.28}
          showCover={false}
          mobileScrollSupport
          clickEventForward
          useMouseEvents
          swipeDistance={28}
          showPageCorners
          disableFlipByClick
          renderOnlyPageLengthChange={false}
          onFlip={handleFlip}
          onInit={handleInit}
          onChangeOrientation={handleOrientation}
        >
          {pages.map((pageStamps, pageIndex) => (
            <PassportBookPage
              key={`${region}-${pageIndex}`}
              region={region}
              pageNumber={pageIndex + 1}
              stamps={pageStamps}
              stampIndexOffset={pageIndex * STAMPS_PER_PAGE}
              unlockedStamps={unlockedStamps}
              side={pageIndex % 2 === 0 ? 'left' : 'right'}
            />
          ))}
        </HTMLFlipBook>
      </div>
    </section>
  );
};

export const StampGrid: React.FC<StampGridProps> = ({
  stamps,
  unlockedStamps = [],
  selectedRegion,
}) => {
  const displayStamps = useMemo(() => {
    if (selectedRegion) {
      return stamps.filter((stamp) => stamp.region === selectedRegion);
    }

    return stamps;
  }, [stamps, selectedRegion]);

  const regionEntries = useMemo(() => {
    const stampsByRegion = sortStampsByRegion(displayStamps);

    return Object.entries(stampsByRegion).sort(([firstRegion], [secondRegion]) => {
      const firstIndex = REGION_ORDER.indexOf(firstRegion);
      const secondIndex = REGION_ORDER.indexOf(secondRegion);

      if (firstIndex === -1 && secondIndex === -1) {
        return firstRegion.localeCompare(secondRegion);
      }

      if (firstIndex === -1) return 1;
      if (secondIndex === -1) return -1;

      return firstIndex - secondIndex;
    });
  }, [displayStamps]);

  return (
    <div className={styles.stampGridWrapper}>
      {regionEntries.map(([region, regionStamps]) => (
        <RegionFlipBook
          key={region}
          region={region}
          regionStamps={regionStamps}
          unlockedStamps={unlockedStamps}
        />
      ))}

      {displayStamps.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No folio entries</p>
          <p className={styles.emptyText}>This region has no passport stamps yet.</p>
        </div>
      )}
    </div>
  );
};

export default StampGrid;
