export class SpatialHash {
  constructor(cellSize) {
    this.cellSize = Math.max(cellSize, 1)
    this.cells = new Map()
  }

  clear() {
    this.cells.clear()
  }

  rebuild(particles) {
    this.clear()

    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index]
      const key = this.#keyFor(particle.x, particle.y)

      if (!this.cells.has(key)) {
        this.cells.set(key, [])
      }

      this.cells.get(key).push(index)
    }
  }

  queryRadius(x, y, radius) {
    const minCellX = Math.floor((x - radius) / this.cellSize)
    const maxCellX = Math.floor((x + radius) / this.cellSize)
    const minCellY = Math.floor((y - radius) / this.cellSize)
    const maxCellY = Math.floor((y + radius) / this.cellSize)
    const matches = []

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        const key = `${cellX}:${cellY}`
        const bucket = this.cells.get(key)
        if (bucket === undefined) continue

        for (let index = 0; index < bucket.length; index++) {
          matches.push(bucket[index])
        }
      }
    }

    return matches
  }

  #keyFor(x, y) {
    return `${Math.floor(x / this.cellSize)}:${Math.floor(y / this.cellSize)}`
  }
}
