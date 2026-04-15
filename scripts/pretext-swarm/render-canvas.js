function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getWrapOffsets(position, start, end, margin) {
  const extent = end - start
  const offsets = [0]

  if (position < start + margin) {
    offsets.push(extent)
  }

  if (position > end - margin) {
    offsets.push(-extent)
  }

  return offsets
}

function normalizeWrapBounds(renderer, wrapBounds) {
  const left = Math.max(0, Math.min(wrapBounds?.left ?? 0, renderer.width))
  const top = Math.max(0, Math.min(wrapBounds?.top ?? 0, renderer.height))
  const right = Math.max(left + 1, Math.min(wrapBounds?.right ?? renderer.width, renderer.width))
  const bottom = Math.max(top + 1, Math.min(wrapBounds?.bottom ?? renderer.height, renderer.height))

  return { left, top, right, bottom }
}

function renderWrappedGlyph(context, renderer, particle, baselineOffset, wrapBounds, wrapMargin) {
  const drawX = particle.x - particle.width * 0.5
  const drawY = particle.y + baselineOffset
  const width = wrapBounds.right - wrapBounds.left
  const height = wrapBounds.bottom - wrapBounds.top
  const xOffsets = getWrapOffsets(particle.x, wrapBounds.left, wrapBounds.right, Math.min(wrapMargin, width * 0.5))
  const yOffsets = getWrapOffsets(particle.y, wrapBounds.top, wrapBounds.bottom, Math.min(wrapMargin, height * 0.5))

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
    wrapBounds,
    wrapMargin = Math.max(lineHeight * 1.2, maxDisplacement * 0.85),
  } = options

  const context = renderer.context
  const activeWrapBounds = normalizeWrapBounds(renderer, wrapBounds)
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
    renderWrappedGlyph(context, renderer, particle, baselineOffset, activeWrapBounds, wrapMargin)
  }

  context.globalAlpha = 1
}
