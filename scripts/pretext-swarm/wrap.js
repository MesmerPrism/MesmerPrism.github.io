export function wrapValue(value, extent) {
  if (!Number.isFinite(extent) || extent <= 0) {
    return value
  }

  const wrapped = value % extent
  return wrapped < 0 ? wrapped + extent : wrapped
}

export function getTileIndex(value, extent) {
  if (!Number.isFinite(extent) || extent <= 0) {
    return 0
  }

  return Math.floor(value / extent)
}

export function getAlignedAnchorTarget(value, anchor, extent) {
  return anchor + getTileIndex(value, extent) * extent
}

export function getShortestWrappedDelta(value, reference, extent) {
  if (!Number.isFinite(extent) || extent <= 0) {
    return value - reference
  }

  const delta = value - reference
  return delta - Math.round(delta / extent) * extent
}

export function getNearestWrappedValue(value, reference, extent) {
  return reference + getShortestWrappedDelta(value, reference, extent)
}
