'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CountryStamp } from '@/types/stamps';
import { getStampClipPath } from '@/lib/stamps/utils';
import styles from './LockedStamp.module.css';

interface LockedStampProps {
  stamp: CountryStamp;
  onUnlockClick?: () => void;
}

export const LockedStamp: React.FC<LockedStampProps> = ({ stamp, onUnlockClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={styles.lockedStampContainer}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onUnlockClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
    >
      <motion.div
        className={styles.lockedCard}
        style={{
          width: '180px',
          height: '180px',
          backgroundColor: '#E8E8E8',
          borderColor: '#999999',
          borderStyle: 'dashed',
          borderWidth: '2px',
          clipPath: getStampClipPath(stamp.shape) || 'auto',
          transform: `rotate(${stamp.rotation_angle}deg)`,
          borderRadius: '0.75rem',
        }}
      >
        <div className={styles.mysteryPattern} />

        <div className={styles.lockedContent}>
          <motion.div
            className={styles.lockIconLarge}
            animate={isHovered ? { scale: [1, 1.15, 1] } : { rotate: [0, -5, 5, 0] }}
            transition={{
              duration: isHovered ? 0.5 : 2,
              repeat: !isHovered ? Infinity : 0,
            }}
          >
            🔒
          </motion.div>

          <div className={styles.mysteryText}>Mystery Stamp</div>

          <motion.div
            className={styles.hintText}
            animate={isHovered ? { opacity: 1, y: 0 } : { opacity: 0.5, y: -5 }}
          >
            Travel to unlock
          </motion.div>
        </div>

        {isHovered && (
          <motion.div
            className={styles.shimmerEffect}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.3 }}
          >
            ✨
          </motion.div>
        )}
      </motion.div>

      {isHovered && (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className={styles.floatingParticle}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
              }}
              animate={{
                opacity: 0,
                x: (Math.random() - 0.5) * 60,
                y: (Math.random() - 0.5) * 60,
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.4,
                delay: i * 0.1,
              }}
            >
              ✨
            </motion.div>
          ))}
        </>
      )}
    </motion.div>
  );
};

export default LockedStamp;
