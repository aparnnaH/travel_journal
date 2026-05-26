'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { CountryStamp, StampTextureLayer } from '@/types/stamps';
import {
  getStampAssetPath,
  getStampCssVariables,
  getStampLayerStyle,
} from '@/lib/stamps/assets';
import styles from './StampRenderer.module.css';

interface StampRendererProps {
  stamp: CountryStamp;
  isLocked?: boolean;
  isHovered?: boolean;
}

const isLayerVisible = (layer: StampTextureLayer, isLocked: boolean): boolean => {
  if (isLocked) {
    return layer.locked_visible !== false;
  }

  return layer.unlocked_visible !== false;
};

export const StampRenderer: React.FC<StampRendererProps> = ({
  stamp,
  isLocked = false,
  isHovered = false,
}) => {
  const textureLayers = stamp.texture_layers.filter((layer) => isLayerVisible(layer, isLocked));
  const overlayLayers = stamp.overlay_layers.filter((layer) => isLayerVisible(layer, isLocked));
  const countryCode = stamp.id.slice(0, 2).toUpperCase();
  const displayName = isLocked ? 'Undiscovered' : stamp.country_name;
  const editionName = isLocked ? `${stamp.region} archive` : stamp.visual.edition_name;

  return (
    <div
      className={`${styles.renderer} ${styles.rectangle} ${isLocked ? styles.locked : ''}`}
      style={getStampCssVariables(stamp, isLocked)}
    >
      <div className={styles.paperBase} />
      <div className={styles.inkBloom} />

      {textureLayers.map((layer) => (
        <Image
          key={layer.id}
          className={styles.textureLayer}
          src={layer.asset.src}
          alt=""
          aria-hidden="true"
          width={layer.asset.width ?? 1024}
          height={layer.asset.height ?? 1024}
          unoptimized
          draggable={false}
          style={getStampLayerStyle(layer)}
        />
      ))}

      <div className={styles.borderFrame} />
      <div className={styles.microPerforation} />

      <div className={styles.artworkPlate}>
        <Image
          className={styles.artwork}
          src={getStampAssetPath(stamp)}
          alt=""
          aria-hidden="true"
          width={stamp.asset.width ?? 1024}
          height={stamp.asset.height ?? 1024}
          unoptimized
          draggable={false}
        />
      </div>

      <motion.div
        className={styles.cancellation}
        style={{
          rotate: `${stamp.visual.cancellation.rotation}deg`,
          opacity: isLocked ? 0.16 : stamp.visual.cancellation.opacity,
        }}
        animate={
          isHovered && !isLocked
            ? {
                scale: [1, 1.03, 1],
                opacity: [
                  stamp.visual.cancellation.opacity,
                  stamp.visual.cancellation.opacity + 0.08,
                  stamp.visual.cancellation.opacity,
                ],
              }
            : undefined
        }
        transition={{ duration: 1.1, ease: 'easeOut' }}
      >
        <span>{stamp.visual.cancellation.label}</span>
        <strong>{stamp.visual.cancellation.code}</strong>
        <small>{stamp.visual.cancellation.date_label}</small>
      </motion.div>

      {overlayLayers.map((layer) => (
        <Image
          key={layer.id}
          className={styles.overlayLayer}
          src={layer.asset.src}
          alt=""
          aria-hidden="true"
          width={layer.asset.width ?? 1024}
          height={layer.asset.height ?? 1024}
          unoptimized
          draggable={false}
          style={getStampLayerStyle(layer)}
        />
      ))}

      <div className={styles.topRail}>
        <span>{stamp.visual.issued_by}</span>
        <b>{stamp.visual.serial}</b>
      </div>

      <div className={styles.countryCode}>{countryCode}</div>

      <div className={styles.copyBlock}>
        <span className={styles.regionLabel}>{stamp.region}</span>
        <strong className={styles.countryName}>{displayName}</strong>
        <span className={styles.editionName}>{editionName}</span>
      </div>

      {!isLocked && (
        <div className={styles.culturalBand}>
          {stamp.cultural_elements.slice(0, 3).map((element) => (
            <span key={element}>{element}</span>
          ))}
        </div>
      )}

      <div className={styles.embossLayer} />
      <div className={styles.wornEdges} />

      {isLocked && (
        <div className={styles.lockedVeil}>
          <span>Unissued</span>
        </div>
      )}
    </div>
  );
};

export default StampRenderer;
