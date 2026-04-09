import { getAlignedAnchorTarget, getNearestWrappedValue } from './wrap.js'

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

function circleDistance(x, y, centerX, centerY, radius) {
  const dx = x - centerX
  const dy = y - centerY
  const direction = normalize(dx, dy)

  return {
    distance: Math.hypot(dx, dy) - radius,
    gradientX: direction.x,
    gradientY: direction.y,
  }
}

function capsuleDistance(x, y, ax, ay, bx, by, radius) {
  const pax = x - ax
  const pay = y - ay
  const bax = bx - ax
  const bay = by - ay
  const baLengthSquared = bax * bax + bay * bay
  const h = baLengthSquared <= 0.0001
    ? 0
    : clamp((pax * bax + pay * bay) / baLengthSquared, 0, 1)
  const closestX = ax + bax * h
  const closestY = ay + bay * h
  const dx = x - closestX
  const dy = y - closestY
  const direction = normalize(dx, dy)

  return {
    distance: Math.hypot(dx, dy) - radius,
    gradientX: direction.x,
    gradientY: direction.y,
  }
}

function strongestShapeSample(field, particle, bounds) {
  const sampleX = bounds === null
    ? particle.x
    : getNearestWrappedValue(particle.x, field.x, bounds.width)
  const sampleY = bounds === null
    ? particle.y
    : getNearestWrappedValue(particle.y, field.y, bounds.height)
  const circle = circleDistance(
    sampleX,
    sampleY,
    field.x,
    field.y,
    field.radius,
  )

  const shapeSamples = [circle]

  if (field.length > 0.5) {
    const endX = field.x + field.directionX * field.length
    const endY = field.y + field.directionY * field.length
    shapeSamples.push(
      capsuleDistance(
        sampleX,
        sampleY,
        field.x,
        field.y,
        endX,
        endY,
        Math.max(field.radius * 0.82, 8),
      ),
    )
  }

  let best = shapeSamples[0]
  for (let index = 1; index < shapeSamples.length; index++) {
    if (shapeSamples[index].distance < best.distance) {
      best = shapeSamples[index]
    }
  }

  return best
}

export function createHoverField(x, y, velocityX, velocityY, config) {
  const direction = normalize(velocityX, velocityY)
  return {
    kind: 'hover',
    x,
    y,
    directionX: direction.x,
    directionY: direction.y,
    radius: config.hoverRadius,
    falloff: config.hoverFalloff,
    strength: config.hoverStrength,
    bias: config.hoverBias,
    length: Math.min(Math.hypot(velocityX, velocityY) * 18, config.burstLength * 0.55),
  }
}

export function createBurstField(x, y, velocityX, velocityY, config) {
  const direction = normalize(velocityX, velocityY)
  return {
    kind: 'burst',
    x,
    y,
    directionX: direction.x,
    directionY: direction.y,
    radius: config.burstRadius,
    falloff: config.burstFalloff,
    strength: config.burstStrength,
    bias: config.burstBias,
    length: Math.max(Math.hypot(velocityX, velocityY) * 26, config.burstLength),
    ttlMs: config.burstDurationMs,
  }
}

export function advanceBurstField(field, elapsedMs, config) {
  const nextTtl = field.ttlMs - elapsedMs
  if (nextTtl <= 0) return null

  const decay = Math.pow(config.burstDecay, elapsedMs / 16.667)
  return {
    ...field,
    ttlMs: nextTtl,
    strength: field.strength * decay,
    length: Math.max(field.length * decay, 24),
  }
}

export function applyFieldForces(particles, fields, bounds = null) {
  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index]

    for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
      const field = fields[fieldIndex]
      const sample = strongestShapeSample(field, particle, bounds)

      if (sample.distance >= field.falloff) continue

      const intensity = 1 - smoothstep(-field.radius * 0.28, field.falloff, sample.distance)
      const directionalBias = field.kind === 'burst' ? field.bias * intensity : field.bias * intensity * 0.5

      particle.ax += sample.gradientX * field.strength * intensity + field.directionX * directionalBias
      particle.ay += sample.gradientY * field.strength * intensity + field.directionY * directionalBias
    }
  }
}

export function applySecondaryBoids(particles, spatialHash, config, bounds = null) {
  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index]
    const targetX = bounds === null
      ? particle.baseX
      : getAlignedAnchorTarget(particle.x, particle.baseX, bounds.width)
    const targetY = bounds === null
      ? particle.baseY
      : getAlignedAnchorTarget(particle.y, particle.baseY, bounds.height)
    const displacement = Math.hypot(particle.x - targetX, particle.y - targetY)

    if (displacement < config.boidDetachThreshold) continue

    const neighbors = spatialHash.queryRadius(
      particle.x,
      particle.y,
      config.boidNeighborRadius,
    )

    let separationX = 0
    let separationY = 0
    let alignmentX = 0
    let alignmentY = 0
    let cohesionX = 0
    let cohesionY = 0
    let count = 0

    for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex++) {
      const otherId = neighbors[neighborIndex]
      if (otherId === index) continue

      const other = particles[otherId]
      const dx = particle.x - other.x
      const dy = particle.y - other.y
      const distance = Math.hypot(dx, dy)

      if (distance <= 0.0001 || distance > config.boidNeighborRadius) continue

      if (distance < config.boidSeparationRadius) {
        separationX += dx / distance
        separationY += dy / distance
      }

      alignmentX += other.x - other.px
      alignmentY += other.y - other.py
      cohesionX += other.x
      cohesionY += other.y
      count += 1
    }

    if (count === 0) continue

    const meanAlignmentX = alignmentX / count
    const meanAlignmentY = alignmentY / count
    const meanCohesionX = cohesionX / count - particle.x
    const meanCohesionY = cohesionY / count - particle.y

    particle.ax += separationX * config.boidSeparationWeight
    particle.ay += separationY * config.boidSeparationWeight
    particle.ax += meanAlignmentX * config.boidAlignmentWeight
    particle.ay += meanAlignmentY * config.boidAlignmentWeight
    particle.ax += meanCohesionX * config.boidCohesionWeight
    particle.ay += meanCohesionY * config.boidCohesionWeight
  }
}
