"use strict";

var Enum = require("enum");
var state = new Enum({'ALIVE' : 1, 'DEAD' : 0});
var restify = require("restify");
var environment = process.env;
var x = environment.X;
var y = environment.Y;
var size = 3;
var server = restify.createServer();
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
Promise.promisifyAll(request);

function calculateNextGenerationValue(currentGenerationGrid) {
  var N = 0;
  for (var i = Math.max(0, x - 1); i <= Math.min(x + 1, size - 1); i++) {
    for (var j = Math.max(0, y - 1); j <= Math.min(y + 1, size - 1); j++) {
      if ((i != x || y != j) && currentGenerationGrid[j][i] === true) {
        N += 1;
      }
    }
  }

  return calculateCellValue(N);
}

function calculateCellValue(neighboursAlive) {
  if (neighboursAlive == 2 || neighboursAlive == 3) {
    return state.ALIVE;
  } else {
    // Dies by overpopulation / underpopulation
    return state.DEAD;
  }
}

function respond(req, res, next) {
  var currentGeneration = req.body.grid;
  var nextGenValue = calculateNextGenerationValue(currentGeneration);
  res.send({value: nextGenValue});
  if (nextGenValue == state.DEAD) {
    server.close()
  }
  next();
}

function askValue(req, res, next) {
  if (req.params.generation == value) {
    res.send({value: value});
  } else {
    res.send({value: value});
  }

  next();
}

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.post("/update", respond);
server.get("/value", askValue);

server.listen(8000);
