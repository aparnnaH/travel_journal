'use client';

import React from 'react';
import { CountryStamp } from '@/types/stamps';
import PassportStamp from './PassportStamp';

interface LockedStampProps {
  stamp: CountryStamp;
  onUnlockClick?: () => void;
  index?: number;
}

export const LockedStamp: React.FC<LockedStampProps> = ({ stamp, onUnlockClick, index = 0 }) => {
  return <PassportStamp stamp={stamp} isLocked onUnlock={onUnlockClick} index={index} />;
};

export default LockedStamp;
