'use client';

import React, { useMemo, useState } from 'react';
import { CountryStamp } from '@/types/stamps';
import { sortStampsByRegion } from '@/lib/stamps/utils';
import PassportStamp from './PassportStamp';
import LockedStamp from './LockedStamp';
import styles from './StampGrid.module.css';

interface StampGridProps {
  stamps: CountryStamp[];
  unlockedStamps?: string[];
  onStampUnlock?: (stampId: string) => void;
  selectedRegion?: string | null;
}

export const StampGrid: React.FC<StampGridProps> = ({
  stamps,
  unlockedStamps = [],
  onStampUnlock,
  selectedRegion,
}) => {
  const [animateUnlock, setAnimateUnlock] = useState<string | null>(null);

  const displayStamps = useMemo(() => {
    if (selectedRegion) {
      return stamps.filter((stamp) => stamp.region === selectedRegion);
    }
    return stamps;
  }, [stamps, selectedRegion]);

  const stampsByRegion = useMemo(() => {
    return sortStampsByRegion(displayStamps);
  }, [displayStamps]);

  const handleStampUnlock = (stampId: string) => {
    setAnimateUnlock(stampId);
    onStampUnlock?.(stampId);
    setTimeout(() => setAnimateUnlock(null), 600);
  };

  return (
    <div className={styles.stampGridWrapper}>
      {Object.entries(stampsByRegion).map(([region, regionStamps]) => (
        <div key={region} className={styles.regionSection}>
          <div className={styles.regionHeader}>
            <h2 className={styles.regionTitle}>{region}</h2>
            <div className={styles.regionStats}>
              <span className={styles.statItem}>
                {regionStamps.filter((s) => unlockedStamps.includes(s.id)).length}
              </span>
              <span className={styles.statDivider}>/</span>
              <span className={styles.statItem}>{regionStamps.length}</span>
            </div>
          </div>

          <div className={styles.grid}>
            {regionStamps.map((stamp) => {
              const isUnlocked = unlockedStamps.includes(stamp.id);
              const isAnimating = animateUnlock === stamp.id;

              return (
                <div key={stamp.id} className={styles.stampWrapper}>
                  {isUnlocked ? (
                    <PassportStamp
                      stamp={stamp}
                      isLocked={false}
                      onUnlock={() => handleStampUnlock(stamp.id)}
                    />
                  ) : (
                    <LockedStamp
                      stamp={stamp}
                      onUnlockClick={() => handleStampUnlock(stamp.id)}
                    />
                  )}

                  {isAnimating && (
                    <div className={styles.unlockCelebration}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className={styles.celebrationParticle}
                          style={{
                            '--delay': `${i * 50}ms`,
                            '--angle': `${(i / 8) * 360}deg`,
                          } as React.CSSProperties}
                        >
                          ⭐
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {displayStamps.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🗺️</div>
          <p className={styles.emptyText}>No stamps found in this region</p>
        </div>
      )}
    </div>
  );
};

export default StampGrid;
