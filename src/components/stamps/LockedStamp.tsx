'use client';

import React from 'react';
import { CountryStamp } from '@/types/stamps';
import PassportStamp from './PassportStamp';

interface LockedStampProps {
  stamp: CountryStamp;
  index?: number;
}

export const LockedStamp: React.FC<LockedStampProps> = ({ stamp, index = 0 }) => {
  return <PassportStamp stamp={stamp} isLocked index={index} />;
};

export default LockedStamp;
