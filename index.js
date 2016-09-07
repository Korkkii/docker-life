"use strict";

var restify = require("restify");
var request = require("request");

function respond(req, res, next) {
  request("http://cell_0_0:8000", (error, response, body) => {
    if (!error && response.statusCode == 200) {
      res.send(body);
    } else {
      res.send(error);
    }
    next();
  })
}

var server = restify.createServer();
server.get("/", respond);

server.listen(8000);
