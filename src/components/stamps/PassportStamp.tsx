'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CountryStamp } from '@/types/stamps';
import StampRenderer from './StampRenderer';
import styles from './PassportStamp.module.css';

interface PassportStampProps {
  stamp: CountryStamp;
  isLocked?: boolean;
  index?: number;
}

const burstParticles = [
  { x: -54, y: -66 },
  { x: 8, y: -78 },
  { x: 62, y: -42 },
  { x: 72, y: 22 },
  { x: 26, y: 74 },
  { x: -42, y: 68 },
  { x: -78, y: 6 },
  { x: -68, y: -36 },
];

export const PassportStamp: React.FC<PassportStampProps> = ({
  stamp,
  isLocked = false,
  index = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const rotation = isLocked
    ? stamp.rotation_angle * 0.35
    : stamp.rotation_angle + stamp.visual.rotation_jitter * 0.24;

  return (
    <motion.button
      type="button"
      className={`${styles.stampButton} ${isLocked ? styles.locked : styles.unlocked}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTapStart={() => setIsPressed(true)}
      onTapCancel={() => setIsPressed(false)}
      onTap={() => setIsPressed(false)}
      aria-disabled={isLocked}
      aria-label={
        isLocked
          ? `Locked ${stamp.region} passport stamp`
          : `${stamp.country_name} passport stamp`
      }
      initial={{ opacity: 0, y: 18, rotate: rotation - 2, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotate: rotation, scale: 1 }}
      whileHover={
        isLocked
          ? { y: -4, rotate: rotation - 1.2 }
          : { y: -8, rotate: rotation - 1.8, scale: 1.025 }
      }
      whileTap={{ scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 240,
        damping: 22,
        delay: Math.min(index * 0.025, 0.24),
      }}
    >
      <span className={styles.shadowMat} aria-hidden="true" />
      <StampRenderer stamp={stamp} isLocked={isLocked} isHovered={isHovered} />

      <AnimatePresence>
        {isHovered && !isLocked && (
          <motion.span
            className={styles.foilGlint}
            aria-hidden="true"
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ x: '120%', opacity: [0, 0.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPressed && !isLocked && (
          <motion.span
            className={styles.pressHalo}
            aria-hidden="true"
            initial={{ opacity: 0.36, scale: 0.86 }}
            animate={{ opacity: 0, scale: 1.24 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isLocked && isHovered && (
          <span className={styles.rewardBurst} aria-hidden="true">
            {burstParticles.map((particle, particleIndex) => (
              <motion.span
                key={`${particle.x}-${particle.y}`}
                className={styles.rewardParticle}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: [0, 0.9, 0],
                  x: particle.x,
                  y: particle.y,
                  scale: [0.6, 1, 0.7],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1,
                  delay: particleIndex * 0.035,
                  ease: 'easeOut',
                }}
              />
            ))}
          </span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default PassportStamp;
