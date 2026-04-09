export function createDebugOverlay(viewport, enabled) {
  if (!enabled) return null

  const node = document.createElement('pre')
  node.className = 'pretext-swarm__debug'
  node.setAttribute('aria-hidden', 'true')
  viewport.appendChild(node)

  return { node }
}

export function updateDebugOverlay(debug, snapshot, particleCount) {
  if (debug === null) return

  debug.node.textContent = [
    `state: ${snapshot.state}`,
    `particles: ${particleCount}`,
    `avg velocity: ${snapshot.stats.averageVelocity.toFixed(3)}`,
    `avg displacement: ${snapshot.stats.averageDisplacement.toFixed(3)}`,
    `max displacement: ${snapshot.stats.maxDisplacement.toFixed(2)}`,
  ].join('\n')
}
