// Class-name utility.
// Combines clsx-style conditional classes with tailwind-merge so conflicting
// Tailwind classes collapse predictably.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Use cn(...) whenever components need conditional Tailwind class composition.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
