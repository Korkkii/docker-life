"use strict";

var request = require("request");
var Docker = require("dockerode");
var docker = new Docker();

docker.listContainers((err, containers) => {
  containers.forEach((containerInfo) => {
    console.log(containerInfo.Id);
  })
})
