import {
  layoutNextLine,
  prepareWithSegments,
} from 'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.3/dist/layout.js'

const root = document.querySelector('.plasmatic-intro[data-pretext-hero]')

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

  const prepared = prepareWithSegments(sourceText, font)
  const stage = document.createElement('div')
  stage.className = 'pretext-hero'
  stage.setAttribute('aria-hidden', 'true')
  viewport.appendChild(stage)

  const lineNodes = []
  const previewMode = new URLSearchParams(window.location.search).get('pretext-demo')
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const state = {
    prepared,
    lineHeight,
    lineNodes,
    stage,
    reducedMotion,
    interactive: !coarsePointer && !reducedMotion,
    previewMode,
    currentField: null,
    targetField: null,
    lastWidth: 0,
    lastHeight: 0,
    rafId: 0,
  }

  rootNode.classList.add('is-enhanced')

  renderFrame()

  if (state.previewMode === 'cursor') {
    const previewField = getPreviewField(viewport)
    state.currentField = previewField
    state.targetField = previewField
    renderFrame()
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
    state.targetField = buildRestField(viewport.clientWidth, viewport.clientHeight)
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
    const width = viewport.clientWidth
    const height = viewport.clientHeight

    if (width <= 0 || height <= 0) return false

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
    layoutHeroText(state, layout, font, width, height)
    return true
  }
}

function buildCanvasFont(computed) {
  const style = computed.fontStyle === 'normal' ? '' : `${computed.fontStyle} `
  const weight = computed.fontWeight ? `${computed.fontWeight} ` : ''
  return `${style}${weight}${computed.fontSize} ${computed.fontFamily}`.trim()
}

function computeHeroLayout(width, height, field) {
  return {
    insetX: Math.max(8, width * 0.012),
    insetY: Math.max(16, height * 0.08),
    minSlotWidth: Math.max(174, width * 0.28),
    slotPaddingX: Math.max(12, width * 0.018),
    slotPaddingY: 3,
    field,
  }
}

function layoutHeroText(state, layout, font, width, height) {
  const lines = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineTop = layout.insetY
  const maxY = height - layout.insetY

  while (lineTop + state.lineHeight <= maxY) {
    const blocked = []

    if (layout.field.radius > 6) {
      const interval = circleIntervalForBand(
        layout.field,
        lineTop,
        lineTop + state.lineHeight,
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
      lineTop += state.lineHeight
      continue
    }

    let exhausted = false

    for (let index = 0; index < preferredSlots.length; index++) {
      const slot = preferredSlots[index]
      const line = layoutNextLine(state.prepared, cursor, slot.right - slot.left)

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
    lineTop += state.lineHeight
  }

  syncLinePool(state.lineNodes, lines.length, state.stage)

  for (let index = 0; index < lines.length; index++) {
    const node = state.lineNodes[index]
    const line = lines[index]
    node.textContent = line.text
    node.style.left = `${line.x}px`
    node.style.top = `${line.y}px`
    node.style.font = font
    node.style.lineHeight = `${state.lineHeight}px`
  }
}

function buildRestField(width, height) {
  return {
    x: width * 0.82,
    y: height * 0.45,
    radius: 0,
  }
}

function buildActiveField(x, y, width, height) {
  const baseRadius = Math.min(width, height)
  return {
    x,
    y,
    radius: baseRadius * (width < 640 ? 0.15 : 0.17),
  }
}

function getPreviewField(viewport) {
  return buildActiveField(
    viewport.clientWidth * 0.68,
    viewport.clientHeight * 0.46,
    viewport.clientWidth,
    viewport.clientHeight,
  )
}

function getCurrentField(state, width, height) {
  const restField = buildRestField(width, height)

  if (state.currentField === null) {
    state.currentField = state.targetField ?? restField
  }

  if (state.targetField === null) {
    state.targetField = restField
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
  const ease = 0.18
  return {
    x: current.x + (target.x - current.x) * ease,
    y: current.y + (target.y - current.y) * ease,
    radius: current.radius + (target.radius - current.radius) * ease,
  }
}

function normalizeField(field, width, height) {
  const maxRadius = Math.min(width, height) * 0.22
  return {
    x: clamp(field.x, 0, width),
    y: clamp(field.y, 0, height),
    radius: clamp(field.radius, 0, maxRadius),
  }
}

function needsAnotherFrame(state) {
  if (!state.interactive || state.currentField === null || state.targetField === null) {
    return false
  }

  return (
    Math.abs(state.currentField.x - state.targetField.x) > 0.6 ||
    Math.abs(state.currentField.y - state.targetField.y) > 0.6 ||
    Math.abs(state.currentField.radius - state.targetField.radius) > 0.6
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
  if (slots.length <= 1 || field.radius <= 6) {
    return slots
  }

  const leftmost = slots[0]
  const rightmost = slots[slots.length - 1]
  const preferLeft = field.x >= width * 0.5
  const preferred = preferLeft ? leftmost : rightmost

  return preferred === undefined ? slots : [preferred]
}

function syncLinePool(pool, targetLength, parent) {
  while (pool.length < targetLength) {
    const node = document.createElement('span')
    node.className = 'pretext-hero__line'
    pool.push(node)
    parent.appendChild(node)
  }

  while (pool.length > targetLength) {
    const node = pool.pop()
    node.remove()
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
