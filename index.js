const Promise = require("bluebird")
const Docker = require("dockerode")

const minimist = require("minimist")
const request = Promise.promisifyAll(require("request"), {multiArgs: true})

const neighbours = require("./lib/neighbours")
const gridLib = require("./lib/game-grid")

const docker = new Docker()
Promise.promisifyAll(docker)

const args = minimist(process.argv.slice(2), {
  default: {
    "f": "./base_states/blinker.txt",
    "d": true
  },
  alias: {
    "f": "file",
    "d": "delete"
  },
  boolean: "d"
})

const generationCount = args._[0] ? args._[0] : 3
const fileName = args.file
const deleteContainersAtEnd = args.delete !== false
const gameGrid = gridLib.create(fileName).then(printGrid)
const game = setupGenerations(gameGrid, generationCount)

if (deleteContainersAtEnd) {
  addContainerDeletion(game)
}

function setupGenerations(gameGrid, amount) {
  var grid = gameGrid
  for (var i = 1; i < amount; i++) {
    grid = grid.then(updateGrid)
  }
  return grid
}

function updateGrid(gridPromise) {
  return nextGenerationGrid(gridPromise).then(printGrid)
}

function nextGenerationGrid(grid) {
  const currentGenerationGrid = getGenerationGridValues(grid)
  return Promise.all(grid.map((row) => {
    return Promise.all(row.map((container) => {
      return Promise.join(containerInfo(container.id), currentGenerationGrid, updateContainer)
    }))
  })).thenReturn(grid)
}

function getGenerationGridValues(grid) {
  return Promise.all(grid.map((row) => {
    return Promise.all(row.map((container) => {
      return containerInfo(container.id).then((data) => {
        return data.State.Running
      })
    }))
  }))
}

function containerInfo(containerId) {
  const container = docker.getContainer(containerId)
  Promise.promisifyAll(container)
  return container.inspectAsync()
}

function updateContainer(info, grid) {
  const isRunning = info.State.Running
  const envVariables = info.Config.Env
  const x = parseInt(envVariables[0].substr(2))
  const y = parseInt(envVariables[1].substr(2))
  const neighbourCount = neighbours.calculate(x, y, grid)
  const cellLives = neighbourCount == 2 || neighbourCount == 3
  const cellRestarts = neighbourCount == 3

  if (isRunning & !cellLives) {
    return stopContainerWithId(info.Id)
  } else if (!isRunning && cellRestarts) {
    return startContainerWithId(info.Id)
  }
}

function stopContainerWithId(id) {
  const container = docker.getContainer(id)
  const promise = Promise.resolve(container)
  return gridLib.stopContainer(promise)
}

function sendUpdateRequest(info, containerGrid) {
  const hostPort = info.NetworkSettings.Ports["8000/tcp"][0].HostPort
  const postOptions = {
    uri: `http://localhost:${hostPort}/update`,
    body: {
      grid: containerGrid
    },
    json: true
  }

  return request.postAsync(postOptions)
    .catch((err) => {
      console.log(err)
      if (err.code === 'ECONNREFUSED') {}
    })
}

function startContainerWithId(id) {
  const container = docker.getContainer(id)
  const promise = Promise.resolve(container)
  return gridLib.startContainer(promise)
}

function printGrid(grid) {
  return getGenerationGridValues(grid)
    .then((printGrid) => {
      console.log(printGrid.map((row) => {
        return row.map((value) => {
          return value == true ? 'X' : '.'
        })
      }))
      console.log('\n')
      return printGrid
    })
    .thenReturn(grid)
}

function addContainerDeletion(gameGrid) {
  return gameGrid.finally(() => {
    return Promise.all(gameGrid.map((row) => {
      return Promise.all(row.map((container) => {
        return Promise.join(docker.getContainer(container.id), containerInfo(container.id), (container, data) => {
          var promise = Promise.resolve(container)
          if (data.State.Running) {
            promise = gridLib.stopContainer(promise).thenReturn(promise)
          }
          return gridLib.removeContainer(promise)
        })
      }))
    }))
  })
}
