// Main passport archive UI.
// Receives already-computed unlocked stamp ids from the route and focuses on
// presentation: stats, region filtering, highlighting, and stamp grid rendering.
'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { COUNTRY_STAMPS, STAMP_REGIONS } from '@/data/stamps/countries';
import { PassportStats } from '@/types/stamps';
import { getCompletionPercentage } from '@/lib/stamps/utils';
import StampGrid from '@/components/stamps/StampGrid';
import styles from './PassportPage.module.css';

interface PassportPageComponentProps {
  initialUnlockedStamps?: string[];
  initialTargetStampId?: string | null;
}

// Renders the interactive passport collection.
export const PassportPageComponent: React.FC<PassportPageComponentProps> = ({
  initialUnlockedStamps = [],
  initialTargetStampId = null,
}) => {
  // A target stamp from the URL initializes both the selected region and
  // temporary highlight state.
  const initialTargetStamp = useMemo(
    () => COUNTRY_STAMPS.find((stamp) => stamp.id === initialTargetStampId) ?? null,
    [initialTargetStampId],
  );
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => initialTargetStamp?.region ?? null);
  const [targetStampId, setTargetStampId] = useState<string | null>(() => initialTargetStamp?.id ?? null);

  // Convert ids into full stamp records for stats and highlights.
  const unlockedStamps = useMemo(
    () => Array.from(new Set(initialUnlockedStamps)),
    [initialUnlockedStamps],
  );

  // Passport stats are derived from the static stamp catalog and current unlocks.
  const stats: PassportStats = useMemo(() => {
    const unlocked = unlockedStamps.length;
    const total = COUNTRY_STAMPS.length;
    const regionsVisited = Array.from(
      new Set(COUNTRY_STAMPS.filter((stamp) => unlockedStamps.includes(stamp.id)).map((stamp) => stamp.region)),
    );

    return {
      total_stamps: total,
      unlocked_stamps: unlocked,
      locked_stamps: total - unlocked,
      completion_percentage: getCompletionPercentage(unlocked, total),
      regions_visited: regionsVisited,
    };
  }, [unlockedStamps]);

  // Region filters come from the stamp catalog so adding stamp metadata updates
  // the filter list automatically.
  const availableRegions = useMemo(() => {
    const usedRegions = new Set(COUNTRY_STAMPS.map((stamp) => stamp.region));

    return STAMP_REGIONS.filter((region) => usedRegions.has(region));
  }, []);

  return (
    <motion.main
      className={styles.passportPageWrapper}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <motion.section
        className={styles.masthead}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className={styles.mastheadCopy}>
          <p className={styles.kicker}>Passport Archive</p>
          <h1 className={styles.pageTitle}>Collectible Passport</h1>
          <p className={styles.pageDescription}>
            A tactile archive of borders crossed, marks earned, and places that stayed with you.
          </p>
          <div className={styles.archiveMeta} aria-label="Passport collection summary">
            <span>Edition 2026</span>
            <span>{stats.total_stamps} country seals</span>
            <span>{stats.regions_visited.length} regions started</span>
          </div>
        </div>

        <div className={styles.passportCover} aria-hidden="true">
          <div className={styles.coverBadge}>
            <span>TRV</span>
            <strong>{stats.completion_percentage}%</strong>
          </div>
          <div className={styles.coverLines}>
            <span />
            <span />
            <span />
          </div>
          <p>Collected<br />Memories</p>
        </div>
      </motion.section>

      <motion.section
        className={styles.collectionPanel}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45 }}
        aria-label="Collection progress"
      >
        <div className={styles.progressHeader}>
          <div>
            <p className={styles.panelEyebrow}>Collection Ledger</p>
            <h2 className={styles.panelTitle}>Archive Progress</h2>
          </div>
          <span className={styles.progressPercent}>{stats.completion_percentage}%</span>
        </div>

        <div className={styles.progressBar} aria-hidden="true">
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${stats.completion_percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Collected</span>
            <strong className={styles.statValue}>{stats.unlocked_stamps}</strong>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Unissued</span>
            <strong className={styles.statValue}>{stats.locked_stamps}</strong>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Regions</span>
            <strong className={styles.statValue}>{stats.regions_visited.length}</strong>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Seals</span>
            <strong className={styles.statValue}>{stats.total_stamps}</strong>
          </div>
        </div>
      </motion.section>

      <motion.section
        className={styles.filterSection}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.45 }}
        aria-label="Region filter"
      >
        <div className={styles.filterHeader}>
          <p className={styles.panelEyebrow}>Folio Filter</p>
          <div className={styles.filterCount}>
            {selectedRegion ?? 'All regions'}
          </div>
        </div>
        <div className={styles.buttonGroup}>
          <motion.button
            type="button"
            className={`${styles.filterButton} ${!selectedRegion ? styles.active : ''}`}
            onClick={() => {
              setSelectedRegion(null);
              setTargetStampId(null);
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            All
          </motion.button>
          {availableRegions.map((region) => (
            <motion.button
              type="button"
              key={region}
              className={`${styles.filterButton} ${selectedRegion === region ? styles.active : ''}`}
              onClick={() => {
                setSelectedRegion(region);
                setTargetStampId(null);
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {region}
            </motion.button>
          ))}
        </div>
      </motion.section>

      <motion.section
        className={styles.stampsSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.45 }}
        aria-label="Passport stamp collection"
      >
        <StampGrid
          stamps={COUNTRY_STAMPS}
          unlockedStamps={unlockedStamps}
          selectedRegion={selectedRegion}
          targetStampId={targetStampId}
        />
      </motion.section>
    </motion.main>
  );
};

export default PassportPageComponent;
