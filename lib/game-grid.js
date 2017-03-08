"use strict";

var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var Docker = require("dockerode");
var request = Promise.promisifyAll(require("request"));

var docker = new Docker();
Promise.promisifyAll(docker);

function createGameGrid(filename) {
  return fs.readFileAsync(filename, "utf8")
  .catch(Error, (e) => {
    console.log(`Encountered an error when opening the file: ${e.cause}`)
    process.exit();
  })
  .then((text) => {
    var charArray = [...text];
    var gridValues = charArray.filter((char) => {return char != '\n'});
    var width = charArray.findIndex((char) => {return char == '\n'});
    var height = gridValues.length / width;
    var grid = [];

    for (var j = 0; j < height; j++) {
      var row = [];

      for (var i = 0; i < width; i++) {
        var index = width * j + i;

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
    name: `dockerlife_cell_${j}_${i}`, Env: [`X=${i}`, `Y=${j}`], HostConfig: hostConfig});
}

function startContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container);
    return container.startAsync()
      .then(() => {
        return container.inspectAsync()
      })
      .then((data) => {
        var hostPort = data.NetworkSettings.Ports["8000/tcp"][0].HostPort;
        var url = `http://localhost:${hostPort}/ping`
        return url;
      })
      .then(waitForServer)
      .thenReturn(container);
  })
}

function stopContainer(containerPromise) {
  return containerPromise.then((container) => {
    Promise.promisifyAll(container);
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
    Promise.promisifyAll(container);
    return container.removeAsync()
  })
}

exports.create = createGameGrid;
exports.startContainer = startContainer;
exports.stopContainer = stopContainer;
exports.removeContainer = removeContainer;
