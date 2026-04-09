function distanceBetweenAnchors(anchorA, anchorB) {
  return Math.hypot(anchorB.baseX - anchorA.baseX, anchorB.baseY - anchorA.baseY)
}

function createConstraint(a, b, restLength, stiffness) {
  return { a, b, restLength, stiffness }
}

export function createParticleSystem(layout, config) {
  const particles = layout.anchors.map(anchor => ({ ...anchor }))
  const neighborConstraints = []
  const wordConstraints = []
  const lineConstraints = []

  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index]
    if (particle.rightId === null) continue

    neighborConstraints.push(
      createConstraint(
        index,
        particle.rightId,
        distanceBetweenAnchors(layout.anchors[index], layout.anchors[particle.rightId]),
        config.neighborK,
      ),
    )
  }

  for (let wordIndex = 0; wordIndex < layout.words.length; wordIndex++) {
    const word = layout.words[wordIndex]
    if (word.anchorIds.length < 2) continue

    const firstId = word.anchorIds[0]
    const lastId = word.anchorIds[word.anchorIds.length - 1]
    wordConstraints.push(
      createConstraint(
        firstId,
        lastId,
        distanceBetweenAnchors(layout.anchors[firstId], layout.anchors[lastId]),
        config.wordK * 0.72,
      ),
    )

    for (let index = 0; index < word.anchorIds.length - 2; index += 2) {
      const a = word.anchorIds[index]
      const b = word.anchorIds[Math.min(index + 2, word.anchorIds.length - 1)]
      wordConstraints.push(
        createConstraint(
          a,
          b,
          distanceBetweenAnchors(layout.anchors[a], layout.anchors[b]),
          config.wordK,
        ),
      )
    }
  }

  for (let lineIndex = 0; lineIndex < layout.lines.length; lineIndex++) {
    const line = layout.lines[lineIndex]
    if (line.anchorIds.length < 4) continue

    for (let index = 0; index < line.anchorIds.length - 3; index += 3) {
      const a = line.anchorIds[index]
      const b = line.anchorIds[Math.min(index + 3, line.anchorIds.length - 1)]
      lineConstraints.push(
        createConstraint(
          a,
          b,
          distanceBetweenAnchors(layout.anchors[a], layout.anchors[b]),
          config.lineK,
        ),
      )
    }
  }

  return {
    particles,
    lines: layout.lines,
    words: layout.words,
    neighborConstraints,
    wordConstraints,
    lineConstraints,
  }
}

export function measureParticleStats(particles) {
  if (particles.length === 0) {
    return {
      averageDisplacement: 0,
      averageVelocity: 0,
      maxDisplacement: 0,
    }
  }

  let displacementSum = 0
  let velocitySum = 0
  let maxDisplacement = 0

  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index]
    const displacement = Math.hypot(particle.x - particle.baseX, particle.y - particle.baseY)
    const velocity = Math.hypot(particle.x - particle.px, particle.y - particle.py)

    displacementSum += displacement
    velocitySum += velocity
    maxDisplacement = Math.max(maxDisplacement, displacement)
  }

  return {
    averageDisplacement: displacementSum / particles.length,
    averageVelocity: velocitySum / particles.length,
    maxDisplacement,
  }
}
