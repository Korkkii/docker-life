"use strict";

var Promise = require("bluebird");
var request = Promise.promisifyAll(require("request"), {multiArgs: true});
var fs = Promise.promisifyAll(require("fs"));
var Docker = require("dockerode");
var docker = new Docker();
Promise.promisifyAll(docker);
var gameGrid = createGameGrid();
var size = 3;
updateGrid(gameGrid)

function createGameGrid() {
  return fs.readFileAsync("./gamegrid.txt", "utf8").then((text) => {
    var charArray = [...text];
    var gridValues = charArray.filter((char) => {return char != '\n'});
    var grid = [];

    for (var j = 0; j < 3; j++) {
      var row = [];

      for (var i = 0; i < 3; i++) {
        var index = 3 * j + i;
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
    return Promise.all(grid).then((result) => {return result;});
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
  return docker.createContainerAsync({Image: "cell-test",
    name: `cell_${i}_${j}`, Env: [`X=${i}`, `Y=${j}`], HostConfig: hostConfig});
}

function startContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container);
    return container.startAsync().delay(4000).thenReturn(container);
  })
}

function updateGrid(gridPromise) {
  return nextGenerationGrid(gridPromise);
}

function nextGenerationGrid(grid) {
  var currentGenerationGrid = getCurrentGridValues(grid);
  return grid.map((row) => {
    return Promise.resolve(row).map((cell) => {
      return Promise.join(containerInfo(cell.id), currentGenerationGrid, updateContainer);;
    });
  })
}

function getCurrentGridValues(grid) {
  return grid.map((row) => {
    return Promise.all(row.map((container) => {
      return containerInfo(container.id).then((data) => {
        return data.State.Running;
      });
    }));
  });
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
  var x = envVariables[0][2];
  var y = envVariables[1][2];

  var N = 0;
  for (var i = Math.max(0, x - 1); i <= Math.min(x + 1, size - 1); i++) {
    for (var j = Math.max(0, y - 1); j <= Math.min(y + 1, size - 1); j++) {
      if ((i != x || y != j) && grid[j][i] === true) {
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
