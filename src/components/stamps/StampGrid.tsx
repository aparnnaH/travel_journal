'use client';

import React, { useMemo } from 'react';
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
      {regionEntries.map(([region, regionStamps]) => {
        const unlockedInRegion = regionStamps.filter((stamp) =>
          unlockedStamps.includes(stamp.id),
        ).length;
        const regionId = region.toLowerCase().replace(/\s+/g, '-');

        return (
          <section key={region} className={styles.regionSection} aria-labelledby={`${regionId}-stamps`}>
            <div className={styles.regionHeader}>
              <div>
                <p className={styles.regionEyebrow}>Regional folio</p>
                <h2 id={`${regionId}-stamps`} className={styles.regionTitle}>
                  {region}
                </h2>
              </div>
              <div className={styles.regionStats} aria-label={`${unlockedInRegion} of ${regionStamps.length} collected`}>
                <span>{unlockedInRegion}</span>
                <small>of</small>
                <span>{regionStamps.length}</span>
              </div>
            </div>

            <div className={styles.grid}>
              {regionStamps.map((stamp, index) => {
                const isUnlocked = unlockedStamps.includes(stamp.id);

                return (
                  <div key={stamp.id} className={styles.stampWrapper}>
                    {isUnlocked ? (
                      <PassportStamp stamp={stamp} isLocked={false} index={index} />
                    ) : (
                      <LockedStamp
                        stamp={stamp}
                        index={index}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

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
