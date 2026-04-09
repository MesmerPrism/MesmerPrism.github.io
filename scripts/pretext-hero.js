import {
  layoutNextLine,
  prepareWithSegments,
} from 'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.3/dist/layout.js'
import {
  HERO_MODES,
  resolveHeroMode,
  supportsCanvas2D,
} from './pretext-swarm/config.js'
import { startPretextSwarm } from './pretext-swarm/index.js'

const root = document.querySelector('.plasmatic-intro[data-pretext-hero]')
const graphemeSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

if (root instanceof HTMLDivElement && root.dataset.pretextHero !== 'off') {
  startPretextHero(root).catch(error => {
    console.error('Pretext hero setup failed:', error)
  })
}

async function startPretextHero(rootNode) {
  const fallback = rootNode.querySelector('.plasmatic-intro__fallback')
  const viewport = rootNode.querySelector('.plasmatic-intro__viewport')

  if (!(fallback instanceof HTMLParagraphElement)) {
    throw new Error('Missing .plasmatic-intro__fallback')
  }

  if (!(viewport instanceof HTMLDivElement)) {
    throw new Error('Missing .plasmatic-intro__viewport')
  }

  await document.fonts.ready

  const sourceText = (fallback.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (sourceText.length === 0) return

  const computed = window.getComputedStyle(fallback)
  const font = buildCanvasFont(computed)
  const lineHeight = parseFloat(computed.lineHeight)
  if (!Number.isFinite(lineHeight)) {
    throw new Error('Expected an explicit line-height for the fallback text')
  }

  const searchParams = new URLSearchParams(window.location.search)
  const previewMode = searchParams.get('pretext-demo')
  const requestedMode = rootNode.dataset.pretextMode ?? searchParams.get('pretext-mode') ?? HERO_MODES.AUTO
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const interactive = !coarsePointer && !reducedMotion
  const mode = resolveHeroMode(requestedMode, interactive, supportsCanvas2D())

  viewport.replaceChildren()
  viewport.style.height = ''
  viewport.style.minHeight = ''
  rootNode.style.minHeight = ''
  rootNode.classList.remove('is-enhanced', 'is-ready', 'is-dom-mode', 'is-canvas-mode')
  rootNode.dataset.pretextInteractive = String(interactive)
  rootNode.dataset.pretextWrap = 'none'

  if (mode === HERO_MODES.STATIC) {
    rootNode.dataset.pretextRenderer = HERO_MODES.STATIC
    publishDomDebug(rootNode, HERO_MODES.STATIC, interactive)
    return
  }

  if (mode === HERO_MODES.SWARM_CANVAS) {
    try {
      await startPretextSwarm({
        rootNode,
        viewport,
        fallback,
        sourceText,
        font,
        lineHeight,
        interactive,
        previewMode,
      })
      return
    } catch (error) {
      console.error('Pretext swarm setup failed, falling back to DOM renderer:', error)
    }
  }

  startDomHero({
    rootNode,
    fallback,
    viewport,
    sourceText,
    font,
    lineHeight,
    interactive,
    previewMode,
  })
}

function startDomHero({
  rootNode,
  fallback,
  viewport,
  sourceText,
  font,
  lineHeight,
  interactive,
  previewMode,
}) {
  const prepared = prepareWithSegments(sourceText, font)
  const stage = document.createElement('div')
  stage.className = 'pretext-hero'
  stage.setAttribute('aria-hidden', 'true')
  viewport.appendChild(stage)

  const measureContext = document.createElement('canvas').getContext('2d')
  if (measureContext === null) {
    throw new Error('Failed to create measurement canvas for pretext hero')
  }

  const state = {
    rootNode,
    fallback,
    viewport,
    prepared,
    font,
    lineHeight,
    lineStates: [],
    stage,
    measureContext,
    interactive,
    previewMode,
    currentField: null,
    targetField: null,
    viewportHeight: 0,
    lastWidth: 0,
    lastHeight: 0,
    rafId: 0,
  }

  rootNode.classList.add('is-enhanced', 'is-dom-mode')
  rootNode.dataset.pretextRenderer = HERO_MODES.CURRENT_DOM
  publishDomDebug(rootNode, HERO_MODES.CURRENT_DOM, interactive)
  if (renderFrame()) {
    rootNode.classList.add('is-ready')
  }

  window.addEventListener('resize', handleResize, { passive: true })

  if (state.interactive) {
    viewport.addEventListener('pointerenter', handlePointer)
    viewport.addEventListener('pointermove', handlePointer)
    viewport.addEventListener('pointerleave', handleLeave)
  }

  function handlePointer(event) {
    const bounds = viewport.getBoundingClientRect()
    const activeField = buildActiveField(
      clamp(event.clientX - bounds.left, 0, bounds.width),
      clamp(event.clientY - bounds.top, 0, bounds.height),
      bounds.width,
      bounds.height,
    )

    if (state.currentField === null) {
      state.currentField = activeField
    }

    state.targetField = activeField
    ensureAnimation()
  }

  function handleLeave() {
    state.targetField = buildRestField(state.lastWidth, state.lastHeight)
    ensureAnimation()
  }

  function handleResize() {
    state.currentField = null
    state.targetField = null
    renderFrame()
  }

  function ensureAnimation() {
    if (state.rafId !== 0) return
    state.rafId = window.requestAnimationFrame(stepFrame)
  }

  function stepFrame() {
    state.rafId = 0

    if (!renderFrame()) return

    if (needsAnotherFrame(state)) {
      state.rafId = window.requestAnimationFrame(stepFrame)
    }
  }

  function renderFrame() {
    const width = getLayoutWidth(rootNode, fallback, viewport)

    if (width <= 0) return false

    const height = ensureViewportHeight(state, rootNode, viewport, width)
    if (height <= 0) return false

    if (width !== state.lastWidth || height !== state.lastHeight) {
      stage.style.width = `${width}px`
      stage.style.height = `${height}px`
      state.lastWidth = width
      state.lastHeight = height

      if (state.currentField !== null) {
        state.currentField = normalizeField(state.currentField, width, height)
      }

      if (state.targetField !== null) {
        state.targetField = normalizeField(state.targetField, width, height)
      }
    }

    const field = getCurrentField(state, width, height)
    const layout = computeHeroLayout(width, height, field)
    layoutHeroText(state, layout, width, height)
    return true
  }
}

function buildCanvasFont(computed) {
  const style = computed.fontStyle === 'normal' ? '' : `${computed.fontStyle} `
  const weight = computed.fontWeight ? `${computed.fontWeight} ` : ''
  return `${style}${weight}${computed.fontSize} ${computed.fontFamily}`.trim()
}

function publishDomDebug(rootNode, mode, interactive) {
  if (typeof window === 'undefined') return

  window.__pretextHero = {
    mode,
    interactive,
    wrap: 'none',
    root: rootNode,
  }
}

function getLayoutWidth(rootNode, fallback, viewport) {
  const viewportWidth = viewport.clientWidth
  if (viewportWidth > 0) return Math.round(viewportWidth)

  const fallbackWidth = fallback.getBoundingClientRect().width
  if (fallbackWidth > 0) return Math.round(fallbackWidth)

  return Math.round(rootNode.getBoundingClientRect().width)
}

function computeHeroLayout(width, height, field) {
  return {
    insetX: Math.max(10, width * 0.014),
    insetY: Math.max(18, height * 0.082, 0),
    minSlotWidth: Math.max(188, width * 0.27),
    slotPaddingX: Math.max(14, width * 0.02),
    slotPaddingY: 4,
    field,
  }
}

function ensureViewportHeight(state, rootNode, viewport, width) {
  const widthInset = Math.max(10, width * 0.014)
  const naturalWidth = Math.max(120, width - widthInset * 2)
  const naturalLineCount = countWrappedLines(state.prepared, naturalWidth)
  let viewportHeight = Math.ceil(Math.max(
    naturalLineCount * state.lineHeight + state.lineHeight * 2.5,
    state.lineHeight * 7.5,
  ))

  for (let iteration = 0; iteration < 14; iteration++) {
    const sampleField = buildActiveField(width * 0.72, viewportHeight * 0.38, width, viewportHeight)
    const layout = computeHeroLayout(width, viewportHeight, sampleField)
    const sample = collectHeroLines(state.prepared, state.lineHeight, layout, width, viewportHeight)
    const reserve = state.lineHeight * 1.2
    const requiredHeight = Math.ceil(sample.lastBottom + layout.insetY + reserve)

    if (sample.consumedAll && viewportHeight >= requiredHeight) {
      viewportHeight = requiredHeight
      break
    }

    viewportHeight = Math.max(viewportHeight + state.lineHeight, requiredHeight)
  }

  if (viewportHeight !== state.viewportHeight) {
    state.viewportHeight = viewportHeight
    viewport.style.height = `${viewportHeight}px`
    viewport.style.minHeight = `${viewportHeight}px`
    rootNode.style.minHeight = `${viewportHeight}px`
  }

  return viewportHeight
}

function layoutHeroText(state, layout, width, height) {
  const { lines } = collectHeroLines(state.prepared, state.lineHeight, layout, width, height)

  syncLinePool(state.lineStates, lines.length, state.stage)
  state.measureContext.font = state.font

  for (let index = 0; index < lines.length; index++) {
    const lineState = state.lineStates[index]
    const line = lines[index]
    updateLineState(lineState, line, layout.field, state)
  }
}

function collectHeroLines(prepared, lineHeight, layout, width, height) {
  const lines = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineTop = layout.insetY
  const maxY = height - layout.insetY

  while (lineTop + lineHeight <= maxY) {
    const blocked = []

    if (layout.field.layoutRadius > 6) {
      const interval = circleIntervalForBand(
        {
          x: layout.field.x,
          y: layout.field.y,
          radius: layout.field.layoutRadius,
        },
        lineTop,
        lineTop + lineHeight,
        layout.slotPaddingX,
        layout.slotPaddingY,
      )

      if (interval !== null) blocked.push(interval)
    }

    const slots = carveSlots(
      { left: layout.insetX, right: width - layout.insetX },
      blocked,
      layout.minSlotWidth,
    )

    const preferredSlots = pickPreferredSlots(slots, layout.field, width)

    if (preferredSlots.length === 0) {
      lineTop += lineHeight
      continue
    }

    let exhausted = false

    for (let index = 0; index < preferredSlots.length; index++) {
      const slot = preferredSlots[index]
      const line = layoutNextLine(prepared, cursor, slot.right - slot.left)

      if (line === null) {
        exhausted = true
        break
      }

      lines.push({
        text: line.text,
        x: Math.round(slot.left),
        y: Math.round(lineTop),
      })
      cursor = line.end
    }

    if (exhausted) break
    lineTop += lineHeight
  }

  const maxLineWidth = Math.max(120, width - layout.insetX * 2)
  const consumedAll = layoutNextLine(prepared, cursor, maxLineWidth) === null
  const lastBottom = lines.length === 0 ? layout.insetY : lines[lines.length - 1].y + lineHeight

  return { lines, consumedAll, lastBottom }
}

function updateLineState(lineState, line, field, state) {
  lineState.node.style.left = `${line.x}px`
  lineState.node.style.top = `${line.y}px`
  lineState.node.style.font = state.font
  lineState.node.style.lineHeight = `${state.lineHeight}px`

  syncGlyphPool(lineState, line.text)

  let offsetX = 0
  for (let index = 0; index < lineState.glyphStates.length; index++) {
    const glyphState = lineState.glyphStates[index]
    const width = state.measureContext.measureText(glyphState.value).width
    const centerX = line.x + offsetX + width * 0.5
    const centerY = line.y + state.lineHeight * 0.58
    const opacity = computeGlyphOpacity(field, centerX, centerY)

    glyphState.node.style.opacity = opacity.toFixed(3)
    offsetX += width
  }
}

function buildRestField(width, height) {
  return {
    x: width * 0.82,
    y: height * 0.43,
    layoutRadius: 0,
    fadeRadius: 0,
  }
}

function buildActiveField(x, y, width, height) {
  const baseRadius = Math.min(width, height)
  return {
    x,
    y,
    layoutRadius: baseRadius * (width < 640 ? 0.115 : 0.135),
    fadeRadius: baseRadius * (width < 640 ? 0.24 : 0.275),
  }
}

function getPreviewField(width, height) {
  return buildActiveField(width * 0.7, height * 0.42, width, height)
}

function getCurrentField(state, width, height) {
  const restField = buildRestField(width, height)

  if (state.currentField === null) {
    state.currentField = (
      !state.interactive && state.previewMode === 'cursor'
        ? getPreviewField(width, height)
        : state.targetField ?? restField
    )
  }

  if (state.targetField === null) {
    state.targetField = (
      !state.interactive && state.previewMode === 'cursor'
        ? getPreviewField(width, height)
        : restField
    )
  }

  if (!state.interactive) {
    state.currentField = state.previewMode === 'cursor' ? state.currentField : restField
    state.targetField = state.currentField
    return state.currentField
  }

  state.currentField = tweenField(state.currentField, state.targetField)
  return state.currentField
}

function tweenField(current, target) {
  const ease = 0.12
  return {
    x: current.x + (target.x - current.x) * ease,
    y: current.y + (target.y - current.y) * ease,
    layoutRadius: current.layoutRadius + (target.layoutRadius - current.layoutRadius) * ease,
    fadeRadius: current.fadeRadius + (target.fadeRadius - current.fadeRadius) * ease,
  }
}

function normalizeField(field, width, height) {
  const baseRadius = Math.min(width, height)
  return {
    x: clamp(field.x, 0, width),
    y: clamp(field.y, 0, height),
    layoutRadius: clamp(field.layoutRadius, 0, baseRadius * 0.18),
    fadeRadius: clamp(field.fadeRadius, 0, baseRadius * 0.36),
  }
}

function needsAnotherFrame(state) {
  if (!state.interactive || state.currentField === null || state.targetField === null) {
    return false
  }

  return (
    Math.abs(state.currentField.x - state.targetField.x) > 0.25 ||
    Math.abs(state.currentField.y - state.targetField.y) > 0.25 ||
    Math.abs(state.currentField.layoutRadius - state.targetField.layoutRadius) > 0.25 ||
    Math.abs(state.currentField.fadeRadius - state.targetField.fadeRadius) > 0.25
  )
}

function circleIntervalForBand(circle, top, bottom, horizontalPadding, verticalPadding) {
  const bandTop = top - verticalPadding
  const bandBottom = bottom + verticalPadding

  if (bandTop >= circle.y + circle.radius || bandBottom <= circle.y - circle.radius) {
    return null
  }

  const minDy = circle.y < bandTop
    ? bandTop - circle.y
    : circle.y > bandBottom
      ? circle.y - bandBottom
      : 0

  if (minDy >= circle.radius) return null

  const maxDx = Math.sqrt(circle.radius * circle.radius - minDy * minDy)
  return {
    left: circle.x - maxDx - horizontalPadding,
    right: circle.x + maxDx + horizontalPadding,
  }
}

function carveSlots(base, blockedIntervals, minSlotWidth) {
  const blocked = blockedIntervals
    .map(interval => ({
      left: Math.max(base.left, interval.left),
      right: Math.min(base.right, interval.right),
    }))
    .filter(interval => interval.right > interval.left)
    .sort((left, right) => left.left - right.left)

  const merged = []
  for (let index = 0; index < blocked.length; index++) {
    const interval = blocked[index]
    const last = merged[merged.length - 1]

    if (last === undefined || interval.left > last.right) {
      merged.push(interval)
    } else if (interval.right > last.right) {
      last.right = interval.right
    }
  }

  const slots = []
  let cursor = base.left

  for (let index = 0; index < merged.length; index++) {
    const interval = merged[index]
    if (interval.left - cursor >= minSlotWidth) {
      slots.push({ left: cursor, right: interval.left })
    }
    cursor = Math.max(cursor, interval.right)
  }

  if (base.right - cursor >= minSlotWidth) {
    slots.push({ left: cursor, right: base.right })
  }

  return slots
}

function pickPreferredSlots(slots, field, width) {
  if (slots.length <= 1 || field.layoutRadius <= 6) {
    return slots
  }

  const leftmost = slots[0]
  const rightmost = slots[slots.length - 1]
  const preferLeft = field.x >= width * 0.52
  const preferred = preferLeft ? leftmost : rightmost

  return preferred === undefined ? slots : [preferred]
}

function syncLinePool(pool, targetLength, parent) {
  while (pool.length < targetLength) {
    const node = document.createElement('span')
    node.className = 'pretext-hero__line'
    parent.appendChild(node)
    pool.push({
      node,
      glyphStates: [],
      text: '',
    })
  }

  while (pool.length > targetLength) {
    const lineState = pool.pop()
    lineState.node.remove()
  }
}

function syncGlyphPool(lineState, text) {
  const glyphs = segmentGraphemes(text)

  while (lineState.glyphStates.length < glyphs.length) {
    const node = document.createElement('span')
    node.className = 'pretext-hero__glyph'
    lineState.node.appendChild(node)
    lineState.glyphStates.push({ node, value: '' })
  }

  while (lineState.glyphStates.length > glyphs.length) {
    const glyphState = lineState.glyphStates.pop()
    glyphState.node.remove()
  }

  for (let index = 0; index < glyphs.length; index++) {
    const glyphState = lineState.glyphStates[index]
    const value = glyphs[index]

    if (glyphState.value !== value) {
      glyphState.value = value
      glyphState.node.textContent = value
    }
  }

  lineState.text = text
}

function segmentGraphemes(text) {
  if (graphemeSegmenter === null) {
    return Array.from(text)
  }

  return Array.from(graphemeSegmenter.segment(text), part => part.segment)
}

function countWrappedLines(prepared, availableWidth) {
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineCount = 0

  while (true) {
    const line = layoutNextLine(prepared, cursor, availableWidth)
    if (line === null) break
    lineCount += 1
    cursor = line.end
  }

  return Math.max(lineCount, 1)
}

function computeGlyphOpacity(field, x, y) {
  if (field.fadeRadius <= 6) return 1

  const distance = Math.hypot(x - field.x, (y - field.y) * 1.08)
  const inner = field.fadeRadius * 0.16
  const outer = field.fadeRadius * 1.1
  const t = smootherstep(inner, outer, distance)

  return 0.12 + Math.pow(t, 1.18) * 0.88
}

function smootherstep(edge0, edge1, value) {
  if (value <= edge0) return 0
  if (value >= edge1) return 1

  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
