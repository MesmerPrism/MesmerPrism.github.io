import { SWARM_STATES } from './config.js'
import { applyFieldForces, applySecondaryBoids, advanceBurstField } from './forces.js'
import { createParticleSystem, measureParticleStats } from './particles.js'
import { SpatialHash } from './spatial-hash.js'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
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

function solveDistanceConstraint(constraint, particles) {
  const a = particles[constraint.a]
  const b = particles[constraint.b]
  const dx = b.x - a.x
  const dy = b.y - a.y
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

function clampDisplacement(particle, maxDisplacement) {
  const dx = particle.x - particle.baseX
  const dy = particle.y - particle.baseY
  const displacement = Math.hypot(dx, dy)

  if (displacement <= maxDisplacement || displacement <= 0.0001) return

  const scale = maxDisplacement / displacement
  particle.x = particle.baseX + dx * scale
  particle.y = particle.baseY + dy * scale
}

function solveConstraints(system, config) {
  const { particles, lines, neighborConstraints, wordConstraints, lineConstraints } = system

  for (let iteration = 0; iteration < config.solverIterations; iteration++) {
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index]
      const line = lines[particle.lineIndex]

      particle.x += (particle.baseX - particle.x) * config.anchorK
      particle.y += (particle.baseY - particle.y) * config.anchorK

      if (line !== undefined) {
        particle.y += (line.centerY - particle.y) * config.lineK
      }
    }

    for (let index = 0; index < neighborConstraints.length; index++) {
      solveDistanceConstraint(neighborConstraints[index], particles)
    }

    for (let index = 0; index < wordConstraints.length; index++) {
      solveDistanceConstraint(wordConstraints[index], particles)
    }

    for (let index = 0; index < lineConstraints.length; index++) {
      solveDistanceConstraint(lineConstraints[index], particles)
    }

    for (let index = 0; index < particles.length; index++) {
      clampDisplacement(particles[index], config.maxDisplacement)
    }
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
  }

  reset(layout) {
    this.system = createParticleSystem(layout, this.config)
    this.stats = measureParticleStats(this.system.particles)
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

    this.spatialHash.rebuild(particles)
    applyFieldForces(particles, activeFields)
    applySecondaryBoids(particles, this.spatialHash, this.config)
    integrateParticles(particles, clamp(dt, this.config.dtMin, this.config.dtMax), this.config)
    solveConstraints(this.system, this.config)

    this.stats = measureParticleStats(particles)

    const settling = (
      this.stats.averageVelocity > this.config.sleepVelocityThreshold ||
      this.stats.averageDisplacement > this.config.sleepDisplacementThreshold
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
