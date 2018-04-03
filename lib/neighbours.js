function calculateNeighbours(x, y, grid) {
  const maxX = grid[0].length
  const maxY = grid.length

  var N = 0
  for (var j = Math.max(0, y - 1); j <= Math.min(y + 1, maxY - 1); j++) {
    for (var i = Math.max(0, x - 1); i <= Math.min(x + 1, maxX - 1); i++) {
      if (!(i == x && j == y) && grid[j][i] === true) {
        N += 1
      }
    }
  }

  return N
}

module.exports = {
  calculate: calculateNeighbours
}
