import type { CSSProperties } from 'react';

const STAGGER_STEP_MS = 45;
const STAGGER_MAX_MS = 360;

export function getStaggerStyle(index: number): CSSProperties {
  return {
    animationDelay: `${Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS)}ms`,
  };
}
