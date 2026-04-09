import { SWARM_STATES } from './config.js'
import { applyFieldForces, applySecondaryBoids, advanceBurstField } from './forces.js'
import { createParticleSystem, measureParticleStats } from './particles.js'
import { SpatialHash } from './spatial-hash.js'
import { getAlignedAnchorTarget, getShortestWrappedDelta } from './wrap.js'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function smoothstep(edge0, edge1, value) {
  if (value <= edge0) return 0
  if (value >= edge1) return 1

  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function normalize(x, y, fallbackX = 1, fallbackY = 0) {
  const length = Math.hypot(x, y)
  if (length <= 0.0001) {
    return { x: fallbackX, y: fallbackY }
  }

  return { x: x / length, y: y / length }
}

function integrateParticles(particles, dt, config) {
  const dtSquared = dt * dt

  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index]
    const velocityX = (particle.x - particle.px) * config.drag
    const velocityY = (particle.y - particle.py) * config.drag
    const nextX = particle.x + velocityX + particle.ax * dtSquared
    const nextY = particle.y + velocityY + particle.ay * dtSquared

    particle.px = particle.x
    particle.py = particle.y
    particle.x = nextX
    particle.y = nextY
    particle.ax = 0
    particle.ay = 0
  }
}

function solveDistanceConstraint(constraint, particles, bounds) {
  const a = particles[constraint.a]
  const b = particles[constraint.b]
  const dx = getShortestWrappedDelta(b.x, a.x, bounds.width)
  const dy = getShortestWrappedDelta(b.y, a.y, bounds.height)
  const distance = Math.hypot(dx, dy)

  if (distance <= 0.0001) return

  const error = (distance - constraint.restLength) / distance
  const correctionX = dx * error * constraint.stiffness * 0.5
  const correctionY = dy * error * constraint.stiffness * 0.5

  a.x += correctionX
  a.y += correctionY
  b.x -= correctionX
  b.y -= correctionY
}

function clampDisplacement(particle, bounds, maxDisplacement) {
  const targetX = getAlignedAnchorTarget(particle.x, particle.baseX, bounds.width)
  const targetY = getAlignedAnchorTarget(particle.y, particle.baseY, bounds.height)
  const dx = particle.x - targetX
  const dy = particle.y - targetY
  const displacement = Math.hypot(dx, dy)

  if (displacement <= maxDisplacement || displacement <= 0.0001) return

  const scale = maxDisplacement / displacement
  particle.x = targetX + dx * scale
  particle.y = targetY + dy * scale
}

function solveConstraints(system, bounds, config) {
  const { particles, neighborConstraints, wordConstraints, lineConstraints } = system

  for (let iteration = 0; iteration < config.solverIterations; iteration++) {
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index]
      const targetX = getAlignedAnchorTarget(particle.x, particle.baseX, bounds.width)
      const targetY = getAlignedAnchorTarget(particle.y, particle.baseY, bounds.height)

      particle.x += (targetX - particle.x) * config.anchorK
      particle.y += (targetY - particle.y) * config.anchorK
    }

    for (let index = 0; index < neighborConstraints.length; index++) {
      solveDistanceConstraint(neighborConstraints[index], particles, bounds)
    }

    for (let index = 0; index < wordConstraints.length; index++) {
      solveDistanceConstraint(wordConstraints[index], particles, bounds)
    }

    for (let index = 0; index < lineConstraints.length; index++) {
      solveDistanceConstraint(lineConstraints[index], particles, bounds)
    }

    for (let index = 0; index < particles.length; index++) {
      clampDisplacement(particles[index], bounds, config.maxDisplacement)
    }
  }
}

function limitVector(x, y, maxLength) {
  const length = Math.hypot(x, y)
  if (length <= maxLength || length <= 0.0001) {
    return { x, y }
  }

  const scale = maxLength / length
  return {
    x: x * scale,
    y: y * scale,
  }
}

function updateMacroWordDrift(system, activeFields, dt, config) {
  const ease = activeFields.length > 0 ? config.macroWordEase : config.macroSettleEase

  for (let index = 0; index < system.words.length; index++) {
    const word = system.words[index]
    let targetOffsetX = 0
    let targetOffsetY = 0
    const probeX = word.centroidX + word.offsetX
    const probeY = word.centroidY + word.offsetY

    for (let fieldIndex = 0; fieldIndex < activeFields.length; fieldIndex++) {
      const field = activeFields[fieldIndex]
      const dx = probeX - field.x
      const dy = probeY - field.y
      const distance = Math.hypot(dx, dy)
      const influenceRadius = field.falloff * 1.08

      if (distance >= influenceRadius) continue

      const radial = normalize(dx, dy, dx >= 0 ? 1 : -1, 0)
      const tangent = {
        x: -radial.y,
        y: radial.x,
      }
      const intensity = 1 - smoothstep(field.radius * 0.18, influenceRadius, distance)
      const push = (
        field.kind === 'burst'
          ? config.macroBurstPush
          : config.macroHoverPush
      ) * intensity
      const swirl = (
        field.kind === 'burst'
          ? config.macroBurstSwirl
          : config.macroHoverSwirl
      ) * intensity
      const flow = (
        field.kind === 'burst'
          ? config.macroBurstFlow
          : config.macroHoverFlow
      ) * intensity

      targetOffsetX += radial.x * push + tangent.x * swirl + field.directionX * flow
      targetOffsetY += radial.y * push + tangent.y * swirl + field.directionY * flow
    }

    const limited = limitVector(targetOffsetX, targetOffsetY, config.macroDriftLimit)
    word.offsetX += (limited.x - word.offsetX) * ease * dt
    word.offsetY += (limited.y - word.offsetY) * ease * dt
  }

  for (let index = 0; index < system.particles.length; index++) {
    const particle = system.particles[index]
    const word = system.words[particle.wordIndex]

    particle.baseX = particle.homeX + (word?.offsetX ?? 0)
    particle.baseY = particle.homeY + (word?.offsetY ?? 0)
  }
}

export class SwarmSimulation {
  constructor(config) {
    this.config = config
    this.system = null
    this.state = SWARM_STATES.SLEEP
    this.hoverField = null
    this.burstFields = []
    this.spatialHash = new SpatialHash(config.hashCellSize)
    this.stats = measureParticleStats([])
    this.bounds = { width: 0, height: 0 }
  }

  reset(layout) {
    this.system = createParticleSystem(layout, this.config)
    this.bounds = {
      width: layout.width,
      height: layout.height,
    }
    this.stats = measureParticleStats(this.system.particles, this.bounds)
    this.state = SWARM_STATES.IDLE
    this.burstFields = []
  }

  setHoverField(field) {
    this.hoverField = field
    this.state = field === null ? SWARM_STATES.SETTLING : SWARM_STATES.HOVER
  }

  addBurstField(field) {
    this.burstFields.push(field)
    this.state = SWARM_STATES.BURST
  }

  step(dt, elapsedMs) {
    if (this.system === null) {
      return {
        active: false,
        state: this.state,
        stats: this.stats,
      }
    }

    const nextBursts = []
    for (let index = 0; index < this.burstFields.length; index++) {
      const advanced = advanceBurstField(this.burstFields[index], elapsedMs, this.config)
      if (advanced !== null) nextBursts.push(advanced)
    }
    this.burstFields = nextBursts

    const particles = this.system.particles
    const activeFields = this.hoverField === null
      ? [...this.burstFields]
      : [this.hoverField, ...this.burstFields]

    updateMacroWordDrift(
      this.system,
      activeFields,
      clamp(dt, this.config.dtMin, this.config.dtMax),
      this.config,
    )
    this.spatialHash.rebuild(particles)
    applyFieldForces(particles, activeFields, this.bounds)
    applySecondaryBoids(particles, this.spatialHash, this.config, this.bounds)
    integrateParticles(particles, clamp(dt, this.config.dtMin, this.config.dtMax), this.config)
    solveConstraints(this.system, this.bounds, this.config)

    this.stats = measureParticleStats(particles, this.bounds)

    const settling = (
      this.stats.averageVelocity > this.config.sleepVelocityThreshold ||
      this.stats.averageDisplacement > this.config.sleepDisplacementThreshold ||
      this.stats.averageAnchorDisplacement > this.config.sleepDisplacementThreshold * 0.72
    )

    if (this.burstFields.length > 0) {
      this.state = SWARM_STATES.BURST
    } else if (this.hoverField !== null) {
      this.state = SWARM_STATES.HOVER
    } else if (settling) {
      this.state = SWARM_STATES.SETTLING
    } else {
      this.state = SWARM_STATES.SLEEP
    }

    return {
      active: this.burstFields.length > 0 || settling,
      state: this.state,
      stats: this.stats,
    }
  }

  getParticles() {
    return this.system?.particles ?? []
  }
}
