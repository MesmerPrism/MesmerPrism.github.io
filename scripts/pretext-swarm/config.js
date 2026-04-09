export const HERO_MODES = Object.freeze({
  AUTO: 'auto',
  STATIC: 'static',
  CURRENT_DOM: 'current-dom',
  SWARM_CANVAS: 'swarm-canvas',
})

export const SWARM_STATES = Object.freeze({
  IDLE: 'idle',
  HOVER: 'hover',
  BURST: 'burst',
  SETTLING: 'settling',
  SLEEP: 'sleep',
})

export const DEFAULT_SWARM_CONFIG = Object.freeze({
  layoutInsetXRatio: 0.014,
  layoutInsetYLines: 0.86,
  minLayoutInsetX: 10,
  minLayoutWidth: 120,
  minHeightLines: 7.5,
  baselineRatio: 0.78,
  anchorCenterRatio: 0.56,
  drag: 0.88,
  anchorK: 0.018,
  neighborK: 0.12,
  wordK: 0.08,
  lineK: 0.04,
  maxDisplacement: 48,
  solverIterations: 3,
  hoverRadius: 34,
  hoverFalloff: 124,
  hoverStrength: 1.8,
  hoverBias: 0.16,
  burstRadius: 42,
  burstFalloff: 164,
  burstStrength: 4.25,
  burstBias: 0.85,
  burstLength: 92,
  burstDurationMs: 280,
  burstDecay: 0.84,
  hashCellSize: 56,
  boidDetachThreshold: 13,
  boidNeighborRadius: 72,
  boidSeparationRadius: 24,
  boidSeparationWeight: 0.012,
  boidAlignmentWeight: 0.004,
  boidCohesionWeight: 0.003,
  sleepVelocityThreshold: 0.045,
  sleepDisplacementThreshold: 0.55,
  dtMin: 0.6,
  dtMax: 1.5,
})

export function getSwarmConfig(overrides = {}) {
  return {
    ...DEFAULT_SWARM_CONFIG,
    ...overrides,
  }
}

export function supportsCanvas2D() {
  if (typeof document === 'undefined') return false

  const canvas = document.createElement('canvas')
  return canvas.getContext('2d') !== null
}

export function resolveHeroMode(requestedMode, interactive, canvasSupported) {
  const normalized = typeof requestedMode === 'string'
    ? requestedMode.trim().toLowerCase()
    : HERO_MODES.AUTO

  if (normalized === HERO_MODES.STATIC) return HERO_MODES.STATIC
  if (normalized === HERO_MODES.CURRENT_DOM) return HERO_MODES.CURRENT_DOM

  if (normalized === HERO_MODES.SWARM_CANVAS) {
    return canvasSupported ? HERO_MODES.SWARM_CANVAS : HERO_MODES.CURRENT_DOM
  }

  if (!interactive) return HERO_MODES.STATIC
  return canvasSupported ? HERO_MODES.SWARM_CANVAS : HERO_MODES.CURRENT_DOM
}
