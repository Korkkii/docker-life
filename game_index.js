"use strict";

var Promise = require("bluebird");
var request = Promise.promisifyAll(require("request"), {multiArgs: true});
var fs = Promise.promisifyAll(require("fs"));
var Docker = require("dockerode");
var docker = new Docker();
Promise.promisifyAll(docker);
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var generationCount = args._[0] ? args._[0] : 3;
var size = 0;
var gameGrid = createGameGrid().then(printGrid);
setupGenerations(gameGrid, generationCount);

function setupGenerations(gameGrid, amount) {
  var grid = gameGrid;
  for (var i = 1; i < amount; i++) {
    grid = grid.then(updateGrid);
  };
  return grid;
}

function createGameGrid() {
  return fs.readFileAsync("./gamegrid.txt", "utf8").then((text) => {
    var charArray = [...text];
    var gridValues = charArray.filter((char) => {return char != '\n'});
    size = charArray.findIndex((char) => {return char == '\n'});
    var grid = [];

    for (var j = 0; j < size; j++) {
      var row = [];

      for (var i = 0; i < size; i++) {
        var index = size * j + i;

        var container = createContainer(i, j);
        var runOnStart = gridValues[index] == 1;

        if (runOnStart) {
          row.push(startContainer(container));
        } else {
          row.push(container);
        }
      }

      grid.push(Promise.all(row).then((result) => {return result;}));
    }
    return Promise.all(grid);
  })
}

function createContainer(i, j) {
  var port = `80${i}${j}`;
  var hostConfig = {
    "PortBindings": {
      "8000/tcp": [{
        "HostPort": port
      }]
    }
  };
  return docker.createContainerAsync({Image: "dockerlife-cell",
    name: `cell_${j}_${i}`, Env: [`X=${i}`, `Y=${j}`], HostConfig: hostConfig});
}

function startContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container);
    return container.startAsync().delay(4000).thenReturn(container);
  })
}

function updateGrid(gridPromise) {
  return nextGenerationGrid(gridPromise).then(printGrid)
}

function printGrid(grid) {
  return getGenerationGridValues(grid)
    .then((printGrid) => {
      console.log(printGrid.map((row) => {
        return row.map((value) => {
          return value == true ? 'X' : 'O'
        })
      }));
      console.log('\n');
      return printGrid
    })
    .thenReturn(grid);
}

function nextGenerationGrid(grid) {
  var currentGenerationGrid = getGenerationGridValues(grid);
  return Promise.resolve(grid).each((row) => {
    return Promise.resolve(row).each((cell) => {
      return Promise.join(containerInfo(cell.id), currentGenerationGrid, updateContainer);
    });
  });
}

function getGenerationGridValues(grid) {
  return Promise.all(grid.map((row) => {
    return Promise.all(row.map((container) => {
      return containerInfo(container.id).then((data) => {
        return data.State.Running;
      });
    }));
  }));
}

function containerInfo(containerId) {
  var container = docker.getContainer(containerId);
  Promise.promisifyAll(container);
  return container.inspectAsync()
}

function sendUpdateRequest(info, containerGrid) {
  var hostPort = info.HostConfig.PortBindings["8000/tcp"][0].HostPort;
  var postOptions = {
    uri: `http://localhost:${hostPort}/update`,
    body: {
      grid: containerGrid
    },
    json: true
  }

  return request.postAsync(postOptions)
    .spread((result, body) => {})
    .catch((err) => {
      if (err.code === 'ECONNREFUSED') {}
    })
}

function updateContainer(info, grid) {
  var isRunning = info.State.Running;
  if (isRunning) {
    return sendUpdateRequest(info, grid);
  } else {
    var neighbourCount = calculateNeighbours(info, grid);

    if (neighbourCount == 3) {
      return startContainerWithId(info.Id);
    }
  }
}

function calculateNeighbours(info, grid) {
  var envVariables = info.Config.Env;
  var x = parseInt(envVariables[0][2]);
  var y = parseInt(envVariables[1][2]);

  var N = 0;
  for (var j = Math.max(0, y - 1); j <= Math.min(y + 1, size - 1); j++) {
    for (var i = Math.max(0, x - 1); i <= Math.min(x + 1, size - 1); i++) {
      if (!(i == x && j == y) && grid[j][i] === true) {
        N += 1;
      }
    }
  }

  return N;
}

function startContainerWithId(id) {
  var container = docker.getContainer(id);
  var promise = Promise.resolve(container);
  return startContainer(promise);
}
