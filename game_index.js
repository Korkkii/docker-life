"use strict";

var Promise = require("bluebird");
var Docker = require("dockerode");

var minimist = require("minimist");
var request = Promise.promisifyAll(require("request"), {multiArgs: true});

var neighbours = require("./lib/neighbours");
var gridLib = require("./lib/game-grid");

var docker = new Docker();
Promise.promisifyAll(docker);

var args = minimist(process.argv.slice(2));
var generationCount = args._[0] ? args._[0] : 3;
var gameGrid = gridLib.create("./blinker.txt").then(printGrid);
setupGenerations(gameGrid, generationCount);

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
  return Promise.resolve(grid).map((row) => {
    return Promise.resolve(row).map((cell) => {
      return Promise.join(containerInfo(cell.id), currentGenerationGrid, updateContainer);
    });
  }).thenReturn(grid);
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
  if (isRunning) {
    return sendUpdateRequest(info, grid);
  } else {
    var envVariables = info.Config.Env;
    var x = parseInt(envVariables[0][2]);
    var y = parseInt(envVariables[1][2]);
    var neighbourCount = neighbours.calculate(x, y, grid);

    if (neighbourCount == 3) {
      return startContainerWithId(info.Id);
    }
  }
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
    .spread((result, body) => {})
    .catch((err) => {
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
