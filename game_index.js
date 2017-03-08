"use strict";

var Promise = require("bluebird");
var Docker = require("dockerode");

var minimist = require("minimist");
var request = Promise.promisifyAll(require("request"), {multiArgs: true});

var neighbours = require("./lib/neighbours");
var gridLib = require("./lib/game-grid");

var docker = new Docker();
Promise.promisifyAll(docker);

var args = minimist(process.argv.slice(2), {
  default: {
    "f": "./blinker.txt",
    "d": true
  },
  alias: {
    "f": "file",
    "d": "delete"
  },
  boolean: "d"
});

var generationCount = args._[0] ? args._[0] : 3;
var fileName = args.file;
var deleteContainersAtEnd = args.delete !== false;
var gameGrid = gridLib.create(fileName).then(printGrid);
var game = setupGenerations(gameGrid, generationCount);

if (deleteContainersAtEnd) {
  addContainerDeletion(game);
}

function setupGenerations(gameGrid, amount) {
  var grid = gameGrid;
  for (var i = 1; i < amount; i++) {
    grid = grid.then(updateGrid);
  };
  return grid;
}

function updateGrid(gridPromise) {
  return nextGenerationGrid(gridPromise).then(printGrid)
}

function nextGenerationGrid(grid) {
  var currentGenerationGrid = getGenerationGridValues(grid);
  return Promise.all(grid.map((row) => {
    return Promise.all(row.map((container) => {
      return Promise.join(containerInfo(container.id), currentGenerationGrid, updateContainer)
    }))
  })).thenReturn(grid);
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

function updateContainer(info, grid) {
  var isRunning = info.State.Running;
  var envVariables = info.Config.Env;
  var x = parseInt(envVariables[0].substr(2));
  var y = parseInt(envVariables[1].substr(2));
  var neighbourCount = neighbours.calculate(x, y, grid);
  var cellLives = neighbourCount == 2 || neighbourCount == 3;
  var cellRestarts = neighbourCount == 3;

  if (isRunning & !cellLives) {
    return stopContainerWithId(info.Id);
  } else if (!isRunning && cellRestarts) {
    return startContainerWithId(info.Id);
  }
}

function stopContainerWithId(id) {
  var container = docker.getContainer(id);
  var promise = Promise.resolve(container);
  return gridLib.stopContainer(promise);
}

function sendUpdateRequest(info, containerGrid) {
  var hostPort = info.NetworkSettings.Ports["8000/tcp"][0].HostPort;
  var postOptions = {
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
  var container = docker.getContainer(id);
  var promise = Promise.resolve(container);
  return gridLib.startContainer(promise);
}

function printGrid(grid) {
  return getGenerationGridValues(grid)
    .then((printGrid) => {
      console.log(printGrid.map((row) => {
        return row.map((value) => {
          return value == true ? 'X' : '.'
        })
      }));
      console.log('\n');
      return printGrid
    })
    .thenReturn(grid);
}

function addContainerDeletion(gameGrid) {
  return gameGrid.finally(() => {
    return Promise.all(gameGrid.map((row) => {
      return Promise.all(row.map((container) => {
        return Promise.join(docker.getContainer(container.id), containerInfo(container.id), (container, data) => {
          var promise = Promise.resolve(container);
          if (data.State.Running) {
            promise = gridLib.stopContainer(promise).thenReturn(promise);
          }
          return gridLib.removeContainer(promise);
        })
      }))
    }))
  });
}
