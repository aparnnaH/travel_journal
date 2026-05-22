'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CountryStamp } from '@/types/stamps';
import { getStampClipPath, getStampBorderStyle } from '@/lib/stamps/utils';
import styles from './PassportStamp.module.css';

interface PassportStampProps {
  stamp: CountryStamp;
  isLocked?: boolean;
  onUnlock?: () => void;
}

export const PassportStamp: React.FC<PassportStampProps> = ({ stamp, isLocked = false, onUnlock }) => {
  const [isHovered, setIsHovered] = useState(false);
  const borderStyle = getStampBorderStyle(stamp);

  const handleClick = () => {
    if (isLocked && onUnlock) {
      onUnlock();
    }
  };

  return (
    <motion.div
      className={`${styles.stampContainer} ${isLocked ? styles.locked : ''}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={!isLocked ? { scale: 1.08, rotateZ: -2 } : {}}
      whileTap={!isLocked ? { scale: 0.95 } : {}}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
    >
      <motion.div
        className={styles.stampCard}
        style={{
          width: '180px',
          height: '180px',
          backgroundColor: stamp.colors.background,
          borderColor: borderStyle.borderColor,
          borderStyle: borderStyle.borderStyle as any,
          borderWidth: borderStyle.borderWidth,
          boxShadow: borderStyle.boxShadow,
          clipPath: getStampClipPath(stamp.shape) || 'auto',
          transform: `rotate(${stamp.rotation_angle}deg)`,
        }}
      >
        {/* Texture overlay */}
        <div className={styles.textureOverlay} />

        {/* Main content */}
        <div className={styles.stampContent}>
          <motion.div
            className={styles.stampIcon}
            animate={isHovered && !isLocked ? { scale: 1.2, rotate: 360 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span style={{ fontSize: '3rem' }}>{stamp.emoji}</span>
          </motion.div>

          <div
            className={styles.stampTitle}
            style={{
              color: stamp.colors.primary,
            }}
          >
            {stamp.country_name}
          </div>

          {stamp.unlocked_date && !isLocked && (
            <motion.div
              className={styles.stampDate}
              style={{
                color: stamp.colors.secondary,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={isHovered ? { opacity: 1, y: 0 } : { opacity: 0.6, y: 10 }}
              transition={{ delay: 0.1 }}
            >
              {new Date(stamp.unlocked_date).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </motion.div>
          )}
        </div>

        {/* Inner glow */}
        <div
          className={styles.innerGlow}
          style={{
            background: `radial-gradient(circle at center, ${stamp.colors.secondary}15, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* Lock overlay */}
      {isLocked && (
        <motion.div
          className={styles.lockOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={styles.lockIcon}
          >
            🔒
          </motion.div>
          <div className={styles.lockText}>Locked</div>
        </motion.div>
      )}

      {/* Shine effect */}
      {isHovered && !isLocked && (
        <motion.div
          className={styles.shineEffect}
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '100%', opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
};

export default PassportStamp;
