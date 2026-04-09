import {
  layoutNextLine,
  prepareWithSegments,
} from 'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.3/dist/layout.js'

const graphemeSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

export function preparePretextLayout(sourceText, font) {
  return prepareWithSegments(sourceText, font)
}

export function segmentGraphemes(text) {
  if (graphemeSegmenter === null) {
    return Array.from(text)
  }

  return Array.from(graphemeSegmenter.segment(text), part => part.segment)
}

export function buildAnchorLayout({
  prepared,
  font,
  lineHeight,
  measureContext,
  width,
  config,
}) {
  const insetX = Math.max(config.minLayoutInsetX, width * config.layoutInsetXRatio)
  const insetY = Math.max(lineHeight * config.layoutInsetYLines, 18)
  const availableWidth = Math.max(config.minLayoutWidth, width - insetX * 2)
  const anchors = []
  const lines = []
  const words = []
  const wordMap = new Map()
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineTop = insetY
  let globalWordIndex = 0
  let lineIndex = 0

  measureContext.font = font

  while (true) {
    const line = layoutNextLine(prepared, cursor, availableWidth)
    if (line === null) break

    const graphemes = segmentGraphemes(line.text)
    const lineAnchorIds = []
    let advanceX = insetX
    let activeWordIndex = -1

    for (let glyphIndex = 0; glyphIndex < graphemes.length; glyphIndex++) {
      const glyph = graphemes[glyphIndex]
      const widthValue = Math.max(measureContext.measureText(glyph).width, 0)
      const isWhitespace = glyph.trim().length === 0

      if (!isWhitespace) {
        if (activeWordIndex === -1) {
          activeWordIndex = globalWordIndex
          globalWordIndex += 1
        }

        const anchorId = anchors.length
        const baseX = advanceX + widthValue * 0.5
        const baseY = lineTop + lineHeight * config.anchorCenterRatio
        const anchor = {
          id: anchorId,
          glyph,
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          px: baseX,
          py: baseY,
          ax: 0,
          ay: 0,
          width: widthValue,
          lineIndex,
          wordIndex: activeWordIndex,
          glyphIndex,
          leftId: null,
          rightId: null,
        }

        anchors.push(anchor)
        lineAnchorIds.push(anchorId)

        if (!wordMap.has(activeWordIndex)) {
          wordMap.set(activeWordIndex, [])
        }

        wordMap.get(activeWordIndex).push(anchorId)
      } else {
        activeWordIndex = -1
      }

      advanceX += widthValue
    }

    for (let index = 0; index < lineAnchorIds.length; index++) {
      const anchorId = lineAnchorIds[index]
      const anchor = anchors[anchorId]
      anchor.leftId = index > 0 ? lineAnchorIds[index - 1] : null
      anchor.rightId = index < lineAnchorIds.length - 1 ? lineAnchorIds[index + 1] : null
    }

    lines.push({
      index: lineIndex,
      top: lineTop,
      baselineY: lineTop + lineHeight * config.baselineRatio,
      centerY: lineTop + lineHeight * config.anchorCenterRatio,
      anchorIds: lineAnchorIds,
    })

    cursor = line.end
    lineTop += lineHeight
    lineIndex += 1
  }

  for (const [index, anchorIds] of wordMap.entries()) {
    words[index] = { index, anchorIds }
  }

  const height = Math.ceil(Math.max(
    lineTop + insetY,
    lineHeight * config.minHeightLines,
  ))

  return {
    anchors,
    lines,
    words: words.filter(Boolean),
    width,
    height,
  }
}
