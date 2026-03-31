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

  const orbNodes = [
    createOrb('pretext-hero__orb pretext-hero__orb--accent'),
    createOrb('pretext-hero__orb pretext-hero__orb--stone'),
    createOrb('pretext-hero__orb pretext-hero__orb--paper'),
  ]
  stage.append(...orbNodes)

  const lineNodes = []
  const state = {
    prepared,
    lineHeight,
    lineNodes,
    orbNodes,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    lastWidth: 0,
    lastHeight: 0,
    rafId: 0,
  }

  rootNode.classList.add('is-enhanced')

  renderFrame(performance.now())

  if (state.reducedMotion) return

  window.addEventListener('resize', scheduleRender, { passive: true })
  state.rafId = window.requestAnimationFrame(renderFrame)

  function scheduleRender() {
    if (state.rafId !== 0) return
    state.rafId = window.requestAnimationFrame(renderFrame)
  }

  function renderFrame(now) {
    state.rafId = 0
    const width = viewport.clientWidth
    const height = viewport.clientHeight

    if (width <= 0 || height <= 0) return

    const layout = computeHeroLayout(now, width, height, state.reducedMotion)

    if (width !== state.lastWidth || height !== state.lastHeight) {
      stage.style.height = `${height}px`
      stage.style.width = `${width}px`
      state.lastWidth = width
      state.lastHeight = height
    }

    layoutHeroText(state, layout, font, width, height)

    if (!state.reducedMotion) {
      state.rafId = window.requestAnimationFrame(renderFrame)
    }
  }
}

function buildCanvasFont(computed) {
  const style = computed.fontStyle === 'normal' ? '' : `${computed.fontStyle} `
  const weight = computed.fontWeight ? `${computed.fontWeight} ` : ''
  return `${style}${weight}${computed.fontSize} ${computed.fontFamily}`.trim()
}

function createOrb(className) {
  const node = document.createElement('div')
  node.className = className
  return node
}

function computeHeroLayout(now, width, height, reducedMotion) {
  const time = reducedMotion ? 0 : now * 0.001
  const narrow = width < 640
  const baseRadius = Math.min(width, height)

  return {
    insetX: Math.max(8, width * 0.012),
    insetY: Math.max(16, height * 0.08),
    minSlotWidth: Math.max(184, width * 0.32),
    slotPaddingX: Math.max(12, width * 0.018),
    slotPaddingY: 3,
    orbs: [
      {
        x: width * 0.81 + Math.sin(time * 0.31) * width * 0.045,
        y: height * 0.44 + Math.cos(time * 0.24) * height * 0.12,
        r: baseRadius * (narrow ? 0.16 : 0.18),
        blocksText: true,
      },
      {
        x: width * 0.19 + Math.cos(time * 0.22 + 0.8) * width * 0.05,
        y: height * 0.75 + Math.sin(time * 0.28 + 0.3) * height * 0.06,
        r: baseRadius * (narrow ? 0.11 : 0.12),
        blocksText: false,
      },
      {
        x: width * 0.58 + Math.sin(time * 0.18 + 2.2) * width * 0.05,
        y: height * 0.84 + Math.cos(time * 0.2 + 0.5) * height * 0.04,
        r: baseRadius * (narrow ? 0.075 : 0.09),
        blocksText: false,
      },
    ],
  }
}

function layoutHeroText(state, layout, font, width, height) {
  const lines = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineTop = layout.insetY
  const maxY = height - layout.insetY

  while (lineTop + state.lineHeight <= maxY) {
    const blocked = []

    for (let index = 0; index < layout.orbs.length; index++) {
      const orb = layout.orbs[index]
      if (!orb.blocksText) continue

      const interval = circleIntervalForBand(
        orb,
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

    if (slots.length === 0) {
      lineTop += state.lineHeight
      continue
    }

    let exhausted = false

    for (let index = 0; index < slots.length; index++) {
      const slot = slots[index]
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

  syncLinePool(state.lineNodes, lines.length, state.orbNodes[0].parentElement)

  for (let index = 0; index < lines.length; index++) {
    const node = state.lineNodes[index]
    const line = lines[index]
    node.textContent = line.text
    node.style.left = `${line.x}px`
    node.style.top = `${line.y}px`
    node.style.font = font
    node.style.lineHeight = `${state.lineHeight}px`
  }

  for (let index = 0; index < layout.orbs.length; index++) {
    const orb = layout.orbs[index]
    const node = state.orbNodes[index]
    node.style.left = `${Math.round(orb.x - orb.r)}px`
    node.style.top = `${Math.round(orb.y - orb.r)}px`
    node.style.width = `${Math.round(orb.r * 2)}px`
    node.style.height = `${Math.round(orb.r * 2)}px`
  }
}

function circleIntervalForBand(circle, top, bottom, horizontalPadding, verticalPadding) {
  const bandTop = top - verticalPadding
  const bandBottom = bottom + verticalPadding

  if (bandTop >= circle.y + circle.r || bandBottom <= circle.y - circle.r) {
    return null
  }

  const minDy = circle.y < bandTop
    ? bandTop - circle.y
    : circle.y > bandBottom
      ? circle.y - bandBottom
      : 0

  if (minDy >= circle.r) return null

  const maxDx = Math.sqrt(circle.r * circle.r - minDy * minDy)
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
