// Locked stamp card component.
// Shows the placeholder state for countries the user has not unlocked through
// the map yet.
'use client';

import React from 'react';
import { CountryStamp } from '@/types/stamps';
import PassportStamp from './PassportStamp';

interface LockedStampProps {
  stamp: CountryStamp;
  index?: number;
}

// Renders a locked stamp using the same metadata as collected stamps but with a
// subdued visual treatment.
export const LockedStamp: React.FC<LockedStampProps> = ({ stamp, index = 0 }) => {
  return <PassportStamp stamp={stamp} isLocked index={index} />;
};

export default LockedStamp;
