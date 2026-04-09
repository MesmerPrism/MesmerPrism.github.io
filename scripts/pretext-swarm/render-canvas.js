function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function createCanvasStage(viewport) {
  const stage = document.createElement('div')
  stage.className = 'pretext-swarm'
  stage.setAttribute('aria-hidden', 'true')

  const canvas = document.createElement('canvas')
  canvas.className = 'pretext-swarm__canvas'
  stage.appendChild(canvas)
  viewport.appendChild(stage)

  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('Failed to create Canvas2D context for pretext swarm')
  }

  return {
    stage,
    canvas,
    context,
    width: 0,
    height: 0,
    dpr: 1,
  }
}

export function resizeCanvasStage(renderer, width, height) {
  const dpr = Math.max(window.devicePixelRatio || 1, 1)

  renderer.width = width
  renderer.height = height
  renderer.dpr = dpr
  renderer.stage.style.width = `${width}px`
  renderer.stage.style.height = `${height}px`
  renderer.canvas.width = Math.max(Math.round(width * dpr), 1)
  renderer.canvas.height = Math.max(Math.round(height * dpr), 1)
  renderer.canvas.style.width = `${width}px`
  renderer.canvas.style.height = `${height}px`
}

export function renderCanvasSwarm(renderer, particles, options) {
  const {
    font,
    lineHeight,
    color,
    maxDisplacement,
  } = options

  const context = renderer.context
  context.setTransform(renderer.dpr, 0, 0, renderer.dpr, 0, 0)
  context.clearRect(0, 0, renderer.width, renderer.height)
  context.font = font
  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'
  context.fillStyle = color

  const baselineOffset = lineHeight * (0.78 - 0.56)

  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index]
    if (particle.glyph.trim().length === 0) continue

    const displacement = Math.hypot(particle.x - particle.baseX, particle.y - particle.baseY)
    context.globalAlpha = clamp(1 - displacement / (maxDisplacement * 4), 0.78, 1)
    context.fillText(
      particle.glyph,
      particle.x - particle.width * 0.5,
      particle.y + baselineOffset,
    )
  }

  context.globalAlpha = 1
}
