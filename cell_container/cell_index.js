const Enum = require("enum")
const Promise = require("bluebird")
const restify = require("restify")

const neighbours = require("./lib/neighbours")

const state = new Enum({'ALIVE' : 1, 'DEAD' : 0})
const { X, Y } = process.env
const x = parseInt(X)
const y = parseInt(Y)
const server = restify.createServer()
const request = Promise.promisify(require("request"))
Promise.promisifyAll(request)

function calculateNextGenerationValue(currentGenerationGrid) {
  const neighbourCount = neighbours.calculate(x, y, currentGenerationGrid)
  return calculateCellValue(neighbourCount)
}

function calculateCellValue(neighboursAlive) {
  if (neighboursAlive == 2 || neighboursAlive == 3) {
    return state.ALIVE
  } else {
    // Dies by overpopulation / underpopulation
    return state.DEAD
  }
}

function update(req, res, next) {
  const currentGeneration = req.body.grid
  const nextGenValue = calculateNextGenerationValue(currentGeneration)

  res.send({value: nextGenValue})
  if (nextGenValue == state.DEAD) {
    server.close()
  }
}

function ping(req, res, next) {
  res.send({})
}

server.use(restify.queryParser())
server.use(restify.bodyParser())
server.post("/update", update)
server.get("/ping", ping)

server.listen(8000)
