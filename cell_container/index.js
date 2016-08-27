"use strict";

var restify = require("restify");
var environment = process.env

function respond(req, res, next) {
  res.send({"msg": "Hello World", "X": environment.X, "Y": environment.Y});
  next();
}

var server = restify.createServer();
server.get("/", respond);

server.listen(8000)
