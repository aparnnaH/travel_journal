'use client';

import React, { useMemo, useState } from 'react';
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

interface StampBookPage {
  label: string;
  stamps: CountryStamp[];
  stampIndexOffset: number;
}

interface PageFlipEvent {
  data?: number | PageFlipOrientation | {
    page?: number;
    mode?: PageFlipOrientation;
  };
}

const sortRegionEntries = (entries: [string, CountryStamp[]][]) =>
  entries.sort(([firstRegion], [secondRegion]) => {
    const firstIndex = REGION_ORDER.indexOf(firstRegion);
    const secondIndex = REGION_ORDER.indexOf(secondRegion);

    if (firstIndex === -1 && secondIndex === -1) {
      return firstRegion.localeCompare(secondRegion);
    }

    if (firstIndex === -1) return 1;
    if (secondIndex === -1) return -1;

    return firstIndex - secondIndex;
  });

const getSortedRegionEntries = (stamps: CountryStamp[]) =>
  sortRegionEntries(Object.entries(sortStampsByRegion(stamps)));

const chunkStampsForPages = (
  stamps: CountryStamp[],
  label: string,
  stampIndexOffset = 0,
  padToEvenPageCount = true,
) => {
  const pages: StampBookPage[] = [];

  for (let index = 0; index < stamps.length; index += STAMPS_PER_PAGE) {
    pages.push({
      label,
      stamps: stamps.slice(index, index + STAMPS_PER_PAGE),
      stampIndexOffset: stampIndexOffset + index,
    });
  }

  if (pages.length === 0) {
    pages.push({ label, stamps: [], stampIndexOffset });
  }

  if (padToEvenPageCount && pages.length % 2 !== 0) {
    pages.push({ label, stamps: [], stampIndexOffset: stampIndexOffset + stamps.length });
  }

  return pages;
};

const padBookPages = (pages: StampBookPage[]) => {
  if (pages.length === 0) {
    return pages;
  }

  if (pages.length % 2 === 0) {
    return pages;
  }

  const lastPage = pages[pages.length - 1];

  return [
    ...pages,
    {
      label: lastPage.label,
      stamps: [],
      stampIndexOffset: lastPage.stampIndexOffset + lastPage.stamps.length,
    },
  ];
};

const getRegionId = (region: string) => region.toLowerCase().replace(/\s+/g, '-');

interface PassportBookPageProps {
  label: string;
  pageNumber: number;
  stamps: CountryStamp[];
  stampIndexOffset: number;
  unlockedStamps: string[];
  side: 'left' | 'right';
}

const PassportBookPage = React.forwardRef<HTMLDivElement, PassportBookPageProps>(
  ({ label, pageNumber, stamps, stampIndexOffset, unlockedStamps, side }, ref) => (
    <div
      ref={ref}
      className={`${styles.passportPage} ${side === 'left' ? styles.leftPage : styles.rightPage} ${
        stamps.length === 0 ? styles.blankPage : ''
      }`}
    >
      <div className={styles.pageInner}>
        <div className={styles.pageMark}>
          <span>{label}</span>
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
  pages?: StampBookPage[];
  eyebrow?: string;
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
  pages: providedPages,
  eyebrow = 'Regional folio',
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [orientation, setOrientation] = useState<PageFlipOrientation>('landscape');

  const pages = useMemo(
    () => providedPages ?? chunkStampsForPages(regionStamps, region),
    [providedPages, region, regionStamps],
  );
  const unlockedInRegion = regionStamps.filter((stamp) => unlockedStamps.includes(stamp.id)).length;
  const totalPages = pages.length;
  const regionId = getRegionId(region);
  const isPortrait = orientation === 'portrait';
  const spreadStartPage = isPortrait ? currentPage + 1 : Math.floor(currentPage / 2) * 2 + 1;
  const spreadEndPage = isPortrait ? spreadStartPage : Math.min(spreadStartPage + 1, totalPages);
  const currentPageLabel =
    spreadEndPage !== spreadStartPage
      ? `${String(spreadStartPage).padStart(2, '0')}-${String(spreadEndPage).padStart(2, '0')}`
      : String(spreadStartPage).padStart(2, '0');

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

  return (
    <section className={styles.regionSection} aria-labelledby={`${regionId}-stamps`}>
      <div className={styles.regionHeader}>
        <div>
          <p className={styles.regionEyebrow}>{eyebrow}</p>
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
          <div
            className={styles.pageReadout}
            aria-label={`${region} showing page ${currentPageLabel} of ${totalPages}`}
            aria-live="polite"
          >
            <span>{spreadEndPage !== spreadStartPage ? 'Pages' : 'Page'}</span>
            <strong>{currentPageLabel}</strong>
            <small>of {String(totalPages).padStart(2, '0')}</small>
          </div>
        </div>
      </div>

      <div className={styles.bookStack} aria-label={`${region} passport book`}>
        <HTMLFlipBook
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
          disableFlipByClick={false}
          renderOnlyPageLengthChange={false}
          onFlip={handleFlip}
          onInit={handleInit}
          onChangeOrientation={handleOrientation}
        >
          {pages.map((pageStamps, pageIndex) => (
            <PassportBookPage
              key={`${region}-${pageIndex}-${pageStamps.label}`}
              label={pageStamps.label}
              pageNumber={pageIndex + 1}
              stamps={pageStamps.stamps}
              stampIndexOffset={pageStamps.stampIndexOffset}
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

  const allRegionEntries = useMemo(() => getSortedRegionEntries(stamps), [stamps]);

  const combinedBookPages = useMemo(() => {
    const { pages } = allRegionEntries.reduce<{ pages: StampBookPage[]; stampIndexOffset: number }>(
      (acc, [region, regionStamps]) => ({
        pages: [
          ...acc.pages,
          ...chunkStampsForPages(regionStamps, region, acc.stampIndexOffset, false),
        ],
        stampIndexOffset: acc.stampIndexOffset + regionStamps.length,
      }),
      { pages: [], stampIndexOffset: 0 },
    );

    return padBookPages(pages);
  }, [allRegionEntries]);

  const combinedBookStamps = useMemo(() => {
    return allRegionEntries.flatMap(([, regionStamps]) => regionStamps);
  }, [allRegionEntries]);

  const regionEntries = useMemo(() => {
    return getSortedRegionEntries(displayStamps);
  }, [displayStamps]);

  return (
    <div className={styles.stampGridWrapper}>
      {!selectedRegion ? (
        <RegionFlipBook
          key="complete-passport"
          region="Passport Collection"
          regionStamps={combinedBookStamps}
          unlockedStamps={unlockedStamps}
          pages={combinedBookPages}
          eyebrow="Complete passport"
        />
      ) : (
        regionEntries.map(([region, regionStamps]) => (
          <RegionFlipBook
            key={region}
            region={region}
            regionStamps={regionStamps}
            unlockedStamps={unlockedStamps}
          />
        ))
      )}

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
