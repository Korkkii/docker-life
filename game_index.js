"use strict";

var Promise = require("bluebird");
var request = Promise.promisifyAll(require("request"), {multiArgs: true});
var fs = Promise.promisifyAll(require("fs"));
var Docker = require("dockerode");
var docker = new Docker();
Promise.promisifyAll(docker);
var gameGrid = createGameGrid();
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

      grid.push(Promise.all(row).thenReturn(row));
    }

    return Promise.all(grid).thenReturn(grid);
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
    name: `cell_${i}_${j}`, HostConfig: hostConfig});
}

function startContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container);
    return container.startAsync().delay(1000).thenReturn(container);
  })
}

function updateGrid(gridPromise) {
  return nextGenerationGrid(gridPromise);
}

function updateContainers(grid) {
  return grid.each((row) => {
    return Promise.each(row, (cell) => {
      return updateContainer(cell.id);
    })
  })
}

function nextGenerationGrid(grid) {
  var currentGenerationGrid = getCurrentGridValues(grid);
  return grid.each((row) => {
    return Promise.each(row, (cell) => {
      return updateContainer(cell.id, currentGenerationGrid);
    })
  })
}

function getCurrentGridValues(grid) {
  return grid.map((row) => {
    return Promise.all(row.map((cell) => {
      return cell.then((container) => {
        return containerInfo(container.id).then((data) => {
          return data.State.Running;
        });
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
  var running = info.State.Running;

  var hostPort = info.HostConfig.PortBindings["8000/tcp"][0].HostPort;
  var postOptions = {
    uri: `http://localhost:${hostPort}/update`,
    body: {
      grid: containerGrid
    },
    json: true
  }
  return request.postAsync(postOptions)
    .spread((result, body) => {
      if (result) {
        console.log(body)
      }
    })
    .catch((err) => {
      if (err.code === 'ECONNREFUSED') {}
    })
}

function updateContainer(containerId, grid) {
  var container = containerInfo(containerId);

  return Promise.join(container, grid, sendUpdateRequest)
}
