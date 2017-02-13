"use strict";

var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var Docker = require("dockerode");

var docker = new Docker();
Promise.promisifyAll(docker);

function createGameGrid(filename) {
  return fs.readFileAsync(filename, "utf8").then((text) => {
    var charArray = [...text];
    var gridValues = charArray.filter((char) => {return char != '\n'});
    var size = charArray.findIndex((char) => {return char == '\n'});
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
  var hostConfig = {
    "PublishAllPorts": true
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

exports.create = createGameGrid;
exports.startContainer = startContainer;
