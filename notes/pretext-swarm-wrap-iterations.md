# Pretext Swarm Wrap Iterations

This branch preserves the experimental wrap-return work that followed the first stable wrap renderer.

## Stable baseline

- `f9ee157` `Wrap swarm glyphs across viewport edges`
- Behavior:
  - Canvas renderer duplicates glyphs across the viewport seam.
  - Anchor pull remains wrapped.
  - This was the last version that felt stable and readable in the browser.
- Recommendation:
  - Use this as the live baseline when restoring Pages.

## Later iterations

- `62126f3` `Wrap swarm particles without wrapping home pull`
  - Goal: let a wrapped particle return through the field instead of being pulled back through the seam.
  - Result: unstable direct-home behavior; letters lost readable attachment to the text structure.

- `d417535` `Detach wrapped particles from local text springs`
  - Goal: stop wrapped letters from dragging the whole line.
  - Result: wrapped letters became weak, jittery, and did not return cleanly.

- `e22252b` `Refine wrapped home forces`
  - Goal: restore the first wrap renderer and only change anchor-force direction in wrapped tile space.
  - Result: introduced seam-ordering artifacts and mirrored / folded text at the edge.

- `e8022e5` `Restore stable wrap constraints`
  - Goal: revert constraint wrapping while keeping tile-local home pull.
  - Result: better than `e22252b`, but seam crossings still destabilized nearby letters.

- `32de09a` `Stabilize wrapped particle return`
  - Goal: treat wrapped particles as temporary detached travelers and rejoin them after settling.
  - Result: still not acceptable; line coherence breaks once individual letters cross the boundary.

## Working conclusion

- The current hybrid stack works well for:
  - Pretext layout
  - Canvas rendering
  - Verlet displacement
  - wrapped visual duplication

- The unsuccessful area is:
  - changing home-force direction after seam crossing while keeping paragraph coherence

- The safest live configuration is still:
  - wrapped rendering plus wrapped anchor pull from `f9ee157`

## Branch purpose

- Preserve the failed-but-informative return experiments for later reference.
- Keep a written trail of what was tried before restoring `main` to the stable wrap baseline.
