'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { COUNTRY_STAMPS, STAMP_REGIONS } from '@/data/stamps/countries';
import { PassportStats } from '@/types/stamps';
import { getCompletionPercentage } from '@/lib/stamps/utils';
import StampGrid from '@/components/stamps/StampGrid';
import styles from './PassportPage.module.css';

interface PassportPageComponentProps {
  initialUnlockedStamps?: string[];
}

export const PassportPageComponent: React.FC<PassportPageComponentProps> = ({
  initialUnlockedStamps = [],
}) => {
  const [unlockedStamps, setUnlockedStamps] = useState<string[]>(initialUnlockedStamps);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    if (initialUnlockedStamps.length === 0) {
      const demoUnlocked = ['japan', 'france', 'canada', 'italy', 'greece'];
      setUnlockedStamps(demoUnlocked);
    }
  }, []);

  const stats: PassportStats = useMemo(() => {
    const unlocked = unlockedStamps.length;
    const total = COUNTRY_STAMPS.length;
    const regionsVisited = Array.from(
      new Set(
        COUNTRY_STAMPS.filter((s) => unlockedStamps.includes(s.id)).map((s) => s.region)
      )
    );

    return {
      total_stamps: total,
      unlocked_stamps: unlocked,
      locked_stamps: total - unlocked,
      completion_percentage: getCompletionPercentage(unlocked, total),
      regions_visited: regionsVisited,
    };
  }, [unlockedStamps]);

  const handleStampUnlock = (stampId: string) => {
    if (!unlockedStamps.includes(stampId)) {
      setUnlockedStamps([...unlockedStamps, stampId]);
    }
  };

  return (
    <motion.div
      className={styles.passportPageWrapper}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleIcon}>📖</span>
            Collectible Passport
          </h1>
          <p className={styles.pageDescription}>
            Travel the world and collect unique stamps from each country. Each stamp is a handcrafted collectible inspired by real passport stamps and travel ephemera.
          </p>
        </div>
      </motion.div>

      {/* Stats Card */}
      <motion.div
        className={styles.statsSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className={styles.statsCard}>
          <div className={styles.statsHeader}>
            <h2 className={styles.statsTitle}>Your Collection</h2>
            <span className={styles.progressPercent}>{stats.completion_percentage}%</span>
          </div>
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${stats.completion_percentage}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statIcon}>🔓</div>
              <div className={styles.statLabel}>Unlocked</div>
              <div className={styles.statValue}>{stats.unlocked_stamps}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statIcon}>🔒</div>
              <div className={styles.statLabel}>Locked</div>
              <div className={styles.statValue}>{stats.locked_stamps}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statIcon}>🌍</div>
              <div className={styles.statLabel}>Regions</div>
              <div className={styles.statValue}>{stats.regions_visited.length}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Region Filter */}
      <motion.div
        className={styles.filterSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
      >
        <div className={styles.filterContainer}>
          <h3 className={styles.filterTitle}>Filter by Region</h3>
          <div className={styles.buttonGroup}>
            <motion.button
              className={`${styles.filterButton} ${!selectedRegion ? styles.active : ''}`}
              onClick={() => setSelectedRegion(null)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              All Regions
            </motion.button>
            {STAMP_REGIONS.map((region) => (
              <motion.button
                key={region}
                className={`${styles.filterButton} ${selectedRegion === region ? styles.active : ''}`}
                onClick={() => setSelectedRegion(region)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {region}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stamps Grid */}
      <motion.div
        className={styles.stampsSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <StampGrid
          stamps={COUNTRY_STAMPS}
          unlockedStamps={unlockedStamps}
          onStampUnlock={handleStampUnlock}
          selectedRegion={selectedRegion}
        />
      </motion.div>

      {/* Tips Section */}
      <motion.div
        className={styles.tipsSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <div className={styles.tipsCard}>
          <div className={styles.tipsIcon}>💡</div>
          <div className={styles.tipsContent}>
            <h3 className={styles.tipsTitle}>Collecting Tips</h3>
            <ul className={styles.tipsList}>
              <li>Visit countries in the journal to unlock their stamps</li>
              <li>Each stamp has unique cultural design elements</li>
              <li>Track your progress towards complete regions</li>
              <li>Collect all stamps to complete your passport!</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PassportPageComponent;
