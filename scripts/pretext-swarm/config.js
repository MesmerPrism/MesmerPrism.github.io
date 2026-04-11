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
  drag: 0.9,
  anchorK: 0.016,
  neighborK: 0.1,
  wordK: 0.065,
  lineK: 0.012,
  maxDisplacement: 96,
  solverIterations: 4,
  hoverRadius: 42,
  hoverFalloff: 144,
  hoverStrength: 5.2,
  hoverBias: 0.44,
  burstRadius: 68,
  burstFalloff: 236,
  burstStrength: 11.2,
  burstBias: 1.25,
  burstLength: 148,
  burstDurationMs: 280,
  burstDecay: 0.84,
  macroWordEase: 0.24,
  macroSettleEase: 0.16,
  macroHoverPush: 22,
  macroHoverSwirl: 16,
  macroHoverFlow: 6,
  macroBurstPush: 52,
  macroBurstSwirl: 34,
  macroBurstFlow: 14,
  macroDriftLimit: 82,
  hashCellSize: 56,
  boidDetachThreshold: 18,
  boidNeighborRadius: 72,
  boidSeparationRadius: 24,
  boidSeparationWeight: 0.012,
  boidAlignmentWeight: 0.004,
  boidCohesionWeight: 0.003,
  sleepVelocityThreshold: 0.06,
  sleepDisplacementThreshold: 1.2,
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
