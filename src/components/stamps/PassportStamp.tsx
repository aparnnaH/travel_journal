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

// Premium stamp artwork for each country with enhanced vintage aesthetic
const StampArtwork = ({ stamp }: { stamp: CountryStamp }) => {
  switch (stamp.id) {
    case 'japan':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <pattern id="paper-texture" patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill={stamp.colors.background}/>
              <circle cx="1" cy="1" r="0.5" fill={stamp.colors.secondary} opacity="0.3"/>
            </pattern>
            <radialGradient id="sun-glow" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#FF6B6B" stopOpacity="1"/>
              <stop offset="100%" stopColor={stamp.colors.primary} stopOpacity="0.3"/>
            </radialGradient>
          </defs>
          <rect width="160" height="160" fill="url(#paper-texture)"/>
          <rect width="160" height="160" fill="url(#sun-glow)"/>
          <rect x="8" y="8" width="144" height="144" fill="none" stroke={stamp.colors.primary} strokeWidth="2" opacity="0.6"/>
          <rect x="12" y="12" width="136" height="136" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.4"/>
          <circle cx="15" cy="15" r="3" fill={stamp.colors.primary} opacity="0.5"/>
          <circle cx="145" cy="15" r="3" fill={stamp.colors.primary} opacity="0.5"/>
          <circle cx="15" cy="145" r="3" fill={stamp.colors.primary} opacity="0.5"/>
          <circle cx="145" cy="145" r="3" fill={stamp.colors.primary} opacity="0.5"/>
          <circle cx="80" cy="50" r="28" fill="#FF6B6B" opacity="0.9"/>
          <circle cx="80" cy="50" r="28" fill="none" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.6"/>
          <path d="M 50 85 L 80 45 L 110 85 Z" fill="#2C3E50" opacity="0.7"/>
          <path d="M 55 85 L 80 55 L 105 85" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5"/>
          <path d="M 80 45 L 80 65" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          <rect x="72" y="100" width="4" height="28" fill={stamp.colors.primary} opacity="0.85"/>
          <rect x="84" y="100" width="4" height="28" fill={stamp.colors.primary} opacity="0.85"/>
          <rect x="72" y="100" width="16" height="5" fill={stamp.colors.primary} opacity="0.75"/>
          <rect x="70" y="96" width="20" height="4" fill={stamp.colors.primary} opacity="0.6"/>
          <g opacity="0.7">
            <circle cx="45" cy="70" r="2.5" fill={stamp.colors.secondary}/>
            <circle cx="50" cy="75" r="2" fill={stamp.colors.secondary}/>
            <circle cx="115" cy="70" r="2.5" fill={stamp.colors.secondary}/>
            <circle cx="110" cy="75" r="2" fill={stamp.colors.secondary}/>
            <circle cx="40" cy="95" r="1.8" fill={stamp.colors.secondary} opacity="0.6"/>
            <circle cx="120" cy="100" r="1.8" fill={stamp.colors.secondary} opacity="0.6"/>
          </g>
          <path d="M 35 40 Q 40 45 35 50" stroke={stamp.colors.primary} strokeWidth="0.8" fill="none" opacity="0.4"/>
          <path d="M 125 40 Q 120 45 125 50" stroke={stamp.colors.primary} strokeWidth="0.8" fill="none" opacity="0.4"/>
          <circle cx="80" cy="130" r="12" fill="none" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.5" strokeDasharray="3,2"/>
          <text x="80" y="135" textAnchor="middle" fontSize="6" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif">JP</text>
        </svg>
      );
    case 'france':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <linearGradient id="france-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E8F0FF"/>
              <stop offset="100%" stopColor="#F5F5DC"/>
            </linearGradient>
            <pattern id="linen-texture" patternUnits="userSpaceOnUse" width="2" height="2">
              <line x1="0" y1="0" x2="2" y2="2" stroke={stamp.colors.primary} strokeWidth="0.2" opacity="0.1"/>
              <line x1="2" y1="0" x2="0" y2="2" stroke={stamp.colors.primary} strokeWidth="0.2" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="160" height="160" fill="url(#france-gradient)"/>
          <rect width="160" height="160" fill="url(#linen-texture)"/>
          <polygon points="80,8 145,50 145,110 80,152 15,110 15,50" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.7"/>
          <polygon points="80,15 138,50 138,110 80,145 22,110 22,50" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5"/>
          <path d="M 25 30 Q 30 25 35 30" stroke={stamp.colors.secondary} strokeWidth="1.5" fill="none" opacity="0.6"/>
          <path d="M 135 30 Q 140 25 135 20" stroke={stamp.colors.secondary} strokeWidth="1.5" fill="none" opacity="0.6"/>
          <path d="M 30 140 Q 25 135 20 140" stroke={stamp.colors.secondary} strokeWidth="1.5" fill="none" opacity="0.6"/>
          <g>
            <line x1="60" y1="130" x2="55" y2="80" stroke={stamp.colors.primary} strokeWidth="2" opacity="0.8"/>
            <line x1="100" y1="130" x2="105" y2="80" stroke={stamp.colors.primary} strokeWidth="2" opacity="0.8"/>
            <line x1="55" y1="80" x2="105" y2="80" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.6"/>
            <line x1="75" y1="75" x2="80" y2="30" stroke={stamp.colors.primary} strokeWidth="3" opacity="0.85"/>
            <line x1="85" y1="75" x2="80" y2="30" stroke={stamp.colors.primary} strokeWidth="3" opacity="0.85"/>
            <line x1="80" y1="30" x2="80" y2="20" stroke={stamp.colors.secondary} strokeWidth="2" opacity="0.7"/>
            <line x1="70" y1="60" x2="90" y2="60" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.5"/>
            <line x1="72" y1="50" x2="88" y2="50" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.5"/>
          </g>
          <path d="M 40 70 Q 80 60 120 70" stroke={stamp.colors.secondary} strokeWidth="1.5" fill="none" opacity="0.5"/>
          <path d="M 35 100 Q 80 95 125 100" stroke={stamp.colors.secondary} strokeWidth="1" fill="none" opacity="0.4"/>
          <g opacity="0.6">
            <circle cx="50" cy="115" r="3" fill={stamp.colors.secondary}/>
            <path d="M 50 110 L 48 115 L 52 115 Z" fill={stamp.colors.secondary}/>
            <circle cx="110" cy="115" r="3" fill={stamp.colors.secondary}/>
            <path d="M 110 110 L 108 115 L 112 115 Z" fill={stamp.colors.secondary}/>
          </g>
          <circle cx="80" cy="145" r="10" fill="none" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4" strokeDasharray="2,2"/>
          <text x="80" y="148" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.5" fontFamily="serif" fontStyle="italic">FR</text>
        </svg>
      );
    case 'canada':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <radialGradient id="canada-radial" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#FFF"/>
              <stop offset="100%" stopColor="#F0F8FF"/>
            </radialGradient>
          </defs>
          <rect width="160" height="160" fill="url(#canada-radial)"/>
          <polygon points="80,10 150,80 80,150 10,80" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.8"/>
          <polygon points="80,15 145,80 80,145 15,80" fill="none" stroke="#8B0000" strokeWidth="1" opacity="0.5"/>
          <polygon points="80,20 140,80 80,140 20,80" fill="none" stroke="#FF6B6B" strokeWidth="0.8" opacity="0.3"/>
          <g opacity="0.4">
            <path d="M 25 25 L 28 30 L 32 28 L 30 33 L 35 35 L 30 37 L 32 42 L 28 40 L 25 45 L 23 40 L 19 42 L 21 37 L 16 35 L 21 33 L 19 28 Z" fill={stamp.colors.primary}/>
            <path d="M 135 25 L 138 30 L 142 28 L 140 33 L 145 35 L 140 37 L 142 42 L 138 40 L 135 45 L 133 40 L 129 42 L 131 37 L 126 35 L 131 33 L 129 28 Z" fill={stamp.colors.primary}/>
          </g>
          <g>
            <line x1="80" y1="95" x2="80" y2="120" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.7"/>
            <path d="M 70 60 L 60 70 L 65 75" stroke={stamp.colors.primary} strokeWidth="2" fill="none" opacity="0.85"/>
            <path d="M 68 75 L 55 80 L 62 85" stroke={stamp.colors.primary} strokeWidth="2" fill="none" opacity="0.85"/>
            <path d="M 80 50 L 85 65 L 80 75 L 75 65 Z" fill={stamp.colors.primary} opacity="0.8" stroke="#8B0000" strokeWidth="1"/>
            <path d="M 90 60 L 100 70 L 95 75" stroke={stamp.colors.primary} strokeWidth="2" fill="none" opacity="0.85"/>
            <path d="M 92 75 L 105 80 L 98 85" stroke={stamp.colors.primary} strokeWidth="2" fill="none" opacity="0.85"/>
            <line x1="60" y1="70" x2="75" y2="68" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.5"/>
            <line x1="100" y1="70" x2="85" y2="68" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.5"/>
            <line x1="55" y1="80" x2="70" y2="78" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.5"/>
            <line x1="105" y1="80" x2="90" y2="78" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.5"/>
          </g>
          <g opacity="0.3">
            <polygon points="30,135 35,120 40,135" fill="#8B0000"/>
            <polygon points="130,135 135,120 140,135" fill="#8B0000"/>
          </g>
          <circle cx="80" cy="135" r="11" fill="none" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.4" strokeDasharray="3,2"/>
          <text x="80" y="139" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif" fontWeight="bold">CA</text>
        </svg>
      );
    case 'egypt':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <linearGradient id="egypt-sand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE4B5"/>
              <stop offset="100%" stopColor="#FFF8DC"/>
            </linearGradient>
            <radialGradient id="egypt-sun" cx="50%" cy="40%">
              <stop offset="0%" stopColor={stamp.colors.secondary} stopOpacity="1"/>
              <stop offset="100%" stopColor="#FFA500" stopOpacity="0.4"/>
            </radialGradient>
          </defs>
          <rect width="160" height="160" fill="url(#egypt-sand)"/>
          <rect width="160" height="160" fill="url(#egypt-sun)"/>
          <rect x="10" y="10" width="140" height="140" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.7"/>
          <rect x="14" y="14" width="132" height="132" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5"/>
          <polygon points="20,20 25,20 20,25" fill={stamp.colors.primary} opacity="0.5"/>
          <polygon points="140,20 140,25 135,20" fill={stamp.colors.primary} opacity="0.5"/>
          <polygon points="20,140 20,135 25,140" fill={stamp.colors.primary} opacity="0.5"/>
          <polygon points="140,140 135,140 140,135" fill={stamp.colors.primary} opacity="0.5"/>
          <polygon points="80,40 115,120 45,120" fill="#8B7355" stroke={stamp.colors.primary} strokeWidth="2" opacity="0.85"/>
          <line x1="80" y1="40" x2="45" y2="120" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.4"/>
          <line x1="80" y1="40" x2="115" y2="120" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.4"/>
          <line x1="65" y1="65" x2="55" y2="120" stroke={stamp.colors.secondary} strokeWidth="0.5" opacity="0.3"/>
          <line x1="95" y1="65" x2="105" y2="120" stroke={stamp.colors.secondary} strokeWidth="0.5" opacity="0.3"/>
          <circle cx="80" cy="35" r="12" fill={stamp.colors.secondary} opacity="0.7"/>
          <circle cx="80" cy="35" r="12" fill="none" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.5"/>
          <g opacity="0.6">
            <ellipse cx="80" cy="128" rx="8" ry="6" fill={stamp.colors.primary}/>
            <circle cx="75" cy="125" r="2" fill={stamp.colors.secondary}/>
            <circle cx="85" cy="125" r="2" fill={stamp.colors.secondary}/>
            <path d="M 75 128 L 70 135 M 85 128 L 90 135" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5"/>
          </g>
          <g opacity="0.4">
            <rect x="20" y="85" width="3" height="8" fill={stamp.colors.primary}/>
            <circle cx="22" cy="80" r="2" fill={stamp.colors.primary}/>
            <rect x="137" y="85" width="3" height="8" fill={stamp.colors.primary}/>
            <circle cx="138.5" cy="80" r="2" fill={stamp.colors.primary}/>
          </g>
          <circle cx="80" cy="145" r="10" fill="none" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4" strokeDasharray="2,2"/>
          <text x="80" y="148" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif">EG</text>
        </svg>
      );
    case 'brazil':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <radialGradient id="brazil-glow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#FFFACD"/>
              <stop offset="100%" stopColor="#FFF0E6"/>
            </radialGradient>
            <linearGradient id="brazil-band" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stamp.colors.primary}/>
              <stop offset="50%" stopColor={stamp.colors.secondary}/>
              <stop offset="100%" stopColor="#CE1126"/>
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#brazil-glow)"/>
          <rect x="12" y="12" width="136" height="136" rx="12" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.8"/>
          <rect x="16" y="16" width="128" height="128" rx="10" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5"/>
          <circle cx="80" cy="70" r="35" fill="none" stroke="url(#brazil-band)" strokeWidth="3" opacity="0.8"/>
          <circle cx="80" cy="70" r="35" fill="none" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4" strokeDasharray="4,3"/>
          <g opacity="0.7">
            <path d="M 80 35 Q 75 20 80 10" stroke="#CE1126" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 80 35 Q 85 20 80 10" stroke={stamp.colors.secondary} strokeWidth="1.5" fill="none" opacity="0.6"/>
            <path d="M 58 95 Q 40 105 30 120" stroke={stamp.colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 58 95 Q 45 115 35 130" stroke={stamp.colors.secondary} strokeWidth="1.5" fill="none" opacity="0.6"/>
            <path d="M 102 95 Q 120 105 130 120" stroke="#CE1126" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 102 95 Q 115 115 125 130" stroke={stamp.colors.secondary} strokeWidth="1.5" fill="none" opacity="0.6"/>
          </g>
          <g opacity="0.6">
            <circle cx="40" cy="45" r="4" fill="#CE1126"/>
            <circle cx="35" cy="40" r="2.5" fill={stamp.colors.secondary} opacity="0.7"/>
            <circle cx="45" cy="40" r="2.5" fill={stamp.colors.secondary} opacity="0.7"/>
            <circle cx="40" cy="35" r="2.5" fill={stamp.colors.secondary} opacity="0.7"/>
            <circle cx="120" cy="110" r="4" fill={stamp.colors.secondary}/>
            <circle cx="125" cy="115" r="2.5" fill="#CE1126" opacity="0.7"/>
            <circle cx="115" cy="115" r="2.5" fill="#CE1126" opacity="0.7"/>
            <circle cx="120" cy="120" r="2.5" fill="#CE1126" opacity="0.7"/>
          </g>
          <path d="M 30 80 Q 80 75 130 80" stroke="url(#brazil-band)" strokeWidth="2" fill="none" opacity="0.5"/>
          <circle cx="80" cy="145" r="11" fill="none" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.4" strokeDasharray="3,2"/>
          <text x="80" y="149" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif" fontWeight="bold">BR</text>
        </svg>
      );
    case 'italy':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <linearGradient id="italy-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFACD"/>
              <stop offset="100%" stopColor="#FFE4B5"/>
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#italy-bg)"/>
          <circle cx="80" cy="80" r="73" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.7"/>
          <circle cx="80" cy="80" r="73" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.4" strokeDasharray="5,3"/>
          <circle cx="80" cy="80" r="60" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.4"/>
          <circle cx="80" cy="80" r="50" fill="none" stroke={stamp.colors.secondary} strokeWidth="0.8" opacity="0.3"/>
          <g>
            <rect x="70" y="45" width="15" height="65" fill="#D2B48C" stroke="#8B7355" strokeWidth="1.5" opacity="0.85" transform="skewX(-5)"/>
            <line x1="70" y1="55" x2="85" y2="55" stroke="#8B7355" strokeWidth="1" opacity="0.5" transform="skewX(-5)"/>
            <line x1="70" y1="70" x2="85" y2="70" stroke="#8B7355" strokeWidth="1" opacity="0.5" transform="skewX(-5)"/>
            <line x1="70" y1="85" x2="85" y2="85" stroke="#8B7355" strokeWidth="1" opacity="0.5" transform="skewX(-5)"/>
            <line x1="70" y1="100" x2="85" y2="100" stroke="#8B7355" strokeWidth="1" opacity="0.5" transform="skewX(-5)"/>
            <circle cx="77" cy="43" r="6" fill="#D2B48C" stroke="#8B7355" strokeWidth="1.5" opacity="0.8"/>
          </g>
          <path d="M 40 90 Q 45 75 50 90" stroke={stamp.colors.primary} strokeWidth="2" fill="none" opacity="0.6"/>
          <path d="M 110 90 Q 115 75 120 90" stroke={stamp.colors.secondary} strokeWidth="2" fill="none" opacity="0.6"/>
          <g opacity="0.5">
            <path d="M 35 60 Q 30 65 35 70" stroke={stamp.colors.primary} strokeWidth="1.2" fill="none"/>
            <circle cx="33" cy="62" r="1.5" fill={stamp.colors.primary}/>
            <circle cx="32" cy="67" r="1.5" fill={stamp.colors.primary}/>
            <path d="M 125 60 Q 130 65 125 70" stroke={stamp.colors.secondary} strokeWidth="1.2" fill="none"/>
            <circle cx="127" cy="62" r="1.5" fill={stamp.colors.secondary}/>
            <circle cx="128" cy="67" r="1.5" fill={stamp.colors.secondary}/>
          </g>
          <circle cx="80" cy="145" r="10" fill="none" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4" strokeDasharray="2,2"/>
          <text x="80" y="148" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif">IT</text>
        </svg>
      );
    case 'greece':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <rect width="160" height="160" fill="#F0F8FF"/>
          <polygon points="80,8 140,48 140,112 80,152 20,112 20,48" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.8"/>
          <polygon points="80,14 135,48 135,112 80,146 25,112 25,48" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5"/>
          <g>
            <rect x="30" y="50" width="8" height="60" fill="none" stroke={stamp.colors.primary} strokeWidth="2" opacity="0.8"/>
            <line x1="30" y1="50" x2="38" y2="50" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
            <line x1="30" y1="110" x2="38" y2="110" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
            <rect x="76" y="45" width="8" height="65" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.85"/>
            <line x1="76" y1="45" x2="84" y2="45" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
            <line x1="76" y1="110" x2="84" y2="110" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
            <rect x="122" y="50" width="8" height="60" fill="none" stroke={stamp.colors.primary} strokeWidth="2" opacity="0.8"/>
            <line x1="122" y1="50" x2="130" y2="50" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
            <line x1="122" y1="110" x2="130" y2="110" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
          </g>
          <path d="M 25 35 L 35 35 L 35 42 L 45 42 L 45 35 L 55 35 L 55 42 L 65 42" stroke={stamp.colors.primary} strokeWidth="1.5" fill="none" opacity="0.5"/>
          <path d="M 105 35 L 115 35 L 115 42 L 125 42 L 125 35 L 135 35 L 135 42 L 145 42" stroke={stamp.colors.primary} strokeWidth="1.5" fill="none" opacity="0.5"/>
          <g opacity="0.6">
            <path d="M 40 95 Q 50 90 60 95" stroke={stamp.colors.primary} strokeWidth="1.5" fill="none"/>
            <ellipse cx="42" cy="92" rx="2.5" ry="1.5" fill={stamp.colors.secondary} opacity="0.8" transform="rotate(-30 42 92)"/>
            <ellipse cx="48" cy="88" rx="2.5" ry="1.5" fill={stamp.colors.secondary} opacity="0.8" transform="rotate(-20 48 88)"/>
            <ellipse cx="54" cy="90" rx="2.5" ry="1.5" fill={stamp.colors.secondary} opacity="0.8" transform="rotate(-10 54 90)"/>
            <ellipse cx="58" cy="95" rx="2.5" ry="1.5" fill={stamp.colors.secondary} opacity="0.8" transform="rotate(0 58 95)"/>
          </g>
          <circle cx="35" cy="125" r="3" fill="none" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
          <circle cx="125" cy="125" r="3" fill="none" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4"/>
          <circle cx="80" cy="145" r="10" fill="none" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.4" strokeDasharray="2,2"/>
          <text x="80" y="148" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif">GR</text>
        </svg>
      );
    case 'mexico':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <linearGradient id="mexico-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF8E7"/>
              <stop offset="100%" stopColor="#FFE8C6"/>
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#mexico-bg)"/>
          <polygon points="80,10 150,80 80,150 10,80" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.8"/>
          <polygon points="80,15 145,80 80,145 15,80" fill="none" stroke={stamp.colors.secondary} strokeWidth="1.5" opacity="0.5"/>
          <polygon points="80,18 142,80 80,142 18,80" fill="none" stroke={stamp.colors.secondary} strokeWidth="0.8" opacity="0.3"/>
          <circle cx="80" cy="65" r="28" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.8"/>
          <circle cx="80" cy="65" r="28" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5" strokeDasharray="4,3"/>
          <g opacity="0.6">
            <polygon points="80,35 85,45 75,45" fill={stamp.colors.primary}/>
            <polygon points="80,95 75,85 85,85" fill={stamp.colors.primary}/>
            <polygon points="50,65 60,60 60,70" fill={stamp.colors.primary}/>
            <polygon points="110,65 100,60 100,70" fill={stamp.colors.primary}/>
          </g>
          <g opacity="0.5">
            <circle cx="80" cy="65" r="8" fill="none" stroke={stamp.colors.secondary} strokeWidth="1"/>
            <line x1="76" y1="65" x2="84" y2="65" stroke={stamp.colors.secondary} strokeWidth="1"/>
            <line x1="80" y1="61" x2="80" y2="69" stroke={stamp.colors.secondary} strokeWidth="1"/>
          </g>
          <g opacity="0.5">
            <rect x="65" y="110" width="30" height="6" fill={stamp.colors.secondary}/>
            <rect x="70" y="104" width="20" height="6" fill={stamp.colors.secondary} opacity="0.7"/>
            <rect x="75" y="98" width="10" height="6" fill={stamp.colors.secondary} opacity="0.5"/>
          </g>
          <g opacity="0.6">
            <circle cx="30" cy="80" r="3" fill={stamp.colors.secondary}/>
            <circle cx="26" cy="76" r="2" fill={stamp.colors.primary} opacity="0.7"/>
            <circle cx="26" cy="84" r="2" fill={stamp.colors.primary} opacity="0.7"/>
            <circle cx="34" cy="76" r="2" fill={stamp.colors.primary} opacity="0.7"/>
            <circle cx="34" cy="84" r="2" fill={stamp.colors.primary} opacity="0.7"/>
            <circle cx="130" cy="80" r="3" fill={stamp.colors.secondary}/>
            <circle cx="126" cy="76" r="2" fill={stamp.colors.secondary} opacity="0.7"/>
            <circle cx="126" cy="84" r="2" fill={stamp.colors.secondary} opacity="0.7"/>
            <circle cx="134" cy="76" r="2" fill={stamp.colors.secondary} opacity="0.7"/>
            <circle cx="134" cy="84" r="2" fill={stamp.colors.secondary} opacity="0.7"/>
          </g>
          <circle cx="80" cy="145" r="11" fill="none" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.4" strokeDasharray="3,2"/>
          <text x="80" y="149" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif" fontWeight="bold">MX</text>
        </svg>
      );
    case 'thailand':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <radialGradient id="thailand-glow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#FFFAF0"/>
              <stop offset="100%" stopColor="#FFE8D6"/>
            </radialGradient>
          </defs>
          <rect width="160" height="160" fill="url(#thailand-glow)"/>
          <rect x="12" y="12" width="136" height="136" rx="15" fill="none" stroke={stamp.colors.primary} strokeWidth="2.5" opacity="0.8"/>
          <rect x="16" y="16" width="128" height="128" rx="12" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5"/>
          <g>
            <polygon points="80,25 85,35 75,35" fill={stamp.colors.secondary} stroke={stamp.colors.primary} strokeWidth="1"/>
            <rect x="70" y="35" width="20" height="4" fill={stamp.colors.secondary} opacity="0.9"/>
            <path d="M 68 39 L 72 42 M 88 39 L 84 42" stroke={stamp.colors.primary} strokeWidth="1" opacity="0.6"/>
            <rect x="72" y="42" width="16" height="20" fill={stamp.colors.secondary} opacity="0.8" stroke={stamp.colors.primary} strokeWidth="1.5"/>
            <line x1="74" y1="48" x2="86" y2="48" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.4"/>
            <line x1="74" y1="55" x2="86" y2="55" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.4"/>
            <line x1="74" y1="62" x2="86" y2="62" stroke={stamp.colors.primary} strokeWidth="0.8" opacity="0.4"/>
            <rect x="60" y="62" width="40" height="18" fill={stamp.colors.secondary} opacity="0.7" stroke={stamp.colors.primary} strokeWidth="1.5"/>
            <polygon points="60,62 55,75 125,75 120,62" fill={stamp.colors.secondary} opacity="0.6"/>
          </g>
          <g opacity="0.6">
            <ellipse cx="50" cy="110" rx="4" ry="6" fill={stamp.colors.primary} opacity="0.8"/>
            <ellipse cx="58" cy="115" rx="4" ry="6" fill={stamp.colors.primary} opacity="0.8" transform="rotate(45 58 115)"/>
            <ellipse cx="110" cy="115" rx="4" ry="6" fill={stamp.colors.primary} opacity="0.8" transform="rotate(-45 110 115)"/>
            <ellipse cx="118" cy="110" rx="4" ry="6" fill={stamp.colors.primary} opacity="0.8"/>
            <circle cx="80" cy="110" r="5" fill={stamp.colors.secondary}/>
          </g>
          <path d="M 30 90 Q 50 85 80 85 Q 110 85 130 90" stroke={stamp.colors.secondary} strokeWidth="2" fill="none" opacity="0.5"/>
          <g opacity="0.3">
            <path d="M 25 45 Q 30 48 25 51" stroke={stamp.colors.primary} strokeWidth="1.5" fill="none"/>
            <path d="M 135 45 Q 130 48 135 51" stroke={stamp.colors.primary} strokeWidth="1.5" fill="none"/>
          </g>
          <circle cx="80" cy="145" r="11" fill="none" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.4" strokeDasharray="3,2"/>
          <text x="80" y="149" textAnchor="middle" fontSize="5" fill={stamp.colors.primary} opacity="0.4" fontFamily="serif" fontWeight="bold">TH</text>
        </svg>
      );
    case 'iceland':
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <defs>
            <radialGradient id="iceland-aurora" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#87CEEB"/>
              <stop offset="50%" stopColor="#E0FFFF"/>
              <stop offset="100%" stopColor="#B0E0E6"/>
            </radialGradient>
            <linearGradient id="aurora-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FF7F" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="#00FFFF" stopOpacity="0.4"/>
              <stop offset="100%" stopColor={stamp.colors.primary} stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          <rect width="160" height="160" fill="url(#iceland-aurora)"/>
          <rect width="160" height="160" fill="url(#aurora-light)" opacity="0.7"/>
          <circle cx="80" cy="80" r="72" fill="none" stroke={stamp.colors.primary} strokeWidth="3" opacity="0.8"/>
          <circle cx="80" cy="80" r="72" fill="none" stroke={stamp.colors.secondary} strokeWidth="1" opacity="0.5" strokeDasharray="6,4"/>
          <circle cx="80" cy="80" r="70" fill="none" stroke="#00FFFF" strokeWidth="0.8" opacity="0.4"/>
          <g opacity="0.6">
            <path d="M 20 50 Q 80 40 140 50" stroke="#00FF7F" strokeWidth="3" fill="none" opacity="0.7"/>
            <path d="M 15 60 Q 80 50 145 60" stroke="#00FFFF" strokeWidth="2.5" fill="none" opacity="0.6"/>
            <path d="M 25 70 Q 80 55 135 70" stroke={stamp.colors.primary} strokeWidth="2" fill="none" opacity="0.5"/>
          </g>
          <g opacity="0.7">
            <line x1="35" y1="40" x2="35" y2="55" stroke="#00FFFF" strokeWidth="1.5"/>
            <line x1="25" y1="47" x2="45" y2="47" stroke="#00FFFF" strokeWidth="1.5"/>
            <line x1="28" y1="42" x2="42" y2="52" stroke="#00FFFF" strokeWidth="1"/>
            <line x1="42" y1="42" x2="28" y2="52" stroke="#00FFFF" strokeWidth="1"/>
            <line x1="125" y1="40" x2="125" y2="55" stroke={stamp.colors.primary} strokeWidth="1.5"/>
            <line x1="115" y1="47" x2="135" y2="47" stroke={stamp.colors.primary} strokeWidth="1.5"/>
            <line x1="118" y1="42" x2="132" y2="52" stroke={stamp.colors.primary} strokeWidth="1"/>
            <line x1="132" y1="42" x2="118" y2="52" stroke={stamp.colors.primary} strokeWidth="1"/>
          </g>
          <g opacity="0.5">
            <polygon points="40,90 50,70 60,90" fill="#87CEEB" stroke={stamp.colors.primary} strokeWidth="1.5"/>
            <polygon points="100,90 110,70 120,90" fill="#87CEEB" stroke={stamp.colors.primary} strokeWidth="1.5"/>
            <polygon points="70,100 80,75 90,100" fill="#87CEEB" stroke={stamp.colors.primary} strokeWidth="1.5" opacity="0.8"/>
          </g>
          <g opacity="0.4">
            <circle cx="30" cy="30" r="2" fill="#00FFFF"/>
            <circle cx="150" cy="30" r="2" fill="#00FFFF"/>
            <circle cx="30" cy="140" r="2" fill={stamp.colors.primary}/>
            <circle cx="150" cy="140" r="2" fill={stamp.colors.primary}/>
          </g>
          <circle cx="80" cy="145" r="12" fill="none" stroke={stamp.colors.primary} strokeWidth="2" opacity="0.5"/>
          <polygon points="80,138 82,143 87,143 83,147 85,152 80,148 75,152 77,147 73,143 78,143" fill={stamp.colors.secondary} opacity="0.6"/>
          <text x="80" y="160" textAnchor="middle" fontSize="4" fill={stamp.colors.primary} opacity="0.3" fontFamily="serif">IS</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 160 160" className={styles.artwork}>
          <circle cx="80" cy="80" r="40" fill={stamp.colors.primary} opacity="0.8" />
          <text x="80" y="85" textAnchor="middle" fontSize="20" fill={stamp.colors.background}>
            {stamp.emoji}
          </text>
        </svg>
      );
  }
};

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
          borderStyle: borderStyle.borderStyle as React.CSSProperties['borderStyle'],
          borderWidth: borderStyle.borderWidth,
          boxShadow: borderStyle.boxShadow,
          clipPath: getStampClipPath(stamp.shape) || 'auto',
          transform: `rotate(${stamp.rotation_angle}deg)`,
        }}
      >
        {/* Texture overlay */}
        <div className={styles.textureOverlay} />

        {/* Main artwork content */}
        <div className={styles.stampContent}>
          <StampArtwork stamp={stamp} />

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
