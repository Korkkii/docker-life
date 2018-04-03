const Promise = require("bluebird")
const Docker = require("dockerode")
const fs = Promise.promisifyAll(require("fs"))
const request = Promise.promisifyAll(require("request"))

const docker = new Docker()
Promise.promisifyAll(docker)

async function readState(filename) {
  try {
    const text = await fs.readFileAsync(filename, "utf8")
    return text
  } catch (err) {
    console.log(`Encountered an error when opening the file: ${err.cause}`)
    process.exit()
  }
}

async function createGameGrid(filename) {
  const baseState = await readState(filename)
  const charArray = [...baseState]
  const gridValues = charArray.filter((char) => {return char != '\n'})
  const width = charArray.findIndex((char) => {return char == '\n'})
  const height = gridValues.length / width
  const grid = []

  for (var j = 0; j < height; j++) {
    const row = []

    for (var i = 0; i < width; i++) {
      const index = width * j + i

      const container = createContainer(i, j)
      const runOnStart = gridValues[index] == 1

      if (runOnStart) {
        row.push(startContainer(container))
      } else {
        row.push(container)
      }
    }

    grid.push(Promise.all(row).then((result) => {return result;}))
  }
  return Promise.all(grid)
}

function createContainer(i, j) {
  const hostConfig = {
    "PublishAllPorts": true
  }
  return docker.createContainerAsync({Image: "dockerlife-cell",
    name: `dockerlife_cell_${j}_${i}`, Env: [`X=${i}`, `Y=${j}`], HostConfig: hostConfig})
}

function startContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container)
    return container.startAsync()
      .then(() => {
        return container.inspectAsync()
      })
      .then((data) => {
        const hostPort = data.NetworkSettings.Ports["8000/tcp"][0].HostPort
        const url = `http://localhost:${hostPort}/ping`
        return url
      })
      .then(waitForServer)
      .thenReturn(container)
  })
}

function stopContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container)
    return container.stopAsync()
  })
}

function waitForServer(url) {
  return request.getAsync(url)
    .catch((err) => {
      return Promise.delay(200).then(() => {
        return waitForServer(url)
      })
    })
}

function removeContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container)
    return container.removeAsync()
  })
}

exports.create = createGameGrid
exports.startContainer = startContainer
exports.stopContainer = stopContainer
exports.removeContainer = removeContainer
