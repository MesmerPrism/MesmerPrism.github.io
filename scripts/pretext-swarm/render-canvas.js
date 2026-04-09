function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getWrapOffsets(position, extent, margin) {
  const offsets = [0]

  if (position < margin) {
    offsets.push(extent)
  }

  if (position > extent - margin) {
    offsets.push(-extent)
  }

  return offsets
}

function renderWrappedGlyph(context, renderer, particle, baselineOffset, wrapMargin) {
  const drawX = particle.x - particle.width * 0.5
  const drawY = particle.y + baselineOffset
  const xOffsets = getWrapOffsets(particle.x, renderer.width, wrapMargin)
  const yOffsets = getWrapOffsets(particle.y, renderer.height, wrapMargin)

  for (let xIndex = 0; xIndex < xOffsets.length; xIndex++) {
    for (let yIndex = 0; yIndex < yOffsets.length; yIndex++) {
      context.fillText(
        particle.glyph,
        drawX + xOffsets[xIndex],
        drawY + yOffsets[yIndex],
      )
    }
  }
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
    wrapMargin = Math.max(lineHeight * 1.2, maxDisplacement * 0.85),
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
    renderWrappedGlyph(context, renderer, particle, baselineOffset, wrapMargin)
  }

  context.globalAlpha = 1
}
