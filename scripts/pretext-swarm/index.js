import { getSwarmConfig } from './config.js'
import { createDebugOverlay, updateDebugOverlay } from './debug.js'
import { createBurstField, createHoverField } from './forces.js'
import { buildAnchorLayout, preparePretextLayout } from './layout.js'
import { createCanvasStage, renderCanvasSwarm, resizeCanvasStage } from './render-canvas.js'
import { SwarmSimulation } from './simulation.js'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getLayoutWidth(rootNode, fallback, viewport) {
  const viewportWidth = viewport.clientWidth
  if (viewportWidth > 0) return Math.round(viewportWidth)

  const fallbackWidth = fallback.getBoundingClientRect().width
  if (fallbackWidth > 0) return Math.round(fallbackWidth)

  return Math.round(rootNode.getBoundingClientRect().width)
}

function getEventPoint(viewport, event) {
  const bounds = viewport.getBoundingClientRect()
  return {
    x: clamp(event.clientX - bounds.left, 0, bounds.width),
    y: clamp(event.clientY - bounds.top, 0, bounds.height),
  }
}

function getPreviewPoint(width, height) {
  return {
    x: width * 0.7,
    y: height * 0.42,
  }
}

function publishSwarmDebug(rootNode, interactive, state, simulation) {
  rootNode.dataset.pretextRenderer = 'swarm-canvas'
  rootNode.dataset.pretextInteractive = String(interactive)
  rootNode.dataset.pretextWrap = 'teleport-direct-home'

  if (typeof window === 'undefined') return

  window.__pretextHero = {
    mode: 'swarm-canvas',
    interactive,
    wrap: 'teleport-direct-home',
    root: rootNode,
    get snapshot() {
      return {
        state: state.phase,
        stats: { ...state.stats },
        particleCount: simulation.getParticles().length,
      }
    },
  }
}

export async function startPretextSwarm({
  rootNode,
  viewport,
  fallback,
  sourceText,
  font,
  lineHeight,
  interactive,
  previewMode,
}) {
  const config = getSwarmConfig()
  const prepared = preparePretextLayout(sourceText, font)
  const measureContext = document.createElement('canvas').getContext('2d')
  if (measureContext === null) {
    throw new Error('Failed to create measurement canvas for pretext swarm')
  }

  const color = window.getComputedStyle(fallback).color
  const debug = createDebugOverlay(
    viewport,
    new URLSearchParams(window.location.search).get('pretext-debug') === '1',
  )
  const renderer = createCanvasStage(viewport)
  const simulation = new SwarmSimulation(config)
  const state = {
    rafId: 0,
    lastTimestamp: 0,
    pointerX: 0,
    pointerY: 0,
    velocityX: 0,
    velocityY: 0,
    hasPointer: false,
    ready: false,
    phase: simulation.state,
    stats: simulation.stats,
  }

  rootNode.classList.add('is-enhanced', 'is-canvas-mode')
  rootNode.classList.remove('is-dom-mode')
  publishSwarmDebug(rootNode, interactive, state, simulation)

  function rebuildLayout() {
    const width = getLayoutWidth(rootNode, fallback, viewport)
    if (width <= 0) return false

    const layout = buildAnchorLayout({
      prepared,
      font,
      lineHeight,
      measureContext,
      width,
      config,
    })

    viewport.style.height = `${layout.height}px`
    viewport.style.minHeight = `${layout.height}px`
    rootNode.style.minHeight = `${layout.height}px`
    resizeCanvasStage(renderer, width, layout.height)
    simulation.reset(layout)
    render()

    if (!state.ready) {
      rootNode.classList.add('is-ready')
      state.ready = true
    }

    if (state.hasPointer) {
      const hoverX = clamp(state.pointerX, 0, layout.width)
      const hoverY = clamp(state.pointerY, 0, layout.height)
      simulation.setHoverField(
        createHoverField(hoverX, hoverY, state.velocityX, state.velocityY, config),
      )
      ensureAnimation()
    } else if (!interactive && previewMode === 'cursor') {
      const preview = getPreviewPoint(layout.width, layout.height)
      simulation.setHoverField(createHoverField(preview.x, preview.y, 0.8, 0, config))
      ensureAnimation()
    } else {
      simulation.setHoverField(null)
    }

    return true
  }

  function render(snapshot = null) {
    if (snapshot !== null) {
      state.phase = snapshot.state
      state.stats = snapshot.stats
    }

    renderCanvasSwarm(
      renderer,
      simulation.getParticles(),
      {
        font,
        lineHeight,
        color,
        maxDisplacement: config.maxDisplacement,
      },
    )

    if (snapshot !== null) {
      updateDebugOverlay(debug, snapshot, simulation.getParticles().length)
    }
  }

  function ensureAnimation() {
    if (state.rafId !== 0) return
    state.lastTimestamp = 0
    state.rafId = window.requestAnimationFrame(stepFrame)
  }

  function stepFrame(timestamp) {
    const elapsedMs = state.lastTimestamp === 0 ? 16.667 : timestamp - state.lastTimestamp
    const dt = state.lastTimestamp === 0 ? 1 : elapsedMs / 16.667
    state.lastTimestamp = timestamp
    state.rafId = 0

    const snapshot = simulation.step(dt, elapsedMs)
    render(snapshot)

    if (snapshot.active) {
      state.rafId = window.requestAnimationFrame(stepFrame)
    }
  }

  function setHoverFromPoint(x, y) {
    state.velocityX = x - state.pointerX
    state.velocityY = y - state.pointerY
    state.pointerX = x
    state.pointerY = y
    state.hasPointer = true
    simulation.setHoverField(
      createHoverField(x, y, state.velocityX, state.velocityY, config),
    )
    ensureAnimation()
  }

  function handlePointerEnter(event) {
    const point = getEventPoint(viewport, event)
    state.pointerX = point.x
    state.pointerY = point.y
    state.velocityX = 0
    state.velocityY = 0
    state.hasPointer = true
    simulation.setHoverField(createHoverField(point.x, point.y, 0, 0, config))
    ensureAnimation()
  }

  function handlePointerMove(event) {
    const point = getEventPoint(viewport, event)
    setHoverFromPoint(point.x, point.y)
  }

  function handlePointerLeave() {
    state.hasPointer = false
    simulation.setHoverField(null)
    ensureAnimation()
  }

  function handlePointerDown(event) {
    const point = getEventPoint(viewport, event)
    const burst = createBurstField(
      point.x,
      point.y,
      state.velocityX,
      state.velocityY,
      config,
    )
    simulation.addBurstField(burst)
    ensureAnimation()
  }

  function handleResize() {
    state.lastTimestamp = 0
    rebuildLayout()
  }

  if (!rebuildLayout()) {
    throw new Error('Unable to compute a layout width for the pretext swarm')
  }

  window.addEventListener('resize', handleResize, { passive: true })

  if (interactive) {
    viewport.addEventListener('pointerenter', handlePointerEnter)
    viewport.addEventListener('pointermove', handlePointerMove)
    viewport.addEventListener('pointerleave', handlePointerLeave)
    viewport.addEventListener('pointerdown', handlePointerDown)
  }

  return {
    destroy() {
      window.removeEventListener('resize', handleResize)
      viewport.removeEventListener('pointerenter', handlePointerEnter)
      viewport.removeEventListener('pointermove', handlePointerMove)
      viewport.removeEventListener('pointerleave', handlePointerLeave)
      viewport.removeEventListener('pointerdown', handlePointerDown)
      if (state.rafId !== 0) {
        window.cancelAnimationFrame(state.rafId)
      }
    },
  }
}
