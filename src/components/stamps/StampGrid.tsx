'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

const celebrationParticles = [
  { x: -84, y: -34 },
  { x: -46, y: -82 },
  { x: 22, y: -92 },
  { x: 82, y: -42 },
  { x: 90, y: 28 },
  { x: 38, y: 86 },
  { x: -34, y: 82 },
  { x: -86, y: 22 },
];

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

  const stampsByRegion = useMemo(() => sortStampsByRegion(displayStamps), [displayStamps]);

  const handleStampUnlock = (stampId: string) => {
    if (unlockedStamps.includes(stampId)) {
      return;
    }

    setAnimateUnlock(stampId);
    onStampUnlock?.(stampId);
    window.setTimeout(() => setAnimateUnlock(null), 900);
  };

  return (
    <div className={styles.stampGridWrapper}>
      {Object.entries(stampsByRegion).map(([region, regionStamps]) => {
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
                const isAnimating = animateUnlock === stamp.id;

                return (
                  <div key={stamp.id} className={styles.stampWrapper}>
                    {isUnlocked ? (
                      <PassportStamp stamp={stamp} isLocked={false} index={index} />
                    ) : (
                      <LockedStamp
                        stamp={stamp}
                        onUnlockClick={() => handleStampUnlock(stamp.id)}
                        index={index}
                      />
                    )}

                    <AnimatePresence>
                      {isAnimating && (
                        <motion.div
                          className={styles.unlockCelebration}
                          aria-hidden="true"
                          initial={{ opacity: 1, scale: 0.84 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {celebrationParticles.map((particle, particleIndex) => (
                            <motion.span
                              key={`${particle.x}-${particle.y}`}
                              className={styles.celebrationParticle}
                              initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                              animate={{
                                opacity: [0, 1, 0],
                                x: particle.x,
                                y: particle.y,
                                scale: [0.5, 1, 0.7],
                              }}
                              exit={{ opacity: 0 }}
                              transition={{
                                duration: 0.92,
                                delay: particleIndex * 0.035,
                                ease: 'easeOut',
                              }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
