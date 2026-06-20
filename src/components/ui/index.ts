// Barrel exports for shared UI primitives.
// Importing from "@/components/ui" keeps feature components concise.
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Input } from './Input';
export { default as Badge } from './Badge';
export { GradientCard } from './gradient-card';

// Re-export any named exports (types) if added in the future
export * from './Button';
export * from './Card';
export * from './Input';
export * from './Badge';
export * from './gradient-card';
