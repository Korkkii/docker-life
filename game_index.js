"use strict";

var Promise = require("bluebird");
var request = require("request");
var fs = Promise.promisifyAll(require("fs"));
var Docker = require("dockerode");
var docker = new Docker();
Promise.promisifyAll(docker);
var gameGrid = createGameGrid();

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

      grid.push(row);
    }

    return Promise.all(grid);
  })
}

function createContainer(i, j) {
  return docker.createContainerAsync({Image: "cell-test",
    name: `cell_${i}_${j}`})
}

function startContainer(container) {
  return container.then((container) => {
    var containerPrototype = Object.getPrototypeOf(container);
    Promise.promisifyAll(container);
    return container.startAsync();
  })
}
